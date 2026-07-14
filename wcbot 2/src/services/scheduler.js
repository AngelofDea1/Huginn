import { log } from '../utils/logger.js';

/**
 * Called every minute by the cron in index.js.
 *
 * Pre-match bulletins are now handled entirely by matchPoller.js (every 5s),
 * which persists the sentPreMatch flag to Redis so the bulletin is NEVER sent
 * twice — not even after a Render restart.
 *
 * This file is kept as a safe no-op so index.js can import it without changes.
 */
export async function schedulePreMatchBulletins() {
  // No-op: matchPoller.js owns pre-match bulletin dispatch with Redis dedup.
}
