import { getGroup, registerGroup, getAllGroups } from '../utils/store.js';
import { sendMessage } from '../services/whatsapp.js';
import { persistGroup } from '../utils/db.js';

// Hardcoded World Cup 2026 nations for the draft
const WORLD_CUP_TEAMS = [
  'Argentina', 'Brazil', 'France', 'England', 'Spain', 'Germany', 'Portugal', 'Netherlands',
  'Italy', 'Belgium', 'Croatia', 'Uruguay', 'Colombia', 'Senegal', 'Morocco', 'USA',
  'Mexico', 'Canada', 'Japan', 'South Korea', 'Iran', 'Saudi Arabia', 'Australia', 'Nigeria',
  'Cameroon', 'Ghana', 'Algeria', 'Tunisia', 'Ecuador', 'Switzerland', 'Denmark', 'Norway'
];

/**
 * Handle sweepstake command routing
 */
export async function handleSweepstakeCommand(from, text, senderJid = from) {
  const parts = text.split(/\s+/);
  const action = parts[1]?.toLowerCase();

  // Make sure group is registered
  registerGroup(from);
  const group = getGroup(from);
  if (!group.sweepstake) {
    group.sweepstake = {
      status: 'none',
      participants: [], // { jid, name }
      assignments: {},  // { jid: team[] }
      standings: {}     // { jid: points }
    };
  }

  if (action === 'start') {
    return startSweepstake(from, group);
  }
  if (action === 'join') {
    const name = parts.slice(2).join(' ').trim();
    return joinSweepstake(from, group, name, senderJid);
  }
  if (action === 'draw') {
    return drawSweepstake(from, group);
  }
  if (action === 'leaderboard' || action === 'board') {
    return showLeaderboard(from, group);
  }

  // Help menu
  return sendMessage(from,
    `🏆 *Huginn Sweepstake Help*\n\n` +
    `Get your friends/group members assigned to World Cup teams and track points live!\n\n` +
    `*Commands:*\n` +
    `• */sweepstake start* - Start a new sweepstake\n` +
    `• */sweepstake join <your name>* - Join the draw\n` +
    `• */sweepstake draw* - Draw teams automatically\n` +
    `• */sweepstake leaderboard* - See live standings`
  );
}

async function startSweepstake(from, group) {
  if (group.sweepstake.status !== 'none') {
    return sendMessage(from, `⚠️ A sweepstake is already active or in signup phase in this group. Type */sweepstake draw* to run the draft or check the scoreboard with */sweepstake leaderboard*.`);
  }

  group.sweepstake = {
    status: 'joining',
    participants: [],
    assignments: {},
    standings: {}
  };

  // Persist immediately so a restart doesn't lose the open signup
  await persistGroup(from, group);

  return sendMessage(from,
    `🏆 *World Cup Group Sweepstake Started!*\n\n` +
    `Type */sweepstake join <Your Name>* to join the draft. All group members who want to participate must join now!`
  );
}

async function joinSweepstake(from, group, name, senderJid) {
  if (group.sweepstake.status !== 'joining') {
    return sendMessage(from, `⚠️ Signups are closed. Start a new sweepstake first with */sweepstake start*.`);
  }
  if (!name) {
    return sendMessage(from, `❌ Please specify your name. E.g. */sweepstake join Tunde*`);
  }

  // Check if already joined
  const exists = group.sweepstake.participants.some(p => p.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return sendMessage(from, `⚠️ "${name}" has already joined the sweepstake.`);
  }

  group.sweepstake.participants.push({ jid: senderJid, name });
  // Persist so a restart doesn't lose who joined
  await persistGroup(from, group);
  return sendMessage(from, `✅ *${name}* joined! (Total players: ${group.sweepstake.participants.length})`);
}

