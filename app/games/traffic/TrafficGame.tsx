"use client";

import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';

export default function TrafficGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [carCount, setCarCount] = useState(30);
  const [spawnRate, setSpawnRate] = useState(10);
  const [speed, setSpeed] = useState(12);
  const [statsHTML, setStatsHTML] = useState("Loading...");

  const gameStateRef = useRef({
    applySettingsFn: null as ((count: number, spawn: number, spd: number) => void) | null,
    resetCamFn: null as (() => void) | null,
    setStatsFn: setStatsHTML
  });

  useEffect(() => {
    if (!gameContainerRef.current) return;

    const ROAD_WIDTH = 400;
    const NUM_LANES = 4;
    const LANE_WIDTH = ROAD_WIDTH / NUM_LANES;
    const WORLD_HEIGHT = 15000;

    const DEPTH = {
        SCENERY_BG: 0, RIVER: 1, ROAD_BASE: 2, SIGNBOARDS: 3,
        CARS: 10, CAR_LIGHTS: 11, OVERPASS: 20, TUNNEL_OVERLAY: 30, TUNNEL_ROOF: 31, WEATHER: 100
    };

    class Car extends Phaser.GameObjects.Container {
        currentSpeed: number;
        targetSpeed: number;
        lane: number;
        color: number;
        lightsContainer: Phaser.GameObjects.Container;
        bodySprite: Phaser.GameObjects.Graphics;
        rearLightL: Phaser.GameObjects.PointLight;
        rearLightR: Phaser.GameObjects.PointLight;
        headLightL: Phaser.GameObjects.PointLight;
        headLightR: Phaser.GameObjects.PointLight;
        isSelected: boolean;
        inTunnel: boolean;

        constructor(scene: Phaser.Scene, x: number, y: number, lane: number, baseSpeed: number) {
            super(scene, x, y);
            this.lane = lane;
            this.targetSpeed = baseSpeed + (lane * 2) + Phaser.Math.FloatBetween(-1, 1);
            this.currentSpeed = this.targetSpeed;
            this.color = Phaser.Math.RND.pick([0xffffff, 0xdddddd, 0x111111, 0xcc0000, 0x0000cc, 0x00cc00, 0xaaaaaa]);
            this.isSelected = false;
            this.inTunnel = false;

            this.bodySprite = scene.add.graphics();
            this.bodySprite.fillStyle(this.color, 1).fillRoundedRect(-12, -22, 24, 44, 4);
            this.bodySprite.fillStyle(0x000000, 0.8).fillRect(-10, -10, 20, 10).fillRect(-10, 8, 20, 8); // 窓
            this.add(this.bodySprite);

            this.lightsContainer = scene.add.container(x, y).setDepth(DEPTH.CAR_LIGHTS);

            this.headLightL = scene.add.pointlight(-8, -25, 0xffffff, 40, 0.4, 0.1);
            this.headLightR = scene.add.pointlight(8, -25, 0xffffff, 40, 0.4, 0.1);

            this.rearLightL = scene.add.pointlight(-8, 25, 0xff0000, 20, 0.5, 0.1);
            this.rearLightR = scene.add.pointlight(8, 25, 0xff0000, 20, 0.5, 0.1);

            this.lightsContainer.add([this.headLightL, this.headLightR, this.rearLightL, this.rearLightR]);

            scene.add.existing(this);
            this.setDepth(DEPTH.CARS);

            this.setInteractive(new Phaser.Geom.Rectangle(-12, -22, 24, 44), Phaser.Geom.Rectangle.Contains);
            this.on('pointerdown', () => (this.scene as MainScene).followCar(this));
        }

        setSelected(selected: boolean) {
            this.isSelected = selected;
            this.bodySprite.clear();
            if (selected) this.bodySprite.lineStyle(2, 0xffff00, 1).strokeRoundedRect(-14, -24, 28, 48, 4);
            this.bodySprite.fillStyle(this.color, 1).fillRoundedRect(-12, -22, 24, 44, 4);
            this.bodySprite.fillStyle(0x000000, 0.8).fillRect(-10, -10, 20, 10).fillRect(-10, 8, 20, 8);
        }

        update(cars: Car[], lightLevel: number, inTunnel: boolean) {
            let nextCarDist = Infinity;
            cars.forEach(c => {
                if (c !== this && c.lane === this.lane) {
                    let d = this.y - c.y;
                    if (d < 0) d += WORLD_HEIGHT;
                    if (d > 0 && d < nextCarDist) nextCarDist = d;
                }
            });

            const minSafeDist = 60 + (this.currentSpeed * 3);
            let isBraking = false;

            if (nextCarDist < minSafeDist) {
                this.currentSpeed *= 0.95;
                isBraking = true;
            } else if (this.currentSpeed < this.targetSpeed) {
                this.currentSpeed += 0.1;
            }

            this.y -= this.currentSpeed;
            if (this.y < 0) this.y += WORLD_HEIGHT;

            this.lightsContainer.setPosition(this.x, this.y);

            const needLights = lightLevel < 0.4 || inTunnel;
            this.headLightL.setVisible(needLights);
            this.headLightR.setVisible(needLights);

            if (isBraking) {
                this.rearLightL.setVisible(true).color.setTo(255, 0, 0);
                this.rearLightL.intensity = 1.0;
                this.rearLightR.setVisible(true).color.setTo(255, 0, 0);
                this.rearLightR.intensity = 1.0;
            } else if (needLights) {
                this.rearLightL.setVisible(true).color.setTo(255, 50, 50);
                this.rearLightL.intensity = 0.4;
                this.rearLightR.setVisible(true).color.setTo(255, 50, 50);
                this.rearLightR.intensity = 0.4;
            } else {
                this.rearLightL.setVisible(false);
                this.rearLightR.setVisible(false);
            }
        }
    }

    class MainScene extends Phaser.Scene {
        cars: Car[] = [];
        scenery: any[] = [];
        tunnels: {y: number, endY: number}[] = [];
        baseTargetSpeed: number = 12;
        spawnRate: number = 10;
        weatherOverlay!: Phaser.GameObjects.Graphics;
        timeOfDay: number = 0;
        followedCar: Car | null = null;

        constructor() { super({ key: 'MainScene' }); }

        create() {
            const roadX = window.innerWidth / 2;

            this.add.graphics().fillStyle(0x333333, 1).fillRect(roadX - ROAD_WIDTH/2, 0, ROAD_WIDTH, WORLD_HEIGHT).setDepth(DEPTH.ROAD_BASE);
            const markings = this.add.graphics().lineStyle(4, 0xffffff, 0.4);
            for (let i = 1; i < NUM_LANES; i++) {
                if (i === NUM_LANES / 2) continue;
                const x = (roadX - ROAD_WIDTH/2) + (i * LANE_WIDTH);
                for (let y = 0; y < WORLD_HEIGHT; y += 100) markings.lineBetween(x, y, x, y + 50);
            }
            this.add.graphics().lineStyle(6, 0xffaa00, 1).lineBetween(roadX, 0, roadX, WORLD_HEIGHT).setDepth(DEPTH.ROAD_BASE);

            this.createScenery(roadX);
            this.spawnCars();

            this.weatherOverlay = this.add.graphics().setDepth(DEPTH.WEATHER).setScrollFactor(0);

            this.cameras.main.setBounds(0, 0, window.innerWidth, WORLD_HEIGHT);

            // Setup React interface
            gameStateRef.current.applySettingsFn = (count, spawn, spd) => {
                this.baseTargetSpeed = spd;
                this.spawnRate = spawn;
                if (this.cars.length !== count && count > 0) {
                    this.spawnCarsCount(count);
                }
            };
            gameStateRef.current.resetCamFn = () => this.followCar(null);

            this.input.on('pointerdown', (p: Phaser.Input.Pointer, objs: any[]) => {
                if (objs.length === 0) this.followCar(null);
            });
            this.input.on('wheel', (p: any, objs: any, dx: number, dy: number) => {
                const cam = this.cameras.main;
                if (this.followedCar) return;
                cam.scrollY += dy * 2;
                cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, WORLD_HEIGHT - window.innerHeight);
            });
        }

        createScenery(roadX: number) {
            this.scenery.push(this.createRiver(roadX, 3000));
            this.scenery.push(this.createRiver(roadX, 10000));

            this.createTunnel(roadX, 4000, 800, true);
            this.createTunnel(roadX, 8500, 1200, false);

            this.scenery.push(this.createOverpass(roadX, 2000));
            this.scenery.push(this.createOverpass(roadX, 6000));
            this.scenery.push(this.createOverpass(roadX, 11500));

            this.scenery.push(this.createSignboard(roadX, 1000, 'independent'));
            this.scenery.push(this.createSignboard(roadX, 5000, 'bridge'));
            this.scenery.push(this.createSignboard(roadX, 9000, 'bridge'));
            this.scenery.push(this.createSignboard(roadX, 12500, 'independent'));

            this.scenery.push(this.createInterchange(roadX, 2500, -1, false));
            this.scenery.push(this.createInterchange(roadX, 5500, -1, true));
            this.scenery.push(this.createInterchange(roadX, 8000, 1, false));
            this.scenery.push(this.createInterchange(roadX, 10500, 1, true));

            for (let y = 0; y < WORLD_HEIGHT; y += 300) {
                this.createBaronBush(roadX - ROAD_WIDTH/2 - 140, y);
                this.createBaronBush(roadX + ROAD_WIDTH/2 + 140, y);
            }
        }

        createRiver(roadX: number, y: number) {
            const container = this.add.container(0, y);
            const river = this.add.graphics().fillStyle(0x0a3d62, 1).fillRect(0, 0, window.innerWidth, 1200);
            const bridgeDeck = this.add.graphics().fillStyle(0x222222, 1).fillRect(roadX - ROAD_WIDTH/2, 0, ROAD_WIDTH, 1200);
            bridgeDeck.lineStyle(2, 0xffffff, 0.4);
            for (let i = 1; i < NUM_LANES; i++) {
                if (i === NUM_LANES / 2) continue;
                const lx = (roadX - ROAD_WIDTH/2) + (i * LANE_WIDTH);
                for (let py = 0; py < 1200; py += 100) bridgeDeck.lineBetween(lx, py, lx, py + 50);
            }
            bridgeDeck.lineStyle(14, 0x7f8c8d, 1).lineBetween(roadX - ROAD_WIDTH/2 - 12, 0, roadX - ROAD_WIDTH/2 - 12, 1200).lineBetween(roadX + ROAD_WIDTH/2 + 12, 0, roadX + ROAD_WIDTH/2 + 12, 1200);
            container.add([river, bridgeDeck]).setDepth(DEPTH.RIVER);
            return container;
        }

        createOverpass(roadX: number, y: number) {
            const container = this.add.container(0, y);
            const graphics = this.add.graphics().fillStyle(0x576574, 1).fillRect(0, -20, window.innerWidth, 20);
            graphics.fillStyle(0x2c3e50, 1).fillRect(0, 0, window.innerWidth, 400);
            graphics.fillStyle(0x44505c, 1).fillRect(0, 400, window.innerWidth, 120);
            const label = this.add.text(roadX, 460, "▼ CLEARANCE 5.0m", { fontFamily: "Arial", fontSize: '26px', fontStyle: 'bold', color: "#f1c40f", backgroundColor: "#000" }).setOrigin(0.5);
            container.add([graphics, label]).setDepth(DEPTH.OVERPASS);
            return container;
        }

        createSignboard(roadX: number, y: number, type: string) {
            const container = this.add.container(0, y);
            const g = this.add.graphics().fillStyle(0x333333, 1);
            if (type === 'bridge') {
                g.fillRect(roadX-ROAD_WIDTH/2-20,0,10,150).fillRect(roadX+ROAD_WIDTH/2+10,0,10,150).fillRect(roadX-ROAD_WIDTH/2-20,0,ROAD_WIDTH+40,10);
                this.drawBoard(container, roadX-ROAD_WIDTH/4, 10, 200, 100);
                this.drawBoard(container, roadX+ROAD_WIDTH/4, 10, 200, 100);
            } else {
                const side = Math.random() > 0.5 ? 1 : -1;
                const bx = roadX + (side * (ROAD_WIDTH/2 + 100));
                g.fillRect(bx-5, 0, 10, 150);
                this.drawBoard(container, bx, 0, 200, 100);
            }
            container.setDepth(DEPTH.SIGNBOARDS);
            this.scenery.push(container);
            return container;
        }

        drawBoard(container: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number) {
            const g = this.add.graphics().fillStyle(0x005a32, 1).lineStyle(4, 0xffffff, 1).fillRect(x-w/2, y, w, h).strokeRect(x-w/2, y, w, h);
            const txt = this.add.text(x, y+h/2, "AIRPORT", { fontFamily: "Arial", fontSize: '20px', fontStyle: 'bold', color: "#ffffff" }).setOrigin(0.5);
            container.add([g, txt]);
        }

        createInterchange(roadX: number, y: number, direction: number, isExit: boolean) {
            const container = this.add.container(0, y) as any;
            const side = direction === -1 ? -1 : 1;
            const startX = roadX + (side * (ROAD_WIDTH/2));
            const g = this.add.graphics().fillStyle(0x333333, 1);
            const pts = [{x:startX,y:0},{x:startX+(side*250),y:direction*800},{x:startX+(side*300),y:direction*800},{x:startX+(side*50),y:0}];
            g.fillPoints(pts, true);
            const label = this.add.text(startX+(side*180), direction*400, isExit?"EXIT":"ENTRY", { fontFamily: "Arial", fontSize: '24px', fontStyle: 'bold', color: "#f1c40f" }).setOrigin(0.5).setAngle(side*45);
            container.add([g, label]).setDepth(DEPTH.ROAD_BASE + 5);
            container.isExit = isExit; container.isEntry = !isExit; container.direction = direction;
            return container;
        }

        createBaronBush(x: number, y: number) {
            const points = [{x:-75,y:0},{x:-60,y:-45},{x:-45,y:-20},{x:-30,y:-45},{x:-15,y:-20},{x:0,y:-45},{x:15,y:-20},{x:30,y:-45},{x:45,y:-20},{x:60,y:-45},{x:75,y:0}];
            const bush = this.add.container(x, y).add(this.add.graphics().fillStyle(0x55a630, 1).fillPoints(points, true).lineStyle(2, 0x80b918, 1).strokePoints(points, true)).setDepth(DEPTH.SCENERY_BG);
            this.scenery.push(bush);
        }

        createTunnel(roadX: number, y: number, length: number, isTop: boolean) {
            this.add.graphics().fillStyle(0x111111, 1).fillRect(roadX-ROAD_WIDTH/2-20, y, ROAD_WIDTH+40, length).setDepth(DEPTH.TUNNEL_OVERLAY);
            this.add.graphics().fillStyle(0x222222, 1).fillRect(roadX-ROAD_WIDTH/2-25, y, ROAD_WIDTH+50, length).setDepth(DEPTH.TUNNEL_ROOF);
            const py = isTop ? y + length : y;
            this.add.graphics().fillStyle(0x444444, 1).fillRect(roadX-ROAD_WIDTH/2-80, py-40, ROAD_WIDTH+160, 40).fillRect(roadX-ROAD_WIDTH/2-80, py-40, 60, 100).fillRect(roadX+ROAD_WIDTH/2+20, py-40, 60, 100).setDepth(DEPTH.TUNNEL_ROOF+10);
            this.tunnels.push({ y, endY: y+length });
        }

        spawnCars() {
            this.spawnCarsCount((window as any).__traffic_carCount || 30);
        }

        spawnCarsCount(count: number) {
            this.cars.forEach(c => { if(c.lightsContainer) c.lightsContainer.destroy(); c.destroy(); });
            this.cars = [];
            const roadStartX = window.innerWidth / 2 - ROAD_WIDTH / 2;
            for (let i = 0; i < count; i++) {
                const lane = Math.floor(Math.random() * NUM_LANES);
                this.cars.push(new Car(this, roadStartX+(lane*LANE_WIDTH)+LANE_WIDTH/2, Phaser.Math.Between(0, WORLD_HEIGHT), lane, this.baseTargetSpeed));
            }
        }

        followCar(car: Car | null) {
            if (this.followedCar) this.followedCar.setSelected(false);
            if (car) { this.followedCar = car; car.setSelected(true); this.cameras.main.startFollow(car, true, 0.1, 0.1); }
            else { this.followedCar = null; this.cameras.main.stopFollow(); }
        }

        update(time: number, delta: number) {
            this.timeOfDay = (Math.sin(time * 0.00006) + 1) / 2;
            const light = Phaser.Math.Clamp(this.timeOfDay * 1.8, 0.1, 1.0);
            this.weatherOverlay.clear().fillStyle(0x000033, 1 - light).fillRect(0, 0, window.innerWidth, window.innerHeight);

            if (Math.random() < this.spawnRate / 1000) {
                const entries = this.scenery.filter(s => s.isEntry);
                if (entries.length > 0) {
                    const e = entries[Math.floor(Math.random() * entries.length)];
                    const lane = e.direction === -1 ? 0 : NUM_LANES - 1;
                    this.cars.push(new Car(this, (window.innerWidth/2 - ROAD_WIDTH/2) + (lane * LANE_WIDTH) + LANE_WIDTH/2, e.y, lane, this.baseTargetSpeed));
                }
            }
            this.cars = this.cars.filter(c => c.active);
            this.cars.forEach(c => c.update(this.cars, light, this.tunnels.some(t => c.y > t.y && c.y < t.endY)));

            const avg = this.cars.length > 0 ? this.cars.reduce((s, c) => s + c.currentSpeed, 0) / this.cars.length : this.baseTargetSpeed;
            const jam = Phaser.Math.Clamp(1 - (avg / this.baseTargetSpeed), 0, 1);

            const timeStr = `${String(Math.floor(this.timeOfDay * 24)).padStart(2,'0')}:${String(Math.floor((this.timeOfDay * 24 % 1) * 60)).padStart(2,'0')}`;

            const html = `
              <div style="margin-bottom: 4px;">Vehicles: ${this.cars.length} | Time: ${timeStr}</div>
              <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
                <div style="width: ${jam * 100}%; height: 100%; background: ${jam < 0.3 ? "#00ffcc" : jam < 0.6 ? "#ffcc00" : "#ff0000"};"></div>
              </div>
            `;
            gameStateRef.current.setStatsFn(html);

            this.scenery.forEach(s => {
                const camY = this.cameras.main.scrollY;
                if (s.y < camY - 3000) s.y += WORLD_HEIGHT;
                if (s.y > camY + window.innerHeight + 3000) s.y -= WORLD_HEIGHT;
            });
        }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameContainerRef.current,
      backgroundColor: '#1e5d2f',
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

  // Effect to sync react state down to phaser scene when needed
  useEffect(() => {
    (window as any).__traffic_carCount = carCount;
    if (gameStateRef.current.applySettingsFn) {
      gameStateRef.current.applySettingsFn(carCount, spawnRate, speed);
    }
  }, [carCount, spawnRate, speed]);

  return (
    <div className="relative w-full h-full">
      <div ref={gameContainerRef} className="w-full h-full"></div>

      {/* Stats Display */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white p-3 rounded shadow-lg border border-gray-700 min-w-[250px] z-10 pointer-events-none"
        dangerouslySetInnerHTML={{ __html: statsHTML }}
      >
      </div>

      {/* Reset Cam Button */}
      <button
        onClick={() => gameStateRef.current.resetCamFn && gameStateRef.current.resetCamFn()}
        className="absolute bottom-4 left-4 bg-white/20 hover:bg-white/40 border-2 border-white text-white p-3 rounded-full font-bold shadow-lg z-10"
      >
        📷 Reset Camera
      </button>

      {/* Settings Panel */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 mb-2 w-full text-right"
        >
          {settingsOpen ? '⚙️ 設定を隠す' : '⚙️ 設定を表示'}
        </button>

        {settingsOpen && (
          <div className="bg-gray-900/90 text-white p-4 rounded-lg shadow-xl border border-gray-700 backdrop-blur-sm w-64">
            <h3 className="font-bold mb-4 border-b border-gray-700 pb-2">シミュレーション設定</h3>

            <div className="mb-4">
              <label className="block text-sm mb-1 text-gray-300">初期車両数: {carCount}</label>
              <input
                type="range" min="0" max="200" step="10"
                value={carCount}
                onChange={e => setCarCount(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-1 text-gray-300">合流頻度</label>
              <input
                type="range" min="0" max="50" step="1"
                value={spawnRate}
                onChange={e => setSpawnRate(Number(e.target.value))}
                className="w-full accent-green-500"
              />
            </div>

            <div className="mb-2">
              <label className="block text-sm mb-1 text-gray-300">基準速度</label>
              <input
                type="range" min="5" max="30" step="1"
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
