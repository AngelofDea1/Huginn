import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ── Per-session conversation history (in-memory, max 6 turns per session) ────
// Key: sessionId (JID), Value: Array of {role, content} message objects
const conversationHistory = new Map();
const MAX_HISTORY_TURNS = 6; // 6 pairs = 12 messages max

function getHistory(sessionId) {
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, []);
  }
  return conversationHistory.get(sessionId);
}

function addToHistory(sessionId, role, content) {
  const history = getHistory(sessionId);
  history.push({ role, content });
  // Prune to last MAX_HISTORY_TURNS pairs (user + assistant each = 1 pair)
  const maxMessages = MAX_HISTORY_TURNS * 2;
  if (history.length > maxMessages) {
    history.splice(0, history.length - maxMessages);
  }
}

// ── Personality system prompts ────────────────────────────────────────────────
// Formatting rules all vibes must follow:
// - Proper sentence case: capitalize the first word of every sentence and proper nouns
// - Always capitalize "I"
// - NO all-caps shouting
// - Separate each sentence or thought with a blank line (double \n) so WhatsApp shows clear spacing
// - 2–4 sentences max. Conversational, not robotic.

// Shared formatting rules — injected into every vibe prompt
const FORMAT_RULES = `
FORMATTING & LANGUAGE (non-negotiable):
- Write in clean, grammatically correct English. Never use Pidgin English, broken English, patois, or local dialects.
- Separate EVERY sentence with a blank line (two newlines). No exceptions.
- Use proper sentence case. Capitalize the first word of every sentence and proper nouns.
- Always capitalize "I".
- Never use ALL CAPS.
- 2 to 4 sentences maximum.
- Do not use bullet points, numbered lists, or headers.
- Write plain text only. No markdown.
- Never use em dashes (the — character). Use a comma, a full stop, or a new line instead.

ANALYTICAL TAKES:
- When sharing predictions, tactical analysis, or opinions, sound smart and logical.
- Personify your voice. Talk as Huginn (e.g. use "My take is," "I think," "Looking at this," "My view here is") so it sounds like a real human pundit sharing their personal analysis. Never say "As an AI..." or "My AI model...".`;

export const STYLES = {
  hype: `You are Huginn, an energetic and enthusiastic football pundit.
Write like a friend who gets excited about every game, but keep your English standard and correct.
Use punchy expressions of excitement (e.g. "What a match!", "Incredible goal!") without using Pidgin slang or broken English.
${FORMAT_RULES}`,

  tactical: `You are Huginn in analyst mode, calm, intelligent, and highly strategic.
Reference formations, pressing, xG, and market shifts when relevant.
Explain the tactical match dynamics clearly and intelligently.
${FORMAT_RULES}`,

  funny: `You are Huginn in banter mode, a football enthusiast who loves a bit of lighthearted humor.
Make clever jokes and keep things dry and witty, but remain fully readable in clean standard English.
${FORMAT_RULES}`,

  balanced: `You are Huginn, a friendly, clear, and objective match companion.
Give key facts plus a bit of warmth. Accessible to casual fans and hardcore supporters alike.
${FORMAT_RULES}`,
};

// ── Goal alert ────────────────────────────────────────────────────────────────
export async function generateGoalAlert({ scorer, team, minute, homeTeam, awayTeam, homeScore, awayScore, odds, vibe = 'hype' }) {
  const scoringTeam = team === 'home' ? homeTeam : awayTeam;
  const scorerLine = (scorer && scorer !== scoringTeam)
    ? `scorer: ${scorer} (${scoringTeam})`
    : `goal for: ${scoringTeam}`;

  const timeLabel = minute ? `minute ${minute}` : 'unknown minute';
  const startFormat = minute ? `e.g. "GOAL! ${minute}' — Spain take the lead"` : `e.g. "GOAL! — Spain take the lead"`;

  const prompt = `
match: ${homeTeam} vs ${awayTeam}
goal in ${timeLabel}
${scorerLine}
score now: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}
current odds: ${odds || 'not available'}

React to this goal for a WhatsApp group. Start with the score and minute if known (${startFormat}). Do not invent or make up a minute if none is specified. Be immediate, real, pundit-style. No all-caps sentences. Use short line breaks between thoughts. 3-4 sentences max.
`.trim();

  return callGroq(prompt, vibe);
}

