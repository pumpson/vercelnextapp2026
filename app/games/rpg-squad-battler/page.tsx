"use client";
import dynamic from 'next/dynamic';

const RpgSquadBattler = dynamic(() => import('./RpgSquadBattler'), { ssr: false });

export default function RpgSquadBattlerPage() {
  return <RpgSquadBattler />;
}
