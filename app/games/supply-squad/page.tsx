"use client";

import dynamic from 'next/dynamic';

const SupplySquad = dynamic(() => import('./SupplySquad'), { ssr: false });

export default function SupplySquadPage() {
  return <SupplySquad />;
}
