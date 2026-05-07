import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { TileData } from '../game/types';

interface GameOverlayProps {
  initialTotalSteps?: number;
}

export const GameOverlay: React.FC<GameOverlayProps> = ({ initialTotalSteps = 0 }) => {
  const [selectedSlot, setSelectedSlot] = useState(-1); // -1 = Empty Hand
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hp, setHp] = useState(100);
  const [hotbar, setHotbar] = useState<(any | null)[]>(new Array(5).fill(null));
  const [totalSteps, setTotalSteps] = useState(initialTotalSteps);
  const [dayTime, setDayTime] = useState(0);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isSaveNoticeOpen, setIsSaveNoticeOpen] = useState(false);
  const [signInput, setSignInput] = useState('');
  const [pendingSignPos, setPendingSignPos] = useState<{ tx: number; ty: number } | null>(null);
  const [showStayBtn, setShowStayBtn] = useState(false);

  const itemInfo: Record<string, { icon: string, label: string, desc: string }> = {
    bridge: { icon: '🪵', label: '橋', desc: '水の上に設置可能' },
    tent: { icon: '⛺', label: 'テント', desc: '休憩・リスポーン地点' },
    fire: { icon: '🔥', label: '焚き火', desc: '明かり・魔除け(5マス)' },
    torch: { icon: '🕯️', label: '松明', desc: '周囲を照らす明かり' },
    sign: { icon: '🪧', label: '看板', desc: '文字を書ける立て札' },
    sword: { icon: '🗡️', label: '剣', desc: '周囲を攻撃(威力40)' },
    food: { icon: '🍖', label: '肉', desc: 'HPを30回復する' },
    pickaxe: { icon: '⛏️', label: 'ピッケル', desc: '地形を一段階下げる' },
    road: { icon: '🛣️', label: '道路', desc: '移動速度が1.5倍になる' },
    barricade: { icon: '🚧', label: 'バリケード', desc: '通行不可の壁を作る' },
    spikes: { icon: '🪤', label: '罠', desc: '踏んだ敵にダメージ' },
    lantern: { icon: '🏮', label: '街灯', desc: '広範囲を照らす(通行不可)' },
  };

  useEffect(() => {
    const onPlayerMoved = (pos: { x: number; y: number }) => setCoords(pos);
    const onPlayerStepped = (steps: number) => {
      setTotalSteps(prev => prev + steps);
      setSessionSteps(prev => prev + steps);
    };
    const onTileContact = (data: TileData | undefined) => setShowStayBtn(data?.type === 'tent');
    const onOpenSignModal = (pos: { tx: number, ty: number }) => {
      setPendingSignPos(pos);
      setIsSignModalOpen(true);
    };
    const onPlayerHpChanged = (newHp: number) => setHp(newHp);
    const onHotbarChanged = (newHotbar: any[]) => setHotbar([...newHotbar]);
    const onTimeChanged = (time: number) => setDayTime(time);
    const onLoadSave = (data: { totalSteps: number, hp?: number, hotbar?: any[] }) => {
      setTotalSteps(data.totalSteps);
      if (data.hp !== undefined) setHp(data.hp);
      if (data.hotbar !== undefined) setHotbar([...data.hotbar]);
      setSessionSteps(0);
    };
    const onSaveTriggered = () => {
      console.log('Saved to IndexedDB');
    };

    EventBus.on('player-moved', onPlayerMoved);
    EventBus.on('player-stepped', onPlayerStepped);
    EventBus.on('player-hp-changed', onPlayerHpChanged);
    EventBus.on('hotbar-changed', onHotbarChanged);
    EventBus.on('time-changed', onTimeChanged);
    EventBus.on('tile-contact', onTileContact);
    EventBus.on('open-sign-modal', onOpenSignModal);
    EventBus.on('load-save', onLoadSave);
    EventBus.on('save-triggered', onSaveTriggered);

    return () => {
      EventBus.off('player-moved', onPlayerMoved);
      EventBus.off('player-stepped', onPlayerStepped);
      EventBus.off('player-hp-changed', onPlayerHpChanged);
      EventBus.off('hotbar-changed', onHotbarChanged);
      EventBus.off('time-changed', onTimeChanged);
      EventBus.off('tile-contact', onTileContact);
      EventBus.off('open-sign-modal', onOpenSignModal);
      EventBus.off('load-save', onLoadSave);
      EventBus.off('save-triggered', onSaveTriggered);
    };
  }, [totalSteps, sessionSteps]);

  useEffect(() => {
    EventBus.emit('set-selected-slot', selectedSlot);
  }, [selectedSlot]);

  const handleDiscard = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (confirm('このアイテムを捨てますか？')) {
      EventBus.emit('discard-item', index);
    }
  };

  const handleSignConfirm = () => {
    if (pendingSignPos) {
      EventBus.emit('place-sign', { ...pendingSignPos, text: signInput || '看板' });
      setIsSignModalOpen(false);
      setSignInput('');
      setPendingSignPos(null);
    }
  };

  const handleStayInTent = () => {
    EventBus.emit('request-save', { totalSteps });
    setSessionSteps(0);
    setIsSaveNoticeOpen(true);
    setTimeout(() => setIsSaveNoticeOpen(false), 3000);
  };

  return (
    <>
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 p-3 bg-black/60 rounded-lg text-white text-xs pointer-events-none z-10 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold">HP</span>
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden border border-white/20">
              <div 
                className={`h-full transition-all duration-300 ${hp > 50 ? 'bg-green-500' : hp > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${hp}%` }}
              />
            </div>
            <span className={`font-mono ${hp <= 20 ? 'animate-pulse text-red-400' : ''}`}>{hp}</span>
          </div>
          <div className="text-lg">
            {dayTime < 0.4 ? '☀' : dayTime < 0.5 ? '🌅' : dayTime < 0.9 ? '🌙' : '🌅'}
          </div>
        </div>
        <div className="pt-1 border-t border-white/10 space-y-1">
          <div>座標: {coords.x}, {coords.y}</div>
          <div>累計歩数: <span className="text-green-400 font-bold">{totalSteps}</span> 歩</div>
          <div className="text-[10px] text-gray-300">ドラッグで移動 / タップで建築</div>
        </div>
      </div>
{/* Top Right Buttons */}
<div className="absolute top-4 right-4 z-50 flex gap-2">
  <button 
    onClick={() => {
      if (confirm('拠点（最後に休んだ場所）に戻りますか？')) {
        EventBus.emit('request-respawn');
      }
    }}
    className="bg-black/60 hover:bg-orange-900/80 text-white p-2 rounded-full border border-white/20 transition-colors pointer-events-auto"
    title="拠点に帰還"
  >
    🏳️
  </button>
  <button 
    onClick={() => {
      if (confirm('初期地点 (0, 0) に戻りますか？\n(スタックして動けない場合に使用してください)')) {
        EventBus.emit('request-home');
      }
    }}
    className="bg-black/60 hover:bg-red-900/80 text-white p-2 rounded-full border border-white/20 transition-colors pointer-events-auto"
    title="初期地点へ戻る"
  >
    🏠
  </button>
  <button 
    onClick={() => window.location.href = '/games'}
    className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full border border-white/20 transition-colors pointer-events-auto"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  </button>
