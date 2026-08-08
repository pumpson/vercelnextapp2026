"use client";

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function NeonShootingGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    class MainScene extends Phaser.Scene {
      player!: Phaser.Physics.Arcade.Sprite;
      bullets!: Phaser.Physics.Arcade.Group;
      cityLayer!: Phaser.Physics.Arcade.Group;
      buildings!: Phaser.Physics.Arcade.Group;
      cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

      scrollSpeed: number = 2.0;
      score: number = 0;
      scoreText!: Phaser.GameObjects.Text;
      zoneInfoText!: Phaser.GameObjects.Text;

      tileSize: number = 100;
      gridWidth: number = 8;
      spawnY: number = -150;
      distanceCovered: number = 0;
      isGameOver: boolean = false;

      roadColumns: number[] = [3, 4];
      stepsSinceLastShift: number = 0;
      stepsSinceLastCross: number = 0;
      initialSafeRows: number = 10;
      occupiedNextRow: boolean[] = [];

      currentZone: string = 'RESIDENTIAL';
      zoneRowsLeft: number = 15;

      buildingTypes: string[] = ['build_std', 'build_tall', 'build_wide', 'build_twin', 'build_glass', 'build_house'];
      explosiveTypes: string[] = ['build_gas', 'build_substation', 'build_factory_barrel'];

      constructor() { super('MainScene'); }

      preload() {
          this.occupiedNextRow = Array(this.gridWidth).fill(false);
          this.generateTextures();
      }

      create() {
          this.isGameOver = false;
          this.score = 0;
          this.scrollSpeed = 2.0;
          this.initialSafeRows = 10;
          this.roadColumns = [3, 4];
          this.stepsSinceLastShift = 0;
          this.stepsSinceLastCross = 0;
          this.zoneRowsLeft = 15;
          this.currentZone = 'RESIDENTIAL';
          this.occupiedNextRow = Array(this.gridWidth).fill(false);

          this.cityLayer = this.physics.add.group();
          this.buildings = this.physics.add.group();

          for (let y = this.spawnY; y < 800; y += this.tileSize) {
              this.spawnCityRow(y, true);
          }

          this.player = this.physics.add.sprite(400, 500, 'player');
          this.player.setCollideWorldBounds(true).setDepth(100);

          this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 30 });

          if (this.input.keyboard) {
              this.cursors = this.input.keyboard.createCursorKeys();
              this.input.keyboard.on('keydown-SPACE', this.fireBullet, this);
          }
          this.input.on('pointerdown', this.fireBullet, this);

          this.physics.add.overlap(this.bullets, this.buildings, (b, bdg) => this.hitBuilding(b as Phaser.Physics.Arcade.Sprite, bdg as Phaser.Physics.Arcade.Sprite), undefined, this);
          this.physics.add.collider(this.player, this.buildings, this.gameOver, undefined, this);

          this.scoreText = this.add.text(16, 16, 'DESTROYED: 0', { fontSize: '24px', color: '#00ffff', fontStyle: 'bold' }).setDepth(200);
          this.zoneInfoText = this.add.text(16, 45, 'ZONE: ' + this.currentZone, { fontSize: '18px', color: '#ffff00', fontStyle: 'bold' }).setDepth(200);

          const { width } = this.sys.game.config;
          this.add.text(width as number / 2, 70, 'Space / Click to Shoot. Arrow keys to move.', { fontSize: '16px', color: '#aaaaaa' }).setOrigin(0.5).setDepth(200);
      }

      generateTextures() {
          const createTex = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
              const g = this.add.graphics(); draw(g); g.generateTexture(key, w, h); g.destroy();
          };

          const dGreen = 0x112211, mGreen = 0x223322, road = 0x333333;

          createTex('ground_field', 100, 100, g => {
              g.fillStyle(dGreen).fillRect(0, 0, 100, 100);
              g.fillStyle(mGreen).fillCircle(20, 20, 15).fillCircle(80, 70, 20);
          });
          createTex('ground_parking', 100, 100, g => {
              g.fillStyle(0x444444).fillRect(0, 0, 100, 100);
              g.lineStyle(2, 0xffffff);
              for(let i=10; i<90; i+=20) g.lineBetween(10, i, 40, i);
          });
          createTex('path_h', 100, 100, g => {
              g.fillStyle(dGreen).fillRect(0, 0, 100, 100);
              g.fillStyle(0x665544).fillRect(0, 40, 100, 20);
          });

          createTex('road_v', 100, 100, g => { g.fillStyle(road).fillRect(0, 0, 100, 100).fillStyle(0x555555).fillRect(48, 0, 4, 100); });
          createTex('road_h', 100, 100, g => { g.fillStyle(road).fillRect(0, 0, 100, 100).fillStyle(0x555555).fillRect(0, 48, 100, 4); });
          createTex('road_cross', 100, 100, g => {
              g.fillStyle(road).fillRect(0, 0, 100, 100);
              g.lineStyle(4, 0xaaaaaa);
              g.strokeRect(20, 20, 60, 60);
          });

          createTex('build_std', 80, 80, g => { g.fillStyle(0xffffff).fillRect(0, 0, 80, 80).fillStyle(0x000000).fillRect(10, 10, 20, 20).fillRect(50, 10, 20, 20).fillRect(10, 50, 20, 20).fillRect(50, 50, 20, 20); });
          createTex('build_tall', 80, 80, g => { g.fillStyle(0xffffff).fillRect(10, 0, 60, 80).fillStyle(0x000000); for(let y=10; y<75; y+=15) g.fillRect(20, y, 40, 10); });
          createTex('build_wide', 80, 80, g => { g.fillStyle(0xffffff).fillRect(0, 20, 80, 40).fillStyle(0x000000).fillRect(10, 30, 60, 20); });
          createTex('build_twin', 80, 80, g => { g.fillStyle(0xffffff).fillRect(5, 5, 30, 70).fillRect(45, 5, 30, 70).fillStyle(0x000000).fillRect(10, 15, 20, 50).fillRect(50, 15, 20, 50); });
          createTex('build_glass', 80, 80, g => { g.fillStyle(0x88ccff).fillRect(5, 5, 70, 70).lineStyle(2, 0xffffff); for(let i=15; i<75; i+=15) { g.lineBetween(5, i, 75, i); g.lineBetween(i, 5, i, 75); }});

          createTex('build_large_h', 180, 80, g => { g.fillStyle(0xffffff).fillRect(0, 0, 180, 80).fillStyle(0x000000); for(let x=10; x<170; x+=30) for(let y=10; y<70; y+=25) g.fillRect(x, y, 20, 15); });
          createTex('build_large_v', 80, 180, g => { g.fillStyle(0xffffff).fillRect(0, 0, 80, 180).fillStyle(0x000000); for(let y=10; y<170; y+=30) for(let x=10; x<70; x+=25) g.fillRect(x, y, 15, 20); });

          createTex('build_house', 60, 60, g => { g.fillStyle(0xddaa77).fillRect(5, 25, 50, 35).fillStyle(0xaa4444).fillTriangle(30, 0, 0, 25, 60, 25).fillStyle(0x000000).fillRect(15, 35, 10, 10).fillRect(35, 35, 10, 10); });

          createTex('build_gas', 80, 80, g => { g.fillStyle(0x555555).fillRect(10, 10, 60, 60).fillStyle(0xff4444).fillCircle(40, 40, 25).fillStyle(0xffffff).fillCircle(40, 40, 15); });
          createTex('build_substation', 80, 80, g => { g.fillStyle(0x333333).fillRect(5, 5, 70, 70).lineStyle(4, 0x00ffff).strokeRect(15, 15, 20, 20).strokeRect(45, 45, 20, 20); });
          createTex('build_factory_barrel', 80, 80, g => { g.fillStyle(0x444455).fillRect(0, 0, 80, 80).fillStyle(0xdd8800).fillCircle(25, 25, 12).fillCircle(55, 25, 12).fillCircle(40, 55, 12); });
          createTex('build_factory_saw', 80, 80, g => { g.fillStyle(0x554444).fillRect(0, 0, 80, 80).fillStyle(0x999999); for(let x=10; x<=50; x+=20) g.fillTriangle(x, 40, x+10, 10, x+20, 40); });

          createTex('player', 40, 40, g => {
              g.fillStyle(0x00ffff).fillTriangle(20, 0, 0, 40, 40, 40);
              g.fillStyle(0x008888).fillTriangle(20, 40, 5, 35, 35, 35);
              g.fillStyle(0xffffff, 0.6).fillTriangle(20, 5, 12, 30, 28, 30);
              g.fillStyle(0xffffff).fillCircle(20, 26, 4);
          });
          createTex('bullet', 10, 10, g => {
              g.fillStyle(0xffffff).fillCircle(5, 5, 5);
              g.fillStyle(0xffcc00).fillCircle(5, 5, 3);
          });
      }

      updateCityPlan() {
          this.stepsSinceLastShift++;
          this.stepsSinceLastCross++;

          if (this.zoneRowsLeft <= 0) {
              const zones = ['RESIDENTIAL', 'INDUSTRIAL', 'URBAN', 'RURAL'];
              this.currentZone = Phaser.Utils.Array.GetRandom(zones.filter(z => z !== this.currentZone));
              this.zoneRowsLeft = Phaser.Math.Between(10, 18);
              this.zoneInfoText.setText(`ZONE: ${this.currentZone}`);
          }
          this.zoneRowsLeft--;

          if (this.stepsSinceLastShift > 10) {
              this.roadColumns = this.roadColumns.map(col => {
                  const shift = Phaser.Math.RND.pick([-1, 0, 1]);
                  const newCol = col + shift;
                  return (newCol >= 0 && newCol < this.gridWidth) ? newCol : col;
              });
              this.stepsSinceLastShift = 0;
          }

          let isCrossRow = (this.stepsSinceLastCross > 12 && Phaser.Math.Between(0, 10) > 8);
          if(isCrossRow) this.stepsSinceLastCross = 0;
          return isCrossRow;
      }

      spawnCityRow(y: number, forceSafe = false) {
          const isSafeZone = forceSafe || this.initialSafeRows > 0;
          if (!forceSafe && this.initialSafeRows > 0) this.initialSafeRows--;

          const isHorizontalStreet = isSafeZone ? false : this.updateCityPlan();
          let skipNextX = false;

          for (let x = 0; x < this.gridWidth; x++) {
              if (skipNextX) { skipNextX = false; continue; }
              if (this.occupiedNextRow[x]) {
                  this.occupiedNextRow[x] = false;
                  continue;
              }

              let posX = x * this.tileSize + this.tileSize / 2;
              let posY = y;

              if (this.roadColumns.includes(x)) {
                  const tileType = isHorizontalStreet ? 'road_cross' : 'road_v';
                  this.cityLayer.create(posX, posY, tileType);
              } else if (isHorizontalStreet) {
                  this.cityLayer.create(posX, posY, 'road_h');
              } else {
                  if (!isSafeZone && Phaser.Math.Between(0, 10) > 2) {
                      const rand = Phaser.Math.Between(0, 100);
                      let type = '';

                      switch(this.currentZone) {
                          case 'RESIDENTIAL':
                              if (rand > 40) type = 'build_house';
                              else type = Phaser.Utils.Array.GetRandom(this.buildingTypes);
                              break;
                          case 'INDUSTRIAL':
                              if (rand > 70) type = Phaser.Utils.Array.GetRandom(this.explosiveTypes);
                              else if (rand > 40) type = 'build_factory_saw';
                              else type = 'build_std';
                              break;
                          case 'URBAN':
                              if (rand > 90 && x < this.gridWidth - 1 && !this.roadColumns.includes(x+1)) {
                                  const b = this.buildings.create(posX + 50, posY, 'build_large_h');
                                  b.setTint(Phaser.Display.Color.RandomRGB().color);
                                  b.body.setSize(180, 80);
                                  skipNextX = true;
                                  continue;
                              } else if (rand > 80) {
                                  const b = this.buildings.create(posX, posY - 50, 'build_large_v');
                                  b.setTint(Phaser.Display.Color.RandomRGB().color);
                                  b.body.setSize(80, 180);
                                  this.occupiedNextRow[x] = true;
                                  continue;
                              }
                              type = Phaser.Utils.Array.GetRandom(['build_std', 'build_twin', 'build_glass']);
                              break;
                          case 'RURAL':
                              if (rand > 80) type = 'build_house';
                              else {
                                  this.cityLayer.create(posX, posY, Phaser.Math.Between(0,1) ? 'ground_field' : 'ground_parking');
                                  continue;
                              }
                              break;
                      }

                      if (type) {
                          const b = this.buildings.create(posX, posY, type);
                          if (!this.explosiveTypes.includes(type)) {
                              b.setTint(Phaser.Display.Color.RandomRGB().color);
                          }
                          b.body.setSize(type === 'build_house' ? 60 : 80, type === 'build_house' ? 60 : 80);
                      }

                  } else {
                      const r = Phaser.Math.Between(0, 10);
                      let tex = 'path_h';
                      if (this.currentZone === 'RURAL' || this.currentZone === 'RESIDENTIAL') {
                          if (r > 6) tex = 'ground_field';
                      } else if (this.currentZone === 'URBAN' || this.currentZone === 'INDUSTRIAL') {
                          if (r > 6) tex = 'ground_parking';
                      }
                      this.cityLayer.create(posX, posY, tex);
                  }
              }
          }
      }

      update() {
          if (this.isGameOver) return;

          const speed = 6;
          // React pointer events could be simulated here, for now stick to keyboard
          if (this.cursors && this.cursors.left.isDown) this.player.x -= speed;
          if (this.cursors && this.cursors.right.isDown) this.player.x += speed;
          if (this.cursors && this.cursors.up.isDown) this.player.y -= speed;
          if (this.cursors && this.cursors.down.isDown) this.player.y += speed;

          [this.cityLayer, this.buildings].forEach(group => {
              group.getChildren().slice().forEach(child => {
                  const obj = child as Phaser.GameObjects.Sprite;
                  obj.y += this.scrollSpeed;
                  if (obj.y > 800) obj.destroy();
              });
          });

          this.distanceCovered += this.scrollSpeed;
          if (this.distanceCovered >= this.tileSize) {
              this.spawnCityRow(this.spawnY);
              this.distanceCovered = 0;
              this.scrollSpeed += 0.002;
          }
      }

      fireBullet() {
          if (this.isGameOver) return;
          const b = this.bullets.get(this.player.x, this.player.y - 20) as Phaser.Physics.Arcade.Sprite;
          if (b) {
              b.setActive(true).setVisible(true);
              b.setOrigin(0.5, 0.5);
              b.body!.velocity.y = -800;
          }
          this.bullets.getChildren().slice().forEach(bullet => {
              const obj = bullet as Phaser.GameObjects.Sprite;
              if (obj.y < -50) obj.destroy();
          });
      }

      hitBuilding(bullet: Phaser.Physics.Arcade.Sprite, building: Phaser.Physics.Arcade.Sprite) {
          bullet.destroy();

          let isExplosive = this.explosiveTypes.includes(building.texture.key);
          let points = isExplosive ? 200 : 50;
          let explosionScale = isExplosive ? 3.5 : 1.2;
          let shakePower = isExplosive ? 0.03 : 0.01;
          let particleCount = isExplosive ? 80 : 25;
          let particleColor = 0xffffff;

          if (building.texture.key === 'build_substation') {
              particleColor = 0x88ffff;
          } else if (isExplosive) {
              particleColor = 0xffaa00;
          } else if (building.texture.key.includes('large')) {
              points = 150; explosionScale = 1.8;
          }

          this.score += points;
          this.scoreText.setText('DESTROYED: ' + this.score);

          this.add.particles(building.x, building.y, 'bullet', {
              speed: { min: -300 * explosionScale, max: 300 * explosionScale },
              scale: { start: 2 * explosionScale, end: 0 },
              lifespan: 700,
              tint: particleColor,
              blendMode: 'ADD',
              quantity: particleCount,
              stopAfter: particleCount
          });

          building.destroy();
          this.cameras.main.shake(300, shakePower);
      }

      gameOver() {
          if (this.isGameOver) return;
          this.isGameOver = true;
          this.physics.pause();
          this.player.setTint(0xff0000);
          const { width, height } = this.sys.game.config;
          this.add.rectangle((width as number)/2, (height as number)/2, width as number, height as number, 0x000000, 0.7).setDepth(150);
          this.add.text((width as number)/2, (height as number)/2, 'CITY WIPED OUT\n\nClick to Restart', {
              fontSize: '48px', color: '#ff4444', fontStyle: 'bold', align: 'center', stroke: '#fff', strokeThickness: 4
          }).setOrigin(0.5).setDepth(200);
          this.input.once('pointerdown', () => { this.scene.restart(); });
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800, // Fixed resolution for the game logic, auto-scaled by CSS if needed, but keeping original game resolution is safer for arcade physics
      height: 600,
      parent: gameContainerRef.current,
      backgroundColor: '#1a1a1a',
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0, x: 0 }, debug: false }
      },
      scene: MainScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
      <div ref={gameContainerRef} className="max-w-full max-h-full"></div>
    </div>
  );
}
