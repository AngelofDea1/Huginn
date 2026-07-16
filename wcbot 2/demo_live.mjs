/**
 * demo_live.mjs — Huginn Full Real-Time Match Demo
 *
 * Runs England vs Argentina as if it is live, right now.
 * Sends alerts to WhatsApp groups, WhatsApp 1:1 chats,
 * and PWA web-push subscribers — all at the correct real-world times.
 *
 * Usage:
 *   node demo_live.mjs              → kickoff in 35 minutes from now
 *   node demo_live.mjs 02:30        → kickoff at 02:30 local time today
 *   node demo_live.mjs +10          → kickoff in 10 minutes from now
 *
 * What fires (all real wall-clock timed):
 *   -30 min  : 30-minute pre-match bulletin (WhatsApp + PWA push)
 *   00:00    : Kickoff alert
 *   10'      : Mid first-half update (possession event — no alert, just advances state)
 *   45'      : Added time announcement (2 min) 
 *   HT       : Halftime report (WhatsApp + PWA push)
 *   55'      : ⚽ England GOAL → full AI commentary + odds (WhatsApp + PWA push)
 *   85'      : ⚽ Argentina GOAL → full AI commentary + odds (WhatsApp + PWA push)
 *   90'      : Additional time (4 min) alert
 *   90+2'    : ⚽ Argentina GOAL → full AI commentary + odds (WhatsApp + PWA push)
 *   FT       : Full-time report (WhatsApp + PWA push)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Parse kickoff time ──────────────────────────────────────────────────────

function parseKickoffTime(arg) {
  const now = Date.now();

  if (!arg) {
    // Default: 35 minutes from now
    return now + 35 * 60 * 1000;
  }

  if (arg.startsWith('+')) {
    const mins = parseInt(arg.slice(1), 10);
    if (isNaN(mins)) throw new Error(`Invalid offset: ${arg}`);
    return now + mins * 60 * 1000;
  }

  // HH:MM format — today's date, local time
  const [hh, mm] = arg.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) throw new Error(`Invalid time format: ${arg}. Use HH:MM or +minutes`);
  const target = new Date();
  target.setHours(hh, mm, 0, 0);
  if (target.getTime() < now) {
    // If the time has already passed today, assume tomorrow
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

const kickoffMs = parseKickoffTime(process.argv[2]);
const kickoffDate = new Date(kickoffMs);

// ─── Wall-clock schedule ─────────────────────────────────────────────────────
//
// Each entry: { snapshotIndex, offsetMs, label, isKey }
// offsetMs = milliseconds from kickoff (negative = before kickoff)
//
// First-half timing: match minute = real minutes from kickoff
// Halftime break: 15 min after HT finalised (which is at 45+2 = 47 min)
// Second-half: real minutes = 15 (break) + (match_minute - 46 + 1) from HT end
//
//  match  | offset from KO | reasoning
//  ─────────────────────────────────────────────────────
//  pre    | -30 min        | 30-min pre-match bulletin
//  KO 1'  | 0 min          | kickoff
//  10'    | 10 min         | first half mid-point
//  18'    | 18 min         | corner event
//  22'    | 22 min         | shot event
//  28'    | 28 min         | yellow card event
//  32'    | 32 min         | free kick event
//  38'    | 38 min         | corner event
//  42'    | 42 min         | shot event
//  45+0'  | 45 min         | added time announcement
//  HT     | 47 min         | halftime finalised (45+2)
//  46'    | 62 min         | 2nd half kickoff (47 + 15 min break)
//  50'    | 66 min         | possession event
//  55' ⚽  | 71 min         | ENGLAND GOAL
//  56'    | 72 min         | danger_possession
//  62'    | 77 min         | corner
//  67'    | 83 min         | substitution
//  72'    | 88 min         | shot
//  76'    | 92 min         | free kick
//  80'    | 96 min         | shot
//  84'    | 100 min        | corner
//  85' ⚽  | 101 min        | ARGENTINA GOAL
//  86'    | 102 min        | danger_possession
//  90'    | 106 min        | added time announcement (4 min)
//  92' ⚽  | 108 min        | ARGENTINA GOAL (90+2')
//  93'    | 109 min        | yellow card
//  94'    | 110 min        | standby
//  FT     | 112 min        | game_finalised
//  END    | 113 min        | disconnected

const M = (min) => min * 60 * 1000; // minutes to ms

const SCHEDULE = [
  { snapshotIndex: null, offsetMs: M(-30),  label: '🔔 Pre-match bulletin (30 min warning)', isKey: true, action: 'prematch' },
  { snapshotIndex: 6,    offsetMs: M(0),    label: '⚽ Kickoff — England vs Argentina!',     isKey: true },
  { snapshotIndex: 7,    offsetMs: M(10),   label: "10' — England possession in final third" },
  { snapshotIndex: 8,    offsetMs: M(18),   label: "18' — Argentina corner" },
  { snapshotIndex: 9,    offsetMs: M(22),   label: "22' — England shot on target" },
  { snapshotIndex: 10,   offsetMs: M(28),   label: "28' — Argentina yellow card" },
  { snapshotIndex: 11,   offsetMs: M(32),   label: "32' — England free kick" },
  { snapshotIndex: 12,   offsetMs: M(38),   label: "38' — England corner" },
  { snapshotIndex: 13,   offsetMs: M(42),   label: "42' — Argentina shot on target" },
  { snapshotIndex: 14,   offsetMs: M(45),   label: "⏱ Added time: 2 min", isKey: true },
  { snapshotIndex: 15,   offsetMs: M(47),   label: '⏱ Half time — 0–0',   isKey: true },
  { snapshotIndex: 16,   offsetMs: M(62),   label: '▶️ Second half kickoff (46\')', isKey: true },
  { snapshotIndex: 17,   offsetMs: M(66),   label: "50' — Argentina pressing high" },
  { snapshotIndex: 18,   offsetMs: M(71),   label: "55' ⚽ ENGLAND GOAL — Bellingham!", isKey: true, isGoal: true },
  { snapshotIndex: 19,   offsetMs: M(72),   label: "56' — Argentina immediately on the ball" },
  { snapshotIndex: 20,   offsetMs: M(77),   label: "62' — Argentina corner" },
  { snapshotIndex: 21,   offsetMs: M(83),   label: "67' — England substitution" },
  { snapshotIndex: 22,   offsetMs: M(88),   label: "72' — Argentina shot, Pickford saves" },
  { snapshotIndex: 23,   offsetMs: M(92),   label: "76' — England foul, free kick to Argentina" },
  { snapshotIndex: 24,   offsetMs: M(96),   label: "80' — Argentina high danger possession" },
  { snapshotIndex: 25,   offsetMs: M(100),  label: "84' — Argentina corner..." },
  { snapshotIndex: 26,   offsetMs: M(101),  label: "85' ⚽ ARGENTINA GOAL — Álvarez equalises!", isKey: true, isGoal: true },
  { snapshotIndex: 27,   offsetMs: M(102),  label: "86' — England respond immediately" },
  { snapshotIndex: 28,   offsetMs: M(106),  label: "⏱ Added time: 4 min (90')", isKey: true },
  { snapshotIndex: 29,   offsetMs: M(108),  label: "90+2' ⚽ ARGENTINA GOAL — MESSI WINS IT!", isKey: true, isGoal: true },
  { snapshotIndex: 30,   offsetMs: M(109),  label: "93' — England yellow card (frustration)" },
  { snapshotIndex: 31,   offsetMs: M(110),  label: "94' — Standby, final seconds..." },
  { snapshotIndex: 32,   offsetMs: M(112),  label: '🏁 Full time — England 1–2 Argentina', isKey: true },
  { snapshotIndex: 33,   offsetMs: M(113),  label: '📡 Feed disconnected' },
];

// ─── Load snapshot & patch StartTime ────────────────────────────────────────

const snapshotPath = path.join(__dirname, 'src', 'match_18241006_snapshot.json');
if (!fs.existsSync(snapshotPath)) {
  console.error('❌ Snapshot not found. Run: node build_snapshot.mjs first.');
  process.exit(1);
}

const rawSnapshots = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const snapshots = rawSnapshots.map(s => ({
  ...s,
  StartTime: kickoffMs,
  Ts: kickoffMs + (s.Elapsed !== null && s.Elapsed !== undefined ? s.Elapsed * 60 * 1000 : 0),
}));

console.log(`✅ Loaded ${snapshots.length} snapshots`);

// ─── Set up mock replay hook ─────────────────────────────────────────────────

global.mockReplayActive = true;
global.mockReplayIndex = 0;
global.getMockReplayDetails = function () {
  if (!global.mockReplayActive) return null;
  return snapshots.slice(0, global.mockReplayIndex + 1);
};

// ─── Import bot modules ──────────────────────────────────────────────────────

const { loadGroupsFromRedis, getGroupsFollowingMatch, updateMatchState } = await import('./src/utils/store.js');
const { initializeWhatsApp, notifyMatchGroups }                          = await import('./src/services/whatsapp.js');
const { pollMatches }                                                    = await import('./src/services/matchPoller.js');
const { getSubscribersForTeams }                                         = await import('./src/utils/subscriptionStore.js');
const { sendPushNotification }                                           = await import('./src/services/pushNotify.js');
const { schedulePreMatchBulletins }                                      = await import('./src/services/scheduler.js');

// ─── Boot ────────────────────────────────────────────────────────────────────

console.log('\n🦅 Huginn Live Demo Controller booting...\n');
await loadGroupsFromRedis();
initializeWhatsApp();

// Give WhatsApp time to restore session and connect (Baileys auto-connects)
await new Promise(r => setTimeout(r, 6000));

// ─── Terminal status display ─────────────────────────────────────────────────

function fmt(ms) {
  const neg = ms < 0;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const hh = h > 0 ? `${h}h ` : '';
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${neg ? '-' : '+'}${hh}${mm}:${ss}`;
}

function printStatus() {
  const now = Date.now();
  const toKO = kickoffMs - now;
  const matchMin = toKO < 0 ? Math.floor(-toKO / 60000) : null;

  console.clear();
  console.log('═════════════════════════════════════════════════════════');
  console.log('  🦅  HUGINN LIVE DEMO — England vs Argentina');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Kickoff:   ${kickoffDate.toLocaleTimeString()}`);
  console.log(`  Pre-match: ${new Date(kickoffMs - M(30)).toLocaleTimeString()}`);
  if (toKO > 0) {
    console.log(`  Status:    ⏳ Kickoff in ${fmt(toKO)}`);
  } else if (matchMin !== null && matchMin < 115) {
    console.log(`  Status:    🔴 LIVE — approx. ${matchMin}' elapsed`);
  } else {
    console.log(`  Status:    🏁 Match complete`);
  }
  console.log('─────────────────────────────────────────────────────────');
  console.log('  Upcoming events:');

  const upcoming = SCHEDULE.filter(e => kickoffMs + e.offsetMs > now).slice(0, 5);
  for (const e of upcoming) {
    const fireAt = new Date(kickoffMs + e.offsetMs);
    const diff = fireAt - now;
    const flag = e.isGoal ? '⚽' : e.isKey ? '🔔' : '  ';
    console.log(`  ${flag} ${fireAt.toLocaleTimeString()} (in ${fmt(diff)})  ${e.label}`);
  }
  console.log('═════════════════════════════════════════════════════════');
  console.log('  Ctrl+C to stop. Keep this terminal open during the demo.');
  console.log('');
}

// ─── Trigger pre-match bulletin (direct, not via scheduler cron) ─────────────

async function firePrematch() {
  console.log('\n🔔 Firing pre-match bulletin...');

  // Reset match state so pre-match can fire
  updateMatchState('18241006', {
    seeded: false,
    sentPreMatch: false,
    sentKO: false,
    sentHT: false,
    sentFT: false,
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
  });

  const groups = getGroupsFollowingMatch('18241006');
  if (!groups.length) {
    console.log('⚠️  No WhatsApp groups are following England vs Argentina.');
    console.log('   → In WhatsApp, send: /follow England  to your group or 1:1 chat');
  }

  // Build pre-match message directly (scheduler's schedulePreMatchBulletins
  // relies on the real API's upcoming match window — bypass it here)
  const minsUntilKO = Math.round((kickoffMs - Date.now()) / 60000);
  const msg =
    `🔔 *30-minute warning!*\n\n` +
    `*England vs Argentina* — World Cup 2026 Final — kicks off in ${minsUntilKO} minutes.\n\n` +
    `Get ready for live goal alerts, red cards, and real-time AI commentary — all coming directly to this chat.\n\n` +
    `📊 Opening odds: 2.40 / 3.30 / 2.90 (H/D/A)`;

  if (groups.length) {
    await notifyMatchGroups(groups, msg);
    console.log(`✅ Pre-match bulletin sent to ${groups.length} WhatsApp chat(s)`);
  }

  // PWA push
  try {
    const subs = await getSubscribersForTeams(['England', 'Argentina']);
    if (subs.length) {
      await sendPushNotification(
        '30 mins to kick-off! 🔔',
        'England vs Argentina — World Cup 2026 Final starts soon.',
        '/',
        subs.map(s => s.subscription)
      );
      console.log(`✅ Pre-match push sent to ${subs.length} PWA subscriber(s)`);
    }
  } catch (e) {
    console.log('⚠️  PWA push skipped:', e.message);
  }

  updateMatchState('18241006', { sentPreMatch: true });
}

// ─── Schedule all events ──────────────────────────────────────────────────────

async function fireEvent(entry) {
  if (entry.action === 'prematch') {
    await firePrematch();
    return;
  }

  global.mockReplayIndex = entry.snapshotIndex;
  console.log(`\n⏰ [${new Date().toLocaleTimeString()}] ${entry.label}`);
  await pollMatches();
}

function scheduleAll() {
  const now = Date.now();

  for (const entry of SCHEDULE) {
    const fireAt = kickoffMs + entry.offsetMs;
    const delay  = fireAt - now;

    if (delay < -5000) {
      // Already passed (more than 5s ago) — skip
      continue;
    }

    const safeDelay = Math.max(0, delay);
    setTimeout(async () => {
      try {
        await fireEvent(entry);
      } catch (err) {
        console.error(`❌ Error firing event "${entry.label}":`, err.message);
      }
    }, safeDelay);

    const fireTime = new Date(fireAt).toLocaleTimeString();
    if (entry.isKey) {
      console.log(`📅 Scheduled: ${fireTime} — ${entry.label}`);
    }
  }
}

// ─── Status refresh loop ──────────────────────────────────────────────────────

let statusInterval;
function startStatusDisplay() {
  printStatus();
  statusInterval = setInterval(printStatus, 10000); // refresh every 10s
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const now = Date.now();
const preMatchTime = kickoffMs - M(30);

console.log('');
console.log('📅 DEMO SCHEDULE');
console.log('────────────────────────────────────────────');
console.log(`  Pre-match bulletin : ${new Date(preMatchTime).toLocaleTimeString()}`);
console.log(`  Kickoff            : ${new Date(kickoffMs).toLocaleTimeString()}`);
console.log(`  England goal (55') : ${new Date(kickoffMs + M(71)).toLocaleTimeString()}`);
console.log(`  HT                 : ${new Date(kickoffMs + M(47)).toLocaleTimeString()}`);
console.log(`  Argentina goal (85'): ${new Date(kickoffMs + M(101)).toLocaleTimeString()}`);
console.log(`  Added time (90')   : ${new Date(kickoffMs + M(106)).toLocaleTimeString()}`);
console.log(`  Argentina goal (92'): ${new Date(kickoffMs + M(108)).toLocaleTimeString()}`);
console.log(`  Full time          : ${new Date(kickoffMs + M(112)).toLocaleTimeString()}`);
console.log('────────────────────────────────────────────');
console.log('');

if (preMatchTime < now) {
  console.log('⚠️  Pre-match time has already passed — firing pre-match NOW then continuing...');
}

console.log('📣 BEFORE THIS RUNS — make sure:');
console.log('   1. You sent /follow England in your WhatsApp group');
console.log('   2. You sent /follow England in your 1:1 chat with Huginn');
console.log('   3. Anyone on your PWA website is subscribed to push notifications');
console.log('');
console.log('Press Ctrl+C to abort. Starting in 5 seconds...');
console.log('');

await new Promise(r => setTimeout(r, 5000));

scheduleAll();
startStatusDisplay();

// Keep process alive
process.stdin.resume();
process.on('SIGINT', () => {
  clearInterval(statusInterval);
  console.log('\n\n👋 Demo stopped.');
  process.exit(0);
});
