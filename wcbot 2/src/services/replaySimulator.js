import axios from 'axios';
import { log } from '../utils/logger.js';
import { getValidToken } from './auth.js';
import { sseClient } from './sse.js';

const BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com/api';
const FRANCE_FIXTURE_ID = 18257865;

class ReplaySimulator {
  constructor() {
    this.events = [];
    this.currentIndex = 0;
    this.timer = null;
    this.targetKickoffMs = null;
  }

  async initialize() {
    log.info('simulator', 'Fetching historical France vs England match data...');
    try {
      const token = await getValidToken();
      const res = await axios.get(`${BASE_URL}/scores/snapshot/${FRANCE_FIXTURE_ID}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Api-Token': process.env.TXLINE_API_KEY
        }
      });
      
      const rawData = res.data;
      if (!rawData || rawData.length === 0) {
        log.error('simulator', 'No historical data found for fixture 18257865');
        return;
      }

      // Fast-forward demo mode: Events happen every 5 seconds!
      this.events = rawData;
      log.info('simulator', `Loaded ${this.events.length} events for Fast-Forward Demo Video.`);
      this.start();
    } catch (err) {
      log.error('simulator', `Failed to initialize replay: ${err.message}`);
    }
  }

  start() {
    if (this.events.length === 0) return;
    this.processNextEvent();
  }

  processNextEvent() {
    if (this.currentIndex >= this.events.length) {
      log.info('simulator', 'Replay complete. All events have been dispatched.');
      return;
    }

    const nextEvent = this.events[this.currentIndex];

    // FAST-FORWARD MODE: 8 seconds between every event
    const delay = 8000;
    
    log.info('simulator', `Next event '${nextEvent.Action}' scheduled in ${delay/1000}s.`);

    this.timer = setTimeout(() => {
      try {
        log.info('simulator', `Dispatching event: ${nextEvent.Action} (Seq: ${nextEvent.Seq})`);
        sseClient.emit('score_update', nextEvent);
      } catch (err) {
        log.error('simulator', `Error dispatching event: ${err.message}`);
      }

      this.currentIndex++;
      this.processNextEvent();
    }, delay);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

export const simulator = new ReplaySimulator();
