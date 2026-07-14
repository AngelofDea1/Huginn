import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeWhatsApp, activeQr, getAuthExport, forceRelink } from './services/whatsapp.js';
import { pollMatches } from './services/matchPoller.js';
import { schedulePreMatchBulletins } from './services/scheduler.js';
import { log, logBuffer } from './utils/logger.js';
import { handleChatMessage, getLiveMatchesAPI } from './handlers/chat.js';
import { getVapidPublicKey, subscribeUser, unsubscribeUser, sendPushNotification } from './services/pushNotify.js';
import { getAllActiveSubscriptions } from './utils/subscriptionStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app = express();
app.use(express.json());

// ─── Serve Next.js frontend ──────────────────────────────────────────────────
// The huginn-website (Next.js static export) lives in public/huginn/
// redirect:false prevents express.static from 301-redirecting /live-chat → /live-chat/
// which breaks client-side Next.js navigation and causes garbled content in browsers.
const frontendDir = join(__dirname, '..', 'public', 'huginn');
app.use(express.static(frontendDir, { redirect: false }));

// Explicitly serve both /page and /page/ for every Next.js route.
// This ensures direct URL visits and client-side navigations both work cleanly.
const serveNextPage = (page) => (_, res) =>
  res.sendFile(join(frontendDir, page, 'index.html'));

app.get('/features',    serveNextPage('features'));
app.get('/features/',   serveNextPage('features'));
app.get('/commands',    serveNextPage('commands'));
app.get('/commands/',   serveNextPage('commands'));
app.get('/live-chat',   serveNextPage('live-chat'));
app.get('/live-chat/',  serveNextPage('live-chat'));
app.get('/privacy',     serveNextPage('privacy'));
app.get('/privacy/',    serveNextPage('privacy'));
app.get('/terms',       serveNextPage('terms'));
app.get('/terms/',      serveNextPage('terms'));
// Root fallback
app.get('/', (_, res) => res.sendFile(join(frontendDir, 'index.html')));


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

  // Add /api/qr-data endpoint inline usage — the page polls this
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
          .status { color: #00e676; font-size: 0.85rem; margin-top: 10px; min-height: 20px; }
          #qrcode canvas, #qrcode img { display: block !important; }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      </head>
      <body>
        <div class="card">
          <h1>Link WhatsApp Account</h1>
          <p>Open WhatsApp → tap <span class="accent">Linked Devices</span> → <span class="accent">Link a Device</span> → scan below.</p>
          <div class="qr-container">
            <div id="qrcode"></div>
          </div>
          <p class="status" id="status">Waiting for scan...</p>
          <p style="margin-top:12px;font-size:0.8rem;">Keep this page open. The QR updates automatically — <strong style="color:#fff">do not close this tab during scan.</strong></p>
        </div>
        <script>
          let qrObj = null;
          let lastQrText = ${JSON.stringify(activeQr)};
          let scanning = false;

          function renderQR(text) {
            const el = document.getElementById('qrcode');
            el.innerHTML = '';
            qrObj = new QRCode(el, {
              text: text,
              width: 280,
              height: 280,
              colorDark: '#000000',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.H
            });
          }

          renderQR(lastQrText);

          // Poll every 5s — update QR in-place (no page reload = no interrupted auth)
          setInterval(async () => {
            try {
              const r = await fetch('/api/qr-status');
              const d = await r.json();

              if (!d.needsScan) {
                // QR gone = bot connected!
                document.getElementById('status').textContent = '✅ Connected! Huginn is online.';
                document.getElementById('status').style.color = '#00e676';
                setTimeout(() => window.location.reload(), 2000);
                return;
              }

              // Fetch fresh QR text and update canvas in-place
              const qrRes = await fetch('/api/qr-data');
              const qrData = await qrRes.json();
              if (qrData.qr && qrData.qr !== lastQrText) {
                lastQrText = qrData.qr;
                if (!scanning) {
                  renderQR(lastQrText);
                  document.getElementById('status').textContent = 'QR updated — scan now!';
                }
              }
            } catch(e) {}
          }, 5000);
        </script>
      </body>
    </html>
  `);
});

// ─── QR status for polling ────────────────────────────────────────────────────
app.get('/api/qr-status', (_, res) => {
  res.json({ needsScan: !!activeQr });
});

// Returns raw QR string for in-place canvas updates
app.get('/api/qr-data', (_, res) => {
  res.json({ qr: activeQr || null });
});

// ─── WhatsApp join redirect ────────────────────────────────────────────────────
// The bot number never appears in any frontend file. Buttons on the site hit
// this endpoint; the server resolves the number from the environment and issues
// a 302 to wa.me. Even if someone inspects the page source they see /api/join.
app.get('/api/join', (_, res) => {
  const number = (process.env.WA_NUMBER || '2349026755711').replace(/\D/g, '');
  if (!number) return res.status(503).send('WhatsApp number not configured.');
  const text = encodeURIComponent('Hi Huginn. Eyes on the World Cup?');
  res.redirect(302, `https://wa.me/${number}?text=${text}`);
});

