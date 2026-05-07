import { TileData, InventorySlot } from './types';

const DB_NAME = 'WalkingFieldDB';
const DB_VERSION = 1;

export interface ChunkSaveData {
  id: string; // format: "cx,cy"
  tiles: Record<string, TileData>; // key: "tx,ty"
}

export interface PlayerSaveData {
  id: string; // "main"
  pos: { x: number; y: number };
  totalSteps: number;
  hp: number;
  hotbar: (InventorySlot | null)[];
  spawnPoint?: { x: number; y: number };
}

let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('chunks')) {
        db.createObjectStore('chunks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('player')) {
        db.createObjectStore('player', { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = (e.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      console.error('IndexedDB init error:', request.error);
      reject(request.error);
    };
  });
};

export const saveChunkData = async (cx: number, cy: number, tilesMap: Map<string, TileData>) => {
  const db = await initDB();
  const tiles: Record<string, TileData> = {};
  tilesMap.forEach((val, key) => {
    tiles[key] = val;
  });

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('chunks', 'readwrite');
    const store = tx.objectStore('chunks');
    store.put({ id: `${cx},${cy}`, tiles });
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadChunkData = async (cx: number, cy: number): Promise<Map<string, TileData>> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chunks', 'readonly');
    const store = tx.objectStore('chunks');
    const req = store.get(`${cx},${cy}`);
    
    req.onsuccess = () => {
      const result = req.result as ChunkSaveData | undefined;
      const map = new Map<string, TileData>();
      if (result && result.tiles) {
        Object.entries(result.tiles).forEach(([k, v]) => map.set(k, v));
      }
      resolve(map);
    };
    
    req.onerror = () => reject(req.error);
  });
};

export const savePlayerData = async (data: Omit<PlayerSaveData, 'id'>) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('player', 'readwrite');
    tx.objectStore('player').put({ id: 'main', ...data });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadPlayerData = async (): Promise<PlayerSaveData | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('player', 'readonly');
    const req = tx.objectStore('player').get('main');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};
