import axios from 'axios';
import { log } from '../utils/logger.js';
import { getValidToken } from './auth.js';

const BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com/api';

async function getHeaders() {
  const token = await getValidToken();
  return {
    'Authorization': `Bearer ${token}`,
    'X-Api-Token': process.env.TXLINE_API_KEY, // Note: the guest token plus API key
    'Content-Type': 'application/json'
  };
}

export async function getAllFixtures() {
  const headers = await getHeaders();
  const { data } = await axios.get(`${BASE_URL}/fixtures/snapshot`, { headers });
  let fixtures = [];
  if (data) {
    fixtures = data.map(m => {
      const home_score = m.Score?.Participant1?.Total?.Goals || 0;
      const away_score = m.Score?.Participant2?.Total?.Goals || 0;
      const minute = m.Clock?.Seconds ? Math.floor(m.Clock.Seconds / 60) : 0;
      return {
        id: m.FixtureId,
        home_team: { name: m.Participant1 },
        away_team: { name: m.Participant2 },
        home_score,
        away_score,
        minute,
        kickoff_time: m.StartTime ? new Date(m.StartTime).toISOString() : new Date().toISOString(),
        status: m.GameState === 'live' || m.GameState === 2 || m.GameState === 3 ? 'LIVE' : (m.Phase === 5 ? 'FT' : 'NS')
      };
    });
  }

  // INJECT DEMO MATCH (France vs England)
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0, 0);
  
  // Calculate status based on simulator
  let status = 'NS';
  if (Date.now() >= targetDate.getTime()) {
    status = 'LIVE';
  }

  fixtures.push({
    id: 18257865,
    home_team: { name: 'France' },
    away_team: { name: 'England' },
    home_score: 0,
    away_score: 0,
    minute: status === 'LIVE' ? Math.floor((Date.now() - targetDate.getTime()) / 60000) : 0,
    kickoff_time: targetDate.toISOString(),
    status
  });

  return fixtures;
}

export async function searchMatch(query) {
  const all = await getAllFixtures();
  const q = query.toLowerCase();
  return all.filter(m => 
    m.home_team?.name?.toLowerCase().includes(q) || 
    m.away_team?.name?.toLowerCase().includes(q)
  );
}

function parseScore(update) {
  if (!update || !update.Score) return { home: 0, away: 0 };
  return {
    home: update.Score.Participant1?.Total?.Goals || 0,
    away: update.Score.Participant2?.Total?.Goals || 0
  };
}

export async function getMatchDetail(matchId) {
  const headers = await getHeaders();
  const { data } = await axios.get(`${BASE_URL}/scores/snapshot/${matchId}`, { headers });
  if (!data || data.length === 0) return null;

  const events = data;
  let latestWithScore = events[events.length - 1];
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].Score) {
      latestWithScore = events[i];
      break;
    }
  }

  const score = parseScore(latestWithScore);
  const latest = events[events.length - 1];
  const minute = latest.Clock?.Seconds ? Math.floor(latest.Clock.Seconds / 60) : (latest.Elapsed || 0);

  let status = 'NS';
  if (latest.GameState === 'live' || latest.GameState === 2 || latest.GameState === 3) status = 'LIVE';
  if (latest.Phase === 3) status = 'HT';
  if (latest.Phase === 5) status = 'FT';

  return {
    id: matchId,
    home_score: score.home,
    away_score: score.away,
    minute,
    status,
    events: events.sort((a, b) => a.Seq - b.Seq).map(d => ({ action: d.Action, seq: d.Seq, data: d.Data, phase: d.Phase })),
    _raw: latest
  };
}

export async function getLiveMatches() {
  const all = await getAllFixtures();
  return all.filter(m => m.status === 'LIVE' || m.status === 'HT' || m.status === 'FT');
}

export async function getUpcomingMatches(hoursAhead = 6) {
  const all = await getAllFixtures();
  const now = Date.now();
  const cutoff = now + (hoursAhead * 60 * 60 * 1000);
  return all.filter(m => {
    const kick = new Date(m.kickoff_time).getTime();
    return kick > now && kick < cutoff;
  }).sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
}

export async function getFixtureSchedule() {
  const all = await getAllFixtures();
  const now = Date.now();
  return all.filter(m => new Date(m.kickoff_time).getTime() > now)
            .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
}

export async function getMatchOdds(matchId) {
  return null;
}

export function formatOdds(oddsObj) {
  return '';
}

export function detectOddsShift(oldOdds, newOdds) {
  return null;
}
