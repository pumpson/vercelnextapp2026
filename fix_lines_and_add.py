import re

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'r') as f:
    content = f.read()

# Fix LineType to include new lines
old_lines = "export type LineType = 'yamanote' | 'ginza' | 'marunouchi' | 'chuo' | 'odakyu' | 'keio' | 'tozai' | 'chiyoda' | 'hanzomon' | 'saikyo' | 'shonan' | 'namboku' | 'denentoshi' | 'toyoko' | 'yokohama' | 'nambu' | 'yurikamome' | 'rinkai' | 'tokaido' | 'yurakucho' | 'ikegami' | 'seibuShinjuku' | 'seibuIkebukuro' | 'keihinTohoku' | 'tohoku' | 'tamaMonorail' | 'tobuTojo' | 'tobuSkytree';"
new_lines = "export type LineType = 'yamanote' | 'ginza' | 'marunouchi' | 'chuo' | 'odakyu' | 'keio' | 'tozai' | 'chiyoda' | 'hanzomon' | 'saikyo' | 'shonan' | 'namboku' | 'denentoshi' | 'toyoko' | 'yokohama' | 'nambu' | 'yurikamome' | 'rinkai' | 'tokaido' | 'yurakucho' | 'ikegami' | 'seibuShinjuku' | 'seibuIkebukuro' | 'keihinTohoku' | 'tohoku' | 'tamaMonorail' | 'tobuTojo' | 'tobuSkytree' | 'joban' | 'keiseiMain' | 'keiseiOshiage' | 'keiyo' | 'musashino';"

content = content.replace(old_lines, new_lines)

# Add line colors
line_colors_block = """  tobuSkytree: '#0065B3',  // 東武スカイツリーライン（青）
};"""
new_line_colors_block = """  tobuSkytree: '#0065B3',  // 東武スカイツリーライン（青）
  joban: '#00B28C',        // 常磐線（エメラルドグリーン）
  keiseiMain: '#005BBB',   // 京成本線（青）
  keiseiOshiage: '#FF69B4', // 京成押上線（ピンク）
  keiyo: '#C9242B',        // 京葉線（ワインレッド）
  musashino: '#F15A22',    // 武蔵野線（オレンジ）
};"""

content = content.replace(line_colors_block, new_line_colors_block)

# Add new lines to the map
new_lines_code = """

// 29. 常磐線 (上野〜松戸〜柏〜取手)
buildLine('joban', [
  { name: "上野" },
  { name: "日暮里" },
  { name: "北千住", x: CENTER_X + 1600, y: CENTER_Y - 2400 },
  { name: "松戸", x: CENTER_X + 2200, y: CENTER_Y - 2800 },
  { name: "柏", x: CENTER_X + 3000, y: CENTER_Y - 3200 },
  { name: "我孫子", x: CENTER_X + 3600, y: CENTER_Y - 3400 },
  { name: "取手", x: CENTER_X + 4200, y: CENTER_Y - 3800 }
]);

// 30. 京成本線 (京成上野〜日暮里〜青砥〜京成船橋)
buildLine('keiseiMain', [
  { name: "京成上野", x: CENTER_X + 900, y: CENTER_Y - 1300 }, // 上野の近く
  { name: "日暮里" },
  { name: "町屋", x: CENTER_X + 1200, y: CENTER_Y - 1800 },
  { name: "青砥", x: CENTER_X + 2200, y: CENTER_Y - 1600 },
  { name: "京成高砂", x: CENTER_X + 2600, y: CENTER_Y - 1600 },
  { name: "京成船橋", x: CENTER_X + 4000, y: CENTER_Y - 1200 }
]);

// 31. 京成押上線 (押上〜青砥)
buildLine('keiseiOshiage', [
  { name: "押上" },
  { name: "京成曳舟", x: CENTER_X + 1800, y: CENTER_Y - 1200 },
  { name: "八広", x: CENTER_X + 2000, y: CENTER_Y - 1400 },
  { name: "青砥" }
]);

// 32. 京葉線 (東京〜新木場〜舞浜〜海浜幕張)
buildLine('keiyo', [
  { name: "東京" },
  { name: "八丁堀" },
  { name: "新木場" },
  { name: "葛西臨海公園", x: CENTER_X + 2800, y: CENTER_Y + 1200 },
  { name: "舞浜", x: CENTER_X + 3400, y: CENTER_Y + 1400 },
  { name: "新浦安", x: CENTER_X + 4000, y: CENTER_Y + 1600 },
  { name: "南船橋", x: CENTER_X + 4800, y: CENTER_Y + 1800 },
  { name: "海浜幕張", x: CENTER_X + 5400, y: CENTER_Y + 1800 }
]);

// 33. 武蔵野線 (府中本町〜西国分寺〜南浦和〜西船橋)
buildLine('musashino', [
  { name: "府中本町", x: CENTER_X - 3200, y: CENTER_Y + 200 },
  { name: "西国分寺", x: CENTER_X - 3200, y: CENTER_Y - 600 },
  { name: "新秋津", x: CENTER_X - 3200, y: CENTER_Y - 2000 }, // 所沢周辺
  { name: "北朝霞", x: CENTER_X - 2000, y: CENTER_Y - 2600 }, // 朝霞台の近く
  { name: "武蔵浦和" },
  { name: "南浦和", x: CENTER_X + 600, y: CENTER_Y - 3200 },
  { name: "東川口", x: CENTER_X + 1800, y: CENTER_Y - 3200 },
  { name: "南越谷", x: CENTER_X + 2800, y: CENTER_Y - 3200 }, // 新越谷の近く
  { name: "新松戸", x: CENTER_X + 3800, y: CENTER_Y - 2800 },
  { name: "西船橋", x: CENTER_X + 4000, y: CENTER_Y - 800 }
]);
"""

# Append before the end (which currently should be some `export const MAP_DATA = Object.values(stations);`)
content = content.replace("export const MAP_DATA = Object.values(stations);", new_lines_code + "\nexport const MAP_DATA = Object.values(stations);")

with open('app/games/tokyo-train-sugoroku/data/mapData.ts', 'w') as f:
    f.write(content)
