import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { dirname } from 'path';

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';

import { log } from '../utils/logger.js';
import { routeCommand } from '../handlers/webhook.js';

// ── Constants ────────────────────────────────────────────────────────────────
const AUTH_DIR = '.baileys_auth';

// ── State ────────────────────────────────────────────────────────────────────
export let activeQr = null;   // set while waiting for scan, null when connected
let sock = null;              // active Baileys socket

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: On every startup, restore auth files from either:
//   a) Render Secret File at /etc/secrets/wa_auth  (preferred — avoids ARG_MAX)
//   b) WA_AUTH_DATA environment variable           (fallback)
// ─────────────────────────────────────────────────────────────────────────────
function restoreAuthFromEnv() {
  let source = null;
  let compressedBase64 = null;

  // 1. Try Render Secret File first (if mounted)
  const secretPath = '/etc/secrets/wa_auth';
  if (fs.existsSync(secretPath)) {
    try {
      compressedBase64 = fs.readFileSync(secretPath, 'utf8').trim();
      source = 'secret file (/etc/secrets/wa_auth)';
    } catch (err) {
      log.warn('Could not read Render secret file:', err.message);
    }
  }

  // 2. Fall back to repository session_data.txt
  if (!compressedBase64) {
    try {
      const localSessionPath = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'session_data.txt');
      if (fs.existsSync(localSessionPath)) {
        compressedBase64 = fs.readFileSync(localSessionPath, 'utf8').trim();
        if (compressedBase64) {
          source = 'src/session_data.txt inside repository';
        }
      }
    } catch (err) {
      log.warn('Could not read local session_data.txt:', err.message);
    }
  }

  // 3. Fall back to environment variable
  if (!compressedBase64 && process.env.WA_AUTH_DATA) {
    compressedBase64 = process.env.WA_AUTH_DATA.trim();
    source = 'environment variable WA_AUTH_DATA';
  }

  if (!compressedBase64) {
    log.info('ℹ️ No existing session data found. Starting fresh (needs QR scan).');
    return;
  }

  log.info(`🔑 Reading auth from ${source}...`);

  try {
    const compressed = Buffer.from(compressedBase64, 'base64');
    const json = zlib.gunzipSync(compressed).toString('utf8');
    log.info('🗜️  Decompressed gzipped auth data.');
    
    const data = JSON.parse(json);

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    let restoredCount = 0;
    for (const [file, content] of Object.entries(data)) {
      const fullPath = path.join(AUTH_DIR, file);
      const raw = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
      fs.writeFileSync(fullPath, raw, 'utf8');
      restoredCount++;
    }
    log.info(`✅ Restored ${restoredCount} auth file(s) from session data.`);
  } catch (err) {
    log.error('❌ Failed to restore auth files from env/secret:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: After a successful connection, encode auth files to base64 and log
// the string so the user can set it as WA_AUTH_DATA in Render
// ─────────────────────────────────────────────────────────────────────────────
function exportAuthToEnvString() {
  try {
    if (!fs.existsSync(AUTH_DIR)) return null;
    const files = fs.readdirSync(AUTH_DIR);
    const data = {};
    for (const file of files) {
      const fullPath = path.join(AUTH_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      try { data[file] = JSON.parse(raw); } catch { data[file] = raw; }
    }
    // GZIP compress before base64 — reduces 832KB → ~160KB (under Render's 500KiB limit)
    const json = Buffer.from(JSON.stringify(data), 'utf8');
    const compressed = zlib.gzipSync(json, { level: 9 });
    const encoded = compressed.toString('base64');
    log.info(`🗜️  Auth export: ${json.length} bytes → ${compressed.length} bytes compressed (${encoded.length} base64 chars)`);
    return encoded;
  } catch (err) {
    log.error('Failed to export auth:', err.message);
    return null;
  }
}

// ── Internal: create & wire up socket ───────────────────────────────────────
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    // Keep the socket alive — send a keepalive ping every 25s
    keepAliveIntervalMs: 25_000,
  });

  // Persist credentials to disk whenever they update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection lifecycle
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      activeQr = qr;
      log.info('--- SCAN THIS QR CODE WITH WHATSAPP ON YOUR PHONE ---');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      activeQr = null;
      const statusCode = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode
        : null;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        log.warn('WhatsApp logged out (explicit logout). Clearing auth & starting fresh connection for re-scan.');
        // Wipe stale credentials so next startup shows QR immediately
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
        // Trigger reconnect immediately to generate new QR code
        setTimeout(connectToWhatsApp, 1000);
      } else {
        // Code 440 = another device/session took over. Use a longer backoff so we
        // don't fight in a tight loop — give the other instance time to settle first.
        const backoff = statusCode === 440 ? 15000 : 5000;
        log.warn(`WhatsApp disconnected (code ${statusCode}). Reconnecting in ${backoff / 1000}s...`);
        setTimeout(connectToWhatsApp, backoff);
      }
    }

    if (connection === 'open') {
      activeQr = null;
      log.info(`✅ WhatsApp Client is ready and connected! Logged in as: ${sock.user?.id || 'unknown'}`);

      // Export and log the auth data so the user can save it as WA_AUTH_DATA
      const encoded = exportAuthToEnvString();
      if (encoded) {
        log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log.info('🔐 SESSION SAVED — copy the value from GET /api/wa-auth-export');
        log.info('   and set it as the WA_AUTH_DATA environment variable in Render');
        log.info('   to survive restarts without ever scanning a QR again.');
        log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Auto-save fresh session back to session_data.txt so the next deploy
        // starts with up-to-date credentials without needing another QR scan.
        try {
          const localSessionPath = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'session_data.txt');
          fs.writeFileSync(localSessionPath, encoded, 'utf8');
          log.info('💾 session_data.txt updated with fresh credentials.');
        } catch (writeErr) {
          log.warn('Could not auto-save session_data.txt:', writeErr.message);
        }
      }
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Only process new incoming messages — ignore history syncs on startup
    if (type !== 'notify') return;
    log.info(`📨 messages.upsert fired — ${messages.length} message(s)`);

    // Derive the bot's own JIDs (Baileys may give us @lid or @s.whatsapp.net)
    // sock.user.id is the authoritative connected JID e.g. "2349026755711:10@s.whatsapp.net"
    const rawBotJid = sock.user?.id || '';
    // Normalise: strip the device suffix (:10) so we match mentions cleanly
    const botJidNorm = rawBotJid.replace(/:[0-9]+@/, '@');  // e.g. "234...@s.whatsapp.net"
    const botNumber  = (process.env.WA_NUMBER || '').replace(/[^0-9]/g, '');
    // Build a set of all possible self-JID variants to check mentions against
    const selfJids = new Set([
      botJidNorm,
      botNumber ? `${botNumber}@s.whatsapp.net` : null,
      botNumber ? `${botNumber}@lid` : null,
    ].filter(Boolean));
    const botJid = botJidNorm || (botNumber ? `${botNumber}@s.whatsapp.net` : null);

    for (const msg of messages) {
      try {
        log.info(`🔍 RAW MSG key=${JSON.stringify(msg.key)} msgKeys=${Object.keys(msg.message||{}).join(',')}`);

        if (msg.key.fromMe) { log.info('⏭ skipped: fromMe'); continue; }
        if (msg.key.remoteJid === 'status@broadcast') { log.info('⏭ skipped: status broadcast'); continue; }

        // ── REPLY TARGET ─────────────────────────────────────────────────────
        // WhatsApp silently drops messages sent to @lid JIDs even with a fresh
        // session (confirmed by testing 2026-07-12). Use senderPn (@s.whatsapp.net)
        // for 1:1 chats when available — it's the real phone JID and delivers.
        // Groups use remoteJid (@g.us) which is always correct for group sends.
        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        const from = (!isGroup && msg.key.senderPn)
          ? msg.key.senderPn          // 1:1 chat → use real phone JID (e.g. 2347...@s.whatsapp.net)
          : msg.key.remoteJid;        // group or no senderPn → use remoteJid as-is

        // For logging only
        const displayJid = msg.key.senderPn || msg.key.remoteJid;

        // Unpack ephemeral/viewOnce message wrappers
        const messageContent = msg.message?.ephemeralMessage?.message ||
                               msg.message?.viewOnceMessage?.message ||
                               msg.message?.viewOnceMessageV2?.message ||
                               msg.message;

        if (!messageContent) {
          log.warn('⚠️ empty messageContent — skipping');
          continue;
        }

        // Extract text from all known message types
        const text = (
          messageContent.conversation ||
          messageContent.extendedTextMessage?.text ||
          messageContent.imageMessage?.caption ||
          messageContent.videoMessage?.caption ||
          messageContent.buttonsResponseMessage?.selectedDisplayText ||
          messageContent.listResponseMessage?.title ||
          messageContent.templateButtonReplyMessage?.selectedDisplayText ||
          ''
        ).trim();

        log.info(`🔍 Extracted text="${text}" contentKeys=${Object.keys(messageContent).join(',')}`);

        if (!text) { log.warn('⚠️ no text in message — skipping'); continue; }

        // Collect any @mentioned JIDs
        const mentionedJids = messageContent.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const botMentioned = mentionedJids.some(j => selfJids.has(j));

        log.info(`Incoming message from ${displayJid} (jid=${from}): ${text}`);

        // Pass from (= msg.key.remoteJid, untouched) to routeCommand.
        // Every downstream sendMessage call will use this exact value.
        await routeCommand(from, text, { mentionedJids, botJid, botMentioned });
      } catch (err) {
        log.error('Error handling message:', err.message, err.stack);
      }
    }
  });
}

