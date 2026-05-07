export const TILE_SIZE = 48;
export const CHUNK_SIZE = 8;
export const VIEW_DISTANCE = 2;
export const STORAGE_KEY = 'adv_save_nextjs_v1';

export interface InventorySlot {
  id: string;
  count: number;
}

export interface TileData {
  type: string;
  text?: string;
  timestamp: string;
}

export interface SaveData {
  tiles: [string, TileData][];
  pos: { x: number; y: number };
  totalSteps: number;
  stepsSinceLastSave: number;
  hp?: number;
  hotbar?: (InventorySlot | null)[];
}

export interface Coords {
  x: number;
  y: number;
}
