export interface JourneyRecord {
  id: string; // 記録の一意のID
  date: string; // 乗車日 (YYYY-MM-DD形式を想定)
  departureStation: string; // 乗車駅
  arrivalStation: string; // 降車駅
  lineName: string; // 路線名
  fare: number; // 通常運賃
  memo: string; // メモ
}

export interface DayRecord {
  dayNumber: number; // 何日目か (1, 2, 3...)
  records: JourneyRecord[]; // その日の乗車記録の配列
}

export interface PassRecord {
  id: string; // パスの一意のID
  name: string; // パスの名前 (例: 秋の乗り放題パス 2023)
  price: number; // パスの購入金額
  totalDays: number; // パスの有効日数 (例: 3, 5)
  days: DayRecord[]; // 日別の記録
  createdAt: number; // 作成日時 (タイムスタンプ)
}
