/**
 * chat.js - Web chat API handler
 *
 * Gives web users the same bot experience as WhatsApp users,
 * without exposing any phone number.
 */

import { getLiveMatches, getUpcomingMatches, searchMatch, getFixtureSchedule } from '../services/txline.js';
import {
  registerGroup, getGroup, setGroupStyle,
  followMatch, unfollowMatch, initMatchState,
  addWebChatMessage, getWebChatMessages
} from '../utils/store.js';
import { log } from '../utils/logger.js';
import { STYLES } from '../services/ai.js';
import { followTeam, unfollowTeam } from '../utils/subscriptionStore.js';

// Each web session gets a unique "session ID" as their group identifier
// so their follows/vibes are tracked independently of WhatsApp users

/**
 * POST /api/chat  { sessionId: string, message: string }
 * Returns: { reply: string }
 */
export async function handleChatMessage(req, res) {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    const text = String(message).trim();
    if (!text) return res.status(400).json({ error: 'Empty message' });

    log.info(`[Web] Session ${sessionId}: ${text}`);

    // Store user message
    addWebChatMessage(sessionId, { from: 'user', text, ts: Date.now() });

    const reply = await routeWebCommand(sessionId, text);

    // Store bot message
    addWebChatMessage(sessionId, { from: 'huginn', text: reply, ts: Date.now() });

    return res.json({ reply });

  } catch (err) {
    log.error('Chat API error:', err.message);
    return res.status(500).json({ reply: '⚽ Something went wrong. Please try again!' });
  }
}

/**
 * GET /api/chat?sessionId=...
 * Returns all messages buffered on the server for this session.
 */
export async function handleGetMessages(req, res) {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    const messages = getWebChatMessages(sessionId);
    return res.json({ messages });
  } catch (err) {
    log.error('Get messages API error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve messages' });
  }
}


/**
 * GET /api/live  - returns current live matches for the scoreboard panel
 */
export async function getLiveMatchesAPI(req, res) {
  try {
    const live = await getLiveMatches();
    const upcoming = await getUpcomingMatches(6);
    return res.json({ live, upcoming });
  } catch (err) {
    log.error('Live matches API error:', err.message);
    return res.json({ live: [], upcoming: [] });
  }
}

// ─── Command router (mirrors webhook.js but returns text instead of sending WhatsApp) ───

async function routeWebCommand(sessionId, text) {
  const lower = text.toLowerCase().trim();

  // Register session on first contact
  registerGroup(sessionId, 'Web User');

  if (lower === 'hi' || lower === 'hello' || lower === '/help' || lower === 'help') {
    return helpText();
  }
  if (lower.startsWith('/follow') || lower.startsWith('follow')) {
    return handleFollow(sessionId, text);
  }
  if (lower.startsWith('/unfollow') || lower.startsWith('unfollow')) {
    return handleUnfollow(sessionId, text);
  }
  if (lower.startsWith('/style') || lower.startsWith('style')) {
    return handleStyle(sessionId, text);
  }
  if (lower === '/status' || lower === 'status') {
    return handleStatus(sessionId);
  }
  if (lower === '/live' || lower === 'live' || lower === 'matches') {
    return handleLive();
  }
  if (lower === '/schedule' || lower === 'schedule' || lower === '/fixtures' || lower === 'fixtures') {
    return handleSchedule();
  }
  if (lower.startsWith('/stats') || lower.startsWith('stats')) {
    return handleStats(sessionId, text);
  }

  // Fallback: Fallback to AI Football Oracle with live matches context
  try {
    const { answerFootballQuestion } = await import('../services/ai.js');
    const { getLiveMatches, getUpcomingMatches } = await import('../services/txline.js');
    const group = getGroup(sessionId);
    const style = group?.style || 'hype';

    const [live, upcoming] = await Promise.all([getLiveMatches(), getUpcomingMatches(12)]);
    let matchContext = '';
    if (live.length) {
      matchContext += 'Live Matches:\n' + live.map(m => `• ${m.home_team?.name} vs ${m.away_team?.name}`).join('\n') + '\n';
    }
    if (upcoming.length) {
      matchContext += 'Upcoming Matches:\n' + upcoming.map(m => `• ${m.home_team?.name} vs ${m.away_team?.name} (kickoff: ${new Date(m.kickoff_time).toLocaleTimeString()})`).join('\n') + '\n';
    }

    return await answerFootballQuestion(text, matchContext, style, sessionId);
  } catch (err) {
    return `⚽ Hit a minor tactical issue. Type /help to see commands!`;
  }
}

