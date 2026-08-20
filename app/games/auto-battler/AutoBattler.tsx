"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Sword, Heart, Zap, Skull, Users, ArrowRight, Play, RefreshCw } from 'lucide-react';

// --- データ定義とユーティリティ ---
const FIRST_NAMES = ["アレン", "カイト", "レオ", "ルーク", "シオン", "アリス", "クロエ", "ルナ", "リリィ", "エルザ", "レオン", "ゼクス", "レイ", "カイ", "ジン", "ラン", "リン", "ケン", "シン", "リュウ", "サラ", "マリア", "アンナ", "エマ", "オリビア", "ソフィア", "ミア", "シャル", "アメリア", "エミリー", "アーサー", "ランス", "ガウェイン", "トリスタン", "パーシ", "ベディ", "ガラハッド", "ボールス", "ラモラック", "ガレス", "ジャン", "ピエール", "ジャック", "アンリ", "ルイ", "マリー", "ジャンヌ", "マルグリット", "イザベル", "カトリーヌ"];
const LAST_NAMES = ["・スミス", "・ジョンソン", "・ウィリアムズ", "・ブラウン", "・ジョーンズ", "・ガルシア", "・ミラー", "・デイヴィス", "・ロドリゲス", "・マルティネス", "・ハート", "・ストーム", "・シャドウ", "・ライト", "・ブレード", "・シールド", "・アロー", "・ボウ", "・スピア", "・ランス"];

const generateName = () => {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const useLastName = Math.random() > 0.5;
  const last = useLastName ? LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)] : "";
  return first + last;
};

const generateUUID = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const generateCharacter = (team: 'player' | 'enemy', stageMultiplier = 1) => {
  const hpBase = Math.floor((50 + Math.random() * 50) * stageMultiplier);
  const atkBase = Math.floor((10 + Math.random() * 10) * stageMultiplier);
  const defBase = Math.floor((5 + Math.random() * 10) * stageMultiplier);
  const spdBase = Math.floor((10 + Math.random() * 15) * (1 + (stageMultiplier - 1) * 0.1)); // スピードは上がりすぎないように

  return {
    id: generateUUID(),
    name: generateName(),
    team: team,
    maxHp: hpBase,
    hp: hpBase,
    atk: atkBase,
    def: defBase,
    spd: spdBase,
    gauge: Math.random() * 50, // 初期ゲージはランダムにばらけさせる
    isDead: false,
    lastActionTime: 0,
    lastHitTime: 0,
  };
};

