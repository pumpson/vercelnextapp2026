import * as Phaser from 'phaser';
import { EventBus } from './EventBus';
import { TILE_SIZE, CHUNK_SIZE, VIEW_DISTANCE, TileData, Inventory } from './types';
import { initDB, loadChunkData, saveChunkData, loadPlayerData, savePlayerData } from './db';

export class MainScene extends Phaser.Scene {
  chunks: Map<string, Phaser.GameObjects.Group> = new Map();
  // Cache for modified tiles per chunk: "cx,cy" -> Map<"tx,ty", TileData>
  chunkMods: Map<string, Map<string, TileData>> = new Map();
  
  player!: Phaser.GameObjects.Sprite;
  hp: number = 100;
  hotbar: (InventorySlot | null)[] = [
    { id: 'bridge', count: 10 },
    null, null, null, null
  ];
  selectedSlot: number = -1; // -1 = Empty Hand
  
  // Lighting and Time
  dayTime: number = 0; // 0 to 1 cycle
  timeOffset: number = 0;
  spawnPoint: { x: number; y: number } = { x: TILE_SIZE / 2, y: TILE_SIZE / 2 };
  lightLayer!: Phaser.GameObjects.RenderTexture;
  lightMaskGraphics!: Phaser.GameObjects.Graphics;
  
  lastDamageTime: number = 0;
  enemies: Phaser.GameObjects.Sprite[] = [];
  moveTarget: { x: number; y: number } | null = null;
  
  // Mining state
  miningData: { tx: number, ty: number, startTime: number, duration: number } | null = null;
  miningProgressBar!: Phaser.GameObjects.Graphics;

  lastCX: number | null = null;
  lastCY: number | null = null;
  distanceBuffer = 0;
  isDragging = false;
  pointerStartTime = 0;
  isReady = false;
  loadingChunks: Set<string> = new Set();

  constructor() {
    super('MainScene');
  }

