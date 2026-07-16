/**
 * build_snapshot.mjs  (v2 — complete match with accurate timings)
 *
 * England vs Argentina  |  World Cup 2026 Final
 * 
 * Goals:
 *   55' — England (Bellingham)
 *   85' — Argentina (J. Álvarez)
 *   90+2' (92') — Argentina (Messi)
 *
 * Final: England 1 – 2 Argentina
 *
 * Halftime added time: 2 min  → HT finalised at 47'
 * Halftime break: 15 min
 * Second half added time: 4 min → FT at ~94'
 *
 * Output: src/match_18241006_snapshot.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIXTURE_ID     = 18241006;
const COMPETITION_ID = 72; // FIFA World Cup 2026
const P1_ID          = 1888; // England (home)
const P2_ID          = 1489; // Argentina (away)

// Kickoff timestamp — this will be overridden at demo runtime
// Use a placeholder that demo_live.mjs will replace dynamically
const PLACEHOLDER_START_TIME = 9999999999999;

let seq = 0;
function nextSeq(base = null) {
  seq = base !== null ? base : seq + 10;
  return seq;
}

function mkSnap(minute, action, homeGoals, awayGoals, opts = {}) {
  const clockSec = minute !== null ? minute * 60 : 0;
  return {
    FixtureId:          FIXTURE_ID,
    StartTime:          PLACEHOLDER_START_TIME,
    IsTeam:             true,
    FixtureGroupId:     10115573,
    CompetitionId:      COMPETITION_ID,
    CountryId:          466,
    SportId:            1,
    Participant1IsHome: true,
    Participant1Id:     P1_ID,
    Participant2Id:     P2_ID,
    Participant1:       'England',
    Participant2:       'Argentina',
    Type:               'Soccer',
    ConnectionId:       1129,
    Seq:                nextSeq(opts.seq ?? null),
    Ts:                 PLACEHOLDER_START_TIME + (clockSec * 1000),
    Elapsed:            minute,
    Clock:              minute !== null
                          ? { Running: true, Seconds: clockSec }
                          : { Running: false, Seconds: 0 },
    GameState:          opts.gameState ?? 'live',
    Phase:              opts.phase ?? 2,
    Action:             action,
    StatusId:           opts.statusId ?? null,

    // Cumulative score
    Score: {
      Participant1: {
        H1:    { Goals: opts.p1GoalsH1 ?? 0, YellowCards: opts.p1YellowH1 ?? 0, Corners: opts.p1CornersH1 ?? 0 },
        H2:    { Goals: opts.p1GoalsH2 ?? 0, YellowCards: opts.p1YellowH2 ?? 0, Corners: opts.p1CornersH2 ?? 0 },
        HT:    { Goals: opts.p1GoalsH1 ?? 0, YellowCards: opts.p1YellowH1 ?? 0, Corners: opts.p1CornersH1 ?? 0 },
        Total: { Goals: homeGoals, YellowCards: (opts.p1YellowH1 ?? 0) + (opts.p1YellowH2 ?? 0), Corners: (opts.p1CornersH1 ?? 0) + (opts.p1CornersH2 ?? 0) },
      },
      Participant2: {
        H1:    { Goals: opts.p2GoalsH1 ?? 0, YellowCards: opts.p2YellowH1 ?? 0, Corners: opts.p2CornersH1 ?? 0 },
        H2:    { Goals: opts.p2GoalsH2 ?? 0, YellowCards: opts.p2YellowH2 ?? 0, Corners: opts.p2CornersH2 ?? 0 },
        HT:    { Goals: opts.p2GoalsH1 ?? 0, YellowCards: opts.p2YellowH1 ?? 0, Corners: opts.p2CornersH1 ?? 0 },
        Total: { Goals: awayGoals, YellowCards: (opts.p2YellowH1 ?? 0) + (opts.p2YellowH2 ?? 0), Corners: (opts.p2CornersH1 ?? 0) + (opts.p2CornersH2 ?? 0) },
      },
    },

    Stats: {
      '1': (opts.p1CornersH1 ?? 0) + (opts.p1CornersH2 ?? 0),
      '2': (opts.p1CornersH1 ?? 0) + (opts.p1CornersH2 ?? 0),
      '3': (opts.p1YellowH1 ?? 0) + (opts.p1YellowH2 ?? 0),
      '4': (opts.p2YellowH1 ?? 0) + (opts.p2YellowH2 ?? 0),
      '5': opts.p1Red ?? 0,
      '6': opts.p2Red ?? 0,
      '7': (opts.p1CornersH1 ?? 0) + (opts.p1CornersH2 ?? 0),
      '8': (opts.p2CornersH1 ?? 0) + (opts.p2CornersH2 ?? 0),
    },

    Data: opts.data ?? {},
    Possession: opts.possession ?? null,
    PossessionType: opts.possessionType ?? null,
  };
}

// ─── BUILD TIMELINE ──────────────────────────────────────────────────────────

const snapshots = [];

// ── PRE-MATCH ────────────────────────────────────────────────────────────────

snapshots.push({ ...mkSnap(null, 'coverage_update', 0, 0, { seq: 1, gameState: 'scheduled', phase: 0 }) });
snapshots.push({ ...mkSnap(null, 'connected',       0, 0, { seq: 2, gameState: 'scheduled', phase: 0 }) });
snapshots.push({ ...mkSnap(null, 'venue',           0, 0, { seq: 3, gameState: 'scheduled', phase: 0 }) });
snapshots.push({ ...mkSnap(null, 'lineups',         0, 0, { seq: 5, gameState: 'scheduled', phase: 0 }) });
snapshots.push({ ...mkSnap(null, 'players_warming_up', 0, 0, { seq: 8, gameState: 'scheduled', phase: 0 }) });
snapshots.push({ ...mkSnap(null, 'players_on_the_pitch', 0, 0, { seq: 10, gameState: 'scheduled', phase: 0 }) });

// ── FIRST HALF (Phase 2) ─────────────────────────────────────────────────────

snapshots.push(mkSnap( 1, 'kickoff_team', 0, 0, {
  seq: 12, phase: 2,
  p1CornersH1: 0, p2CornersH1: 0,
  data: { Team: 'home' },
}));

snapshots.push(mkSnap(10, 'possession', 0, 0, {
  seq: 45, phase: 2,
  p1CornersH1: 0, p2CornersH1: 0,
  possession: 1, possessionType: 'AttackPossession',
}));

snapshots.push(mkSnap(18, 'corner', 0, 0, {
  seq: 90, phase: 2,
  p1CornersH1: 0, p2CornersH1: 1,
  data: { Participant: 2 },
}));

snapshots.push(mkSnap(22, 'shot', 0, 0, {
  seq: 130, phase: 2,
  p1CornersH1: 1, p2CornersH1: 1,
  possession: 1,
}));

snapshots.push(mkSnap(28, 'yellow_card', 0, 0, {
  seq: 180, phase: 2,
  p1CornersH1: 1, p2CornersH1: 1, p2YellowH1: 1,
  data: { Participant: 2, PlayerId: 44832 },
}));

snapshots.push(mkSnap(32, 'free_kick', 0, 0, {
  seq: 220, phase: 2,
  p1CornersH1: 2, p2CornersH1: 1, p2YellowH1: 1,
  possession: 1,
}));

snapshots.push(mkSnap(38, 'corner', 0, 0, {
  seq: 280, phase: 2,
  p1CornersH1: 3, p2CornersH1: 1, p2YellowH1: 1,
  data: { Participant: 1 },
}));

snapshots.push(mkSnap(42, 'shot', 0, 0, {
  seq: 340, phase: 2,
  p1CornersH1: 3, p2CornersH1: 2, p2YellowH1: 1,
  possession: 2,
}));

// Added time notification — 2 min
snapshots.push(mkSnap(45, 'additional_time', 0, 0, {
  seq: 400, phase: 2,
  p1CornersH1: 3, p2CornersH1: 2, p2YellowH1: 1,
  data: { Minutes: 2 },
}));

// HT finalised (after 45+2 = 47 minutes)
snapshots.push(mkSnap(null, 'halftime_finalised', 0, 0, {
  seq: 420, gameState: 'halftime', phase: 3,
  p1CornersH1: 3, p2CornersH1: 2, p2YellowH1: 1,
  Clock: { Running: false, Seconds: 2700 },
}));

// ── SECOND HALF (Phase 4) ────────────────────────────────────────────────────

snapshots.push(mkSnap(46, 'kickoff', 0, 0, {
  seq: 450, phase: 4,
  p1CornersH1: 3, p2CornersH1: 2, p2YellowH1: 1,
}));

snapshots.push(mkSnap(50, 'possession', 0, 0, {
  seq: 490, phase: 4,
  p1CornersH1: 3, p2CornersH1: 2, p2YellowH1: 1,
  possession: 2, possessionType: 'DangerPossession',
}));

// ── ENGLAND GOAL — 55' ───────────────────────────────────────────────────────
snapshots.push(mkSnap(55, 'goal', 1, 0, {
  seq: 550, phase: 4,
  p1GoalsH1: 0, p1GoalsH2: 1,
  p1CornersH1: 3, p2CornersH1: 2, p2YellowH1: 1, p1CornersH2: 0,
  data: { Participant: 1, PlayerId: 180827 }, // Bellingham
}));

snapshots.push(mkSnap(56, 'danger_possession', 1, 0, {
  seq: 560, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p2CornersH1: 2, p2YellowH1: 1,
  possession: 2,
}));

snapshots.push(mkSnap(62, 'corner', 1, 0, {
  seq: 610, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p2CornersH1: 2, p2CornersH2: 1, p2YellowH1: 1,
  data: { Participant: 2 },
}));

snapshots.push(mkSnap(67, 'substitution', 1, 0, {
  seq: 660, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p2CornersH1: 2, p2CornersH2: 1, p2YellowH1: 1,
  data: { Participant: 1, PlayerInId: 220001, PlayerOutId: 180827 },
}));

snapshots.push(mkSnap(72, 'shot', 1, 0, {
  seq: 710, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p2CornersH1: 2, p2CornersH2: 2, p2YellowH1: 1,
  possession: 2,
}));

snapshots.push(mkSnap(76, 'free_kick', 1, 0, {
  seq: 760, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 1, p2CornersH1: 2, p2CornersH2: 2, p2YellowH1: 1,
  data: { Participant: 1, PlayerId: 190001 }, // foul by England player
}));

snapshots.push(mkSnap(80, 'shot', 1, 0, {
  seq: 800, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 1, p2CornersH1: 2, p2CornersH2: 3, p2YellowH1: 1,
  possession: 2, possessionType: 'HighDangerPossession',
}));

snapshots.push(mkSnap(84, 'corner', 1, 0, {
  seq: 840, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 1, p2CornersH1: 2, p2CornersH2: 4, p2YellowH1: 1,
  data: { Participant: 2 },
}));

// ── ARGENTINA GOAL — 85' ────────────────────────────────────────────────────
snapshots.push(mkSnap(85, 'goal', 1, 1, {
  seq: 860, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 1,
  p2GoalsH2: 1, p2CornersH1: 2, p2CornersH2: 4, p2YellowH1: 1,
  data: { Participant: 2, PlayerId: 44912 }, // J. Álvarez
}));

snapshots.push(mkSnap(86, 'danger_possession', 1, 1, {
  seq: 870, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 1,
  p2GoalsH2: 1, p2CornersH1: 2, p2CornersH2: 4, p2YellowH1: 1,
  possession: 1,
}));

// Additional time — 4 min
snapshots.push(mkSnap(90, 'additional_time', 1, 1, {
  seq: 890, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 1,
  p2GoalsH2: 1, p2CornersH1: 2, p2CornersH2: 4, p2YellowH1: 1,
  data: { Minutes: 4 },
}));

// ── ARGENTINA GOAL — 90+2' (92') ────────────────────────────────────────────
snapshots.push(mkSnap(92, 'goal', 1, 2, {
  seq: 930, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 1,
  p2GoalsH2: 2, p2CornersH1: 2, p2CornersH2: 4, p2YellowH1: 1,
  data: { Participant: 2, PlayerId: 55103 }, // Messi
}));

snapshots.push(mkSnap(93, 'yellow_card', 1, 2, {
  seq: 940, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 2,
  p2GoalsH2: 2, p2CornersH1: 2, p2CornersH2: 4, p2YellowH1: 1,
  data: { Participant: 1, PlayerId: 190002 },
}));

snapshots.push(mkSnap(94, 'standby', 1, 2, {
  seq: 950, phase: 4,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 2,
  p2GoalsH2: 2, p2CornersH1: 2, p2CornersH2: 4, p2YellowH1: 1,
}));

// ── FULL TIME ────────────────────────────────────────────────────────────────

snapshots.push(mkSnap(null, 'game_finalised', 1, 2, {
  seq: 960, gameState: 'finished', phase: 5, statusId: 5,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 2,
  p2GoalsH2: 2, p2CornersH1: 2, p2CornersH2: 4, p2YellowH1: 1,
  Clock: { Running: false, Seconds: 5640 },
}));

snapshots.push(mkSnap(null, 'disconnected', 1, 2, {
  seq: 963, gameState: 'finished', phase: 5,
  p1GoalsH2: 1, p1CornersH1: 3, p1YellowH2: 2,
  p2GoalsH2: 2, p2CornersH1: 2, p2CornersH2: 4, p2YellowH1: 1,
  Clock: { Running: false, Seconds: 5640 },
}));

// ─── SAVE ────────────────────────────────────────────────────────────────────

const outPath = path.join(__dirname, 'src', 'match_18241006_snapshot.json');
fs.writeFileSync(outPath, JSON.stringify(snapshots, null, 2));

console.log(`✅ Built ${snapshots.length} snapshots — England 1–2 Argentina`);
console.log('\n📋 Timeline:');
snapshots.forEach((s, i) => {
  const home = s.Score?.Participant1?.Total?.Goals ?? 0;
  const away = s.Score?.Participant2?.Total?.Goals ?? 0;
  const isGoal = s.Action === 'goal' ? ' ⚽' : '';
  const isHT   = s.Action === 'halftime_finalised' ? ' ⏱ HT' : '';
  const isFT   = s.Action === 'game_finalised' ? ' 🏁 FT' : '';
  console.log(`  [${String(i).padStart(2)}] ${String(s.Seq).padStart(3)} | ${home}-${away} | min=${s.Elapsed ?? 'null'.padEnd(4)} | ${s.Action}${isGoal}${isHT}${isFT}`);
});
console.log(`\n💾 Saved to ${outPath}`);