// ── Public: called once at startup ──────────────────────────────────────────
export function initializeWhatsApp() {
  log.info('Initializing WhatsApp (Baileys)...');
  // Restore session from env var BEFORE connecting
  restoreAuthFromEnv();
  connectToWhatsApp().catch(err => {
    log.error('Failed to initialize WhatsApp Client:', err.message);
  });
}

// ── Public: wipe session and force a fresh QR scan ──────────────────────────
// Called by POST /api/relink when the bot is "connected" but silent.
export async function forceRelink() {
  // 1. Close existing socket gracefully
  if (sock) {
    try { sock.ws?.close(); } catch {}
    sock = null;
  }
  // 2. Wipe stored credentials
  const AUTH_DIR_PATH = path.join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.baileys_auth');
  try { fs.rmSync(AUTH_DIR_PATH, { recursive: true, force: true }); } catch {}
  // Also wipe the local session_data.txt so it doesn't restore stale creds
  const localSessionPath = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'session_data.txt');
  try { fs.writeFileSync(localSessionPath, '', 'utf8'); } catch {}
  log.warn('🗑️  Stale session wiped. Starting fresh connection — QR will appear at /qr');
  // 3. Reconnect with no credentials — Baileys will generate a new QR
  await connectToWhatsApp();
}

// ── Public: export auth state as base64 (used by /api/wa-auth-export) ───────
export function getAuthExport() {
  return exportAuthToEnvString();
}

