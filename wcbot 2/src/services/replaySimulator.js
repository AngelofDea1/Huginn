import axios from 'axios';
import { log } from '../utils/logger.js';
import { getValidToken } from './auth.js';
import { sseClient } from './sse.js';

const BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com/api';
const FRANCE_FIXTURE_ID = 18257865;

export const matchState = {
  status: 'NS', // NS, LIVE, HT, FT
  home_score: 0,
  away_score: 0,
  minute: 0,
  extraTime: null
};

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

      // Calculate Target Kickoff (12:00 PM local time today)
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
      this.targetKickoffMs = targetDate.getTime();

      const firstHalfKickoffEvent = rawData.find(e => e.Action === 'kickoff_team') || rawData[0];
      const originalKickoffMs = firstHalfKickoffEvent.Ts;
      const timeShift = this.targetKickoffMs - originalKickoffMs;

      this.events = rawData.sort((a, b) => (a.Seq || 0) - (b.Seq || 0));

      log.info('simulator', `Loaded ${this.events.length} events for Fast-Forward replay.`);
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
    const delay = 10000; // FAST-FORWARD: 10 seconds per event

    log.info('simulator', `Next event '${nextEvent.Action}' scheduled in 10s.`);

    this.timer = setTimeout(() => {
      try {
        log.info('simulator', `Dispatching event: ${nextEvent.Action} (Seq: ${nextEvent.Seq})`);
        
        // Mutate global state
        if (nextEvent.Action === 'kickoff_team' || nextEvent.Action === 'kickoff') matchState.status = 'LIVE';
        if (nextEvent.Action === 'halftime_finalised') matchState.status = 'HT';
        if (nextEvent.Action === 'game_finalised') matchState.status = 'FT';
        if (nextEvent.Score?.Participant1?.Total?.Goals !== undefined) {
          matchState.home_score = nextEvent.Score.Participant1.Total.Goals;
          matchState.away_score = nextEvent.Score.Participant2.Total.Goals;
        }
        if (nextEvent.Action === 'additional_time') {
           matchState.extraTime = nextEvent.Data?.Minutes || 0;
        }
        // Update minute based on elapsed clock
        if (nextEvent.Clock?.Seconds) {
           matchState.minute = Math.floor(nextEvent.Clock.Seconds / 60);
        } else if (nextEvent.Elapsed) {
           matchState.minute = nextEvent.Elapsed;
        }

        sseClient.emit('score_update', nextEvent);
      } catch (err) {
        log.error('simulator', `Error dispatching event: ${err.message}`);
      }

      this.currentIndex++;
      this.processNextEvent();
    }, delay > 0 ? delay : 0);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

export const simulator = new ReplaySimulator();
