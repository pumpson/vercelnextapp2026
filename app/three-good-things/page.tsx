'use client';

import React, { useState } from 'react';
import { Sun, Book, Sparkles, Home } from 'lucide-react';
import Link from 'next/link';
import DailyEntryForm from './components/DailyEntryForm';
import HistoryList from './components/HistoryList';

/**
 * ThreeGoodThingsPage コンポーネント
 * アプリケーションのメインエントリーポイントです。
 * ヘッダー、メインコンテンツ（フォームまたは履歴）、ボトムナビゲーションを構成します。
 */
export default function ThreeGoodThingsPage() {
  /**
   * activeTab ステート
   * 'today': 今日の記録フォームを表示
   * 'history': 過去の履歴一覧を表示
   */
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      {/* ヘッダーセクション */}
      <header className="bg-white text-orange-600 p-4 shadow-sm sticky top-0 z-10 border-b border-orange-100 flex items-center justify-between">
        {/* ホーム（トップページ）へのリンク */}
        <Link href="/" className="p-2 hover:bg-orange-50 rounded-full transition-colors text-orange-400">
          <Home size={24} />
        </Link>
        {/* アプリタイトル */}
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="fill-orange-500 text-orange-500" />
          <h1 className="text-lg font-black tracking-wider">3 GOOD THINGS</h1>
        </div>
        <div className="w-10" /> {/* 中央揃えのためのスペーサー */}
      </header>

      {/* メインコンテンツエリア */}
      <main className="container mx-auto max-w-md p-6">
        {/* 「今日」タブが選択されている場合：入力フォームを表示 */}
        {activeTab === 'today' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DailyEntryForm onSuccess={() => {
              // 保存成功時のオプション処理（例：自動で履歴タブに切り替えるなど）
            }} />
          </div>
        )}
        
        {/* 「履歴」タブが選択されている場合：履歴一覧を表示 */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <HistoryList />
          </div>
        )}
      </main>

      {/* フローティングナビゲーションバー（画面下部に固定） */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xs bg-white/80 backdrop-blur-lg border border-orange-100 rounded-2xl shadow-xl flex justify-around p-3 z-10">
        {/* 「今日」タブ切り替えボタン */}
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
            activeTab === 'today' 
              ? 'bg-orange-500 text-white shadow-md' 
              : 'text-orange-300 hover:text-orange-500'
          }`}
        >
          <Sun size={24} strokeWidth={activeTab === 'today' ? 3 : 2} />
          <span className="text-[10px] font-bold mt-1">今日</span>
        </button>
        
        {/* 「履歴」タブ切り替えボタン */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
            activeTab === 'history' 
              ? 'bg-orange-500 text-white shadow-md' 
              : 'text-orange-300 hover:text-orange-500'
          }`}
        >
          <Book size={24} strokeWidth={activeTab === 'history' ? 3 : 2} />
          <span className="text-[10px] font-bold mt-1">履歴</span>
        </button>
      </nav>
    </div>
  );
}
