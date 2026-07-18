import webpush from 'web-push';
import { log } from '../utils/logger.js';
import { saveSubscription, removeSubscription, deleteSubscriptionByEndpoint } from '../utils/subscriptionStore.js';

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  // ⚠️ CRITICAL: dynamically generated VAPID keys are different on EVERY restart.
  // Any push subscription registered with the old public key will immediately fail.
  // To fix: run `node -e "const w=require('web-push'); console.log(JSON.stringify(w.generateVAPIDKeys()))"`,
  // then set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as permanent env vars on Render.
  log.warn('⚠️  VAPID keys not set in env vars — generating ephemeral keys. Push subscriptions will break on every restart! Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Render env vars.');
  const keys = webpush.generateVAPIDKeys();
  vapidKeys = keys;
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
}

webpush.setVapidDetails(
  'mailto:support@huginn-sports.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export function getVapidPublicKey() {
  return vapidKeys.publicKey;
}

export async function subscribeUser(sessionId, subscription) {
  await saveSubscription(sessionId, subscription);
  log.info(`PWA Push Subscription registered/updated for session: ${sessionId}`);
}

export async function unsubscribeUser(sessionId) {
  await removeSubscription(sessionId);
  log.info(`PWA Push Subscription removed for session: ${sessionId}`);
}

/**
 * Send push notification to specific active subscriptions
 */
export async function sendPushNotification(title, body, url = '/', targetSubscriptions = []) {
  log.info(`Broadcasting push notification to ${targetSubscriptions.length} clients: ${title}`);
  
  const payload = JSON.stringify({ title, body, url });
  const promises = [];

  for (const sub of targetSubscriptions) {
    promises.push(
      webpush.sendNotification(sub, payload)
        .catch(async (err) => {
          // If subscription has expired or is invalid, remove it immediately from Redis
          if (err.statusCode === 410 || err.statusCode === 404) {
            log.info(`Removing expired push subscription for endpoint: ${sub.endpoint}`);
            try {
              await deleteSubscriptionByEndpoint(sub.endpoint);
            } catch (dbErr) {
              log.error('Failed to remove expired subscription from database:', dbErr.message);
            }
          } else {
            log.error('Push notification delivery failed:', err.message);
          }
        })
    );
  }

  await Promise.all(promises);
}
