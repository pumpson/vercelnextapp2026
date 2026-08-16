// 駅の種別を表す型
// type: 'plus' = プラス駅（お金が増える）
// type: 'minus' = マイナス駅（お金が減る）
// type: 'neutral' = 通常駅（何も起きない）
export type StationType = 'plus' | 'minus' | 'neutral';

// 路線を表す型
export type LineType = 'yamanote' | 'ginza' | 'marunouchi' | 'chuo' | 'odakyu' | 'keio' | 'tozai' | 'chiyoda' | 'hanzomon' | 'saikyo' | 'shonan' | 'namboku' | 'denentoshi' | 'toyoko' | 'yokohama' | 'nambu' | 'yurikamome' | 'rinkai' | 'tokaido' | 'yurakucho' | 'ikegami' | 'seibuShinjuku' | 'seibuIkebukuro' | 'keihinTohoku' | 'tohoku' | 'tamaMonorail' | 'tobuTojo' | 'tobuSkytree';

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
  saikyo: '#00977B',     // 埼京線（グリーン）
  shonan: '#E21F26',     // 湘南新宿ライン（赤系）
  namboku: '#00AC9B',    // 南北線（エメラルド）
  denentoshi: '#20A288', // 東急田園都市線（グリーン）
  toyoko: '#DA0442',     // 東急東横線（赤）
  yokohama: '#8CC63F',   // JR横浜線（黄緑色）
  nambu: '#FFD400',      // JR南武線（黄色）
  yurikamome: '#00B4E5', // ゆりかもめ（水色）
  rinkai: '#005D97',     // りんかい線（青）
  tokaido: '#F68B1E',    // 東海道線（オレンジ）
  yurakucho: '#D7C447',  // 有楽町線（ゴールド）
  ikegami: '#EE8EA0',    // 東急池上線（ピンク）
  seibuShinjuku: '#00A499', // 西武新宿線
  seibuIkebukuro: '#FF6700', // 西武池袋線
  keihinTohoku: '#00B2E5', // 京浜東北線（水色）
  tohoku: '#F68B1E',       // 宇都宮線（オレンジ）
  tamaMonorail: '#E55A9B', // 多摩モノレール（ピンク）
  tobuTojo: '#001E62',     // 東武東上線（紺）
  tobuSkytree: '#0065B3',  // 東武スカイツリーライン（青）
};

