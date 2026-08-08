import React, { useState, useEffect, useRef, useCallback } from 'react';

// 魚の型定義
interface Fish {
  id: string;
  name: string;
  minSize: number;
  maxSize: number;
  weight: number; // 出現確率の重み（大きいほど出やすい）
  description: string;
  emoji: string;
}

// 釣れた魚の記録用型
interface CaughtRecord {
  id: string;
  fish: Fish;
  size: number;
  timestamp: Date;
}

// 10種類の現実的な魚のデータ
const FISH_DATABASE: Fish[] = [
  { id: 'iwashi', name: 'マイワシ', minSize: 10, maxSize: 25, weight: 100, description: '群れで泳ぐ小さな魚。釣り人によく親しまれている。', emoji: '🐟' },
  { id: 'aji', name: 'マアジ', minSize: 15, maxSize: 30, weight: 80, description: '定番のターゲット。フライや刺身など何にしても美味しい。', emoji: '🐟' },
  { id: 'mebaru', name: 'メバル', minSize: 15, maxSize: 30, weight: 60, description: 'つぶらな大きな瞳が特徴。夜行性で岩場に潜む。', emoji: '🐡' },
  { id: 'saba', name: 'マサバ', minSize: 20, maxSize: 45, weight: 50, description: '引きが強く楽しめる。鮮度が落ちやすいので注意。', emoji: '🐟' },
  { id: 'aoriika', name: 'アオリイカ', minSize: 20, maxSize: 45, weight: 30, description: 'イカの王様。エギングと呼ばれるルアー釣りで人気。', emoji: '🦑' },
  { id: 'kurodai', name: 'クロダイ', minSize: 30, maxSize: 55, weight: 20, description: '警戒心が強く、釣り上げるのが難しいベテランの憧れ。', emoji: '🐟' },
  { id: 'madai', name: 'マダイ', minSize: 30, maxSize: 80, weight: 15, description: '魚の王様。美しい桜色をしており、お祝い事に欠かせない。', emoji: '🐠' },
  { id: 'hirame', name: 'ヒラメ', minSize: 40, maxSize: 85, weight: 10, description: '海底の砂地に潜む高級魚。獰猛なフィッシュイーター。', emoji: '🐡' },
  { id: 'suzuki', name: 'スズキ', minSize: 40, maxSize: 90, weight: 10, description: '成長に合わせて名前が変わる出世魚。強烈なファイトが魅力。', emoji: '🐟' },
  { id: 'buri', name: 'ブリ', minSize: 60, maxSize: 105, weight: 5, description: '丸々と太った大型回遊魚。釣り上げるときの引きは圧巻。', emoji: '🐟' },
];

type GameState = 'IDLE' | 'CASTING' | 'WAITING' | 'HIT' | 'CAUGHT' | 'ESCAPED';
type TimeOfDay = 'DAY' | 'SUNSET' | 'NIGHT';

