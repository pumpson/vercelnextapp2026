"use client";

import dynamic from 'next/dynamic';

const StickmanLineWars = dynamic(() => import('./StickmanLineWars'), { ssr: false });

export default function StickmanLineWarsPage() {
  return <StickmanLineWars />;
}