  preload() {
    const drawEmoji = (key: string, emoji: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = TILE_SIZE;
      const ctx = canvas.getContext('2d')!;
      ctx.font = `${TILE_SIZE * 0.75}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, TILE_SIZE / 2, TILE_SIZE / 2);
      this.textures.addCanvas(key, canvas);
    };

    const assets: Record<string, string> = {
      grass: '🌱', forest: '🌲', water: '🌊', deepwater: '💎',
      sand: '🏖️', tent: '⛺', fire: '🔥', sign: '🪧', bridge: '🪵', player: '🚶',
      zombie: '🧟', sword: '🗡️', food: '🍖', chest: '🧰', chest_open: '📦', torch: '🕯️',
      pickaxe: '⛏️',
      road: '🛣️', barricade: '🚧', spikes: '🪤', lantern: '🏮',
      desert: '🌵', savanna: '🏜️', jungle: '🌴', snow_mountain: '🏔️',
      rocky_mountain: '⛰️', swamp: '🍄', tundra: '❄️'
    };
    Object.entries(assets).forEach(([k, v]) => drawEmoji(k, v));
  }

  async create() {
    await initDB();
    const savedPlayer = await loadPlayerData();
    
    let startPos = { x: TILE_SIZE / 2, y: TILE_SIZE / 2 };
    if (savedPlayer) {
      startPos = savedPlayer.pos;
      this.hp = savedPlayer.hp ?? 100;
      this.hotbar = savedPlayer.hotbar ?? [
        { id: 'bridge', count: 10 },
        null, null, null, null
      ];
      this.spawnPoint = savedPlayer.spawnPoint ?? startPos;
      EventBus.emit('load-save', { 
        totalSteps: savedPlayer.totalSteps, 
        hp: this.hp,
        hotbar: this.hotbar 
      });
    }

    this.cameras.main.setBackgroundColor('#2d2d2d');
    this.player = this.add.sprite(startPos.x, startPos.y, 'player').setDepth(100);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Initialize Lighting
    this.lightLayer = this.add.renderTexture(0, 0, this.cameras.main.width, this.cameras.main.height);
    this.lightLayer.setOrigin(0, 0);
    this.lightLayer.setDepth(200);
    this.lightLayer.setScrollFactor(0);
    this.lightLayer.setAlpha(0); // Day is bright

    this.lightMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.miningProgressBar = this.add.graphics().setDepth(300);

    // Handle Resize for Lighting
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.lightLayer.setSize(gameSize.width, gameSize.height);
    });

    await this.updateChunks();

    this.input.on('pointerdown', () => {
      this.isDragging = false;
      this.pointerStartTime = Date.now();
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) {
        const dist = Phaser.Math.Distance.Between(p.downX, p.downY, p.x, p.y);
        if (dist > 15) {
          this.isDragging = true;
          this.moveTarget = { x: p.worldX, y: p.worldY };
        }
      }
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging && (Date.now() - this.pointerStartTime < 300)) {
        this.handleTap(p.worldX, p.worldY);
      }
      this.moveTarget = null;
    });

    // Listen for events from React
    EventBus.on('set-selected-slot', (slot: number) => {
      this.selectedSlot = slot;
    });

    EventBus.on('discard-item', (slot: number) => {
      if (slot >= 0 && slot < this.hotbar.length) {
        this.hotbar[slot] = null;
        EventBus.emit('hotbar-changed', this.hotbar);
      }
    });

    EventBus.on('request-respawn', () => {
      this.handleGameOver();
    });

    EventBus.on('request-home', () => {
      this.hp = 100;
      this.player.x = TILE_SIZE / 2;
      this.player.y = TILE_SIZE / 2;
      this.moveTarget = null;
      this.enemies.forEach(e => e.destroy());
      this.enemies = [];
      EventBus.emit('player-hp-changed', this.hp);
      EventBus.emit('player-moved', { x: 0, y: 0 });
      this.updateChunks();
    });

    EventBus.on('place-sign', (data: { tx: number, ty: number, text: string }) => {
      this.useItemAt(this.selectedSlot); // Consume item
      this.placeObject(data.tx, data.ty, 'sign', data.text);
    });

    EventBus.on('request-save', (data: { totalSteps: number }) => {
      // Resting effect
      this.spawnPoint = { x: this.player.x, y: this.player.y };
      this.timeOffset = Date.now(); // Reset time to 0 (morning)
      
      // Clear all active enemies
      this.enemies.forEach(e => e.destroy());
      this.enemies = [];

      this.saveAll(data.totalSteps);
    });

    this.isReady = true;
    EventBus.emit('current-scene-ready', this);
  }

  handleTap(wX: number, wY: number) {
    const tX = Math.floor(wX / TILE_SIZE);
    const tY = Math.floor(wY / TILE_SIZE);
    const cx = Math.floor(tX / CHUNK_SIZE);
    const cy = Math.floor(tY / CHUNK_SIZE);
    const cKey = `${cx},${cy}`;
    const tKey = `${tX},${tY}`;

    // 0. Empty Hand Interaction (Future use: gather wood, etc.)
    if (this.selectedSlot === -1) {
      // For now, just a small visual effect or log
      console.log("Empty hand tap at", tX, tY);
      return;
    }

    const currentItem = this.hotbar[this.selectedSlot];
    if (!currentItem || currentItem.count <= 0) return;

    // 1. Check for Combat (AoE Attack)
    if (currentItem.id === 'sword') {
      this.performSwordAttack();
      return;
    }

    // 2. Check for Healing
    if (currentItem.id === 'food') {
      this.useItemAt(this.selectedSlot);
      this.hp = Math.min(100, this.hp + 30);
      EventBus.emit('player-hp-changed', this.hp);
      
      // Green flash effect
      this.player.setTint(0x00ff00);
      this.time.delayedCall(200, () => this.player.clearTint());
      return;
    }

    // 3. Check for Looting (Chest) - Now automatic, but handleTap can still handle manual if needed
    // (Actually looted automatically in update loop now)

    // 4. Handle Torch / Fire / Tent / Bridge Placement / Pickaxe / New Items
    const buildables = ['torch', 'fire', 'tent', 'bridge', 'pickaxe', 'road', 'barricade', 'spikes', 'lantern'];
    if (buildables.includes(currentItem.id)) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, wX, wY);
      
      if (currentItem.id === 'pickaxe') {
        if (dist < TILE_SIZE * 2) {
          this.startMining(tX, tY);
        }
        return;
      }

      // Proximity check for building (Optional, but let's keep it consistent)
      if (dist > TILE_SIZE * 3) return;

      // Special logic for bridges (water only)
      if (currentItem.id === 'bridge') {
        const biome = this.getBiome(this.getTerrainHeight(tX, tY), this.getTerrainMoisture(tX, tY));
        if (biome !== 'water' && biome !== 'deepwater') return;
      } else {
        // Other items cannot be placed on water
        const biome = this.getBiome(this.getTerrainHeight(tX, tY), this.getTerrainMoisture(tX, tY));
        if (biome === 'water' || biome === 'deepwater') return;
      }

      this.useItemAt(this.selectedSlot);
      this.placeObject(tX, tY, currentItem.id);
      return;
    }

    // 5. Sign Placement
    if (currentItem.id === 'sign') {
      EventBus.emit('open-sign-modal', { tx: tX, ty: tY });
    }
  }

  useItemAt(slotIndex: number) {
    const item = this.hotbar[slotIndex];
    if (item) {
      item.count -= 1;
      if (item.count <= 0) {
        this.hotbar[slotIndex] = null;
      }
      EventBus.emit('hotbar-changed', this.hotbar);
    }
  }

  giveItem(id: string, amount: number) {
    // 1. Try to stack
    for (let i = 0; i < this.hotbar.length; i++) {
      const slot = this.hotbar[i];
      if (slot && slot.id === id) {
        slot.count += amount;
        EventBus.emit('hotbar-changed', this.hotbar);
        return true;
      }
    }
    // 2. Try empty slot
    for (let i = 0; i < this.hotbar.length; i++) {
      if (this.hotbar[i] === null) {
        this.hotbar[i] = { id, count: amount };
        EventBus.emit('hotbar-changed', this.hotbar);
        return true;
      }
    }
    return false; // No space
  }

  performSwordAttack() {
    const attackRange = TILE_SIZE * 1.5;
    this.useItemAt(this.selectedSlot);

    // Visual Effect (Slash Circle)
    const circle = this.add.circle(this.player.x, this.player.y, attackRange, 0xffffff, 0.3);
    circle.setDepth(95);
    this.tweens.add({
      targets: circle,
      alpha: 0,
      scale: 1.2,
      duration: 200,
      onComplete: () => circle.destroy()
    });

    // Damage Enemies
    this.enemies.forEach(zombie => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, zombie.x, zombie.y);
      if (dist <= attackRange) {
        const zhp = zombie.getData('hp') - 40;
        if (zhp <= 0) {
          // Defer removal to avoid concurrent modification issues during forEach if any
          this.time.delayedCall(0, () => {
            zombie.destroy();
            this.enemies = this.enemies.filter(e => e !== zombie);
          });
        } else {
          zombie.setData('hp', zhp);
          zombie.setTint(0xff0000);
          this.time.delayedCall(100, () => zombie.clearTint());
          
          // Knockback effect
          const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, zombie.x, zombie.y);
          zombie.x += Math.cos(angle) * 20;
          zombie.y += Math.sin(angle) * 20;
        }
      }
    });
  }

  startMining(tx: number, ty: number) {
    // Cannot mine water
    const biome = this.getBiome(this.getTerrainHeight(tx, ty), this.getTerrainMoisture(tx, ty));
    if (biome === 'water' || biome === 'deepwater') return;

    this.miningData = {
      tx, ty,
      startTime: Date.now(),
      duration: 1500 // 1.5 seconds to dig
    };
    this.moveTarget = null; // Stop moving
  }

  updateMining() {
    this.miningProgressBar.clear();
    if (!this.miningData) return;

    const elapsed = Date.now() - this.miningData.startTime;
    const progress = Math.min(1, elapsed / this.miningData.duration);

    // Draw Progress Bar
    const px = this.player.x;
    const py = this.player.y - 40;
    this.miningProgressBar.fillStyle(0x000000, 0.5);
    this.miningProgressBar.fillRect(px - 25, py, 50, 6);
    this.miningProgressBar.fillStyle(0xffff00, 1);
    this.miningProgressBar.fillRect(px - 25, py, 50 * progress, 6);

    if (progress >= 1) {
      this.completeMining();
    }
  }

  async completeMining() {
    if (!this.miningData) return;
    const { tx, ty } = this.miningData;
    
    // Get current biome (considering existing mods)
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const mods = this.chunkMods.get(`${cx},${cy}`);
    let currentType = mods?.get(`${tx},${ty}`)?.type;
    
    if (!currentType) {
      currentType = this.getBiome(this.getTerrainHeight(tx, ty), this.getTerrainMoisture(tx, ty));
    }

    const builtObjects = ['road', 'barricade', 'spikes', 'lantern', 'bridge', 'torch', 'fire', 'tent', 'sign'];
    if (builtObjects.includes(currentType)) {
      // For built objects, just remove them and revert to natural biome
      // We do this by deleting the mod entry for this tile
      const cx = Math.floor(tx / CHUNK_SIZE);
      const cy = Math.floor(ty / CHUNK_SIZE);
      const mods = this.chunkMods.get(`${cx},${cy}`);
      if (mods) {
        mods.delete(`${tx},${ty}`);
        await saveChunkData(cx, cy, mods);
        this.refreshChunk(cx, cy);
        this.useItemAt(this.selectedSlot);
      }
      this.miningData = null;
      return;
    }

    // Downgrade mapping
    const downgradeMap: Record<string, string> = {
      'snow_mountain': 'rocky_mountain',
      'rocky_mountain': 'forest',
      'forest': 'grass',
      'jungle': 'grass',
      'swamp': 'sand',
      'savanna': 'grass',
      'grass': 'sand',
      'desert': 'sand'
    };

    const nextType = downgradeMap[currentType] || currentType;
    
    if (nextType !== currentType) {
      await this.placeObject(tx, ty, nextType);
      this.useItemAt(this.selectedSlot);
    }

    this.miningData = null;
  }

  async lootChest(tx: number, ty: number) {
    // Determine loot
    const rand = Math.random();
    let id = 'food';
    let amount = 1;

    if (rand < 0.3) {
      id = 'sword';
      amount = 10;
    } else if (rand < 0.6) {
      id = 'food';
      amount = 1;
    } else if (rand < 0.8) {
      id = 'torch';
      amount = 5;
    } else if (rand < 0.9) {
      id = 'fire';
      amount = 2;
    } else if (rand < 0.95) {
      id = 'pickaxe';
      amount = 10;
    } else if (rand < 0.97) {
      id = 'road';
      amount = 10;
    } else if (rand < 0.98) {
      id = 'barricade';
      amount = 5;
    } else if (rand < 0.99) {
      id = 'spikes';
      amount = 5;
    } else if (rand < 0.995) {
      id = 'lantern';
      amount = 2;
    } else {
      id = 'tent';
      amount = 1;
    }

    const success = this.giveItem(id, amount);
    if (!success) return; // Full inventory

    // Mark as looted
    await this.placeObject(tx, ty, 'chest_open');
  }

  getSeededRandom(x: number, y: number) {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  async placeObject(tx: number, ty: number, type: string, text: string | null = null) {
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const cKey = `${cx},${cy}`;
    const tKey = `${tx},${ty}`;
    
    const now = new Date();
    const ts = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    const data: TileData = { type, text: text || undefined, timestamp: ts };

    // Get or create chunk map
    if (!this.chunkMods.has(cKey)) {
      // If not in memory, try to load from DB first to avoid overwriting existing mods
      const existing = await loadChunkData(cx, cy);
      this.chunkMods.set(cKey, existing);
    }
    
    this.chunkMods.get(cKey)!.set(tKey, data);
    
    // Save to DB
    await saveChunkData(cx, cy, this.chunkMods.get(cKey)!);
    
    // Refresh visual
    this.refreshChunk(cx, cy);
  }

  isPassable(worldX: number, worldY: number) {
    const tx = Math.floor(worldX / TILE_SIZE);
    const ty = Math.floor(worldY / TILE_SIZE);
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const cKey = `${cx},${cy}`;
    const tKey = `${tx},${ty}`;

    const mods = this.chunkMods.get(cKey);
    if (mods && mods.has(tKey)) {
      const type = mods.get(tKey)?.type;
      if (type === 'bridge' || type === 'road' || type === 'spikes') return true;
      if (type === 'barricade' || type === 'lantern' || type === 'fire' || type === 'tent' || type === 'sign') return false;
    }
    
    const h = this.getTerrainHeight(tx, ty);
    return h >= 0.48;
  }

  update(_time: number, delta: number) {
    if (!this.isReady) return;

    // Time cycle: 0 to 1 over 2 minutes (120000ms)
    const cycleDuration = 120000;
    this.dayTime = ((Date.now() - this.timeOffset) % cycleDuration) / cycleDuration;
    EventBus.emit('time-changed', this.dayTime);

    this.updateLighting();
    this.updateMining();

    if (this.moveTarget) {
      this.miningData = null; // Cancel mining on move
      const px = Math.floor(this.player.x / TILE_SIZE);
      const py = Math.floor(this.player.y / TILE_SIZE);
      const h = this.getTerrainHeight(px, py);
      const m = this.getTerrainMoisture(px, py);
      const biome = this.getBiome(h, m);
      
      let multiplier = 1.0;
      const currentMods = this.chunkMods.get(`${Math.floor(px / CHUNK_SIZE)},${Math.floor(py / CHUNK_SIZE)}`);
      const standingTileType = currentMods?.get(`${px},${py}`)?.type;

      if (standingTileType === 'road') {
        multiplier = 1.5;
      } else {
        if (biome === 'snow_mountain') multiplier = 0.4;
        else if (biome === 'rocky_mountain') multiplier = 0.6;
        else if (biome === 'forest' || biome === 'jungle' || biome === 'swamp') multiplier = 0.8;
      }

      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y);
      const speed = 0.25 * delta * multiplier;
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
        EventBus.emit('player-stepped', steps);
        this.distanceBuffer %= TILE_SIZE;
      }
      this.player.flipX = Math.cos(angle) < 0;
    }

    this.updateEnemies(delta);

    const px = Math.floor(this.player.x / TILE_SIZE);
    const py = Math.floor(this.player.y / TILE_SIZE);
    EventBus.emit('player-moved', { x: px, y: py });

    const cx = Math.floor(px / CHUNK_SIZE);
    const cy = Math.floor(py / CHUNK_SIZE);
    const cKey = `${cx},${cy}`;
    const tKey = `${px},${py}`;
    
    // Automatic Chest Looting
    const mods = this.chunkMods.get(cKey);
    const tileMod = mods?.get(tKey);
    const isNaturalChest = this.getSeededRandom(px, py) < 0.01 && this.getBiome(this.getTerrainHeight(px, py), this.getTerrainMoisture(px, py)).indexOf('water') === -1;
    
    if ((isNaturalChest && !tileMod) || (tileMod?.type === 'chest')) {
      this.lootChest(px, py);
    }

    EventBus.emit('tile-contact', tileMod);

    if (cx !== this.lastCX || cy !== this.lastCY) {
      this.updateChunks(cx, cy);
      this.lastCX = cx;
      this.lastCY = cy;
    }
  }

  updateLighting() {
    // 0.0-0.4 Day, 0.4-0.5 Sunset, 0.5-0.9 Night, 0.9-1.0 Sunrise
    let targetAlpha = 0;
    if (this.dayTime > 0.4 && this.dayTime <= 0.5) {
      targetAlpha = (this.dayTime - 0.4) * 10; // Max 1.0
    } else if (this.dayTime > 0.5 && this.dayTime <= 0.9) {
      targetAlpha = 1.0;
    } else if (this.dayTime > 0.9 && this.dayTime <= 1.0) {
      targetAlpha = 1.0 - (this.dayTime - 0.9) * 10;
    }
    
    this.lightLayer.setAlpha(targetAlpha);
    if (targetAlpha === 0) return;

    // 1. Clear the light layer and fill with black
    this.lightLayer.clear();
    this.lightLayer.fill(0x000000, 1);

    // 2. Prepare the mask graphics
    this.lightMaskGraphics.clear();
    this.lightMaskGraphics.fillStyle(0xffffff, 1);

    // 3. Draw light sources in screen coordinates
    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;

    // Player Light
    this.lightMaskGraphics.fillCircle(this.player.x - scrollX, this.player.y - scrollY, TILE_SIZE * 2.5);

    // Torches and Fires
    this.chunkMods.forEach((mods) => {
      mods.forEach((data, tKey) => {
        if (data.type === 'torch' || data.type === 'fire' || data.type === 'lantern') {
          const [tx, ty] = tKey.split(',').map(Number);
          const wx = tx * TILE_SIZE + TILE_SIZE / 2;
          const wy = ty * TILE_SIZE + TILE_SIZE / 2;
          
          // Only draw if within reasonable screen range
          const dx = wx - (scrollX + this.cameras.main.width / 2);
          const dy = wy - (scrollY + this.cameras.main.height / 2);
          if (Math.abs(dx) < this.cameras.main.width && Math.abs(dy) < this.cameras.main.height) {
            const radius = data.type === 'lantern' ? TILE_SIZE * 5 : TILE_SIZE * 3;
            this.lightMaskGraphics.fillCircle(wx - scrollX, wy - scrollY, radius);
          }
        }
      });
    });

    // 4. Erase the light holes from the darkness
    this.lightLayer.erase(this.lightMaskGraphics);
  }

  updateEnemies(delta: number) {
    // 1. Cleanup distant enemies
    this.enemies = this.enemies.filter(enemy => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist > 1200) {
        enemy.destroy();
        return false;
      }
      return true;
    });

    // 2. Spawn new enemies if needed
    if (this.enemies.length < 5 && Math.random() < 0.01) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 600 + Math.random() * 200;
      const ex = this.player.x + Math.cos(angle) * dist;
      const ey = this.player.y + Math.sin(angle) * dist;
      
      if (this.isPassable(ex, ey)) {
        const zombie = this.add.sprite(ex, ey, 'zombie').setDepth(90);
        zombie.setData('hp', 100);
        this.enemies.push(zombie);
      }
    }

    // 3. Enemy AI
    this.enemies.forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      
      const ex = Math.floor(enemy.x / TILE_SIZE);
      const ey = Math.floor(enemy.y / TILE_SIZE);
      const ecx = Math.floor(ex / CHUNK_SIZE);
      const ecy = Math.floor(ey / CHUNK_SIZE);
      const eMods = this.chunkMods.get(`${ecx},${ecy}`);
      if (eMods?.get(`${ex},${ey}`)?.type === 'spikes') {
        const hp = enemy.getData('hp') - 0.5; // continuous damage
        if (hp <= 0) {
          enemy.destroy();
          this.enemies = this.enemies.filter(e => e !== enemy);
          return;
        }
        enemy.setData('hp', hp);
        enemy.setTint(0xff0000);
        this.time.delayedCall(100, () => enemy.clearTint());
      }

      if (dist < TILE_SIZE * 8) {
        let targetAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        let isRepelled = false;

        // Check for nearby fires (Safe Zone)
        this.chunkMods.forEach((mods) => {
          if (isRepelled) return;
          mods.forEach((data, tKey) => {
            if (isRepelled) return;
            if (data.type === 'fire') {
              const [tx, ty] = tKey.split(',').map(Number);
              const fx = tx * TILE_SIZE + TILE_SIZE / 2;
              const fy = ty * TILE_SIZE + TILE_SIZE / 2;
              if (Phaser.Math.Distance.Between(enemy.x, enemy.y, fx, fy) < TILE_SIZE * 5) {
                targetAngle = Phaser.Math.Angle.Between(fx, fy, enemy.x, enemy.y); // Flee from fire
                isRepelled = true;
              }
            }
          });
        });

        const speed = 0.06 * delta;
        const nextX = enemy.x + Math.cos(targetAngle) * speed;
        const nextY = enemy.y + Math.sin(targetAngle) * speed;

        if (this.isPassable(nextX, enemy.y)) enemy.x = nextX;
        if (this.isPassable(enemy.x, nextY)) enemy.y = nextY;
        enemy.flipX = Math.cos(targetAngle) < 0;

        // Damage detection
        if (!isRepelled && dist < TILE_SIZE * 0.8) {
          const now = Date.now();
          if (now - this.lastDamageTime > 1000) {
            this.hp -= 10;
            this.lastDamageTime = now;
            this.miningData = null; // Cancel mining on damage
            EventBus.emit('player-hp-changed', this.hp);
            
            // Red tint effect on damage
            this.player.setTint(0xff0000);
            this.time.delayedCall(200, () => this.player.clearTint());

            if (this.hp <= 0) {
              this.handleGameOver();
            }
          }
        }
      }
    });
  }

  handleGameOver() {
    this.hp = 100;
    this.player.x = this.spawnPoint.x;
    this.player.y = this.spawnPoint.y;
    this.timeOffset = Date.now(); // Reset time to morning on respawn
    this.moveTarget = null;
    
    // Clear enemies on death too
    this.enemies.forEach(e => e.destroy());
    this.enemies = [];

    EventBus.emit('player-hp-changed', this.hp);
    EventBus.emit('player-moved', { x: Math.floor(this.player.x / TILE_SIZE), y: Math.floor(this.player.y / TILE_SIZE) });
    this.updateChunks();
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

  getTerrainMoisture(x: number, y: number) {
    const ox = 543.21, oy = 123.45;
    let m = 1.0 * this.smoothNoise((x + ox) * 0.04, (y + oy) * 0.04);
    m += 0.5 * this.smoothNoise((x + ox) * 0.12, (y + oy) * 0.12);
    return m / 1.5;
  }

  getBiome(h: number, m: number): string {
    if (h < 0.25) return 'deepwater';
    if (h < 0.48) return 'water';
    if (h < 0.52) {
      if (m > 0.75) return 'swamp';
      return 'sand';
    }
    if (h > 0.78) {
      if (m < 0.3) return 'rocky_mountain';
      if (m < 0.6) return 'forest';
      return 'snow_mountain';
    }
    if (m < 0.2) return 'desert';
    if (m < 0.4) return 'savanna';
    if (m < 0.6) return 'grass';
    if (m < 0.8) return 'forest';
    return 'jungle';
  }

  async updateChunks(cX = Math.floor(this.player.x / (CHUNK_SIZE * TILE_SIZE)), cY = Math.floor(this.player.y / (CHUNK_SIZE * TILE_SIZE))) {
    const needed = new Set<string>();
    for (let x = cX - VIEW_DISTANCE; x <= cX + VIEW_DISTANCE; x++) {
      for (let y = cY - VIEW_DISTANCE; y <= cY + VIEW_DISTANCE; y++) {
        const k = `${x},${y}`;
        needed.add(k);
        if (!this.chunks.has(k) && !this.loadingChunks.has(k)) {
          this.loadingChunks.add(k);
          // Async load modifications
          loadChunkData(x, y).then(mods => {
            this.chunkMods.set(k, mods);
            this.chunks.set(k, this.createChunk(x, y));
            this.loadingChunks.delete(k);
          });
        }
      }
    }
    this.chunks.forEach((g, k) => {
      if (!needed.has(k)) {
        g.destroy(true);
        this.chunks.delete(k);
        this.chunkMods.delete(k); // Clean up memory
      }
    });
  }

  createChunk(cx: number, cy: number) {
    const group = this.add.group();
    const startX = cx * CHUNK_SIZE * TILE_SIZE;
    const startY = cy * CHUNK_SIZE * TILE_SIZE;
    const cKey = `${cx},${cy}`;
    const mods = this.chunkMods.get(cKey);

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const tX = cx * CHUNK_SIZE + tx, tY = cy * CHUNK_SIZE + ty;
        const tKey = `${tX},${tY}`;
        let texture;
        let infoText = null;
        let isTent = false;

        if (mods && mods.has(tKey)) {
          const mod = mods.get(tKey)!;
          texture = mod.type;
          if (mod.type === 'sign') infoText = mod.text;
          if (mod.type === 'tent') {
            infoText = mod.timestamp;
            isTent = true;
          }
        } else {
          const h = this.getTerrainHeight(tX, tY);
          const m = this.getTerrainMoisture(tX, tY);
          texture = this.getBiome(h, m);

          // Spawn Chest rare chance
          if (texture !== 'water' && texture !== 'deepwater' && this.getSeededRandom(tX, tY) < 0.01) {
            texture = 'chest';
          }
        }

        const x = startX + tx * TILE_SIZE;
        const y = startY + ty * TILE_SIZE;
        const tile = this.add.image(x, y, texture).setOrigin(0);
        group.add(tile);

        if (infoText) {
          const style = {
            fontSize: '10px',
            backgroundColor: isTent ? 'rgba(255,200,0,0.9)' : 'rgba(255,255,255,0.8)',
            color: '#000',
            padding: { x: 4, y: 2 }
          };
          const prefix = isTent ? "⛺ Stay: " : "";
          const txt = this.add.text(x + TILE_SIZE / 2, y - 2, prefix + infoText, style).setOrigin(0.5, 1).setDepth(50);
          group.add(txt);
        }
      }
    }
    return group;
  }

  refreshChunk(cx: number, cy: number) {
    const k = `${cx},${cy}`;
    if (this.chunks.has(k)) {
      this.chunks.get(k)!.destroy(true);
      this.chunks.set(k, this.createChunk(cx, cy));
    }
  }

  async saveAll(totalSteps: number) {
    await savePlayerData({
      pos: { x: this.player.x, y: this.player.y },
      totalSteps: totalSteps,
      hp: this.hp,
      hotbar: this.hotbar,
      spawnPoint: this.spawnPoint
    });
    // Individual chunks are auto-saved on modification,
    // so saveAll just handles player state.
    EventBus.emit('save-triggered', { success: true });
  }
}
