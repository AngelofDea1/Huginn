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

  sock.ev.on('contacts.set', ({ contacts }) => {
    let mapped = 0;
    for (const c of contacts) {
      if (c.lid && c.id) {
        lidToJid.set(c.lid, c.id);
        mapped++;
      }
    }
    if (mapped > 0) log.info(`📇 Mapped ${mapped} LID(s) to real JIDs via contacts.set (total: ${lidToJid.size})`);
  });

  sock.ev.on('messaging-history.set', ({ contacts }) => {
    if (!contacts) return;
    let mapped = 0;
    for (const c of contacts) {
      if (c.lid && c.id) {
        lidToJid.set(c.lid, c.id);
        mapped++;
      }
    }
    if (mapped > 0) log.info(`📇 Mapped ${mapped} LID(s) to real JIDs via messaging-history.set (total: ${lidToJid.size})`);
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
        let replyJid = msg.key.remoteJid;
        const isGroup  = replyJid.endsWith('@g.us');

        log.info(`📨 raw from remoteJid=${msg.key.remoteJid}`);

        // If the message is from an @lid (multi-device linked identifier),
        // we MUST resolve it to the real @s.whatsapp.net phone number.
        // Sending directly to @lid fails because WhatsApp doesn't route outbound DMs to LIDs.
        if (replyJid.endsWith('@lid')) {
          // In Baileys, msg.key.senderPn contains the real phone JID of the sender (e.g. 234XXXXXXXXX@s.whatsapp.net)
          const senderPn = msg.key.senderPn;
          if (senderPn && senderPn.endsWith('@s.whatsapp.net')) {
            log.info(`📨 Resolved incoming @lid via senderPn: ${replyJid} -> ${senderPn}`);
            lidToJid.set(replyJid, senderPn);
            replyJid = senderPn;
          } else {
            // In Baileys multi-device messages, msg.key.participant contains the real JID of the sender
            const participantJid = msg.key.participant;
            if (participantJid && participantJid.endsWith('@s.whatsapp.net')) {
              log.info(`📨 Resolved incoming @lid via message participant: ${replyJid} -> ${participantJid}`);
              lidToJid.set(replyJid, participantJid);
              replyJid = participantJid;
            } else {
              const cached = lidToJid.get(replyJid);
              if (cached) {
                log.info(`📨 Resolved incoming @lid JID from cache: ${replyJid} -> ${cached}`);
                replyJid = cached;
              } else {
                try {
                  const resolved = await sock.onWhatsApp(replyJid);
                  if (resolved?.[0]?.jid) {
                    log.info(`📨 Resolved incoming @lid JID via API: ${replyJid} -> ${resolved[0].jid}`);
                    lidToJid.set(replyJid, resolved[0].jid);
                    replyJid = resolved[0].jid;
                  } else {
                    // Last ditch fallback: strip @lid and append @s.whatsapp.net
                    const num = replyJid.replace('@lid', '');
                    if (/^\d+$/.test(num)) {
                      replyJid = `${num}@s.whatsapp.net`;
                      log.warn(`📨 Fallback conversion for incoming @lid: ${replyJid}`);
                    }
                  }
                } catch (err) {
                  log.warn(`📨 Failed to resolve incoming @lid JID: ${err.message}`);
                }
              }
            }
          }
        }

        // Cache the raw Baileys message for quoted-reply routing if needed.
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

        if (isGroup) {
          if (!text.startsWith('/') && !botMentioned) continue;
        }

        const senderJid = isGroup ? (msg.key.participant || msg.key.remoteJid) : replyJid;

        await routeCommand(replyJid, text, {
          mentionedJids,
          botJid:       botJidNorm,
          botMentioned,
          senderJid,
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
 * @param {string} to        - Resolved @s.whatsapp.net or @g.us JID.
 * @param {string} text      - Message body.
 * @param {boolean} broadcast - When true, sends without quoting the user's last message.
 *                              Use broadcast=true for all automated push alerts (goals,
 *                              cards, HT/FT reports) so they don't quote a random user.
 *                              Leave false (default) for direct command replies so the
 *                              reply is visually threaded to the user's command.
 */
export async function sendMessage(to, text, broadcast = false, audioPath = null) {
  if (!sock) throw new Error('Socket not ready');
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

  log.info(`✉ Sending to jid: ${jid} (broadcast=${broadcast})`);

  const recentMsg = lastMsgPerJid.get(jid);
  
  // Use the resolved JID directly (e.g. phone number or group ID)
  // instead of falling back to the raw LID from the recent message.
  // Sending directly to the phone number bypasses LID routing issues.
  const targetJid = jid;
  
  // Only quote the triggering message for direct user replies, not push alerts.
  let originalMsg = broadcast ? null : recentMsg;

  // If we are sending to a 1:1 phone number JID but the original message used an LID,
  // we do not quote it to avoid WhatsApp client linkage errors or message drops.
  if (originalMsg && jid.endsWith('@s.whatsapp.net') && originalMsg.key.remoteJid?.endsWith('@lid')) {
    originalMsg = null;
  }

  if (originalMsg) {
    if (audioPath && fs.existsSync(audioPath)) {
      await sock.sendMessage(targetJid, { audio: { url: audioPath }, mimetype: 'audio/mp4', ptt: true }, { quoted: originalMsg });
    }
    await sock.sendMessage(targetJid, { text }, { quoted: originalMsg });
  } else {
    if (audioPath && fs.existsSync(audioPath)) {
      await sock.sendMessage(targetJid, { audio: { url: audioPath }, mimetype: 'audio/mp4', ptt: true });
    }
    await sock.sendMessage(targetJid, { text });
  }
  log.info(`✉ → ${targetJid}: ${text.slice(0, 80).replace(/\n/g, ' ')}… (audio: ${!!audioPath})`);
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

export async function broadcast(recipients, text, audioPath = null) {
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

  // broadcast=true: automated alerts must never quote a previous group member's message.
  const results = await Promise.allSettled(valid.map(id => sendMessage(id, text, true, audioPath)));
  const failed  = results.filter(r => r.status === 'rejected').length;
  if (failed) log.warn(`broadcast: ${failed}/${valid.length} failed`);
  return [...webResults, ...results];
}

export async function notifyMatchGroups(groups, text, audioPath = null) {
  return broadcast(groups.map(g => g.id), text, audioPath);
}

