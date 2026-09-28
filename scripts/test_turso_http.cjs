const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:/Users/CNESTAD003/.gemini/antigravity/brain/a6cbeb6a-04ff-43cd-8dda-86acdd749c4e/.system_generated/logs/transcript_full.jsonl';

console.log('Reading transcript_full.jsonl...');
const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  crlfDelay: Infinity
});

let allFound = new Map();

rl.on('line', (line) => {
  const trMatches = line.match(/"id":\s*"([^"]+)",\s*"request_id":\s*"([^"]+)",\s*"patient":\s*"([^"]+)"/g);
  if (trMatches) {
    trMatches.forEach(m => {
      allFound.set(m, true);
    });
  }
});

rl.on('close', () => {
  console.log('Total unique extracted requests from transcript:', allFound.size);
});
