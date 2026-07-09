import {
  getLiveMatches, getMatchDetail, getMatchOdds,
  formatOdds, detectOddsShift
} from './txline.js';
import {
  generateGoalAlert, generateRedCardAlert,
  generateHalfTimeReport, generateFullTimeReport,
  generateOddsShiftAlert
} from './ai.js';
import { notifyMatchGroups } from './whatsapp.js';
import {
  getMatchState, initMatchState, updateMatchState,
  getGroupsFollowingMatch
} from '../utils/store.js';
import { log } from '../utils/logger.js';
import { sendPushNotification } from './pushNotify.js';

/**
 * Called every 30 seconds by cron.
 * Checks all live matches for new events and sends WhatsApp alerts.
 */
export async function pollMatches() {
  const liveMatches = await getLiveMatches();
  if (!liveMatches.length) {
    log.info('pollMatches: no live matches found');
    return;
  }

  log.info(`pollMatches: processing ${liveMatches.length} live match(es)`);

  for (const match of liveMatches) {
    await processMatch(match);
  }
}

async function processMatch(match) {
  const matchId  = String(match.id);
  const groups   = getGroupsFollowingMatch(matchId);
  let state = getMatchState(matchId);

  // First time seeing this match — init state
  if (!state) {
    initMatchState(matchId, {
      homeScore: match.home_score ?? 0,
      awayScore: match.away_score ?? 0,
      status:    match.status,
    });
    state = getMatchState(matchId);
  }

  // Fetch full detail + odds (getLiveMatches already enriches scores,
  // but we still call getMatchDetail here for events and odds)
  let detail, odds;
  try {
    [detail, odds] = await Promise.all([
      getMatchDetail(matchId),
      getMatchOdds(matchId),
    ]);
  } catch (err) {
    log.warn(`Could not fetch detail for match ${matchId}: ${err.message}`);
    return;
  }

  const events   = detail?.events || [];
  const homeTeam = match.home_team?.name || 'Home';
  const awayTeam = match.away_team?.name || 'Away';
  const oddsStr  = formatOdds(odds);
  const minute   = detail?.minute || match.minute || '?';

  const currentHome = detail?.home_score ?? match.home_score ?? 0;
  const currentAway = detail?.away_score ?? match.away_score ?? 0;

  // Always log the match state for debugging
  log.info(`[${matchId}] ${homeTeam} ${currentHome}-${currentAway} ${awayTeam} | ${detail?.status || match.status} ${minute}'`);

  //  Detect new events — only alert if someone is following 
  if (groups.length) {
    const newEvents = events.filter(e => isAfterLastSeen(e, state));

    for (const event of newEvents) {
      await handleEvent(event, { match, homeTeam, awayTeam, detail, oddsStr, groups });
    }

    // Mark last seen event
    if (events.length > 0) {
      updateMatchState(matchId, { lastEventId: events[events.length - 1].id });
    }
  } else {
    log.info(`[${matchId}] No followers — skipping alerts`);
  }

  //  Detect score change (backup in case events miss) 
  if (currentHome !== state.homeScore || currentAway !== state.awayScore) {
    log.event(`Score change: ${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`);

    // If score changed but no matching event found, fire a synthetic goal alert
    if (groups.length) {
      const scoredHome = currentHome > state.homeScore;
      const scoredAway = currentAway > state.awayScore;

      if (scoredHome || scoredAway) {
        const syntheticEvent = {
          id:          `score-${matchId}-${currentHome}-${currentAway}`,
          type:        'goal',
          team:        scoredHome ? 'home' : 'away',
          minute:      minute,
          player:      'Goal',
          description: `${scoredHome ? homeTeam : awayTeam} scores! ${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`,
        };

        // Only fire synthetic event if no real event triggered for this score already
        const alreadyFired = events.some(e =>
          e.type === 'goal' &&
          ((e.team === 'home' && scoredHome) || (e.team === 'away' && scoredAway)) &&
          isAfterLastSeen(e, state)
        );

        if (!alreadyFired) {
          log.event(`Synthetic goal alert for score change: ${syntheticEvent.description}`);
          await handleEvent(syntheticEvent, { match, homeTeam, awayTeam, detail, oddsStr, groups });
          updateMatchState(matchId, { lastEventId: syntheticEvent.id });
        }
      }
    }

    updateMatchState(matchId, { homeScore: currentHome, awayScore: currentAway });
  }

  //  Half-time 
  if (detail?.status === 'HT' && !state.sentHT) {
    log.event(`Half-time: ${homeTeam} vs ${awayTeam}`);
    if (groups.length) {
      const msg = await generateHalfTimeReport({
        homeTeam, awayTeam,
        homeScore: currentHome,
        awayScore: currentAway,
        events,
        odds: oddsStr,
        vibe: groups[0]?.style,
      });
      await notifyMatchGroups(groups, msg);
      await sendPushNotification('Half-time', `${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`, '/');
    }
    updateMatchState(matchId, { sentHT: true });
  }

  //  Full-time 
  if (detail?.status === 'FT' && !state.sentFT) {
    log.event(`Full-time: ${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`);
    if (groups.length) {
      const msg = await generateFullTimeReport({
        homeTeam, awayTeam,
        homeScore: currentHome,
        awayScore: currentAway,
        events,
        vibe: groups[0]?.style,
      });
      await notifyMatchGroups(groups, msg);
      await sendPushNotification('Full-time', `${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`, '/');

      // Distribute sweepstake points
      try {
        const { processMatchEndPoints } = await import('../handlers/sweepstake.js');
        await processMatchEndPoints(homeTeam, awayTeam, currentHome, currentAway);
      } catch (e) {
        log.error('Sweepstake points calculation failed:', e.message);
      }
    }
    updateMatchState(matchId, { sentFT: true });
  }

  //  Odds shift alert 
  if (odds && state.odds && groups.length) {
    const shift = detectOddsShift(state.odds, odds);
    if (shift.shifted) {
      log.event(`Odds shift: ${homeTeam} vs ${awayTeam} - ${shift.field} ${shift.from}->${shift.to}`);
      const msg = await generateOddsShiftAlert({
        homeTeam, awayTeam, minute,
        ...shift,
        vibe: groups[0]?.style,
      });
      await notifyMatchGroups(groups, msg);
      await sendPushNotification('Odds Shift', `${homeTeam} vs ${awayTeam}: ${shift.field} shifted from ${shift.from} to ${shift.to}`, '/');
    }
  }

  updateMatchState(matchId, { odds, ...(detail ? { status: detail.status } : {}) });
}

