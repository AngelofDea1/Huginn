/**
 * db.js - Push subscription storage backed by Upstash Redis
 *
 * Data model:
 *   sub:{sessionId}              → JSON { subscription: {...} | null, followedTeams: string[] }
 *   team:{teamName}:subscribers  → Redis Set of sessionIds
 *
 * This gives us fast per-team fan-out (SMEMBERS) without scanning all subscriptions,
 * and works on Render's free tier — no persistent disk required.
 */

import { Redis } from '@upstash/redis';
import { log } from './logger.js';

let redis;
try {
  redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  log.info('Upstash Redis client initialized.');
} catch (err) {
  log.error('Failed to initialize Upstash Redis client:', err.message);
  process.exit(1);
}

// ─── Key helpers ──────────────────────────────────────────────────────────────

const subKey  = (sessionId) => `sub:${sessionId}`;
const teamKey = (team)      => `team:${team.trim().toLowerCase()}:subscribers`;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Read a subscription record for a session.
 * @upstash/redis automatically deserializes stored JSON → returns plain object.
 */
async function getRecord(sessionId) {
  const raw = await redis.get(subKey(sessionId));
  if (!raw) return null;
  // Guard: the client normally deserialises, but handle string fallback
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

// ─── Public API (same surface as previous SQLite version) ─────────────────────

/**
 * Register or update push subscription for a sessionId.
 * Preserves any existing followedTeams.
 */
export async function saveSubscription(sessionId, subscription) {
  const existing = await getRecord(sessionId);
  const record = existing ?? { subscription: null, followedTeams: [] };
  record.subscription = subscription;
  await redis.set(subKey(sessionId), record);
  log.info(`PWA Push Subscription registered/updated for session: ${sessionId}`);
}

/**
 * Null out the push subscription for a sessionId (keeps followedTeams intact).
 */
export async function removeSubscription(sessionId) {
  const record = await getRecord(sessionId);
  if (!record) return;
  record.subscription = null;
  await redis.set(subKey(sessionId), record);
}

/**
 * Delete a dead subscription by its endpoint URL (called on 410 / 404 push errors).
 * Deletes the sub key AND removes the sessionId from every team set it belongs to.
 */
export async function deleteSubscriptionByEndpoint(endpoint) {
  let cursor = 0;
  try {
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'sub:*', count: 100 });
      cursor = Number(nextCursor);

      await Promise.all(keys.map(async (key) => {
        try {
          const raw  = await redis.get(key);
          if (!raw) return;
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (data.subscription?.endpoint !== endpoint) return;

          const sessionId = key.replace(/^sub:/, '');
          const teams = data.followedTeams || [];

          // Remove from every team set in parallel
          if (teams.length) {
            await Promise.all(teams.map(t => redis.srem(teamKey(t), sessionId)));
          }
          await redis.del(key);
          log.info(`Deleted dead subscription and team memberships for session: ${sessionId}`);
        } catch (innerErr) {
          log.error(`Error cleaning up dead subscription key ${key}:`, innerErr.message);
        }
      }));
    } while (cursor !== 0);
  } catch (err) {
    log.error('deleteSubscriptionByEndpoint scan failed:', err.message);
  }
}

/**
 * Add a team to a session's followed list and to the Redis team set.
 */
export async function followTeam(sessionId, teamName) {
  const team   = teamName.trim().toLowerCase();
  const record = (await getRecord(sessionId)) ?? { subscription: null, followedTeams: [] };

  if (!Array.isArray(record.followedTeams)) record.followedTeams = [];
  if (!record.followedTeams.includes(team)) record.followedTeams.push(team);

  await Promise.all([
    redis.set(subKey(sessionId), record),
    redis.sadd(teamKey(team), sessionId),
  ]);
}

/**
 * Remove a team from a session's followed list and from the Redis team set.
 */
export async function unfollowTeam(sessionId, teamName) {
  const team   = teamName.trim().toLowerCase();
  const record = await getRecord(sessionId);
  if (!record) return;

  record.followedTeams = (record.followedTeams || []).filter(t => t !== team);

  await Promise.all([
    redis.set(subKey(sessionId), record),
    redis.srem(teamKey(team), sessionId),
  ]);
}

/**
 * Get active subscriptions (with a real .subscription object) for the given team names.
 * Uses the per-team Sets for O(team-fans) lookup rather than a full scan.
 */
export async function getSubscribersForTeams(teamNames) {
  const lowerTeams = teamNames.map(t => t.trim().toLowerCase());

  // Collect unique sessionIds from all relevant team sets
  const memberArrays = await Promise.all(lowerTeams.map(t => redis.smembers(teamKey(t))));
  const sessionIds   = [...new Set(memberArrays.flat())];
  if (!sessionIds.length) return [];

  // Fetch each subscription record
  const results = [];
  await Promise.all(sessionIds.map(async (sessionId) => {
    try {
      const record = await getRecord(sessionId);
      if (record?.subscription) {
        results.push({ sessionId, subscription: record.subscription });
      }
    } catch (err) {
      log.error(`Failed to fetch record for session ${sessionId}:`, err.message);
    }
  }));
  return results;
}

/**
 * Get all active subscriptions (used by /api/push/test).
 * Full scan — only called on explicit test trigger, not the polling loop.
 */
