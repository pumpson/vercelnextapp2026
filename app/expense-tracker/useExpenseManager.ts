import { useState, useEffect, useMemo } from 'react';
import { Expense, ExpenseCategory } from './types';

// ローカルストレージにデータを保存する際のキー名です。
// 固定の文字列を変数にしておくことで、タイプミスによるバグを防ぎます。
const LOCAL_STORAGE_KEY = 'expense-tracker-data';

/**
 * カスタムフック `useExpenseManager`
 *
 * コンポーネント（見た目）から、「状態管理」や「ロジック（計算やデータ保存）」を分離するための関数です。
 * これにより、コンポーネントがスッキリし、他の場所でも同じロジックを使い回せるようになります（再利用性の向上）。
 *
 * @param initialExpenses サーバーコンポーネント等から渡される初期データ
 */
export function useExpenseManager(initialExpenses: Expense[]) {
  // --- 1. 状態管理 (useState) ---
  // expenses: 現在の支出データの配列を保持します。
  // 初期値は引数で受け取った initialExpenses です。
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  // マウント完了フラグ: クライアントサイドでのHydrationエラーを防ぐための仕組みです。
  // useEffectが走る（＝ブラウザで実行されている）まで true になりません。
  const [isMounted, setIsMounted] = useState(false);

  // --- 2. 副作用と初期化 (useEffect) ---
  // useEffectは「コンポーネントが画面に表示された後」や「特定の値が変わった時」に実行される処理を書きます。
  useEffect(() => {
    // コンポーネントがマウント（画面に表示）されたことを記録します。
    setIsMounted(true);

    // ブラウザのローカルストレージから保存されているデータを読み込みます。
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        // 保存されている文字列データ(JSON)を、JavaScriptの配列オブジェクトに戻します(parse)。
        const parsedData: Expense[] = JSON.parse(savedData);
        // ローカルストレージにデータがあれば、状態をそれで上書きします。
        setExpenses(parsedData);
      } catch (error) {
        console.error('ローカルストレージのデータ解析に失敗しました', error);
      }
    }
    // 第二引数に空の配列 [] を渡すことで、このuseEffectは「最初の一度だけ」実行されます。
  }, []);

  // --- 3. データの保存 (useEffect) ---
  // 支出データ(expenses)が更新されるたびに、自動的にローカルストレージに保存する処理です。
  useEffect(() => {
    // まだマウントされていない（＝サーバー側でのレンダリング中など）場合は何もしません。
    if (!isMounted) return;

    // 現在の支出データ配列をJSON文字列に変換(stringify)して保存します。
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expenses));

    // 第二引数に [expenses, isMounted] を指定しているため、
    // これらの値のどちらかが変化するたびにこのuseEffectが実行されます。
  }, [expenses, isMounted]);

  // --- 4. ロジック関数 (追加・削除) ---

  /**
   * 新しい支出を追加する関数です。
   * 新しいデータを作成し、既存のデータ配列の先頭に追加します。
   */
  const addExpense = (title: string, amount: number, category: ExpenseCategory, date: string) => {
    const newExpense: Expense = {
      // 簡易的なユニークIDとして、現在のタイムスタンプと乱数を組み合わせて作成します。
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      title,
      amount,
      category,
      date,
    };

    // setExpenses を使って状態を更新します。
    // 過去の状態(prev)の先頭に新しいデータを入れ、その後に過去のデータを展開(...prev)しています。
    setExpenses((prev) => [newExpense, ...prev]);
  };

  /**
   * 指定したIDの支出データを削除する関数です。
   */
  const deleteExpense = (id: string) => {
    // filterメソッドを使い、指定されたID「以外」のデータだけを残した新しい配列を作って状態を更新します。
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  };

  // --- 5. 計算ロジック (useMemo) ---
  // useMemoは、計算結果を「記憶(キャッシュ)」するためのフックです。
  // expenses が変化した時だけ再計算され、無駄な計算処理を省きます。

  /**
   * 全支出の合計金額を計算します。
   */
  const totalAmount = useMemo(() => {
    // reduceメソッドで、配列内のすべての amount を足し合わせます。初期値は 0 です。
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  /**
   * カテゴリ別の合計金額を計算します。
   * 返り値の例: { '食費': 3500, '交通費': 480 }
   */
  const expensesByCategory = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      // まだそのカテゴリの合計値がオブジェクトに存在しなければ、0で初期化します。
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      // そのカテゴリの合計値に、今回の支出金額を足します。
      acc[expense.category] += expense.amount;
      return acc;
    }, {} as Record<ExpenseCategory, number>);
  }, [expenses]);

  // --- 6. フックからの返り値 ---
  // コンポーネント側で使いたい状態や関数をオブジェクトにまとめて返します。
  return {
    expenses,
    isMounted,
    addExpense,
    deleteExpense,
    totalAmount,
    expensesByCategory,
  };
}
