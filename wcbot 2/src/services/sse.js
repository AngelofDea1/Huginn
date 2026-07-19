import axios from 'axios';
import { EventEmitter } from 'events';
import { log } from '../utils/logger.js';
import { getValidToken } from './auth.js';

class TXLineSSE extends EventEmitter {
  constructor() {
    super();
    this.stream = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;
    
    log.info('sse', 'Connecting to TXLine SSE stream...');
    try {
      const token = await getValidToken();
      
      const response = await axios({
        method: 'get',
        url: 'https://txline.txodds.com/api/scores/stream',
        responseType: 'stream',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Api-Token': process.env.TXLINE_API_KEY,
          'Accept': 'text/event-stream'
        }
      });

      this.stream = response.data;
      this.isConnected = true;
      log.info('sse', 'Successfully connected to TXLine SSE stream.');

      let buffer = '';
      this.stream.on('data', chunk => {
        buffer += chunk.toString();
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // Keep the incomplete part

        for (const part of parts) {
          this.parseEvent(part);
        }
      });

      this.stream.on('end', () => {
        log.info('sse', 'SSE stream ended unexpectedly. Reconnecting...');
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });

      this.stream.on('error', err => {
        log.error('sse', `SSE stream error: ${err.message}`);
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });

    } catch (error) {
      log.error('sse', `Failed to connect to SSE: ${error.message}`);
      setTimeout(() => this.connect(), 5000); // Retry logic
    }
  }

  parseEvent(rawStr) {
    // SSE format:
    // event: update
    // data: {"FixtureId":123,...}
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
        // TXLine sends an array of events
        if (Array.isArray(payload)) {
           for (const item of payload) {
             this.emit('score_update', item);
           }
        } else {
           this.emit('score_update', payload);
        }
      } catch (err) {
        log.error('sse', `Failed to parse SSE JSON: ${err.message}`);
      }
    }
  }
}

export const sseClient = new TXLineSSE();