// ── Red card alert ────────────────────────────────────────────────────────────
export async function generateRedCardAlert({ player, team, minute, homeTeam, awayTeam, homeScore, awayScore, odds, vibe = 'hype' }) {
  const timeLabel = minute ? `minute ${minute}` : 'unknown minute';
  const startFormat = minute ? `e.g. "RED CARD! ${minute}' — France down to 10 men"` : `e.g. "RED CARD! — France down to 10 men"`;

  const prompt = `
match: ${homeTeam} vs ${awayTeam}
red card: ${player || 'a player'} from ${team} in ${timeLabel}
score: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}
odds after: ${odds || 'not available'}

react to this red card for a WhatsApp group chat. Start with the card and minute if known (${startFormat}). Do not invent or make up a minute if none is specified. Explain what it changes. No all-caps. Use line breaks between thoughts.
`.trim();

  return callGroq(prompt, vibe);
}

// ── Half-time report ──────────────────────────────────────────────────────────
export async function generateHalfTimeReport({ homeTeam, awayTeam, homeScore, awayScore, events, odds, vibe = 'hype' }) {
  const eventSummary = events?.slice(-5).map(e => `${e.minute}' ${e.type}: ${e.description}`).join('\n') || 'no major events logged';

  const prompt = `
match: ${homeTeam} vs ${awayTeam}
half-time score: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}
first half events:
${eventSummary}
current odds: ${odds || 'not available'}

write a half-time WhatsApp summary. what happened, what to watch second half.
no all-caps. use short paragraphs separated by line breaks. keep it human.
`.trim();

  return callGroq(prompt, vibe);
}

// ── Full-time report ──────────────────────────────────────────────────────────
export async function generateFullTimeReport({ homeTeam, awayTeam, homeScore, awayScore, events, vibe = 'hype' }) {
  const prompt = `
match: ${homeTeam} vs ${awayTeam}
full time: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}

write a full-time WhatsApp wrap-up. who was the hero? what was the story?
no all-caps. use short paragraphs separated by line breaks. keep it real.
`.trim();

  return callGroq(prompt, vibe);
}

// ── Pre-match bulletin ────────────────────────────────────────────────────────
export async function generatePreMatchBulletin({ homeTeam, awayTeam, kickoffTime, odds, stage, vibe = 'hype' }) {
  const prompt = `
upcoming match: ${homeTeam} vs ${awayTeam}
stage: ${stage || 'World Cup 2026'}
kickoff: ${kickoffTime}
opening odds: ${odds || 'not available'}

write a pre-match hype message for a WhatsApp group. build excitement, give the key storyline.
no all-caps. use short paragraphs separated by line breaks. sound like a real fan, not a news bulletin.
`.trim();

  return callGroq(prompt, vibe);
}

// ── Odds shift alert ──────────────────────────────────────────────────────────
export async function generateOddsShiftAlert({ homeTeam, awayTeam, field, from, to, magnitude, direction, minute, vibe = 'hype' }) {
  const teamMap = { home_win: homeTeam, away_win: awayTeam, draw: 'a draw' };
  const outcome = teamMap[field] || field;

  const prompt = `
match: ${homeTeam} vs ${awayTeam}
odds shift at minute ${minute || '?'}: ${outcome} moved from ${from} to ${to} (${magnitude}% shift, ${direction})

react to this odds movement. what might the market be seeing? keep it punchy.
no all-caps. short paragraphs with line breaks.
`.trim();

  return callGroq(prompt, vibe);
}

