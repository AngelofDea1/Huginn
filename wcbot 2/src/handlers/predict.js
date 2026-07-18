import { getGroup, getAllGroups } from '../utils/store.js';
import { persistGroup } from '../utils/subscriptionStore.js';
import { sendMessage } from '../services/whatsapp.js';

export async function handlePredictCommand(from, senderJid, pushName, args) {
  let group = getGroup(from);
  
  // Ensure predictions state object exists
  if (!group.predictions) {
    group.predictions = {
      participants: [] // { jid, name, team, points, status: 'still in' | 'eliminated' }
    };
  }

  const subCommand = args[0] ? args[0].toLowerCase() : '';

  if (subCommand === 'list') {
    return showPredictionList(from, group);
  } else if (subCommand === 'leaderboard') {
    return showLeaderboard(from, group);
  } else if (subCommand === '') {
    return sendMessage(from, `⚠️ Send */predict <team>* to lock in your tournament champion (e.g. */predict brazil*).\n\nOther commands:\n*/predict list*\n*/predict leaderboard*`);
  } else {
    // Treat the arguments as the team name
    const teamName = args.join(' ').toLowerCase();
    return lockPrediction(from, senderJid, pushName, teamName, group);
  }
}

async function lockPrediction(from, jid, pushName, teamName, group) {
  // Check if already locked in
  const existing = group.predictions.participants.find(p => p.jid === jid);
  if (existing) {
    return sendMessage(from, `⚠️ Your pick is already locked in: *${existing.team}*\nYou cannot change your prediction once submitted.`);
  }

  // Validate team name (basic check for empty or just garbage)
  if (teamName.length < 3) {
    return sendMessage(from, `⚠️ Invalid team name. Please enter a valid country name (e.g. */predict argentina*).`);
  }

  // Add prediction
  group.predictions.participants.push({
    jid,
    name: pushName || 'Unknown',
    team: teamName,
    points: 0,
    status: 'still in'
  });

  // Persist
  await persistGroup(from, group);

  return sendMessage(from, `✅ locked in: *${teamName}* to win it all`);
}

function showPredictionList(from, group) {
  const participants = group.predictions.participants;
  if (!participants || participants.length === 0) {
    return sendMessage(from, `No predictions locked in yet! Be the first: */predict <team>*`);
  }

  // Group by team
  const teamsMap = {};
  participants.forEach(p => {
    if (!teamsMap[p.team]) teamsMap[p.team] = [];
    teamsMap[p.team].push(p.name);
  });

  let msg = `🔮 *the calls so far:*\n\n`;
  for (const [team, names] of Object.entries(teamsMap)) {
    msg += `*${team}* → ${names.join(', ')}\n`;
  }

  return sendMessage(from, msg);
}

function showLeaderboard(from, group) {
  const participants = group.predictions.participants;
  if (!participants || participants.length === 0) {
    return sendMessage(from, `No predictions locked in yet!`);
  }

  const sorted = [...participants].sort((a, b) => b.points - a.points);

  let msg = `🏆 *Huginn Predict Leaderboard* 🏆\n\n`;
  sorted.forEach((p, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤';
    msg += `${medal} ${p.name} · ${p.team} (${p.status}) · ${p.points} pts\n`;
  });

  return sendMessage(from, msg);
}

/**
 * Update points for all active predictions when a match finishes.
 * Called by matchPoller.js at Full-Time.
 * @param {string} homeTeam 
 * @param {string} awayTeam 
 * @param {number} homeScore 
 * @param {number} awayScore 
 * @param {string} round 'quarter_final', 'semi_final', 'final', etc.
 */
export async function processPredictionPoints(homeTeam, awayTeam, homeScore, awayScore, round) {
  const allGroups = getAllGroups();

  const home = homeTeam.toLowerCase();
  const away = awayTeam.toLowerCase();

  let winner = null;
  let loser = null;

  if (homeScore > awayScore) {
    winner = home;
    loser = away;
  } else if (awayScore > homeScore) {
    winner = away;
    loser = home;
  }

  // Determine points to award based on round
  let pointsToAward = 0;
  if (round === 'quarter_final') {
    pointsToAward = 2; // Reached semi-final
  } else if (round === 'semi_final') {
    pointsToAward = 4; // Reached final
  } else if (round === 'final') {
    pointsToAward = 10; // Won tournament
  }

  for (const group of allGroups) {
    if (!group.predictions || !group.predictions.participants || !group.predictions.participants.length) continue;

    let changed = false;

    group.predictions.participants.forEach(p => {
      const pickedTeam = p.team.toLowerCase();

      // If their team won and we have points to award
      if (winner && pickedTeam === winner && pointsToAward > 0) {
        p.points += pointsToAward;
        changed = true;
      }

      // If their team played and lost, they are eliminated
      if (loser && pickedTeam === loser && p.status !== 'eliminated') {
        p.status = 'eliminated';
        changed = true;
      }
    });

    if (changed) {
      try {
        await persistGroup(group.id, group);
      } catch (err) {
        console.error(`[Predict] Failed to persist points for group ${group.id}:`, err.message);
      }
    }
  }
}
