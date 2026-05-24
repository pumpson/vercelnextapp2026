'use client'; // このコンポーネントはユーザーの入力（イベント）を扱うため、クライアントコンポーネントとして宣言します。

import { useState } from 'react';
import { ExpenseCategory } from '../types';

/**
 * ExpenseForm コンポーネントが受け取る Props (プロップス) の型定義です。
 * Propsは、親コンポーネントから子コンポーネントへ渡されるデータや関数のことです。
 */
interface ExpenseFormProps {
  // 支出を追加するための関数を親コンポーネントから受け取ります。
  onAddExpense: (title: string, amount: number, category: ExpenseCategory, date: string) => void;
}

// 利用可能なカテゴリのリスト。セレクトボックスの選択肢として使います。
const CATEGORIES: ExpenseCategory[] = ['食費', '交通費', '日用品', '娯楽', 'その他'];

/**
 * 新しい支出を入力して追加するためのフォームコンポーネントです。
 */
export default function ExpenseForm({ onAddExpense }: ExpenseFormProps) {
  // --- フォームの入力状態を管理する useState ---
  // ユーザーが入力した内容を React の状態（State）として保持します。
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('食費');
  // 日付の初期値は今日の日付（YYYY-MM-DD）に設定します。
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  /**
   * フォームが送信（Submit）された時に呼ばれる関数です。
   */
  const handleSubmit = (e: React.FormEvent) => {
    // フォームのデフォルトの動作（ページリロードなど）を防ぎます。
    e.preventDefault();

    // 未入力の項目があれば処理を中断します。
    if (!title || !amount) return;

    // 親から渡された onAddExpense 関数を呼び出して、データを追加します。
    // amount は文字列として保持されているので、数値（Number）に変換して渡します。
    onAddExpense(title, Number(amount), category, date);

    // 追加後は、入力フォームを初期状態にリセットします。
    setTitle('');
    setAmount('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-white">新しい支出を追加</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 日付入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* カテゴリ選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">カテゴリ</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 内容（タイトル）入力 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-400 mb-1">内容</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: スーパーで食材購入"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* 金額入力 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-400 mb-1">金額 (円)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例: 1500"
            min="1"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          追加する
        </button>
      </div>
    </form>
  );
}
