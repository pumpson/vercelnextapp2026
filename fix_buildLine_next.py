import re

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'r') as f:
    content = f.read()

# buildLine needs to actually connect `next` stations.
# Wait, let's see how `next` is connected in buildLine.
