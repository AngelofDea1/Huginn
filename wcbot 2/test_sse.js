import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import { getValidToken } from './src/services/auth.js';

async function testSSE() {
  try {
    const token = await getValidToken();
    const res = await axios({
      method: 'get',
      url: 'https://txline.txodds.com/api/scores/stream',
      responseType: 'stream',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Api-Token': process.env.TXLINE_API_KEY
      }
    });

    res.data.on('data', chunk => {
      console.log('Received chunk:', chunk.toString());
    });
    
    // Stop after 3 seconds
    setTimeout(() => {
      res.data.destroy();
      console.log('Stopped.');
    }, 3000);
  } catch (e) {
    console.error("Failed:", e.message);
  }
}
testSSE();
