import re

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'r') as f:
    content = f.read()

# 小田急線が「新宿」〜「登戸」〜「小田原」となっているが、実は途中の駅が消えているか、
# 南武線の「登戸」と被って変になっている可能性がある。
