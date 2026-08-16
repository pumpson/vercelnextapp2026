// 駅の種別を表す型
// type: 'plus' = プラス駅（お金が増える）
// type: 'minus' = マイナス駅（お金が減る）
// type: 'neutral' = 通常駅（何も起きない）
export type StationType = 'plus' | 'minus' | 'neutral';

// 路線を表す型
export type LineType = 'yamanote' | 'ginza' | 'marunouchi' | 'chuo' | 'odakyu' | 'keio';

// 駅のデータ構造
export interface Station {
  id: string;          // 駅の一意のID (例: 'tokyo')
  name: string;        // 駅名 (例: '東京')
  x: number;           // マップ上のX座標
  y: number;           // マップ上のY座標
  type: StationType;   // 駅の種別
  lines: LineType[];   // 所属する路線
  next: string[];      // 隣接する駅のIDリスト
}

// 路線ごとに色を定義
export const LineColors: Record<LineType, string> = {
  yamanote: '#8CC63F',   // JR山手線（ウグイス色）
  ginza: '#F39700',      // 東京メトロ銀座線（オレンジ）
  marunouchi: '#E60012', // 東京メトロ丸ノ内線（赤）
  chuo: '#F15A22',       // JR中央線（オレンジ）
  odakyu: '#007EC7',     // 小田急線（青）
  keio: '#DD0055',       // 京王線（ピンク系赤）
};

// --- マップデータ作成の設計方針 ---
// 全体が見やすいよう座標系を広く（キャンバスサイズ 2000x2000 を想定）
const CENTER_X = 1000;
const CENTER_Y = 1000;
const RADIUS = 700; // 山手線の半径を大きく

// 山手線の駅リスト（時計回り）
const yamanoteStationNames = [
  "品川", "大崎", "五反田", "目黒", "恵比寿", "渋谷", "原宿", "代々木", "新宿", "新大久保",
  "高田馬場", "目白", "池袋", "大塚", "巣鴨", "駒込", "田端", "西日暮里", "日暮里", "鶯谷",
  "上野", "御徒町", "秋葉原", "神田", "東京", "有楽町", "新橋", "浜松町", "田町", "高輪ゲートウェイ"
];

const stations: Record<string, Station> = {};

// 1. 山手線の駅を生成
yamanoteStationNames.forEach((name, index) => {
  const angle = (index / yamanoteStationNames.length) * 2 * Math.PI + Math.PI / 2; // 下（品川）から開始

  // ちょっとデフォルメして、実際の地図っぽさも少し出す（完全な円にしない工夫も可能だが一旦円で）
  const x = Math.round(CENTER_X + RADIUS * Math.cos(angle));
  const y = Math.round(CENTER_Y + RADIUS * Math.sin(angle));

  const id = `yamanote_${index}`;

  // 駅種別をランダムに設定（ただし東京や新宿など主要駅はプラスに）
  let type: StationType = 'neutral';
  const r = Math.random();
  if (r < 0.4) type = 'plus';
  else if (r < 0.7) type = 'minus';

  if (["東京", "新宿", "渋谷", "池袋", "品川", "上野"].includes(name)) {
      type = 'plus';
  }

  stations[id] = {
    id,
    name,
    x,
    y,
    type,
    lines: ['yamanote'],
    next: [] // 後で結ぶ
  };
});

// 山手線の隣接関係を結ぶ
for (let i = 0; i < yamanoteStationNames.length; i++) {
  const currentId = `yamanote_${i}`;
  const nextId = `yamanote_${(i + 1) % yamanoteStationNames.length}`;
  const prevId = `yamanote_${(i - 1 + yamanoteStationNames.length) % yamanoteStationNames.length}`;

  stations[currentId].next.push(nextId, prevId);
}

// ユーティリティ：名前から山手線の駅IDを取得
const getYamanoteId = (name: string) => {
    const idx = yamanoteStationNames.indexOf(name);
    return idx !== -1 ? `yamanote_${idx}` : null;
};

// 2. 銀座線の駅を生成 (渋谷〜浅草)
const ginzaStationsInfo = [
  { name: "渋谷", ref: getYamanoteId("渋谷") },
  { name: "表参道", x: CENTER_X - 450, y: CENTER_Y + 100 },
  { name: "外苑前", x: CENTER_X - 300, y: CENTER_Y + 150 },
  { name: "赤坂見附", x: CENTER_X - 100, y: CENTER_Y + 200 },
  { name: "溜池山王", x: CENTER_X + 50, y: CENTER_Y + 250 },
  { name: "新橋", ref: getYamanoteId("新橋") },
  { name: "銀座", x: CENTER_X + 450, y: CENTER_Y + 400 },
  { name: "日本橋", x: CENTER_X + 550, y: CENTER_Y + 200 },
  { name: "神田", ref: getYamanoteId("神田") },
  { name: "上野", ref: getYamanoteId("上野") },
  { name: "浅草", x: CENTER_X + 800, y: CENTER_Y - 500 },
];

