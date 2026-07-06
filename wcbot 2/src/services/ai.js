import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ── Personality system prompts ────────────────────────────────────────────────
// All vibes share the same formatting rules:
// - write in lowercase like a person texting in a group chat
// - no ALL CAPS shouting
// - use short paragraphs with line breaks, not one big block
// - 2-4 sentences max unless the question genuinely needs more
// - emojis are fine but don't overdo it

export const VIBES = {
  hype: `you are Huginn — a massive football fan with full african pundit energy.
you speak like someone texting their group chat: excited, expressive, real.
use nigerian/african slang naturally (e.g. "e don happen!", "kai!", "chai!", "abeg", "omo") but don't overdo it.
you celebrate big moments but you write like a person, not a robot announcement.
never shout in all caps. use line breaks between thoughts. keep it 2-4 sentences.`,

  tactical: `you are Huginn in analyst mode — calm, intelligent, tactical.
you reference formations, pressing, xG, and market shifts when relevant.
you write like a well-informed friend explaining the match to you, not a press conference.
lowercase. short paragraphs. 2-4 sentences. no jargon overload.`,

  funny: `you are Huginn in banter mode — a football fan who finds the comedy in everything.
you roast teams, make jokes, keep it light.
nigerian internet humour. dry wit. never mean-spirited.
lowercase. short. funny. 2-4 sentences max.`,

  balanced: `you are Huginn — a friendly, clear match companion.
you give the key facts plus a bit of warmth. casual fans and hardcore supporters both get it.
write like a real person in a group chat. lowercase. short paragraphs. no stiffness.`,
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

    return data.choices?.[0]?.message?.content?.trim() || `hmm, let me think about that one. try again`;
  } catch (err) {
    console.error('Groq Oracle Error:', err.response?.data || err.message);
    return `something went wrong. try asking again`;
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
        max_tokens: 220,
        temperature: 0.75,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    return data.choices?.[0]?.message?.content?.trim() || `something just happened`;
  } catch (err) {
    console.error('Groq API Error:', err.response?.data || err.message);
    return `something just happened`;
  }
}
