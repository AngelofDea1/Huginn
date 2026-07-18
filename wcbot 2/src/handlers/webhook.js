import { searchMatch, getFixtureSchedule, getMatchDetail, getLiveMatches, getUpcomingMatches } from '../services/txline.js';
import { sendMessage } from '../services/whatsapp.js';
import {
  registerGroup, getGroup, setGroupStyle,
  followMatch, unfollowMatch, initMatchState, seedMatchEvents
} from '../utils/store.js';
import {
  hasBeenWelcomed, markWelcomed
} from '../utils/subscriptionStore.js';
import { log } from '../utils/logger.js';
import { STYLES, generatePlayerStats } from '../services/ai.js';

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
export async function routeCommand(from, text, meta = {}) {
  const { mentionedJids = [], botJid = null, botMentioned = false } = meta;

  // Note: The group-chat guard (slash-commands + @mention only) lives in whatsapp.js
  // so that the single source of truth is the message listener. Do not duplicate it here.

  // If Huginn was @mentioned, strip the @mention prefix from the text so
  // command routing still works (e.g. "@2349026755711 /follow Nigeria" → "/follow Nigeria")
  let cleanText = text;
  if (botMentioned && botJid) {
    const botNumber = botJid.replace(/@.*/, '');
    // Remove @PHONENUMBER from anywhere in the string, then trim
    cleanText = text.replace(new RegExp(`@${botNumber}\\s*`, 'g'), '').trim();
    // If nothing remains after stripping the mention, send help
    if (!cleanText) cleanText = '/help';
  }

  const lower = cleanText.toLowerCase().trim();
  const alreadyWelcomed = await hasBeenWelcomed(from);

  registerGroup(from);

  // On first ever message from this contact, send the welcome automatically
  if (!alreadyWelcomed) {
    await markWelcomed(from);
    await sendWelcome(from);
    // If they also typed a command, still handle it after welcome
    if (lower === 'hi' || lower === 'hello' || lower === '/start' || lower === '/help') return;
  }

  if (lower.startsWith('/follow'))                              return handleFollow(from, cleanText);
  if (lower.startsWith('/unfollow'))                            return handleUnfollow(from, cleanText);
  if (lower.startsWith('/style') || lower.startsWith('/vibe'))          return handleStyle(from, cleanText);
  if (lower === '/help' || lower === '/start' || lower === 'hi' || lower === 'hello') return handleHelp(from);
  if (lower === '/status')                                      return handleStatus(from);
  if (lower === '/schedule' || lower === '/fixtures' || lower === '/upcoming') return handleSchedule(from);
  if (lower === '/live')                                        return handleLive(from);
  if (lower.startsWith('/stats'))                               return handleStats(from, cleanText);
  if (lower.startsWith('/sweepstake')) {
    const { handleSweepstakeCommand } = await import('./sweepstake.js');
    return handleSweepstakeCommand(from, cleanText);
  }

  // Catch-all: AI Football Oracle (only in direct/private chats; group chats are blocked above)
  try {
    const { answerFootballQuestion } = await import('../services/ai.js');
    const { getLiveMatches, getUpcomingMatches } = await import('../services/txline.js');
    const group = getGroup(from);
    const style = group?.style || 'hype';

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

    const reply = await answerFootballQuestion(cleanText, ctx, style, from);
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
    `/style <mode> · hype, tactical, funny, balanced\n\n` +
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
    `/style <mode> · hype, tactical, funny, balanced\n\n` +
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
  const group = getGroup(from);

  // Check if they are already following this match JID
  if (group && group.followedMatchIds.has(String(m.id))) {
    const isLive = m.status === 'LIVE' || m.status === 'HT';
    const scoreText = isLive ? `\n📊 Score: *${m.home_team?.name} ${m.home_score ?? 0}–${m.away_score ?? 0} ${m.away_team?.name}*` : '';
    
    let timeText = '';
    if (isLive) {
      timeText = m.status === 'HT' ? ` (HT)` : ` (${m.minute ? m.minute : '1'}' minute)`;
    } else {
      const formattedKickoff = new Date(m.kickoff_time).toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      timeText = ` (Kickoff: ${formattedKickoff})`;
    }

    return sendMessage(from, `🛡️ You are already following *${m.home_team?.name} vs ${m.away_team?.name}*!${scoreText}${timeText}\n\nLive alerts will begin automatically when the match is underway.`);
  }

  followMatch(from, m.id);

  // Init match state (store guards against overwriting existing state)
  initMatchState(m.id, {
    homeScore: m.home_score ?? 0,
    awayScore: m.away_score ?? 0,
    status:    m.status,
  });

  // If the match is already live, seed all existing events so we don't
  // replay every goal that happened before the user followed
  const isLive = m.status === 'LIVE' || m.status === 'HT';
  if (isLive) {
    try {
      const detail = await getMatchDetail(String(m.id));
      if (detail?.events?.length) {
        seedMatchEvents(String(m.id), detail.events);
        log.info(`[follow] Seeded ${detail.events.length} existing events for match ${m.id}`);
      }
    } catch (e) {
      log.warn(`[follow] Could not seed events for match ${m.id}:`, e.message);
    }
  }

  const kickoffDate = new Date(m.kickoff_time);
  const kickoff = kickoffDate.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  const liveNote = isLive
    ? `\n\nThe match is already underway — you'll get alerts from this point on.`
    : `\n\nGoal alerts, red cards, and half/full-time summaries will come through automatically.`;

  return sendMessage(from,
    `Following *${m.home_team?.name} vs ${m.away_team?.name}*\n\n` +
    `Kick-off: ${kickoff}` +
    liveNote
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

// /style <mode>
async function handleStyle(from, text) {
  const mode = text.replace(/\/(style|vibe)\s*/i, '').trim().toLowerCase();
  const valid = Object.keys(STYLES);

  if (!valid.includes(mode)) {
    return sendMessage(from,
      `Pick a commentary style:\n\n` +
      `*/style hype* · full pundit energy\n` +
      `*/style tactical* · calm analyst, stats and formations\n` +
      `*/style funny* · banter and dry wit\n` +
      `*/style balanced* · clean factual coverage`
    );
  }

  setGroupStyle(from, mode);
  const labels = { hype: 'Hype', tactical: 'Tactical', funny: 'Banter', balanced: 'Balanced' };
  return sendMessage(from, `Commentary style set to *${labels[mode]}*.\n\nAll future alerts will use this style.`);
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
    `Current style: *${group.style || 'hype'}*\n\n` +
    `Type /style to change your commentary style.`
  );
}

// /live
async function handleLive(from) {
  try {
    const live = await getLiveMatches();

    if (!live.length) {
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
  const vibe = group?.style || 'hype';

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
