import { searchMatch, getFixtureSchedule } from '../services/txline.js';
import { sendMessage } from '../services/whatsapp.js';
import {
  registerGroup, getGroup, setGroupVibe,
  followMatch, unfollowMatch, initMatchState
} from '../utils/store.js';
import { log } from '../utils/logger.js';
import { VIBES } from '../services/ai.js';

//  Webhook verification (Meta calls this once when you set up the webhook) 
export function verifyWebhook(req, res) {
  const mode  = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    log.info('Webhook verified ');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
}

//  Incoming message handler 
export async function handleWebhook(req, res) {
  // Always respond 200 fast - Meta will retry if you don't
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages?.length) return;

    for (const msg of messages) {
      if (msg.type !== 'text') continue;
      const from = msg.from;           // sender's WhatsApp ID
      const text = msg.text?.body?.trim();
      if (!text) continue;

      log.info(` Message from ${from}: ${text}`);
      await routeCommand(from, text);
    }
  } catch (err) {
    log.error('Webhook handler error:', err.message);
  }
}

//  Command router 
export async function routeCommand(from, text) {
  const lower = text.toLowerCase();

  // Register group on first contact
  registerGroup(from);

  if (lower.startsWith('/follow')) {
    return handleFollow(from, text);
  }
  if (lower.startsWith('/unfollow')) {
    return handleUnfollow(from, text);
  }
  if (lower.startsWith('/vibe')) {
    return handleVibe(from, text);
  }
  if (lower === '/help' || lower === 'hi' || lower === 'hello') {
    return handleHelp(from);
  }
  if (lower === '/status') {
    return handleStatus(from);
  }
  if (lower === '/schedule' || lower === '/fixtures') {
    return handleSchedule(from);
  }
}

//  /follow <team name> 
async function handleFollow(from, text) {
  const query = text.replace(/\/follow\s*/i, '').trim();
  if (!query) {
    return sendMessage(from, ' Tell me which team! Example:\n/follow Nigeria');
  }

  await sendMessage(from, ` Searching for matches with *${query}*...`);

  const matches = await searchMatch(query);
  if (!matches.length) {
    return sendMessage(from, ` No upcoming or live matches found for *${query}*.\n\nTry a different spelling or check back closer to the match.`);
  }

  if (matches.length === 1) {
    const m = matches[0];
    followMatch(from, m.id);
    initMatchState(m.id, {});
    const kickoff = new Date(m.kickoff_time).toLocaleString('en-GB', {
      weekday: 'short', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
    });
    return sendMessage(from,
      ` Following!\n\n *${m.home_team?.name} vs ${m.away_team?.name}*\n Kickoff: ${kickoff}\n\nI'll send you goal alerts, red cards, half-time report, and full-time wrap-up automatically.`
    );
  }

  // Multiple matches found - list them
  const list = matches.slice(0, 5).map((m, i) => {
    const kickoff = new Date(m.kickoff_time).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return `${i + 1}. ${m.home_team?.name} vs ${m.away_team?.name} - ${kickoff}`;
  }).join('\n');

  // Auto-follow first result for simplicity (you can add selection logic later)
  const m = matches[0];
  followMatch(from, m.id);
  initMatchState(m.id, {});

  return sendMessage(from,
    `Found ${matches.length} matches. Following the next one:\n\n *${m.home_team?.name} vs ${m.away_team?.name}*\n\nOther matches found:\n${list}\n\nType /follow <exact team name> to follow a specific match.`
  );
}

//  /unfollow 
async function handleUnfollow(from, text) {
  const query = text.replace(/\/unfollow\s*/i, '').trim();
  const matches = query ? await searchMatch(query) : [];

  if (matches.length) {
    unfollowMatch(from, matches[0].id);
    return sendMessage(from, ` Unfollowed *${matches[0].home_team?.name} vs ${matches[0].away_team?.name}*`);
  }
  return sendMessage(from, ` Which match? E.g. /unfollow Nigeria`);
}

//  /vibe <mode> 
async function handleVibe(from, text) {
  const mode = text.replace(/\/vibe\s*/i, '').trim().toLowerCase();
  const valid = Object.keys(VIBES);

  if (!valid.includes(mode)) {
    return sendMessage(from,
      ` Pick a vibe:\n\n` +
      `*/vibe hype* - Over-the-top African pundit energy \n` +
      `*/vibe tactical* - Calm analyst, stats & formations \n` +
      `*/vibe funny* - Pure banter and roasts \n` +
      `*/vibe balanced* - Friendly match coverage `
    );
  }

  setGroupVibe(from, mode);
  const vibeNames = { hype: ' HYPE FC', tactical: ' The Analyst', funny: ' Banter FC', balanced: ' Match Day' };
  return sendMessage(from, ` Vibe set to *${vibeNames[mode]}*!\n\nAll future alerts will come in this style.`);
}

//  /help 
async function handleHelp(from) {
  return sendMessage(from,
    ` *Huginn Companion Bot* - World Cup 2026\n\n` +
    `*Commands:*\n` +
    `*/follow <team>* - Get live alerts for a match\n` +
    `*/unfollow <team>* - Stop following a match\n` +
    `*/vibe <mode>* - Change commentary style\n` +
    `*/schedule* - See upcoming fixtures\n` +
    `*/status* - See what you're following\n\n` +
    `*What I send automatically:*\n` +
    ` Pre-match bulletin (30 mins before)\n` +
    ` Goal alerts with odds context\n` +
    ` Red card alerts\n` +
    ` Half-time report\n` +
    ` Full-time wrap-up\n` +
    ` Big odds shift alerts\n\n` +
    `Powered by TxLINE + Groq AI `
  );
}

//  /status 
async function handleStatus(from) {
  const group = getGroup(from);
  if (!group || group.followedMatchIds.size === 0) {
    return sendMessage(from, ` You're not following any matches yet.\n\nTry: /follow Nigeria`);
  }
  const count = group.followedMatchIds.size;
  return sendMessage(from,
    ` *Your Status*\n\n` +
    `Following: ${count} match${count > 1 ? 'es' : ''}\n` +
    `Vibe: ${group.vibe}\n\n` +
    `Type /vibe to change your commentary style.`
  );
}

//  /schedule
async function handleSchedule(from) {
  try {
    const upcoming = await getFixtureSchedule();
    if (!upcoming.length) {
      return sendMessage(from, `📅 No upcoming matches found in the current schedule.`);
    }

    let reply = `📅 *TOURNAMENT FIXTURES:*\n\n`;
    for (const m of upcoming.slice(0, 10)) {
      const date = new Date(m.kickoff_time).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      reply += `• *${m.home_team?.name} vs ${m.away_team?.name}*\n  ${date}\n\n`;
    }
    reply += `Type */follow <team>* to get live updates!`;
    return sendMessage(from, reply);
  } catch (err) {
    return sendMessage(from, `⚽ Could not load tournament fixtures right now.`);
  }
}