export default function AutoBattler() {
  const [phase, setPhase] = useState('title'); // title, battle, clear, gameover
  const [stage, setStage] = useState(1);
  const [players, setPlayers] = useState<any[]>([]);
  const [enemies, setEnemies] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // バトルループ制御用
  const requestRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    lastUpdateRef.current = Date.now();
  }, []);

  // stateの最新値をRefに保持（setInterval/requestAnimationFrame内で使うため）
  const stateRef = useRef({ players, enemies, logs, phase });
  useEffect(() => {
    stateRef.current = { players, enemies, logs, phase };
  }, [players, enemies, logs, phase]);

  const addLog = (msg: string) => {
    setLogs(prev => {
      const newLogs = [msg, ...prev];
      return newLogs.slice(0, 50); // 最新50件のみ保持
    });
  };

  const startGame = () => {
    const initialPlayers = Array.from({ length: 30 }, () => generateCharacter('player', 1));
    const initialEnemies = Array.from({ length: 30 }, () => generateCharacter('enemy', 1));
    setPlayers(initialPlayers);
    setEnemies(initialEnemies);
    setStage(1);
    setLogs(["=== ゲーム開始 ==="]);
    setPhase('battle');
  };

  const nextStage = () => {
    setStage(prev => prev + 1);

    // 生存者の回復と成長
    const nextPlayers = players.map(p => {
      if (p.isDead) return p;

      const healAmount = Math.floor(p.maxHp * 0.3); // 30%回復
      const newMaxHp = Math.floor(p.maxHp * 1.1); // 最大HP 10%UP
      const newAtk = Math.floor(p.atk * 1.1);
      const newDef = Math.floor(p.def * 1.1);
      const newSpd = Math.floor(p.spd * 1.05);

      return {
        ...p,
        maxHp: newMaxHp,
        hp: Math.min(newMaxHp, p.hp + healAmount),
        atk: newAtk,
        def: newDef,
        spd: newSpd,
        gauge: 0,
        lastActionTime: 0,
        lastHitTime: 0
      };
    });

    // 新規加入 (5〜10名)
    const newRecruitsCount = Math.floor(Math.random() * 6) + 5;
    const newRecruits = Array.from({ length: newRecruitsCount }, () => generateCharacter('player', 1 + (stage * 0.1))); // 少し強い状態で加入

    // 敵の生成（ステージに応じた強さ、数は30固定）
    const nextEnemies = Array.from({ length: 30 }, () => generateCharacter('enemy', 1 + (stage * 0.2)));

    setPlayers([...nextPlayers, ...newRecruits]);
    setEnemies(nextEnemies);
    setLogs([`=== ステージ ${stage + 1} 開始 ===`, `新たな志願兵が ${newRecruitsCount} 名加入した！`]);
    setPhase('battle');
  };

  const updateBattleRef = useRef<() => void>(undefined);

  const updateBattle = useCallback(() => {
    const now = Date.now();
    const dt = now - lastUpdateRef.current;

    // 一定時間経過していなければスキップ（フレームレート調整）
    if (dt < 50) {
      if (updateBattleRef.current) {
         requestRef.current = requestAnimationFrame(updateBattleRef.current);
      }
      return;
    }
    lastUpdateRef.current = now;

    if (stateRef.current.phase !== 'battle') return;

    const currentPlayers = [...stateRef.current.players];
    const currentEnemies = [...stateRef.current.enemies];
    let currentLogs = [...stateRef.current.logs];
    let hasStateChanged = false;

    // 行動可能なキャラクターの処理関数
    const processTeamActions = (attackers: any[], defenders: any[]) => {
      let aliveDefenders = defenders.filter(d => !d.isDead);

      for (let i = 0; i < attackers.length; i++) {
        const attacker = attackers[i];
        if (attacker.isDead) continue;

        attacker.gauge += attacker.spd * (dt / 100); // ゲージ増加

        if (attacker.gauge >= 100) {
          if (aliveDefenders.length === 0) break; // 敵がいない

          // 攻撃処理
          attacker.gauge = 0;
          attacker.lastActionTime = now;
          hasStateChanged = true;

          // ランダムなターゲットを選択
          const targetIndex = Math.floor(Math.random() * aliveDefenders.length);
          const target = aliveDefenders[targetIndex];

          // ダメージ計算: (攻撃力 * 乱数) - (防御力 / 2)
          const dmgRng = 0.8 + Math.random() * 0.4; // 0.8 ~ 1.2
          let damage = Math.floor((attacker.atk * dmgRng) - (target.def * 0.5));
          damage = Math.max(1, damage); // 最低1ダメージ

          // ダメージ適用（元の配列から直接探して更新）
          const defIndex = defenders.findIndex(d => d.id === target.id);
          defenders[defIndex] = { ...defenders[defIndex], hp: defenders[defIndex].hp - damage, lastHitTime: now };

          let logMsg = `${attacker.name} の攻撃！ ${target.name} に ${damage} ダメージ。`;

          if (defenders[defIndex].hp <= 0) {
            defenders[defIndex].hp = 0;
            defenders[defIndex].isDead = true;
            defenders[defIndex].gauge = 0;
            logMsg += ` [${target.name} 死亡]`;
            // 生存リストから削除
            aliveDefenders = aliveDefenders.filter(d => d.id !== target.id);
          }

          currentLogs.unshift(logMsg);
        }
      }
    };

    processTeamActions(currentPlayers, currentEnemies);
    processTeamActions(currentEnemies, currentPlayers);

    // ログがあふれないように
    if (currentLogs.length > 50) {
      currentLogs = currentLogs.slice(0, 50);
    }

    if (hasStateChanged) {
      setPlayers(currentPlayers);
      setEnemies(currentEnemies);
      setLogs(currentLogs);
    }

    // 勝敗判定
    const alivePlayers = currentPlayers.filter(p => !p.isDead).length;
    const aliveEnemies = currentEnemies.filter(e => !e.isDead).length;

    if (alivePlayers === 0) {
      setPhase('gameover');
    } else if (aliveEnemies === 0) {
      setPhase('clear');
    } else {
      if (updateBattleRef.current) {
        requestRef.current = requestAnimationFrame(updateBattleRef.current);
      }
    }
  }, []);

  useEffect(() => {
    updateBattleRef.current = updateBattle;
  }, [updateBattle]);

  useEffect(() => {
    if (phase === 'battle') {
      lastUpdateRef.current = Date.now();
      if (updateBattleRef.current) {
        requestRef.current = requestAnimationFrame(updateBattleRef.current);
      }
    }
    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [phase, updateBattle]);

  // UIコンポーネント: キャラクターカード
  const CharacterCard = ({ char }: { char: any }) => {
    const hpPercent = Math.max(0, (char.hp / char.maxHp) * 100);
    const gaugePercent = Math.min(100, char.gauge);
    const now = Date.now();

    // 行動・被弾エフェクト
    const isActing = now - char.lastActionTime < 200;
    const isHit = now - char.lastHitTime < 200;

    let bgClass = char.team === 'player' ? 'bg-blue-900/40 border-blue-700/50' : 'bg-red-900/40 border-red-700/50';
    if (char.isDead) bgClass = 'bg-gray-800/50 border-gray-700/50 opacity-50 grayscale';
    if (isActing) bgClass = 'bg-yellow-500/50 border-yellow-400 scale-105';
    if (isHit) bgClass = 'bg-red-500/50 border-red-400 scale-95 translate-x-1';

    return (
      <div className={`p-2 border rounded-md transition-all duration-100 flex flex-col gap-1 ${bgClass} text-xs shadow-sm overflow-hidden relative`}>
        {char.isDead && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Skull className="w-8 h-8 text-gray-400/50" />
          </div>
        )}
        <div className="font-bold truncate" title={char.name}>{char.name}</div>

        {/* ステータス行 */}
        <div className="flex justify-between text-[10px] text-gray-300">
          <span className="flex items-center gap-0.5"><Heart className="w-3 h-3 text-red-400"/> {Math.ceil(char.hp)}/{char.maxHp}</span>
          <span className="flex items-center gap-0.5"><Sword className="w-3 h-3 text-gray-400"/> {char.atk}</span>
        </div>

        {/* HPバー */}
        <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
          <div className={`h-full ${char.team === 'player' ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${hpPercent}%` }}></div>
        </div>

        {/* 行動ゲージ (生存時のみ) */}
        {!char.isDead && (
          <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400" style={{ width: `${gaugePercent}%` }}></div>
          </div>
        )}
      </div>
    );
  };

  const alivePlayerCount = players.filter(p => !p.isDead).length;
  const aliveEnemyCount = enemies.filter(e => !e.isDead).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* ヘッダー情報 */}
      <header className="bg-slate-900 p-4 border-b border-slate-800 shadow-md flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-400 w-6 h-6" />
          <h1 className="font-bold text-lg hidden sm:block">エンドレス・フロント</h1>
        </div>
        <div className="text-xl font-black text-yellow-400 tracking-wider">
          STAGE {stage}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-blue-300">自軍残存</div>
            <div className="font-bold text-blue-400">{alivePlayerCount} <span className="text-sm text-slate-500">/ {players.length}</span></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-red-300">敵軍残存</div>
            <div className="font-bold text-red-400">{aliveEnemyCount} <span className="text-sm text-slate-500">/ {enemies.length}</span></div>
          </div>
        </div>
      </header>

      {/* メイン戦場表示 */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row relative">

        {/* プレイヤー軍 */}
        <div className="flex-1 border-r border-slate-800 p-2 overflow-y-auto bg-slate-900/50 pb-32 md:pb-2">
          <h2 className="text-center font-bold text-blue-400 mb-2 border-b border-blue-900/50 pb-1 sticky top-0 bg-slate-900 z-10">プレイヤー軍</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {players.map(p => <CharacterCard key={p.id} char={p} />)}
          </div>
        </div>

        {/* 中央のVS表示 (PC時) */}
        <div className="hidden md:flex flex-col items-center justify-center w-12 bg-slate-950 z-10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="bg-red-600 text-white font-black p-2 rounded-full transform -rotate-12">VS</div>
        </div>

        {/* 敵軍 */}
        <div className="flex-1 p-2 overflow-y-auto bg-slate-900/50 pb-48 md:pb-2">
          <h2 className="text-center font-bold text-red-400 mb-2 border-b border-red-900/50 pb-1 sticky top-0 bg-slate-900 z-10">敵軍</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {enemies.map(e => <CharacterCard key={e.id} char={e} />)}
          </div>
        </div>

      </main>

      {/* ログウィンドウ（画面下部固定） */}
      <div className="h-32 md:h-40 bg-slate-950 border-t border-slate-800 p-2 overflow-y-auto text-xs sm:text-sm font-mono fixed md:relative bottom-0 w-full z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
        {logs.map((log, i) => (
          <div key={i} className={`mb-0.5 ${log.includes('死亡') ? 'text-red-400' : log.includes('の攻撃') ? 'text-slate-300' : 'text-yellow-300'}`}>
            {log}
          </div>
        ))}
      </div>

      {/* オーバーレイ（タイトル・クリア・ゲームオーバー） */}
      {phase !== 'battle' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 sm:p-10 rounded-xl shadow-2xl max-w-lg w-full text-center">

            {phase === 'title' && (
              <>
                <Shield className="w-20 h-20 text-blue-500 mx-auto mb-6" />
                <h1 className="text-3xl sm:text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  総力戦：エンドレス・フロント
                </h1>
                <p className="text-slate-400 mb-8 text-sm sm:text-base leading-relaxed">
                  30対30の軍勢がぶつかり合うオートバトルRPG。<br/>
                  戦場を生き残り、成長し、次なる戦地へ向かえ。<br/>
                  失われた命は二度と戻らない。
                </p>
                <button
                  onClick={startGame}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <Play className="w-5 h-5" /> 部隊を展開する
                </button>
              </>
            )}

            {phase === 'clear' && (
              <>
                <h2 className="text-3xl font-black text-yellow-400 mb-2">STAGE {stage} CLEAR</h2>
                <p className="text-slate-300 mb-6">敵軍を殲滅した！</p>

                <div className="bg-slate-800 p-4 rounded-lg mb-6 text-left text-sm">
                  <h3 className="font-bold text-blue-300 mb-2 flex items-center gap-2"><Heart className="w-4 h-4"/> 戦果報告</h3>
                  <ul className="space-y-1 text-slate-300">
                    <li>・生存者 {alivePlayerCount}名 が <span className="text-green-400 font-bold">HP回復 ＆ ステータスUP</span></li>
                    <li>・前線基地より <span className="text-blue-400 font-bold">新たな兵士が加入</span> します</li>
                    <li>・次ステージの敵は更に強力になります</li>
                  </ul>
                </div>

                <button
                  onClick={nextStage}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  次の戦場へ進む <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}

            {phase === 'gameover' && (
              <>
                <Skull className="w-20 h-20 text-red-500 mx-auto mb-6" />
                <h2 className="text-4xl font-black text-red-500 mb-2">部隊全滅</h2>
                <p className="text-slate-400 mb-6">到達ステージ: <span className="text-white font-bold text-xl">{stage}</span></p>

                <p className="text-sm text-slate-500 mb-8 italic">
                  「彼らの犠牲は無駄にはならないだろう…」
                </p>

                <button
                  onClick={startGame}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" /> 新たな部隊を編成する
                </button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}