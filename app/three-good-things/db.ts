import Dexie, { type EntityTable } from 'dexie';

/**
 * DailyEntry インターフェース
 * 1日分の「良いこと」を保持するデータ構造です。
 */
interface DailyEntry {
  id: string;      // UUID (一意の識別子)
  date: string;    // 'YYYY-MM-DD' 形式の日付 (日付での検索に使用)
  thing1: string;  // 1つ目の良いこと
  thing2: string;  // 2つ目の良いこと
  thing3: string;  // 3つ目の良いこと
  createdAt: number; // 作成時のタイムスタンプ
  updatedAt: number; // 更新時のタイムスタンプ
}

/**
 * Dexie データベース インスタンスの設定
 * 'ThreeGoodThingsDB' という名前の IndexedDB データベースを作成します。
 */
const db = new Dexie('ThreeGoodThingsDB') as Dexie & {
  entries: EntityTable<DailyEntry, 'id'>; // 'entries' テーブルの定義
};

/**
 * データベース スキーマの宣言
 * version(1) はスキーマのバージョンです。将来的に変更が必要な場合は上げます。
 * stores 内の定義はインデックスを作成するフィールドを指定します。
 * 'id' が主キー、'date' と 'createdAt' での検索・ソートを高速化します。
 */
db.version(1).stores({
  entries: 'id, date, createdAt'
});

export type { DailyEntry };
export { db };
