import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pollMatches } from './services/matchPoller.js';
import { updateMatchState, getMatchState, initMatchState } from './utils/store.js';
import { log } from './utils/logger.js';
import { initializeWhatsApp } from './services/whatsapp.js';
import { loadGroupsFromRedis } from './utils/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the downloaded snapshot data
const snapshotPath = path.join(__dirname, 'match_18241006_snapshot.json');
const rawSnapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

// Sort snapshots chronologically by sequence / timestamp
const snapshots = rawSnapshot.sort((a, b) => (a.Seq || 0) - (b.Seq || 0));

console.log(`Loaded ${snapshots.length} sequential snapshots for England vs Argentina (18241006).`);

// Global configuration variables to control what subset of the snapshots is returned
global.mockReplayIndex = 0;
global.mockReplayActive = true; // Activate hook

// Expose mock hook in global scope so txline.js can consume it
global.getMockReplayDetails = function() {
  if (!global.mockReplayActive) return null;
  // Return slices of the real snapshot array depending on replay index
  const slice = snapshots.slice(0, global.mockReplayIndex + 1);
  return slice;
};

// Set up readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('⚽ Starting England vs Argentina Replay Test Controller...');
  
  // Load rehydrated subscription details
  await loadGroupsFromRedis();
  initializeWhatsApp();

  console.log('\n--- CONTROLS ---');
  console.log('type "pre"   - simulated pre-match warning status');
  console.log('type "ko"    - simulated kickoff start');
  console.log('type "step"  - step forward by 1 event snapshot');
  console.log('type "goal"  - fast forward directly to next goal event snapshot');
  console.log('type "poll"  - manually trigger 1 poll cycle');
  console.log('type "exit"  - terminate replay simulation');
  
  askCommand();
}

function askCommand() {
  rl.question('\nReplay command (index: ' + global.mockReplayIndex + '/' + (snapshots.length - 1) + ') > ', async (answer) => {
    const cmd = answer.trim().toLowerCase();
    
    if (cmd === 'exit') {
      rl.close();
      process.exit(0);
    }
    
    if (cmd === 'pre') {
      console.log('Setting pre-match mock state...');
      // Clear out stored state flags to allow clean alerts triggers
      updateMatchState('18241006', {
        seeded: false,
        sentPreMatch: false,
        sentKO: false,
        homeScore: 0,
        awayScore: 0
      });
      global.mockReplayIndex = 0;
      console.log('Seeded baseline cleared. Call "poll" next.');
    }
    else if (cmd === 'ko') {
      console.log('Simulating Kick-off...');
      global.mockReplayIndex = 1; // Step forward past NS
      await pollMatches();
    }
    else if (cmd === 'step') {
      if (global.mockReplayIndex < snapshots.length - 1) {
        global.mockReplayIndex++;
        console.log(`Stepping forward to snapshot index ${global.mockReplayIndex}...`);
        await pollMatches();
      } else {
        console.log('Reached end of match snapshot events.');
      }
    }
    else if (cmd === 'goal') {
      // Find the next snapshot where total goals increases
      let found = false;
      const currentHome = getMockReplayDetails().slice(-1)[0]?.Score?.Participant1?.Total?.Goals || 0;
      const currentAway = getMockReplayDetails().slice(-1)[0]?.Score?.Participant2?.Total?.Goals || 0;
      
      for (let i = global.mockReplayIndex + 1; i < snapshots.length; i++) {
        const item = snapshots[i];
        const itemHome = item?.Score?.Participant1?.Total?.Goals || 0;
        const itemAway = item?.Score?.Participant2?.Total?.Goals || 0;
        if (itemHome > currentHome || itemAway > currentAway) {
          global.mockReplayIndex = i;
          found = true;
          console.log(`Fast forwarding to goal snapshot index ${i} (${itemHome}-${itemAway})...`);
          await pollMatches();
          break;
        }
      }
      if (!found) console.log('No further goal events found in snapshot history.');
    }
    else if (cmd === 'poll') {
      console.log('Triggering manual poll matches cycle...');
      await pollMatches();
    }
    else {
      console.log('Unknown command. Please try: pre, ko, step, goal, poll, or exit.');
    }
    
    askCommand();
  });
}

main();
