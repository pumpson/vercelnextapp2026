'use client'; // このコンポーネントはカスタムフックや状態管理を使用するため、Client Componentです。

import { Expense } from './types';
import { useExpenseManager } from './useExpenseManager';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';

/**
 * ExpenseDashboard コンポーネント (Client Component)
 *
 * サーバーから受け取った初期データを元に、UIを組み立てる「司令塔」の役割を果たします。
 * ここでカスタムフックを呼び出し、状態や関数を各子コンポーネントに配ります。
 */
export default function ExpenseDashboard({ initialExpenses }: { initialExpenses: Expense[] }) {
  // カスタムフックを呼び出して、必要な状態と関数を取り出します。
  const {
    expenses,
    isMounted,
    addExpense,
    deleteExpense,
    totalAmount,
    expensesByCategory,
  } = useExpenseManager(initialExpenses);

  // マウント前（SSR中）は、Hydrationエラー（サーバーとクライアントでの表示のズレ）を防ぐために
  // ローディング表示や空の枠を表示することが一般的です。
  if (!isMounted) {
    return <div className="text-center p-10 text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 1. 総合計の表示エリア */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-8 rounded-3xl shadow-xl mb-8 border border-blue-800 text-center">
        <h2 className="text-blue-200 text-lg font-medium mb-2">総支出額</h2>
        <p className="text-5xl font-bold text-white tracking-tight">
          ¥{totalAmount.toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側: カテゴリ別の集計グラフ（今回はシンプルなリスト表示）と入力フォーム */}
        <div className="lg:col-span-1 space-y-8">

          {/* カテゴリ別集計の表示 */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">カテゴリ別</h3>
            <div className="space-y-3">
              {Object.entries(expensesByCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-gray-400">{category}</span>
                  <span className="text-white font-medium">¥{amount.toLocaleString()}</span>
                </div>
              ))}
              {Object.keys(expensesByCategory).length === 0 && (
                <p className="text-sm text-gray-500">データがありません</p>
              )}
            </div>
          </div>

          {/* 入力フォームコンポーネント。追加用の関数をpropsとして渡します */}
          <ExpenseForm onAddExpense={addExpense} />
        </div>

        {/* 右側: 支出履歴リスト */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 rounded-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 px-2">支出履歴</h3>
            {/* リストコンポーネント。データ配列と削除用の関数をpropsとして渡します */}
            <ExpenseList expenses={expenses} onDelete={deleteExpense} />
          </div>
        </div>
      </div>
    </div>
  );
}
