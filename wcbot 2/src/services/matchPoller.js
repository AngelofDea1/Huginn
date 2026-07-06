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
  if (!liveMatches.length) return;

  for (const match of liveMatches) {
    const groups = getGroupsFollowingMatch(match.id);
    if (!groups.length) continue; // nobody following this match, skip

    await processMatch(match, groups);
  }
}

async function processMatch(match, groups) {
  const matchId = String(match.id);
  let state = getMatchState(matchId);

  // First time seeing this match
  if (!state) {
    initMatchState(matchId, {
      homeScore: match.home_score ?? 0,
      awayScore: match.away_score ?? 0,
      status: match.status,
    });
    state = getMatchState(matchId);
  }

  // Fetch full detail + odds
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
  const minute   = detail?.minute || '?';

  //  Detect new events 
  const newEvents = events.filter(e => e.id !== state.lastEventId && isAfterLastSeen(e, state));

  for (const event of newEvents) {
    await handleEvent(event, { match, homeTeam, awayTeam, detail, oddsStr, groups });
  }

  // Mark last seen event
  if (events.length > 0) {
    updateMatchState(matchId, { lastEventId: events[events.length - 1].id });
  }

  //  Detect score change (backup in case events miss) 
  const currentHome = detail?.home_score ?? match.home_score ?? 0;
  const currentAway = detail?.away_score ?? match.away_score ?? 0;

  if (currentHome !== state.homeScore || currentAway !== state.awayScore) {
    log.event(`Score change detected: ${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`);
    updateMatchState(matchId, { homeScore: currentHome, awayScore: currentAway });
  }

  //  Half-time 
  if (detail?.status === 'HT' && !state.sentHT) {
    log.event(`Half-time: ${homeTeam} vs ${awayTeam}`);
    const msg = await generateHalfTimeReport({
      homeTeam, awayTeam,
      homeScore: currentHome,
      awayScore: currentAway,
      events,
      odds: oddsStr,
      vibe: groups[0]?.vibe,
    });
    await notifyMatchGroups(groups, msg);
    await sendPushNotification('Half-time', `${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`, '/');
    updateMatchState(matchId, { sentHT: true });
  }

    //  Full-time 
    if (detail?.status === 'FT' && !state.sentFT) {
      log.event(`Full-time: ${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`);
      const msg = await generateFullTimeReport({
        homeTeam, awayTeam,
        homeScore: currentHome,
        awayScore: currentAway,
        events,
        vibe: groups[0]?.vibe,
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

      updateMatchState(matchId, { sentFT: true });
    }

  //  Odds shift alert 
  if (odds && state.odds) {
    const shift = detectOddsShift(state.odds, odds);
    if (shift.shifted) {
      log.event(`Odds shift: ${homeTeam} vs ${awayTeam} - ${shift.field} ${shift.from}->${shift.to}`);
      const msg = await generateOddsShiftAlert({
        homeTeam, awayTeam, minute,
        ...shift,
        vibe: groups[0]?.vibe,
      });
      await notifyMatchGroups(groups, msg);
      await sendPushNotification('Odds Shift', `${homeTeam} vs ${awayTeam}: ${shift.field} shifted from ${shift.from} to ${shift.to}`, '/');
    }
  }

  updateMatchState(matchId, { odds, status: detail?.status });
}

async function handleEvent(event, { match, homeTeam, awayTeam, detail, oddsStr, groups }) {
  const matchId = String(match.id);
  const homeScore = detail?.home_score ?? 0;
  const awayScore = detail?.away_score ?? 0;
  const vibe = groups[0]?.vibe || 'hype';

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
  // Assumes event IDs are sequential integers
  return Number(event.id) > Number(state.lastEventId);
}
