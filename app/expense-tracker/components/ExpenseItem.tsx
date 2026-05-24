import { Expense } from '../types';

/**
 * 1件の支出データを表示するためのコンポーネントのProps型定義。
 */
interface ExpenseItemProps {
  // 表示する支出データそのもの
  expense: Expense;
  // 削除ボタンが押された時に呼ばれる関数。IDを引数として親に伝えます。
  onDelete: (id: string) => void;
}

/**
 * ExpenseItem コンポーネント
 *
 * リストの中の「1行」を担当する小さなコンポーネントです。
 * このようにコンポーネントを細かく分けることで、コードが見やすくなり、
 * 他の場所でも再利用しやすくなります。
 */
export default function ExpenseItem({ expense, onDelete }: ExpenseItemProps) {
  // カテゴリごとに見た目を変えるための色定義
  const categoryColors: Record<string, string> = {
    食費: 'bg-green-900 text-green-300 border-green-700',
    交通費: 'bg-blue-900 text-blue-300 border-blue-700',
    日用品: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    娯楽: 'bg-purple-900 text-purple-300 border-purple-700',
    その他: 'bg-gray-700 text-gray-300 border-gray-600',
  };

  const colorClass = categoryColors[expense.category] || categoryColors['その他'];

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700 mb-3 hover:border-gray-500 transition-colors">
      <div className="flex items-center gap-4">
        {/* カテゴリのラベル */}
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
          {expense.category}
        </span>

        {/* 内容と日付 */}
        <div>
          <h3 className="text-white font-medium">{expense.title}</h3>
          <p className="text-gray-400 text-sm">{expense.date}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* 金額の表示。toLocaleString()でカンマ区切りにします */}
        <span className="text-xl font-bold text-white">
          ¥{expense.amount.toLocaleString()}
        </span>

        {/* 削除ボタン。クリックされたら親から渡された onDelete 関数に自身のIDを渡して実行します */}
        <button
          onClick={() => onDelete(expense.id)}
          className="text-gray-500 hover:text-red-400 transition-colors p-2"
          aria-label="削除"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
