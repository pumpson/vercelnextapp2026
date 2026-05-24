import { initialMockExpenses } from './types';
import ExpenseDashboard from './ExpenseDashboard';
import Link from 'next/link';

/**
 * ページのメタデータ（SEOやブラウザのタブに表示される情報）を設定します。
 * これはサーバーコンポーネントでのみエクスポート可能です。
 */
export const metadata = {
  title: 'Expense Tracker | Next.js 学習アプリ',
  description: 'Next.jsの機能を学習するための家計簿ダッシュボード',
};

/**
 * Expense Tracker のメインページ (Server Component)
 *
 * App Routerでは、デフォルトで全てのコンポーネントがServer Componentになります。
 * サーバー側でデータを取得（今回はモックデータですが、本来はDBやAPI）し、
 * そのデータをClient Componentに渡す役割を持ちます。
 */
export default function ExpenseTrackerPage() {
  // --- サーバーサイドでのデータ取得のシミュレーション ---
  // 実際のアプリではここで await fetch(...) や DB検索を行います。
  // 今回は types.ts で定義したモックデータをそのまま使用します。
  const data = initialMockExpenses;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            Expense Tracker
          </h1>
          <p className="text-gray-400 mt-1">Next.js 統合学習ダッシュボード</p>
        </div>

        {/* トップページへ戻るリンク */}
        <Link
          href="/"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700"
        >
          トップに戻る
        </Link>
      </div>

      {/*
        ここで Client Component (ExpenseDashboard) を呼び出します。
        サーバー側で取得した `data` を `initialExpenses` というprops（引数）として渡します。
      */}
      <ExpenseDashboard initialExpenses={data} />

      <div className="max-w-4xl mx-auto mt-16 p-6 bg-gray-900 border border-gray-800 rounded-xl">
        <h3 className="text-lg font-medium text-white mb-2">💡 学習ポイント</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          このページは <strong>Server Component</strong> です。サーバー側で <code>initialMockExpenses</code> を読み込み、
          子コンポーネントである <strong>Client Component</strong> (<code>ExpenseDashboard</code>) へと <code>props</code> でデータを渡しています。
          詳しいコードの解説はリポジトリ内の <code>docs/EXPENSE_TRACKER_GUIDE.md</code> をご覧ください。
        </p>
      </div>
    </div>
  );
}
