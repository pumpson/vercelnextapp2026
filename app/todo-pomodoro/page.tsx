'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, CheckCircle, Circle, Trash2, Plus } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoPomodoroPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedTasks = localStorage.getItem('todo-pomodoro-tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('todo-pomodoro-tasks', JSON.stringify(tasks));
    }
  }, [tasks, isLoaded]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      completed: false
    };
    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      if (interval) clearInterval(interval);
      setIsActive(false);
      setIsBreak(!isBreak);
      setTimeLeft(!isBreak ? 5 * 60 : 25 * 60);

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(!isBreak ? '作業時間終了！休憩しましょう☕' : '休憩終了！作業を再開しましょう🚀');
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().catch(console.error);
    }
  }, []);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800">
      <div className="max-w-md mx-auto space-y-6">
        <header className="text-center py-4">
          <h1 className="text-2xl font-bold text-indigo-600">Todo & Pomodoro</h1>
          <p className="text-sm text-gray-500 mt-1">タスクと時間を管理して集中力を高めましょう</p>
        </header>

        <section className={`p-6 rounded-2xl shadow-sm text-center transition-colors duration-500 ${
          isBreak ? 'bg-green-100 text-green-900' : 'bg-red-50 text-red-900'
        }`}>
          <h2 className="text-xl font-medium mb-2">
            {isBreak ? '休憩時間 ☕' : '作業時間 🚀'}
          </h2>
          <div className="text-6xl font-mono font-light mb-6 tracking-wider">
            {formatTime(timeLeft)}
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={toggleTimer}
              className={`p-4 rounded-full text-white shadow-md transition-transform hover:scale-105 active:scale-95 ${
                isBreak ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
              }`}
              aria-label={isActive ? '一時停止' : '開始'}
            >
              {isActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
            <button
              onClick={resetTimer}
              className="p-4 rounded-full bg-white/50 hover:bg-white/80 text-gray-700 shadow-sm transition-transform hover:scale-105 active:scale-95"
              aria-label="リセット"
            >
              <Square size={24} />
            </button>
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">タスクリスト</h2>

          <form onSubmit={addTask} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="新しいタスクを入力..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
            <button
              type="submit"
              disabled={!newTaskText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
              aria-label="タスクを追加"
            >
              <Plus size={20} />
            </button>
          </form>

          <ul className="space-y-2">
            {tasks.length === 0 ? (
              <li className="text-center text-gray-400 py-4 text-sm">タスクはありません。追加してみましょう！</li>
            ) : (
              tasks.map(task => (
                <li
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    task.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`shrink-0 transition-colors ${task.completed ? 'text-green-500' : 'text-gray-400 hover:text-indigo-500'}`}
                    aria-label={task.completed ? '未完了にする' : '完了にする'}
                  >
                    {task.completed ? <CheckCircle size={24} /> : <Circle size={24} />}
                  </button>
                  <span className={`flex-1 transition-all ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {task.text}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    aria-label="削除"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

      </div>
    </div>
  );
}
