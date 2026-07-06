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

  registerGroup(from);

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
    return sendMessage(from, `something went wrong on my end. try again or type /help`);
  }
}

// /follow <team>
async function handleFollow(from, text) {
  const query = text.replace(/\/follow\s*/i, '').trim();
  if (!query) {
    return sendMessage(from,
      `who do you want to follow? just type the team name after /follow\n\nexample: /follow Nigeria`
    );
  }

  await sendMessage(from, `searching for ${query}...`);

  let matches;
  try {
    matches = await searchMatch(query);
  } catch (err) {
    return sendMessage(from, `couldn't search right now. try again in a sec`);
  }

  if (!matches.length) {
    return sendMessage(from,
      `no upcoming matches found for *${query}*\n\ntry a different spelling or check /schedule to see what's on`
    );
  }

  const m = matches[0];
  followMatch(from, m.id);
  initMatchState(m.id, {});

  const kickoff = new Date(m.kickoff_time).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  return sendMessage(from,
    `got it! following *${m.home_team?.name} vs ${m.away_team?.name}*\n\nkickoff: ${kickoff}\n\nyou'll get goal alerts, red cards, half-time and full-time updates automatically`
  );
}

// /unfollow <team>
async function handleUnfollow(from, text) {
  const query = text.replace(/\/unfollow\s*/i, '').trim();
  if (!query) return sendMessage(from, `which match? e.g. /unfollow Nigeria`);

  const matches = await searchMatch(query).catch(() => []);
  if (!matches.length) return sendMessage(from, `couldn't find that match. type /status to see what you're following`);

  unfollowMatch(from, matches[0].id);
  return sendMessage(from, `unfollowed *${matches[0].home_team?.name} vs ${matches[0].away_team?.name}*`);
}

// /vibe <mode>
async function handleVibe(from, text) {
  const mode = text.replace(/\/vibe\s*/i, '').trim().toLowerCase();
  const valid = Object.keys(VIBES);

  if (!valid.includes(mode)) {
    return sendMessage(from,
      `pick your style:\n\n` +
      `*/vibe hype* — full African pundit energy\n` +
      `*/vibe tactical* — calm analyst, stats and tactics\n` +
      `*/vibe funny* — banter and roasts\n` +
      `*/vibe balanced* — clean match coverage`
    );
  }

  setGroupVibe(from, mode);
  const labels = { hype: 'hype mode', tactical: 'analyst mode', funny: 'banter mode', balanced: 'balanced mode' };
  return sendMessage(from, `vibe set to *${labels[mode]}*. all future alerts will match this style`);
}

// /help
async function handleHelp(from) {
  return sendMessage(from,
    `👋 hey! i'm Huginn — your World Cup 2026 companion\n\n` +

    `here's what i do:\n\n` +

    `*/follow <team>* — get live alerts for a match\n` +
    `*/unfollow <team>* — stop following a match\n` +
    `*/live* — see what's happening right now\n` +
    `*/schedule* — see upcoming fixtures\n` +
    `*/status* — see what you're following\n` +
    `*/vibe <mode>* — change how i talk (hype / tactical / funny / balanced)\n\n` +

    `you can also just ask me anything — "who are the favourites?", "what time does Nigeria play?", "best goals of WC2022?" — i'll answer\n\n` +

    `powered by TxLINE live data ⚽`
  );
}

// /status
async function handleStatus(from) {
  const group = getGroup(from);
  if (!group || group.followedMatchIds.size === 0) {
    return sendMessage(from, `you're not following any matches yet\n\ntype /follow <team> to start getting alerts`);
  }
  const count = group.followedMatchIds.size;
  return sendMessage(from,
    `you're following *${count} match${count > 1 ? 'es' : ''}*\n\nvibe: ${group.vibe}\n\ntype /vibe to change your commentary style`
  );
}

// /live
async function handleLive(from) {
  try {
    const { getAllFixtures } = await import('../services/txline.js');
    const fixtures = await getAllFixtures();
    const live = fixtures.filter(m =>
      ['live', 'in_play', 'HT', '1H', '2H'].includes(m.status)
    );

    if (!live.length) {
      return sendMessage(from,
        `nothing live right now\n\ntype /schedule to see what's coming up, or /follow <team> to get alerts when a match starts`
      );
    }

    const lines = live.map(m =>
      `*${m.home_team?.name} ${m.home_score ?? 0} - ${m.away_score ?? 0} ${m.away_team?.name}*${m.minute ? `  ${m.minute}'` : ''}`
    ).join('\n\n');

    return sendMessage(from, `🔴 live now:\n\n${lines}\n\ntype /follow <team> to get goal alerts`);
  } catch (err) {
    return sendMessage(from, `couldn't fetch live matches right now. try again in a moment`);
  }
}

// /schedule
async function handleSchedule(from) {
  try {
    const upcoming = await getFixtureSchedule();
    if (!upcoming.length) {
      return sendMessage(from, `no upcoming fixtures found right now. check back later`);
    }

    const lines = upcoming.slice(0, 10).map(m => {
      const d = new Date(m.kickoff_time).toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      return `*${m.home_team?.name} vs ${m.away_team?.name}*\n${d}`;
    }).join('\n\n');

    return sendMessage(from, `📅 upcoming fixtures:\n\n${lines}\n\ntype /follow <team> to get live updates`);
  } catch (err) {
    return sendMessage(from, `couldn't load fixtures right now. try again shortly`);
  }
}
