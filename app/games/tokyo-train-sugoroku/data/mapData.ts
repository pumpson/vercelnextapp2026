// 駅の種別を表す型
// type: 'plus' = プラス駅（お金が増える）
// type: 'minus' = マイナス駅（お金が減る）
// type: 'neutral' = 通常駅（何も起きない）
export type StationType = 'plus' | 'minus' | 'neutral';

// 路線を表す型
export type LineType = 'yamanote' | 'ginza' | 'marunouchi';

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
};

// --- マップデータ作成の設計方針 ---
// 山手線を円形に配置します。中心座標を (500, 500)、半径を 400 とします。
// 山手線の駅は全30駅です。
// 銀座線は渋谷から浅草まで斜めに横断します。
// 丸ノ内線は池袋から新宿、東京を経由するU字型の路線です。
// 駅の隣接関係を手動で設定します。

const CENTER_X = 500;
const CENTER_Y = 500;
const RADIUS = 400;

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
// 渋谷、表参道、外苑前、青山一丁目、赤坂見附、溜池山王、虎ノ門、新橋、銀座、京橋、日本橋、三越前、神田、末広町、上野広小路、上野、稲荷町、田原町、浅草
const ginzaStationsInfo = [
  { name: "渋谷", ref: getYamanoteId("渋谷") },
  { name: "表参道", x: 320, y: 550 },
  { name: "赤坂見附", x: 450, y: 600 },
  { name: "新橋", ref: getYamanoteId("新橋") },
  { name: "銀座", x: 750, y: 700 },
  { name: "日本橋", x: 800, y: 600 },
  { name: "神田", ref: getYamanoteId("神田") },
  { name: "上野", ref: getYamanoteId("上野") },
  { name: "浅草", x: 950, y: 200 },
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
// 池袋、新大塚、茗荷谷、後楽園、本郷三丁目、御茶ノ水、淡路町、大手町、東京、銀座、霞ケ関、国会議事堂前、赤坂見附、四ツ谷、四谷三丁目、新宿御苑前、新宿三丁目、新宿
// 簡略化して主要駅のみ
const marunouchiStationsInfo = [
  { name: "池袋", ref: getYamanoteId("池袋") },
  { name: "後楽園", x: 600, y: 300 },
  { name: "御茶ノ水", x: 700, y: 400 },
  { name: "大手町", x: 800, y: 500 },
  { name: "東京", ref: getYamanoteId("東京") },
  { name: "銀座", ref: "ginza_4" }, // 銀座線の銀座駅
  { name: "霞ケ関", x: 600, y: 700 },
  { name: "赤坂見附", ref: "ginza_2" }, // 銀座線の赤坂見附駅
  { name: "四ツ谷", x: 350, y: 450 },
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

export const MAP_DATA: Station[] = Object.values(stations);