async function drawSweepstake(from, group) {
  if (group.sweepstake.status !== 'joining') {
    return sendMessage(from, `⚠️ There is no sweepstake in the signup phase. Start one with */sweepstake start*.`);
  }
  if (group.sweepstake.participants.length === 0) {
    return sendMessage(from, `❌ No players have joined yet! Type */sweepstake join <name>* first.`);
  }

  // Shuffle teams
  const shuffledTeams = [...WORLD_CUP_TEAMS].sort(() => Math.random() - 0.5);
  const players = group.sweepstake.participants;
  const numPlayers = players.length;

  const assignments = {};
  const standings = {};

  players.forEach(p => {
    assignments[p.jid] = [];
    standings[p.jid] = 0;
  });

  // Distribute teams evenly
  shuffledTeams.forEach((team, index) => {
    const player = players[index % numPlayers];
    assignments[player.jid].push(team);
  });

  group.sweepstake.status = 'active';
  group.sweepstake.assignments = assignments;
  group.sweepstake.standings = standings;

  // Persist the completed draw immediately — this is the most critical save point
  await persistGroup(from, group);

  let msg = `🏆 *The World Cup Sweepstake Draw is complete!* 🏆\n\nHere are your team assignments:\n\n`;
  players.forEach(p => {
    msg += `👤 *${p.name}*:\n   ${assignments[p.jid].join(', ')}\n\n`;
  });
  msg += `Standings will update automatically at Full-Time of followed matches!\nType */sweepstake leaderboard* to check scores.`;

  return sendMessage(from, msg);
}

function showLeaderboard(from, group) {
  if (group.sweepstake.status !== 'active') {
    return sendMessage(from, `⚠️ No active sweepstake. Start one with */sweepstake start* and run the draft with */sweepstake draw*.`);
  }

  const players = group.sweepstake.participants;
  const sorted = [...players].sort((a, b) => {
    return (group.sweepstake.standings[b.jid] || 0) - (group.sweepstake.standings[a.jid] || 0);
  });

  let msg = `🏆 *Huginn Sweepstake Leaderboard* 🏆\n\n`;
  sorted.forEach((p, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤';
    const points = group.sweepstake.standings[p.jid] || 0;
    const teams = group.sweepstake.assignments[p.jid] || [];
    msg += `${medal} *${p.name}*: ${points} pts\n   (Teams: ${teams.join(', ')})\n\n`;
  });

  return sendMessage(from, msg);
}

/**
 * Update points for all active sweepstakes when a match finishes.
 * Called by matchPoller.js at Full-Time.
 */
export async function processMatchEndPoints(homeTeam, awayTeam, homeScore, awayScore) {
  const allGroups = getAllGroups();

  for (const group of allGroups) {
    if (!group.sweepstake || group.sweepstake.status !== 'active') continue;

    const standings   = group.sweepstake.standings;
    const assignments = group.sweepstake.assignments;
    let changed = false;

    // Award points to owners of the teams
    Object.keys(assignments).forEach(jid => {
      const teams = assignments[jid] || [];

      // If they own home team
      if (teams.includes(homeTeam)) {
        if (homeScore > awayScore) standings[jid] = (standings[jid] || 0) + 3; // Win
        else if (homeScore === awayScore) standings[jid] = (standings[jid] || 0) + 1; // Draw
        standings[jid] = (standings[jid] || 0) + homeScore; // Goal bonus (1pt per goal)
        changed = true;
      }

      // If they own away team
      if (teams.includes(awayTeam)) {
        if (awayScore > homeScore) standings[jid] = (standings[jid] || 0) + 3; // Win
        else if (homeScore === awayScore) standings[jid] = (standings[jid] || 0) + 1; // Draw
        standings[jid] = (standings[jid] || 0) + awayScore; // Goal bonus (1pt per goal)
        changed = true;
      }
    });

    // Persist updated standings to Redis if any points were awarded
    if (changed) {
      try {
        await persistGroup(group.id, group);
      } catch (err) {
        // Non-fatal: log but don't crash the FT alert pipeline
        console.error(`[Sweepstake] Failed to persist standings for group ${group.id}:`, err.message);
      }
    }
  }
}
