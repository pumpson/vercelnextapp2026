"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// SSRを無効化してPhaserゲームコンポーネントを読み込む
const MarioGame = dynamic(() => import('./MarioGame'), {
  ssr: false,
});

export default function MarioLikePage() {
  return (
    <div className="w-full h-screen bg-black flex flex-col relative overflow-hidden">
      {/* 戻るボタン（ヘッダー） */}
      <div className="absolute top-4 left-4 z-50">
        <Link
          href="/games"
          className="flex items-center text-white bg-black/50 hover:bg-black/80 px-4 py-2 rounded-full transition-colors font-bold shadow-lg border border-gray-700"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          一覧へ戻る
        </Link>
      </div>

      {/* ゲーム本体 */}
      <div className="flex-1 w-full h-full">
        <MarioGame />
      </div>
    </div>
  );
}
