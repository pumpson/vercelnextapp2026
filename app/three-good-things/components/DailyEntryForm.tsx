'use client';

import React, { useState, useEffect } from 'react';
import { db, DailyEntry } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { Save, CheckCircle } from 'lucide-react';

interface DailyEntryFormProps {
  onSuccess?: () => void;
}

export default function DailyEntryForm({ onSuccess }: DailyEntryFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [thing1, setThing1] = useState('');
  const [thing2, setThing2] = useState('');
  const [thing3, setThing3] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const existingEntry = useLiveQuery(
    () => db.entries.where('date').equals(today).first(),
    [today]
  );

  useEffect(() => {
    if (existingEntry) {
      setThing1(existingEntry.thing1);
      setThing2(existingEntry.thing2);
      setThing3(existingEntry.thing3);
    }
  }, [existingEntry]);

  const handleSave = async () => {
    const now = Date.now();
    if (existingEntry) {
      await db.entries.update(existingEntry.id, {
        thing1,
        thing2,
        thing3,
        updatedAt: now,
      });
    } else {
      const newEntry: DailyEntry = {
        id: uuidv4(),
        date: today,
        thing1,
        thing2,
        thing3,
        createdAt: now,
        updatedAt: now,
      };
      await db.entries.add(newEntry);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    if (onSuccess) onSuccess();
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-orange-500">✨</span> 今日の3つの良いこと
      </h2>
      <p className="text-sm text-gray-500 mb-6">{today} の記録</p>

      <div className="space-y-4">
        {[
          { id: 1, value: thing1, setter: setThing1 },
          { id: 2, value: thing2, setter: setThing2 },
          { id: 3, value: thing3, setter: setThing3 },
        ].map((item) => (
          <div key={item.id} className="relative">
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-orange-400">
              #{item.id}
            </label>
            <textarea
              value={item.value}
              onChange={(e) => item.setter(e.target.value)}
              placeholder="何がありましたか？"
              className="w-full p-4 pt-5 border border-orange-100 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none transition-all resize-none min-h-[80px]"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!thing1 && !thing2 && !thing3}
        className={`w-full mt-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
          isSaved
            ? 'bg-green-500 text-white'
            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200 disabled:opacity-50 disabled:shadow-none'
        }`}
      >
        {isSaved ? (
          <>
            <CheckCircle size={20} />
            保存しました
          </>
        ) : (
          <>
            <Save size={20} />
            保存する
          </>
        )}
      </button>
    </div>
  );
}
