/**
 * store.js - simple in-memory store
 *
 * Structure:
 *   groups:     Map<groupId, { style, followedMatchIds: Set, name }>
 *   matchState: Map<matchId, { seenEventIds: Set, homeScore, awayScore, status, odds, sentKO, sentHT, sentFT, sentPreMatch }>
 */

const groups     = new Map();
const matchState = new Map();
const contacted  = new Set(); // JIDs that have already received the welcome message

// ── First-contact helpers ──────────────────────────────────────────────────────

export function isFirstContact(jid) {
  return !contacted.has(jid);
}

export function markContacted(jid) {
  contacted.add(jid);
}

// ── Group helpers ──────────────────────────────────────────────────────────────

export function registerGroup(groupId, name = 'your group') {
  if (!groups.has(groupId)) {
    groups.set(groupId, {
      name,
      style: 'hype',
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

export function setGroupStyle(groupId, style) {
  const group = groups.get(groupId);
  if (group) group.style = style;
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

// ── Match state helpers ────────────────────────────────────────────────────────

export function getMatchState(matchId) {
  return matchState.get(String(matchId)) || null;
}

export function initMatchState(matchId, data) {
  // Only initialise if no state exists yet — never overwrite existing state
  if (matchState.has(String(matchId))) return;
  matchState.set(String(matchId), {
    seenEventIds:  new Set(),   // all event IDs we have already alerted on
    homeScore:     0,
    awayScore:     0,
    status:        'pre',
    odds:          null,
    sentKO:        false,
    sentHT:        false,
    sentFT:        false,
    sentPreMatch:  false,
    ...data,
  });
}

/**
 * Call this when someone follows a match that is already in progress.
 * Seeds seenEventIds with every current event so we only alert on FUTURE ones.
 */
export function seedMatchEvents(matchId, currentEvents = []) {
  const state = matchState.get(String(matchId));
  if (!state) return;
  for (const e of currentEvents) {
    state.seenEventIds.add(e.id);
  }
}

export function markEventSeen(matchId, eventId) {
  const state = matchState.get(String(matchId));
  if (state) state.seenEventIds.add(eventId);
}

export function hasSeenEvent(matchId, eventId) {
  const state = matchState.get(String(matchId));
  return state ? state.seenEventIds.has(eventId) : false;
}

export function updateMatchState(matchId, updates) {
  const current = matchState.get(String(matchId)) || {};
  matchState.set(String(matchId), { ...current, ...updates });
}

export function getAllMatchStates() {
  return matchState;
}
