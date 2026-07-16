import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeWhatsApp, activeQr, getAuthExport, forceRelink } from './services/whatsapp.js';
import { pollMatches } from './services/matchPoller.js';
import { schedulePreMatchBulletins } from './services/scheduler.js';
import { log, logBuffer } from './utils/logger.js';
import { handleChatMessage, getLiveMatchesAPI } from './handlers/chat.js';
import { getVapidPublicKey, subscribeUser, unsubscribeUser, sendPushNotification } from './services/pushNotify.js';
import { getAllActiveSubscriptions } from './utils/subscriptionStore.js';
import { loadGroupsFromRedis } from './utils/store.js';

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

// ─── Replay Simulation Control Endpoint ───────────────────────────────────────
// This allows you and other users to control the simulated England vs Argentina replay
// directly on your live Render website. Exposes states: pre, kickoff, step, goal.
const __idxFilename = fileURLToPath(import.meta.url);
const __idxDirname = path.dirname(__idxFilename);

let replaySnapshots = [];
let replaySnapshotPath = null;
const replaySnapshotCandidates = [
  path.join(__idxDirname, 'match_18241006_snapshot.json'),
  path.join(__idxDirname, '..', 'match_18241006_snapshot.json'),
  path.join(process.cwd(), 'match_18241006_snapshot.json'),
  path.join(process.cwd(), 'src', 'match_18241006_snapshot.json'),
];

for (const candidate of replaySnapshotCandidates) {
  if (fs.existsSync(candidate)) {
    replaySnapshotPath = candidate;
    break;
  }
}

try {
  if (!replaySnapshotPath) {
    throw new Error('No replay snapshot file found in known locations');
  }

  const fileContent = fs.readFileSync(replaySnapshotPath, 'utf8');
  replaySnapshots = JSON.parse(fileContent).sort((a, b) => (a.Seq || 0) - (b.Seq || 0));

  log.info(`Loaded replay snapshot from ${replaySnapshotPath}`);

  // Set up the global replay hook
  global.mockReplayActive = true;
  global.mockReplayIndex = 0;
  global.getMockReplayDetails = function() {
    if (!global.mockReplayActive) return null;
    return replaySnapshots.slice(0, global.mockReplayIndex + 1);
  };
} catch (e) {
  log.warn('Could not load England vs Argentina snapshot file for web control:', e.message);
}

