import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.TXLINE_API_KEY;

async function testAuth() {
  try {
    const res = await axios.post('https://txline.txodds.com/api/auth/guest', {}, {
      headers: { 'X-Api-Token': API_KEY }
    });
    console.log("Guest Token Response:", res.data);
  } catch (e) {
    console.error("Failed guest token:", e.response?.data || e.message);
  }
}
testAuth();
