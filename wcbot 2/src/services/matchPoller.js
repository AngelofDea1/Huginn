import {
  generateGoalAlert, generateRedCardAlert,
  generateHalfTimeReport, generateFullTimeReport,
  generateKickoffAlert, generateStoppageTimeAlert, 
  generateYellowCardAlert, generatePenaltyAlert,
  generateVarAlert
} from './ai.js';
import { processMatchPredictions } from '../handlers/predict.js';
import { notifyMatchGroups } from './whatsapp.js';
import {
  getMatchState, initMatchState, updateMatchState,
  getGroupsFollowingMatch
} from '../utils/store.js';
import {
  persistMatchScore, getSubscribersForTeams
} from '../utils/subscriptionStore.js';
import { log } from '../utils/logger.js';
import { sendPushNotification } from './pushNotify.js';
import { sseClient } from './sse.js';
import { getAllFixtures } from './txline.js';

let fixtureCache = new Map();

/**
 * Initializes the real-time event pipeline
 */
export async function initMatchPoller() {
  log.info('poller', 'Initializing real-time SSE match listener...');
  
  // Pre-fetch all fixtures to resolve team names quickly
  try {
    const all = await getAllFixtures();
    all.forEach(f => fixtureCache.set(String(f.id), f));
  } catch(e) {
    log.error('poller', `Failed to pre-fetch fixtures: ${e.message}`);
  }

  sseClient.on('score_update', async (evt) => {
    try {
      await processSSEEvent(evt);
    } catch (err) {
      log.error('poller', `Error processing event: ${err.message}`);
    }
  });

  // Keep cache somewhat fresh every hour
  setInterval(async () => {
    try {
      const all = await getAllFixtures();
      all.forEach(f => fixtureCache.set(String(f.id), f));
    } catch(e) {}
  }, 60 * 60 * 1000);

  // We do NOT call sseClient.connect() here, it will be called by the bot bootstrap.
}

async function processSSEEvent(evt) {
  const matchId = String(evt.FixtureId);
  const groups = getGroupsFollowingMatch(matchId);
  if (!groups.length) return; // No one cares about this match right now

  let fixture = fixtureCache.get(matchId);
  // Fallback if not in cache (could be a new match)
  if (!fixture) {
    const all = await getAllFixtures();
    fixture = all.find(f => String(f.id) === matchId);
    if (fixture) fixtureCache.set(matchId, fixture);
  }

  const homeTeam = fixture?.home_team?.name || 'Home';
  const awayTeam = fixture?.away_team?.name || 'Away';
  
  let state = getMatchState(matchId);
  if (!state) {
    initMatchState(matchId, {
      homeScore: 0,
      awayScore: 0,
      status: 'NS',
      seeded: false,
      lastSeq: -1
    });
    state = getMatchState(matchId);
  }

  // Prevent processing old events
  if (evt.Seq <= state.lastSeq && evt.Seq !== undefined) return;
  
  const currentHome = evt.Score?.Participant1?.Total?.Goals ?? state.homeScore;
  const currentAway = evt.Score?.Participant2?.Total?.Goals ?? state.awayScore;
  const evtMinute = evt.Clock?.Seconds ? Math.floor(evt.Clock.Seconds / 60) : (evt.Elapsed || '');

  const updates = [];
  let alertMsg = null;

  // Real-time Event AI Dispatch
  if (evt.Action === 'kickoff' || evt.Action === 'kickoff_team') {
    const half = evt.Phase === 3 || evt.Phase === 4 ? '2H' : '1H';
    alertMsg = await generateKickoffAlert({ half, homeTeam, awayTeam, vibe: 'hype' });
    state.status = 'LIVE';
  } else if (evt.Action === 'goal') {
    const team = evt.Data?.Participant === 1 ? 'home' : 'away';
    alertMsg = await generateGoalAlert({
      team, homeTeam, awayTeam, minute: evtMinute,
      homeScore: currentHome, awayScore: currentAway, vibe: 'hype'
    });
  } else if (evt.Action === 'penalty_outcome') {
    const team = evt.Data?.Participant === 1 ? 'home' : 'away';
    alertMsg = await generatePenaltyAlert({
      outcome: evt.Data?.Outcome, team, homeTeam, awayTeam, minute: evtMinute,
      homeScore: currentHome, awayScore: currentAway, vibe: 'hype'
    });
  } else if (evt.Action === 'var') {
    alertMsg = await generateVarAlert({
      homeTeam, awayTeam, minute: evtMinute,
      homeScore: currentHome, awayScore: currentAway, vibe: 'hype'
    });
  } else if (evt.Action === 'yellow_card') {
    const team = evt.Data?.Participant === 1 ? 'home' : 'away';
    alertMsg = await generateYellowCardAlert({
      team, homeTeam, awayTeam, minute: evtMinute,
      homeScore: currentHome, awayScore: currentAway, vibe: 'hype'
    });
  } else if (evt.Action === 'red_card') {
    const team = evt.Data?.Participant === 1 ? 'home' : 'away';
    alertMsg = await generateRedCardAlert({
      team, homeTeam, awayTeam, minute: evtMinute,
      homeScore: currentHome, awayScore: currentAway, vibe: 'hype'
    });
  } else if (evt.Action === 'additional_time') {
    alertMsg = await generateStoppageTimeAlert({
      minutes: evt.Data?.Minutes || 0,
      homeTeam, awayTeam,
      homeScore: currentHome, awayScore: currentAway, vibe: 'hype'
    });
  } else if (evt.Action === 'halftime_finalised') {
    alertMsg = await generateHalfTimeReport({
      homeTeam, awayTeam, homeScore: currentHome, awayScore: currentAway, highlights: []
    }, 'balanced');
    state.status = 'HT';
  } else if (evt.Phase === 5 && state.status !== 'FT') { // Match Finished
    alertMsg = await generateFullTimeReport({
      homeTeam, awayTeam, homeScore: currentHome, awayScore: currentAway, highlights: []
    }, 'balanced');
    state.status = 'FT';
    processMatchPredictions(matchId, homeTeam, awayTeam, currentHome, currentAway).catch(e => log.error('poller', 'prediction error: ' + e.message));
  }

  if (alertMsg) updates.push(alertMsg);

  if (evt.Seq !== undefined) state.lastSeq = evt.Seq;
  state.homeScore = currentHome;
  state.awayScore = currentAway;

  updateMatchState(matchId, state);
  await persistMatchScore(matchId, state);

  // Dispatch all updates
  for (const text of updates) {
    await notifyMatchGroups(groups, text);
    
    // Web Push
    const teamSubscribers = await getSubscribersForTeams([homeTeam, awayTeam]);
    const payload = {
      title: `${homeTeam} vs ${awayTeam}`,
      body: text,
      icon: '/icons/icon-192x192.png',
      url: '/live-chat'
    };
    for (const subStr of teamSubscribers) {
      try {
        const sub = JSON.parse(subStr);
        await sendPushNotification(sub, payload);
      } catch (e) {}
    }
  }
}