export default function FishingGame() {
  // ゲームのステート
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('DAY');
  const [message, setMessage] = useState<string>('のんびりと海を眺めましょう。');
  const [inventory, setInventory] = useState<CaughtRecord[]>([]);
  const [activeFish, setActiveFish] = useState<CaughtRecord | null>(null);
  const [showEncyclopedia, setShowEncyclopedia] = useState<boolean>(false);

  // タイマー用のRef
  const waitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // コンポーネントアンマウント時のタイマー解除
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const clearTimers = () => {
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    if (hitTimerRef.current) clearTimeout(hitTimerRef.current);
  };

  // キャスト（釣り竿を振る）
  const handleCast = useCallback(() => {
    if (gameState !== 'IDLE' && gameState !== 'CAUGHT' && gameState !== 'ESCAPED') return;

    setGameState('CASTING');
    setMessage('仕掛けを投げ入れました...');
    setActiveFish(null);

    // 少し待ってからWAITING状態へ
    setTimeout(() => {
      setGameState('WAITING');
      setMessage('波の音を聞きながら、アタリを待ちます...');

      // ランダムな時間（3秒〜10秒）でアタリが来る
      const waitTime = Math.floor(Math.random() * 7000) + 3000;
      waitTimerRef.current = setTimeout(() => {
        triggerHit();
      }, waitTime);
    }, 1000);
  }, [gameState]);

  // アタリ発生
  const triggerHit = () => {
    setGameState('HIT');
    setMessage('あっ！ウキが沈みました！');

    // 魚のレア度による逃げるまでの時間（1.5秒〜3秒）
    const escapeTime = Math.floor(Math.random() * 1500) + 1500;
    hitTimerRef.current = setTimeout(() => {
      handleEscape();
    }, escapeTime);
  };

  // 逃げられた
  const handleEscape = () => {
    setGameState('ESCAPED');
    setMessage('魚に逃げられてしまいました...');
    clearTimers();

    setTimeout(() => {
      setGameState('IDLE');
      setMessage('のんびりと海を眺めましょう。');
    }, 3000);
  };

  // リールを巻く（アワセる）
  const handleReel = useCallback(() => {
    if (gameState === 'WAITING') {
      // 早すぎた場合
      clearTimers();
      setGameState('IDLE');
      setMessage('少し早すぎたようです。仕掛けを回収しました。');
      return;
    }

    if (gameState === 'HIT') {
      // 成功！
      clearTimers();
      setGameState('CAUGHT');

      // 魚を抽選
      const totalWeight = FISH_DATABASE.reduce((sum, fish) => sum + fish.weight, 0);
      let randomVal = Math.random() * totalWeight;
      let caughtFishData = FISH_DATABASE[0];

      for (const fish of FISH_DATABASE) {
        if (randomVal <= fish.weight) {
          caughtFishData = fish;
          break;
        }
        randomVal -= fish.weight;
      }

      // サイズをランダム決定（小数第1位まで）
      const randomSize = (Math.random() * (caughtFishData.maxSize - caughtFishData.minSize) + caughtFishData.minSize).toFixed(1);

      const newRecord: CaughtRecord = {
        id: Math.random().toString(36).substr(2, 9),
        fish: caughtFishData,
        size: parseFloat(randomSize),
        timestamp: new Date()
      };

      setActiveFish(newRecord);
      setInventory(prev => [newRecord, ...prev]);
      setMessage(`やった！${caughtFishData.name}を釣り上げました！`);
    }
  }, [gameState]);

  const handleReturnToIdle = () => {
    setGameState('IDLE');
    setActiveFish(null);
    setMessage('のんびりと海を眺めましょう。');
  };

  // 景色に応じたスタイルの決定
  const getSkyStyle = () => {
    switch(timeOfDay) {
      case 'SUNSET': return 'from-orange-300 via-red-300 to-purple-400';
      case 'NIGHT': return 'from-slate-900 via-indigo-900 to-purple-900';
      case 'DAY':
      default: return 'from-sky-300 via-blue-200 to-blue-100';
    }
  };

  const getSeaStyle = () => {
    switch(timeOfDay) {
      case 'SUNSET': return 'from-indigo-600 to-purple-800';
      case 'NIGHT': return 'from-slate-800 to-blue-950';
      case 'DAY':
      default: return 'from-blue-400 to-blue-700';
    }
  };

  const isNight = timeOfDay === 'NIGHT';

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans select-none touch-manipulation">
      {/* メインゲーム画面 */}
      <div className="w-full max-w-md bg-white h-[100dvh] md:h-[85vh] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">

        {/* 時間帯切り替えボタン群（上部に小さく配置） */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button onClick={() => setTimeOfDay('DAY')} className={`p-2 rounded-full backdrop-blur-md bg-white/30 text-xl transition ${timeOfDay === 'DAY' ? 'ring-2 ring-white scale-110' : 'opacity-70'}`}>☀️</button>
          <button onClick={() => setTimeOfDay('SUNSET')} className={`p-2 rounded-full backdrop-blur-md bg-white/30 text-xl transition ${timeOfDay === 'SUNSET' ? 'ring-2 ring-white scale-110' : 'opacity-70'}`}>🌇</button>
          <button onClick={() => setTimeOfDay('NIGHT')} className={`p-2 rounded-full backdrop-blur-md bg-white/30 text-xl transition ${timeOfDay === 'NIGHT' ? 'ring-2 ring-white scale-110' : 'opacity-70'}`}>🌙</button>
        </div>

        {/* 風景エリア（空と海） */}
        <div className="flex-1 flex flex-col relative">
          {/* 空 */}
          <div className={`h-1/2 bg-gradient-to-b ${getSkyStyle()} transition-colors duration-1000 relative overflow-hidden`}>
             {/* 太陽/月 */}
             <div className={`absolute rounded-full transition-all duration-1000
               ${timeOfDay === 'DAY' ? 'w-16 h-16 bg-yellow-100 top-10 left-10 shadow-[0_0_40px_rgba(255,255,150,0.8)]' : ''}
               ${timeOfDay === 'SUNSET' ? 'w-20 h-20 bg-orange-500 top-20 left-1/4 shadow-[0_0_60px_rgba(255,100,0,0.8)]' : ''}
               ${timeOfDay === 'NIGHT' ? 'w-12 h-12 bg-yellow-50 top-10 right-20 shadow-[0_0_30px_rgba(255,255,200,0.5)]' : ''}
             `}></div>
          </div>

          {/* 海 */}
          <div className={`h-1/2 bg-gradient-to-b ${getSeaStyle()} transition-colors duration-1000 relative flex justify-center`}>
            {/* 水平線の光 */}
            <div className="absolute top-0 w-full h-1 bg-white/20 blur-sm"></div>

            {/* ウキ */}
            {(gameState === 'WAITING' || gameState === 'HIT') && (
              <div className="absolute top-1/4 flex flex-col items-center">
                <div className={`w-1 h-12 bg-gray-300/50 -mb-2 ${gameState === 'HIT' ? 'translate-y-4' : ''} transition-transform duration-200`}></div>
                <div className={`
                  w-4 h-8 rounded-full bg-gradient-to-b from-red-500 to-white shadow-lg
                  ${gameState === 'WAITING' ? 'animate-[bounce_2s_ease-in-out_infinite]' : ''}
                  ${gameState === 'HIT' ? 'translate-y-6 scale-90 animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]' : ''}
                `}>
                  {gameState === 'HIT' && (
                     <div className="absolute -top-6 -left-6 text-2xl animate-bounce font-bold text-red-400 drop-shadow-md">HIT!</div>
                  )}
                </div>
                {/* 波紋 */}
                {gameState === 'HIT' && (
                  <div className="absolute top-8 w-12 h-4 border-2 border-white/50 rounded-[100%] animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* コントロール・メッセージエリア */}
        <div className={`h-64 ${isNight ? 'bg-slate-800 text-slate-200' : 'bg-stone-100 text-stone-800'} rounded-t-3xl -mt-6 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] flex flex-col items-center p-6 transition-colors duration-1000`}>

          {/* メッセージボックス */}
          <div className={`w-full text-center p-4 rounded-2xl mb-6 font-medium text-sm md:text-base transition-colors duration-500
            ${gameState === 'HIT' ? 'bg-red-100 text-red-600 animate-pulse' :
              gameState === 'CAUGHT' ? 'bg-amber-100 text-amber-700' :
              isNight ? 'bg-slate-700 text-slate-200' : 'bg-white shadow-sm'}
          `}>
            {message}
          </div>

          {/* アクションボタン */}
          <div className="flex gap-4 w-full px-4">
            {gameState === 'IDLE' || gameState === 'CAUGHT' || gameState === 'ESCAPED' ? (
              <button
                onClick={handleCast}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-4 rounded-2xl shadow-lg transform active:scale-95 transition-all text-lg"
              >
                キャスティング 🎣
              </button>
            ) : (
              <button
                onClick={handleReel}
                className={`flex-1 font-bold py-4 rounded-2xl shadow-lg transform active:scale-95 transition-all text-lg
                  ${gameState === 'HIT'
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white animate-pulse shadow-red-500/50'
                    : 'bg-gradient-to-r from-stone-400 to-stone-500 text-white'}
                `}
              >
                リールを巻く 🔄
              </button>
            )}
          </div>

          {/* 図鑑ボタン */}
          <button
            onClick={() => setShowEncyclopedia(true)}
            className={`mt-6 text-sm underline opacity-70 hover:opacity-100 transition ${isNight ? 'text-slate-300' : 'text-stone-600'}`}
          >
            🐟 クーラーボックス（釣果を見る）
          </button>
        </div>

        {/* 釣果オーバーレイ */}
        {gameState === 'CAUGHT' && activeFish && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center p-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm flex flex-col items-center shadow-2xl animate-[slideUp_0.4s_ease-out]">
              <div className="text-6xl mb-4 animate-[bounce_1s_ease-in-out_infinite]">{activeFish.fish.emoji}</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">{activeFish.fish.name}</h2>
              <div className="text-lg font-bold text-amber-500 mb-4">{activeFish.size} cm</div>
              <p className="text-sm text-gray-600 text-center mb-8 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                {activeFish.fish.description}
              </p>
              <button
                onClick={handleReturnToIdle}
                className="w-full bg-stone-800 text-white font-bold py-3 rounded-xl hover:bg-stone-700 transition"
              >
                釣りを続ける
              </button>
            </div>
          </div>
        )}

        {/* クーラーボックス（図鑑）オーバーレイ */}
        {showEncyclopedia && (
          <div className="absolute inset-0 bg-white z-40 flex flex-col animate-[fadeIn_0.2s_ease-out]">
            <div className={`p-4 flex justify-between items-center shadow-sm ${isNight ? 'bg-slate-800 text-white' : 'bg-blue-50 text-blue-900'}`}>
              <h2 className="text-xl font-bold">クーラーボックス 🧊</h2>
              <button onClick={() => setShowEncyclopedia(false)} className="p-2 rounded-full hover:bg-black/10 transition">
                ✕
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 ${isNight ? 'bg-slate-900' : 'bg-gray-50'}`}>
              {inventory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="text-4xl mb-4">🎣</div>
                  <p>まだ魚を釣っていません。</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {inventory.map((record) => (
                    <div key={record.id} className={`p-3 rounded-2xl shadow-sm border ${isNight ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                      <div className="text-3xl mb-1">{record.fish.emoji}</div>
                      <div className={`font-bold text-sm ${isNight ? 'text-gray-200' : 'text-gray-800'}`}>{record.fish.name}</div>
                      <div className={`text-xs font-semibold ${isNight ? 'text-amber-400' : 'text-amber-600'}`}>{record.size} cm</div>
                      <div className={`text-[10px] mt-2 opacity-60 ${isNight ? 'text-gray-400' : 'text-gray-500'}`}>
                        {record.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* カスタムアニメーション定義 */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}} />
      </div>
    </div>
  );
}