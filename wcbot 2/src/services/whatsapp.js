import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
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
  // Try Secret File first (bypasses Linux ARG_MAX / "argument list too long")
  const SECRET_FILE = '/etc/secrets/wa_auth';
  let encoded = null;

  if (fs.existsSync(SECRET_FILE)) {
    try {
      encoded = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      log.info('🔑 Reading auth from Render Secret File.');
    } catch (err) {
      log.warn('⚠️  Could not read secret file:', err.message);
    }
  }

  // Fall back to env var (local dev / previous Render setup)
  if (!encoded) {
    encoded = process.env.WA_AUTH_DATA;
  }

  // Fall back to src/session_data.txt inside the project folder
  if (!encoded) {
    const localSessionPath = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'session_data.txt');
    if (fs.existsSync(localSessionPath)) {
      try {
        encoded = fs.readFileSync(localSessionPath, 'utf8').trim();
        log.info('🔑 Reading auth from src/session_data.txt inside repository.');
      } catch (err) {
        log.warn('⚠️  Could not read local session file:', err.message);
      }
    }
  }

  if (!encoded) return; // first-time setup, no data yet

  try {
    // Auto-detect: gzipped base64 starts with 'H4sI' (magic bytes 1f 8b in base64)
    // Plain JSON base64 starts with 'eyJ' ({")
    let json;
    if (encoded.startsWith('H4sI')) {
      // Compressed — decompress first
      const compressed = Buffer.from(encoded, 'base64');
      const decompressed = zlib.gunzipSync(compressed);
      json = JSON.parse(decompressed.toString('utf8'));
      log.info('🗜️  Decompressed gzipped auth data.');
    } else {
      // Plain base64 JSON (legacy)
      json = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    }

    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    let restored = 0;
    for (const [filename, content] of Object.entries(json)) {
      const dest = path.join(AUTH_DIR, filename);
      fs.writeFileSync(dest, JSON.stringify(content), 'utf8');
      restored++;
    }
    log.info(`✅ Restored ${restored} auth file(s) from session data.`);
  } catch (err) {
    log.warn('⚠️  Could not restore auth:', err.message);
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
        log.warn('WhatsApp logged out (explicit logout). Clearing auth & waiting for re-scan.');
        // Wipe stale credentials so next startup shows QR immediately
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
      } else {
        log.warn(`WhatsApp disconnected (code ${statusCode}). Reconnecting in 5s...`);
        setTimeout(connectToWhatsApp, 5000);
      }
    }

    if (connection === 'open') {
      activeQr = null;
      log.info('✅ WhatsApp Client is ready and connected!');

      // Export and log the auth data so the user can save it as WA_AUTH_DATA
      const encoded = exportAuthToEnvString();
      if (encoded) {
        log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log.info('🔐 SESSION SAVED — copy the value from GET /api/wa-auth-export');
        log.info('   and set it as the WA_AUTH_DATA environment variable in Render');
        log.info('   to survive restarts without ever scanning a QR again.');
        log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
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
        if (msg.key.fromMe) continue;
        if (msg.key.remoteJid === 'status@broadcast') continue;

        const text = (
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          ''
        ).trim();

        if (!text) continue;

        // Collect any @mentioned JIDs from the message
        const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        // Check if any of the mentioned JIDs match one of our known self-JIDs
        const botMentioned = mentionedJids.some(j => selfJids.has(j));

        const from = msg.key.remoteJid;
        log.info(`Incoming message from ${from}: ${text}`);
        await routeCommand(from, text, { mentionedJids, botJid, botMentioned });
      } catch (err) {
        log.error('Error handling message:', err.message);
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

// ── Public: export auth state as base64 (used by /api/wa-auth-export) ───────
export function getAuthExport() {
  return exportAuthToEnvString();
}

/**
 * Send a plain-text message to a JID or bare phone number.
 * Individual chats: PHONENUMBER@s.whatsapp.net
 * Groups:          GROUPID@g.us
 */
export async function sendMessage(to, text) {
  if (!sock) throw new Error('WhatsApp socket not initialised yet');
  try {
    let jid = to;
    // If no domain suffix, assume individual chat
    if (!jid.includes('@')) {
      jid = `${to}@s.whatsapp.net`;
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
 */
export async function notifyMatchGroups(groups, text) {
  return broadcast(groups.map(g => g.id), text);
}
