"use client";

import dynamic from 'next/dynamic';

// Next.jsのSSR（サーバーサイドレンダリング）を無効にして、
// ブラウザ（クライアント）でのみ動作するようにAutoBattlerコンポーネントを動的にインポートします。
const AutoBattler = dynamic(() => import('./AutoBattler'), { ssr: false });

export default function AutoBattlerPage() {
  return <AutoBattler />;
}
