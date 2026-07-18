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
  } catch (err) {
    log.error('pollMatches Error:', err.message);
  } finally {
    _isPolling = false;
  }
}

async function processMatch(match, groups) {
  const matchId = String(match.id);
  let state = getMatchState(matchId);

  if (!state) {
    initMatchState(matchId, {
      homeScore: match.home_score ?? 0,
      awayScore: match.away_score ?? 0,
      status: match.status,
      seeded: false
    });
    state = getMatchState(matchId);
  }

  const detail = await getMatchDetail(matchId);
  if (!detail) return;

  const homeTeam = match.home_team?.name || 'Home';
  const awayTeam = match.away_team?.name || 'Away';
  const minute = detail.minute;
  const currentHome = detail.home_score ?? 0;
  const currentAway = detail.away_score ?? 0;
  const currentStatus = detail.status;

  const updates = [];

  // 1. Goal Detection (Pure diff-based on the Score tree)
  if (currentHome > state.homeScore) {
    updates.push(await generateGoalAlert({
      team: 'home', homeTeam, awayTeam,
      scorerName: 'Home Player', minute,
      homeScore: currentHome, awayScore: currentAway,
    }, 'hype'));
    state.homeScore = currentHome;
  }

  if (currentAway > state.awayScore) {
    updates.push(await generateGoalAlert({
      team: 'away', homeTeam, awayTeam,
      scorerName: 'Away Player', minute,
      homeScore: currentHome, awayScore: currentAway,
    }, 'hype'));
    state.awayScore = currentAway;
  }

  // 2. Status Changes
  if (currentStatus === 'HT' && state.status !== 'HT') {
    updates.push(await generateHalfTimeReport({
      homeTeam, awayTeam,
      homeScore: currentHome, awayScore: currentAway,
      highlights: []
    }, 'balanced'));
    state.status = 'HT';
  }

  if (currentStatus === 'FT' && state.status !== 'FT') {
    updates.push(await generateFullTimeReport({
      homeTeam, awayTeam,
      homeScore: currentHome, awayScore: currentAway,
      highlights: []
    }, 'balanced'));
    state.status = 'FT';
  }

  // Save updated state locally and to Redis
  updateMatchState(matchId, state);
  await persistMatchScore(matchId, state);

  // Dispatch updates
  for (const text of updates) {
    for (const jid of groups) {
      await notifyMatchGroups(jid, text);
    }
    
    // Dispatch Web Push
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
      } catch (e) {
        log.error('Push error:', e.message);
      }
    }
  }
}
