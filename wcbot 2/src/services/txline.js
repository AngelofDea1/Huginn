import axios from 'axios';
import { log } from '../utils/logger.js';

// Configuration
const BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com/api';
const JWT = process.env.TXLINE_JWT;
const API_KEY = process.env.TXLINE_API_KEY;

function getHeaders() {
  return {
    'Authorization': `Bearer ${JWT}`,
    'X-Api-Key': API_KEY,
    'Content-Type': 'application/json'
  };
}

export async function getAllFixtures() {
  const { data } = await axios.get(`${BASE_URL}/fixtures`, { headers: getHeaders() });
  return data.map(m => ({
    id: m.FixtureId,
    home_team: { name: m.Participant1 },
    away_team: { name: m.Participant2 },
    kickoff_time: m.StartTime ? new Date(m.StartTime).toISOString() : new Date().toISOString(),
    status: 'NS'
  }));
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
  const { data } = await axios.get(`${BASE_URL}/fixtures/${matchId}/snapshot`, { headers: getHeaders() });
  if (!data || data.length === 0) return null;

  const latest = data[data.length - 1];
  const score = parseScore(latest);
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
    events: [], // Clean slate: Poller will derive goals from diffs
    _raw: latest
  };
}

export async function getLiveMatches() {
  const { data } = await axios.get(`${BASE_URL}/live`, { headers: getHeaders() });
  if (!data) return [];
  return data.map(m => {
    return {
      id: m.FixtureId,
      home_team: { name: m.Participant1 },
      away_team: { name: m.Participant2 },
      status: 'LIVE',
      home_score: m.Score?.Participant1?.Total?.Goals || 0,
      away_score: m.Score?.Participant2?.Total?.Goals || 0,
      minute: m.Clock?.Seconds ? Math.floor(m.Clock.Seconds / 60) : 0
    };
  });
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
