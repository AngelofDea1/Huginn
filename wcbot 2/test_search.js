import { searchMatch } from './src/services/txline.js';
console.log("Starting search...");
searchMatch("Spain").then(res => {
  console.log("Found:", res);
  process.exit(0);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
