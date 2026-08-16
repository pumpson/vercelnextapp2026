const fs = require('fs');
const content = fs.readFileSync('app/games/tokyo-train-sugoroku/data/mapData.ts', 'utf-8');
const lines = content.split('\n');
const hatchoboriLine = lines.find(l => l.includes('八丁堀'));
console.log(hatchoboriLine);
