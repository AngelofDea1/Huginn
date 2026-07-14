/**
 * subscriptionStore.js — Dependency Inversion abstraction layer
 *
 * All callers (matchPoller, pushNotify, chat) import from HERE, not from db.js directly.
 * To swap storage backends (Redis → Firestore, etc.), only edit this file.
 *
 * SOLID principles applied:
 *   D — callers depend on this abstraction, not on a concrete Redis implementation
 *   O — new backend = new db-xxx.js + one line change here, zero changes to callers
 *   I — each caller imports only the functions it actually uses
 */

export {
  saveSubscription,
  removeSubscription,
  deleteSubscriptionByEndpoint,
  followTeam,
  unfollowTeam,
  getSubscribersForTeams,
  getAllActiveSubscriptions,
} from './db.js';
