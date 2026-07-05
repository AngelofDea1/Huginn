import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeWhatsApp, activeQr } from './services/whatsapp.js';
import { pollMatches } from './services/matchPoller.js';
import { schedulePreMatchBulletins } from './services/scheduler.js';
import { log, logBuffer } from './utils/logger.js';
import { handleChatMessage, getLiveMatchesAPI } from './handlers/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app = express();
app.use(express.json());

// ─── Serve frontend ───────────────────────────────────────────────────────────
// Serve the public/ folder at the root URL so opening http://localhost:3000
// shows the web interface
app.use(express.static(join(__dirname, '..', 'public')));

// ─── Web Chat API ─────────────────────────────────────────────────────────────
app.post('/api/chat', handleChatMessage);
app.get('/api/live', getLiveMatchesAPI);

// ─── WhatsApp QR Scan Page ─────────────────────────────────────────────────────
// Exposes the active QR code as a clean visual image. Visit /qr on your browser.
app.get('/qr', (_, res) => {
  if (!activeQr) {
    return res.send(`
      <html>
        <head>
          <title>Huginn WhatsApp Status</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { background: #080810; color: #f0f0f8; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: #131320; border: 1px solid rgba(255,255,255,0.07); padding: 32px; border-radius: 16px; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { color: #00e676; margin-top: 0; font-size: 1.5rem; }
            p { color: #7070a0; font-size: 0.95rem; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Ready & Connected</h1>
            <p>Huginn is connected to WhatsApp and active. No QR code scan is requested right now.</p>
          </div>
        </body>
      </html>
    `);
  }

  const encodedQr = encodeURIComponent(activeQr);
  const qrUrl = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodedQr}&choe=UTF-8`;

  res.send(`
    <html>
      <head>
        <title>Scan Huginn QR Code</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { background: #080810; color: #f0f0f8; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
          .card { background: #131320; border: 1px solid rgba(255,255,255,0.07); padding: 32px; border-radius: 16px; max-width: 400px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          h1 { margin-top: 0; font-size: 1.5rem; }
          .qr-container { background: white; padding: 16px; border-radius: 12px; margin: 20px 0; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          p { color: #7070a0; font-size: 0.88rem; line-height: 1.5; margin-bottom: 0; }
          .accent { color: #00e676; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Link WhatsApp Account</h1>
          <p>Scan this QR code with the <span class="accent">Linked Devices</span> scanner inside your WhatsApp mobile app to connect the bot.</p>
          <div class="qr-container">
            <img src="${qrUrl}" alt="WhatsApp Web QR Code" width="300" height="300" style="display: block;" />
          </div>
          <p>This code will refresh automatically in the logs if it expires.</p>
        </div>
      </body>
    </html>
  `);
});

// ─── WhatsApp join redirect ────────────────────────────────────────────────────
// The bot number never appears in any frontend file. Buttons on the site hit
// this endpoint; the server resolves the number from the environment and issues
// a 302 to wa.me. Even if someone inspects the page source they see /api/join.
app.get('/api/join', (_, res) => {
  const number = (process.env.WA_NUMBER || '2349026755711').replace(/\D/g, '');
  if (!number) return res.status(503).send('WhatsApp number not configured.');
  const text = encodeURIComponent('Hi! I want to add Huginn to my WhatsApp group for World Cup 2026 alerts 🏆');
  res.redirect(302, `https://wa.me/${number}?text=${text}`);
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── Debug logs endpoint ──────────────────────────────────────────────────────
app.get('/api/logs', (_, res) => {
  res.type('text/plain').send(logBuffer.join('\n'));
});

// ─── Cron: Poll TxLINE every 30 seconds ───────────────────────────────────────
// Detects goals, red cards, HT, FT, big odds shifts
cron.schedule('*/30 * * * * *', async () => {
  try {
    await pollMatches();
  } catch (err) {
    log.error('Poll error:', err.message);
  }
});

// ─── Cron: Check for pre-match bulletins every minute ─────────────────────────
// Sends a pre-match briefing 30 mins before each followed match
cron.schedule('* * * * *', async () => {
  try {
    await schedulePreMatchBulletins();
  } catch (err) {
    log.error('Scheduler error:', err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log.info(`⚽ WC Companion Bot running on port ${PORT}`);
  log.info(`🌐 Web interface: http://localhost:${PORT}`);
  log.info(`🔄 Polling TxLINE every 30 seconds`);
  initializeWhatsApp();
});
