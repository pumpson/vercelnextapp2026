import { Expense } from '../types';
import ExpenseItem from './ExpenseItem';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

/**
 * ExpenseList コンポーネント
 *
 * 複数の ExpenseItem をまとめて表示するリストコンポーネントです。
 */
export default function ExpenseList({ expenses, onDelete }: ExpenseListProps) {
  // データが1件もない場合の表示
  if (expenses.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-800 rounded-2xl border border-gray-700">
        <p className="text-gray-400">支出データがありません。</p>
        <p className="text-sm text-gray-500 mt-2">上のフォームから新しい支出を追加してください。</p>
      </div>
    );
  }

  // データがある場合は、map関数を使って配列のデータをもとに ExpenseItem を繰り返し描画します
  return (
    <div className="space-y-2">
      {expenses.map((expense) => (
        <ExpenseItem
          key={expense.id} // Reactがリストの要素を追跡するために一意の key が必要です
          expense={expense}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
