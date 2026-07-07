import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ── Personality system prompts ────────────────────────────────────────────────
// Formatting rules all vibes must follow:
// - Proper sentence case: capitalize the first word of every sentence and proper nouns
// - Always capitalize "I"
// - NO all-caps shouting
// - Separate each sentence or thought with a blank line (double \n) so WhatsApp shows clear spacing
// - 2–4 sentences max. Conversational, not robotic.

// Shared formatting rules — injected into every vibe prompt
const FORMAT_RULES = `
FORMATTING (non-negotiable):
- Separate EVERY sentence with a blank line (two newlines). No exceptions.
- Use proper sentence case. Capitalize the first word of every sentence and proper nouns.
- Always capitalize "I".
- Never use ALL CAPS.
- 2 to 4 sentences maximum.
- Do not use bullet points, numbered lists, or headers.
- Write plain text only. No markdown.
- Never use em dashes (the — character). Use a comma, a full stop, or a new line instead.`;

export const VIBES = {
  hype: `You are Huginn, a football fan with full African pundit energy.
Write like someone texting in a group chat: excited, expressive, real.
Use Nigerian/African slang naturally (e.g. "E don happen!", "Kai!", "Abeg") but don't overdo it.
${FORMAT_RULES}`,

  tactical: `You are Huginn in analyst mode, calm, intelligent, tactical.
Reference formations, pressing, xG, and market shifts when relevant.
Write like a well-informed friend explaining the match, not a press conference.
${FORMAT_RULES}`,

  funny: `You are Huginn in banter mode, a football fan who finds comedy in everything.
Roast teams, make jokes, keep it light. Nigerian internet humour. Dry wit.
${FORMAT_RULES}`,

  balanced: `You are Huginn, a friendly, clear match companion.
Give key facts plus a bit of warmth. Accessible to casual fans and hardcore supporters.
${FORMAT_RULES}`,
};

// ── Goal alert ────────────────────────────────────────────────────────────────
export async function generateGoalAlert({ scorer, team, minute, homeTeam, awayTeam, homeScore, awayScore, odds, vibe = 'hype' }) {
  const prompt = `
match: ${homeTeam} vs ${awayTeam}
goal: scored by ${scorer || 'unknown'} for ${team} in minute ${minute}
score now: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}
current odds: ${odds || 'not available'}

react to this goal for a WhatsApp group chat. be immediate and real. no all-caps. use line breaks between thoughts.
`.trim();

  return callGroq(prompt, vibe);
}

// ── Red card alert ────────────────────────────────────────────────────────────
export async function generateRedCardAlert({ player, team, minute, homeTeam, awayTeam, homeScore, awayScore, odds, vibe = 'hype' }) {
  const prompt = `
match: ${homeTeam} vs ${awayTeam}
red card: ${player || 'a player'} from ${team} in minute ${minute}
score: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}
odds after: ${odds || 'not available'}

react to this red card for a WhatsApp group chat. explain what it changes. no all-caps. use line breaks between thoughts.
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

// ── General football Q&A ──────────────────────────────────────────────────────
export async function answerFootballQuestion(question, matchContext = '', vibe = 'hype') {
  const prompt = `
user: "${question}"

${matchContext ? `current match context:\n${matchContext}\n` : ''}
answer directly and conversationally. if it's about a current match, use that context.
no all-caps. use line breaks between thoughts if needed. 2-4 sentences max unless the question genuinely needs more.
`.trim();

  const systemPrompt = (VIBES[vibe] || VIBES.hype) +
    `\n\nyou also have deep football knowledge: past world cups, current stars, stats, tactics, rules, and betting odds. answer any question directly. sound like a person, not a system.`;

  try {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.75,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    const raw = data.choices?.[0]?.message?.content?.trim() || `Let me think about that one.\n\nTry again.`;
    return ensureSpacing(raw);
  } catch (err) {
    console.error('Groq Oracle Error:', err.response?.data || err.message);
    return `Something went wrong.\n\nTry asking again.`;
  }
}

// ── Core Groq call ────────────────────────────────────────────────────────────
async function callGroq(userPrompt, vibe = 'hype') {
  const systemPrompt = VIBES[vibe] || VIBES.hype;

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
