import re

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'r') as f:
    content = f.read()

# Replace the currentId generation logic
search = "currentId = `${lineType}_${i}`;"
replace = "currentId = `${lineType}_${Math.random().toString(36).substring(2, 9)}_${i}`;"

content = content.replace(search, replace)

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'w') as f:
    f.write(content)
