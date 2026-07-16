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
 * Called every 5 seconds by node-cron.
 * Only processes matches that at least one user is following.
 *
 * CONCURRENCY GUARD: node-cron fires the callback on a wall-clock timer regardless
 * of whether the previous invocation has resolved. Because processMatch() awaits AI
 * generation + WhatsApp sends (2-4 s per match), a single poll cycle can easily
 * exceed 5 seconds when multiple matches are live. Without this guard every slow
 * cycle would spawn an overlapping run, which is the root cause of duplicate alerts.
 *
 * The guard is a simple module-level boolean:
 *   - Set to true synchronously at the top of pollMatches() before any await.
 *   - Cleared in a finally block so it resets even if an error is thrown.
 * This guarantees at most one poll cycle is running at any moment.
 */
let _isPolling = false;

export async function pollMatches() {
  if (_isPolling) {
    log.warn('pollMatches: previous cycle still running — skipping this tick');
    return;
  }
  _isPolling = true;
  try {
    const liveMatches = await getLiveMatches();
    if (!liveMatches.length) return;

    for (const match of liveMatches) {
      const groups = getGroupsFollowingMatch(match.id);
      if (!groups.length) continue;
      await processMatch(match, groups);
    }
  } finally {
    _isPolling = false;
  }
}

async function processMatch(match, groups) {
  const matchId = String(match.id);
  let state = getMatchState(matchId);

  // First time seeing this match — init placeholder state (corrected below after detail fetch)
  if (!state) {
    initMatchState(matchId, {
      homeScore:      match.home_score ?? 0,
      awayScore:      match.away_score ?? 0,
      homeRedCards:   0,
      awayRedCards:   0,
      homeYellowCards: 0,
      awayYellowCards: 0,
      homePenalties:  0,
      awayPenalties:  0,
      addedTimeAlerts: 0,
      sentSecondHalf: false,
      status:         match.status,
      seeded:         false,
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
        seeded:          true,
        homeScore:       persisted.homeScore,
        awayScore:       persisted.awayScore,
        homeRedCards:    persisted.homeRedCards || 0,
        awayRedCards:    persisted.awayRedCards || 0,
        homeYellowCards: persisted.homeYellowCards || 0,
        awayYellowCards: persisted.awayYellowCards || 0,
        homePenalties:   persisted.homePenalties || 0,
        awayPenalties:   persisted.awayPenalties || 0,
        addedTimeAlerts: persisted.addedTimeAlerts || 0,
        sentSecondHalf:  persisted.sentSecondHalf || false,
        status:          persisted.status || currentStatus,
        // Restore sent-flags so HT/FT/KO/PreMatch are never sent twice after restart
        sentPreMatch:    persisted.sentPreMatch || false,
        sentKO:          persisted.sentKO        || false,
        sentHT:          persisted.sentHT        || false,
        sentFT:          persisted.sentFT        || false,
      });
    } else {
      // Brand-new follow: set current score as baseline, persist it immediately
      const initHomeRed = events.filter(e => e.type === 'red_card' && e.team === 'home').length;
      const initAwayRed = events.filter(e => e.type === 'red_card' && e.team === 'away').length;

      // If the match is already LIVE when someone first follows it, mark sentKO = true
      // so we never fire a belated kick-off alert, and send an "already underway" message instead.
      const alreadyLive = currentStatus === 'LIVE' || currentStatus === 'HT';
      updateMatchState(matchId, {
        seeded:          true,
        homeScore:       currentHome,
        awayScore:       currentAway,
        homeRedCards:    initHomeRed,
        awayRedCards:    initAwayRed,
        homeYellowCards: 0,
        awayYellowCards: 0,
        homePenalties:   0,
        awayPenalties:   0,
        addedTimeAlerts: 0,
        sentSecondHalf:  false,
        status:          currentStatus,
        sentKO:          alreadyLive, // suppress belated KO alert
      });
      await persistMatchScore(matchId, {
        homeScore:       currentHome,
        awayScore:       currentAway,
        homeRedCards:    initHomeRed,
        awayRedCards:    initAwayRed,
        homeYellowCards: 0,
        awayYellowCards: 0,
        homePenalties:   0,
        awayPenalties:   0,
        addedTimeAlerts: 0,
        sentSecondHalf:  false,
        status:          currentStatus,
        sentKO:          alreadyLive,
      });
      log.info(`[${matchId}] New baseline set: ${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`);

      // If the match is already live, send a one-time "already underway" catch-up message
      if (alreadyLive) {
        const scoreNow = `${currentHome}–${currentAway}`;
        const minLabel = minute ? ` (${minute}')` : '';
        const catchUpMsg = `⚽ *Match already underway!*\n\n*${homeTeam} ${scoreNow} ${awayTeam}*${minLabel}\n\nYou're now following — goal alerts, cards, and match updates will come through here automatically.`;
        try { await notifyMatchGroups(groups, catchUpMsg); } catch {}
      }

      return; // Don't replay pre-existing events as new alerts
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
        // ✅ FIX: Set sent-flag SYNCHRONOUSLY before any await — prevents a concurrent
        // poll cycle (if the guard somehow fails) from firing a second pre-match alert.
        updateMatchState(matchId, { sentPreMatch: true });
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
        // Persist so this never fires again after a restart
        await persistMatchScore(matchId, {
          homeScore:    currentHome,
          awayScore:    currentAway,
          homeRedCards: 0,
          awayRedCards: 0,
          status:       currentStatus,
          sentPreMatch: true,
          sentKO:       state.sentKO   || false,
          sentHT:       state.sentHT   || false,
          sentFT:       state.sentFT   || false,
        });
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
    // ✅ FIX: Set flag SYNCHRONOUSLY before any await.
    updateMatchState(matchId, { sentKO: true, status: currentStatus });
    const msg = `⚽ *Kick-off!*\n\n${homeTeam} vs ${awayTeam} is underway.\n\nAll goals, cards, and match updates will come through here automatically.`;
    await notifyMatchGroups(groups, msg);
    log.info(`Poller sending Kick-off push to ${pushSubs.length} subscribers.`);
    await sendPushNotification('Kick-off!', `${homeTeam} vs ${awayTeam} is underway.`, '/', pushSubs);
    // Persist so this never fires again after a restart
    await persistMatchScore(matchId, {
      homeScore:    currentHome,
      awayScore:    currentAway,
      homeRedCards: 0,
      awayRedCards: 0,
      status:       currentStatus,
      sentPreMatch: state.sentPreMatch || false,
      sentKO:       true,
      sentHT:       state.sentHT      || false,
      sentFT:       state.sentFT      || false,
    });
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
    // ✅ FIX: Update score immediately AND persist to Redis right away
    // This prevents duplicate goal alerts if a new poll cycle starts before
    // the end-of-cycle persistMatchScore() completes.
    updateMatchState(matchId, { homeScore: currentHome });
    await persistMatchScore(matchId, {
      homeScore:       currentHome,
      awayScore:       currentAway,
      homeRedCards:    state.homeRedCards || 0,
      awayRedCards:    state.awayRedCards || 0,
      homeYellowCards: state.homeYellowCards || 0,
      awayYellowCards: state.awayYellowCards || 0,
      homePenalties:   state.homePenalties || 0,
      awayPenalties:   state.awayPenalties || 0,
      addedTimeAlerts: state.addedTimeAlerts || 0,
      status:          currentStatus,
      sentPreMatch:    state.sentPreMatch || false,
      sentKO:          state.sentKO       || false,
      sentHT:          state.sentHT       || false,
      sentFT:          state.sentFT       || false,
      sentSecondHalf:  state.sentSecondHalf || false,
    });
    for (let i = 0; i < newGoals; i++) {
      const goalNum = state.homeScore + i + 1; // pre-goal snapshot + increment = post-this-goal score
      // ✅ FIX: Pick the event that matches the goalNum index directly.
      // homeGoalEvents is ordered chronologically; goalNum-1 is the correct index.
      // If the event list is short (TXline lag), fall back to the last known event.
      const ev = homeGoalEvents[goalNum - 1] || homeGoalEvents[homeGoalEvents.length - 1] || {};
      // ✅ FIX: Always pass homeTeam as the scoring team — we KNOW it's a home goal
      // because currentHome > state.homeScore. Never derive team from event metadata
      // which can be misattributed by buildEvents().
      const scorer = (ev.player && !ev.player.startsWith('Player #') && ev.player !== homeTeam && ev.player !== awayTeam)
        ? ev.player : homeTeam;
      log.event(`Goal [${matchId}] ${homeTeam} goal #${goalNum} @ ${ev.minute || 'unknown'}'`);
      await handleEvent(
        {
          id:          `home-goal-${goalNum}`,
          type:        'goal',
          team:        'home',
          minute:      ev.minute || null,
          player:      scorer,
          description: `${homeTeam} goal`,
        },
        {
          match, homeTeam, awayTeam, oddsStr, groups, pushSubs,
          // home_score = goalNum: the score AFTER this specific goal.
          // This is what the AI receives as "score now" — correct for commentary.
          detail: { ...detail, home_score: goalNum, away_score: currentAway },
        }
      );
    }
  }

  if (currentAway > state.awayScore) {
    const newGoals = currentAway - state.awayScore;
    const awayGoalEvents = events.filter(e => e.type === 'goal' && e.team === 'away');
    // ✅ FIX: Update score immediately AND persist to Redis right away
    // This prevents duplicate goal alerts if a new poll cycle starts before
    // the end-of-cycle persistMatchScore() completes.
    updateMatchState(matchId, { awayScore: currentAway });
    await persistMatchScore(matchId, {
      homeScore:       currentHome,
      awayScore:       currentAway,
      homeRedCards:    state.homeRedCards || 0,
      awayRedCards:    state.awayRedCards || 0,
      homeYellowCards: state.homeYellowCards || 0,
      awayYellowCards: state.awayYellowCards || 0,
      homePenalties:   state.homePenalties || 0,
      awayPenalties:   state.awayPenalties || 0,
      addedTimeAlerts: state.addedTimeAlerts || 0,
      status:          currentStatus,
      sentPreMatch:    state.sentPreMatch || false,
      sentKO:          state.sentKO       || false,
      sentHT:          state.sentHT       || false,
      sentFT:          state.sentFT       || false,
      sentSecondHalf:  state.sentSecondHalf || false,
    });
    for (let i = 0; i < newGoals; i++) {
      const goalNum = state.awayScore + i + 1; // pre-goal snapshot + increment = post-this-goal score
      const ev = awayGoalEvents[goalNum - 1] || awayGoalEvents[awayGoalEvents.length - 1] || {};
      // ✅ FIX: Always pass awayTeam as scorer team — same reasoning as above.
      const scorer = (ev.player && !ev.player.startsWith('Player #') && ev.player !== homeTeam && ev.player !== awayTeam)
        ? ev.player : awayTeam;
      log.event(`Goal [${matchId}] ${awayTeam} goal #${goalNum} @ ${ev.minute || 'unknown'}'`);
      await handleEvent(
        {
          id:          `away-goal-${goalNum}`,
          type:        'goal',
          team:        'away',
          minute:      ev.minute || null,
          player:      scorer,
          description: `${awayTeam} goal`,
        },
        {
          match, homeTeam, awayTeam, oddsStr, groups, pushSubs,
          // away_score = goalNum: the score AFTER this specific away goal.
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

  const currentHomeYellow = events.filter(e => e.type === 'yellow_card' && e.team === 'home').length;
  const currentAwayYellow = events.filter(e => e.type === 'yellow_card' && e.team === 'away').length;
  const prevHomeYellow    = state.homeYellowCards || 0;
  const prevAwayYellow    = state.awayYellowCards || 0;

  const currentHomePenalties = events.filter(e => ['penalty_goal', 'penalty_missed', 'penalty'].includes(e.type) && e.team === 'home').length;
  const currentAwayPenalties = events.filter(e => ['penalty_goal', 'penalty_missed', 'penalty'].includes(e.type) && e.team === 'away').length;
  const prevHomePenalties    = state.homePenalties || 0;
  const prevAwayPenalties    = state.awayPenalties || 0;

  const currentAddedTimeAlerts = events.filter(e => ['added_time', 'stoppage_time', 'injury_time', 'extra_time'].includes(e.type)).length;
  const prevAddedTimeAlerts = state.addedTimeAlerts || 0;

  if (currentHomeRed > prevHomeRed) {
    const newCards = currentHomeRed - prevHomeRed;
    const homeRedEvents = events.filter(e => e.type === 'red_card' && e.team === 'home');
    updateMatchState(matchId, { homeRedCards: currentHomeRed });
    await persistMatchScore(matchId, {
      homeScore:       currentHome,
      awayScore:       currentAway,
      homeRedCards:    currentHomeRed,
      awayRedCards:    state.awayRedCards || 0,
      homeYellowCards: state.homeYellowCards || 0,
      awayYellowCards: state.awayYellowCards || 0,
      homePenalties:   state.homePenalties || 0,
      awayPenalties:   state.awayPenalties || 0,
      addedTimeAlerts: state.addedTimeAlerts || 0,
      status:          currentStatus,
      sentPreMatch:    state.sentPreMatch || false,
      sentKO:          state.sentKO       || false,
      sentHT:          state.sentHT       || false,
      sentFT:          state.sentFT       || false,
      sentSecondHalf:  state.sentSecondHalf || false,
    });
    for (let i = 0; i < newCards; i++) {
      const ev = homeRedEvents[prevHomeRed + i] || {};
      log.event(`Red card [${matchId}] ${homeTeam} #${prevHomeRed + i + 1} @ ${ev.minute || 'unknown'}'`);
      await handleEvent(
        {
          id:          `home-red-${prevHomeRed + i + 1}`,
          type:        'red_card',
          team:        'home',
          minute:      ev.minute || null,
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
    updateMatchState(matchId, { awayRedCards: currentAwayRed });
    await persistMatchScore(matchId, {
      homeScore:       currentHome,
      awayScore:       currentAway,
      homeRedCards:    state.homeRedCards || 0,
      awayRedCards:    currentAwayRed,
      homeYellowCards: state.homeYellowCards || 0,
      awayYellowCards: state.awayYellowCards || 0,
      homePenalties:   state.homePenalties || 0,
      awayPenalties:   state.awayPenalties || 0,
      addedTimeAlerts: state.addedTimeAlerts || 0,
      status:          currentStatus,
      sentPreMatch:    state.sentPreMatch || false,
      sentKO:          state.sentKO       || false,
      sentHT:          state.sentHT       || false,
      sentFT:          state.sentFT       || false,
      sentSecondHalf:  state.sentSecondHalf || false,
    });
    for (let i = 0; i < newCards; i++) {
      const ev = awayRedEvents[prevAwayRed + i] || {};
      log.event(`Red card [${matchId}] ${awayTeam} #${prevAwayRed + i + 1} @ ${ev.minute || 'unknown'}'`);
      await handleEvent(
        {
          id:          `away-red-${prevAwayRed + i + 1}`,
          type:        'red_card',
          team:        'away',
          minute:      ev.minute || null,
          player:      ev.player || 'Player',
          description: ev.description || `${awayTeam} red card`,
        },
        { match, homeTeam, awayTeam, detail, oddsStr, groups, pushSubs }
      );
    }
  }

  if (currentHomeYellow > prevHomeYellow) {
    // Yellow card alerts disabled — can't reliably identify player from TxLINE data
  }

  if (currentAwayYellow > prevAwayYellow) {
    // Yellow card alerts disabled — can't reliably identify player from TxLINE data
  }

  if (currentHomePenalties > prevHomePenalties) {
    const newPenalties = currentHomePenalties - prevHomePenalties;
    const homePenaltyEvents = events.filter(e => ['penalty_goal', 'penalty_missed', 'penalty'].includes(e.type) && e.team === 'home');
    updateMatchState(matchId, { homePenalties: currentHomePenalties });
    await persistMatchScore(matchId, {
      homeScore:       currentHome,
      awayScore:       currentAway,
      homeRedCards:    state.homeRedCards || 0,
      awayRedCards:    state.awayRedCards || 0,
      homeYellowCards: state.homeYellowCards || 0,
      awayYellowCards: state.awayYellowCards || 0,
      homePenalties:   currentHomePenalties,
      awayPenalties:   state.awayPenalties || 0,
      addedTimeAlerts: state.addedTimeAlerts || 0,
      status:          currentStatus,
      sentPreMatch:    state.sentPreMatch || false,
      sentKO:          state.sentKO       || false,
      sentHT:          state.sentHT       || false,
      sentFT:          state.sentFT       || false,
      sentSecondHalf:  state.sentSecondHalf || false,
    });
    for (let i = 0; i < newPenalties; i++) {
      const ev = homePenaltyEvents[prevHomePenalties + i] || {};
      await handleEvent(
        {
          id:          `home-penalty-${prevHomePenalties + i + 1}`,
          type:        ev.type || 'penalty_goal',
          team:        'home',
          minute:      ev.minute || null,
          player:      ev.player || 'Player',
          description: ev.description || `${homeTeam} penalty`,
        },
        { match, homeTeam, awayTeam, detail, oddsStr, groups, pushSubs }
      );
    }
  }

  if (currentAwayPenalties > prevAwayPenalties) {
    const newPenalties = currentAwayPenalties - prevAwayPenalties;
    const awayPenaltyEvents = events.filter(e => ['penalty_goal', 'penalty_missed', 'penalty'].includes(e.type) && e.team === 'away');
    updateMatchState(matchId, { awayPenalties: currentAwayPenalties });
    await persistMatchScore(matchId, {
      homeScore:       currentHome,
      awayScore:       currentAway,
      homeRedCards:    state.homeRedCards || 0,
      awayRedCards:    state.awayRedCards || 0,
      homeYellowCards: state.homeYellowCards || 0,
      awayYellowCards: state.awayYellowCards || 0,
      homePenalties:   state.homePenalties || 0,
      awayPenalties:   currentAwayPenalties,
      addedTimeAlerts: state.addedTimeAlerts || 0,
      status:          currentStatus,
      sentPreMatch:    state.sentPreMatch || false,
      sentKO:          state.sentKO       || false,
      sentHT:          state.sentHT       || false,
      sentFT:          state.sentFT       || false,
      sentSecondHalf:  state.sentSecondHalf || false,
    });
    for (let i = 0; i < newPenalties; i++) {
      const ev = awayPenaltyEvents[prevAwayPenalties + i] || {};
      await handleEvent(
        {
          id:          `away-penalty-${prevAwayPenalties + i + 1}`,
          type:        ev.type || 'penalty_goal',
          team:        'away',
          minute:      ev.minute || null,
          player:      ev.player || 'Player',
          description: ev.description || `${awayTeam} penalty`,
        },
        { match, homeTeam, awayTeam, detail, oddsStr, groups, pushSubs }
      );
    }
  }

  if (currentAddedTimeAlerts > prevAddedTimeAlerts) {
    const addedTimeEvents = events.filter(e => ['added_time', 'stoppage_time', 'injury_time', 'extra_time'].includes(e.type));
    for (const ev of addedTimeEvents.slice(prevAddedTimeAlerts)) {
      await handleEvent(
        {
          id:          `added-time-${ev.minute || Date.now()}`,
          type:        ev.type,
          team:        ev.team || 'home',
          minute:      ev.minute || null,
          player:      ev.player || null,
          description: ev.description || 'Added time',
        },
        { match, homeTeam, awayTeam, detail, oddsStr, groups, pushSubs }
      );
    }
  }

  // ── Persist latest scores + red card counts ───────────────────────────────────
  // Both in-memory (fast) and Redis (restart-safe)
  updateMatchState(matchId, {
    homeScore:       currentHome,
    awayScore:       currentAway,
    homeRedCards:    currentHomeRed,
    awayRedCards:    currentAwayRed,
    homeYellowCards: currentHomeYellow,
    awayYellowCards: currentAwayYellow,
    homePenalties:   currentHomePenalties,
    awayPenalties:   currentAwayPenalties,
    addedTimeAlerts: currentAddedTimeAlerts,
  });
  // Persist to Redis: scores + sent-flags so nothing re-fires after restart
  await persistMatchScore(matchId, {
    homeScore:       currentHome,
    awayScore:       currentAway,
    homeRedCards:    currentHomeRed,
    awayRedCards:    currentAwayRed,
    homeYellowCards: currentHomeYellow,
    awayYellowCards: currentAwayYellow,
    homePenalties:   currentHomePenalties,
    awayPenalties:   currentAwayPenalties,
    addedTimeAlerts: currentAddedTimeAlerts,
    status:          currentStatus,
    sentPreMatch:    state.sentPreMatch || false,
    sentKO:          state.sentKO       || false,
    sentHT:          state.sentHT       || false,
    sentFT:          state.sentFT       || false,
    sentSecondHalf:  state.sentSecondHalf || false,
  });

  // ── Second-half start ────────────────────────────────────────────────────────
  if (currentStatus === 'LIVE' && state.status === 'HT' && !state.sentSecondHalf) {
    log.event(`Second half underway: ${homeTeam} vs ${awayTeam}`);
    updateMatchState(matchId, { sentSecondHalf: true });
    try {
      const msg = `⚽ *Second half underway!*\n\n${homeTeam} vs ${awayTeam} are back out for the second half.\n\nWe’ll keep you updated with every major moment.`;
      await notifyMatchGroups(groups, msg);
      await sendPushNotification('Second half underway', `${homeTeam} vs ${awayTeam} are back out for the second half.`, '/', pushSubs);
    } catch (err) {
      log.error('Second-half alert failed:', err.message);
    }
    await persistMatchScore(matchId, {
      homeScore:       currentHome,
      awayScore:       currentAway,
      homeRedCards:    currentHomeRed,
      awayRedCards:    currentAwayRed,
      homeYellowCards: currentHomeYellow,
      awayYellowCards: currentAwayYellow,
      homePenalties:   currentHomePenalties,
      awayPenalties:   currentAwayPenalties,
      addedTimeAlerts: currentAddedTimeAlerts,
      status:          currentStatus,
      sentPreMatch:    state.sentPreMatch || false,
      sentKO:          state.sentKO       || false,
      sentHT:          true,
      sentFT:          state.sentFT       || false,
      sentSecondHalf:  true,
    });
  }

  // ── Half-time report ──────────────────────────────────────────────────────────
  if (currentStatus === 'HT' && !state.sentHT) {
    log.event(`Half-time: ${homeTeam} vs ${awayTeam}`);
    // ✅ FIX: Set flag SYNCHRONOUSLY before any await.
    updateMatchState(matchId, { sentHT: true });
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
    await persistMatchScore(matchId, {
      homeScore:       currentHome,
      awayScore:       currentAway,
      homeRedCards:    currentHomeRed,
      awayRedCards:    currentAwayRed,
      homeYellowCards: currentHomeYellow,
      awayYellowCards: currentAwayYellow,
      homePenalties:   currentHomePenalties,
      awayPenalties:   currentAwayPenalties,
      addedTimeAlerts: currentAddedTimeAlerts,
      status:          currentStatus,
      sentPreMatch:    state.sentPreMatch || false,
      sentKO:          state.sentKO       || false,
      sentHT:          true,
      sentFT:          state.sentFT       || false,
      sentSecondHalf:  state.sentSecondHalf || false,
    });
  }

  // ── Full-time report ──────────────────────────────────────────────────────────
  if (currentStatus === 'FT' && !state.sentFT) {
    log.event(`Full-time: ${homeTeam} ${currentHome}-${currentAway} ${awayTeam}`);
    // ✅ FIX: Set flag SYNCHRONOUSLY before any await.
    updateMatchState(matchId, { sentFT: true });
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
    await persistMatchScore(matchId, {
      homeScore:       currentHome,
      awayScore:       currentAway,
      homeRedCards:    currentHomeRed,
      awayRedCards:    currentAwayRed,
      homeYellowCards: currentHomeYellow,
      awayYellowCards: currentAwayYellow,
      homePenalties:   currentHomePenalties,
      awayPenalties:   currentAwayPenalties,
      addedTimeAlerts: currentAddedTimeAlerts,
      status:          currentStatus,
      sentPreMatch:    state.sentPreMatch || false,
      sentKO:          state.sentKO       || false,
      sentHT:          state.sentHT       || false,
      sentFT:          true,
      sentSecondHalf:  state.sentSecondHalf || false,
    });
  }

  // ── Odds shift alert ──────────────────────────────────────────────────────────
  // Rate-limited to max once every 15 minutes per match, and only for plausible odds (<= 10.0)
  // to avoid high-volatility underdog drift spam in the final minutes.
  if (odds && state.odds) {
    const shift = detectOddsShift(state.odds, odds);
    const nowMs = Date.now();
    const lastOddsAlertTime = state.lastOddsAlertTime || 0;
    const timeSinceLastAlert = nowMs - lastOddsAlertTime;

    const fromVal = Number(shift.from);
    const toVal = Number(shift.to);

    if (
      shift.shifted &&
      fromVal <= 10.0 &&
      toVal <= 10.0 &&
      timeSinceLastAlert >= 15 * 60 * 1000
    ) {
      log.event(`Odds shift: ${homeTeam} vs ${awayTeam} — ${shift.field} ${shift.from}→${shift.to}`);
      // ✅ FIX: Set lastOddsAlertTime SYNCHRONOUSLY before any await — this is
      // the rate-limit guard; setting it after await means two concurrent polls
      // could both pass the timeSinceLastAlert check and both fire.
      updateMatchState(matchId, { lastOddsAlertTime: nowMs });
      try {
        const msg = await generateOddsShiftAlert({
          homeTeam, awayTeam, minute,
          ...shift,
          vibe: groups[0]?.style,
        });
        await notifyMatchGroups(groups, msg);
        log.info(`Poller sending Odds Shift push to ${pushSubs.length} subscribers.`);
        await persistMatchScore(matchId, {
          homeScore:         currentHome,
          awayScore:         currentAway,
          homeRedCards:      currentHomeRed,
          awayRedCards:      currentAwayRed,
          homeYellowCards:   currentHomeYellow,
          awayYellowCards:   currentAwayYellow,
          homePenalties:     currentHomePenalties,
          awayPenalties:     currentAwayPenalties,
          addedTimeAlerts:   currentAddedTimeAlerts,
          status:            currentStatus,
          sentPreMatch:      state.sentPreMatch || false,
          sentKO:            state.sentKO       || false,
          sentHT:            state.sentHT       || false,
          sentFT:            state.sentFT       || false,
          sentSecondHalf:    state.sentSecondHalf || false,
          lastOddsAlertTime: nowMs,
        });
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
    } else if (event.type === 'yellow_card') {
      // Yellow card alerts disabled
      return;
      log.info(`Poller sending Yellow Card push to ${pushSubs.length} subscribers.`);
      await sendPushNotification('Yellow Card! 🟨', `${event.player || 'A player'} booked in the ${event.minute}'`, '/', pushSubs);
    } else if (event.type === 'penalty_goal' || event.type === 'penalty_missed' || event.type === 'penalty') {
      const penaltyLabel = event.type === 'penalty_missed' ? 'Penalty missed' : 'Penalty goal';
      msg = `🎯 *${penaltyLabel}!* ${event.player || 'A player'} involved${event.minute ? ` (${event.minute}')` : ''}`;
      log.info(`Poller sending Penalty push to ${pushSubs.length} subscribers.`);
      await sendPushNotification('Penalty! 🎯', `${penaltyLabel} at ${event.minute}'`, '/', pushSubs);
    } else if (event.type === 'added_time') {
      msg = `⏱️ *Added time!* The referee has signalled stoppage time${event.minute ? ` (${event.minute}')` : ''}`;
      log.info(`Poller sending Added Time push to ${pushSubs.length} subscribers.`);
      await sendPushNotification('Added time ⏱️', 'Stoppage time is being played.', '/', pushSubs);
    }
  } catch (err) {
    log.error(`AI alert failed for event ${event.id}:`, err.message);
    // Fallback plain-text alert so the user is still notified
    const minLabel = event.minute ? `${event.minute}'` : '';
    if (event.type === 'goal' || event.type === 'own_goal') {
      msg = `⚽ *GOAL!* ${homeTeam} ${homeScore}–${awayScore} ${awayTeam}${minLabel ? ` (${minLabel})` : ''}`;
    } else if (event.type === 'red_card') {
      msg = `🟥 *Red card!* ${event.player || 'A player'} sent off${minLabel ? ` (${minLabel})` : ''}`;
    } else if (event.type === 'penalty_goal' || event.type === 'penalty_missed' || event.type === 'penalty') {
      msg = `🎯 *${event.type === 'penalty_missed' ? 'Penalty missed' : 'Penalty goal'}!*${minLabel ? ` (${minLabel})` : ''}`;
    } else if (event.type === 'added_time') {
      msg = `⏱️ *Added time!*${minLabel ? ` (${minLabel})` : ''}`;
    }
  }

  if (msg) {
    await notifyMatchGroups(groups, msg);
  }
}