// ── Player stats & profile ────────────────────────────────────────────────────
export async function generatePlayerStats(playerName, vibe = 'hype') {
  const prompt = `
Give a pundit-style player profile for: ${playerName}

Cover these points naturally in your answer (do not use headers or bullet lists — write in flowing sentences with blank lines between thoughts):
1. Position and club
2. Key career stats — ONLY use numbers you are highly confident are accurate from your training data. If you are not certain of an exact figure, say "around" or "roughly" instead of inventing it. Never fabricate a stat.
3. Playing style and strengths
4. Known injury history (only mention if you are certain of notable ones — do not invent)
5. What to expect from them at World Cup 2026

IMPORTANT: Do NOT invent statistics, goal tallies, cap counts, or trophies you are not confident about. It is better to say "one of the most prolific strikers of his generation" than to state a made-up number with false precision.
Be honest that your stats are from training data and may not include goals scored in the current tournament.
Keep it to 5–8 sentences max. Sound like a pundit, not a Wikipedia article.
`.trim();

  const systemPrompt = (STYLES[vibe] || STYLES.hype) +
    `\n\nYou are a knowledgeable football pundit with deep knowledge of players' careers, stats, styles, and history up to early 2024. For current tournament stats you acknowledge you are working from pre-tournament knowledge.`;

  try {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    const raw = data.choices?.[0]?.message?.content?.trim() || `I don't have enough on ${playerName} right now. Try asking me about them directly.`;
    return ensureSpacing(raw);
  } catch (err) {
    console.error('Groq Player Stats Error:', err.response?.data || err.message);
    return `Couldn't pull stats right now.\n\nTry again in a moment.`;
  }
}

// ── General football Q&A ──────────────────────────────────────────────────────
export async function answerFootballQuestion(question, matchContext = '', vibe = 'hype', sessionId = null) {
  const systemPrompt = (STYLES[vibe] || STYLES.hype) +
    `\n\nYou also have deep football knowledge: past world cups, current stars, stats, tactics, rules, and betting odds. Answer any question directly. Sound like a person, not a system.` +
    `\n\nCRITICAL — ACCURACY RULES (non-negotiable):` +
    `\n- For any LIVE match question (score, goalscorer, cards, time), ONLY use information from the [current match context] block provided. Do NOT guess or invent any live score, scorer name, or match minute.` +
    `\n- If the live context block is empty or doesn't answer the question, say clearly: "I don't have live data on that right now — check the score directly."` +
    `\n- For historical stats (caps, career goals, trophies), only state numbers you are highly confident about. If unsure of an exact figure, say "roughly" or "around" — never invent a precise number.` +
    `\n- Never confidently state a result, scorer, or event that you are not certain happened.` +
    `\n- Never repeat yourself. If you already gave an opinion on a topic in this conversation, add new detail, a different angle, or a follow-up thought.`;

  // Build messages array with conversation history for context
  const history = sessionId ? getHistory(sessionId) : [];

  // Build the current user message with match context inline
  const userMessage = matchContext
    ? `${question}\n\n[current match context: ${matchContext}]`
    : question;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  try {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 300,
        temperature: 0.8,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    const raw = data.choices?.[0]?.message?.content?.trim() || `Let me think about that one.\n\nTry again.`;
    const reply = ensureSpacing(raw);

    // Save this exchange to conversation history for future context
    if (sessionId) {
      addToHistory(sessionId, 'user', userMessage);
      addToHistory(sessionId, 'assistant', reply);
    }

    return reply;
  } catch (err) {
    console.error('Groq Oracle Error:', err.response?.data || err.message);
    return `Something went wrong.\n\nTry asking again.`;
  }
}

// ── Core Groq call ────────────────────────────────────────────────────────────
async function callGroq(userPrompt, style = 'hype') {
  const systemPrompt = STYLES[style] || STYLES.hype;

  try {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 250,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    const raw = data.choices?.[0]?.message?.content?.trim() || `Something just happened.`;
    return ensureSpacing(raw);
  } catch (err) {
    console.error('Groq API Error:', err.response?.data || err.message);
    return `Something went wrong. Try again.`;
  }
}

/**
 * Post-process AI output to guarantee paragraph spacing.
 * If the model returns a wall of text, split sentences with double newlines.
 */
function ensureSpacing(text) {
  // If the text already has paragraph breaks, leave it alone
  if (text.includes('\n\n')) return text;

  // Split on sentence-ending punctuation followed by a space and an uppercase letter
  return text.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n\n');
}
