import { getUpcomingMatches, getMatchOdds, formatOdds } from './txline.js';
import { generatePreMatchBulletin } from './ai.js';
import { notifyMatchGroups } from './whatsapp.js';
import { getGroupsFollowingMatch, getMatchState, updateMatchState } from '../utils/store.js';
import { log } from '../utils/logger.js';

/**
 * Called every minute.
 * Sends a pre-match bulletin 30 minutes before each followed match.
 */
export async function schedulePreMatchBulletins() {
  const upcoming = await getUpcomingMatches(1); // next 1 hour
  const now = Date.now();

  for (const match of upcoming) {
    const kickoff = new Date(match.kickoff_time).getTime();
    const minutesUntil = (kickoff - now) / 60000;

    // Send bulletin when 28-32 minutes remain (catches our 1-minute polling window)
    if (minutesUntil < 28 || minutesUntil > 32) continue;

    const groups = getGroupsFollowingMatch(match.id);
    if (!groups.length) continue;

    const state = getMatchState(match.id);
    if (state?.sentPreMatch) continue; // already sent

    log.event(`Pre-match bulletin: ${match.home_team?.name} vs ${match.away_team?.name}`);

    try {
      const odds = await getMatchOdds(match.id);
      const msg = await generatePreMatchBulletin({
        homeTeam: match.home_team?.name || 'Home',
        awayTeam: match.away_team?.name || 'Away',
        kickoffTime: new Date(match.kickoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        odds: formatOdds(odds),
        stage: match.stage || 'World Cup 2026',
        vibe: groups[0]?.vibe || 'hype',
      });

      await notifyMatchGroups(groups, msg);
      updateMatchState(match.id, { sentPreMatch: true });
    } catch (err) {
      log.error(`Pre-match bulletin failed for ${match.id}:`, err.message);
    }
  }
}
