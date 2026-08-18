"use client";

import dynamic from 'next/dynamic';

// SSRを無効化してクライアントサイドでのみ描画する
const CafeDetective = dynamic(() => import('./CafeDetective'), { ssr: false });

export default function CafeDetectivePage() {
  return <CafeDetective />;
}
