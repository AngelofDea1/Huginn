import axios from 'axios';
import { log } from '../utils/logger.js';

//  Real TxLINE API 
// Base URL: https://txline.txodds.com/api  (set via TXLINE_BASE_URL)
// Auth:     Authorization: Bearer <JWT>  +  X-Api-Token: <apiToken>
//
// TXLINE_API_KEY should hold the activated API token (from /api/token/activate).
// TXLINE_JWT should hold the guest JWT (from /auth/guest/start).
// Both are needed per the TxLINE docs:
//   https://txline-docs.txodds.com/documentation/examples/fetching-snapshots
// 

const BASE  = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com/api';
const JWT   = process.env.TXLINE_JWT;
const TOKEN = process.env.TXLINE_API_KEY;

// World Cup competition IDs (confirmed working with free tier)
const WC_COMPETITION_IDS = [
  72,   // FIFA World Cup 2026 (confirmed via API)
  430,  // International Friendlies
];

// Game phase IDs that mean "in progress" (from Soccer Feed docs)
const LIVE_PHASES = new Set([2, 4, 7, 9, 12]); // H1, H2, ET1, ET2, PE
const HT_PHASE   = 3;  // HT
const FT_PHASES  = new Set([5, 10, 13]); // F, FET, FPE

function makeClient() {
  return axios.create({
    baseURL: BASE,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JWT}`,
      'X-Api-Token': TOKEN,
    },
    timeout: 10000,
  });
}

const client = makeClient();

//  Normaliser 
// The real API uses PascalCase fields. We normalise to snake_case so that
// matchPoller.js, scheduler.js and webhook.js remain unchanged.

function normaliseFixture(f) {
  return {
    id:         String(f.FixtureId),
    home_team:  { name: f.Participant1 || 'Team A' },
    away_team:  { name: f.Participant2 || 'Team B' },
    kickoff_time: f.StartTime,
    status:     phaseToStatus(f.Phase),
    stage:      f.CompetitionName || 'World Cup 2026',
    // keep originals for reference
    _raw: f,
  };
}

function phaseToStatus(phase) {
  if (LIVE_PHASES.has(phase))  return 'LIVE';
  if (phase === HT_PHASE)      return 'HT';
  if (FT_PHASES.has(phase))    return 'FT';
  return 'NS';
}

function normaliseScores(scoreUpdates, fixture) {
  let updates = [];
  if (typeof scoreUpdates === 'string') {
    // Parse SSE lines
    const matches = scoreUpdates.match(/data:\s*({.+?})/g);
    if (matches) {
      for (const m of matches) {
        try {
          const jsonStr = m.replace(/^data:\s*/, '').trim();
          updates.push(JSON.parse(jsonStr));
        } catch (e) {}
      }
    }
  } else if (Array.isArray(scoreUpdates)) {
    updates = scoreUpdates;
  }

  const latest = updates?.[updates.length - 1];
  if (!latest) return null;

  const stats   = latest.Stats || {};
  const events  = buildEvents(updates);
  const phase   = latest.GamePhase;

  return {
    home_score: stats[1] ?? 0,
    away_score: stats[2] ?? 0,
    status:     phaseToStatus(phase),
    minute:     latest.Elapsed ?? '?',
    events,
    _raw: latest,
  };
}

function buildEvents(updates) {
  const events = [];
  let prevStats = {};
  for (const u of updates) {
    const s = u.Stats || {};
    const ts = u.Elapsed || 0;

    // Detect goals
    if ((s[1] ?? 0) > (prevStats[1] ?? 0)) {
      events.push({ id: `g1-${ts}`, type: 'goal', team: 'home', minute: ts, player: 'Goal', description: `Home goal at ${ts}'` });
    }
    if ((s[2] ?? 0) > (prevStats[2] ?? 0)) {
      events.push({ id: `g2-${ts}`, type: 'goal', team: 'away', minute: ts, player: 'Goal', description: `Away goal at ${ts}'` });
    }
    // Detect red cards
    if ((s[5] ?? 0) > (prevStats[5] ?? 0)) {
      events.push({ id: `rc1-${ts}`, type: 'red_card', team: 'home', minute: ts, player: 'Player', description: `Home red card at ${ts}'` });
    }
    if ((s[6] ?? 0) > (prevStats[6] ?? 0)) {
      events.push({ id: `rc2-${ts}`, type: 'red_card', team: 'away', minute: ts, player: 'Player', description: `Away red card at ${ts}'` });
    }

    prevStats = { ...s };
  }
  return events;
}

function normaliseOdds(oddsData) {
  if (!oddsData?.length) return null;
  // Find 1x2 market entries
  const entries = oddsData.filter(o =>
    (o.SuperOddsType || '').toLowerCase().includes('1x2')
  );
  if (!entries.length) return null;

  // Grab the latest entry
  const latest = entries[entries.length - 1];
  if (!latest || !latest.Prices || !latest.PriceNames) return null;

  let home_win = null, draw = null, away_win = null;
  latest.PriceNames.forEach((name, idx) => {
    const rawPrice = latest.Prices[idx];
    if (rawPrice != null) {
      const price = rawPrice / 1000; // E.g., 2467 -> 2.467
      if (name === 'part1') home_win = price;
      else if (name === 'draw') draw = price;
      else if (name === 'part2') away_win = price;
    }
  });

  return {
    home_win,
    draw,
    away_win,
    _raw: latest,
  };
}

//  Public API 

/**
 * Get all live World Cup matches right now
 */
