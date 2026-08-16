import re

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'r') as f:
    content = f.read()

# buildLine logic issue: when station exists, we just append lines.
# We should update x, y if it was missing and provided now.
# Replace the station building logic.

search_str = """  stations[id] = {
    id,
    name,
    x: x ?? 0,
    y: y ?? 0,
    type,
    lines: [lineId],
    next: []
  };"""

replace_str = """  stations[id] = {
    id,
    name,
    x: x ?? 0,
    y: y ?? 0,
    type,
    lines: [lineId],
    next: []
  };"""

# Wait, let's look at `buildLine` function in mapData.ts
