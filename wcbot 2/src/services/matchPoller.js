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
import {
  persistMatchScore, getPersistedMatchScore
} from '../utils/subscriptionStore.js';
import { log } from '../utils/logger.js';
import { sendPushNotification } from './pushNotify.js';
import { getSubscribersForTeams } from '../utils/subscriptionStore.js';

/**
 * Called every 5 seconds by cron.
 * Only processes matches that at least one user is following.
 */
export async function pollMatches() {
  const liveMatches = await getLiveMatches();
  if (!liveMatches.length) return;

  for (const match of liveMatches) {
    const groups = getGroupsFollowingMatch(match.id);
    if (!groups.length) continue;
    await processMatch(match, groups);
  }
}

async function processMatch(match, groups) {
  const matchId = String(match.id);
  let state = getMatchState(matchId);

  // First time seeing this match — init placeholder state (corrected below after detail fetch)
  if (!state) {
    initMatchState(matchId, {
      homeScore:    match.home_score ?? 0,
      awayScore:    match.away_score ?? 0,
      homeRedCards: 0,
      awayRedCards: 0,
      status:       match.status,
      seeded:       false,
    });
    state = getMatchState(matchId);
  }

  // Fetch full detail + odds in parallel
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
  const events        = detail?.events || [];
  const homeTeam      = match.home_team?.name || 'Home';
  const awayTeam      = match.away_team?.name || 'Away';
  const oddsStr       = formatOdds(odds);
  const minute        = detail?.minute || match.minute || '?';
  const currentHome   = detail?.home_score  ?? match.home_score  ?? 0;
  const currentAway   = detail?.away_score  ?? match.away_score  ?? 0;
  const currentStatus = detail?.status || match.status;

  log.info(`[${matchId}] ${homeTeam} ${currentHome}-${currentAway} ${awayTeam} | ${currentStatus} ${minute}'`);

  // ─── BASELINE SEEDING (Redis-backed, restart-safe) ───────────────────────────
  //
  // On the VERY FIRST poll for a match (seeded=false), we try to load the last
  // KNOWN-ALERTED score from Redis. This handles three scenarios correctly:
  //
  //  1. Brand-new follow (no Redis key):
  //       → Use current API score as baseline, persist it, mark seeded=true.
  //       → No alert: goals before the follow are not the user's concern.
  //
  //  2. Server restart (Redis key exists with score e.g. 0-1):
  //       → Load Redis baseline (0-1). If API now says 0-2 → goal was scored
  //         during the restart → ALERT. If still 0-1 → no change → no alert.
  //
  //  3. Normal running (seeded=true): skip this block entirely.
  // ─────────────────────────────────────────────────────────────────────────────
  if (!state.seeded) {
    const persisted = await getPersistedMatchScore(matchId);

    if (persisted) {
      // Restart scenario: use persisted score so goals during restart are caught
      log.info(`[${matchId}] Loaded persisted baseline from Redis: ${homeTeam} ${persisted.homeScore}-${persisted.awayScore} ${awayTeam}`);
      updateMatchState(matchId, {
        seeded:        true,
        homeScore:     persisted.homeScore,
        awayScore:     persisted.awayScore,
        homeRedCards:  persisted.homeRedCards || 0,
        awayRedCards:  persisted.awayRedCards || 0,
        status:        persisted.status || currentStatus,
        // Restore sent-flags so HT/FT/KO/PreMatch are never sent twice after restart
        sentPreMatch:  persisted.sentPreMatch || false,
        sentKO:        persisted.sentKO        || false,
        sentHT:        persisted.sentHT        || false,
        sentFT:        persisted.sentFT        || false,
      });
    } else {
      // Brand-new follow: set current score as baseline, persist it immediately
      const initHomeRed = events.filter(e => e.type === 'red_card' && e.team === 'home').length;
      const initAwayRed = events.filter(e => e.type === 'red_card' && e.team === 'away').length;
      updateMatchState(matchId, {
        seeded:       true,
        homeScore:    currentHome,
        awayScore:    currentAway,
        homeRedCards: initHomeRed,
        awayRedCards: initAwayRed,
        status:       currentStatus,
      });
      await persistMatchScore(matchId, {
        homeScore:    currentHome,
        awayScore:    currentAway,
        homeRedCards: initHomeRed,
        awayRedCards: initAwayRed,
        status:       currentStatus,
      });
      log.info(`[${matchId}] New baseline set: ${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`);
      return; // Don't alert on first-ever follow — these are all pre-existing events
    }
    // Refresh state reference after update
    state = getMatchState(matchId);
  }

  // ─── PUSH SUBSCRIBERS ────────────────────────────────────────────────────────
  let pushSubs = [];
  try {
    const targetSubs = await getSubscribersForTeams([homeTeam, awayTeam]);
    pushSubs = targetSubs.map(s => s.subscription);
  } catch (dbErr) {
    log.error('Failed to get push subscribers:', dbErr.message);
  }

  // ── Pre-match bulletin (30 mins before kickoff) ───────────────────────────────
  if (!state.sentPreMatch && (currentStatus === 'NS' || currentStatus === 'pre' || !currentStatus)) {
    const kickoffTime = match.kickoff_time ? new Date(match.kickoff_time).getTime() : null;
    if (kickoffTime) {
      const minsUntilKickoff = (kickoffTime - Date.now()) / 60000;
      if (minsUntilKickoff <= 32 && minsUntilKickoff > 0) {
        log.event(`Pre-match: ${homeTeam} vs ${awayTeam} (${Math.round(minsUntilKickoff)} mins away)`);
        const oddsPreview = oddsStr ? `\n\n📊 Opening odds: ${oddsStr}` : '';
        const msg = `🔔 *30-minute warning!*\n\n*${homeTeam} vs ${awayTeam}* kicks off soon.\n\nGet ready for live goal alerts, red cards, and match commentary — all coming directly to this chat.${oddsPreview}`;
        await notifyMatchGroups(groups, msg);
        log.info(`Poller sending pre-match push to ${pushSubs.length} subscribers.`);
        await sendPushNotification(
          '30 mins to kick-off! 🔔',
          `${homeTeam} vs ${awayTeam} starts soon.`,
          '/',
          pushSubs
        );
        updateMatchState(matchId, { sentPreMatch: true });
      }
    }
  }

  // ── Kick-off alert ────────────────────────────────────────────────────────────
  if (
    (currentStatus === 'LIVE') &&
    (state.status === 'pre' || state.status === 'NS') &&
    !state.sentKO
  ) {
    log.event(`Kick-off: ${homeTeam} vs ${awayTeam}`);
    const msg = `⚽ *Kick-off!*\n\n${homeTeam} vs ${awayTeam} is underway.\n\nAll goals, cards, and match updates will come through here automatically.`;
    await notifyMatchGroups(groups, msg);
    log.info(`Poller sending Kick-off push to ${pushSubs.length} subscribers.`);
    await sendPushNotification('Kick-off!', `${homeTeam} vs ${awayTeam} is underway.`, '/', pushSubs);
    updateMatchState(matchId, { sentKO: true, status: currentStatus });
  } else if (currentStatus !== state.status) {
    updateMatchState(matchId, { status: currentStatus });
  }

  // ── GOAL DETECTION (score-comparison — restart-safe, no duplicates) ───────────
  //
  // We compare the CURRENT score against the LAST RECORDED score in state.
  // If the score went up → a new goal happened. We look up the matching event
  // from the API's events array to get the scorer and minute.
  //
  // Why this beats event-ID dedup:
  //   - Event IDs are built from the match clock (g1-22, g2-41).
  //   - After a server restart, seenEventIds is wiped → old IDs look "new" → spam.
  //   - Score comparison is restart-safe: state re-seeds from current score on
  //     first poll, so the baseline is always correct.
  // ─────────────────────────────────────────────────────────────────────────────

  if (currentHome > state.homeScore) {
    const newGoals = currentHome - state.homeScore;
    const homeGoalEvents = events.filter(e => e.type === 'goal' && e.team === 'home');
    for (let i = 0; i < newGoals; i++) {
      const goalNum = state.homeScore + i + 1;
      // Pick the goal event that corresponds to this increment
      const ev = homeGoalEvents[homeGoalEvents.length - newGoals + i] || {};
      log.event(`Goal [${matchId}] ${homeTeam} goal #${goalNum} @ ${ev.minute || minute}'`);
      await handleEvent(
        {
          id:          `home-goal-${goalNum}`,
          type:        'goal',
          team:        'home',
          minute:      ev.minute || minute,
          player:      ev.player || homeTeam,
          description: ev.description || `${homeTeam} goal`,
        },
        {
          match, homeTeam, awayTeam, oddsStr, groups, pushSubs,
          detail: { ...detail, home_score: goalNum, away_score: currentAway },
        }
      );
    }
  }

  if (currentAway > state.awayScore) {
    const newGoals = currentAway - state.awayScore;
    const awayGoalEvents = events.filter(e => e.type === 'goal' && e.team === 'away');
    for (let i = 0; i < newGoals; i++) {
      const goalNum = state.awayScore + i + 1;
      const ev = awayGoalEvents[awayGoalEvents.length - newGoals + i] || {};
      log.event(`Goal [${matchId}] ${awayTeam} goal #${goalNum} @ ${ev.minute || minute}'`);
      await handleEvent(
        {
          id:          `away-goal-${goalNum}`,
          type:        'goal',
          team:        'away',
          minute:      ev.minute || minute,
          player:      ev.player || awayTeam,
          description: ev.description || `${awayTeam} goal`,
        },
        {
          match, homeTeam, awayTeam, oddsStr, groups, pushSubs,
          detail: { ...detail, home_score: currentHome, away_score: goalNum },
        }
      );
    }
  }

  // ── RED CARD DETECTION (count-based — same restart-safe pattern) ──────────────
  const currentHomeRed = events.filter(e => e.type === 'red_card' && e.team === 'home').length;
  const currentAwayRed = events.filter(e => e.type === 'red_card' && e.team === 'away').length;
  const prevHomeRed    = state.homeRedCards || 0;
  const prevAwayRed    = state.awayRedCards || 0;

  if (currentHomeRed > prevHomeRed) {
    const newCards = currentHomeRed - prevHomeRed;
    const homeRedEvents = events.filter(e => e.type === 'red_card' && e.team === 'home');
    for (let i = 0; i < newCards; i++) {
      const ev = homeRedEvents[prevHomeRed + i] || {};
      log.event(`Red card [${matchId}] ${homeTeam} #${prevHomeRed + i + 1} @ ${ev.minute || minute}'`);
      await handleEvent(
        {
          id:          `home-red-${prevHomeRed + i + 1}`,
          type:        'red_card',
          team:        'home',
          minute:      ev.minute || minute,
          player:      ev.player || 'Player',
          description: ev.description || `${homeTeam} red card`,
        },
        { match, homeTeam, awayTeam, detail, oddsStr, groups, pushSubs }
      );
    }
  }

  if (currentAwayRed > prevAwayRed) {
    const newCards = currentAwayRed - prevAwayRed;
    const awayRedEvents = events.filter(e => e.type === 'red_card' && e.team === 'away');
    for (let i = 0; i < newCards; i++) {
      const ev = awayRedEvents[prevAwayRed + i] || {};
      log.event(`Red card [${matchId}] ${awayTeam} #${prevAwayRed + i + 1} @ ${ev.minute || minute}'`);
      await handleEvent(
        {
          id:          `away-red-${prevAwayRed + i + 1}`,
          type:        'red_card',
          team:        'away',
          minute:      ev.minute || minute,
          player:      ev.player || 'Player',
          description: ev.description || `${awayTeam} red card`,
        },
        { match, homeTeam, awayTeam, detail, oddsStr, groups, pushSubs }
      );
    }
  }

  // ── Persist latest scores + red card counts ───────────────────────────────────
  // Both in-memory (fast) and Redis (restart-safe)
  updateMatchState(matchId, {
    homeScore:    currentHome,
    awayScore:    currentAway,
    homeRedCards: currentHomeRed,
    awayRedCards: currentAwayRed,
  });
  // Persist to Redis: scores + sent-flags so nothing re-fires after restart
  await persistMatchScore(matchId, {
    homeScore:    currentHome,
    awayScore:    currentAway,
    homeRedCards: currentHomeRed,
    awayRedCards: currentAwayRed,
    status:       currentStatus,
    sentPreMatch: state.sentPreMatch || false,
    sentKO:       state.sentKO       || false,
    sentHT:       state.sentHT       || false,
    sentFT:       state.sentFT       || false,
  });

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
      log.info(`Poller sending HT push to ${pushSubs.length} subscribers.`);
      await sendPushNotification('Half-time', `${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`, '/', pushSubs);
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
      log.info(`Poller sending FT push to ${pushSubs.length} subscribers.`);
      await sendPushNotification('Full-time', `${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`, '/', pushSubs);

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
        log.info(`Poller sending Odds Shift push to ${pushSubs.length} subscribers.`);
        await sendPushNotification('Odds Shift', `${homeTeam} vs ${awayTeam}: ${shift.field} ${shift.from}→${shift.to}`, '/', pushSubs);
      } catch (err) {
        log.error('Odds shift alert failed:', err.message);
      }
    }
  }

  updateMatchState(matchId, { odds, status: currentStatus });
}

