import * as Phaser from 'phaser';

// Use a simple mock for SSR if needed, but since this is a client-only game,
// we just ensure Phaser isn't executed on the server.
const isClient = typeof window !== 'undefined';

export const EventBus = isClient 
  ? new Phaser.Events.EventEmitter() 
  : { 
      on: () => {}, 
      off: () => {}, 
      emit: () => {}, 
      once: () => {} 
    } as unknown as Phaser.Events.EventEmitter;
