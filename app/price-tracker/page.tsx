'use client';

import React, { useState } from 'react';
import { PlusCircle, List, Settings as SettingsIcon, Home } from 'lucide-react';
import Link from 'next/link';
import InputForm from './components/InputForm';
import ProductList from './components/ProductList';
import Settings from './components/Settings';

export default function PriceTrackerPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'input' | 'settings'>('list');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between">
        <Link href="/" className="p-2 hover:bg-blue-700 rounded-full transition-colors">
          <Home size={24} />
        </Link>
        <h1 className="text-xl font-bold">底値比較PWA</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      <main className="container mx-auto max-w-md p-4">
        {activeTab === 'input' && <InputForm onSuccess={() => setActiveTab('list')} />}
        {activeTab === 'list' && <ProductList />}
        {activeTab === 'settings' && <Settings />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-10">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex flex-col items-center p-2 ${activeTab === 'list' ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <List size={24} />
          <span className="text-xs mt-1">一覧</span>
        </button>
        <button
          onClick={() => setActiveTab('input')}
          className={`flex flex-col items-center p-2 ${activeTab === 'input' ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <PlusCircle size={24} />
          <span className="text-xs mt-1">入力</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center p-2 ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <SettingsIcon size={24} />
          <span className="text-xs mt-1">設定</span>
        </button>
      </nav>
    </div>
  );
}