// ─── Handlers ───

async function handleFollow(sessionId, text) {
  const query = text.replace(/\/?(follow)\s*/i, '').trim();
  if (!query) {
    return '⚽ Tell me which team! Example:\n/follow Nigeria';
  }

  const matches = await searchMatch(query);
  if (!matches.length) {
    return `❌ No upcoming or live matches found for *${query}*.\n\nTry a different spelling or check back closer to the match.`;
  }

  const m = matches[0];
  const group = getGroup(sessionId);

  // Check if they are already following this match JID
  if (group && group.followedMatchIds.has(String(m.id))) {
    const isLive = m.status === 'LIVE' || m.status === 'HT';
    const scoreText = isLive ? `\n📊 Score: *${m.home_team?.name} ${m.home_score ?? 0}–${m.away_score ?? 0} ${m.away_team?.name}*` : '';
    const timeText = isLive
      ? (m.status === 'HT' ? ` (HT)` : ` (${m.minute ? m.minute : '1'}' minute)`)
      : ` (Kickoff: ${new Date(m.kickoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})`;

    return `🛡️ You are already following *${m.home_team?.name} vs ${m.away_team?.name}*!${scoreText}${timeText}\n\nLive alerts are fully active for this chat.`;
  }

  followMatch(sessionId, m.id);
  initMatchState(m.id, {});

  // Persist followed teams in Redis push notification store
  try {
    if (query) await followTeam(sessionId, query);
    if (m.home_team?.name) await followTeam(sessionId, m.home_team.name);
    if (m.away_team?.name) await followTeam(sessionId, m.away_team.name);
  } catch (err) {
    log.error('Failed to save followed teams in DB:', err.message);
  }

  const kickoff = new Date(m.kickoff_time).toLocaleString('en-GB', {
    weekday: 'short', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
  });

  return `✅ Following!\n\n🏟️ *${m.home_team?.name} vs ${m.away_team?.name}*\n⏰ Kickoff: ${kickoff}\n\nI'll send you goal alerts, red cards, half-time report, and full-time wrap-up automatically here in this chat.`;
}

async function handleUnfollow(sessionId, text) {
  const query = text.replace(/\/?(unfollow)\s*/i, '').trim();
  const matches = query ? await searchMatch(query) : [];

  if (matches.length) {
    const m = matches[0];
    unfollowMatch(sessionId, m.id);

    // Remove followed teams from Redis push notification store
    try {
      if (query) await unfollowTeam(sessionId, query);
      if (m.home_team?.name) await unfollowTeam(sessionId, m.home_team.name);
      if (m.away_team?.name) await unfollowTeam(sessionId, m.away_team.name);
    } catch (err) {
      log.error('Failed to remove followed teams in DB:', err.message);
    }

    return `🔕 Unfollowed *${m.home_team?.name} vs ${m.away_team?.name}*`;
  }
  return `❓ Which match? E.g. /unfollow Nigeria`;
}

async function handleStyle(sessionId, text) {
  const mode = text.replace(/\/?(style)\s*/i, '').trim().toLowerCase();
  const valid = Object.keys(STYLES);

  if (!valid.includes(mode)) {
    return (
      `🎙️ Pick a commentary style:\n\n` +
      `*/style hype* - Full pundit energy 🔥\n` +
      `*/style tactical* - Calm analyst, stats & formations 📊\n` +
      `*/style funny* - Pure banter and dry wit 😂\n` +
      `*/style balanced* - Friendly match coverage ⚽`
    );
  }

  setGroupStyle(sessionId, mode);
  const styleNames = { hype: '🔥 Hype', tactical: '📊 Tactical', funny: '😂 Banter', balanced: '⚽ Balanced' };
  return `✅ Commentary style set to *${styleNames[mode]}*!\n\nAll future alerts will come in this style.`;
}

