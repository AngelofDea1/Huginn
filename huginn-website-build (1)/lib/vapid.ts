/**
 * Lazy VAPID key generation.
 * Keys are generated once per server process and re-used across all requests.
 * In production set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars so keys
 * survive server restarts (otherwise subscribers need to re-subscribe).
 */
import webpush from "web-push";

let initialised = false;

export function ensureVapid() {
  if (initialised) return;

  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const mail = process.env.VAPID_EMAIL || "mailto:admin@huginn.app";

  if (pub && priv) {
    webpush.setVapidDetails(mail, pub, priv);
  } else {
    // Auto-generate (only useful in dev — keys won't survive restarts)
    const keys = webpush.generateVAPIDKeys();
    webpush.setVapidDetails(mail, keys.publicKey, keys.privateKey);
    // Expose so the admin can copy them into env vars
    process.env.VAPID_PUBLIC_KEY  = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    console.warn(
      "[Huginn] No VAPID keys set — generated temporary ones. " +
      "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars to persist subscriptions across restarts.\n" +
      "  PUBLIC:  " + keys.publicKey + "\n" +
      "  PRIVATE: " + keys.privateKey
    );
  }
  initialised = true;
}

export function getPublicKey() {
  ensureVapid();
  return process.env.VAPID_PUBLIC_KEY!;
}