for (let i = 0; i < ginzaStationsInfo.length; i++) {
  const info = ginzaStationsInfo[i];
  let currentId = info.ref;

  if (currentId) {
      // 既存の駅（乗換駅）
      if (!stations[currentId].lines.includes('ginza')) {
          stations[currentId].lines.push('ginza');
      }
  } else {
      // 新規の駅
      currentId = `ginza_${i}`;
      stations[currentId] = {
          id: currentId,
          name: info.name,
          x: info.x!,
          y: info.y!,
          type: Math.random() > 0.5 ? 'plus' : 'minus',
          lines: ['ginza'],
          next: []
      };
  }

  // 隣接関係を結ぶ（前の駅と）
  if (i > 0) {
      const prevInfo = ginzaStationsInfo[i - 1];
      const prevId = prevInfo.ref || `ginza_${i - 1}`;

      if (!stations[currentId].next.includes(prevId)) stations[currentId].next.push(prevId);
      if (!stations[prevId].next.includes(currentId)) stations[prevId].next.push(currentId);
  }
}

// 3. 丸ノ内線の駅を生成 (池袋〜新宿)
const marunouchiStationsInfo = [
  { name: "池袋", ref: getYamanoteId("池袋") },
  { name: "茗荷谷", x: CENTER_X + 150, y: CENTER_Y - 400 },
  { name: "後楽園", x: CENTER_X + 300, y: CENTER_Y - 250 },
  { name: "御茶ノ水", x: CENTER_X + 450, y: CENTER_Y - 100 },
  { name: "大手町", x: CENTER_X + 600, y: CENTER_Y + 50 },
  { name: "東京", ref: getYamanoteId("東京") },
  { name: "銀座", ref: "ginza_6" }, // 銀座線の銀座駅
  { name: "霞ケ関", x: CENTER_X + 200, y: CENTER_Y + 450 },
  { name: "国会議事堂前", x: CENTER_X, y: CENTER_Y + 350 },
  { name: "赤坂見附", ref: "ginza_3" }, // 銀座線の赤坂見附駅
  { name: "四ツ谷", x: CENTER_X - 300, y: CENTER_Y + 50 },
  { name: "新宿御苑前", x: CENTER_X - 500, y: CENTER_Y - 50 },
  { name: "新宿三丁目", x: CENTER_X - 600, y: CENTER_Y - 100 },
  { name: "新宿", ref: getYamanoteId("新宿") },
];

for (let i = 0; i < marunouchiStationsInfo.length; i++) {
  const info = marunouchiStationsInfo[i];
  let currentId = info.ref;

  if (currentId) {
      // 既存の駅（乗換駅）
      if (!stations[currentId].lines.includes('marunouchi')) {
          stations[currentId].lines.push('marunouchi');
      }
  } else {
      // 新規の駅
      currentId = `marunouchi_${i}`;
      stations[currentId] = {
          id: currentId,
          name: info.name,
          x: info.x!,
          y: info.y!,
          type: Math.random() > 0.5 ? 'plus' : 'minus',
          lines: ['marunouchi'],
          next: []
      };
  }

  // 隣接関係を結ぶ（前の駅と）
  if (i > 0) {
      const prevInfo = marunouchiStationsInfo[i - 1];
      const prevId = prevInfo.ref || `marunouchi_${i - 1}`;

      if (!stations[currentId].next.includes(prevId)) stations[currentId].next.push(prevId);
      if (!stations[prevId].next.includes(currentId)) stations[prevId].next.push(currentId);
  }
}

// 4. 中央線の駅を生成 (東京〜新宿〜高尾方面)
const chuoStationsInfo = [
  { name: "東京", ref: getYamanoteId("東京") },
  { name: "神田", ref: getYamanoteId("神田") },
  { name: "御茶ノ水", ref: "marunouchi_3" },
  { name: "四ツ谷", ref: "marunouchi_10" },
  { name: "新宿", ref: getYamanoteId("新宿") },
  { name: "中野", x: CENTER_X - 850, y: CENTER_Y - 200 },
  { name: "高円寺", x: CENTER_X - 1000, y: CENTER_Y - 250 },
  { name: "阿佐ヶ谷", x: CENTER_X - 1150, y: CENTER_Y - 300 },
  { name: "荻窪", x: CENTER_X - 1300, y: CENTER_Y - 350 },
  { name: "吉祥寺", x: CENTER_X - 1500, y: CENTER_Y - 400 },
  { name: "三鷹", x: CENTER_X - 1700, y: CENTER_Y - 450 },
];

