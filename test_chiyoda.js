const { MAP_DATA } = require('./app/games/tokyo-train-sugoroku/data/mapData');

console.log(MAP_DATA.filter(s => s.lines.includes('chiyoda')).map(s => {
    return `${s.name} (id: ${s.id}, next: ${s.next.join(',')})`;
}));
