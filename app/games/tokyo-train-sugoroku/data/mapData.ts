// 駅の種別を表す型
// type: 'plus' = プラス駅（お金が増える）
// type: 'minus' = マイナス駅（お金が減る）
// type: 'neutral' = 通常駅（何も起きない）
export type StationType = 'plus' | 'minus' | 'neutral';

// 路線を表す型
export type LineType = 'yamanote' | 'ginza' | 'marunouchi' | 'chuo' | 'odakyu' | 'keio' | 'tozai' | 'chiyoda' | 'hanzomon';

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
  tozai: '#00A7DB',      // 東京メトロ東西線（スカイブルー）
  chiyoda: '#009944',    // 東京メトロ千代田線（グリーン）
  hanzomon: '#8F76D6',   // 東京メトロ半蔵門線（パープル）
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

// ユーティリティ：名前から既存の駅IDを取得
const getStationIdByName = (name: string) => {
    const entry = Object.entries(stations).find(([id, station]) => station.name === name);
    return entry ? entry[0] : null;
};


// 共通化のためのヘルパー関数
// linesを追加し、必要なら新規駅を作り、隣接関係を結ぶ
const buildLine = (lineType: LineType, stationsInfo: {name: string, x?: number, y?: number}[]) => {
    for (let i = 0; i < stationsInfo.length; i++) {
        const info = stationsInfo[i];
        let currentId = getStationIdByName(info.name);

        if (currentId) {
            // 既存の駅（乗換駅）
            if (!stations[currentId].lines.includes(lineType)) {
                stations[currentId].lines.push(lineType);
            }
        } else {
            // 新規の駅
            currentId = `${lineType}_${i}`;
            stations[currentId] = {
                id: currentId,
                name: info.name,
                x: info.x!,
                y: info.y!,
                type: Math.random() > 0.5 ? 'plus' : 'minus',
                lines: [lineType],
                next: []
            };
        }

        // 隣接関係を結ぶ（前の駅と）
        if (i > 0) {
            const prevInfo = stationsInfo[i - 1];
            const prevId = getStationIdByName(prevInfo.name) || `${lineType}_${i - 1}`;

            if (!stations[currentId].next.includes(prevId)) stations[currentId].next.push(prevId);
            if (!stations[prevId].next.includes(currentId)) stations[prevId].next.push(currentId);
        }
    }
}


// 2. 銀座線の駅を生成 (渋谷〜浅草)
buildLine('ginza', [
  { name: "渋谷" },
  { name: "表参道", x: CENTER_X - 450, y: CENTER_Y + 100 },
  { name: "外苑前", x: CENTER_X - 300, y: CENTER_Y + 150 },
  { name: "赤坂見附", x: CENTER_X - 100, y: CENTER_Y + 200 },
  { name: "溜池山王", x: CENTER_X + 50, y: CENTER_Y + 250 },
  { name: "新橋" },
  { name: "銀座", x: CENTER_X + 450, y: CENTER_Y + 400 },
  { name: "日本橋", x: CENTER_X + 550, y: CENTER_Y + 200 },
  { name: "神田" },
  { name: "上野" },
  { name: "浅草", x: CENTER_X + 800, y: CENTER_Y - 500 },
]);

// 3. 丸ノ内線の駅を生成 (池袋〜新宿)
buildLine('marunouchi', [
  { name: "池袋" },
  { name: "茗荷谷", x: CENTER_X + 150, y: CENTER_Y - 400 },
  { name: "後楽園", x: CENTER_X + 300, y: CENTER_Y - 250 },
  { name: "御茶ノ水", x: CENTER_X + 450, y: CENTER_Y - 100 },
  { name: "大手町", x: CENTER_X + 600, y: CENTER_Y + 50 },
  { name: "東京" },
  { name: "銀座" },
  { name: "霞ケ関", x: CENTER_X + 200, y: CENTER_Y + 450 },
  { name: "国会議事堂前", x: CENTER_X, y: CENTER_Y + 350 },
  { name: "赤坂見附" },
  { name: "四ツ谷", x: CENTER_X - 300, y: CENTER_Y + 50 },
  { name: "新宿御苑前", x: CENTER_X - 500, y: CENTER_Y - 50 },
  { name: "新宿三丁目", x: CENTER_X - 600, y: CENTER_Y - 100 },
  { name: "新宿" },
]);