// ─── PWA Push Notifications ───────────────────────────────────────────────────
app.get('/api/push/key', (_, res) => {
  res.json({ key: getVapidPublicKey() });
});

app.post('/api/push/subscribe', async (req, res) => {
  const secret = process.env.PUSH_SEND_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { sessionId, subscription } = req.body;
  if (!sessionId || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object or sessionId.' });
  }
  try {
    await subscribeUser(sessionId, subscription);
    res.status(201).json({ status: 'subscribed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push/unsubscribe', async (req, res) => {
  const secret = process.env.PUSH_SEND_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }
  try {
    await unsubscribeUser(sessionId);
    res.json({ status: 'unsubscribed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push/test', async (req, res) => {
  try {
    const subs = await getAllActiveSubscriptions();
    await sendPushNotification('Goal!', 'MatchPulse Test: GOLAZOOOO! ⚽🔥', '/', subs);
    res.json({ status: 'sent', count: subs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WhatsApp Session Export ────────────────────────────────────────────────
// Visit /api/wa-auth-export ONCE after scanning the QR code.
// Copy the "authData" value and set it as WA_AUTH_DATA in Render env vars.
// The bot will then reconnect automatically on every restart — no more QR scans.
app.get('/api/wa-auth-export', (_, res) => {
  const authData = getAuthExport();
  if (!authData) {
    return res.status(503).json({
      status: 'not_connected',
      message: 'No active session yet. Scan the QR at /qr first, then come back here.'
    });
  }
  res.json({
    status: 'ok',
    instruction: 'Copy the authData string below and set it as WA_AUTH_DATA in your Render environment variables. Done — the bot will survive every restart from now on.',
    authData
  });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── QR status (polled by the /qr page) ───────────────────────────────────────
app.get('/api/qr-status', (_, res) => {
  res.json({ needsScan: !!activeQr, qr: activeQr });
});

// ─── Force relink: wipe session and show a fresh QR ───────────────────────────
// Hit POST /api/relink to clear stale credentials and trigger a new QR scan.
// Useful when the bot is "connected" but silently not receiving messages.
app.post('/api/relink', async (req, res) => {
  try {
    log.warn('🔄 /api/relink called — wiping session and forcing fresh QR...');
    await forceRelink();
    res.json({ status: 'ok', message: 'Session wiped. Scan the new QR at /qr within 60 seconds.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Debug logs endpoint ──────────────────────────────────────────────────────
app.get('/api/logs', (_, res) => {
  res.type('text/plain').send(logBuffer.join('\n'));
});

// ─── Cron: Poll TxLINE every 5 seconds ───────────────────────────────────────
// Detects goals, red cards, HT, FT, big odds shifts
cron.schedule('*/5 * * * * *', async () => {
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
  log.info(`🔄 Polling TxLINE every 5 seconds`);
  initializeWhatsApp();
});
