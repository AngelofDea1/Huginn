/**
 * store.js - simple in-memory store
 *
 * In production you'd swap this for Supabase/Redis.
 * For the hackathon, this works perfectly.
 *
 * Structure:
 *   groups: Map<groupId, { vibe, followedMatchIds: Set, name }>
 *   matchState: Map<matchId, { lastEventId, homeScore, awayScore, status, odds, sentHT, sentFT, sentPreMatch }>
 */

const groups = new Map();
const matchState = new Map();

//  Group helpers 

export function registerGroup(groupId, name = 'your group') {
  if (!groups.has(groupId)) {
    groups.set(groupId, {
      name,
      vibe: 'hype',           // default personality
      followedMatchIds: new Set(),
    });
  }
  return groups.get(groupId);
}

export function getGroup(groupId) {
  return groups.get(groupId) || null;
}

export function getAllGroups() {
  return [...groups.values()].map((g, i) => ({ ...g, id: [...groups.keys()][i] }));
}

export function setGroupVibe(groupId, vibe) {
  const group = groups.get(groupId);
  if (group) group.vibe = vibe;
}

export function followMatch(groupId, matchId) {
  const group = groups.get(groupId);
  if (group) group.followedMatchIds.add(String(matchId));
}

export function unfollowMatch(groupId, matchId) {
  const group = groups.get(groupId);
  if (group) group.followedMatchIds.delete(String(matchId));
}

export function getGroupsFollowingMatch(matchId) {
  const result = [];
  for (const [id, group] of groups.entries()) {
    if (group.followedMatchIds.has(String(matchId))) {
      result.push({ id, ...group });
    }
  }
  return result;
}

//  Match state helpers 

export function getMatchState(matchId) {
  return matchState.get(String(matchId)) || null;
}

export function initMatchState(matchId, data) {
  matchState.set(String(matchId), {
    lastEventId: null,
    homeScore: 0,
    awayScore: 0,
    status: 'pre',
    odds: null,
    sentHT: false,
    sentFT: false,
    sentPreMatch: false,
    ...data,
  });
}

export function updateMatchState(matchId, updates) {
  const current = matchState.get(String(matchId)) || {};
  matchState.set(String(matchId), { ...current, ...updates });
}

export function getAllMatchStates() {
  return matchState;
}
