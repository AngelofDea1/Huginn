/**
 * fetch_snapshot.mjs
 * Fetches a complete match snapshot from TxLINE for a finished World Cup 2026 fixture.
 * Saves the result to src/match_snapshot.json for use by test_replay.js
 *
 * Usage:
 *   node fetch_snapshot.mjs              → auto-picks best completed fixture
 *   node fetch_snapshot.mjs <fixtureId>  → fetch a specific fixture ID
 */

import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE  = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com/api';
const JWT   = process.env.TXLINE_JWT;
const TOKEN = process.env.TXLINE_API_KEY;

if (!JWT || !TOKEN) {
  console.error('❌ Missing TXLINE_JWT or TXLINE_API_KEY in .env');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${JWT}`,
    'X-Api-Token': TOKEN,
  },
  timeout: 15000,
});

// World Cup competition IDs
const WC_COMPETITION_IDS = new Set([72, 83, 1, 430, 2000, 2026]);

async function getFixtures() {
  console.log('📡 Fetching all fixtures from TxLINE...');
  const { data } = await client.get('/fixtures/snapshot');
  return data || [];
}

async function getSnapshot(fixtureId) {
  console.log(`📡 Fetching snapshot for fixture ${fixtureId}...`);
  const { data } = await client.get(`/scores/snapshot/${fixtureId}`);
  return data || [];
}

function countGoals(snapshots) {
  if (!snapshots.length) return { home: 0, away: 0 };
  const sorted = [...snapshots].sort((a, b) => (a.Seq || 0) - (b.Seq || 0));
  const last = sorted[sorted.length - 1];
  return {
    home: last?.Score?.Participant1?.Total?.Goals ?? 0,
    away: last?.Score?.Participant2?.Total?.Goals ?? 0,
  };
}

function hasCompleteFirstHalf(snapshots) {
  // Check if we have events with elapsed minutes < 45
  return snapshots.some(s => s.Elapsed !== null && s.Elapsed !== undefined && s.Elapsed < 45);
}

function extractMatchInfo(snapshots) {
  if (!snapshots.length) return null;
  const sorted = [...snapshots].sort((a, b) => (a.Seq || 0) - (b.Seq || 0));
  const last = sorted[sorted.length - 1];
  return {
    home: last?.Participant1 || 'Home',
    away: last?.Participant2 || 'Away',
    finalScore: countGoals(sorted),
    totalSnapshots: sorted.length,
    hasFirstHalf: hasCompleteFirstHalf(sorted),
    isFinished: sorted.some(s => 
      s.Action === 'game_finalised' || 
      s.Phase === 5 || 
      (s.GameState && String(s.GameState).toLowerCase() === 'finished')
    ),
  };
}

function printTimeline(snapshots) {
  const sorted = [...snapshots].sort((a, b) => (a.Seq || 0) - (b.Seq || 0));
  console.log('\n📋 Match timeline:');
  sorted.forEach((s, i) => {
    const home = s.Score?.Participant1?.Total?.Goals ?? 0;
    const away = s.Score?.Participant2?.Total?.Goals ?? 0;
    const elapsed = s.Elapsed ?? (s.Clock?.Seconds ? Math.floor(s.Clock.Seconds / 60) : null);
    const action = s.Action || s.GameState || '?';
    console.log(`  [${i}] Seq=${s.Seq} ${home}-${away} min=${elapsed} action=${action}`);
  });
}

async function main() {
  const targetId = process.argv[2];

  if (targetId) {
    // Fetch specific fixture
    console.log(`\n🎯 Fetching specific fixture: ${targetId}`);
    const snapshots = await getSnapshot(targetId);

    if (!snapshots.length) {
      console.error('❌ No snapshot data returned for that fixture ID.');
      process.exit(1);
    }

    const info = extractMatchInfo(snapshots);
    console.log(`\n✅ ${info.home} vs ${info.away}`);
    console.log(`   Final score: ${info.finalScore.home}-${info.finalScore.away}`);
    console.log(`   Snapshots: ${info.totalSnapshots}`);
    console.log(`   Has first half data: ${info.hasFirstHalf}`);
    console.log(`   Is finished: ${info.isFinished}`);

    printTimeline(snapshots);

    const outPath = path.join(__dirname, 'src', 'match_snapshot.json');
    fs.writeFileSync(outPath, JSON.stringify(snapshots, null, 2));
    console.log(`\n💾 Saved to ${outPath}`);
    return;
  }

  // Auto-select: find best completed World Cup fixture with complete data
  const fixtures = await getFixtures();
  console.log(`   Got ${fixtures.length} total fixtures`);

  const wcFixtures = fixtures.filter(f => WC_COMPETITION_IDS.has(f.CompetitionId));
  console.log(`   ${wcFixtures.length} World Cup fixtures found`);

  // Look for finished fixtures (GameState 4 = FT, or Phase 5 = F)
  const finished = wcFixtures.filter(f => 
    f.GameState === 4 || f.GameState === 'FT' || 
    f.Phase === 5 || 
    (typeof f.GameState === 'string' && f.GameState.toLowerCase() === 'finished') ||
    (f.ScoreHome !== null && f.ScoreHome !== undefined) // has score = probably played
  );

  console.log(`   ${finished.length} finished/played fixtures found`);

  if (!finished.length) {
    console.log('\n⚠️  No clearly finished fixtures found. Listing all WC fixtures:');
    wcFixtures.slice(0, 20).forEach(f => {
      console.log(`   ID=${f.FixtureId} | ${f.Participant1} vs ${f.Participant2} | State=${f.GameState} | Score=${f.ScoreHome}-${f.ScoreAway}`);
    });
    console.log('\nRun: node fetch_snapshot.mjs <fixtureId>  to fetch a specific one');
    return;
  }

  // Try each finished fixture until we find one with complete data (goals + first half)
  console.log('\n🔍 Scanning finished fixtures for complete snapshot data...\n');
  
  let bestFixture = null;
  let bestSnapshots = null;
  let bestScore = -1;

  for (const fixture of finished.slice(0, 30)) {
    const id = fixture.FixtureId;
    try {
      process.stdout.write(`   Checking fixture ${id} (${fixture.Participant1} vs ${fixture.Participant2})... `);
      const snapshots = await getSnapshot(id);
      
      if (!snapshots.length) {
        console.log('❌ empty');
        continue;
      }

      const info = extractMatchInfo(snapshots);
      const totalGoals = info.finalScore.home + info.finalScore.away;
      const completeness = (info.hasFirstHalf ? 10 : 0) + totalGoals + (info.isFinished ? 5 : 0);
      
      console.log(`✅ ${info.home} ${info.finalScore.home}-${info.finalScore.away} ${info.away} | ${snapshots.length} snapshots | first half: ${info.hasFirstHalf} | score: ${completeness}`);

      if (completeness > bestScore && totalGoals > 0) {
        bestScore = completeness;
        bestFixture = fixture;
        bestSnapshots = snapshots;
      }

      // If we found a great one (has first half + goals) stop early
      if (info.hasFirstHalf && totalGoals >= 2) {
        console.log(`\n🎯 Found great fixture: ${info.home} vs ${info.away} (${info.finalScore.home}-${info.finalScore.away})`);
        break;
      }

      // Small delay to be nice to the API
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`❌ error: ${err.message}`);
    }
  }

  if (!bestSnapshots) {
    console.error('\n❌ Could not find a suitable completed fixture with goal data.');
    console.log('Try: node fetch_snapshot.mjs <fixtureId>');
    process.exit(1);
  }

  // Print timeline of the chosen fixture
  const info = extractMatchInfo(bestSnapshots);
  console.log(`\n✅ Selected: ${info.home} vs ${info.away} (${info.finalScore.home}-${info.finalScore.away})`);
  printTimeline(bestSnapshots);

  // Save
  const outPath = path.join(__dirname, 'src', 'match_snapshot.json');
  fs.writeFileSync(outPath, JSON.stringify(bestSnapshots, null, 2));
  console.log(`\n💾 Saved ${bestSnapshots.length} snapshots to ${outPath}`);
  console.log('\n✅ Done! Now update test_replay.js to use match_snapshot.json');
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message);
  if (err.response?.data) console.error('API error:', JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
