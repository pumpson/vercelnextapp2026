"use client";

import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';

export default function MinecraftGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [selectedItem, setSelectedItem] = useState<string>('bridge');
  const [showStayBtn, setShowStayBtn] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signText, setSignText] = useState("");
  const [saveNotice, setSaveNotice] = useState(false);

  const [stats, setStats] = useState({ px: 0, py: 0, totalSteps: 0, sessionSteps: 0 });

  const gameStateRef = useRef({
    pendingSignPos: null as {tx: number, ty: number} | null,
    applySignFn: null as ((tx: number, ty: number, text: string) => void) | null,
    stayInTentFn: null as ((key: string) => void) | null,
    currentTentKey: null as string | null,
  });

  useEffect(() => {
    if (!gameContainerRef.current) return;

    const TILE_SIZE = 32;
    const CHUNK_SIZE = 16;
    const VIEW_DISTANCE = 1;
    const STORAGE_KEY = 'infinite_adventure_save_fixed';

    class MainScene extends Phaser.Scene {
      player!: Phaser.GameObjects.Sprite;
      moveTarget: { x: number, y: number } | null = null;
      chunks: Map<string, Phaser.GameObjects.Group> = new Map();
      modifiedTiles: Map<string, { type: string, text?: string | null, timestamp?: string }> = new Map();
      savedPos: { x: number, y: number } | null = null;
      lastCX: number = -999;
      lastCY: number = -999;
      totalSteps: number = 0;
      stepsSinceLastSave: number = 0;
      distanceBuffer: number = 0;

      constructor() { super('MainScene'); }

      preload() {
        const createTex = (key: string, color: number) => {
          const g = this.add.graphics();
          g.fillStyle(color).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          if (key === 'bridge') g.lineStyle(2, 0x8b4513).strokeRect(1, 1, TILE_SIZE-2, TILE_SIZE-2);
          if (key === 'tent') { g.fillStyle(0xffa500).fillTriangle(TILE_SIZE/2, 2, 2, TILE_SIZE-2, TILE_SIZE-2, TILE_SIZE-2); }
          if (key === 'sign') { g.fillStyle(0xdeb887).fillRect(8, 8, 16, 16).fillStyle(0x8b4513).fillRect(14, 24, 4, 8); }
          g.generateTexture(key, TILE_SIZE, TILE_SIZE);
          g.destroy();
        };

        createTex('deepwater', 0x1e3a8a);
        createTex('water', 0x3b82f6);
        createTex('sand', 0xfcd34d);
        createTex('grass', 0x4ade80);
        createTex('forest', 0x166534);
        createTex('bridge', 0xd2b48c);
        createTex('tent', 0x000000);
        createTex('sign', 0x000000);
        createTex('player', 0xff0000);
      }

      create() {
        this.loadGame();

        setStats(prev => ({
          ...prev,
          totalSteps: this.totalSteps,
          sessionSteps: this.stepsSinceLastSave
        }));

        this.player = this.add.sprite(
          this.savedPos ? this.savedPos.x : 0,
          this.savedPos ? this.savedPos.y : 0,
          'player'
        ).setDepth(100);

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.updateChunks();

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          const wX = pointer.worldX;
          const wY = pointer.worldY;
          if (Math.abs(wX - this.player.x) < 20 && Math.abs(wY - this.player.y) < 20) return;

          if ((window as any).__minecraft_selectedItem === 'walk') {
            this.moveTarget = { x: wX, y: wY };
          } else {
            this.handleTap(wX, wY);
          }
        });

        gameStateRef.current.applySignFn = (tx, ty, text) => {
          this.applySign(tx, ty, text);
        };

        gameStateRef.current.stayInTentFn = (key) => {
          this.stayInTent(key);
        };
      }

      getFormattedTimestamp() {
        const now = new Date();
        const m = now.getMonth() + 1;
        const d = now.getDate();
        const h = now.getHours();
        const min = now.getMinutes().toString().padStart(2, '0');
        return `${m}/${d} ${h}:${min}`;
      }

      handleTap(wX: number, wY: number) {
        const tX = Math.floor(wX / TILE_SIZE);
        const tY = Math.floor(wY / TILE_SIZE);
        const currentItem = (window as any).__minecraft_selectedItem;

        if (currentItem === 'sign') {
          gameStateRef.current.pendingSignPos = { tx: tX, ty: tY };
          setShowSignModal(true);
        } else {
          this.placeObject(tX, tY, currentItem);
        }
      }

      applySign(tx: number, ty: number, text: string) {
        this.placeObject(tx, ty, 'sign', text);
      }

      placeObject(tx: number, ty: number, type: string, text: string | null = null) {
        const key = `${tx},${ty}`;
        const ts = this.getFormattedTimestamp();
        this.modifiedTiles.set(key, { type, text, timestamp: ts });
        this.refreshChunk(Math.floor(tx/CHUNK_SIZE), Math.floor(ty/CHUNK_SIZE));
      }

      isPassable(worldX: number, worldY: number) {
        const tx = Math.floor(worldX / TILE_SIZE);
        const ty = Math.floor(worldY / TILE_SIZE);
        const key = `${tx},${ty}`;
        if (this.modifiedTiles.has(key)) {
            if (this.modifiedTiles.get(key)!.type === 'bridge') return true;
        }
        const h = this.getTerrainHeight(tx, ty);
        return h >= 0.48;
      }

      update(time: number, delta: number) {
        if (this.moveTarget) {
          const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y);
          const speed = 0.25 * delta;

          const nextX = this.player.x + Math.cos(angle) * speed;
          const nextY = this.player.y + Math.sin(angle) * speed;

          let actualDist = 0;
          if (this.isPassable(nextX, this.player.y)) {
              actualDist += Math.abs(nextX - this.player.x);
              this.player.x = nextX;
          }
          if (this.isPassable(this.player.x, nextY)) {
              actualDist += Math.abs(nextY - this.player.y);
              this.player.y = nextY;
          }

          this.distanceBuffer += actualDist;
          if (this.distanceBuffer >= TILE_SIZE) {
              const steps = Math.floor(this.distanceBuffer / TILE_SIZE);
              this.totalSteps += steps;
              this.stepsSinceLastSave += steps;
              this.distanceBuffer %= TILE_SIZE;
          }

          this.player.flipX = Math.cos(angle) < 0;
        }

        const px = Math.floor(this.player.x / TILE_SIZE);
        const py = Math.floor(this.player.y / TILE_SIZE);
        const current = this.modifiedTiles.get(`${px},${py}`);

        if (current && current.type === 'tent') {
            setShowStayBtn(true);
            gameStateRef.current.currentTentKey = `${px},${py}`;
        } else {
            setShowStayBtn(false);
            gameStateRef.current.currentTentKey = null;
        }

        const cx = Math.floor(this.player.x / (CHUNK_SIZE * TILE_SIZE));
        const cy = Math.floor(this.player.y / (CHUNK_SIZE * TILE_SIZE));
        if (cx !== this.lastCX || cy !== this.lastCY) {
            this.updateChunks(cx, cy);
            this.lastCX = cx; this.lastCY = cy;
        }

        setStats(prev => ({
          ...prev,
          px,
          py,
          totalSteps: this.totalSteps,
          sessionSteps: this.stepsSinceLastSave
        }));
      }

      smoothNoise(x: number, y: number) {
        const getVal = (vX: number, vY: number) => {
            const s = Math.sin(vX * 12.9898 + vY * 78.233) * 43758.5453;
            return s - Math.floor(s);
        };
        const iX = Math.floor(x), iY = Math.floor(y);
        const fX = x - iX, fY = y - iY;
        const a = getVal(iX, iY), b = getVal(iX + 1, iY), c = getVal(iX, iY + 1), d = getVal(iX + 1, iY + 1);
        const u = fX * fX * (3.0 - 2.0 * fX), v = fY * fY * (3.0 - 2.0 * fY);
        return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
      }

      getTerrainHeight(x: number, y: number) {
        let e = 1.0 * this.smoothNoise(x * 0.05, y * 0.05);
        e += 0.5 * this.smoothNoise(x * 0.1, y * 0.1);
        e += 0.25 * this.smoothNoise(x * 0.4, y * 0.4);
        return e / 1.75;
      }

      createChunk(cx: number, cy: number) {
        const group = this.add.group();
        const startX = cx * CHUNK_SIZE * TILE_SIZE;
        const startY = cy * CHUNK_SIZE * TILE_SIZE;

        for (let ty = 0; ty < CHUNK_SIZE; ty++) {
            for (let tx = 0; tx < CHUNK_SIZE; tx++) {
                const tX = cx * CHUNK_SIZE + tx, tY = cy * CHUNK_SIZE + ty;
                const key = `${tX},${tY}`;
                let texture;
                let info = null;
                let isTent = false;

                if (this.modifiedTiles.has(key)) {
                    const mod = this.modifiedTiles.get(key)!;
                    texture = mod.type;
                    if (mod.type === 'sign') info = mod.text;
                    if (mod.type === 'tent') {
                        info = mod.timestamp;
                        isTent = true;
                    }
                } else {
                    const h = this.getTerrainHeight(tX, tY);
                    if (h < 0.25) texture = 'deepwater';
                    else if (h < 0.48) texture = 'water';
                    else if (h < 0.52) texture = 'sand';
                    else if (h < 0.78) texture = 'grass';
                    else texture = 'forest';
                }

                const x = startX + tx * TILE_SIZE;
                const y = startY + ty * TILE_SIZE;
                const tile = this.add.image(x, y, texture).setOrigin(0);
                group.add(tile);

                if (info) {
                    const style = {
                        fontSize: '10px',
                        backgroundColor: isTent ? 'rgba(255,200,0,0.9)' : 'rgba(255,255,255,0.8)',
                        color: '#000',
                        padding: {x:4, y:2}
                    };
                    const prefix = isTent ? "⛺ Stay: " : "";
                    const txt = this.add.text(x + TILE_SIZE/2, y - 2, prefix + info, style).setOrigin(0.5, 1).setDepth(50);
                    group.add(txt);
                }
            }
        }
        return group;
      }

      stayInTent(key: string) {
        const tent = this.modifiedTiles.get(key);
        if(!tent) return;

        const ts = this.getFormattedTimestamp();
        tent.timestamp = ts;

        this.saveGame();

        setStats(prev => ({
          ...prev,
          sessionSteps: this.stepsSinceLastSave
        }));

        this.stepsSinceLastSave = 0;

        const [tx, ty] = key.split(',').map(Number);
        this.refreshChunk(Math.floor(tx/CHUNK_SIZE), Math.floor(ty/CHUNK_SIZE));

        setSaveNotice(true);
        setTimeout(() => setSaveNotice(false), 4000);
      }

      saveGame() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            tiles: Array.from(this.modifiedTiles.entries()),
            pos: { x: this.player.x, y: this.player.y },
            totalSteps: this.totalSteps,
            stepsSinceLastSave: this.stepsSinceLastSave
        }));
      }

      loadGame() {
        const s = localStorage.getItem(STORAGE_KEY);
        if (s) {
            const d = JSON.parse(s);
            this.modifiedTiles = new Map(d.tiles);
            this.savedPos = d.pos;
            this.totalSteps = d.totalSteps || 0;
            this.stepsSinceLastSave = d.stepsSinceLastSave || 0;
        }
      }

      updateChunks(cX = Math.floor(this.player.x/(CHUNK_SIZE*TILE_SIZE)), cY = Math.floor(this.player.y/(CHUNK_SIZE*TILE_SIZE))) {
        const needed = new Set();
        for (let x = cX - VIEW_DISTANCE; x <= cX + VIEW_DISTANCE; x++) {
            for (let y = cY - VIEW_DISTANCE; y <= cY + VIEW_DISTANCE; y++) {
                const k = `${x},${y}`; needed.add(k);
                if (!this.chunks.has(k)) this.chunks.set(k, this.createChunk(x, y));
            }
        }
        this.chunks.forEach((g, k) => { if (!needed.has(k)) { g.destroy(true); this.chunks.delete(k); } });
      }

      refreshChunk(cx: number, cy: number) {
        const k = `${cx},${cy}`;
        if (this.chunks.has(k)) {
          this.chunks.get(k)!.destroy(true);
          this.chunks.set(k, this.createChunk(cx, cy));
        }
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameContainerRef.current,
      scene: MainScene,
      render: { pixelArt: true }
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

  useEffect(() => {
    (window as any).__minecraft_selectedItem = selectedItem;
  }, [selectedItem]);

  const handleSignSubmit = () => {
    const pos = gameStateRef.current.pendingSignPos;
    if (pos && signText.trim() !== "" && gameStateRef.current.applySignFn) {
      gameStateRef.current.applySignFn(pos.tx, pos.ty, signText);
    }
    setShowSignModal(false);
    setSignText("");
    gameStateRef.current.pendingSignPos = null;
  };

  const handleStay = () => {
    if (gameStateRef.current.currentTentKey && gameStateRef.current.stayInTentFn) {
      gameStateRef.current.stayInTentFn(gameStateRef.current.currentTentKey);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={gameContainerRef} className="w-full h-full"></div>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 text-white bg-black/60 p-3 rounded-lg pointer-events-none text-xs sm:text-sm z-10 mt-12">
        <div>座標: {stats.px}, {stats.py}</div>
        <div>累計歩数: {stats.totalSteps} 歩</div>
        <div className="mt-2 text-gray-300">
          <small>※テントで休むとセーブされます</small><br />
          <small>前回セーブからの歩数: {stats.sessionSteps}</small>
        </div>
      </div>

      {saveNotice && (
        <div className="absolute top-20 right-4 bg-green-500 text-white p-3 rounded-lg shadow-lg font-bold z-50 animate-bounce">
          セーブしました！
        </div>
      )}

      {/* Action Button */}
      {showStayBtn && (
        <button
          onClick={handleStay}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full border-2 border-white font-bold z-30 shadow-lg"
        >
          ここで休む（セーブ）
        </button>
      )}

      {/* Toolbar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 bg-black/70 p-2 rounded-full border-2 border-gray-600 z-20">
        <button
          className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all ${selectedItem === 'walk' ? 'bg-white scale-110 shadow-[0_0_10px_#fff]' : 'bg-gray-700 text-white'}`}
          onClick={() => setSelectedItem('walk')}
          title="歩く"
        >
          🚶
        </button>
        <button
          className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all ${selectedItem === 'bridge' ? 'bg-white scale-110 shadow-[0_0_10px_#fff]' : 'bg-gray-700 text-white'}`}
          onClick={() => setSelectedItem('bridge')}
          title="橋をかける"
        >
          🪵
        </button>
        <button
          className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all ${selectedItem === 'tent' ? 'bg-white scale-110 shadow-[0_0_10px_#fff]' : 'bg-gray-700 text-white'}`}
          onClick={() => setSelectedItem('tent')}
          title="テントを張る"
        >
          ⛺
        </button>
        <button
          className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all ${selectedItem === 'sign' ? 'bg-white scale-110 shadow-[0_0_10px_#fff]' : 'bg-gray-700 text-white'}`}
          onClick={() => setSelectedItem('sign')}
          title="看板を立てる"
        >
          📝
        </button>
      </div>

      {/* Sign Modal */}
      {showSignModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[80%] max-w-[280px] shadow-2xl">
            <h3 className="text-black font-bold mb-2">看板のメッセージを入力</h3>
            <input
              type="text"
              value={signText}
              onChange={(e) => setSignText(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4 text-black"
              placeholder="ここにテキスト..."
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSignSubmit}
                className="flex-1 bg-blue-500 text-white py-2 rounded font-bold"
              >
                決定
              </button>
              <button
                onClick={() => { setShowSignModal(false); setSignText(""); gameStateRef.current.pendingSignPos = null; }}
                className="flex-1 bg-gray-300 text-black py-2 rounded font-bold"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
