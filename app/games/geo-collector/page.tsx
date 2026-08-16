"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const GeoCollectorGame = dynamic(() => import('./GeoCollectorGame'), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-100">地図を読み込み中...</div>
});

export default function GeoCollectorPage() {
  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col relative overflow-hidden">
      <div className="absolute top-4 left-4 z-[9999]">
        <Link
          href="/games"
          className="flex items-center text-gray-800 bg-white/90 hover:bg-white px-4 py-2 rounded-full transition-colors font-bold shadow-lg border border-gray-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          一覧へ戻る
        </Link>
      </div>

      <div className="flex-1 w-full h-full">
        <GeoCollectorGame />
      </div>
    </div>
  );
}