/**
 * Send a plain-text message to a WhatsApp JID.
 *
 * IMPLEMENTATION NOTE — JID DELIVERY RULES (2026-07-12):
 *   WhatsApp accepts @lid JIDs directly on the send path.
 *   Any transformation of the incoming JID (resolving @lid → @s.whatsapp.net,
 *   sock.onWhatsApp() lookups, regex replacements, etc.) causes WhatsApp to
 *   silently drop the outbound message with no error.
 *
 *   Rule: `to` must always be msg.key.remoteJid EXACTLY as received.
 *   The only permitted transformation is appending @s.whatsapp.net to a bare
 *   phone number (digits only, no @ suffix) for proactive / non-reply sends.
 */
export async function sendMessage(to, text) {
  if (!sock) throw new Error('WhatsApp socket not initialised yet');
  try {
    let jid = to;

    // Only append a domain if `to` is a bare number with no @ at all.
    // @lid, @s.whatsapp.net, and @g.us are passed through unchanged.
    if (!jid.includes('@')) {
      jid = `${to}@s.whatsapp.net`;
    }

    // DO NOT resolve or transform remoteJid before sending — WhatsApp accepts
    // @lid format directly. Resolving to @s.whatsapp.net causes WhatsApp to
    // silently drop the message. See implementation notes, 2026-07-12.
    if (jid !== to && to.includes('@')) {
      // to already had an @ but we somehow changed it — log a warning so
      // this regression is immediately visible in logs during future refactors.
      log.warn(`⚠️ JID TRANSFORMED on send path: original="${to}" sending="${jid}" — this may cause silent delivery failure`);
    }

    await sock.sendMessage(jid, { text });
    log.info(`✉ Sent to ${jid}: ${text.slice(0, 60)}...`);
  } catch (err) {
    log.error(`✗ Failed to send to ${to}:`, err.message);
    // If the socket closed mid-send, trigger a reconnect and don't re-throw
    // (re-throwing would crash the message handler loop)
    if (err.message?.includes('Connection Closed') || err.message?.includes('closed')) {
      log.warn('Socket closed mid-send — scheduling reconnect in 3s...');
      setTimeout(connectToWhatsApp, 3000);
      return; // Don't propagate — message handler stays alive
    }
    throw err;
  }
}

/**
 * Broadcast a message to multiple recipients.
 * Each `id` in recipients must be a raw JID (msg.key.remoteJid) — untransformed.
 */
export async function broadcast(recipients, text) {
  const results = await Promise.allSettled(
    recipients.map(id => sendMessage(id, text))
  );
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) log.warn(`${failed}/${recipients.length} messages failed`);
  return results;
}

/**
 * Send to all groups following a specific match.
 * Group IDs in the store are saved as msg.key.remoteJid — untransformed.
 */
export async function notifyMatchGroups(groups, text) {
  return broadcast(groups.map(g => g.id), text);
}
