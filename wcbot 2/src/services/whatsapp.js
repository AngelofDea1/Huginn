/**
 * whatsapp.js — Huginn WhatsApp layer (Baileys).
 *
 * Kept deliberately simple. One socket, one reconnect loop, one send function.
 */
import fs   from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { dirname }       from 'path';
import { Boom }          from '@hapi/boom';
import pino              from 'pino';
import qrcode            from 'qrcode-terminal';

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';

import { log }          from '../utils/logger.js';
import { routeCommand } from '../handlers/webhook.js';
import { addWebChatMessage } from '../utils/store.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const __dirname   = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR    = '.baileys_auth';
const SESSION_TXT = path.join(__dirname, '..', 'session_data.txt');

// ── Shared state ──────────────────────────────────────────────────────────────
export let activeQr = null;
let sock = null;

// Maps @lid JIDs → real @s.whatsapp.net JIDs (from contacts.upsert).
const lidToJid = new Map();

// Caches the last received Baileys message object per JID.
// Used to reply with { quoted: msg } so Baileys routes correctly
// regardless of @lid vs @s.whatsapp.net addressing.
const lastMsgPerJid = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Session helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Restore auth files from session_data.txt or WA_AUTH_DATA env var on startup. */
function restoreSession() {
  let raw = null;

  // 1. Render secret file
  if (!raw && fs.existsSync('/etc/secrets/wa_auth')) {
    try { raw = fs.readFileSync('/etc/secrets/wa_auth', 'utf8').trim(); } catch {}
  }

  // 2. session_data.txt committed in repo
  if (!raw && fs.existsSync(SESSION_TXT)) {
    try {
      const fileContent = fs.readFileSync(SESSION_TXT, 'utf8').trim();
      // Only use it if it's not empty and doesn't start with a comment #
      if (fileContent && !fileContent.startsWith('#')) {
        raw = fileContent;
      }
    } catch {}
  }

  // 3. Environment variable
  if (!raw && process.env.WA_AUTH_DATA) {
    raw = process.env.WA_AUTH_DATA.trim();
  }

  if (!raw) { log.info('No saved session — will show QR.'); return; }

  log.info(`Attempting to restore session. Data length: ${raw.length} characters.`);
  if (raw.length > 20) {
    log.info(`Data starts with: "${raw.slice(0, 15)}..." and ends with: "...${raw.slice(-15)}"`);
  } else {
    log.info(`Data value: "${raw}"`);
  }

  try {
    const json = zlib.gunzipSync(Buffer.from(raw, 'base64')).toString('utf8');
    const data = JSON.parse(json);
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    for (const [file, content] of Object.entries(data)) {
      fs.writeFileSync(
        path.join(AUTH_DIR, file),
        typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content),
        'utf8'
      );
    }
    log.info(`✅ Session restored (${Object.keys(data).length} files).`);
  } catch (err) {
    log.warn('Could not restore session:', err.message);
  }
}

