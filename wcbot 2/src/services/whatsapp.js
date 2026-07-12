/**
 * whatsapp.js — Huginn WhatsApp layer (Baileys).
 *
 * Kept deliberately simple. One socket, one reconnect loop, one send function.
 *
 * JID DELIVERY RULE (confirmed 2026-07-12):
 *   WhatsApp silently drops outbound messages addressed to @lid JIDs.
 *   For 1:1 replies, use msg.key.senderPn (@s.whatsapp.net) when available.
 *   For group replies, use msg.key.remoteJid (@g.us) unchanged.
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
} from '@whiskeysockets/baileys';

import { log }          from '../utils/logger.js';
import { routeCommand } from '../handlers/webhook.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const __dirname   = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR    = '.baileys_auth';
const SESSION_TXT = path.join(__dirname, '..', 'session_data.txt');

// ── Shared state ──────────────────────────────────────────────────────────────
export let activeQr = null;
let sock = null;

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
    try { raw = fs.readFileSync(SESSION_TXT, 'utf8').trim(); } catch {}
  }

  // 3. Environment variable
  if (!raw && process.env.WA_AUTH_DATA) {
    raw = process.env.WA_AUTH_DATA.trim();
  }

  if (!raw) { log.info('No saved session — will show QR.'); return; }

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
    printQRInTerminal:    false,
    keepAliveIntervalMs:  25_000,
  });

  sock.ev.on('creds.update', saveCreds);

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

        // ── Choose reply target ─────────────────────────────────────────────
        // @lid JIDs are silently dropped even with a fresh session (tested 2026-07-12).
        // Use senderPn (the real @s.whatsapp.net JID) for 1:1 chats.
        // Groups always use remoteJid (@g.us).
        const isGroup  = msg.key.remoteJid.endsWith('@g.us');
        const replyJid = isGroup
          ? msg.key.remoteJid
          : (msg.key.senderPn || msg.key.remoteJid);

        log.info(`📨 from=${replyJid} raw=${msg.key.remoteJid}`);

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

        // Group guard: only respond to / commands or @mentions
        if (isGroup && !text.startsWith('/') && !botMentioned) continue;

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
 * Send a plain-text message.
 * `to` must be a valid JID: @s.whatsapp.net, @g.us, or @lid.
 * When replying to an incoming message use replyJid (derived above), not remoteJid.
 */
export async function sendMessage(to, text) {
  if (!sock) throw new Error('Socket not ready');
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });
  log.info(`✉ → ${jid}: ${text.slice(0, 80).replace(/\n/g, ' ')}…`);
}

export async function broadcast(recipients, text) {
  const results = await Promise.allSettled(recipients.map(id => sendMessage(id, text)));
  const failed  = results.filter(r => r.status === 'rejected').length;
  if (failed) log.warn(`broadcast: ${failed}/${recipients.length} failed`);
  return results;
}

export async function notifyMatchGroups(groups, text) {
  return broadcast(groups.map(g => g.id), text);
}
