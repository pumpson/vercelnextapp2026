"use client";

import React, { useState, useMemo } from 'react';
import { useJourneyData } from './useJourneyData';
import { JourneyRecord } from './types';

export default function TrainJourneyTracker() {
  const {
    passes,
    currentPass,
    currentPassId,
    setCurrentPassId,
    isLoaded,
    addPass,
    updatePassInfo,
    deletePass,
    addRecord,
    updateRecord,
    deleteRecord,
    moveRecord,
  } = useJourneyData();

  const [activeDayNumber, setActiveDayNumber] = useState<number>(1);
  const [showSettings, setShowSettings] = useState(false);

  // フォーム用ステート
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [departureStation, setDepartureStation] = useState('');
  const [arrivalStation, setArrivalStation] = useState('');
  const [lineName, setLineName] = useState('');
  const [fare, setFare] = useState<number | ''>('');
  const [memo, setMemo] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);


  // 全日程の合計運賃を計算
  const totalFare = useMemo(() => {
    if (!currentPass) return 0;
    return currentPass.days.reduce((total, day) => {
      const dayTotal = day.records.reduce((sum, record) => sum + record.fare, 0);
      return total + dayTotal;
    }, 0);
  }, [currentPass]);

  // 損益の計算（合計運賃 - パスの価格）
  const profit = currentPass ? totalFare - currentPass.price : 0;
  const isProfitable = profit >= 0;

  // 現在表示している日の記録を取得
  const currentDayRecords = currentPass?.days.find(d => d.dayNumber === activeDayNumber)?.records || [];

  // 直前の記録を取得して、乗車駅の初期値を設定するヘルパー
  const handleSetLatestArrivalAsDeparture = () => {
    if (currentDayRecords.length > 0) {
      const lastRecord = currentDayRecords[currentDayRecords.length - 1];
      setDepartureStation(lastRecord.arrivalStation);
    }
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || fare === '') return;

    const recordData = {
      date,
      departureStation,
      arrivalStation,
      lineName,
      fare: Number(fare),
      memo,
    };

    if (editingRecordId) {
      updateRecord(activeDayNumber, editingRecordId, recordData);
      setEditingRecordId(null);
      // 編集後もフォームをクリアする
      setDepartureStation('');
      setArrivalStation('');
      setLineName('');
      setFare('');
      setMemo('');
    } else {
      addRecord(activeDayNumber, recordData);
      // 次の入力に備えて初期化。乗車駅は直前の降車駅をセット
      setDepartureStation(arrivalStation);
      setArrivalStation('');
      setLineName('');
      setFare('');
      setMemo('');
    }
  };

  const handleEditClick = (record: JourneyRecord) => {
    setEditingRecordId(record.id);
    setDate(record.date);
    setDepartureStation(record.departureStation);
    setArrivalStation(record.arrivalStation);
    setLineName(record.lineName);
    setFare(record.fare);
    setMemo(record.memo);
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setDepartureStation('');
    setArrivalStation('');
    setLineName('');
    setFare('');
    setMemo('');
  };

  const handlePassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentPassId(e.target.value);
    setActiveDayNumber(1); // パスを切り替えたら1日目に戻す
  };

  if (!isLoaded) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ヘッダーエリア */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
              Train Journey Tracker
            </h1>
            <p className="text-gray-400 text-sm mt-1">乗り放題パスの旅程と運賃を記録</p>
          </div>

          <div className="mt-4 md:mt-0 flex gap-2">
            <select
              className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              value={currentPassId || ''}
              onChange={handlePassChange}
            >
              {passes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-sm transition-colors"
            >
              ⚙️ 設定
            </button>
          </div>
        </header>

        {/* 設定パネル */}
        {showSettings && currentPass && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">パスの設定</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">パスの名前</label>
                <input
                  type="text"
                  value={currentPass.name}
                  onChange={(e) => updatePassInfo(currentPass.id, e.target.value, currentPass.price, currentPass.totalDays)}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">購入金額 (円)</label>
                <input
                  type="number"
                  value={currentPass.price}
                  onChange={(e) => updatePassInfo(currentPass.id, currentPass.name, Number(e.target.value), currentPass.totalDays)}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">有効日数 (日分)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={currentPass.totalDays}
                  onChange={(e) => updatePassInfo(currentPass.id, currentPass.name, currentPass.price, Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => addPass(`新規パス ${passes.length + 1}`, 7850, 3)}
                className="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                ＋ 新しいパスを作成
              </button>
              {passes.length > 1 && (
                <button
                  onClick={() => {
                    if(confirm('本当にこのパスを削除しますか？')) deletePass(currentPass.id);
                  }}
                  className="text-sm bg-red-900 hover:bg-red-800 text-red-100 px-4 py-2 rounded transition-colors border border-red-700"
                >
                  削除
                </button>
              )}
            </div>
          </div>
        )}

        {/* 損益表示パネル */}
        {currentPass && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold mb-1">{currentPass.name}</h2>
              <div className="text-gray-400">
                購入金額: <span className="text-gray-200">¥{currentPass.price.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-8 text-center">
              <div>
                <div className="text-sm text-gray-400 mb-1">合計通常運賃</div>
                <div className="text-2xl font-bold">¥{totalFare.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">損益</div>
                <div className={`text-3xl font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                  {isProfitable ? '+' : ''}{profit.toLocaleString()}円
                </div>
                <div className="text-xs mt-1">
                  {isProfitable ? '元を取りました！🎉' : `あと ¥${Math.abs(profit).toLocaleString()} で元が取れます`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 日程タブ */}
        {currentPass && (
          <div className="flex overflow-x-auto border-b border-gray-700 hide-scrollbar">
            {currentPass.days.slice(0, currentPass.totalDays).map(day => (
              <button
                key={day.dayNumber}
                onClick={() => setActiveDayNumber(day.dayNumber)}
                className={`px-6 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeDayNumber === day.dayNumber
                    ? 'border-green-500 text-green-400 bg-gray-800/50'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
                }`}
              >
                {day.dayNumber}日目
              </button>
            ))}
          </div>
        )}

        {/* 記録フォーム */}
        {currentPass && (
          <form onSubmit={handleSaveRecord} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">
              {editingRecordId ? '記録を編集' : `${activeDayNumber}日目の記録を追加`}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="date" className="block text-sm text-gray-400 mb-1">日付</label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 focus:border-green-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="departureStation" className="block text-sm text-gray-400 mb-1">乗車駅</label>
                <div className="flex gap-2">
                  <input
                    id="departureStation"
                    type="text"
                    value={departureStation}
                    onChange={e => setDepartureStation(e.target.value)}
                    placeholder="例: 東京"
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 focus:border-green-500 focus:outline-none"
                  />
                  {!editingRecordId && currentDayRecords.length > 0 && (
                     <button
                        type="button"
                        onClick={handleSetLatestArrivalAsDeparture}
                        title="直前の降車駅を入力"
                        className="bg-gray-700 hover:bg-gray-600 px-3 rounded border border-gray-600 text-sm whitespace-nowrap"
                     >
                       前駅
                     </button>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="arrivalStation" className="block text-sm text-gray-400 mb-1">降車駅</label>
                <input
                  id="arrivalStation"
                  type="text"
                  value={arrivalStation}
                  onChange={e => setArrivalStation(e.target.value)}
                  placeholder="例: 横浜"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 focus:border-green-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="lineName" className="block text-sm text-gray-400 mb-1">路線名 (任意)</label>
                <input
                  id="lineName"
                  type="text"
                  value={lineName}
                  onChange={e => setLineName(e.target.value)}
                  placeholder="例: 東海道本線"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 focus:border-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="fare" className="block text-sm text-gray-400 mb-1">通常運賃 (円)</label>
                <input
                  id="fare"
                  type="number"
                  value={fare}
                  onChange={e => setFare(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="例: 480"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 focus:border-green-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="memo" className="block text-sm text-gray-400 mb-1">メモ (任意)</label>
                <input
                  id="memo"
                  type="text"
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  placeholder="例: 快速アクティー"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              {editingRecordId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                >
                  キャンセル
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded shadow-lg shadow-green-900/20 transition-colors"
              >
                {editingRecordId ? '更新する' : '記録を追加'}
              </button>
            </div>
          </form>
        )}

        {/* タイムライン（履歴一覧） */}
        {currentPass && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center justify-between">
              <span>{activeDayNumber}日目の旅程</span>
              <span className="text-sm font-normal text-gray-400">
                この日の小計: ¥{currentDayRecords.reduce((sum, r) => sum + r.fare, 0).toLocaleString()}
              </span>
            </h3>

            {currentDayRecords.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700/50 text-gray-500">
                まだ記録がありません。<br/>上のフォームから乗車記録を追加してください。
              </div>
            ) : (
              <div className="relative border-l-2 border-gray-700 ml-4 space-y-6 pb-4">
                {currentDayRecords.map((record, index) => (
                  <div key={record.id} className="relative pl-6 group">
                    {/* タイムラインのドット */}
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-gray-900 border-2 border-green-500"></div>

                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 group-hover:border-gray-500 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-400">{record.date}</span>
                            {record.lineName && (
                              <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                                {record.lineName}
                              </span>
                            )}
                          </div>
                          <div className="text-lg font-medium flex items-center flex-wrap gap-2">
                            <span>{record.departureStation || '?'}</span>
                            <span className="text-gray-500">→</span>
                            <span>{record.arrivalStation}</span>
                          </div>
                          {record.memo && (
                            <p className="text-sm text-gray-400 mt-2 bg-gray-900/50 p-2 rounded">{record.memo}</p>
                          )}
                        </div>

                        <div className="flex items-center md:flex-col md:items-end justify-between mt-2 md:mt-0">
                          <div className="text-xl font-bold text-green-400">
                            ¥{record.fare.toLocaleString()}
                          </div>
                          <div className="flex flex-col items-end gap-2 mt-2">
                            <div className="flex gap-2">
                              {index > 0 && (
                                <button
                                  onClick={() => moveRecord(activeDayNumber, record.id, 'up')}
                                  title="上へ移動"
                                  className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded"
                                >
                                  ↑
                                </button>
                              )}
                              {index < currentDayRecords.length - 1 && (
                                <button
                                  onClick={() => moveRecord(activeDayNumber, record.id, 'down')}
                                  title="下へ移動"
                                  className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded"
                                >
                                  ↓
                                </button>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditClick(record)}
                                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-blue-400/10 rounded"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => {
                                  if(confirm('この記録を削除しますか？')) deleteRecord(activeDayNumber, record.id);
                                }}
                                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-400/10 rounded"
                              >
                                削除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
