import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const res1 = await axios.post('https://txline.txodds.com/auth/guest/start', {}, {
      headers: { 'Content-Type': 'application/json' }
    });
    const guestToken = res1.data.token;
    console.log("GUEST TOKEN:", guestToken.substring(0, 20) + "...");

    const res2 = await axios.post('https://txline.txodds.com/auth/activate', {}, {
      headers: {
        'Authorization': `Bearer ${guestToken}`,
        'X-Api-Token': process.env.TXLINE_API_KEY
      }
    });
    console.log("ACTIVATED TOKEN:", res2.data);
  } catch (err) {
    console.log("ERROR status:", err.response?.status);
    console.log("ERROR data:", err.response?.data);
  }
}
test();
