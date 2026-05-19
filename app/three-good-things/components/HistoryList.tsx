'use client';

import React from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Calendar, Trash2 } from 'lucide-react';

export default function HistoryList() {
  const entries = useLiveQuery(
    () => db.entries.orderBy('date').reverse().toArray()
  );

  const handleDelete = async (id: string) => {
    if (confirm('この記録を削除してもよろしいですか？')) {
      await db.entries.delete(id);
    }
  };

  if (!entries) return <div className="text-center p-10 text-gray-500">読み込み中...</div>;
  if (entries.length === 0) return <div className="text-center p-10 text-gray-500">まだ記録がありません。</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-orange-500">📚</span> 過去の記録
      </h2>
      
      {entries.map((entry) => (
        <div key={entry.id} className="bg-white p-5 rounded-2xl shadow-sm border border-orange-50 border-l-4 border-l-orange-400 relative group">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
              <Calendar size={16} className="text-orange-400" />
              {entry.date}
            </div>
            <button
              onClick={() => handleDelete(entry.id)}
              className="text-gray-300 hover:text-red-400 transition-colors"
              title="削除"
            >
              <Trash2 size={18} />
            </button>
          </div>
          
          <ul className="space-y-2">
            {[entry.thing1, entry.thing2, entry.thing3].map((thing, idx) => (
              thing && (
                <li key={idx} className="flex gap-2 text-gray-700 leading-relaxed">
                  <span className="text-orange-300 font-bold shrink-0">{idx + 1}.</span>
                  <span>{thing}</span>
                </li>
              )
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
