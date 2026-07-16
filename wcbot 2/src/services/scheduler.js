import { getUpcomingMatches, getMatchOdds, formatOdds } from './txline.js';
import { notifyMatchGroups } from './whatsapp.js';
import { getGroupsFollowingMatch, getMatchState, updateMatchState } from '../utils/store.js';
import { persistMatchScore, getPersistedMatchScore } from '../utils/subscriptionStore.js';
import { sendPushNotification } from './pushNotify.js';
import { getSubscribersForTeams } from '../utils/subscriptionStore.js';
import { log } from '../utils/logger.js';

/**
 * Called every minute by the cron in index.js.
 *
 * Fetches NS (not-started) matches in the next 35 minutes and sends the
 * 30-minute pre-match bulletin to any groups following that match.
 *
 * matchPoller.js only receives matches from getLiveMatches(), which excludes
 * NS fixtures — so this is the ONLY place that can fire the pre-match alert.
 *
 * Redis dedup (sentPreMatch flag) ensures the bulletin is never sent twice,
 * even across server restarts.
 */
export async function schedulePreMatchBulletins() {
  // Fetch NS matches kicking off within the next 35 minutes
  // (getUpcomingMatches uses a future-only window, so we pass 35/60 hours)
  const upcoming = await getUpcomingMatches(35 / 60);

  for (const match of upcoming) {
    const matchId = String(match.id);
    const groups  = getGroupsFollowingMatch(matchId);
    if (!groups.length) continue; // nobody following this match

    const state = getMatchState(matchId);
    const persisted = await getPersistedMatchScore(matchId);
    const alreadySentPreMatch = state?.sentPreMatch || persisted?.sentPreMatch || false;
    if (alreadySentPreMatch) continue; // already sent — never fire twice

    const kickoffTime = match.kickoff_time ? new Date(match.kickoff_time).getTime() : null;
    if (!kickoffTime) continue;

    const minsUntilKickoff = (kickoffTime - Date.now()) / 60000;
    // Only fire in the 28–35 minute window (generous band to survive the 1-min cron gap)
    if (minsUntilKickoff > 35 || minsUntilKickoff <= 0) continue;

    const homeTeam = match.home_team?.name || 'Home';
    const awayTeam = match.away_team?.name || 'Away';

    log.event(`Pre-match: ${homeTeam} vs ${awayTeam} (${Math.round(minsUntilKickoff)} mins away)`);

    let oddsStr = '';
    try {
      const odds = await getMatchOdds(matchId);
      oddsStr = formatOdds(odds);
    } catch { /* odds unavailable — send without */ }

    const oddsPreview = oddsStr ? `\n\n📊 Opening odds: ${oddsStr}` : '';
    const msg = `🔔 *30-minute warning!*\n\n*${homeTeam} vs ${awayTeam}* kicks off soon.\n\nGet ready for live goal alerts, red cards, and match commentary — all coming directly to this chat.${oddsPreview}`;

    await notifyMatchGroups(groups, msg);

    // Push notification to web subscribers
    let pushSubs = [];
    try {
      const subs = await getSubscribersForTeams([homeTeam, awayTeam]);
      pushSubs = subs.map(s => s.subscription);
    } catch { /* ignore */ }

    if (pushSubs.length) {
      log.info(`Scheduler sending pre-match push to ${pushSubs.length} subscribers.`);
      await sendPushNotification(
        '30 mins to kick-off! 🔔',
        `${homeTeam} vs ${awayTeam} starts soon.`,
        '/',
        pushSubs
      );
    }

    // Mark sent in memory + Redis so it never fires again
    updateMatchState(matchId, { sentPreMatch: true });
    await persistMatchScore(matchId, {
      homeScore:    match.home_score ?? 0,
      awayScore:    match.away_score ?? 0,
      homeRedCards: 0,
      awayRedCards: 0,
      status:       match.status || 'NS',
      sentPreMatch: true,
      sentKO:       false,
      sentHT:       false,
      sentFT:       false,
    });

    log.info(`Pre-match bulletin sent: ${homeTeam} vs ${awayTeam}`);
  }
}
