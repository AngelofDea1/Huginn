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

      // Calculate Target Kickoff (1 minute from now, so user can see it start in real-time)
      const now = new Date();
      this.targetKickoffMs = now.getTime() + (60 * 1000);

      const firstHalfKickoffEvent = rawData.find(e => e.Action === 'kickoff_team') || rawData[0];
      const originalKickoffMs = firstHalfKickoffEvent.Ts;
      const timeShift = this.targetKickoffMs - originalKickoffMs;

      // Reduce halftime
      const htFinalised = rawData.find(e => e.Action === 'halftime_finalised');
      const secondHalfKickoff = rawData.find(e => e.Action === 'kickoff');
      
      let gapReduction = 0;
      if (htFinalised && secondHalfKickoff) {
        const rawGap = secondHalfKickoff.Ts - htFinalised.Ts;
        const standardGap = 15 * 60 * 1000; // 15 mins
        if (rawGap > standardGap) {
          gapReduction = rawGap - standardGap;
        }
      }

      this.events = rawData.map(d => {
        const isSecondHalf = htFinalised && d.Ts > htFinalised.Ts;
        return {
          ...d,
          simulatedTs: d.Ts + timeShift - (isSecondHalf ? gapReduction : 0)
        };
      }).sort((a, b) => a.simulatedTs - b.simulatedTs);

      log.info('simulator', `Loaded ${this.events.length} events for replay. Target Kickoff: ${new Date(this.targetKickoffMs).toLocaleTimeString()}`);
      
      this.start();
    } catch (err) {
      log.error('simulator', `Failed to initialize replay: ${err.message}`);
    }
  }

  start() {
    if (this.events.length === 0) return;
    
    // Process any events that should have already happened instantly
    const now = Date.now();
    while (this.currentIndex < this.events.length) {
      const ev = this.events[this.currentIndex];
      if (ev.simulatedTs <= now) {
        // Emit silently if it's far in the past to catch up state, 
        // but wait, matchPoller will trigger alerts. 
        // Since the user said they didn't get an alert by 8:30, maybe we should emit them now.
        sseClient.emit('score_update', ev);
        this.currentIndex++;
      } else {
        break;
      }
    }

    this.scheduleNext();
  }

  scheduleNext() {
    if (this.currentIndex >= this.events.length) {
      log.info('simulator', 'Replay complete.');
      return;
    }

    const nextEvent = this.events[this.currentIndex];
    const delay = nextEvent.simulatedTs - Date.now();

    log.info('simulator', `Next event '${nextEvent.Action}' scheduled in ${Math.round(delay / 1000)}s.`);

    this.timer = setTimeout(() => {
      sseClient.emit('score_update', nextEvent);
      this.currentIndex++;
      this.scheduleNext();
    }, delay > 0 ? delay : 0);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

export const simulator = new ReplaySimulator();