</div>

      {/* Hotbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/70 rounded-2xl border border-white/20 z-20 shadow-2xl scale-90 sm:scale-100 items-end">
        {/* Empty Hand Slot */}
        <button
          onClick={() => setSelectedSlot(-1)}
          className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
            selectedSlot === -1 ? 'bg-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-neutral-800 hover:bg-neutral-700'
          }`}
        >
          👊
          {selectedSlot === -1 && (
            <div className="absolute -bottom-8 bg-black/80 text-[10px] text-white px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">
              素手 (素材採取など)
            </div>
          )}
        </button>

        <div className="w-px h-8 bg-white/20 self-center mx-1" />

        {/* Item Slots */}
        {hotbar.map((slot, index) => {
          const info = slot ? itemInfo[slot.id] : null;
          const isSelected = selectedSlot === index;

          return (
            <div key={index} className="relative group">
              {/* Discard Button */}
              {isSelected && slot && (
                <button
                  onClick={(e) => handleDiscard(e, index)}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-600 hover:bg-red-500 text-white text-[10px] px-2 py-1 rounded shadow-lg animate-in fade-in slide-in-from-bottom-1"
                >
                  捨てる 🗑️
                </button>
              )}

              <button
                onClick={() => setSelectedSlot(index)}
                className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                  isSelected ? 'bg-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-neutral-800 hover:bg-neutral-700'
                } ${!slot ? 'opacity-40' : ''}`}
              >
                {info ? info.icon : ''}
                
                {slot && slot.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                    {slot.count}
                  </span>
                )}

                {isSelected && info && (
                  <div className="absolute -bottom-8 bg-black/80 text-[10px] text-white px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">
                    {info.label}: {info.desc}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Stay Button */}
      {showStayBtn && (
        <button
          onClick={handleStayInTent}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 px-8 rounded-full shadow-lg border-2 border-white z-30 transition-transform active:scale-95"
        >
          ⛺ 宿泊してセーブ
        </button>
      )}

      {/* Sign Modal */}
      {isSignModalOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-black text-center">看板の内容</h3>
            <input
              type="text"
              value={signInput}
              onChange={(e) => setSignInput(e.target.value)}
              placeholder="メッセージを入力..."
              maxLength={20}
              autoFocus
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-black outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSignConfirm}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
            >
              設置する
            </button>
          </div>
        </div>
      )}

      {/* Save Notice */}
      {isSaveNoticeOpen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-white p-8 rounded-2xl border-2 border-green-500 text-center z-[200] shadow-2xl">
          <div className="text-2xl font-bold mb-4">⛺ 宿泊完了</div>
          <div className="space-y-2 text-lg">
            <div>今回の歩数: <span className="text-green-400 font-mono font-bold">{sessionSteps}</span></div>
            <div>累計歩数: <span className="text-green-400 font-mono font-bold">{totalSteps}</span></div>
          </div>
          <div className="mt-6 text-sm text-gray-400">データを保存しました</div>
        </div>
      )}
    </>
  );
};
