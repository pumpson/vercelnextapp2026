import re

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'r') as f:
    content = f.read()

search = """        if (currentId) {
            // 既存の駅（乗換駅）
            if (!stations[currentId].lines.includes(lineType)) {
                stations[currentId].lines.push(lineType);
            }"""

replace = """        if (currentId) {
            // 既存の駅（乗換駅）
            if (!stations[currentId].lines.includes(lineType)) {
                stations[currentId].lines.push(lineType);
            }
            // 位置情報が後から提供された場合は更新する
            if (info.x !== undefined && stations[currentId].x === undefined) {
                stations[currentId].x = info.x;
            }
            if (info.y !== undefined && stations[currentId].y === undefined) {
                stations[currentId].y = info.y;
            }"""

content = content.replace(search, replace)

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'w') as f:
    f.write(content)