export async function getLiveMatches() {
  try {
    const all = await getAllFixtures();
    const now = Date.now();
    return all.filter(m => {
      // Direct live phase match
      if (m.status === 'LIVE' || m.status === 'HT') return true;
      // Time-based fallback: if kickoff has started and less than 120 minutes ago, and it's not marked FT
      if (m.status !== 'FT') {
        const kick = new Date(m.kickoff_time).getTime();
        if (now >= kick && now <= kick + 120 * 60 * 1000) {
          return true;
        }
      }
      return false;
    });
  } catch (err) {
    log.error('getLiveMatches failed:', err.message);
    return [];
  }
}

/**
 * Get upcoming matches in the next N hours
 */
export async function getUpcomingMatches(hoursAhead = 2) {
  try {
    const all = await getAllFixtures();
    const now     = Date.now();
    const cutoff  = now + hoursAhead * 60 * 60 * 1000;
    return all.filter(m => {
      const kick = new Date(m.kickoff_time).getTime();
      // If match hasn't started and is inside the future window
      if (m.status !== 'FT' && kick > now && kick <= cutoff) {
        // Also check that it's not currently marked live via getLiveMatches logic
        const isLive = (m.status === 'LIVE' || m.status === 'HT' || (now >= kick && now <= kick + 120 * 60 * 1000));
        return !isLive;
      }
      return false;
    });
  } catch (err) {
    log.error('getUpcomingMatches failed:', err.message);
    return [];
  }
}

/**
 * Get all upcoming scheduled fixtures regardless of window
 */
export async function getFixtureSchedule() {
  try {
    const all = await getAllFixtures();
    const now = Date.now();
    return all.filter(m => {
      const kick = new Date(m.kickoff_time).getTime();
      return m.status !== 'FT' && kick > now;
    }).sort((a, b) => {
      return new Date(a.kickoff_time) - new Date(b.kickoff_time);
    });
  } catch (err) {
    log.error('getFixtureSchedule failed:', err.message);
    return [];
  }
}

/**
 * Get full match detail (scores + events) for a given fixture ID
 */
export async function getMatchDetail(matchId) {
  try {
    const { data } = await client.get(`/scores/updates/${matchId}`);
    const updates = data || [];
    return normaliseScores(updates);
  } catch (err) {
    log.warn(`getMatchDetail(${matchId}) failed: ${err.message}`);
    return null;
  }
}

/**
 * Get live odds for a match
 */
export async function getMatchOdds(matchId) {
  try {
    const { data } = await client.get(`/odds/snapshot/${matchId}`);
    return normaliseOdds(data);
  } catch (err) {
    log.warn(`getMatchOdds(${matchId}) failed: ${err.message}`);
    return null;
  }
}

/**
 * Search for a match by team name - used when user types "/follow Nigeria"
 */
export async function searchMatch(query) {
  try {
    const all = await getAllFixtures();
    const q = query.toLowerCase().trim();
    
    // Split by common match separators: " vs ", " v ", " - "
    const separators = [/\s+vs\s+/, /\s+v\s+/, /\s*-\s*/];
    let splitQuery = null;
    
    for (const sep of separators) {
      if (sep.test(q)) {
        splitQuery = q.split(sep).map(part => part.trim());
        break;
      }
    }

    if (splitQuery && splitQuery.length === 2) {
      const [partA, partB] = splitQuery;
      return all.filter(m => {
        const home = m.home_team?.name?.toLowerCase() || '';
        const away = m.away_team?.name?.toLowerCase() || '';
        return (
          (home.includes(partA) && away.includes(partB)) ||
          (home.includes(partB) && away.includes(partA))
        );
      });
    }

    // Default fallback: match either home or away team
    return all.filter(m =>
      m.home_team?.name?.toLowerCase().includes(q) ||
      m.away_team?.name?.toLowerCase().includes(q)
    );
  } catch (err) {
    log.error('searchMatch failed:', err.message);
    return [];
  }
}

//  Internal helpers 

async function getAllFixtures() {
  // Fetch all available fixtures in one call (no competitionId filter = all bundles)
  // then filter locally to the competitions we care about
  try {
    const { data } = await client.get('/fixtures/snapshot');
    const all = (data || []).map(normaliseFixture);
    // Filter to World Cup + Friendlies only
    return all.filter(f => WC_COMPETITION_IDS.includes(f._raw?.CompetitionId));
  } catch (err) {
    log.warn('getAllFixtures failed:', err.message);
    return [];
  }
}

//  Pure helpers (unchanged interface) 

/**
 * Format odds for display -> "1.85 / 3.40 / 4.20 (H/D/A)"
 */
export function formatOdds(odds) {
  if (!odds) return 'odds unavailable';
  const h = odds.home_win != null ? Number(odds.home_win).toFixed(2) : '?';
  const d = odds.draw     != null ? Number(odds.draw).toFixed(2)     : '?';
  const a = odds.away_win != null ? Number(odds.away_win).toFixed(2) : '?';
  return `${h} / ${d} / ${a} (H/D/A)`;
}

/**
 * Detect significant odds shift between two odds snapshots
 */
export function detectOddsShift(prev, curr, threshold = 0.15) {
  if (!prev || !curr) return { shifted: false };
  const fields = ['home_win', 'draw', 'away_win'];
  for (const f of fields) {
    if (prev[f] == null || curr[f] == null) continue;
    const change = Math.abs(curr[f] - prev[f]) / prev[f];
    if (change >= threshold) {
      return {
        shifted: true,
        field: f,
        from: Number(prev[f]).toFixed(2),
        to: Number(curr[f]).toFixed(2),
        magnitude: (change * 100).toFixed(1),
        direction: curr[f] < prev[f] ? 'shortened' : 'drifted',
      };
    }
  }
  return { shifted: false };
}
