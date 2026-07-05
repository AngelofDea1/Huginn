import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { log } from '../utils/logger.js';
import { routeCommand } from '../handlers/webhook.js';

// ── State ────────────────────────────────────────────────────────────────────
export let activeQr = null;   // set while waiting for scan, null when connected
let sock = null;              // active Baileys socket

// ── Internal: create & wire up socket ───────────────────────────────────────
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('.baileys_auth');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    printQRInTerminal: false,         // we handle QR ourselves
    logger: pino({ level: 'silent' }) // suppress Baileys internal logs
  });

  // Persist credentials whenever they update
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
        log.warn('WhatsApp logged out. Visit /qr to scan a new QR code.');
      } else {
        log.warn(`WhatsApp disconnected (code ${statusCode}). Reconnecting in 5s...`);
        setTimeout(connectToWhatsApp, 5000);
      }
    }

    if (connection === 'open') {
      activeQr = null;
      log.info('WhatsApp Client is ready and connected!');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      try {
        // Skip messages sent by the bot itself, or system/status messages
        if (msg.key.fromMe) continue;
        if (msg.key.remoteJid === 'status@broadcast') continue;

        const text = (
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          ''
        ).trim();

        if (!text) continue;

        const from = msg.key.remoteJid;
        log.info(`Incoming message from ${from}: ${text}`);
        await routeCommand(from, text);
      } catch (err) {
        log.error('Error handling message:', err.message);
      }
    }
  });
}

// ── Public: called once at startup ──────────────────────────────────────────
export function initializeWhatsApp() {
  log.info('Initializing WhatsApp (Baileys)...');
  connectToWhatsApp().catch(err => {
    log.error('Failed to initialize WhatsApp Client:', err.message);
  });
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
