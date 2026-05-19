import Dexie, { type EntityTable } from 'dexie';

interface DailyEntry {
  id: string;      // UUID
  date: string;    // 'YYYY-MM-DD' (Primary query key)
  thing1: string;
  thing2: string;
  thing3: string;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

const db = new Dexie('ThreeGoodThingsDB') as Dexie & {
  entries: EntityTable<DailyEntry, 'id'>;
};

// Schema declaration:
db.version(1).stores({
  entries: 'id, date, createdAt'
});

export type { DailyEntry };
export { db };
