/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function StickmanLineWars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // HUD UI用の状態
  const [playerGold, setPlayerGold] = useState(100);
  const [playerIncome, setPlayerIncome] = useState(10);
  const [enemyGold, setEnemyGold] = useState(100);
  const [enemyIncome, setEnemyIncome] = useState(10);

  const [playerBaseHp, setPlayerBaseHp] = useState(1000);
  const [enemyBaseHp, setEnemyBaseHp] = useState(1000);
  const [playerBaseMaxHp] = useState(1000);
  const [enemyBaseMaxHp] = useState(1000);

  const [gameOver, setGameOver] = useState(false);
  const [winnerText, setWinnerText] = useState("");

  const gameStateRef = useRef<any>(null);

  // 初期化とゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 定数・設定
    const CANVAS_W = 800;
    const CANVAS_H = 400;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    const LANES = [100, 200, 300]; // 3レーンのY座標

    const UNIT_TYPES = {
        FIGHTER: { name: 'Fighter', cost: 15, hp: 50, atk: 10, spd: 40, range: 25, color: '#4facfe', cooldown: 1.0, type: 'melee' },
        ARCHER:  { name: 'Archer',  cost: 25, hp: 30, atk: 8,  spd: 35, range: 150, color: '#00f2fe', cooldown: 1.5, type: 'ranged' },
        TANK:    { name: 'Tank',    cost: 40, hp: 150, atk: 5, spd: 20, range: 30, color: '#43e97b', cooldown: 1.2, type: 'melee' },
        KING:    { name: 'King',    cost: 100, hp: 300, atk: 25, spd: 25, range: 40, color: '#f83600', cooldown: 1.5, type: 'melee' },
        MAGE:    { name: 'Mage',    cost: 60, hp: 40, atk: 15, spd: 30, range: 120, color: '#b224ef', cooldown: 2.0, type: 'splash' }
    };

    // 状態を保持するオブジェクト
    const state = {
        units: [] as any[],
        particles: [] as any[],
        projectiles: [] as any[],
        floatingTexts: [] as any[],
        pGold: 100,
        pIncome: 10,
        eGold: 100,
        eIncome: 10,
        pBaseHp: 1000,
        eBaseHp: 1000,
        timer: 0,
        lastTime: performance.now(),
        isGameOver: false
    };
    gameStateRef.current = state;

    // クラス定義（関数内にスコープを閉じて定義）
    class Unit {
        type: string;
        isPlayer: boolean;
        stats: any;
        x: number;
        y: number;
        targetLaneIdx: number;
        hp: number;
        maxHp: number;
        cooldown: number;
        animFrame: number;
        isDead: boolean;
        deathTimer: number;
        aiTimer: number;

        constructor(typeStr: string, isPlayer: boolean, laneIdx: number) {
            this.type = typeStr;
            this.isPlayer = isPlayer;
            //@ts-expect-error Object access
            this.stats = UNIT_TYPES[typeStr];
            this.x = isPlayer ? 50 : CANVAS_W - 50;
            this.targetLaneIdx = laneIdx;
            this.y = LANES[laneIdx] + (Math.random()*10 - 5); // 多少ランダムにバラける
            this.hp = this.stats.hp;
            this.maxHp = this.hp;
            this.cooldown = 0;
            this.animFrame = 0;
            this.isDead = false;
            this.deathTimer = 1.0; // 死亡エフェクト残り時間
            this.aiTimer = 0;
        }

        update(dt: number) {
            if (this.isDead) {
                this.deathTimer -= dt;
                return;
            }

            if (this.cooldown > 0) this.cooldown -= dt;
            this.animFrame += dt * 10;
            this.aiTimer -= dt;

            // レーン間の移動 (緩やかに目標レーンへYを近づける)
            const targetY = LANES[this.targetLaneIdx];
            if (Math.abs(this.y - targetY) > 2) {
                this.y += (targetY > this.y ? 1 : -1) * 30 * dt;
            }

            // AI思考（敵のみ: 近くに敵がいないならレーン変更）
            if (!this.isPlayer && this.aiTimer <= 0) {
                this.aiTimer = 2.0;
                const enemies = state.units.filter(u => u.isPlayer !== this.isPlayer && !u.isDead);
                const enemyInFront = enemies.some(e =>
                    e.targetLaneIdx === this.targetLaneIdx && e.x < this.x + 20
                );

                if (!enemyInFront) {
                    let closestE = null;
                    let minDist = Infinity;
                    for(const e of enemies) {
                        const d = Math.abs(e.x - this.x);
                        if (d < minDist) {
                            minDist = d;
                            closestE = e;
                        }
                    }
                    if (closestE) {
                        this.targetLaneIdx = closestE.targetLaneIdx;
                    }
                }
            }

            const friends = state.units.filter(u => u.isPlayer === this.isPlayer && !u.isDead && u !== this);
            const enemies = state.units.filter(u => u.isPlayer !== this.isPlayer && !u.isDead);

            // ターゲット選択
            let target = null;
            let minDist = Infinity;
            for (const e of enemies) {
                const xDiff = this.isPlayer ? (e.x - this.x) : (this.x - e.x);
                if (xDiff < -30) continue;
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                if (dist < minDist && dist <= this.stats.range) {
                    minDist = dist;
                    target = e;
                }
            }

            // ブロック判定 (味方が前にいるか)
            let blocked = false;
            if (this.type !== 'KING') {
                for (const f of friends) {
                    if (f.targetLaneIdx !== this.targetLaneIdx) continue;
                    const xDiff = this.isPlayer ? (f.x - this.x) : (this.x - f.x);
                    if (xDiff > 0 && xDiff < 20 && Math.abs(f.y - this.y) < 15) {
                        blocked = true;
                        break;
                    }
                }
            }

            // 行動フェーズ
            if (target) {
                // 射程内なら攻撃
                if (this.cooldown <= 0) {
                    this.attack(target);
                    this.cooldown = this.stats.cooldown;
                }
            } else if (!blocked) {
                // 前進
                const dir = this.isPlayer ? 1 : -1;
                this.x += dir * this.stats.spd * dt;

                // 敵ベースへの攻撃判定
                if (this.isPlayer && this.x > CANVAS_W - 50) {
                    if (this.cooldown <= 0) {
                        state.eBaseHp -= this.stats.atk;
                        spawnFloatingText(CANVAS_W - 50, this.y, `-${this.stats.atk}`, '#ff5555');
                        this.cooldown = this.stats.cooldown;
                    }
                    this.x = CANVAS_W - 50;
                } else if (!this.isPlayer && this.x < 50) {
                    if (this.cooldown <= 0) {
                        state.pBaseHp -= this.stats.atk;
                        spawnFloatingText(50, this.y, `-${this.stats.atk}`, '#ff5555');
                        this.cooldown = this.stats.cooldown;
                    }
                    this.x = 50;
                }
            }
        }

        attack(target: any) {
            if (this.stats.type === 'melee') {
                target.takeDamage(this.stats.atk);
                spawnHitEffect(target.x, target.y);
            } else if (this.stats.type === 'ranged' || this.stats.type === 'splash') {
                state.projectiles.push(new Projectile(this.x, this.y, target, this.stats.atk, this.stats.type === 'splash', this.isPlayer));
            }
        }

        takeDamage(amt: number) {
            this.hp -= amt;
            spawnFloatingText(this.x, this.y - 20, `-${amt}`, '#ffffff');
            if (this.hp <= 0 && !this.isDead) {
                this.isDead = true;
                this.hp = 0;
                if (!this.isPlayer) {
                    state.pGold += Math.floor(this.stats.cost * 0.5);
                }
            }
        }

        draw(ctx: CanvasRenderingContext2D) {
            if (this.isDead && this.deathTimer <= 0) return;

            ctx.save();
            ctx.translate(this.x, this.y);

            if (this.isDead) {
                ctx.globalAlpha = this.deathTimer;
                ctx.rotate(Math.PI / 2 * (this.isPlayer ? -1 : 1));
            } else {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-10, -25, 20, 3);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(-10, -25, 20 * (this.hp / this.maxHp), 3);
            }

            ctx.fillStyle = this.isPlayer ? '#4facfe' : '#e94560';

            // 頭
            ctx.beginPath();
            ctx.arc(0, -10, 6, 0, Math.PI*2);
            ctx.fill();

            // 胴体
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(0, 8);
            ctx.stroke();

            // 足（アニメーション）
            let legSwing = this.isDead ? 0 : Math.sin(this.animFrame) * 8;
            if (this.cooldown > 0 && !this.isDead) legSwing = 0; // 攻撃中・停止中は足止め

            ctx.beginPath();
            ctx.moveTo(0, 8);
            ctx.lineTo(-5 + legSwing, 18);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 8);
            ctx.lineTo(5 - legSwing, 18);
            ctx.stroke();

            // 武器/手
            if (this.stats.type === 'ranged' || this.stats.type === 'splash') {
                ctx.beginPath();
                ctx.moveTo(-5, 0);
                ctx.lineTo((this.isPlayer?15:-15), 0);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (this.stats.type === 'melee') {
                let atkSwing = 0;
                if (this.cooldown > this.stats.cooldown * 0.8) {
                    atkSwing = this.isPlayer ? 10 : -10; // 振り下ろし
                }
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo((this.isPlayer?10:-10) + atkSwing, -5 + Math.abs(atkSwing));
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            // キング用の冠
            if (this.type === 'KING') {
                ctx.fillStyle = 'gold';
                ctx.beginPath();
                ctx.moveTo(-5, -16);
                ctx.lineTo(0, -22);
                ctx.lineTo(5, -16);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    class Projectile {
        x: number;
        y: number;
        target: any;
        dmg: number;
        isSplash: boolean;
        isPlayer: boolean;
        speed: number;

        constructor(x: number, y: number, target: any, dmg: number, isSplash: boolean, isPlayer: boolean) {
            this.x = x;
            this.y = y;
            this.target = target;
            this.dmg = dmg;
            this.isSplash = isSplash;
            this.isPlayer = isPlayer;
            this.speed = 200;
        }

        update(dt: number) {
            if (!this.target || this.target.isDead) {
                return false; // ターゲットがいなければ消滅
            }
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 10) {
                if (this.isSplash) {
                    // スプラッシュダメージ
                    spawnSplashEffect(this.x, this.y);
                    const enemies = state.units.filter(u => u.isPlayer !== this.isPlayer && !u.isDead);
                    for (const e of enemies) {
                        if (Math.hypot(e.x - this.x, e.y - this.y) < 50) {
                            e.takeDamage(this.dmg);
                        }
                    }
                } else {
                    this.target.takeDamage(this.dmg);
                    spawnHitEffect(this.target.x, this.target.y);
                }
                return false;
            }

            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
            return true;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.fillStyle = this.isSplash ? '#b224ef' : '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.isSplash ? 4 : 2, 0, Math.PI*2);
            ctx.fill();
        }
    }

    class Particle {
        x: number;
        y: number;
        vx: number;
        vy: number;
        life: number;
        maxLife: number;
        color: string;

        constructor(x: number, y: number, color: string) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 100;
            this.vy = (Math.random() - 0.5) * 100;
            this.maxLife = Math.random() * 0.3 + 0.2;
            this.life = this.maxLife;
            this.color = color;
        }
        update(dt: number) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.life -= dt;
            return this.life > 0;
        }
        draw(ctx: CanvasRenderingContext2D) {
            ctx.globalAlpha = this.life / this.maxLife;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    class FloatingText {
        x: number;
        y: number;
        text: string;
        color: string;
        life: number;

        constructor(x: number, y: number, text: string, color: string) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.color = color;
            this.life = 1.0;
        }
        update(dt: number) {
            this.y -= 20 * dt;
            this.life -= dt;
            return this.life > 0;
        }
        draw(ctx: CanvasRenderingContext2D) {
            ctx.globalAlpha = this.life;
            ctx.fillStyle = this.color;
            ctx.font = '14px Arial';
            ctx.fillText(this.text, this.x - 5, this.y);
            ctx.globalAlpha = 1.0;
        }
    }

    function spawnHitEffect(x: number, y: number) {
        for(let i=0; i<5; i++) state.particles.push(new Particle(x, y, '#fff'));
    }
    function spawnSplashEffect(x: number, y: number) {
        for(let i=0; i<15; i++) state.particles.push(new Particle(x, y, '#b224ef'));
    }
    function spawnFloatingText(x: number, y: number, txt: string, color: string) {
        state.floatingTexts.push(new FloatingText(x, y, txt, color));
    }

    // AI ロジック
    function updateAI() {
        if (Math.random() < 0.02) {
            // スポーン可能かチェック
            const affordTypes = Object.keys(UNIT_TYPES).filter(k => state.eGold >= (UNIT_TYPES as any)[k].cost);
            if (affordTypes.length > 0) {
                const type = affordTypes[Math.floor(Math.random() * affordTypes.length)];
                const lane = Math.floor(Math.random() * 3);
                state.eGold -= (UNIT_TYPES as any)[type].cost;
                state.units.push(new Unit(type, false, lane));
            }
        }
    }

    let reqId: number;

    function gameLoop(now: number) {
        if (state.isGameOver) return;

        let dt = (now - state.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1; // spike prevention
        state.lastTime = now;

        state.timer += dt;

        // Income (毎秒少しずつ増加)
        state.pGold += state.pIncome * dt * 0.1;
        state.eGold += state.eIncome * dt * 0.1;

        // Update states to React
        setPlayerGold(Math.floor(state.pGold));
        setEnemyGold(Math.floor(state.eGold));
        setPlayerBaseHp(Math.floor(state.pBaseHp));
        setEnemyBaseHp(Math.floor(state.eBaseHp));

        // Income Up (10秒ごと)
        if (state.timer > 10) {
            state.pIncome += 2;
            state.eIncome += 3; // AIはチート気味に増える
            state.timer = 0;
            setPlayerIncome(state.pIncome);
            setEnemyIncome(state.eIncome);
        }

        updateAI();

        state.units.forEach(u => u.update(dt));
        state.units = state.units.filter(u => !u.isDead || u.deathTimer > 0);

        state.projectiles = state.projectiles.filter(p => p.update(dt));
        state.particles = state.particles.filter(p => p.update(dt));
        state.floatingTexts = state.floatingTexts.filter(t => t.update(dt));

        // Draw
        ctx!.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // 背景レーン描画
        ctx!.fillStyle = '#111';
        LANES.forEach((y, i) => {
            ctx!.fillRect(0, y - 20, CANVAS_W, 40);
            ctx!.fillStyle = 'rgba(255,255,255,0.05)';
            ctx!.fillText(`Lane ${i+1}`, CANVAS_W/2 - 20, y + 5);
        });

        // Bases
        ctx!.fillStyle = '#0f3460';
        ctx!.fillRect(0, 0, 50, CANVAS_H);
        ctx!.fillStyle = '#e94560';
        ctx!.fillRect(CANVAS_W - 50, 0, 50, CANVAS_H);

        // Sort by Y for 2D depth feeling
        state.units.sort((a, b) => a.y - b.y);

        state.units.forEach(u => u.draw(ctx!));
        state.projectiles.forEach(p => p.draw(ctx!));
        state.particles.forEach(p => p.draw(ctx!));
        state.floatingTexts.forEach(t => t.draw(ctx!));

        // Win/Lose Check
        if (state.pBaseHp <= 0) {
            setWinnerText("Defeat...");
            setGameOver(true);
            state.isGameOver = true;
        } else if (state.eBaseHp <= 0) {
            setWinnerText("VICTORY!!");
            setGameOver(true);
            state.isGameOver = true;
        }

        if (!state.isGameOver) {
            reqId = requestAnimationFrame(gameLoop);
        }
    }

    // SPAWNカスタムイベントのリスナー
    const handleSpawn = (e: any) => {
        if (state.isGameOver) return;
        const { type, lane } = e.detail;
        const cost = (UNIT_TYPES as any)[type].cost;
        if (state.pGold >= cost) {
            state.pGold -= cost;
            state.units.push(new Unit(type, true, lane));
            setPlayerGold(Math.floor(state.pGold));
        }
    };
    window.addEventListener('SPAWN', handleSpawn);

    reqId = requestAnimationFrame(gameLoop);

    return () => {
        cancelAnimationFrame(reqId);
        window.removeEventListener('SPAWN', handleSpawn);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1a2e] text-white font-sans overflow-x-hidden p-4">
      <h1 className="text-3xl font-bold mb-4 text-[#e94560] drop-shadow-md">Stickman Line Wars</h1>

      {/* HUD */}
      <div className="w-full max-w-[800px] flex justify-between items-center bg-black/50 p-4 rounded-lg mb-4">
        {/* プレイヤー情報 */}
        <div className="flex flex-col w-[40%]">
          <div className="text-[#4facfe] font-bold text-xl mb-1">Player Base</div>
          <div className="w-full bg-[#333] h-4 rounded overflow-hidden">
             <div className="bg-[#4facfe] h-full" style={{ width: `${Math.max(0, (playerBaseHp / playerBaseMaxHp) * 100)}%` }}></div>
          </div>
          <div className="text-sm mt-1">HP: {playerBaseHp} / {playerBaseMaxHp}</div>
          <div className="text-sm text-yellow-400">Gold: {playerGold} (+{playerIncome}/10s)</div>
        </div>

        {/* 敵情報 */}
        <div className="flex flex-col w-[40%] text-right">
          <div className="text-[#e94560] font-bold text-xl mb-1">Enemy Base</div>
          <div className="w-full bg-[#333] h-4 rounded overflow-hidden flex justify-end">
             <div className="bg-[#e94560] h-full" style={{ width: `${Math.max(0, (enemyBaseHp / enemyBaseMaxHp) * 100)}%` }}></div>
          </div>
          <div className="text-sm mt-1">HP: {enemyBaseHp} / {enemyBaseMaxHp}</div>
          <div className="text-sm text-yellow-400">Gold: {enemyGold} (+{enemyIncome}/10s)</div>
        </div>
      </div>

      {/* キャンバス */}
      <div className="relative">
        <canvas ref={canvasRef} className="bg-[#0f0f1a] border border-[#333] rounded-lg shadow-lg block"></canvas>
        {gameOver && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg">
            <h2 className={`text-5xl font-bold mb-6 ${winnerText === 'VICTORY!!' ? 'text-yellow-400' : 'text-gray-400'}`}>
              {winnerText}
            </h2>
            <button
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold"
              onClick={() => window.location.reload()}
            >
              Restart
            </button>
          </div>
        )}
      </div>

      {/* コントロールパネル */}
      <div className="w-full max-w-[800px] mt-4 flex justify-between bg-black/30 p-4 rounded-lg">
        {/* レーン選択（一旦1をデフォルトにするなど実装方針によるが、元のHTMLを再現） */}
        <div className="flex gap-2 w-full justify-center">
            <div className="flex flex-col items-center border border-gray-600 p-2 rounded w-full">
                <div className="text-sm font-bold text-gray-300 mb-2">Lane 1 (Top)</div>
                <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={() => window.dispatchEvent(new CustomEvent('SPAWN', { detail: { type: 'FIGHTER', lane: 0 } }))} className="bg-[#333] hover:bg-[#4facfe] text-xs px-2 py-1 rounded">Fighter (15)</button>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('SPAWN', { detail: { type: 'ARCHER', lane: 0 } }))} className="bg-[#333] hover:bg-[#4facfe] text-xs px-2 py-1 rounded">Archer (25)</button>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('SPAWN', { detail: { type: 'TANK', lane: 0 } }))} className="bg-[#333] hover:bg-[#4facfe] text-xs px-2 py-1 rounded">Tank (40)</button>
                </div>
            </div>
            <div className="flex flex-col items-center border border-gray-600 p-2 rounded w-full">
                <div className="text-sm font-bold text-gray-300 mb-2">Lane 2 (Mid)</div>
                <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={() => window.dispatchEvent(new CustomEvent('SPAWN', { detail: { type: 'FIGHTER', lane: 1 } }))} className="bg-[#333] hover:bg-[#4facfe] text-xs px-2 py-1 rounded">Fighter (15)</button>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('SPAWN', { detail: { type: 'ARCHER', lane: 1 } }))} className="bg-[#333] hover:bg-[#4facfe] text-xs px-2 py-1 rounded">Archer (25)</button>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('SPAWN', { detail: { type: 'MAGE', lane: 1 } }))} className="bg-[#333] hover:bg-[#b224ef] text-xs px-2 py-1 rounded">Mage (60)</button>
                </div>
            </div>
            <div className="flex flex-col items-center border border-gray-600 p-2 rounded w-full">
                <div className="text-sm font-bold text-gray-300 mb-2">Lane 3 (Bot)</div>
                <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={() => window.dispatchEvent(new CustomEvent('SPAWN', { detail: { type: 'TANK', lane: 2 } }))} className="bg-[#333] hover:bg-[#4facfe] text-xs px-2 py-1 rounded">Tank (40)</button>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('SPAWN', { detail: { type: 'KING', lane: 2 } }))} className="bg-[#333] hover:bg-[#f83600] text-xs px-2 py-1 rounded">King (100)</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