export async function getAllActiveSubscriptions() {
  const results = [];
  let cursor = 0;
  try {
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'sub:*', count: 100 });
      cursor = Number(nextCursor);

      await Promise.all(keys.map(async (key) => {
        try {
          const raw  = await redis.get(key);
          if (!raw) return;
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (data.subscription) results.push(data.subscription);
        } catch {}
      }));
    } while (cursor !== 0);
  } catch (err) {
    log.error('getAllActiveSubscriptions scan failed:', err.message);
  }
  return results;
}

// ─── WhatsApp Group Persistence ───────────────────────────────────────────────

const groupKey = (groupId) => `wagroup:${groupId}`;

export async function persistGroup(groupId, groupData) {
  try {
    // Save to Redis (automatically serializes object structure)
    await redis.set(groupKey(groupId), {
      name: groupData.name,
      style: groupData.style,
      followedMatchIds: [...groupData.followedMatchIds]
    });
  } catch (err) {
    log.error(`Failed to persist group ${groupId} to Redis:`, err.message);
  }
}

export async function removeGroupFromDb(groupId) {
  try {
    await redis.del(groupKey(groupId));
  } catch (err) {
    log.error(`Failed to delete group ${groupId} from Redis:`, err.message);
  }
}

export async function getAllPersistedGroups() {
  const results = [];
  let cursor = 0;
  try {
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'wagroup:*', count: 100 });
      cursor = Number(nextCursor);

      for (const key of keys) {
        try {
          const raw = await redis.get(key);
          if (raw) {
            const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const groupId = key.replace('wagroup:', '');
            results.push({
              id: groupId,
              name: data.name,
              style: data.style || 'hype',
              followedMatchIds: new Set(data.followedMatchIds || [])
            });
          }
        } catch {}
      }
    } while (cursor !== 0);
  } catch (err) {
    log.error('getAllPersistedGroups scan failed:', err.message);
  }
  return results;
}

export async function resetPersistedFollowState() {
  const result = { groupsRemoved: 0, matchScoresRemoved: 0, teamMembershipsCleared: 0, subscriptionsReset: 0 };

  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'wagroup:*', count: 100 });
      cursor = Number(nextCursor);
      if (keys.length) {
        await redis.del(...keys);
        result.groupsRemoved += keys.length;
      }
    } while (cursor !== 0);
  } catch (err) {
    log.error('Failed to clear persisted group state:', err.message);
  }

  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'matchscore:*', count: 100 });
      cursor = Number(nextCursor);
      if (keys.length) {
        await redis.del(...keys);
        result.matchScoresRemoved += keys.length;
      }
    } while (cursor !== 0);
  } catch (err) {
    log.error('Failed to clear persisted match scores:', err.message);
  }

  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'team:*', count: 100 });
      cursor = Number(nextCursor);
      if (keys.length) {
        await redis.del(...keys);
        result.teamMembershipsCleared += keys.length;
      }
    } while (cursor !== 0);
  } catch (err) {
    log.error('Failed to clear team membership sets:', err.message);
  }

  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'sub:*', count: 100 });
      cursor = Number(nextCursor);
      if (keys.length) {
        const records = await Promise.all(keys.map(async (key) => {
          try {
            const raw = await redis.get(key);
            return typeof raw === 'string' ? JSON.parse(raw) : raw;
          } catch {
            return null;
          }
        }));

        const updates = [];
        for (let i = 0; i < keys.length; i++) {
          const record = records[i];
          if (!record) continue;
          const nextRecord = { ...(record || {}), followedTeams: [] };
          updates.push(redis.set(keys[i], nextRecord));
        }
        await Promise.all(updates);
        result.subscriptionsReset += keys.length;
      }
    } while (cursor !== 0);
  } catch (err) {
    log.error('Failed to clear persisted followed teams:', err.message);
  }

  return result;
}

// ─── First-contact / Welcome Persistence ─────────────────────────────────────
// Stored in Redis so the welcome message is only EVER sent once,
// even across server restarts / Render redeployments.

const welcomedKey = (jid) => `welcomed:${jid}`;

export async function markWelcomed(jid) {
  try {
    await redis.set(welcomedKey(jid), '1');
  } catch (err) {
    log.error(`Failed to mark ${jid} as welcomed:`, err.message);
  }
}

export async function hasBeenWelcomed(jid) {
  try {
    const val = await redis.get(welcomedKey(jid));
    return val === '1' || val === 1;
  } catch (err) {
    log.error(`Failed to check welcomed status for ${jid}:`, err.message);
    return false; // fail-safe: send welcome if Redis is down
  }
}


// ─── Match Score Persistence ──────────────────────────────────────────────────
// Persists the last ALERTED score state to Redis so goals scored during a
// server restart are never silently dropped (missed goal bug).

const matchScoreKey = (matchId) => `matchscore:${matchId}`;

export async function persistMatchScore(matchId, scores) {
  try {
    await redis.set(matchScoreKey(String(matchId)), scores);
  } catch (err) {
    log.error(`Failed to persist match score for ${matchId}:`, err.message);
  }
}

export async function getPersistedMatchScore(matchId) {
  try {
    const raw = await redis.get(matchScoreKey(String(matchId)));
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    log.error(`Failed to get persisted match score for ${matchId}:`, err.message);
    return null;
  }
}
