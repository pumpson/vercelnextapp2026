"use client";

import React, { useState, useEffect } from 'react';
import { Delete, ArrowRight, HelpCircle, RefreshCw, Trophy, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function HitAndBlowGame() {
  const [difficulty, setDifficulty] = useState(3);
  const [secretCode, setSecretCode] = useState<number[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [history, setHistory] = useState<{guess: string, hit: number, blow: number}[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [showRules, setShowRules] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const generateSecretCode = (length: number) => {
    let digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    let code: number[] = [];
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * digits.length);
      code.push(digits[randomIndex]);
      digits.splice(randomIndex, 1);
    }
    return code;
  };

  const startNewGame = (newDifficulty: number) => {
    setDifficulty(newDifficulty);
    setSecretCode(generateSecretCode(newDifficulty));
    setCurrentGuess("");
    setHistory([]);
    setGameState('playing');
    setFeedbackMessage("数字を選んでください");
  };

  useEffect(() => {
    startNewGame(difficulty);
  }, []); // Run only on mount

  const handleNumberClick = (num: number) => {
    if (gameState !== 'playing') return;
    if (currentGuess.length < difficulty && !currentGuess.includes(num.toString())) {
      setCurrentGuess(prev => prev + num.toString());
      setFeedbackMessage("");
    } else if (currentGuess.includes(num.toString())) {
      setFeedbackMessage("同じ数字は使えません");
    }
  };

  const handleDelete = () => {
    if (gameState !== 'playing') return;
    setCurrentGuess(prev => prev.slice(0, -1));
    setFeedbackMessage("");
  };

  const handleSubmit = () => {
    if (gameState !== 'playing' || currentGuess.length !== difficulty) return;

    let hit = 0;
    let blow = 0;
    const guessArray = currentGuess.split('').map(Number);

    for (let i = 0; i < difficulty; i++) {
      if (guessArray[i] === secretCode[i]) {
        hit++;
      } else if (secretCode.includes(guessArray[i])) {
        blow++;
      }
    }

    setHistory([{ guess: currentGuess, hit, blow }, ...history]);
    setCurrentGuess("");

    if (hit === difficulty) {
      setGameState('won');
      setFeedbackMessage("クリア！");
    } else {
      setFeedbackMessage(`${hit} HIT / ${blow} BLOW`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col items-center py-8 px-4">
      
      <div className="w-full max-w-md mb-4 flex items-center">
        <Link href="/games" className="flex items-center text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          ゲーム一覧に戻る
        </Link>
      </div>

      {/* Header */}
      <header className="w-full max-w-md flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Hit & Blow
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowRules(true)}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            title="ルール"
          >
            <HelpCircle size={20} className="text-slate-400" />
          </button>
          <button 
            onClick={() => startNewGame(difficulty)}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            title="リセット"
          >
            <RefreshCw size={20} className="text-slate-400" />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="w-full max-w-md flex flex-col gap-6">
        
        {/* Difficulty Selector */}
        <div className="flex justify-center gap-2 p-1 bg-slate-800 rounded-lg self-center">
          {[3, 4, 5].map((d) => (
            <button
              key={d}
              onClick={() => startNewGame(d)}
              className={`px-4 py-1 rounded-md text-sm font-medium transition-all ${
                difficulty === d 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {d}桁
            </button>
          ))}
        </div>

        {/* Display Area */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 text-center relative overflow-hidden">
          {gameState === 'won' && (
            <div className="absolute inset-0 bg-indigo-900/90 flex flex-col items-center justify-center z-10 animate-fade-in">
              <Trophy size={48} className="text-yellow-400 mb-2 animate-bounce" />
              <h2 className="text-2xl font-bold text-white mb-1">Congratulations!</h2>
              <p className="text-indigo-200">正解は <span className="text-xl font-mono font-bold text-white mx-1">{secretCode.join('')}</span> でした</p>
              <p className="text-sm text-slate-300 mt-4">{history.length + 1}回でクリア！</p>
              <button 
                onClick={() => startNewGame(difficulty)}
                className="mt-6 px-6 py-2 bg-white text-indigo-900 font-bold rounded-full hover:bg-indigo-50 transition-colors shadow-lg"
              >
                もう一度遊ぶ
              </button>
            </div>
          )}

          <div className="h-16 flex items-center justify-center gap-3 mb-2">
            {[...Array(difficulty)].map((_, i) => (
              <div 
                key={i} 
                className={`w-12 h-14 rounded-lg flex items-center justify-center text-3xl font-bold font-mono transition-all duration-200 ${
                  currentGuess[i] 
                    ? 'bg-slate-700 text-white border-b-4 border-indigo-500 transform translate-y-0' 
                    : 'bg-slate-700/50 text-slate-500 border-b-4 border-slate-600/50'
                }`}
              >
                {currentGuess[i] || ''}
              </div>
            ))}
          </div>
          <div className="h-6 text-sm text-pink-400 font-medium">
            {feedbackMessage}
          </div>
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-5 gap-2 px-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              disabled={gameState !== 'playing' || currentGuess.includes(num.toString())}
              className={`h-14 rounded-xl text-xl font-bold transition-all active:scale-95 ${
                currentGuess.includes(num.toString())
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-slate-600 text-white shadow-md border-b-4 border-slate-900 active:border-b-0 active:translate-y-1'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 px-2">
          <button
            onClick={handleDelete}
            className="h-12 flex items-center justify-center gap-2 rounded-xl bg-red-900/30 text-red-200 hover:bg-red-900/50 transition-colors font-medium border border-red-900/50"
          >
            <Delete size={20} />
            削除
          </button>
          <button
            onClick={handleSubmit}
            disabled={currentGuess.length !== difficulty || gameState !== 'playing'}
            className={`h-12 flex items-center justify-center gap-2 rounded-xl font-bold transition-all shadow-lg ${
              currentGuess.length === difficulty && gameState === 'playing'
                ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/30 active:scale-95'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            判定する
            <ArrowRight size={20} />
          </button>
        </div>

        {/* History */}
        <div className="flex-1 min-h-0 bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center justify-between">
            <span>推論履歴</span>
            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">{history.length}回</span>
          </h3>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm italic">
                数字を選んで推理を開始してください
              </div>
            ) : (
              history.map((record, idx) => (
                <div key={idx} className="flex items-center bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <span className="text-xs text-slate-500 w-6 font-mono">#{history.length - idx}</span>
                  <span className="text-lg font-mono font-bold tracking-widest text-slate-200 flex-1 text-center">
                    {record.guess}
                  </span>
                  <div className="flex gap-2 text-sm font-bold ml-2">
                    <div className="px-2 py-1 bg-green-900/50 text-green-400 rounded border border-green-900/50 w-16 text-center">
                      {record.hit} HIT
                    </div>
                    <div className="px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded border border-yellow-900/50 w-20 text-center">
                      {record.blow} BLOW
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-slate-600 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <HelpCircle size={24} className="text-indigo-400" />
                ルール説明
              </h2>
              <button onClick={() => setShowRules(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <p>ランダムに選ばれた数字を当てるゲームです。数字は重複しません。</p>
              <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-900/50 text-green-400 text-xs font-bold px-2 py-0.5 rounded border border-green-900">HIT</span>
                  <span>数字も場所も合っている</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-900/50 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded border border-yellow-900">BLOW</span>
                  <span>数字は合っているが場所が違う</span>
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg font-mono text-center text-xs">
                <p className="mb-1 text-slate-500">例：正解が「123」で「142」と予想</p>
                <p>
                  <span className="text-green-400">1</span>は場所も一致 → <span className="font-bold text-green-400">1 HIT</span><br/>
                  <span className="text-yellow-400">2</span>は場所が違う → <span className="font-bold text-yellow-400">1 BLOW</span>
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowRules(false)}
              className="mt-6 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Fix: Removed 'jsx' and 'global' attributes to prevent React warnings.
        The styles will still be applied globally within this component's scope.
      */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5); 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.8); 
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
