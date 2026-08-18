/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function SupplySquad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI State
  const [score, setScore] = useState(0);
  const [supplyCount, setSupplyCount] = useState(10);
  const [isGameOver, setIsGameOver] = useState(false);
  const [win, setWin] = useState(false);

  // gameStateRef: 描画ループとReactの間で状態をやりとりするためのRef
  const gameStateRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CW = 800;
    const CH = 450;

    // --- GAME CONSTANTS ---
    const SOLDIER_RADIUS = 12;
    const RELOAD_TIME = 2.0;
    const ENEMY_SPAWN_RATE = 1.5;

    // --- STATE ---
    const state = {
        soldiers: [] as any[],
        enemies: [] as any[],
        projectiles: [] as any[],
        particles: [] as any[],
        score: 0,
        supplies: 10,
        gameOver: false,
        win: false,
        lastTime: performance.now(),
        enemyTimer: 0,
        gameTimer: 60, // 60秒生き残れば勝ち
        supplyTimer: 0 // 弾薬自動回復タイマー
    };
    gameStateRef.current = state;

    class Soldier {
        x: number;
        y: number;
        ammo: number;
        maxAmmo: number;
        reloading: number;
        color: string;
        shootTimer: number;

        constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
            this.maxAmmo = 5;
            this.ammo = this.maxAmmo;
            this.reloading = 0;
            this.color = '#3b82f6'; // blue-500
            this.shootTimer = 0;
        }

        update(dt: number) {
            if (this.shootTimer > 0) this.shootTimer -= dt;

            if (this.ammo <= 0) {
                // 弾切れ
                this.color = '#ef4444'; // red-500
            } else {
                this.color = '#3b82f6';
                // 一番近い敵を探して射撃
                let target = null;
                let minDist = Infinity;
                for (const e of state.enemies) {
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < minDist && d < 400) {
                        minDist = d;
                        target = e;
                    }
                }

                if (target && this.shootTimer <= 0) {
                    // 発砲
                    this.ammo--;
                    this.shootTimer = 0.5; // 射撃間隔
                    state.projectiles.push(new Projectile(this.x, this.y, target.x, target.y, true));
                    spawnMuzzleFlash(this.x, this.y, target.x, target.y);
                }
            }
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.save();
            ctx.translate(this.x, this.y);

            // 本体
            ctx.beginPath();
            ctx.arc(0, 0, SOLDIER_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();

            // 弾薬ゲージ
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-15, -25, 30, 5);
            ctx.fillStyle = this.ammo > 0 ? '#10b981' : '#ef4444';
            ctx.fillRect(-15, -25, 30 * (this.ammo / this.maxAmmo), 5);

            // 弾切れ警告
            if (this.ammo <= 0) {
                ctx.fillStyle = '#ef4444';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('NO AMMO!', 0, -35);
            }

            ctx.restore();
        }
    }

    class Enemy {
        x: number;
        y: number;
        hp: number;
        speed: number;
        vx: number;
        vy: number;
        shootTimer: number;
        color: string;

        constructor() {
            // 右端からスポーン
            this.x = CW + 20;
            this.y = 50 + Math.random() * (CH - 100);
            this.hp = 2;
            this.speed = 30 + Math.random() * 20;
            this.vx = -1;
            this.vy = 0;
            this.shootTimer = 1 + Math.random();
            this.color = '#eab308'; // yellow-500
        }

        update(dt: number) {
            this.x += this.vx * this.speed * dt;

            // 上下に少しフラフラさせる
            this.y += Math.sin(Date.now() / 500 + this.x) * 30 * dt;

            // 最前線に来たら止まって撃つ
            if (this.x < CW - 150) {
                this.speed = 10;
            }

            this.shootTimer -= dt;
            if (this.shootTimer <= 0) {
                this.shootTimer = 2.0 + Math.random();
                const target = state.soldiers[Math.floor(Math.random() * state.soldiers.length)];
                if (target) {
                    state.projectiles.push(new Projectile(this.x, this.y, target.x, target.y, false));
                    spawnMuzzleFlash(this.x, this.y, target.x, target.y);
                }
            }
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.save();
            ctx.translate(this.x, this.y);

            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-10, -10);
            ctx.lineTo(-5, 0);
            ctx.lineTo(-10, 10);
            ctx.closePath();

            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();

            ctx.restore();
        }
    }

    class Projectile {
        x: number;
        y: number;
        vx: number;
        vy: number;
        isFriendly: boolean;
        speed: number;
        active: boolean;

        constructor(startX: number, startY: number, targetX: number, targetY: number, isFriendly: boolean) {
            this.x = startX;
            this.y = startY;
            this.isFriendly = isFriendly;
            this.speed = 500;
            this.active = true;

            let angle = Math.atan2(targetY - startY, targetX - startX);
            // 少しブレを付加
            angle += (Math.random() - 0.5) * 0.1;
            this.vx = Math.cos(angle);
            this.vy = Math.sin(angle);
        }

        update(dt: number) {
            this.x += this.vx * this.speed * dt;
            this.y += this.vy * this.speed * dt;

            // 画面外で消滅
            if (this.x < 0 || this.x > CW || this.y < 0 || this.y > CH) {
                this.active = false;
            }

            // 当たり判定
            if (this.isFriendly) {
                for (const e of state.enemies) {
                    if (Math.hypot(e.x - this.x, e.y - this.y) < 15) {
                        e.hp--;
                        this.active = false;
                        spawnHitParticle(this.x, this.y, '#eab308');
                        if (e.hp <= 0) {
                            state.score += 100;
                            setScore(state.score); // React stateへ反映
                        }
                        break;
                    }
                }
            } else {
                for (const s of state.soldiers) {
                    if (Math.hypot(s.x - this.x, s.y - this.y) < SOLDIER_RADIUS) {
                        this.active = false;
                        state.gameOver = true;
                        state.win = false;
                        break;
                    }
                }
            }
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = this.isFriendly ? '#60a5fa' : '#f87171'; // blue-400 : red-400
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
            this.maxLife = Math.random() * 0.5 + 0.1;
            this.life = this.maxLife;
            this.color = color;
        }

        update(dt: number) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.life -= dt;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    // --- UTILS ---
    function spawnMuzzleFlash(x: number, y: number, tx: number, ty: number) {
        const dx = tx - x;
        const dy = ty - y;
        const dist = Math.hypot(dx, dy);
        const nx = dx / dist;
        const ny = dy / dist;
        for (let i = 0; i < 3; i++) {
            const p = new Particle(x + nx * 10, y + ny * 10, '#fef08a'); // yellow-200
            p.vx = nx * 100 + (Math.random() - 0.5) * 50;
            p.vy = ny * 100 + (Math.random() - 0.5) * 50;
            p.maxLife = 0.1;
            p.life = 0.1;
            state.particles.push(p);
        }
    }

    function spawnHitParticle(x: number, y: number, color: string) {
        for (let i = 0; i < 8; i++) {
            state.particles.push(new Particle(x, y, color));
        }
    }

    // --- INITIALIZE ---
    // 陣地作成 (左側)
    for (let i = 0; i < 4; i++) {
        state.soldiers.push(new Soldier(100, 100 + i * 80));
    }

    // --- GAME LOOP ---
    let reqId: number;

    function gameLoop(now: number) {
        if (state.gameOver) {
            setIsGameOver(true);
            setWin(state.win);
            return;
        }

        let dt = (now - state.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        state.lastTime = now;

        state.gameTimer -= dt;
        if (state.gameTimer <= 0) {
            state.gameOver = true;
            state.win = true;
        }

        // 自動でサプライ増加 (3秒に1回)
        state.supplyTimer += dt;
        if (state.supplyTimer >= 3.0) {
            state.supplyTimer = 0;
            if (state.supplies < 20) {
                state.supplies++;
                setSupplyCount(state.supplies);
            }
        }

        // 敵スポーン
        state.enemyTimer -= dt;
        if (state.enemyTimer <= 0) {
            state.enemyTimer = ENEMY_SPAWN_RATE - (60 - state.gameTimer) * 0.02; // 徐々に早くなる
            state.enemies.push(new Enemy());
        }

        // Update
        state.soldiers.forEach(s => s.update(dt));
        state.enemies.forEach(e => e.update(dt));
        state.projectiles.forEach(p => p.update(dt));
        state.particles.forEach(p => p.update(dt));

        // Filter dead objects
        state.enemies = state.enemies.filter(e => e.hp > 0);
        state.projectiles = state.projectiles.filter(p => p.active);
        state.particles = state.particles.filter(p => p.life > 0);

        // Draw
        ctx!.clearRect(0, 0, CW, CH);

        // 陣地ライン描画
        ctx!.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx!.lineWidth = 5;
        ctx!.beginPath();
        ctx!.moveTo(150, 0);
        ctx!.lineTo(150, CH);
        ctx!.stroke();

        // オブジェクト描画
        state.soldiers.forEach(s => s.draw(ctx!));
        state.enemies.forEach(e => e.draw(ctx!));
        state.projectiles.forEach(p => p.draw(ctx!));
        state.particles.forEach(p => p.draw(ctx!));

        reqId = requestAnimationFrame(gameLoop);
    }

    reqId = requestAnimationFrame(gameLoop);

    // --- INTERACTION ---
    const handleCanvasClick = (e: MouseEvent) => {
        if (state.gameOver) return;

        const rect = canvas.getBoundingClientRect();
        // 表示サイズと論理サイズの比率を計算
        const scaleX = CW / rect.width;
        const scaleY = CH / rect.height;

        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        // 兵士との当たり判定
        for (const s of state.soldiers) {
            if (Math.hypot(s.x - mx, s.y - my) < SOLDIER_RADIUS + 20) { // タップしやすいように判定を大きめに
                if (s.ammo < s.maxAmmo && state.supplies > 0) {
                    s.ammo = s.maxAmmo;
                    state.supplies--;
                    setSupplyCount(state.supplies);

                    // 補給エフェクト
                    for(let i=0; i<5; i++) {
                        const p = new Particle(s.x, s.y, '#10b981');
                        p.vy = -50 - Math.random()*50;
                        state.particles.push(p);
                    }
                }
                break; // 1回のタップで1人だけ補給
            }
        }
    };

    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault(); // スクロール防止
        const touch = e.changedTouches[0];
        // MouseEventを偽装
        handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY } as unknown as MouseEvent);
    };

    canvas.addEventListener('mousedown', handleCanvasClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
        cancelAnimationFrame(reqId);
        canvas.removeEventListener('mousedown', handleCanvasClick);
        canvas.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-[#0f172a] text-[#e2e8f0] font-sans p-2 md:p-6 select-none overflow-hidden">
      <div className="mb-2 text-center z-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-sm">
            SUPPLY SQUAD
        </h1>
        <p className="text-sm md:text-base text-slate-400 font-bold">自軍兵士をタップ(クリック)して弾薬を補給しろ！</p>
      </div>

      <div className="relative w-full max-w-5xl aspect-[16/9] bg-slate-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        <canvas ref={canvasRef} className="bg-[#1e293b] w-full h-full object-contain"></canvas>

        {/* UI Overlay */}
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between pointer-events-none items-start">
            <div className="bg-slate-900/80 px-4 py-2 rounded border border-slate-700 backdrop-blur-sm">
                <div className="text-xs text-slate-400 font-bold mb-1">REMAINING SUPPLIES</div>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">📦</span>
                    <span className={`text-3xl font-black ${supplyCount === 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                        x{supplyCount}
                    </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">※3秒ごとに1回復</div>
            </div>

            <div className="bg-slate-900/80 px-4 py-2 rounded border border-slate-700 backdrop-blur-sm text-right">
                <div className="text-xs text-slate-400 font-bold mb-1">SCORE</div>
                <div className="text-3xl font-black text-blue-400">
                    {score.toString().padStart(6, '0')}
                </div>
            </div>
        </div>

        {/* GameOver / Win Overlay */}
        {isGameOver && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center backdrop-blur-sm z-50">
                <h2 className={`text-5xl md:text-7xl font-black mb-4 ${win ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}>
                    {win ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED'}
                </h2>
                <p className="text-xl text-slate-300 mb-8">
                    Final Score: <span className="font-bold text-white">{score}</span>
                </p>
                <button
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xl transition transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(37,99,235,0.5)] cursor-pointer pointer-events-auto"
                    onClick={() => window.location.reload()}
                >
                    RETRY MISSION
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
