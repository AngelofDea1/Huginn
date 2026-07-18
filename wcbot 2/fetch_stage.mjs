import 'dotenv/config';
import axios from 'axios';

async function fetchStage() {
  const token = process.env.TXLINE_API_KEY;
  const jwt = process.env.TXLINE_JWT;
  if (!token || !jwt) {
    console.log("No token or jwt in .env");
    return;
  }
  
  const client = axios.create({
    baseURL: process.env.TXLINE_BASE_URL || 'https://txline.txodds.com/api',
    headers: { 'Authorization': `Bearer ${jwt}`, 'X-Api-Token': token }
  });
  
  try {
    const res = await client.get('/fixtures/snapshot');
    const wcs = res.data.filter(f => f.CompetitionId === 72 || f.CompetitionId === 83 || f.CompetitionId === 2000);
    if (wcs.length > 0) {
      console.log("Found WC matches!");
      wcs.slice(0, 3).forEach(f => {
        console.log(`${f.Participant1} vs ${f.Participant2}`);
        console.log("Stage/Round hints:", {
            RoundName: f.RoundName || f.TournamentPhase || f.PhaseName || f.Round
        });
      });
    } else {
      console.log("No WC matches found, looking at first generic match...");
      const f = res.data[0];
      console.log("Keys available:", Object.keys(f));
      console.log("Stage/Round hints:", {
            Round: f.Round, 
            RoundName: f.RoundName,
            Phase: f.Phase,
            PhaseName: f.PhaseName,
            CompetitionName: f.CompetitionName,
            TournamentPhase: f.TournamentPhase,
            Type: f.Type
      });
    }
  } catch (e) {
    console.error(e.message);
  }
}
fetchStage();
