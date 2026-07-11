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
  getGroupsFollowingMatch, markEventSeen, hasSeenEvent, seedMatchEvents
} from '../utils/store.js';
import { log } from '../utils/logger.js';
import { sendPushNotification } from './pushNotify.js';

/**
 * Called every 5 seconds by cron.
 * Only processes matches that at least one user is following.
 */
export async function pollMatches() {
  const liveMatches = await getLiveMatches();
  if (!liveMatches.length) return;

  for (const match of liveMatches) {
    const groups = getGroupsFollowingMatch(match.id);
    if (!groups.length) continue; // nobody following this match — skip

    await processMatch(match, groups);
  }
}

async function processMatch(match, groups) {
  const matchId = String(match.id);
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
  const minute   = detail?.minute || match.minute || '?';
  const currentHome = detail?.home_score ?? match.home_score ?? 0;
  const currentAway = detail?.away_score ?? match.away_score ?? 0;
  const currentStatus = detail?.status || match.status;

  log.info(`[${matchId}] ${homeTeam} ${currentHome}-${currentAway} ${awayTeam} | ${currentStatus} ${minute}'`);

  // ── Kick-off alert ────────────────────────────────────────────────────────────
  if (
    (currentStatus === 'LIVE') &&
    (state.status === 'pre' || state.status === 'NS') &&
    !state.sentKO
  ) {
    log.event(`Kick-off: ${homeTeam} vs ${awayTeam}`);
    const msg = `⚽ *Kick-off!*\n\n${homeTeam} vs ${awayTeam} is underway.\n\nAll goals, cards, and match updates will come through here automatically.`;
    await notifyMatchGroups(groups, msg);
    await sendPushNotification('Kick-off!', `${homeTeam} vs ${awayTeam} is underway.`, '/');
    updateMatchState(matchId, { sentKO: true, status: currentStatus });
  } else if (currentStatus !== state.status) {
    updateMatchState(matchId, { status: currentStatus });
  }

  // ── New match events (goals, red cards) ───────────────────────────────────────
  // Use Set-based dedup: each event ID is recorded when first processed.
  // This is the ONLY guard — no lastEventId, no minute comparison.
  for (const event of events) {
    if (hasSeenEvent(matchId, event.id)) continue; // already alerted — skip
    markEventSeen(matchId, event.id);
    await handleEvent(event, { match, homeTeam, awayTeam, detail, oddsStr, groups });
  }

  // ── Score change tracking (no alert — just state update) ─────────────────────
  if (currentHome !== state.homeScore || currentAway !== state.awayScore) {
    log.event(`Score update: ${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`);
    updateMatchState(matchId, { homeScore: currentHome, awayScore: currentAway });
  }

  // ── Half-time report ──────────────────────────────────────────────────────────
  if (currentStatus === 'HT' && !state.sentHT) {
    log.event(`Half-time: ${homeTeam} vs ${awayTeam}`);
    try {
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
    } catch (err) {
      log.error('HT report failed:', err.message);
    }
    updateMatchState(matchId, { sentHT: true });
  }

  // ── Full-time report ──────────────────────────────────────────────────────────
  if (currentStatus === 'FT' && !state.sentFT) {
    log.event(`Full-time: ${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`);
    try {
      const msg = await generateFullTimeReport({
        homeTeam, awayTeam,
        homeScore: currentHome,
        awayScore: currentAway,
        events,
        vibe: groups[0]?.style,
      });
      await notifyMatchGroups(groups, msg);
      await sendPushNotification('Full-time', `${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`, '/');

      // Sweepstake points
      try {
        const { processMatchEndPoints } = await import('../handlers/sweepstake.js');
        await processMatchEndPoints(homeTeam, awayTeam, currentHome, currentAway);
      } catch (e) {
        log.error('Sweepstake points failed:', e.message);
      }
    } catch (err) {
      log.error('FT report failed:', err.message);
    }
    updateMatchState(matchId, { sentFT: true });
  }

  // ── Odds shift alert ──────────────────────────────────────────────────────────
  if (odds && state.odds) {
    const shift = detectOddsShift(state.odds, odds);
    if (shift.shifted) {
      log.event(`Odds shift: ${homeTeam} vs ${awayTeam} — ${shift.field} ${shift.from}→${shift.to}`);
      try {
        const msg = await generateOddsShiftAlert({
          homeTeam, awayTeam, minute,
          ...shift,
          vibe: groups[0]?.style,
        });
        await notifyMatchGroups(groups, msg);
        await sendPushNotification('Odds Shift', `${homeTeam} vs ${awayTeam}: ${shift.field} ${shift.from}→${shift.to}`, '/');
      } catch (err) {
        log.error('Odds shift alert failed:', err.message);
      }
    }
  }

  updateMatchState(matchId, { odds, status: currentStatus });
}

async function handleEvent(event, { match, homeTeam, awayTeam, detail, oddsStr, groups }) {
  const homeScore = detail?.home_score ?? 0;
  const awayScore = detail?.away_score ?? 0;
  const style     = groups[0]?.style || 'hype';

  log.event(`New event [${match.id}] ${event.type} @ ${event.minute}': ${event.description}`);

  let msg = null;
  try {
    if (event.type === 'goal' || event.type === 'own_goal') {
      msg = await generateGoalAlert({
        scorer: event.player,
        team:   event.team,
        minute: event.minute,
        homeTeam, awayTeam, homeScore, awayScore,
        odds: oddsStr,
        vibe: style,
      });
      await sendPushNotification('GOAL!!! ⚽', `${homeTeam} ${homeScore}–${awayScore} ${awayTeam} (${event.minute}')`, '/');
    } else if (event.type === 'red_card') {
      msg = await generateRedCardAlert({
        player: event.player,
        team:   event.team,
        minute: event.minute,
        homeTeam, awayTeam, homeScore, awayScore,
        odds: oddsStr,
        vibe: style,
      });
      await sendPushNotification('Red Card! 🟥', `${event.player} sent off in the ${event.minute}'`, '/');
    }
  } catch (err) {
    log.error(`AI alert failed for event ${event.id}:`, err.message);
    // Send a plain fallback so the user still gets notified
    if (event.type === 'goal' || event.type === 'own_goal') {
      msg = `⚽ *GOAL!* ${homeTeam} ${homeScore}–${awayScore} ${awayTeam} (${event.minute}')`;
    } else if (event.type === 'red_card') {
      msg = `🟥 *Red card!* ${event.player} sent off (${event.minute}')`;
    }
  }

  if (msg) {
    await notifyMatchGroups(groups, msg);
  }
}
