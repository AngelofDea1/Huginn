import axios from 'axios';
import { EventEmitter } from 'events';
import { log } from '../utils/logger.js';
import { getValidToken } from './auth.js';

class TXLineSSE extends EventEmitter {
  constructor() {
    super();
    this.scoresStream = null;
    this.oddsStream = null;
    this.isScoresConnected = false;
    this.isOddsConnected = false;
  }

  async connect() {
    this.connectStream('scores', 'https://txline.txodds.com/api/scores/stream');
    this.connectStream('odds', 'https://txline.txodds.com/api/odds/stream');
  }

  async connectStream(type, url) {
    const isConnectedProp = type === 'scores' ? 'isScoresConnected' : 'isOddsConnected';
    const streamProp = type === 'scores' ? 'scoresStream' : 'oddsStream';

    if (this[isConnectedProp]) return;
    
    log.info('sse', `Connecting to TXLine ${type} SSE stream...`);
    try {
      const token = await getValidToken();
      
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Api-Token': process.env.TXLINE_API_KEY,
          'Accept': 'text/event-stream'
        }
      });

      this[streamProp] = response.data;
      this[isConnectedProp] = true;
      log.info('sse', `Successfully connected to TXLine ${type} SSE stream.`);

      let buffer = '';
      this[streamProp].on('data', chunk => {
        buffer += chunk.toString();
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // Keep the incomplete part

        for (const part of parts) {
          this.parseEvent(part, type);
        }
      });

      this[streamProp].on('end', () => {
        log.info('sse', `SSE ${type} stream ended unexpectedly. Reconnecting...`);
        this[isConnectedProp] = false;
        setTimeout(() => this.connectStream(type, url), 5000);
      });

      this[streamProp].on('error', err => {
        log.error('sse', `SSE ${type} stream error: ${err.message}`);
        this[isConnectedProp] = false;
        setTimeout(() => this.connectStream(type, url), 5000);
      });

    } catch (error) {
      if (error.response && error.response.status === 401) {
        log.warn('sse', `SSE ${type} returned 401 Unauthorized. Refreshing token...`);
        import('./auth.js').then(m => m.refreshToken()).catch(e => log.error('sse', 'Refresh failed'));
      }
      log.error('sse', `Failed to connect to ${type} SSE: ${error.message}`);
      setTimeout(() => this.connectStream(type, url), 5000); // Retry logic
    }
  }

  parseEvent(rawStr, type) {
    const lines = rawStr.split('\n');
    let eventName = 'message';
    let dataStr = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        dataStr += line.substring(5).trim();
      }
    }

    if (dataStr) {
      try {
        const payload = JSON.parse(dataStr);
        const emitName = type === 'scores' ? 'score_update' : 'odds_update';
        
        if (Array.isArray(payload)) {
           for (const item of payload) {
             this.emit(emitName, item);
           }
        } else {
           this.emit(emitName, payload);
        }
      } catch (err) {
        log.error('sse', `Failed to parse ${type} SSE JSON: ${err.message}`);
      }
    }
  }
}

export const sseClient = new TXLineSSE();
