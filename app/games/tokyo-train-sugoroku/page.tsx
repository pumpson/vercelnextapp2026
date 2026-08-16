"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Navigation } from "lucide-react";
import { useSugoroku } from "./hooks/useSugoroku";
import MapViewer from "./components/MapViewer";
import { MAP_DATA } from "./data/mapData";

export default function TokyoTrainSugorokuPage() {
  const gameState = useSugoroku();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ログが追加されたら自動スクロール
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gameState.logs]);

  // 駅名を取得するヘルパー
  const getStationName = (id: string) => {
    return MAP_DATA.find(s => s.id === id)?.name || id;
  };

  // 分岐選択可能な駅のリストを取得
  const getSelectableStations = () => {
    // プレイヤーの移動中、または分岐選択中であれば、現在位置の隣接駅を選択可能にする
    if (gameState.phase !== 'player_move' && gameState.phase !== 'player_branch') return [];
    const current = MAP_DATA.find(s => s.id === gameState.player.currentStationId);
    return current ? current.next : [];
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <Link href="/games" className="flex items-center text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          ゲーム一覧に戻る
        </Link>
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">
          東京トレインすごろく
        </h1>
        <div className="w-24"></div> {/* Spacer for centering */}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row relative">
        {/* Map Area */}
        <div className="flex-1 bg-gray-950 relative overflow-hidden flex flex-col">
          <MapViewer
            playerStationId={gameState.player.currentStationId}
            cpuStationId={gameState.cpu.currentStationId}
            destinationId={gameState.destinationId}
            selectableStations={getSelectableStations()}
            onStationClick={gameState.movePlayerTo}
          />

          {/* 中央のオーバーレイUI（分岐選択や結果表示など） */}
          {gameState.phase === 'player_branch' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/90 p-6 rounded-2xl border border-blue-500 shadow-2xl text-center backdrop-blur-sm z-10">
              <h3 className="text-xl font-bold mb-4 text-blue-400 flex items-center justify-center">
                <Navigation className="w-6 h-6 mr-2" />
                進行方向を選択してください
              </h3>
              <p className="mb-4 text-gray-300">マップ上の光っている駅をクリックするか、下のボタンから選んでください。</p>
              <div className="flex flex-wrap justify-center gap-3">
                {getSelectableStations().map(nextId => (
                  <button
                    key={nextId}
                    onClick={() => gameState.movePlayerTo(nextId)}
                    className="px-6 py-3 bg-gray-800 hover:bg-blue-600 border border-gray-600 hover:border-blue-400 rounded-lg transition-colors font-bold"
                  >
                    {getStationName(nextId)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameState.phase === 'player_action' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/90 p-6 rounded-2xl border border-green-500 shadow-2xl text-center backdrop-blur-sm z-10 min-w-[300px]">
              <h3 className="text-2xl font-bold mb-4 text-green-400">行動終了</h3>
              <button
                onClick={gameState.finishPlayerAction}
                className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors"
              >
                ターン終了
              </button>
            </div>
          )}

          {gameState.phase === 'game_over' && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-gray-900 p-8 rounded-3xl border border-yellow-500 shadow-2xl text-center max-w-md w-full">
                <h2 className="text-4xl font-bold mb-6 text-yellow-400">ゲーム終了！</h2>
                <div className="space-y-4 mb-8 text-xl">
                  <div className={`p-4 rounded-lg ${gameState.player.money >= gameState.cpu.money ? 'bg-green-900/50 border border-green-500' : 'bg-gray-800'}`}>
                    <div className="text-sm text-gray-400 mb-1">あなた</div>
                    <div className="font-mono text-2xl font-bold">¥{gameState.player.money.toLocaleString()}万</div>
                  </div>
                  <div className={`p-4 rounded-lg ${gameState.cpu.money > gameState.player.money ? 'bg-green-900/50 border border-green-500' : 'bg-gray-800'}`}>
                    <div className="text-sm text-gray-400 mb-1">CPU</div>
                    <div className="font-mono text-2xl font-bold">¥{gameState.cpu.money.toLocaleString()}万</div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-8">
                  {gameState.player.money >= gameState.cpu.money ? (
                    <span className="text-green-400">あなたの勝利です！🎉</span>
                  ) : (
                    <span className="text-red-400">CPUの勝利です... 😢</span>
                  )}
                </h3>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-xl transition-colors"
                >
                  もう一度遊ぶ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar (Status & Controls) */}
        <div className="w-full md:w-80 bg-gray-800 border-l border-gray-700 p-4 flex flex-col gap-4 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.3)]">

          <div className="bg-gray-900 p-4 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
            <h2 className="text-lg font-bold mb-2 text-green-400">プレイヤー</h2>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">現在地:</span>
              <span className="font-bold">{getStationName(gameState.player.currentStationId)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-400">所持金:</span>
              <span className="font-mono text-lg font-bold">¥{gameState.player.money.toLocaleString()}万</span>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <h2 className="text-lg font-bold mb-2 text-red-400">CPU</h2>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">現在地:</span>
              <span className="font-bold">{getStationName(gameState.cpu.currentStationId)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-400">所持金:</span>
              <span className="font-mono text-lg font-bold">¥{gameState.cpu.money.toLocaleString()}万</span>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-lg flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-lg font-bold mb-2 text-yellow-400 border-b border-gray-700 pb-2">進行状況</h2>

            <div className="flex justify-between items-center mb-3 mt-2">
              <span className="text-gray-400 text-sm">現在の月:</span>
              <span className="font-bold text-lg">{gameState.month}月 <span className="text-xs text-gray-500 font-normal">({gameState.yearPassed + 1}年目)</span></span>
            </div>

            <div className="flex justify-between items-center mb-4 text-sm bg-blue-950 border border-blue-900 p-3 rounded-lg">
              <span className="text-blue-300 font-bold">目的地:</span>
              <span className="font-bold text-white text-lg">{getStationName(gameState.destinationId)}</span>
            </div>

            {/* Message Log */}
            <div className="flex-1 overflow-y-auto text-sm text-gray-300 space-y-2 mb-4 bg-gray-950 p-3 rounded border border-gray-800">
              {gameState.logs.map((log, i) => (
                <div key={i} className="border-b border-gray-800/50 pb-1 last:border-0">{log}</div>
              ))}
              <div ref={logsEndRef} />
            </div>

            {/* Controls */}
            <div className="mt-auto">
              {gameState.phase === 'player_dice' && (
                <button
                  onClick={gameState.rollDice}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  🎲 サイコロを振る
                </button>
              )}

              {gameState.phase === 'player_move' && (
                <div className="bg-blue-900/40 border border-blue-800 p-4 rounded-xl text-center">
                  <div className="text-sm text-blue-300 mb-1">出た目</div>
                  <div className="text-4xl font-bold text-white mb-2">{gameState.diceResult}</div>
                  <div className="text-sm text-gray-400">
                    残り <span className="text-blue-400 font-bold text-lg">{gameState.remainingMoves}</span> マス
                  </div>
                </div>
              )}

              {gameState.phase.startsWith('cpu') && (
                <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl text-center">
                  <div className="text-red-400 font-bold animate-pulse">CPUのターン...</div>
                  {gameState.diceResult !== null && (
                    <div className="mt-2 text-sm text-gray-400">
                      出た目: <span className="text-white font-bold">{gameState.diceResult}</span> (残り {gameState.remainingMoves} マス)
                    </div>
                  )}
                </div>
              )}

              {gameState.phase === 'month_end' && (
                <div className="bg-yellow-900/20 border border-yellow-900/50 p-4 rounded-xl text-center">
                  <div className="text-yellow-400 font-bold">月末処理中...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
