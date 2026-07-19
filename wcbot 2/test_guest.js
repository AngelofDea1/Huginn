import axios from 'axios';
async function test() {
  try {
    const res = await axios.post('https://txline.txodds.com/auth/guest/start', {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.log("ERROR status:", err.response?.status);
    console.log("ERROR data:", err.response?.data);
  }
}
test();
