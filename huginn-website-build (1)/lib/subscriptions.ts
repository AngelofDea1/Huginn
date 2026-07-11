/**
 * In-memory push subscription store.
 * In production swap this for a DB (Firestore, Postgres, etc).
 * Subscriptions survive the process lifetime but reset on restart —
 * users will get a new browser prompt after each cold restart.
 */
import { PushSubscription } from "web-push";

const subscriptions = new Set<string>();

export function addSubscription(sub: PushSubscription) {
  subscriptions.add(JSON.stringify(sub));
}

export function removeSubscription(sub: PushSubscription) {
  subscriptions.delete(JSON.stringify(sub));
}

export function getAllSubscriptions(): PushSubscription[] {
  return Array.from(subscriptions).map((s) => JSON.parse(s));
}