/** Export auth files to a compressed base64 string (for WA_AUTH_DATA). */
export function getAuthExport() {
  try {
    if (!fs.existsSync(AUTH_DIR)) return null;
    const data = {};
    for (const file of fs.readdirSync(AUTH_DIR)) {
      const raw = fs.readFileSync(path.join(AUTH_DIR, file), 'utf8');
      try { data[file] = JSON.parse(raw); } catch { data[file] = raw; }
    }
    const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(data), 'utf8'), { level: 9 });
    return compressed.toString('base64');
  } catch (err) {
    log.error('Auth export failed:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core connection
// ─────────────────────────────────────────────────────────────────────────────

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version }          = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    logger:               pino({ level: 'silent' }),
    printQRInTerminal:    true,
    keepAliveIntervalMs:  25_000,
  });

  sock.ev.on('creds.update', saveCreds);

  // ── Contact sync: build LID → JID map ────────────────────────────────────
  // WhatsApp multi-device sends @lid identifiers for incoming messages.
  // contacts.upsert provides both the real JID (id) and the lid for each contact.
  sock.ev.on('contacts.upsert', (contacts) => {
    let mapped = 0;
    for (const c of contacts) {
      if (c.lid && c.id) {
        lidToJid.set(c.lid, c.id);
        mapped++;
      }
    }
    if (mapped > 0) log.info(`📇 Mapped ${mapped} LID(s) to real JIDs (total: ${lidToJid.size})`);
  });

  // ── Connection state ──────────────────────────────────────────────────────
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      activeQr = qr;
      log.info('--- SCAN THIS QR CODE WITH WHATSAPP ON YOUR PHONE ---');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      activeQr = null;
      const code      = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode : null;
      const loggedOut = code === DisconnectReason.loggedOut;

      if (loggedOut) {
        log.warn('Logged out — wiping auth and reconnecting for fresh QR.');
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
        setTimeout(connect, 1_000);
      } else {
        const backoff = code === 440 ? 15_000 : 5_000;
        log.warn(`Disconnected (code ${code}) — reconnecting in ${backoff / 1000}s`);
        setTimeout(connect, backoff);
      }
    }

    if (connection === 'open') {
      activeQr = null;
      log.info(`✅ WhatsApp connected — ${sock.user?.id ?? 'unknown'}`);

      // Save fresh session to session_data.txt for next deploy
      const encoded = getAuthExport();
      if (encoded) {
        try {
          fs.writeFileSync(SESSION_TXT, encoded, 'utf8');
          log.info('💾 session_data.txt updated.');
        } catch {}
        log.info('🔐 Copy /api/wa-auth-export value → WA_AUTH_DATA env var in Render.');
      }
    }
  });

  // ── Incoming messages ─────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (msg.key.fromMe)                              continue;
        if (msg.key.remoteJid === 'status@broadcast')   continue;

        // ── REPLY TARGET ─────────────────────────────────────────────────────
        // Always use msg.key.remoteJid exactly as received (the raw @lid or @g.us JID)
        // with zero transformations, resolutions, or substitutions.
        const replyJid = msg.key.remoteJid;
        const isGroup  = replyJid.endsWith('@g.us');

        log.info(`📨 raw from remoteJid=${msg.key.remoteJid}`);

        // Cache the raw Baileys message for quoted-reply routing (see sendMessage).
        // Baileys uses contextInfo from the quoted message to route replies correctly
        // even when the sender JID is an @lid device identifier.
        lastMsgPerJid.set(replyJid, msg);

        // ── Extract text ────────────────────────────────────────────────────
        const mc = msg.message?.ephemeralMessage?.message
                || msg.message?.viewOnceMessage?.message
                || msg.message?.viewOnceMessageV2?.message
                || msg.message;

        if (!mc) continue;

        const text = (
          mc.conversation ||
          mc.extendedTextMessage?.text ||
          mc.imageMessage?.caption ||
          mc.videoMessage?.caption ||
          mc.buttonsResponseMessage?.selectedDisplayText ||
          mc.listResponseMessage?.title ||
          mc.templateButtonReplyMessage?.selectedDisplayText ||
          ''
        ).trim();

        if (!text) continue;

        log.info(`💬 "${text}" from ${replyJid}`);

        // Bot JID for @mention detection in groups
        const botJidNorm  = (sock.user?.id || '').replace(/:[0-9]+@/, '@');
        const botNumber   = (process.env.WA_NUMBER || '').replace(/\D/g, '');
        const selfJids    = new Set([
          botJidNorm,
          botNumber ? `${botNumber}@s.whatsapp.net` : null,
          botNumber ? `${botNumber}@lid` : null,
        ].filter(Boolean));

        const mentionedJids = mc.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const botMentioned  = mentionedJids.some(j => selfJids.has(j));

        // Group guard: slash commands only — @mentions no longer trigger the bot
        if (isGroup && !text.startsWith('/')) continue;

        await routeCommand(replyJid, text, {
          mentionedJids,
          botJid:       botJidNorm,
          botMentioned,
        });
      } catch (err) {
        log.error('Message handler error:', err.message);
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function initializeWhatsApp() {
  log.info('Initializing WhatsApp…');
  restoreSession();
  connect().catch(err => log.error('WhatsApp init failed:', err.message));
}

export async function forceRelink() {
  if (sock) { try { sock.ws?.close(); } catch {} sock = null; }
  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
  try { fs.writeFileSync(SESSION_TXT, '', 'utf8'); } catch {}
  log.warn('Session wiped — fresh QR at /qr');
  await connect();
}

/**
 * Send a plain-text message to a JID.
 *
 * For @lid JIDs (multi-device linked-device IDs, not phone numbers), Baileys
 * cannot route an outbound sendMessage reliably. The fix: if we have the last
 * received message from this JID cached, we reply with { quoted: originalMsg }
 * which lets Baileys use the message's own routing context — bypassing the
 * @lid resolution problem entirely.
 *
 * Fallback chain for @lid when no cached message exists:
 *   1. Check lidToJid map (populated from contacts.upsert)
 *   2. Send to @lid as-is (works once the session is fully established)
 */
export async function sendMessage(to, text) {
  if (!sock) throw new Error('Socket not ready');
  let jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

  if (jid.endsWith('@lid')) {
    // ── Preferred: reply using the original message context ──────────────────
    const originalMsg = lastMsgPerJid.get(jid);
    if (originalMsg) {
      log.info(`✉ @lid reply via quoted-message routing → ${jid}`);
      await sock.sendMessage(jid, { text }, { quoted: originalMsg });
      log.info(`✉ → ${jid}: ${text.slice(0, 80).replace(/\n/g, ' ')}…`);
      return;
    }

    // ── Fallback: contacts.upsert map ────────────────────────────────────────
    const resolved = lidToJid.get(jid);
    if (resolved) {
      log.info(`✉ Resolved @lid → ${resolved} (contacts map)`);
      jid = resolved;
    } else {
      log.warn(`✉ @lid ${jid} — no cached msg or contacts map entry, sending as-is`);
    }
  }

  log.info(`✉ Sending to jid: ${jid}`);
  await sock.sendMessage(jid, { text });
  log.info(`✉ → ${jid}: ${text.slice(0, 80).replace(/\n/g, ' ')}…`);
}


/**
 * Filter out phantom JIDs before broadcasting.
 *
 * WhatsApp Web multi-device sessions register their own JIDs (e.g.
 * "web_aopzan5yb@s.whatsapp.net") which get persisted to Redis via
 * persistGroup() and reloaded into the groups map on startup. These are NOT
 * valid message recipients — sending to them always fails. We filter them here
 * rather than at storage time so no existing data needs migration.
 *
 * Valid JIDs:
 *   - Groups:   *@g.us
 *   - DMs:      *@lid  (phone-number linked device IDs)
 *   - DMs:      <digits>@s.whatsapp.net  (classic phone JIDs)
 *
 * Invalid (silently dropped):
 *   - web_*@s.whatsapp.net  (WhatsApp Web session IDs — never real chats)
 */
function isValidRecipientJid(jid) {
  if (!jid || typeof jid !== 'string') return false;
  if (jid.endsWith('@g.us'))  return true;  // group
  if (jid.endsWith('@lid'))   return true;  // linked device DM
  // @s.whatsapp.net — only allow if the local part is all digits (real phone number)
  if (jid.endsWith('@s.whatsapp.net')) {
    const local = jid.replace('@s.whatsapp.net', '');
    return /^\d+$/.test(local);
  }
  return false;
}

export async function broadcast(recipients, text) {
  // 1. Intercept web sessions early
  const webSessions = recipients.filter(id => id && id.startsWith('web_'));
  for (const session of webSessions) {
    try {
      addWebChatMessage(session, { from: 'huginn', text, ts: Date.now() });
      log.info(`[Web] Routed broadcast alert to session ${session}`);
    } catch (err) {
      log.error(`[Web] Failed to route broadcast to session ${session}:`, err.message);
    }
  }

  // 2. Filter out web sessions so they don't hit WhatsApp logic or isValidRecipientJid
  const nonWebRecipients = recipients.filter(id => id && !id.startsWith('web_'));

  const valid   = nonWebRecipients.filter(isValidRecipientJid);
  const skipped = nonWebRecipients.length - valid.length;
  if (skipped > 0) {
    log.warn(`broadcast: dropping ${skipped} invalid JID(s) — phantom web session IDs filtered`);
  }

  const webResults = webSessions.map(id => ({ status: 'fulfilled', value: undefined }));
  if (!valid.length) return webResults;

  const results = await Promise.allSettled(valid.map(id => sendMessage(id, text)));
  const failed  = results.filter(r => r.status === 'rejected').length;
  if (failed) log.warn(`broadcast: ${failed}/${valid.length} failed`);
  return [...webResults, ...results];
}

export async function notifyMatchGroups(groups, text) {
  return broadcast(groups.map(g => g.id), text);
}