for (let i = 0; i < chuoStationsInfo.length; i++) {
  const info = chuoStationsInfo[i];
  let currentId = info.ref;

  if (currentId) {
      if (!stations[currentId].lines.includes('chuo')) stations[currentId].lines.push('chuo');
  } else {
      currentId = `chuo_${i}`;
      stations[currentId] = {
          id: currentId,
          name: info.name,
          x: info.x!,
          y: info.y!,
          type: Math.random() > 0.5 ? 'plus' : 'minus',
          lines: ['chuo'],
          next: []
      };
  }

  if (i > 0) {
      const prevInfo = chuoStationsInfo[i - 1];
      const prevId = prevInfo.ref || `chuo_${i - 1}`;
      if (!stations[currentId].next.includes(prevId)) stations[currentId].next.push(prevId);
      if (!stations[prevId].next.includes(currentId)) stations[prevId].next.push(currentId);
  }
}

// 5. 小田急線の駅を生成 (新宿〜町田方面)
const odakyuStationsInfo = [
  { name: "新宿", ref: getYamanoteId("新宿") },
  { name: "代々木上原", x: CENTER_X - 800, y: CENTER_Y + 100 },
  { name: "下北沢", x: CENTER_X - 950, y: CENTER_Y + 200 },
  { name: "経堂", x: CENTER_X - 1150, y: CENTER_Y + 300 },
  { name: "成城学園前", x: CENTER_X - 1400, y: CENTER_Y + 450 },
  { name: "登戸", x: CENTER_X - 1600, y: CENTER_Y + 600 },
  { name: "新百合ヶ丘", x: CENTER_X - 1800, y: CENTER_Y + 750 },
  { name: "町田", x: CENTER_X - 2000, y: CENTER_Y + 950 },
];

for (let i = 0; i < odakyuStationsInfo.length; i++) {
  const info = odakyuStationsInfo[i];
  let currentId = info.ref;

  if (currentId) {
      if (!stations[currentId].lines.includes('odakyu')) stations[currentId].lines.push('odakyu');
  } else {
      currentId = `odakyu_${i}`;
      stations[currentId] = {
          id: currentId,
          name: info.name,
          x: info.x!,
          y: info.y!,
          type: Math.random() > 0.5 ? 'plus' : 'minus',
          lines: ['odakyu'],
          next: []
      };
  }

  if (i > 0) {
      const prevInfo = odakyuStationsInfo[i - 1];
      const prevId = prevInfo.ref || `odakyu_${i - 1}`;
      if (!stations[currentId].next.includes(prevId)) stations[currentId].next.push(prevId);
      if (!stations[prevId].next.includes(currentId)) stations[prevId].next.push(currentId);
  }
}

// 6. 京王線の駅を生成 (新宿〜調布方面)
const keioStationsInfo = [
  { name: "新宿", ref: getYamanoteId("新宿") },
  { name: "笹塚", x: CENTER_X - 850, y: CENTER_Y },
  { name: "明大前", x: CENTER_X - 1000, y: CENTER_Y },
  { name: "千歳烏山", x: CENTER_X - 1250, y: CENTER_Y + 50 },
  { name: "調布", x: CENTER_X - 1600, y: CENTER_Y + 100 },
  { name: "府中", x: CENTER_X - 1900, y: CENTER_Y + 150 },
];

for (let i = 0; i < keioStationsInfo.length; i++) {
  const info = keioStationsInfo[i];
  let currentId = info.ref;

  if (currentId) {
      if (!stations[currentId].lines.includes('keio')) stations[currentId].lines.push('keio');
  } else {
      currentId = `keio_${i}`;
      stations[currentId] = {
          id: currentId,
          name: info.name,
          x: info.x!,
          y: info.y!,
          type: Math.random() > 0.5 ? 'plus' : 'minus',
          lines: ['keio'],
          next: []
      };
  }

  if (i > 0) {
      const prevInfo = keioStationsInfo[i - 1];
      const prevId = prevInfo.ref || `keio_${i - 1}`;
      if (!stations[currentId].next.includes(prevId)) stations[currentId].next.push(prevId);
      if (!stations[prevId].next.includes(currentId)) stations[prevId].next.push(currentId);
  }
}

export const MAP_DATA: Station[] = Object.values(stations);
