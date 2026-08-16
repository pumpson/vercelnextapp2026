import re

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'r') as f:
    content = f.read()

# 1. Replace Math.random() for Yamanote stations
# old:
#  const r = Math.random();
#  if (r < 0.4) type = 'plus';
#  else if (r < 0.7) type = 'minus';
# new:
#  const r = (i * 13) % 100 / 100; // deterministic pseudo-random based on index
#  if (r < 0.4) type = 'plus';
#  else if (r < 0.7) type = 'minus';

content = content.replace("const r = Math.random();", "const r = (i * 13) % 100 / 100; // deterministic pseudo-random")

# 2. Add global counter and replace Math.random() for buildLine
# We need to add `let stationCounter = 0;` near the top of the file, maybe after `const stations: Record<string, Station> = {};`
content = content.replace("const stations: Record<string, Station> = {};", "const stations: Record<string, Station> = {};\nlet stationCounter = 0;")

# 3. Replace Math.random() string in currentId
# old: currentId = `${lineType}_${Math.random().toString(36).substring(2, 9)}_${i}`;
# new: currentId = `${lineType}_${stationCounter++}_${i}`;
content = content.replace("currentId = `${lineType}_${Math.random().toString(36).substring(2, 9)}_${i}`;", "currentId = `${lineType}_${stationCounter++}_${i}`;")

# 4. Replace Math.random() for buildLine station type
# old: type: Math.random() > 0.5 ? 'plus' : 'minus',
# new: type: (stationCounter % 2 === 0) ? 'plus' : 'minus',
content = content.replace("type: Math.random() > 0.5 ? 'plus' : 'minus',", "type: (stationCounter % 2 === 0) ? 'plus' : 'minus',")

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'w') as f:
    f.write(content)
