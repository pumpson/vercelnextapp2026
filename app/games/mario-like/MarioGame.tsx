"use client";

import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';

export default function MarioGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [uiState, setUiState] = useState<{
    visible: boolean;
    title: string;
    msg: string;
    color: string;
    isRetry: boolean;
  }>({ visible: false, title: '', msg: '', color: 'white', isRetry: true });

  const [worldDisplay, setWorldDisplay] = useState("1-1");
  const [scoreDisplay, setScoreDisplay] = useState("000000");

  const [isLeftDown, setIsLeftDown] = useState(false);
  const [isRightDown, setIsRightDown] = useState(false);
  const [isJumpDown, setIsJumpDown] = useState(false);

  // ゲームステート管理用の変数群（Reactの外側に置くことで再レンダリングに依存させない）
  const gameStateRef = useRef({
    currentWorld: 1,
    currentStage: 1,
    totalScore: 0,
    retryCounts: {} as Record<string, number>,
    isGameActive: false,
    sceneRestartFn: null as (() => void) | null,
  });

  useEffect(() => {
    if (!gameContainerRef.current) return;

    // 定数
    const WORLD_WIDTH = 4000;
    const WORLD_HEIGHT = 800;

    let player: Phaser.Physics.Arcade.Sprite;
    let platforms: Phaser.Physics.Arcade.StaticGroup;
    let enemiesGroup: Phaser.Physics.Arcade.Group;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    class MainScene extends Phaser.Scene {
      constructor() {
        super('MainScene');
      }

      preload() {
        const createTex = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
          const g = this.add.graphics();
          draw(g);
          g.generateTexture(key, w, h);
          g.destroy();
        };

        createTex('player', 32, 48, g => {
          g.fillStyle(0x3498db).fillRect(0, 16, 32, 32);
          g.fillStyle(0xffdbac).fillRect(4, 0, 24, 24);
          g.fillStyle(0xe74c3c).fillRect(4, -4, 24, 10);
        });

        createTex('ground_1', 40, 40, g => { g.fillStyle(0x8b4513).fillRect(0, 0, 40, 40); g.fillStyle(0x228b22).fillRect(0, 0, 40, 10); });
        createTex('ground_2', 40, 40, g => { g.fillStyle(0x4a4a4a).fillRect(0, 0, 40, 40); g.fillStyle(0xaaaaaa).fillRect(0, 0, 40, 10); });
        createTex('ground_3', 40, 40, g => { g.fillStyle(0x2c0000).fillRect(0, 0, 40, 40); g.fillStyle(0xff4500).fillRect(0, 0, 40, 10); });

        createTex('walker', 32, 32, g => { g.fillStyle(0x8b0000).fillRect(0, 0, 32, 32); g.fillStyle(0xffffff).fillRect(6, 6, 6, 6).fillRect(20, 6, 6, 6); });
        createTex('flyer', 32, 24, g => { g.fillStyle(0xffd700).fillEllipse(16, 12, 32, 24); g.fillStyle(0xffffff).fillTriangle(0, 12, -10, 0, -10, 24); });
        createTex('chaser', 28, 28, g => { g.fillStyle(0x4b0082).fillCircle(14, 14, 14); g.fillStyle(0xff0000).fillCircle(14, 14, 4); });
        createTex('spike', 32, 32, g => { g.fillStyle(0x666666).fillTriangle(16, 0, 0, 32, 32, 32); });

        createTex('bg_1', 800, 600, g => { g.fillStyle(0x87CEEB).fillRect(0, 0, 800, 600); g.fillStyle(0xffffff, 0.4).fillCircle(200, 150, 40).fillCircle(240, 140, 50).fillCircle(280, 150, 40); });
        createTex('bg_2', 800, 600, g => { g.fillStyle(0x191970).fillRect(0, 0, 800, 600); g.fillStyle(0xffff00, 0.8).fillCircle(600, 100, 30); });
        createTex('bg_3', 800, 600, g => { g.fillStyle(0x3a0000).fillRect(0, 0, 800, 600); g.fillStyle(0xff0000, 0.2).fillRect(0, 400, 800, 200); });

        createTex('goal', 60, 200, g => { g.fillStyle(0xffd700).fillRect(25, 0, 10, 200); g.fillStyle(0xff0000).fillTriangle(35, 10, 35, 50, 60, 30); });
      }

      create() {
        gameStateRef.current.isGameActive = true;
        gameStateRef.current.sceneRestartFn = () => this.scene.restart();

        const w = gameStateRef.current.currentWorld;
        const bgKey = w === 1 ? 'bg_1' : (w === 2 ? 'bg_2' : 'bg_3');
        this.add.image(0, 0, bgKey).setOrigin(0, 0).setScrollFactor(0);

        platforms = this.physics.add.staticGroup();
        enemiesGroup = this.physics.add.group();

        this.generateLevel(w, gameStateRef.current.currentStage);

        player = this.physics.add.sprite(100, WORLD_HEIGHT - 300, 'player');
        player.setCollideWorldBounds(true);
        player.setBounce(0.0);

        const goal = this.physics.add.staticSprite(WORLD_WIDTH - 150, WORLD_HEIGHT - 170, 'goal');

        this.physics.add.collider(player, platforms);
        this.physics.add.collider(enemiesGroup, platforms);

        this.physics.add.overlap(player, goal, () => {
          this.nextLevel();
        });

        this.physics.add.collider(player, enemiesGroup, (p, e) => {
          if (!gameStateRef.current.isGameActive) return;
          const enemy = e as Phaser.Physics.Arcade.Sprite & { type: string };
          const pSprite = p as Phaser.Physics.Arcade.Sprite;

          if (enemy.type === 'spike') { this.gameOver(); return; }

          const isAbove = (pSprite.y + pSprite.height / 2) < enemy.y;
          const isFallingOrStill = pSprite.body!.velocity.y >= 0;

          if (isAbove && isFallingOrStill) {
            enemy.destroy();
            pSprite.setVelocityX(0);
            pSprite.setVelocityY(-450);
            gameStateRef.current.totalScore += (enemy.type === 'chaser' ? 300 : 100);
            this.updateUI();
          } else {
            this.gameOver();
          }
        });

        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.startFollow(player, true, 0.1, 0.1);
        if (this.input.keyboard) {
          cursors = this.input.keyboard.createCursorKeys();
        }

        this.updateUI();
      }

      generateLevel(world: number, stage: number) {
        let groundKey = world === 1 ? 'ground_1' : (world === 2 ? 'ground_2' : 'ground_3');

        let gapChance = 10 + (world * 5) + (stage * 3);
        let enemyRate = 10 + (world * 5) + (stage * 3);

        let x = 0;
        let currentHeight = WORLD_HEIGHT - 40;

        // 安全地帯
        for (let i = 0; i < 15; i++) {
          platforms.create(x, currentHeight, groundKey).refreshBody();
          x += 40;
        }

        while (x < WORLD_WIDTH - 600) {
          let nextX = x;
          let nextHeight = currentHeight;

          if (Math.random() * 100 < gapChance) {
            let gapWidth = Phaser.Math.Between(2, 4) * 40;
            nextX += gapWidth;
          }

          let deltaBlock = Phaser.Math.Between(-4, 4);
          let heightChange = deltaBlock * 40;
          if ((nextX - x) > 120 && heightChange < -40) {
            heightChange = -40;
          }
          nextHeight += heightChange;
          nextHeight = Phaser.Math.Clamp(nextHeight, 200, WORLD_HEIGHT - 40);

          currentHeight = nextHeight;
          x = nextX;

          let len = Phaser.Math.Between(3, 8);
          for (let i = 0; i < len; i++) {
            platforms.create(x, currentHeight, groundKey).refreshBody();

            if (i > 0 && i < len - 1 && Math.random() * 100 < enemyRate) {
              let type = 'walker';
              if (world === 2 && Math.random() < 0.5) type = 'flyer';
              if (world === 3 && Math.random() < 0.4) type = 'chaser';
              if (Math.random() < 0.1) type = 'spike';

              let ey = currentHeight - 40;
              if (type === 'flyer') ey -= 100;

              const e = enemiesGroup.create(x, ey, type) as Phaser.Physics.Arcade.Sprite & { type: string, startY?: number, timeOffset?: number };
              e.type = type;
              if (type === 'flyer' || type === 'spike') {
                (e.body as Phaser.Physics.Arcade.Body).allowGravity = false;
                (e.body as Phaser.Physics.Arcade.Body).immovable = true;
                if(type === 'flyer') { e.startY = ey; e.timeOffset = Math.random() * 2000; }
              } else {
                e.setVelocityX(-100);
                e.setBounceX(1);
              }
            }
            x += 40;
          }
        }

        for (let i = 0; i < 20; i++) {
          platforms.create(x, WORLD_HEIGHT - 40, groundKey).refreshBody();
          x += 40;
        }
      }

      update(time: number, delta: number) {
        if (!gameStateRef.current.isGameActive) return;
        if (player.y > WORLD_HEIGHT + 100) { this.gameOver(true); return; }

        // ReactステートのisLeftDownなどを参照するには、本来なら参照経由でやるべきだが
        // PhaserのUpdateループ内で外側のスコープの最新状態を取るのが難しいため
        // windowにマウントしたフラグを読ませるか、ref経由で取得する
        // 今回はシンプルに cursors だけで実装しつつ、タッチ操作は後述のref経由で対応

        const left = (cursors && cursors.left.isDown) || (window as any).__mario_isLeftDown;
        const right = (cursors && cursors.right.isDown) || (window as any).__mario_isRightDown;
        const jump = (cursors && cursors.up.isDown) || (window as any).__mario_isJumpDown;

        if (left) player.setVelocityX(-260);
        else if (right) player.setVelocityX(260);
        else player.setVelocityX(0);

        if (jump && player.body!.touching.down) player.setVelocityY(-650);

        enemiesGroup.children.iterate((c) => {
          const e = c as Phaser.Physics.Arcade.Sprite & { type: string, startY: number, timeOffset: number };
          if (!e || !e.active) return true;
          if (e.type === 'flyer') e.y = e.startY + Math.sin((time + e.timeOffset) * 0.003) * 80;
          else if (e.type === 'chaser') {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
            if (dist < 500 && dist > 10) {
              e.setVelocityX(player.x < e.x ? -180 : 180);
              if ((e.body!.blocked.left || e.body!.blocked.right) && e.body!.touching.down) e.setVelocityY(-450);
            } else e.setVelocityX(0);
          }
          return true;
        });
      }

      nextLevel() {
        if (!gameStateRef.current.isGameActive) return;
        gameStateRef.current.isGameActive = false;

        this.physics.pause();
        gameStateRef.current.totalScore += 1000 + (gameStateRef.current.currentWorld * 500);
        this.updateUI();

        gameStateRef.current.currentStage++;
        if (gameStateRef.current.currentStage > 4) {
          gameStateRef.current.currentStage = 1;
          gameStateRef.current.currentWorld++;
        }

        if (gameStateRef.current.currentWorld > 3) {
          this.showUI('ALL CLEARED!', this.generateDeathReport(), 'gold', false);
        } else {
          this.showUI(`STAGE ${gameStateRef.current.currentWorld}-${gameStateRef.current.currentStage}`, 'Next Stage', 'white', true);
        }
      }

      gameOver(isFalling = false) {
        if (!gameStateRef.current.isGameActive) return;
        gameStateRef.current.isGameActive = false;

        const key = `${gameStateRef.current.currentWorld}-${gameStateRef.current.currentStage}`;
        gameStateRef.current.retryCounts[key] = (gameStateRef.current.retryCounts[key] || 0) + 1;

        player.setTint(0xff0000);
        player.setVelocityX(0);

        if (!isFalling) {
          player.body!.checkCollision.none = true;
          player.setCollideWorldBounds(false);
          player.setVelocityY(-500);
        }

        enemiesGroup.children.iterate((c) => {
          const e = c as Phaser.Physics.Arcade.Sprite;
          if(e) e.body!.velocity.x = 0;
          return true;
        });
        this.cameras.main.stopFollow();

        setTimeout(() => {
          if(this.physics) this.physics.pause();
          this.showUI('GAME OVER', 'Don\'t give up!', 'red', true);
        }, 1000);
      }

      generateDeathReport() {
        let report = "【 苦戦レポート (Retry Count) 】\n\n";
        let totalDeaths = 0;

        for (let w = 1; w <= 3; w++) {
          let line = `World ${w}: `;
          for (let s = 1; s <= 4; s++) {
            const key = `${w}-${s}`;
            const count = gameStateRef.current.retryCounts[key] || 0;
            totalDeaths += count;
            let mark = count === 0 ? "★" : (count > 5 ? `⚠️${count}` : `${count}`);
            line += `[${s}: ${mark}]  `;
          }
          report += line + "\n";
        }
        report += `\nTotal Retries: ${totalDeaths}`;
        return report;
      }

      updateUI() {
        setWorldDisplay(`${gameStateRef.current.currentWorld}-${gameStateRef.current.currentStage}`);
        setScoreDisplay(gameStateRef.current.totalScore.toString().padStart(6, '0'));
      }

      showUI(title: string, msg: string, color: string, isRetry: boolean) {
        setUiState({ visible: true, title, msg, color, isRetry });
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameContainerRef.current,
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1200, x: 0 }, debug: false }
      },
      scene: MainScene
    };

    gameRef.current = new Phaser.Game(config);

    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Update touch state via window object for Phaser to read easily
  useEffect(() => {
    (window as any).__mario_isLeftDown = isLeftDown;
    (window as any).__mario_isRightDown = isRightDown;
    (window as any).__mario_isJumpDown = isJumpDown;
  }, [isLeftDown, isRightDown, isJumpDown]);

  const handleAction = () => {
    setUiState(prev => ({ ...prev, visible: false }));

    if (uiState.isRetry) {
      if (gameStateRef.current.sceneRestartFn) {
        gameStateRef.current.sceneRestartFn();
      }
    } else {
      // PLAY AGAIN (Reset state)
      gameStateRef.current.currentWorld = 1;
      gameStateRef.current.currentStage = 1;
      gameStateRef.current.totalScore = 0;
      gameStateRef.current.retryCounts = {};
      if (gameStateRef.current.sceneRestartFn) {
        gameStateRef.current.sceneRestartFn();
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={gameContainerRef} className="w-full h-full"></div>

      {/* Score HUD */}
      <div className="absolute top-4 right-4 text-white font-mono text-xl flex gap-8 z-10 drop-shadow-md">
        <div>SCORE<br/>{scoreDisplay}</div>
        <div>WORLD<br/>{worldDisplay}</div>
      </div>

      {/* On-screen Controls */}
      <div className="absolute bottom-8 left-8 flex gap-4 z-10">
        <button
          className={`w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 text-white text-2xl flex items-center justify-center select-none active:bg-white/50 touch-none ${isLeftDown ? 'bg-white/50' : ''}`}
          onPointerDown={() => setIsLeftDown(true)}
          onPointerUp={() => setIsLeftDown(false)}
          onPointerOut={() => setIsLeftDown(false)}
        >
          ◀
        </button>
        <button
          className={`w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 text-white text-2xl flex items-center justify-center select-none active:bg-white/50 touch-none ${isRightDown ? 'bg-white/50' : ''}`}
          onPointerDown={() => setIsRightDown(true)}
          onPointerUp={() => setIsRightDown(false)}
          onPointerOut={() => setIsRightDown(false)}
        >
          ▶
        </button>
      </div>
      <div className="absolute bottom-8 right-8 z-10">
        <button
          className={`w-20 h-20 rounded-full bg-red-500/50 border-2 border-red-300 text-white font-bold text-xl flex items-center justify-center select-none active:bg-red-500/80 touch-none ${isJumpDown ? 'bg-red-500/80' : ''}`}
          onPointerDown={() => setIsJumpDown(true)}
          onPointerUp={() => setIsJumpDown(false)}
          onPointerOut={() => setIsJumpDown(false)}
        >
          JUMP
        </button>
      </div>

      {/* UI Overlay (Game Over / Stage Clear) */}
      {uiState.visible && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 font-sans">
          <h1 className={`text-4xl font-bold mb-4 ${
            uiState.color === 'red' ? 'text-red-500' :
            uiState.color === 'gold' ? 'text-yellow-400' : 'text-white'
          }`}>
            {uiState.title}
          </h1>
          <pre className="text-white mb-8 text-center bg-black/50 p-4 rounded text-sm md:text-base leading-relaxed overflow-x-auto max-w-full">
            {uiState.msg}
          </pre>
          <button
            onClick={handleAction}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-[0_4px_0_#1e3a8a] active:translate-y-1 active:shadow-none transition-all text-xl"
          >
            {uiState.isRetry ? (uiState.title.includes('STAGE') ? 'START' : 'RETRY') : 'PLAY AGAIN'}
          </button>
        </div>
      )}
    </div>
  );
}
