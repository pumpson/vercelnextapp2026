const { MAP_DATA } = require('./app/games/tokyo-train-sugoroku/data/mapData');

// Just check if Hachobori is correct
const hatchobori = MAP_DATA.find(s => s.name === "八丁堀");
console.log(hatchobori);
