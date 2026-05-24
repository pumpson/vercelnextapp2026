'use client';

import React, { useState, useEffect } from 'react';
import { format, subDays, isSameDay } from 'date-fns';
import { Check, Plus, Trash2, Trophy, Flame } from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  createdAt: string;
}

interface HabitRecord {
  habitId: string;
  date: string;
}

export default function HabitTrackerPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [records, setRecords] = useState<HabitRecord[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const displayDaysCount = 7;
  const displayDates = Array.from({ length: displayDaysCount }).map((_, i) => {
    return subDays(new Date(), displayDaysCount - 1 - i);
  });

  useEffect(() => {
    const savedHabits = localStorage.getItem('habit-tracker-habits');
    const savedRecords = localStorage.getItem('habit-tracker-records');

    if (savedHabits) setHabits(JSON.parse(savedHabits));
    if (savedRecords) setRecords(JSON.parse(savedRecords));

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('habit-tracker-habits', JSON.stringify(habits));
      localStorage.setItem('habit-tracker-records', JSON.stringify(records));
    }
  }, [habits, records, isLoaded]);

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      createdAt: new Date().toISOString(),
    };

    setHabits([...habits, newHabit]);
    setNewHabitName('');
  };

  const deleteHabit = (id: string) => {
    if (confirm('この習慣を削除しますか？これまでの記録もすべて消去されます。')) {
      setHabits(habits.filter(h => h.id !== id));
      setRecords(records.filter(r => r.habitId !== id));
    }
  };

  const toggleRecord = (habitId: string, dateObj: Date) => {
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    const exists = records.some(r => r.habitId === habitId && r.date === dateStr);

    if (exists) {
      setRecords(records.filter(r => !(r.habitId === habitId && r.date === dateStr)));
    } else {
      setRecords([...records, { habitId, date: dateStr }]);
    }
  };

  const isCompleted = (habitId: string, dateObj: Date) => {
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    return records.some(r => r.habitId === habitId && r.date === dateStr);
  };

  const calculateStreak = (habitId: string) => {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const checkDate = subDays(today, i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');

      const hasRecord = records.some(r => r.habitId === habitId && r.date === dateStr);

      if (hasRecord) {
        streak++;
      } else {
        if (i === 0) continue;
        break;
      }
    }
    return streak;
  };

  const calculateTodayProgress = () => {
    if (habits.length === 0) return 0;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const completedToday = habits.filter(h =>
      records.some(r => r.habitId === h.id && r.date === todayStr)
    ).length;
    return Math.round((completedToday / habits.length) * 100);
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-indigo-600">
              <Trophy className="text-yellow-500" />
              Habit Tracker
            </h1>
            <p className="text-gray-500 text-sm mt-1">毎日の積み重ねを可視化しましょう</p>
          </div>
          <div className="flex items-center gap-4 bg-indigo-50 px-6 py-4 rounded-xl">
            <div className="text-sm font-medium text-indigo-800">今日の達成率</div>
            <div className="relative w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-inner text-xl font-bold text-indigo-600">
              {calculateTodayProgress()}%
            </div>
          </div>
        </header>

        <main className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <form onSubmit={addHabit} className="flex gap-2">
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="新しい習慣を入力（例: 読書30分、筋トレ）..."
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!newHabitName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl transition-colors font-medium flex items-center gap-2"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">追加</span>
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            {habits.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p>まだ習慣が登録されていません。</p>
                <p className="text-sm mt-2">上のフォームから最初の習慣を追加しましょう。</p>
              </div>
            ) : (
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="p-4 font-semibold text-gray-600 w-1/3">習慣名</th>
                    <th className="p-4 font-semibold text-gray-600 text-center w-24">連続</th>
                    {displayDates.map((date, i) => {
                      const isToday = isSameDay(date, new Date());
                      return (
                        <th key={i} className={`p-2 text-center ${isToday ? 'text-indigo-600 font-bold' : 'text-gray-500 font-medium'}`}>
                          <div className="text-xs">{format(date, 'E')}</div>
                          <div className={`text-sm mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-100' : ''}`}>
                            {format(date, 'd')}
                          </div>
                        </th>
                      );
                    })}
                    <th className="p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {habits.map(habit => {
                    const streak = calculateStreak(habit.id);
                    return (
                      <tr key={habit.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-4 font-medium text-gray-800">
                          {habit.name}
                        </td>
                        <td className="p-4 text-center">
                          <div className={`inline-flex items-center gap-1 font-bold ${streak > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                            <Flame size={16} className={streak > 0 ? 'fill-orange-500' : ''} />
                            {streak}
                          </div>
                        </td>
                        {displayDates.map((date, i) => {
                          const completed = isCompleted(habit.id, date);
                          const isFuture = date > new Date();
                          return (
                            <td key={i} className="p-2 text-center">
                              <button
                                disabled={isFuture}
                                onClick={() => toggleRecord(habit.id, date)}
                                className={`
                                  w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all duration-300
                                  ${isFuture ? 'opacity-20 cursor-not-allowed bg-gray-100' : ''}
                                  ${completed
                                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200 scale-100'
                                    : 'bg-gray-100 text-transparent hover:bg-gray-200 hover:text-gray-400 scale-95'}
                                `}
                                aria-label={`${format(date, 'MM/dd')}の記録を切り替え`}
                              >
                                <Check size={20} className={completed ? 'scale-100' : 'scale-50 opacity-0 group-hover:opacity-100'} style={{ transition: 'all 0.2s' }} />
                              </button>
                            </td>
                          );
                        })}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg hover:bg-red-50"
                            title="削除"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
