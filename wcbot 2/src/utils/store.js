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

import { persistGroup, removeGroupFromDb, getAllPersistedGroups } from './subscriptionStore.js';

export function registerGroup(groupId, name = 'your group') {
  if (!groups.has(groupId)) {
    const newGroup = {
      name,
      style: 'hype',
      followedMatchIds: new Set(),
    };
    groups.set(groupId, newGroup);
    persistGroup(groupId, newGroup).catch(err => console.error('[store] persistGroup failed (register):', err.message));
  }
  return groups.get(groupId);
}

export function getGroup(groupId) {
  return groups.get(groupId) || null;
}

export function getAllGroups() {
  return [...groups.entries()].map(([id, g]) => ({ ...g, id }));
}

export function setGroupStyle(groupId, style) {
  const group = groups.get(groupId);
  if (group) {
    group.style = style;
    persistGroup(groupId, group).catch(err => console.error('[store] persistGroup failed (style):', err.message));
  }
}

export function followMatch(groupId, matchId) {
  const group = groups.get(groupId);
  if (group) {
    group.followedMatchIds.add(String(matchId));
    persistGroup(groupId, group).catch(err => console.error('[store] persistGroup failed (follow):', err.message));
  }
}

export function unfollowMatch(groupId, matchId) {
  const group = groups.get(groupId);
  if (group) {
    group.followedMatchIds.delete(String(matchId));
    persistGroup(groupId, group).catch(err => console.error('[store] persistGroup failed (unfollow):', err.message));
  }
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

export async function loadGroupsFromRedis() {
  try {
    const list = await getAllPersistedGroups();
    for (const g of list) {
      const entry = {
        name:             g.name,
        style:            g.style,
        followedMatchIds: g.followedMatchIds,
      };
      // Restore predictions if persisted
      if (g.predictions) {
        entry.predictions = g.predictions;
      }
      groups.set(g.id, entry);
    }
    console.log(`Loaded ${list.length} groups/private chats from Redis.`);
  } catch (err) {
    console.error('Failed to load groups from Redis:', err.message);
  }
}

// ── Match state helpers ────────────────────────────────────────────────────────

export function getMatchState(matchId) {
  return matchState.get(String(matchId)) || null;
}

export function initMatchState(matchId, data) {
  // Only initialise if no state exists yet — never overwrite existing state
  if (matchState.has(String(matchId))) return;
  matchState.set(String(matchId), {
    homeScore:     0,
    awayScore:     0,
    homeRedCards:  0,   // count-based red card tracking (restart-safe)
    awayRedCards:  0,
    status:        'pre',
    odds:          null,
    sentKO:        false,
    sentHT:        false,
    sentFT:        false,
    sentPreMatch:  false,
    seeded:        false, // true after first poll baseline is established
    ...data,
  });
}

/**
 * Call this when someone follows a match that is already in progress.
 * Score-based dedup is now used (not event IDs), so this is a safe no-op.
 * Kept for API compatibility with webhook.js.
 */
export function seedMatchEvents(matchId, currentEvents = []) {
  // No-op: baseline seeding is handled by Redis persistMatchScore in matchPoller.js
}

// Kept for API compatibility — score-based dedup replaced event-ID dedup
export function markEventSeen(matchId, eventId) {}

export function hasSeenEvent(matchId, eventId) { return false; }

export function updateMatchState(matchId, updates) {
  const current = matchState.get(String(matchId)) || {};
  matchState.set(String(matchId), { ...current, ...updates });
}

export function getAllMatchStates() {
  return matchState;
}

export function resetRuntimeState() {
  groups.clear();
  matchState.clear();
  webChatMessages.clear();
  return { groupsCleared: true, matchStatesCleared: true, webChatsCleared: true };
}

// ── Web Chat Messages Store & Pruning ──────────────────────────────────────────
const webChatMessages = new Map();

export function addWebChatMessage(sessionId, message) {
  if (!webChatMessages.has(sessionId)) {
    webChatMessages.set(sessionId, { messages: [], lastActive: Date.now() });
  }
  const session = webChatMessages.get(sessionId);
  session.messages.push(message);
  session.lastActive = Date.now();
}

export function getWebChatMessages(sessionId) {
  if (!webChatMessages.has(sessionId)) {
    webChatMessages.set(sessionId, { messages: [], lastActive: Date.now() });
  }
  const session = webChatMessages.get(sessionId);
  session.lastActive = Date.now();
  return session.messages;
}

export function pruneInactiveWebChats(maxAgeMs) {
  const now = Date.now();
  let prunedCount = 0;
  for (const [sessionId, data] of webChatMessages.entries()) {
    if (now - data.lastActive > maxAgeMs) {
      webChatMessages.delete(sessionId);
      prunedCount++;
    }
  }
  return prunedCount;
}

