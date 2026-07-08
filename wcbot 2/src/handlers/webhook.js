import { searchMatch, getFixtureSchedule } from '../services/txline.js';
import { sendMessage } from '../services/whatsapp.js';
import {
  registerGroup, getGroup, setGroupVibe,
  followMatch, unfollowMatch, initMatchState, isFirstContact, markContacted
} from '../utils/store.js';
import { log } from '../utils/logger.js';
import { VIBES, generatePlayerStats } from '../services/ai.js';

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
  if (lower.startsWith('/stats'))                              return handleStats(from, text);
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
    `*Huginn* · World Cup 2026, straight into your WhatsApp.\n\n` +
    `Every goal, red card, and odds movement across all 104 fixtures, broken down in real time.\n\n` +
    `/follow <team> · live alerts for any match\n` +
    `/live · matches happening right now\n` +
    `/schedule · upcoming fixtures\n` +
    `/vibe <mode> · hype, tactical, funny, balanced\n\n` +
    `Want the whole group in on it?\n` +
    `Open any WhatsApp group, tap the group name, *Add participants*, search for me, done. Everyone gets the alerts from that point.\n\n` +
    `Or just ask me anything about the tournament.`
  );
}

// /help — shown when explicitly requested (not first contact)
async function handleHelp(from) {
  return sendMessage(from,
    `/follow <team> · live alerts for any match\n` +
    `/unfollow <team> · stop alerts\n` +
    `/live · matches in progress now\n` +
    `/schedule · upcoming fixtures\n` +
    `/stats <player> · career stats, style, injury history\n` +
    `/status · what you're currently tracking\n` +
    `/vibe <mode> · hype, tactical, funny, balanced\n\n` +
    `You can also ask me anything directly.`
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

  const kickoffDate = new Date(m.kickoff_time);
  const kickoff = kickoffDate.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  return sendMessage(from,
    `Following *${m.home_team?.name} vs ${m.away_team?.name}*\n\n` +
    `Kick-off: ${kickoff}\n\n` +
    `Goal alerts, red cards, and half/full-time summaries will come through automatically.`
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
      `*/vibe hype* · full African pundit energy\n` +
      `*/vibe tactical* · calm analyst, stats and formations\n` +
      `*/vibe funny* · banter and dry wit\n` +
      `*/vibe balanced* · clean factual coverage`
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
    const { getLiveMatches, getUpcomingMatches } = await import('../services/txline.js');
    const live = await getLiveMatches();

    if (!live.length) {
      // Show upcoming as fallback
      const upcoming = await getUpcomingMatches(6);
      if (upcoming.length) {
        const lines = upcoming.slice(0, 5).map(m => {
          const kick = new Date(m.kickoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          return `*${m.home_team?.name} vs ${m.away_team?.name}*  ${kick}`;
        }).join('\n\n');
        return sendMessage(from, `No matches live at the moment.\n\n📅 *Upcoming:*\n\n${lines}\n\nType /follow <team> to get alerts when a match kicks off.`);
      }
      return sendMessage(from,
        `Nothing live right now.\n\nType /schedule to see upcoming fixtures, or /follow <team> to get alerts when a match kicks off.`
      );
    }

    const lines = live.map(m => {
      const homeScore = m.home_score ?? 0;
      const awayScore = m.away_score ?? 0;
      const min = m.minute ? `  ${m.minute}'` : '';
      const ht  = m.status === 'HT' ? '  *(HT)*' : '';
      return `🔴 *${m.home_team?.name} ${homeScore}–${awayScore} ${m.away_team?.name}*${min}${ht}`;
    }).join('\n\n');

    return sendMessage(from, `🔴 *Live now*\n\n${lines}\n\nType /follow <team> to receive goal alerts.`);
  } catch (err) {
    log.error('handleLive error:', err.message);
    return sendMessage(from, `Couldn't fetch live matches right now.\n\nTry again in a moment.`);
  }
}

// /stats <player>
async function handleStats(from, text) {
  const player = text.replace(/\/stats\s*/i, '').trim();
  if (!player) {
    return sendMessage(from,
      `Who do you want stats on?\n\nExample: /stats Vinicius Jr\n\nI can give you career background, playing style, and injury history for any World Cup player.`
    );
  }

  const group = getGroup(from);
  const vibe = group?.vibe || 'hype';

  try {
    const reply = await generatePlayerStats(player, vibe);
    return sendMessage(from, reply);
  } catch (err) {
    log.error('handleStats error:', err.message);
    return sendMessage(from, `Couldn't pull stats for ${player} right now.\n\nTry again in a moment.`);
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
