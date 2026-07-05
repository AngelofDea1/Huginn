import webpush from 'web-push';
import { log } from '../utils/logger.js';

// Dynamically generate VAPID keys for simplicity in single-instance deployments,
// or reuse the same ones if we set them in env (helps keep subscriptions valid across restarts).
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  log.info('Generating dynamic VAPID keys...');
  const keys = webpush.generateVAPIDKeys();
  vapidKeys = keys;
  // Fallback to these keys
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
}

webpush.setVapidDetails(
  'mailto:support@huginn-sports.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// In-memory subscriptions store
const subscriptions = new Set();

export function getVapidPublicKey() {
  return vapidKeys.publicKey;
}

export function subscribeUser(subscription) {
  const subStr = JSON.stringify(subscription);
  // Deduplicate
  for (const s of subscriptions) {
    if (JSON.stringify(s) === subStr) return;
  }
  subscriptions.add(subscription);
  log.info(`New PWA Push Subscription registered. Total: ${subscriptions.size}`);
}

export function unsubscribeUser(subscription) {
  const subStr = JSON.stringify(subscription);
  for (const s of subscriptions) {
    if (JSON.stringify(s) === subStr) {
      subscriptions.delete(s);
      log.info(`PWA Push Subscription removed. Total: ${subscriptions.size}`);
      break;
    }
  }
}

/**
 * Send push notification to all subscribed clients
 */
export async function sendPushNotification(title, body, url = '/') {
  log.info(`Broadcasting push notification to ${subscriptions.size} clients: ${title}`);
  
  const payload = JSON.stringify({ title, body, url });
  const promises = [];

  for (const sub of subscriptions) {
    promises.push(
      webpush.sendNotification(sub, payload)
        .catch(err => {
          // If subscription has expired or is invalid, remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            log.info('Removing expired push subscription');
            subscriptions.delete(sub);
          } else {
            log.error('Push notification delivery failed:', err.message);
          }
        })
    );
  }

  await Promise.all(promises);
}
