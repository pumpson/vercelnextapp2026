"use client";

import dynamic from 'next/dynamic';

const GeoCollectorGame = dynamic(() => import('./GeoCollectorGame'), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-100">地図を読み込み中...</div>
});

export default function GeoCollectorPage() {
  return (
    <div className="w-full h-[calc(100vh-60px)] bg-gray-100 flex flex-col relative overflow-hidden">
      <div className="flex-1 w-full h-full">
        <GeoCollectorGame />
      </div>
    </div>
  );
}
