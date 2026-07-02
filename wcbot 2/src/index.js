import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeWhatsApp } from './services/whatsapp.js';
import { pollMatches } from './services/matchPoller.js';
import { schedulePreMatchBulletins } from './services/scheduler.js';
import { log } from './utils/logger.js';
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

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

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