// 4. 中央線の駅を生成 (東京〜新宿〜高尾方面)
buildLine('chuo', [
  { name: "東京" },
  { name: "神田" },
  { name: "御茶ノ水" },
  { name: "四ツ谷" },
  { name: "新宿" },
  { name: "中野", x: CENTER_X - 850, y: CENTER_Y - 200 },
  { name: "高円寺", x: CENTER_X - 1000, y: CENTER_Y - 250 },
  { name: "阿佐ヶ谷", x: CENTER_X - 1150, y: CENTER_Y - 300 },
  { name: "荻窪", x: CENTER_X - 1300, y: CENTER_Y - 350 },
  { name: "吉祥寺", x: CENTER_X - 1500, y: CENTER_Y - 400 },
  { name: "三鷹", x: CENTER_X - 1700, y: CENTER_Y - 450 },
]);

// 5. 小田急線の駅を生成 (新宿〜町田方面)
buildLine('odakyu', [
  { name: "新宿" },
  { name: "代々木上原", x: CENTER_X - 800, y: CENTER_Y + 100 },
  { name: "下北沢", x: CENTER_X - 950, y: CENTER_Y + 200 },
  { name: "経堂", x: CENTER_X - 1150, y: CENTER_Y + 300 },
  { name: "成城学園前", x: CENTER_X - 1400, y: CENTER_Y + 450 },
  { name: "登戸", x: CENTER_X - 1600, y: CENTER_Y + 600 },
  { name: "新百合ヶ丘", x: CENTER_X - 1800, y: CENTER_Y + 750 },
  { name: "町田", x: CENTER_X - 2000, y: CENTER_Y + 950 },
]);

// 6. 京王線の駅を生成 (新宿〜調布方面)
buildLine('keio', [
  { name: "新宿" },
  { name: "笹塚", x: CENTER_X - 850, y: CENTER_Y },
  { name: "明大前", x: CENTER_X - 1000, y: CENTER_Y },
  { name: "千歳烏山", x: CENTER_X - 1250, y: CENTER_Y + 50 },
  { name: "調布", x: CENTER_X - 1600, y: CENTER_Y + 100 },
  { name: "府中", x: CENTER_X - 1900, y: CENTER_Y + 150 },
]);

// 7. 東西線 (中野〜西船橋方面)
buildLine('tozai', [
  { name: "中野" },
  { name: "高田馬場" },
  { name: "飯田橋", x: CENTER_X + 100, y: CENTER_Y - 150 },
  { name: "九段下", x: CENTER_X + 250, y: CENTER_Y - 50 },
  { name: "大手町" },
  { name: "日本橋" },
  { name: "茅場町", x: CENTER_X + 700, y: CENTER_Y + 250 },
  { name: "門前仲町", x: CENTER_X + 850, y: CENTER_Y + 350 },
  { name: "西船橋", x: CENTER_X + 1500, y: CENTER_Y - 100 },
]);

// 8. 千代田線 (代々木上原〜綾瀬方面)
buildLine('chiyoda', [
  { name: "代々木上原" },
  { name: "表参道" },
  { name: "乃木坂", x: CENTER_X - 350, y: CENTER_Y + 300 },
  { name: "赤坂", x: CENTER_X - 150, y: CENTER_Y + 350 },
  { name: "国会議事堂前" },
  { name: "霞ケ関" },
  { name: "日比谷", x: CENTER_X + 350, y: CENTER_Y + 350 },
  { name: "大手町" },
  { name: "新御茶ノ水", x: CENTER_X + 500, y: CENTER_Y - 200 }, // 御茶ノ水と近いが別駅とする
  { name: "西日暮里" },
  { name: "北千住", x: CENTER_X + 1000, y: CENTER_Y - 700 },
  { name: "綾瀬", x: CENTER_X + 1200, y: CENTER_Y - 800 },
]);

// 9. 半蔵門線 (渋谷〜押上方面)
// 銀座線と表参道〜赤坂見附(永田町)が並走するが、シンプル化のため既存駅を再利用して結ぶ
buildLine('hanzomon', [
  { name: "渋谷" },
  { name: "表参道" },
  { name: "青山一丁目", x: CENTER_X - 250, y: CENTER_Y + 250 },
  { name: "永田町", x: CENTER_X - 50, y: CENTER_Y + 300 }, // 赤坂見附に近いが独立
  { name: "半蔵門", x: CENTER_X + 100, y: CENTER_Y + 150 },
  { name: "九段下" },
  { name: "神保町", x: CENTER_X + 350, y: CENTER_Y - 50 },
  { name: "大手町" },
  { name: "三越前", x: CENTER_X + 650, y: CENTER_Y + 100 },
  { name: "清澄白河", x: CENTER_X + 900, y: CENTER_Y + 200 },
  { name: "錦糸町", x: CENTER_X + 1100, y: CENTER_Y - 100 },
  { name: "押上", x: CENTER_X + 1300, y: CENTER_Y - 300 },
]);

export const MAP_DATA: Station[] = Object.values(stations);