// --- マップデータ作成の設計方針 ---
// 全体が見やすいよう座標系を広く（キャンバスサイズ 2000x2000 を想定）
const CENTER_X = 1000;
const CENTER_Y = 1000;
const RADIUS = 1200; // 山手線の半径を大きく

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
            // 位置情報が後から提供された場合は更新する
            if (info.x !== undefined && stations[currentId].x === undefined) {
                stations[currentId].x = info.x;
            }
            if (info.y !== undefined && stations[currentId].y === undefined) {
                stations[currentId].y = info.y;
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
// ユーザー要望により、神田〜上野間は山手線（神田→秋葉原→御徒町→上野）の経路に統一する
buildLine('ginza', [
  { name: "渋谷" },
  { name: "表参道", x: CENTER_X - 900, y: CENTER_Y + 200 },
  { name: "外苑前", x: CENTER_X - 600, y: CENTER_Y + 300 },
  { name: "赤坂見附", x: CENTER_X - 200, y: CENTER_Y + 400 },
  { name: "溜池山王", x: CENTER_X + 100, y: CENTER_Y + 500 },
  { name: "新橋" },
  { name: "銀座", x: CENTER_X + 900, y: CENTER_Y + 800 },
  { name: "日本橋", x: CENTER_X + 1100, y: CENTER_Y + 400 },
  { name: "神田" },
  { name: "秋葉原" }, // 並行路線を統一
  { name: "御徒町" }, // 並行路線を統一
  { name: "上野" },
  { name: "浅草", x: CENTER_X + 1600, y: CENTER_Y - 1000 },
]);

// 3. 丸ノ内線の駅を生成 (池袋〜新宿)
buildLine('marunouchi', [
  { name: "池袋" },
  { name: "茗荷谷", x: CENTER_X + 300, y: CENTER_Y - 800 },
  { name: "後楽園", x: CENTER_X + 600, y: CENTER_Y - 500 },
  { name: "御茶ノ水", x: CENTER_X + 900, y: CENTER_Y - 200 },
  { name: "大手町", x: CENTER_X + 1200, y: CENTER_Y + 100 },
  { name: "東京" },
  { name: "銀座" },
  { name: "霞ケ関", x: CENTER_X + 400, y: CENTER_Y + 900 },
  { name: "国会議事堂前", x: CENTER_X, y: CENTER_Y + 700 },
  { name: "赤坂見附" },
  { name: "四ツ谷", x: CENTER_X - 600, y: CENTER_Y + 100 },
  { name: "新宿御苑前", x: CENTER_X - 1000, y: CENTER_Y - 100 },
  { name: "新宿三丁目", x: CENTER_X - 1200, y: CENTER_Y - 200 },
  { name: "新宿" },
]);

// 4. 中央線の駅を生成 (東京〜新宿〜八王子方面)
buildLine('chuo', [
  { name: "東京" },
  { name: "神田" },
  { name: "御茶ノ水" },
  { name: "四ツ谷" },
  { name: "新宿" },
  { name: "中野", x: CENTER_X - 1700, y: CENTER_Y - 400 },
  { name: "高円寺", x: CENTER_X - 2000, y: CENTER_Y - 500 },
  { name: "阿佐ヶ谷", x: CENTER_X - 2300, y: CENTER_Y - 600 },
  { name: "荻窪", x: CENTER_X - 2600, y: CENTER_Y - 700 },
  { name: "吉祥寺", x: CENTER_X - 3000, y: CENTER_Y - 800 },
  { name: "三鷹", x: CENTER_X - 3400, y: CENTER_Y - 900 },
  { name: "国分寺", x: CENTER_X - 3800, y: CENTER_Y - 1000 },
  { name: "立川", x: CENTER_X - 4400, y: CENTER_Y - 1100 },
  { name: "八王子", x: CENTER_X - 5000, y: CENTER_Y - 1200 },
]);

// 5. 小田急線の駅を生成 (新宿〜町田方面)
buildLine('odakyu', [
  { name: "新宿" },
  { name: "代々木上原", x: CENTER_X - 1600, y: CENTER_Y + 200 },
  { name: "下北沢", x: CENTER_X - 1900, y: CENTER_Y + 400 },
  { name: "経堂", x: CENTER_X - 2300, y: CENTER_Y + 600 },
  { name: "成城学園前", x: CENTER_X - 2800, y: CENTER_Y + 900 },
  { name: "登戸", x: CENTER_X - 3200, y: CENTER_Y + 1200 },
  { name: "新百合ヶ丘", x: CENTER_X - 3600, y: CENTER_Y + 1500 },
  { name: "町田", x: CENTER_X - 4000, y: CENTER_Y + 1900 },
  { name: "相模大野", x: CENTER_X - 4200, y: CENTER_Y + 2100 },
  { name: "本厚木", x: CENTER_X - 4800, y: CENTER_Y + 2300 },
  { name: "小田原" }, // 後で東海道線と繋ぐ
]);

// 小田急江ノ島線（相模大野〜片瀬江ノ島）
buildLine('odakyu', [
  { name: "相模大野" },
  { name: "中央林間", x: CENTER_X - 4400, y: CENTER_Y + 2300 },
  { name: "大和", x: CENTER_X - 4600, y: CENTER_Y + 2800 },
  { name: "藤沢" }, // 後で東海道線と繋ぐ
  { name: "片瀬江ノ島", x: CENTER_X - 4800, y: CENTER_Y + 4200 }
]);

// 6. 京王線の駅を生成 (新宿〜八王子方面)
buildLine('keio', [
  { name: "新宿" },
  { name: "笹塚", x: CENTER_X - 1700, y: CENTER_Y },
  { name: "明大前", x: CENTER_X - 2000, y: CENTER_Y },
  { name: "千歳烏山", x: CENTER_X - 2500, y: CENTER_Y + 100 },
  { name: "調布", x: CENTER_X - 3200, y: CENTER_Y + 200 },
  { name: "府中", x: CENTER_X - 3800, y: CENTER_Y + 300 },
  { name: "分倍河原", x: CENTER_X - 4000, y: CENTER_Y + 240 },
  { name: "聖蹟桜ヶ丘", x: CENTER_X - 4200, y: CENTER_Y + 200 },
  { name: "高幡不動", x: CENTER_X - 4600, y: CENTER_Y + 100 },
  { name: "八王子" }, // 中央線と共有
]);

// 京王相模原線
buildLine('keio', [
  { name: "調布" },
  { name: "京王多摩川", x: CENTER_X - 3400, y: CENTER_Y + 400 },
  { name: "京王稲田堤", x: CENTER_X - 3600, y: CENTER_Y + 700 }, // 南武線稲田堤と隣接させる
  { name: "京王多摩センター", x: CENTER_X - 4000, y: CENTER_Y + 1000 },
  { name: "橋本" }
]);
if (stations["京王稲田堤"] && stations["稲田堤"]) {
  if (!stations["京王稲田堤"].next.includes("稲田堤")) stations["京王稲田堤"].next.push("稲田堤");
  if (!stations["稲田堤"].next.includes("京王稲田堤")) stations["稲田堤"].next.push("京王稲田堤");
}

// 7. 東西線 (中野〜西船橋方面)
buildLine('tozai', [
  { name: "中野" },
  { name: "高田馬場" },
  { name: "飯田橋", x: CENTER_X + 200, y: CENTER_Y - 300 },
  { name: "九段下", x: CENTER_X + 500, y: CENTER_Y - 100 },
  { name: "大手町" },
  { name: "日本橋" },
  { name: "茅場町", x: CENTER_X + 1400, y: CENTER_Y + 500 },
  { name: "門前仲町", x: CENTER_X + 1700, y: CENTER_Y + 700 },
  { name: "西船橋", x: CENTER_X + 3000, y: CENTER_Y - 200 },
]);

// 8. 千代田線 (代々木上原〜綾瀬方面)
buildLine('chiyoda', [
  { name: "代々木上原" },
  { name: "表参道" },
  { name: "乃木坂", x: CENTER_X - 700, y: CENTER_Y + 600 },
  { name: "赤坂", x: CENTER_X - 300, y: CENTER_Y + 700 },
  { name: "国会議事堂前" },
  { name: "霞ケ関" },
  { name: "日比谷", x: CENTER_X + 700, y: CENTER_Y + 700 },
  { name: "大手町" },
  { name: "新御茶ノ水", x: CENTER_X + 1000, y: CENTER_Y - 400 }, // 御茶ノ水と近いが別駅とする
  { name: "西日暮里" },
  { name: "北千住", x: CENTER_X + 2000, y: CENTER_Y - 1400 },
  { name: "綾瀬", x: CENTER_X + 2400, y: CENTER_Y - 1600 },
]);

// 9. 半蔵門線 (渋谷〜押上方面)
// 銀座線と表参道〜赤坂見附(永田町)が並走するが、シンプル化のため既存駅を再利用して結ぶ
buildLine('hanzomon', [
  { name: "渋谷" },
  { name: "表参道" },
  { name: "青山一丁目", x: CENTER_X - 500, y: CENTER_Y + 500 },
  { name: "永田町", x: CENTER_X - 100, y: CENTER_Y + 600 }, // 赤坂見附に近いが独立
  { name: "半蔵門", x: CENTER_X + 200, y: CENTER_Y + 300 },
  { name: "九段下" },
  { name: "神保町", x: CENTER_X + 700, y: CENTER_Y - 100 },
  { name: "大手町" },
  { name: "三越前", x: CENTER_X + 1300, y: CENTER_Y + 200 },
  { name: "清澄白河", x: CENTER_X + 1800, y: CENTER_Y + 400 },
  { name: "錦糸町", x: CENTER_X + 2200, y: CENTER_Y - 200 },
  { name: "押上", x: CENTER_X + 2600, y: CENTER_Y - 600 },
]);

// 10. 埼京線 (大崎〜大宮方面)
buildLine('saikyo', [
  { name: "大崎" },
  { name: "恵比寿" },
  { name: "渋谷" },
  { name: "新宿" },
  { name: "池袋" },
  { name: "板橋", x: CENTER_X - 400, y: CENTER_Y - 1600 },
  { name: "十条", x: CENTER_X - 200, y: CENTER_Y - 1900 },
  { name: "赤羽", x: CENTER_X, y: CENTER_Y - 2200 },
  { name: "戸田公園", x: CENTER_X, y: CENTER_Y - 2600 },
  { name: "武蔵浦和", x: CENTER_X, y: CENTER_Y - 3000 },
  { name: "大宮", x: CENTER_X, y: CENTER_Y - 3600 },
]);

// 11. 湘南新宿ライン (横浜〜赤羽方面)
buildLine('shonan', [
  { name: "横浜", x: CENTER_X - 2000, y: CENTER_Y + 3000 },
  { name: "武蔵小杉", x: CENTER_X - 1000, y: CENTER_Y + 2200 },
  { name: "大崎" },
  { name: "恵比寿" },
  { name: "渋谷" },
  { name: "新宿" },
  { name: "池袋" },
  { name: "赤羽" },
  { name: "浦和", x: CENTER_X + 600, y: CENTER_Y - 2800 },
  { name: "大宮" },
]);

// 12. 南北線 (目黒〜赤羽岩淵方面)
buildLine('namboku', [
  { name: "目黒" },
  { name: "白金台", x: CENTER_X + 200, y: CENTER_Y + 1600 },
  { name: "白金高輪", x: CENTER_X + 500, y: CENTER_Y + 1400 },
  { name: "麻布十番", x: CENTER_X + 600, y: CENTER_Y + 1200 },
  { name: "六本木一丁目", x: CENTER_X + 300, y: CENTER_Y + 1000 },
  { name: "溜池山王" },
  { name: "永田町" },
  { name: "四ツ谷" },
  { name: "市ヶ谷", x: CENTER_X - 100, y: CENTER_Y - 100 },
  { name: "飯田橋" },
  { name: "後楽園" },
  { name: "東大前", x: CENTER_X + 700, y: CENTER_Y - 900 },
  { name: "駒込" },
  { name: "王子", x: CENTER_X + 1000, y: CENTER_Y - 1800 },
  { name: "赤羽岩淵", x: CENTER_X + 800, y: CENTER_Y - 2200 },
]);

// 13. 東急田園都市線 (渋谷〜中央林間)
buildLine('denentoshi', [
  { name: "渋谷" },
  { name: "三軒茶屋", x: CENTER_X - 1800, y: CENTER_Y + 700 },
  { name: "二子玉川", x: CENTER_X - 2600, y: CENTER_Y + 1200 },
  { name: "溝の口", x: CENTER_X - 3000, y: CENTER_Y + 1400 },
  { name: "たまプラーザ", x: CENTER_X - 3400, y: CENTER_Y + 1700 },
  { name: "青葉台", x: CENTER_X - 3800, y: CENTER_Y + 2000 },
  { name: "長津田", x: CENTER_X - 4100, y: CENTER_Y + 2200 },
  { name: "中央林間" },
]);

// 14. 東急東横線 (渋谷〜横浜)
buildLine('toyoko', [
  { name: "渋谷" },
  { name: "中目黒", x: CENTER_X - 1400, y: CENTER_Y + 1200 },
  { name: "自由が丘", x: CENTER_X - 1500, y: CENTER_Y + 1700 },
  { name: "武蔵小杉" },
  { name: "日吉", x: CENTER_X - 1200, y: CENTER_Y + 2600 },
  { name: "菊名", x: CENTER_X - 1600, y: CENTER_Y + 2800 },
  { name: "横浜" },
]);

// 15. JR横浜線 (八王子〜横浜)
buildLine('yokohama', [
  { name: "八王子" },
  { name: "橋本", x: CENTER_X - 4600, y: CENTER_Y + 1400 },
  { name: "町田" },
  { name: "長津田" },
  { name: "新横浜", x: CENTER_X - 2200, y: CENTER_Y + 2600 },
  { name: "菊名" },
  { name: "横浜" },
]);

// 16. JR南武線 (立川〜川崎)
buildLine('nambu', [
  { name: "立川" },
  { name: "分倍河原" },
  { name: "稲田堤", x: CENTER_X - 3600, y: CENTER_Y + 900 },
  { name: "登戸" },
  { name: "溝の口" },
  { name: "武蔵小杉" },
  { name: "川崎", x: CENTER_X - 400, y: CENTER_Y + 2600 },
]);

// 17. ゆりかもめ (新橋〜豊洲)
buildLine('yurikamome', [
  { name: "新橋" },
  { name: "汐留", x: CENTER_X + 1200, y: CENTER_Y + 1200 },
  { name: "お台場海浜公園", x: CENTER_X + 1400, y: CENTER_Y + 1800 },
  { name: "台場", x: CENTER_X + 1200, y: CENTER_Y + 2000 },
  { name: "東京国際クルーズターミナル", x: CENTER_X + 1500, y: CENTER_Y + 2300 },
  { name: "東京ビッグサイト", x: CENTER_X + 1800, y: CENTER_Y + 2000 },
  { name: "有明", x: CENTER_X + 2000, y: CENTER_Y + 1800 },
  { name: "豊洲", x: CENTER_X + 2400, y: CENTER_Y + 1200 },
]);

// 18. りんかい線 (大崎〜新木場)
buildLine('rinkai', [
  { name: "大崎" },
  { name: "大井町", x: CENTER_X - 400, y: CENTER_Y + 2000 },
  { name: "品川シーサイド", x: CENTER_X, y: CENTER_Y + 2200 },
  { name: "天王洲アイル", x: CENTER_X + 400, y: CENTER_Y + 2000 },
  { name: "東京テレポート", x: CENTER_X + 1400, y: CENTER_Y + 2200 },
  { name: "国際展示場", x: CENTER_X + 1900, y: CENTER_Y + 1900 }, // 有明の近く
  { name: "新木場", x: CENTER_X + 2600, y: CENTER_Y + 1600 },
]);

// 19. 東海道本線 (東京〜品川〜川崎〜横浜〜大船〜小田原)
buildLine('tokaido', [
  { name: "東京" },
  { name: "新橋" },
  { name: "品川" },
  { name: "川崎" },
  { name: "横浜" },
  { name: "戸塚", x: CENTER_X - 2400, y: CENTER_Y + 3200 },
  { name: "大船", x: CENTER_X - 2600, y: CENTER_Y + 3600 },
  { name: "藤沢", x: CENTER_X - 3000, y: CENTER_Y + 3800 },
  { name: "茅ヶ崎", x: CENTER_X - 3400, y: CENTER_Y + 4000 },
  { name: "平塚", x: CENTER_X - 3800, y: CENTER_Y + 4200 },
  { name: "小田原", x: CENTER_X - 4600, y: CENTER_Y + 4600 },
]);

// 20. 有楽町線 (和光市〜池袋〜飯田橋〜有楽町〜豊洲〜新木場)
buildLine('yurakucho', [
  { name: "和光市", x: CENTER_X - 1600, y: CENTER_Y - 2000 },
  { name: "小竹向原", x: CENTER_X - 800, y: CENTER_Y - 1400 },
  { name: "池袋" },
  { name: "護国寺", x: CENTER_X + 400, y: CENTER_Y - 600 },
  { name: "飯田橋" },
  { name: "市ヶ谷" },
  { name: "有楽町" },
  { name: "月島", x: CENTER_X + 1800, y: CENTER_Y + 1000 },
  { name: "豊洲" },
  { name: "辰巳", x: CENTER_X + 2700, y: CENTER_Y + 1400 },
  { name: "新木場" },
]);

// 21. 東急池上線 (五反田〜蒲田)
buildLine('ikegami', [
  { name: "五反田" },
  { name: "戸越銀座", x: CENTER_X - 600, y: CENTER_Y + 1700 },
  { name: "旗の台", x: CENTER_X - 1000, y: CENTER_Y + 1900 },
  { name: "雪が谷大塚", x: CENTER_X - 900, y: CENTER_Y + 2100 },
  { name: "池上", x: CENTER_X - 700, y: CENTER_Y + 2300 },
  { name: "蒲田", x: CENTER_X - 400, y: CENTER_Y + 2400 },
]);

// 蒲田と川崎（南武線・東海道線）を京浜東北線などのイメージで接続
if (stations["蒲田"] && stations["川崎"]) {
  if (!stations["蒲田"].next.includes("川崎")) stations["蒲田"].next.push("川崎");
  if (!stations["川崎"].next.includes("蒲田")) stations["川崎"].next.push("蒲田");
}

// 22. 西武新宿線 (新宿〜高田馬場〜所沢方面)
buildLine('seibuShinjuku', [
  { name: "新宿" },
  { name: "高田馬場" },
  { name: "鷺ノ宮", x: CENTER_X - 2000, y: CENTER_Y - 900 },
  { name: "上石神井", x: CENTER_X - 2600, y: CENTER_Y - 1200 },
  { name: "田無", x: CENTER_X - 3200, y: CENTER_Y - 1400 },
  { name: "所沢", x: CENTER_X - 4000, y: CENTER_Y - 2000 },
]);

// 23. 西武池袋線 (池袋〜練馬〜所沢〜飯能)
buildLine('seibuIkebukuro', [
  { name: "池袋" },
  { name: "練馬", x: CENTER_X - 1200, y: CENTER_Y - 1400 },
  { name: "石神井公園", x: CENTER_X - 2000, y: CENTER_Y - 1600 },
  { name: "大泉学園", x: CENTER_X - 2600, y: CENTER_Y - 1700 },
  { name: "ひばりヶ丘", x: CENTER_X - 3200, y: CENTER_Y - 1800 },
  { name: "所沢" },
  { name: "入間市", x: CENTER_X - 4800, y: CENTER_Y - 2200 },
  { name: "飯能", x: CENTER_X - 5600, y: CENTER_Y - 2400 },
]);

// 24. 多摩モノレール (上北台〜多摩センター)
buildLine('tamaMonorail', [
  { name: "上北台", x: CENTER_X - 4600, y: CENTER_Y - 1600 },
  { name: "玉川上水", x: CENTER_X - 4600, y: CENTER_Y - 1400 },
  { name: "立川北", x: CENTER_X - 4400, y: CENTER_Y - 1300 },
  { name: "立川" },
  { name: "立川南", x: CENTER_X - 4400, y: CENTER_Y - 900 },
  { name: "高幡不動" },
  { name: "多摩センター", x: CENTER_X - 4000, y: CENTER_Y + 1000 } // 京王多摩センターと共有でもOKだが名前を分ける場合は繋ぐ
]);
if (stations["多摩センター"] && stations["京王多摩センター"]) {
  if (!stations["多摩センター"].next.includes("京王多摩センター")) stations["多摩センター"].next.push("京王多摩センター");
  if (!stations["京王多摩センター"].next.includes("多摩センター")) stations["京王多摩センター"].next.push("多摩センター");
}

// 25. 京浜東北線 (大宮〜横浜)
buildLine('keihinTohoku', [
  { name: "大宮" },
  { name: "さいたま新都心", x: CENTER_X + 200, y: CENTER_Y - 3200 },
  { name: "浦和" },
  { name: "南浦和", x: CENTER_X + 400, y: CENTER_Y - 2600 },
  { name: "蕨", x: CENTER_X + 200, y: CENTER_Y - 2400 },
  { name: "赤羽" },
  { name: "東十条", x: CENTER_X + 400, y: CENTER_Y - 2000 },
  { name: "王子" },
  { name: "上中里", x: CENTER_X + 1200, y: CENTER_Y - 1600 },
  { name: "田端" },
  { name: "西日暮里" },
  { name: "日暮里" },
  { name: "鶯谷" },
  { name: "上野" },
  { name: "御徒町" },
  { name: "秋葉原" },
  { name: "神田" },
  { name: "東京" },
  { name: "有楽町" },
  { name: "新橋" },
  { name: "浜松町" },
  { name: "田町" },
  { name: "高輪ゲートウェイ" },
  { name: "品川" },
  { name: "大井町" },
  { name: "大森", x: CENTER_X - 400, y: CENTER_Y + 2200 },
  { name: "蒲田" },
  { name: "川崎" },
  { name: "鶴見", x: CENTER_X - 1000, y: CENTER_Y + 2800 },
  { name: "新子安", x: CENTER_X - 1400, y: CENTER_Y + 2900 },
  { name: "東神奈川", x: CENTER_X - 1800, y: CENTER_Y + 3000 },
  { name: "横浜" }
]);

// 26. 東北本線・宇都宮線 (大宮〜宇都宮)
buildLine('tohoku', [
  { name: "大宮" },
  { name: "蓮田", x: CENTER_X + 400, y: CENTER_Y - 4000 },
  { name: "久喜", x: CENTER_X + 800, y: CENTER_Y - 4400 },
  { name: "古河", x: CENTER_X + 1200, y: CENTER_Y - 4800 },
  { name: "小山", x: CENTER_X + 1600, y: CENTER_Y - 5200 },
  { name: "宇都宮", x: CENTER_X + 2000, y: CENTER_Y - 6000 }
]);

// 27. 東武東上線 (池袋〜森林公園)
buildLine('tobuTojo', [
  { name: "池袋" },
  { name: "大山", x: CENTER_X - 400, y: CENTER_Y - 1000 },
  { name: "上板橋", x: CENTER_X - 800, y: CENTER_Y - 1400 },
  { name: "成増", x: CENTER_X - 1200, y: CENTER_Y - 1800 },
  { name: "和光市" },
  { name: "朝霞台", x: CENTER_X - 2000, y: CENTER_Y - 2200 },
  { name: "志木", x: CENTER_X - 2400, y: CENTER_Y - 2400 },
  { name: "ふじみ野", x: CENTER_X - 2800, y: CENTER_Y - 2800 },
  { name: "川越", x: CENTER_X - 3200, y: CENTER_Y - 3200 },
  { name: "坂戸", x: CENTER_X - 3600, y: CENTER_Y - 3600 },
  { name: "東松山", x: CENTER_X - 4000, y: CENTER_Y - 4000 },
  { name: "森林公園", x: CENTER_X - 4400, y: CENTER_Y - 4400 }
]);

// 28. 東武スカイツリーライン・伊勢崎線 (浅草〜東武動物公園)
buildLine('tobuSkytree', [
  { name: "浅草" },
  { name: "とうきょうスカイツリー", x: CENTER_X + 2000, y: CENTER_Y - 1000 },
  { name: "押上" }, // 隣接させる
  { name: "曳舟", x: CENTER_X + 2200, y: CENTER_Y - 1200 },
  { name: "北千住" },
  { name: "西新井", x: CENTER_X + 1800, y: CENTER_Y - 1800 },
  { name: "草加", x: CENTER_X + 2000, y: CENTER_Y - 2200 },
  { name: "新越谷", x: CENTER_X + 2200, y: CENTER_Y - 2600 },
  { name: "越谷", x: CENTER_X + 2400, y: CENTER_Y - 2800 },
  { name: "せんげん台", x: CENTER_X + 2800, y: CENTER_Y - 3200 },
  { name: "春日部", x: CENTER_X + 3200, y: CENTER_Y - 3600 },
  { name: "東武動物公園", x: CENTER_X + 3600, y: CENTER_Y - 4000 }
]);
if (stations["とうきょうスカイツリー"] && stations["押上"]) {
  if (!stations["とうきょうスカイツリー"].next.includes("押上")) stations["とうきょうスカイツリー"].next.push("押上");
  if (!stations["押上"].next.includes("とうきょうスカイツリー")) stations["押上"].next.push("とうきょうスカイツリー");
}

export const MAP_DATA: Station[] = Object.values(stations);
