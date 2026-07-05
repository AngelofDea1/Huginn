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
            .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#00e676; margin-right:8px; animation: pulse 1.5s ease-in-out infinite; }
            @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
          </style>
        </head>
        <body>
          <div class="card">
            <h1><span class="dot"></span>Ready &amp; Connected</h1>
            <p>Huginn is connected to WhatsApp and active.</p>
            <p style="margin-top:12px;">Checking for status changes automatically...</p>
          </div>
          <script>
            // Auto-poll every 5s — if a QR appears, reload the page to show it
            setInterval(async () => {
              try {
                const r = await fetch('/api/qr-status');
                const d = await r.json();
                if (d.needsScan) window.location.reload();
              } catch(e) {}
            }, 5000);
          </script>
        </body>
      </html>
    `);
  }

  res.send(`
    <html>
      <head>
        <title>Scan Huginn QR Code</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { background: #080810; color: #f0f0f8; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; box-sizing: border-box; }
          .card { background: #131320; border: 1px solid rgba(255,255,255,0.07); padding: 32px; border-radius: 16px; max-width: 400px; width:100%; display: flex; flex-direction: column; align-items: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          h1 { margin-top: 0; font-size: 1.5rem; }
          .qr-container { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; display: inline-block; }
          p { color: #7070a0; font-size: 0.88rem; line-height: 1.5; margin-bottom: 0; }
          .accent { color: #00e676; font-weight: bold; }
          .countdown { color: #00e676; font-size: 0.8rem; margin-top: 10px; }
          #qrcode canvas, #qrcode img { display: block !important; }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      </head>
      <body>
        <div class="card">
          <h1>Link WhatsApp Account</h1>
          <p>Open WhatsApp on your phone, tap <span class="accent">Linked Devices</span>, then <span class="accent">Link a Device</span>, and scan this code.</p>
          <div class="qr-container">
            <div id="qrcode"></div>
          </div>
          <p class="countdown" id="timer">Page refreshes in 18s to keep code fresh</p>
        </div>
        <script>
          new QRCode(document.getElementById('qrcode'), {
            text: ${JSON.stringify(activeQr)},
            width: 280,
            height: 280,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
          // Countdown and auto-refresh every 18s so the code never expires
          let secs = 18;
          const t = document.getElementById('timer');
          setInterval(() => {
            secs--;
            if (secs <= 0) { window.location.reload(); return; }
            t.textContent = 'Page refreshes in ' + secs + 's to keep code fresh';
          }, 1000);
        </script>
      </body>
    </html>
  `);
});

// ─── QR status for polling ────────────────────────────────────────────────────
app.get('/api/qr-status', (_, res) => {
  res.json({ needsScan: !!activeQr });
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
