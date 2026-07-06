import { searchMatch, getFixtureSchedule } from '../services/txline.js';
import { sendMessage } from '../services/whatsapp.js';
import {
  registerGroup, getGroup, setGroupVibe,
  followMatch, unfollowMatch, initMatchState, isFirstContact, markContacted
} from '../utils/store.js';
import { log } from '../utils/logger.js';
import { VIBES } from '../services/ai.js';

//  Webhook verification (Meta calls this once when you set up the webhook)
export function verifyWebhook(req, res) {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    log.info('Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
}

//  Incoming message handler
export async function handleWebhook(req, res) {
  res.sendStatus(200);
  try {
    const messages = req.body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return;
    for (const msg of messages) {
      if (msg.type !== 'text') continue;
      const text = msg.text?.body?.trim();
      if (!text) continue;
      log.info(`Message from ${msg.from}: ${text}`);
      await routeCommand(msg.from, text);
    }
  } catch (err) {
    log.error('Webhook handler error:', err.message);
  }
}

//  Command router
export async function routeCommand(from, text) {
  const lower = text.toLowerCase().trim();
  const isNew = isFirstContact(from);

  registerGroup(from);

  // On first ever message from this contact, send the welcome automatically
  if (isNew) {
    markContacted(from);
    await sendWelcome(from);
    // If they also typed a command, still handle it after welcome
    if (lower === 'hi' || lower === 'hello' || lower === '/start' || lower === '/help') return;
  }

  if (lower.startsWith('/follow'))                              return handleFollow(from, text);
  if (lower.startsWith('/unfollow'))                            return handleUnfollow(from, text);
  if (lower.startsWith('/vibe'))                                return handleVibe(from, text);
  if (lower === '/help' || lower === '/start' || lower === 'hi' || lower === 'hello') return handleHelp(from);
  if (lower === '/status')                                      return handleStatus(from);
  if (lower === '/schedule' || lower === '/fixtures' || lower === '/upcoming') return handleSchedule(from);
  if (lower === '/live')                                        return handleLive(from);
  if (lower.startsWith('/sweepstake')) {
    const { handleSweepstakeCommand } = await import('./sweepstake.js');
    return handleSweepstakeCommand(from, text);
  }

  // Catch-all: AI Football Oracle
  try {
    const { answerFootballQuestion } = await import('../services/ai.js');
    const { getLiveMatches, getUpcomingMatches } = await import('../services/txline.js');
    const group = getGroup(from);
    const vibe = group?.vibe || 'hype';

    const [live, upcoming] = await Promise.all([getLiveMatches(), getUpcomingMatches(12)]);
    let ctx = '';
    if (live.length) {
      ctx += 'Live now:\n' + live.map(m => `${m.home_team?.name} vs ${m.away_team?.name}`).join('\n') + '\n\n';
    }
    if (upcoming.length) {
      ctx += 'Coming up:\n' + upcoming.map(m => {
        const t = new Date(m.kickoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return `${m.home_team?.name} vs ${m.away_team?.name} at ${t}`;
      }).join('\n');
    }

    const reply = await answerFootballQuestion(text, ctx, vibe);
    return sendMessage(from, reply);
  } catch (err) {
    log.error('AI oracle error:', err.message);
    return sendMessage(from, `Something went wrong on my end.\n\nTry again or type /help.`);
  }
}

// ── Welcome message sent automatically on first contact ──────────────────────
async function sendWelcome(from) {
  return sendMessage(from,
    `*Huginn* — World Cup 2026 live intelligence, straight into WhatsApp.\n\n` +
    `I track every goal, red card, and odds movement across all 104 fixtures, and break it down in real time.\n\n` +
    `*To get started:*\n` +
    `/follow <team> — live alerts for any match\n` +
    `/live — see what's happening right now\n` +
    `/schedule — upcoming fixtures\n` +
    `/vibe <mode> — change my commentary style\n\n` +
    `Or just ask me anything — team form, kick-off times, squad info, odds context.\n\n` +
    `Powered by TxLINE live data · Llama 3.3 70B`
  );
}

// /help — shown when explicitly requested (not first contact)
async function handleHelp(from) {
  return sendMessage(from,
    `*Commands*\n\n` +
    `/follow <team> — start getting live alerts for a match\n` +
    `/unfollow <team> — stop alerts for a match\n` +
    `/live — see every match in progress right now\n` +
    `/schedule — full upcoming fixture list\n` +
    `/status — check what you're currently following\n` +
    `/vibe <mode> — switch commentary style\n\n` +
    `*Vibe modes:*\n` +
    `hype · tactical · funny · balanced\n\n` +
    `You can also ask me anything directly — I have context on all live and upcoming matches.\n\n` +
    `Powered by TxLINE · Llama 3.3 70B`
  );
}

// /follow <team>
async function handleFollow(from, text) {
  const query = text.replace(/\/follow\s*/i, '').trim();
  if (!query) {
    return sendMessage(from,
      `Which team?\n\nExample: /follow Nigeria`
    );
  }

  await sendMessage(from, `Looking up ${query}...`);

  let matches;
  try {
    matches = await searchMatch(query);
  } catch (err) {
    return sendMessage(from, `Couldn't reach the live data feed right now.\n\nTry again in a few seconds.`);
  }

  if (!matches.length) {
    return sendMessage(from,
      `No upcoming matches found for *${query}*.\n\nCheck the spelling or use /schedule to see what's on.`
    );
  }

  const m = matches[0];
  followMatch(from, m.id);
  initMatchState(m.id, {});

  const kickoff = new Date(m.kickoff_time).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  return sendMessage(from,
    `Following *${m.home_team?.name} vs ${m.away_team?.name}*.\n\n` +
    `Kickoff: ${kickoff}\n\n` +
    `You'll receive goal alerts, red cards, half-time and full-time reports automatically.`
  );
}

// /unfollow <team>
async function handleUnfollow(from, text) {
  const query = text.replace(/\/unfollow\s*/i, '').trim();
  if (!query) return sendMessage(from, `Which match?\n\nExample: /unfollow Nigeria`);

  const matches = await searchMatch(query).catch(() => []);
  if (!matches.length) return sendMessage(from, `Couldn't find that match.\n\nType /status to see what you're following.`);

  unfollowMatch(from, matches[0].id);
  return sendMessage(from, `Unfollowed *${matches[0].home_team?.name} vs ${matches[0].away_team?.name}*.`);
}

// /vibe <mode>
async function handleVibe(from, text) {
  const mode = text.replace(/\/vibe\s*/i, '').trim().toLowerCase();
  const valid = Object.keys(VIBES);

  if (!valid.includes(mode)) {
    return sendMessage(from,
      `Pick a vibe:\n\n` +
      `*/vibe hype* — full African pundit energy\n` +
      `*/vibe tactical* — calm analyst, stats and formations\n` +
      `*/vibe funny* — banter and dry wit\n` +
      `*/vibe balanced* — clean factual coverage`
    );
  }

  setGroupVibe(from, mode);
  const labels = { hype: 'Hype', tactical: 'Tactical', funny: 'Banter', balanced: 'Balanced' };
  return sendMessage(from, `Vibe set to *${labels[mode]}*.\n\nAll future alerts will use this style.`);
}

// /status
async function handleStatus(from) {
  const group = getGroup(from);
  if (!group || group.followedMatchIds.size === 0) {
    return sendMessage(from, `You're not following any matches yet.\n\nType /follow <team> to start.`);
  }
  const count = group.followedMatchIds.size;
  return sendMessage(from,
    `Following *${count} match${count > 1 ? 'es' : ''}*.\n\n` +
    `Current vibe: *${group.vibe}*\n\n` +
    `Type /vibe to change your commentary style.`
  );
}

// /live
async function handleLive(from) {
  try {
    const { getLiveMatches } = await import('../services/txline.js');
    const live = await getLiveMatches();

    if (!live.length) {
      return sendMessage(from,
        `Nothing live right now.\n\nType /schedule to see upcoming fixtures, or /follow <team> to get alerts when a match kicks off.`
      );
    }

    const lines = live.map(m =>
      `*${m.home_team?.name} ${m.home_score ?? 0}–${m.away_score ?? 0} ${m.away_team?.name}*${m.minute ? `  ${m.minute}'` : ''}${m.status === 'HT' ? '  (HT)' : ''}`
    ).join('\n\n');

    return sendMessage(from, `🔴 *Live now*\n\n${lines}\n\nType /follow <team> to receive goal alerts.`);
  } catch (err) {
    return sendMessage(from, `Couldn't fetch live matches right now.\n\nTry again in a moment.`);
  }
}

// /schedule
async function handleSchedule(from) {
  try {
    const upcoming = await getFixtureSchedule();
    if (!upcoming.length) {
      return sendMessage(from, `No upcoming fixtures found right now.\n\nCheck back later.`);
    }

    const lines = upcoming.slice(0, 10).map(m => {
      const d = new Date(m.kickoff_time).toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      return `*${m.home_team?.name} vs ${m.away_team?.name}*\n${d}`;
    }).join('\n\n');

    return sendMessage(from, `📅 *Upcoming fixtures*\n\n${lines}\n\nType /follow <team> to get live updates.`);
  } catch (err) {
    return sendMessage(from, `Couldn't load fixtures right now.\n\nTry again shortly.`);
  }
}