async function handleEvent(event, { match, homeTeam, awayTeam, detail, oddsStr, groups, pushSubs }) {
  const homeScore = detail?.home_score ?? 0;
  const awayScore = detail?.away_score ?? 0;
  const style     = groups[0]?.style || 'hype';

  log.event(`Sending alert [${match.id}] ${event.type} @ ${event.minute}': ${event.description}`);

  let msg = null;
  try {
    if (event.type === 'goal' || event.type === 'own_goal') {
      // scorer: use player name from API if available; otherwise use the scoring team name
      const scoringTeam = event.team === 'home' ? homeTeam : awayTeam;
      const scorer = (event.player && !event.player.startsWith('Player #') && event.player !== homeTeam && event.player !== awayTeam)
        ? event.player
        : scoringTeam;
      msg = await generateGoalAlert({
        scorer,
        team:     event.team,
        minute:   event.minute,
        homeTeam, awayTeam, homeScore, awayScore,
        odds:     oddsStr,
        vibe:     style,
      });
      log.info(`Poller sending Goal push to ${pushSubs.length} subscribers.`);
      await sendPushNotification('GOAL!!! ⚽', `${homeTeam} ${homeScore}–${awayScore} ${awayTeam} (${event.minute}')`, '/', pushSubs);
    } else if (event.type === 'red_card') {
      msg = await generateRedCardAlert({
        player:   event.player,
        team:     event.team,
        minute:   event.minute,
        homeTeam, awayTeam, homeScore, awayScore,
        odds:     oddsStr,
        vibe:     style,
      });
      log.info(`Poller sending Red Card push to ${pushSubs.length} subscribers.`);
      await sendPushNotification('Red Card! 🟥', `${event.player} sent off in the ${event.minute}'`, '/', pushSubs);
    }
  } catch (err) {
    log.error(`AI alert failed for event ${event.id}:`, err.message);
    // Fallback plain-text alert so the user is still notified
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