app.post('/api/replay/control', async (req, res) => {
  const { command } = req.body;
  if (!replaySnapshots.length) {
    return res.status(503).json({ ok: false, error: 'Replay snapshots not loaded on server' });
  }

  const { pollMatches } = await import('./services/matchPoller.js');
  const { updateMatchState } = await import('./utils/store.js');

  try {
    if (command === 'pre') {
      global.mockReplayActive = true;
      global.mockReplayIndex = 0;
      updateMatchState('18241006', {
        seeded: false,
        sentPreMatch: false,
        sentKO: false,
        homeScore: 0,
        awayScore: 0,
        status: 'pre'
      });
      return res.json({ ok: true, status: 'NS (Pre-Match)', index: 0 });
    }
    
    if (command === 'kickoff') {
      global.mockReplayActive = true;
      global.mockReplayIndex = 1;
      await pollMatches();
      return res.json({ ok: true, status: 'LIVE (Kickoff)', index: 1 });
    }

    if (command === 'step') {
      if (global.mockReplayIndex < replaySnapshots.length - 1) {
        global.mockReplayIndex++;
        await pollMatches();
        return res.json({ ok: true, status: 'stepped', index: global.mockReplayIndex });
      }
      return res.json({ ok: true, status: 'finished', index: global.mockReplayIndex });
    }

    if (command === 'goal') {
      let found = false;
      const detail = global.getMockReplayDetails();
      const currentHome = detail?.slice(-1)[0]?.Score?.Participant1?.Total?.Goals || 0;
      const currentAway = detail?.slice(-1)[0]?.Score?.Participant2?.Total?.Goals || 0;

      for (let i = global.mockReplayIndex + 1; i < replaySnapshots.length; i++) {
        const item = replaySnapshots[i];
        const itemHome = item?.Score?.Participant1?.Total?.Goals || 0;
        const itemAway = item?.Score?.Participant2?.Total?.Goals || 0;
        if (itemHome > currentHome || itemAway > currentAway) {
          global.mockReplayIndex = i;
          found = true;
          await pollMatches();
          return res.json({ ok: true, status: 'goal', index: i, score: `${itemHome}-${itemAway}` });
        }
      }
      return res.json({ ok: false, error: 'No further goal snapshots available' });
    }

    if (command === 'stop') {
      global.mockReplayActive = false;
      return res.json({ ok: true, status: 'disabled' });
    }

    res.status(400).json({ ok: false, error: 'Invalid command. Use: pre, kickoff, step, goal, stop' });
  } catch (err) {
    log.error('Replay control error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/replay/status', (req, res) => {
  res.json({
    active: global.mockReplayActive || false,
    index: global.mockReplayIndex || 0,
    total: replaySnapshots.length
  });
});

app.get('/demo', (_, res) => {
  res.type('html').send(`<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Huginn Replay Demo</title>
      <style>
        body { font-family: sans-serif; background: #07111f; color: #f5f7ff; padding: 24px; }
        button { background: #00c853; color: white; border: none; padding: 12px 18px; border-radius: 999px; cursor: pointer; font-size: 1rem; }
        .card { max-width: 560px; margin: 0 auto; background: #111c2f; padding: 24px; border-radius: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Huginn Replay Demo</h1>
        <p>This starts the England vs Argentina replay flow so you can see the alerts in WhatsApp and live chat.</p>
        <button onclick="runDemo()">Run replay demo</button>
        <p id="status">Waiting…</p>
      </div>
      <script>
        async function runDemo() {
          const status = document.getElementById('status');
          status.textContent = 'Starting replay…';
          try {
            const res = await fetch('/api/replay/demo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ intervalMs: 1500, maxSteps: 30 })
            });
            const data = await res.json();
            status.textContent = data.ok ? 'Replay started.' : 'Replay failed: ' + (data.error || 'unknown');
          } catch (err) {
            status.textContent = 'Replay failed: ' + err.message;
          }
        }
      </script>
    </body>
  </html>`);
});

app.post('/api/replay/demo', async (req, res) => {
  if (!replaySnapshots.length) {
    return res.status(503).json({ ok: false, error: 'Replay snapshots not loaded on server' });
  }

  const { pollMatches } = await import('./services/matchPoller.js');
  const { updateMatchState } = await import('./utils/store.js');
  const { intervalMs = 1500, maxSteps = 30 } = req.body || {};

  try {
    global.mockReplayActive = true;
    global.mockReplayIndex = 0;
    updateMatchState('18241006', {
      seeded: false,
      sentPreMatch: false,
      sentKO: false,
      homeScore: 0,
      awayScore: 0,
      status: 'pre'
    });

    res.json({ ok: true, status: 'demo-started', intervalMs, maxSteps });

    const runDemo = async () => {
      global.mockReplayIndex = 1;
      await pollMatches();

      for (let i = 2; i < Math.min(replaySnapshots.length, maxSteps); i++) {
        global.mockReplayIndex = i;
        await pollMatches();
        await new Promise(resolve => setTimeout(resolve, Number(intervalMs) || 1500));
      }

      log.info('Replay demo completed.');
    };

    runDemo().catch((err) => {
      log.error('Replay demo failed:', err.message);
    });
  } catch (err) {
    log.error('Replay demo error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Manual pre-match blast (one-shot admin trigger) ──────────────────────────
app.post('/api/send-prematch', async (req, res) => {
  try {
    const { getUpcomingMatches, getMatchOdds, formatOdds } = await import('./services/txline.js');
    const { notifyMatchGroups } = await import('./services/whatsapp.js');
    const { getGroupsFollowingMatch, getMatchState, updateMatchState } = await import('./utils/store.js');
    const { sendPushNotification } = await import('./services/pushNotify.js');
    const { getSubscribersForTeams } = await import('./utils/subscriptionStore.js');

    const upcoming = await getUpcomingMatches(24);
    let sent = 0;

    for (const match of upcoming) {
      const matchId = match.id;
      const groups  = getGroupsFollowingMatch(matchId);
      if (!groups.length) continue; // nobody following this match

      const homeTeam = match.home_team?.name || 'Home';
      const awayTeam = match.away_team?.name || 'Away';
      const state    = getMatchState(matchId);

      if (state?.sentPreMatch) continue; // already sent for this match

      let oddsStr = '';
      try {
        const odds = await getMatchOdds(matchId);
        oddsStr = formatOdds(odds);
      } catch {}

      const oddsPreview = oddsStr ? `\n\n📊 Opening odds: ${oddsStr}` : '';
      const kick = match.kickoff_time
        ? new Date(match.kickoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : 'soon';

      const msg = `🔔 *Match day!*\n\n*${homeTeam} vs ${awayTeam}* kicks off at ${kick}.\n\nGoal alerts, red cards, and live commentary will all come through here automatically.${oddsPreview}`;

      await notifyMatchGroups(groups, msg);

      let pushSubs = [];
      try {
        const subs = await getSubscribersForTeams([homeTeam, awayTeam]);
        pushSubs = subs.map(s => s.subscription);
      } catch {}
      if (pushSubs.length) {
        await sendPushNotification('Match day! 🔔', `${homeTeam} vs ${awayTeam} kicks off at ${kick}.`, '/', pushSubs);
      }

      updateMatchState(matchId, { sentPreMatch: true });
      sent++;
    }

    res.json({ ok: true, matchesAlerted: sent });
  } catch (err) {
    log.error('send-prematch failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});


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
app.listen(PORT, async () => {
  log.info(`⚽ WC Companion Bot running on port ${PORT}`);
  log.info(`🌐 Web interface: http://localhost:${PORT}`);
  log.info(`🔄 Polling TxLINE every 5 seconds`);
  
  // Hydrate followed matches / group styles from Upstash Redis
  await loadGroupsFromRedis();
  
  initializeWhatsApp();
});