async function handleStatus(sessionId) {
  const group = getGroup(sessionId);
  if (!group || group.followedMatchIds.size === 0) {
    return `📭 You're not following any matches yet.\n\nTry: /follow Nigeria`;
  }
  const count = group.followedMatchIds.size;
  return (
    `📋 *Your Status*\n\n` +
    `Following: ${count} match${count > 1 ? 'es' : ''}\n` +
    `Style: ${group.style || 'hype'}\n\n` +
    `Type /style to change your commentary style.`
  );
}

async function handleLive() {
  try {
    const live = await getLiveMatches();
    const upcoming = await getUpcomingMatches(6);

    let reply = '';

    if (live.length) {
      reply += `🔴 *LIVE NOW:*\n`;
      for (const m of live.slice(0, 5)) {
        const homeScore = m.home_score ?? 0;
        const awayScore = m.away_score ?? 0;
        const min = m.minute ? ` ${m.minute}'` : '';
        const ht  = m.status === 'HT' ? ' (HT)' : '';
        reply += `• *${m.home_team?.name} ${homeScore}–${awayScore} ${m.away_team?.name}*${min}${ht}\n`;
      }
      reply += '\n';
    }

    if (upcoming.length) {
      reply += `📅 *COMING UP (next 6h):*\n`;
      for (const m of upcoming.slice(0, 5)) {
        const kick = new Date(m.kickoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        reply += `• ${m.home_team?.name} vs ${m.away_team?.name} @ ${kick}\n`;
      }
      reply += '\nType */follow <team>* to get alerts for any match!';
    }

    if (!live.length && !upcoming.length) {
      reply = `😴 No matches right now.\n\nType */schedule* to see the tournament calendar.\n\nType /help to see all commands.`;
    }

    return reply;
  } catch {
    return `⚽ Couldn't fetch match data right now. Try again in a moment!`;
  }
}

async function handleSchedule() {
  try {
    const upcoming = await getFixtureSchedule();
    if (!upcoming.length) {
      return `📅 No upcoming matches found in the current schedule.`;
    }
    
    let reply = `📅 *TOURNAMENT FIXTURES:*\n\n`;
    for (const m of upcoming.slice(0, 10)) {
      const date = new Date(m.kickoff_time).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      reply += `• *${m.home_team?.name} vs ${m.away_team?.name}*\n  ${date}\n\n`;
    }
    reply += `Type */follow <team>* to register live updates for any match!`;
    return reply;
  } catch {
    return `⚽ Could not load tournament fixtures right now.`;
  }
}

async function handleStats(sessionId, text) {
  const player = text.replace(/\/?(stats)\s*/i, '').trim();
  if (!player) {
    return (
      `👤 Who do you want stats on?\n\n` +
      `Example: */stats Vinicius Jr*\n\n` +
      `I can give you career background, playing style, and injury history for any player at the tournament.`
    );
  }

  const group = getGroup(sessionId);
  const style = group?.style || 'hype';

  try {
    const { generatePlayerStats } = await import('../services/ai.js');
    return await generatePlayerStats(player, style);
  } catch (err) {
    return `⚽ Couldn't pull stats for ${player} right now.\n\nTry again in a moment!`;
  }
}

function helpText() {
  return (
    `🏆 *Huginn Companion Bot* — World Cup 2026\n\n` +
    `*Commands:*\n` +
    `*/follow <team>* — Get live alerts for a match\n` +
    `*/unfollow <team>* — Stop following a match\n` +
    `*/style <mode>* — Change commentary style\n` +
    `*/live* — See live matches\n` +
    `*/schedule* — See upcoming tournament fixtures\n` +
    `*/stats <player>* — Career profile, playing style, injury history\n` +
    `*/status* — See what you're following\n\n` +
    `*What I send automatically:*\n` +
    `🔔 Pre-match bulletin (30 mins before)\n` +
    `⚽ Goal alerts with odds context\n` +
    `🟥 Red card alerts\n` +
    `📊 Half-time report\n` +
    `🏁 Full-time wrap-up\n` +
    `📈 Big odds shift alerts\n\n` +
    `Powered by TxLINE + Groq AI 🤖`
  );
}