async function handleEvent(event, { match, homeTeam, awayTeam, detail, oddsStr, groups }) {
  const matchId = String(match.id);
  const homeScore = detail?.home_score ?? 0;
  const awayScore = detail?.away_score ?? 0;
  const vibe = groups[0]?.style || 'hype';

  log.event(`New event [${match.id}] ${event.type}: ${event.description}`);

  let msg = null;

  if (event.type === 'goal' || event.type === 'own_goal') {
    msg = await generateGoalAlert({
      scorer: event.player,
      team: event.team,
      minute: event.minute,
      homeTeam, awayTeam, homeScore, awayScore,
      odds: oddsStr,
      vibe,
    });
    await sendPushNotification('GOAL!!! ⚽', `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} (${event.minute}')`, '/');
  } else if (event.type === 'red_card') {
    msg = await generateRedCardAlert({
      player: event.player,
      team: event.team,
      minute: event.minute,
      homeTeam, awayTeam, homeScore, awayScore,
      odds: oddsStr,
      vibe,
    });
    await sendPushNotification('Red Card! 🟥', `${event.player} sent off in the ${event.minute}'`, '/');
  }

  if (msg) {
    await notifyMatchGroups(groups, msg);
  }
}

function isAfterLastSeen(event, state) {
  if (!state.lastEventId) return true;
  
  // If the event IDs are exact matches, it is not new
  if (event.id === state.lastEventId) return false;

  // Extract elapsed minute from IDs like "g1-15" or "rc2-44" or "score-XYZ-1-0"
  const getEventMinute = (id) => {
    if (!id) return 0;
    const parts = id.split('-');
    // For score-matchId-home-away format, use home+away sum as proxy
    if (parts[0] === 'score') {
      return parseInt(parts[parts.length - 2] || '0') + parseInt(parts[parts.length - 1] || '0');
    }
    return parts.length > 1 ? Number(parts[1]) : 0;
  };

  // Strictly greater-than to avoid re-firing events at the same minute
  return getEventMinute(event.id) > getEventMinute(state.lastEventId);
}
