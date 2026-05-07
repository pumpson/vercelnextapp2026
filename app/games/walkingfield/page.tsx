'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const GameOverlay = dynamic(() => import('./components/GameOverlay').then(mod => mod.GameOverlay), {
  ssr: false,
});

export default function WalkingFieldPage() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !gameContainerRef.current) return;

    let phaserInstance: any = null;

    const initGame = async () => {
      // Dynamically import Phaser and the Scene to avoid SSR issues
      const Phaser = await import('phaser');
      const { MainScene } = await import('./game/MainScene');

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: gameContainerRef.current!,
        scale: {
          mode: Phaser.Scale.RESIZE,
          width: '100%',
          height: '100%',
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [MainScene],
        render: { pixelArt: true },
        physics: {
          default: 'arcade',
          arcade: { debug: false }
        }
      };

      phaserInstance = new Phaser.Game(config);
      gameRef.current = phaserInstance;
      setIsLoaded(true);
    };

    initGame();

    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (phaserInstance) {
        phaserInstance.destroy(true);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-neutral-900 select-none touch-none text-sans z-[60]">
      <div ref={gameContainerRef} className="w-full h-full" />
      
      {isLoaded && <GameOverlay />}

      {/* Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-white">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-xl font-bold tracking-widest">LOADING WORLD...</div>
          </div>
        </div>
      )}
    </div>
  );
}
