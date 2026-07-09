import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { log } from '../utils/logger.js';
import { routeCommand } from '../handlers/webhook.js';

// ── Constants ────────────────────────────────────────────────────────────────
const AUTH_DIR = '.baileys_auth';

// ── State ────────────────────────────────────────────────────────────────────
export let activeQr = null;   // set while waiting for scan, null when connected
let sock = null;              // active Baileys socket

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: On every startup, restore auth files from the WA_AUTH_DATA env var
// (set this var in Render after your first scan using the /api/wa-auth-export endpoint)
// ─────────────────────────────────────────────────────────────────────────────
function restoreAuthFromEnv() {
  const encoded = process.env.WA_AUTH_DATA;
  if (!encoded) return; // first-time setup, no data yet

  try {
    const files = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

    let restored = 0;
    for (const [filename, content] of Object.entries(files)) {
      const dest = path.join(AUTH_DIR, filename);
      fs.writeFileSync(dest, JSON.stringify(content), 'utf8');
      restored++;
    }
    log.info(`✅ Restored ${restored} auth file(s) from WA_AUTH_DATA env var.`);
  } catch (err) {
    log.warn('⚠️  Could not restore auth from WA_AUTH_DATA:', err.message);
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
    return Buffer.from(JSON.stringify(data)).toString('base64');
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
    // Derive the bot's own JID once (used for @mention detection in groups)
    const botNumber = (process.env.WA_NUMBER || '').replace(/[^0-9]/g, '');
    const botJid = botNumber ? `${botNumber}@s.whatsapp.net` : null;

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

        const from = msg.key.remoteJid;
        log.info(`Incoming message from ${from}: ${text}`);
        await routeCommand(from, text, { mentionedJids, botJid });
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
    if (!jid.includes('@')) {
      jid = `${to}@s.whatsapp.net`;
    }
    await sock.sendMessage(jid, { text });
    log.info(`✉ Sent to ${jid}: ${text.slice(0, 60)}...`);
  } catch (err) {
    log.error(`✗ Failed to send to ${to}:`, err.message);
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
