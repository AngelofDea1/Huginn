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

// World Cup competition IDs — broader list to handle different API tier mappings
// We try these in order; if none match, we fall back to returning ALL fixtures
const WC_COMPETITION_IDS = new Set([
  72,    // FIFA World Cup 2026 (primary)
  83,    // FIFA World Cup (alternate ID seen in some feeds)
  1,     // FIFA World Cup (generic)
  430,   // International Friendlies
  2000,  // FIFA World Cup 2026 (alternate)
  2026,  // FIFA World Cup 2026 (year-based ID)
]);

// Game phase IDs that mean "in progress" (from Soccer Feed docs)
// Phase field (snapshot feed): 2=H1, 4=H2, 7=ET1, 9=ET2, 12=PE, 3=HT, 5=F, 10=FET, 13=FPE
// GameState field (fixture feed): 1=H1 (Live), 2=H2, 3=HT, 4=FT — so 1 must be included!
const LIVE_PHASES = new Set([1, 2, 4, 7, 9, 12]); // 1=GameState H1, 2=Phase H1, 4=H2, 7=ET1, 9=ET2, 12=PE
const HT_PHASE   = 3;  // HT (both Phase and GameState)
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
  // Try to extract scores from snapshot's Score object if present
  const homeScore = f.Score?.Participant1?.Total?.Goals ?? f.ScoreHome ?? null;
  const awayScore = f.Score?.Participant2?.Total?.Goals ?? f.ScoreAway ?? null;

  // Determine status:
  // The fixture feed uses GameState (integer) as the primary live-state indicator.
  // Phase is used in the snapshot/detail feed. Use Phase first, fall back to GameState.
  let status;
  if (f.Phase !== undefined && f.Phase !== null && f.Phase !== 0) {
    status = phaseToStatus(f.Phase);
  } else if (f.GameState !== undefined && f.GameState !== null) {
    // GameState integers in fixture feed: 1=H1(Live), 2=H2(Live), 3=HT, 4=FT, 0=NS
    status = phaseToStatus(f.GameState);
  } else {
    status = 'NS';
  }

  return {
    id:           String(f.FixtureId),
    home_team:    { name: f.Participant1 || f.HomeTeam || 'Team A' },
    away_team:    { name: f.Participant2 || f.AwayTeam || 'Team B' },
    kickoff_time: f.StartTime || f.KickoffTime,
    status,
    stage:        f.CompetitionName || f.TournamentName || 'World Cup 2026',
    home_score:   homeScore,
    away_score:   awayScore,
    minute:       f.Elapsed ?? null,
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

function phaseStringToStatus(gameState) {
  if (!gameState) return 'NS';
  const s = String(gameState).toLowerCase();
  if (s === 'live' || s === 'inplay' || s === 'in_play' || s === 'firsthalf' || s === 'first_half' || s === 'secondhalf' || s === 'second_half') return 'LIVE';
  if (s === 'halftime' || s === 'half_time' || s === 'ht') return 'HT';
  if (s === 'finished' || s === 'ft' || s === 'fulltime' || s === 'full_time' || s === 'completed') return 'FT';
  return 'NS';
}

function normaliseScores(scoreUpdates, fixture) {
  let updates = [];
  if (typeof scoreUpdates === 'string') {
    // Parse SSE lines — each is "data: {...}\n"
    const matches = scoreUpdates.match(/data:\s*(\{.+?\})\n/g) || scoreUpdates.match(/data:\s*(\{.+?})/g);
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

  // Extract scores from Score object — may be absent if match hasn't started
  const homeScore = latest.Score?.Participant1?.Total?.Goals ?? 0;
  const awayScore = latest.Score?.Participant2?.Total?.Goals ?? 0;
  
  // Extract phase / status — try numeric Phase first, then string GameState
  let status;
  if (latest.Phase !== undefined && latest.Phase !== null) {
    status = phaseToStatus(latest.Phase);
  } else {
    status = phaseStringToStatus(latest.GameState);
  }
  // Override with 'LIVE' if GameState explicitly says so
  if (typeof latest.GameState === 'string' && (latest.GameState.toLowerCase() === 'live' || latest.GameState.toLowerCase() === 'inplay')) {
    status = 'LIVE';
  }

  const elapsedSeconds = latest.Clock?.Seconds ?? 0;
  const minute = latest.Elapsed !== undefined && latest.Elapsed !== null 
    ? latest.Elapsed 
    : (elapsedSeconds > 0 ? Math.floor(elapsedSeconds / 60) : null);

  const events = buildEvents(updates);

  return {
    home_score: homeScore,
    away_score: awayScore,
    status:     status,
    minute:     minute,
    events,
    _raw: latest,
  };
}

function buildEvents(updates) {
  const events = [];
  let prevHome = 0;
  let prevAway = 0;
  let prevHomeRed = 0;
  let prevAwayRed = 0;

  for (const u of updates) {
    const elapsedSeconds = u.Clock?.Seconds ?? 0;
    const ts = u.Elapsed !== undefined && u.Elapsed !== null ? u.Elapsed : (Math.floor(elapsedSeconds / 60) || 0);

    const homeGoals = u.Score?.Participant1?.Total?.Goals ?? 0;
    const awayGoals = u.Score?.Participant2?.Total?.Goals ?? 0;

    const homeRed = u.Stats?.['5'] ?? u.Stats?.[5] ?? 0;
    const awayRed = u.Stats?.['6'] ?? u.Stats?.[6] ?? 0;

    // Detect goals
    if (homeGoals > prevHome) {
      const scorer = u.Action === 'goal' && u.Data?.PlayerId ? `Player #${u.Data.PlayerId}` : 'Goal';
      events.push({ id: `g1-${ts}`, type: 'goal', team: 'home', minute: ts, player: scorer, description: `Home goal at ${ts}'` });
    }
    if (awayGoals > prevAway) {
      const scorer = u.Action === 'goal' && u.Data?.PlayerId ? `Player #${u.Data.PlayerId}` : 'Goal';
      events.push({ id: `g2-${ts}`, type: 'goal', team: 'away', minute: ts, player: scorer, description: `Away goal at ${ts}'` });
    }

    // Detect red cards
    if (homeRed > prevHomeRed) {
      const player = u.Data?.PlayerId ? `Player #${u.Data.PlayerId}` : 'Player';
      events.push({ id: `rc1-${ts}`, type: 'red_card', team: 'home', minute: ts, player, description: `Home red card at ${ts}'` });
    }
    if (awayRed > prevAwayRed) {
      const player = u.Data?.PlayerId ? `Player #${u.Data.PlayerId}` : 'Player';
      events.push({ id: `rc2-${ts}`, type: 'red_card', team: 'away', minute: ts, player, description: `Away red card at ${ts}'` });
    }

    prevHome = homeGoals;
    prevAway = awayGoals;
    prevHomeRed = homeRed;
    prevAwayRed = awayRed;
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
  if (typeof global.getMockReplayDetails === 'function') {
    const list = global.getMockReplayDetails();
    if (list) {
      const detail = normaliseScores(list);
      if (detail && (detail.status === 'LIVE' || detail.status === 'HT')) {
        return [{
          id: '18241006',
          home_team: { name: 'England' },
          away_team: { name: 'Argentina' },
          kickoff_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30m ago
          status: detail.status,
          stage: 'World Cup 2026',
          home_score: detail.home_score,
          away_score: detail.away_score,
          minute: detail.minute,
          _raw: {}
        }];
      }
    }
  }
  try {
    const all = await getAllFixtures();
    const now = Date.now();
    const live = all.filter(m => {
      // Direct live phase match
      if (m.status === 'LIVE' || m.status === 'HT') return true;
      // Time-based fallback: if kickoff has started and less than 130 minutes ago, and it's not marked FT
      if (m.status !== 'FT') {
        const kick = new Date(m.kickoff_time).getTime();
        if (!isNaN(kick) && now >= kick && now <= kick + 130 * 60 * 1000) {
          return true;
        }
      }
      return false;
    });

    // Enrich each live match with real-time scores from the scores endpoint
    const enriched = await Promise.all(live.map(async (m) => {
      let minute = null;
      let status = m.status;
      let homeScore = m.home_score;
      let awayScore = m.away_score;

      try {
        const detail = await getMatchDetail(m.id);
        if (detail) {
          homeScore = detail.home_score ?? homeScore;
          awayScore = detail.away_score ?? awayScore;
          minute = detail.minute;
          status = detail.status !== 'NS' ? detail.status : status;
        }
      } catch (e) {
        // Enrichment failed — keep defaults
      }

      // Calculate elapsed fallback minute if missing or lagging
      if (status !== 'FT') {
        if (status === 'HT') {
          minute = 45;
        } else {
          const kick = new Date(m.kickoff_time).getTime();
          if (!isNaN(kick) && Date.now() >= kick) {
            const elapsed = Math.floor((Date.now() - kick) / 60000);
            
            // Calculate a smart game minute (assuming 15 min half time)
            let calculatedMinute;
            if (elapsed < 45) {
              calculatedMinute = elapsed > 0 ? elapsed : 1;
            } else if (elapsed >= 45 && elapsed <= 60) {
              calculatedMinute = 45;
              status = 'HT';
            } else {
              calculatedMinute = Math.min(90, elapsed - 15);
            }

            // If API minute is missing, or is lagging behind the calculated wall time, use calculated time
            if (!minute || (calculatedMinute > minute)) {
              minute = calculatedMinute;
            }
          }
        }
      }

      return {
        ...m,
        home_score: homeScore,
        away_score: awayScore,
        minute:     minute,
        status:     status,
      };
    }));

    // Filter out matches that have officially finished (FT)
    return enriched.filter(m => m.status !== 'FT');
  } catch (err) {
    log.error('getLiveMatches failed:', err.message);
    return [];
  }
}

/**
 * Get upcoming matches in the next N hours
 */
export async function getUpcomingMatches(hoursAhead = 2) {
  if (typeof global.getMockReplayDetails === 'function') {
    const list = global.getMockReplayDetails();
    if (list) {
      const detail = normaliseScores(list);
      if (detail && detail.status === 'NS') {
        return [{
          id: '18241006',
          home_team: { name: 'England' },
          away_team: { name: 'Argentina' },
          kickoff_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30m from now
          status: 'NS',
          stage: 'World Cup 2026',
          home_score: 0,
          away_score: 0,
          minute: 0,
          _raw: {}
        }];
      }
    }
  }
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
  if (String(matchId) === '18241006' && typeof global.getMockReplayDetails === 'function') {
    const list = global.getMockReplayDetails();
    if (list) {
      return normaliseScores(list);
    }
  }
  try {
    const { data } = await client.get(`/scores/snapshot/${matchId}`);
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
  if (String(matchId) === '18241006' && typeof global.getMockReplayDetails === 'function') {
    const list = global.getMockReplayDetails();
    if (list) {
      return normaliseOdds(list);
    }
  }
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
  // Fetch all available fixtures in one call then filter locally
  try {
    const { data } = await client.get('/fixtures/snapshot');
    const all = (data || []).map(normaliseFixture);

    // Filter to World Cup IDs if we have matching fixtures
    const wcMatches = all.filter(f => WC_COMPETITION_IDS.has(f._raw?.CompetitionId));

    if (wcMatches.length > 0) {
      log.info(`getAllFixtures: ${wcMatches.length} WC fixtures (from ${all.length} total)`);
      return wcMatches;
    }

    // Stop returning all fixtures as fallback — only WC fixtures are supported
    const seen = [...new Set(all.map(f => f._raw?.CompetitionId).filter(Boolean))];
    log.warn(`getAllFixtures: No WC matches found. Competition IDs in feed: [${seen.join(', ')}]. Returning empty list.`);
    return [];
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
