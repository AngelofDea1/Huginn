import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { log } from '../utils/logger.js';
import { routeCommand } from '../handlers/webhook.js';
import fs from 'fs';
import path from 'path';

// ── Chrome executable ───────────────────────────────────────────────────────
// Render (Docker/Linux): google-chrome-stable is at /usr/bin/google-chrome-stable
// Local macOS: fall back to the Applications path
const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : '/usr/bin/google-chrome-stable');

// ── WhatsApp client ─────────────────────────────────────────────────────────
export const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--js-flags="--max-old-space-size=256"'
    ]
  }
});

export let activeQr = null;

// Generate and display QR code in terminal
client.on('qr', (qr) => {
  activeQr = qr;
  log.info('--- SCAN THIS QR CODE WITH WHATSAPP ON YOUR PHONE ---');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  activeQr = null;
  log.info('WhatsApp Client is ready and connected!');
});

// Listen for incoming messages and route them to our command router
client.on('message', async (msg) => {
  try {
    const text = msg.body?.trim();
    if (!text) return;
    log.info(`Incoming message from ${msg.from}: ${text}`);
    await routeCommand(msg.from, text);
  } catch (err) {
    log.error('Error handling message:', err.message);
  }
});

// ── Initialize client ───────────────────────────────────────────────────────
export function initializeWhatsApp() {
  // Delete any stale Chrome SingletonLock that blocks startup after a crash
  // or when the same profile is reused across machines / redeploys
  try {
    const lockPath = path.join(process.cwd(), '.wwebjs_auth', 'session', 'SingletonLock');
    if (fs.existsSync(lockPath)) {
      fs.rmSync(lockPath);
      log.info('Removed stale Chrome SingletonLock');
    }
  } catch (e) {
    // Non-fatal — log and continue
    log.warn('Could not remove SingletonLock:', e.message);
  }

  log.info('Initializing WhatsApp Web client...');
  client.initialize().catch(err => {
    log.error('Failed to initialize WhatsApp Client:', err.message);
  });
}

/**
 * Send a plain text message to a WhatsApp JID or phone number
 * @param {string} to - WhatsApp ID (e.g. "2348012345678" or JID like "2348012345678@c.us" / group JID)
 * @param {string} text
 */
export async function sendMessage(to, text) {
  try {
    let JID = to;
    if (!JID.includes('@')) {
      JID = `${to}@c.us`;
    }
    await client.sendMessage(JID, text);
    log.info(` Sent to ${JID}: ${text.slice(0, 60)}...`);
  } catch (err) {
    log.error(` Failed to send to ${to}:`, err.message);
    throw err;
  }
}

/**
 * Broadcast a message to multiple recipients
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
 * Send to all groups following a specific match
 */
export async function notifyMatchGroups(groups, text) {
  return broadcast(groups.map(g => g.id), text);
}
