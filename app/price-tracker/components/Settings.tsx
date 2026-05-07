'use client';

import React, { useRef } from 'react';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import { db } from '../db';

export default function Settings() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const allProducts = await db.products.toArray();
      const blob = new Blob([JSON.stringify(allProducts, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bottom-price-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          throw new Error('Invalid data format');
        }

        if (confirm('現在のデータにインポートしたデータを追加しますか？（IDが重複する場合は上書きされます）')) {
          await db.products.bulkPut(json);
          alert('インポートが完了しました');
        }
      } catch (error) {
        console.error('Import failed:', error);
        alert('インポートに失敗しました。ファイル形式を確認してください。');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = async () => {
    if (confirm('全てのデータを削除しますか？この操作は取り消せません。')) {
      await db.products.clear();
      alert('データを全削除しました');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">データ管理</h2>
        
        <div className="space-y-4">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-3 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            <Download size={20} />
            データをエクスポート (JSON)
          </button>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              ref={fileInputRef}
              className="hidden"
              id="import-file"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-3 rounded-lg font-medium hover:bg-green-100 transition-colors"
            >
              <Upload size={20} />
              データをインポート (JSON)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-red-100">
        <h2 className="text-lg font-semibold mb-4 text-red-800 flex items-center gap-2">
          <AlertTriangle size={20} />
          危険な操作
        </h2>
        <button
          onClick={handleClearData}
          className="w-full bg-red-50 text-red-600 py-3 rounded-lg font-medium hover:bg-red-100 transition-colors"
        >
          全てのデータを削除
        </button>
      </div>

      <div className="text-center text-gray-400 text-xs">
        <p>底値比較PWA v1.0.0</p>
        <p>© 2026 Price Tracker App</p>
      </div>
    </div>
  );
}
