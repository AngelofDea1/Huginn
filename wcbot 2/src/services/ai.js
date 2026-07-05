import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

//  Personality system prompts 

const VIBES = {
  hype: `You are HYPE FC - an absolutely electric, over-the-top African football commentator.
You shout in caps when things get crazy. You use Nigerian/African slang naturally (e.g. "e don happen!", "kai!", "chai!", "abeg", "omo").
You love drama, you love goals, you celebrate every big moment like it's the World Cup final.
Keep messages SHORT - 2-4 sentences max. Use emojis freely. Never be boring.`,

  tactical: `You are The Analyst - a calm, intelligent football pundit who explains what's happening tactically.
You reference formations, pressing, transitions, xG, and market movement.
You're like a cross between Pep Guardiola and a quantitative trader.
Keep messages SHORT - 2-4 sentences. Use numbers and stats when available. Stay composed even when it's chaotic.`,

  funny: `You are Banter FC - a football fan who's seen it all and treats every match like comedy gold.
You roast teams, make jokes, create memes in text form, and never take anything too seriously.
Nigerian humour, internet culture, and football knowledge mixed together.
Keep messages SHORT - 2-4 sentences. Roast whoever deserves it. Use emojis but don't overdo it.`,

  balanced: `You are Match Day - a friendly, informative football companion.
You give the key facts plus a bit of colour. Accessible to casual fans and hardcore supporters alike.
Not too hype, not too dry. Just great match coverage in a group chat.
Keep messages SHORT - 2-4 sentences. Clear, warm, engaging.`,
};

/**
 * Generate a goal alert message
 */
export async function generateGoalAlert({ scorer, team, minute, homeTeam, awayTeam, homeScore, awayScore, odds, vibe = 'hype' }) {
  const prompt = `
Match: ${homeTeam} vs ${awayTeam}
Event: GOAL scored by ${scorer || 'unknown'} for ${team} in minute ${minute}
Score now: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}
Current odds: ${odds || 'not available'}

React to this goal for a WhatsApp group chat. Be immediate, reactive, punchy.
`.trim();

  return callGroq(prompt, vibe);
}

/**
 * Generate a red card alert
 */
export async function generateRedCardAlert({ player, team, minute, homeTeam, awayTeam, homeScore, awayScore, odds, vibe = 'hype' }) {
  const prompt = `
Match: ${homeTeam} vs ${awayTeam}
Event: RED CARD for ${player || 'a player'} from ${team} in minute ${minute}
Score: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}
Odds after red card: ${odds || 'not available'}

React to this red card for a WhatsApp group chat. What does it mean for the match?
`.trim();

  return callGroq(prompt, vibe);
}

/**
 * Generate a half-time report
 */
export async function generateHalfTimeReport({ homeTeam, awayTeam, homeScore, awayScore, events, odds, vibe = 'hype' }) {
  const eventSummary = events?.slice(-5).map(e => `${e.minute}' ${e.type}: ${e.description}`).join('\n') || 'No major events logged';

  const prompt = `
Match: ${homeTeam} vs ${awayTeam}
Half-time score: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}
Key events first half:
${eventSummary}
Current odds: ${odds || 'not available'}

Write a half-time WhatsApp summary. Cover what happened, what to expect in the second half.
`.trim();

  return callGroq(prompt, vibe);
}

/**
 * Generate a full-time report
 */
export async function generateFullTimeReport({ homeTeam, awayTeam, homeScore, awayScore, events, vibe = 'hype' }) {
  const prompt = `
Match: ${homeTeam} vs ${awayTeam}
FULL TIME: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}

Write a full-time WhatsApp wrap-up. Who was the hero? What was the story of the match? What's next for these teams?
`.trim();

  return callGroq(prompt, vibe);
}

/**
 * Generate a pre-match bulletin (sent 30 mins before kickoff)
 */
export async function generatePreMatchBulletin({ homeTeam, awayTeam, kickoffTime, odds, stage, vibe = 'hype' }) {
  const prompt = `
Upcoming match: ${homeTeam} vs ${awayTeam}
Stage: ${stage || 'World Cup 2026'}
Kickoff: ${kickoffTime}
Opening odds: ${odds || 'not available'}

Write a pre-match WhatsApp hype message. Build excitement, give the key storyline, and tell people what to watch for.
`.trim();

  return callGroq(prompt, vibe);
}

/**
 * Generate an odds shift alert
 */
export async function generateOddsShiftAlert({ homeTeam, awayTeam, field, from, to, magnitude, direction, minute, vibe = 'hype' }) {
  const teamMap = { home_win: homeTeam, away_win: awayTeam, draw: 'a draw' };
  const outcome = teamMap[field] || field;

  const prompt = `
Match: ${homeTeam} vs ${awayTeam}
SIGNIFICANT ODDS SHIFT at minute ${minute || '?'}:
${outcome} odds moved from ${from} to ${to} (${magnitude}% shift, ${direction})

This suggests the market believes something has changed. React to this odds movement in the context of a live match.
Keep it punchy - what might this signal?
`.trim();

  return callGroq(prompt, vibe);
}

/**
 * Answer general football or tactical questions
 */
export async function answerFootballQuestion(question, matchContext = '', vibe = 'hype') {
  const prompt = `
User Question: "${question}"

Current Live/Upcoming Matches Context:
${matchContext || 'No live matches currently tracked.'}

Answer the user's question with full football authority, integrating the current match context if relevant.
Keep it punchy, engaging, and in character.
`.trim();

  const systemPrompt = (VIBES[vibe] || VIBES.hype) + 
    `\nAdditionally, you are a deep football expert. You know all about past World Cups, current stars, stats, tactics, rules, and consensus betting odds. Answer any query directly, keeping it short and conversational (2-4 sentences).`;

  try {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 350,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    return data.choices?.[0]?.message?.content?.trim() || '⚽ Deep football oracle is loading new tactics...';
  } catch (err) {
    console.error('Groq Oracle Error:', err.response?.data || err.message);
    return '⚽ Sorry, I hit a tactical foul. Try asking again!';
  }
}

/**
 * Core Groq API call using Axios (no extra SDK dependencies needed)
 */
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
        max_tokens: 200,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    return data.choices?.[0]?.message?.content?.trim() || ' Something just happened!';
  } catch (err) {
    console.error('Groq API Error:', err.response?.data || err.message);
    return ' Something just happened!';
  }
}

export { VIBES };
