// このファイルでは、Expense Tracker（家計簿アプリ）で使用するデータの型定義と、
// サーバーコンポーネントで読み込むための初期モックデータ（ダミーデータ）を定義しています。

/**
 * 支出カテゴリを表すユニオン型です。
 * あらかじめ決められた文字列のみを許可することで、タイポ（入力ミス）を防ぎます。
 */
export type ExpenseCategory = '食費' | '交通費' | '日用品' | '娯楽' | 'その他';

/**
 * 1つの支出データを表す型定義です。
 * TypeScriptの interface を使うことで、オブジェクトが持つべきプロパティとその型を明確にします。
 */
export interface Expense {
  // 支出を一意に識別するためのID (通常はUUIDやデータベースの主キーなどを指定します)
  id: string;
  // 支出の日付 (YYYY-MM-DD形式の文字列を想定)
  date: string;
  // 何にお金を使ったかのタイトル
  title: string;
  // 金額
  amount: number;
  // 支出のカテゴリ
  category: ExpenseCategory;
}

/**
 * アプリの初期状態として表示するためのモック（ダミー）データです。
 * 実際のアプリでは、このデータをデータベースや外部APIから取得しますが、
 * 今回はNext.jsのサーバーコンポーネントの動きを学ぶために、固定の配列を用意します。
 */
export const initialMockExpenses: Expense[] = [
  {
    id: 'mock-1',
    date: new Date().toISOString().split('T')[0], // 今日の日付を YYYY-MM-DD 形式で取得
    title: 'スーパーでの買い物',
    amount: 3500,
    category: '食費',
  },
  {
    id: 'mock-2',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // 昨日の日付
    title: '電車代',
    amount: 480,
    category: '交通費',
  },
  {
    id: 'mock-3',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], // 一昨日の日付
    title: '映画のチケット',
    amount: 2000,
    category: '娯楽',
  },
];
