import { getGroup, getAllGroups } from '../utils/store.js';
import { persistGroup } from '../utils/subscriptionStore.js';
import { sendMessage } from '../services/whatsapp.js';
import { getFixtureSchedule } from '../services/txline.js';

export async function handlePredictCommand(from, senderJid, pushName, args) {
  let group = getGroup(from);
  
  // Ensure predictions state object exists
  if (!group.matchPredictions) {
    group.matchPredictions = {}; // { [matchId]: { participants: [{ jid, name, predictedTeam }] } }
  }

  const subCommand = args[0] ? args[0].toLowerCase() : '';

  if (subCommand === 'list') {
    return showPredictionList(from, group);
  } else if (subCommand === '') {
    return sendMessage(from, `⚠️ Send */predict <team>* to lock in your pick for their upcoming match (e.g. */predict brazil*).\n\nOther commands:\n*/predict list*`);
  } else {
    // Treat the arguments as the team name
    const teamName = args.join(' ').toLowerCase();
    return lockPrediction(from, senderJid, pushName, teamName, group);
  }
}

async function lockPrediction(from, jid, pushName, teamName, group) {
  // Validate team name
  if (teamName.length < 3) {
    return sendMessage(from, `⚠️ Invalid team name. Please enter a valid country name (e.g. */predict argentina*).`);
  }

  // Fetch upcoming matches
  const schedule = await getFixtureSchedule();
  
  // Find the next match for this team
  const nextMatch = schedule.find(m => 
    m.home_team.name.toLowerCase().includes(teamName) || 
    m.away_team.name.toLowerCase().includes(teamName)
  );

  if (!nextMatch) {
    return sendMessage(from, `⚠️ Could not find any upcoming matches for *${teamName}*.`);
  }

  const matchId = nextMatch.id;
  
  // Initialize match array if needed
  if (!group.matchPredictions[matchId]) {
    group.matchPredictions[matchId] = { participants: [] };
  }

  const matchParticipants = group.matchPredictions[matchId].participants;

  // Check if already locked in
  const existing = matchParticipants.find(p => p.jid === jid);
  if (existing) {
    return sendMessage(from, `⚠️ You already predicted *${existing.predictedTeam}* for ${nextMatch.home_team.name} vs ${nextMatch.away_team.name}.`);
  }

  // The user might have typed 'arg', but we want to store the actual team name
  const actualTeamName = nextMatch.home_team.name.toLowerCase().includes(teamName) ? nextMatch.home_team.name : nextMatch.away_team.name;

  // Add prediction
  matchParticipants.push({
    jid,
    name: pushName || 'Unknown',
    predictedTeam: actualTeamName
  });

  // Persist
  await persistGroup(from, group);

  return sendMessage(from, `✅ Locked in: *${actualTeamName}* to win ${nextMatch.home_team.name} vs ${nextMatch.away_team.name}`);
}

async function showPredictionList(from, group) {
  if (!group.matchPredictions || Object.keys(group.matchPredictions).length === 0) {
    return sendMessage(from, `No predictions locked in yet! Be the first: */predict <team>*`);
  }

  const schedule = await getFixtureSchedule();
  let msg = `🔮 *Predictions so far:*\n\n`;
  let hasPredictions = false;

  for (const [matchId, matchData] of Object.entries(group.matchPredictions)) {
    const participants = matchData.participants;
    if (!participants || participants.length === 0) continue;

    // Find match details from schedule to get team names
    const match = schedule.find(m => m.id === matchId);
    const matchTitle = match ? `${match.home_team.name} vs ${match.away_team.name}` : `Match ${matchId}`;

    msg += `*${matchTitle}*\n`;
    
    // Group by team
    const teamsMap = {};
    participants.forEach(p => {
      if (!teamsMap[p.predictedTeam]) teamsMap[p.predictedTeam] = [];
      teamsMap[p.predictedTeam].push(p.name);
    });

    for (const [team, names] of Object.entries(teamsMap)) {
      msg += `  ${team} → ${names.join(', ')}\n`;
    }
    msg += '\n';
    hasPredictions = true;
  }

  if (!hasPredictions) {
    return sendMessage(from, `No predictions locked in yet! Be the first: */predict <team>*`);
  }

  return sendMessage(from, msg.trim());
}

/**
 * Announce prediction results when a match finishes.
 * Called by matchPoller.js at Full-Time.
 */
export async function processMatchPredictions(matchId, homeTeam, awayTeam, homeScore, awayScore) {
  const allGroups = getAllGroups();

  let winner = null;
  if (homeScore > awayScore) {
    winner = homeTeam.toLowerCase();
  } else if (awayScore > homeScore) {
    winner = awayTeam.toLowerCase();
  }

  for (const group of allGroups) {
    if (!group.matchPredictions || !group.matchPredictions[matchId]) continue;

    const participants = group.matchPredictions[matchId].participants;
    if (!participants || participants.length === 0) continue;

    let winners = [];
    let losers = [];

    participants.forEach(p => {
      const picked = p.predictedTeam.toLowerCase();
      if (winner && picked === winner) {
        winners.push(p.name);
      } else {
        losers.push({ name: p.name, team: p.predictedTeam });
      }
    });

    let msg = `🎯 *Prediction Results: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}*\n\n`;

    if (winner) {
      if (winners.length > 0) {
        msg += `✅ *Nailed it!* Congrats to: ${winners.join(', ')}\n\n`;
      } else {
        msg += `❌ Nobody predicted ${winner} to win!\n\n`;
      }
      
      if (losers.length > 0) {
        msg += `💔 Better luck next time:\n`;
        losers.forEach(l => {
          msg += `- ${l.name} (picked ${l.team})\n`;
        });
      }
    } else {
      // Draw
      msg += `🤝 It's a draw! Nobody wins this prediction round.`;
    }

    try {
      await sendMessage(group.id, msg);
      // Optional: Clear predictions for this match so it doesn't clutter state
      delete group.matchPredictions[matchId];
      await persistGroup(group.id, group);
    } catch (err) {
      console.error(`[Predict] Failed to send prediction results for group ${group.id}:`, err.message);
    }
  }
}
