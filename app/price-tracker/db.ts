import Dexie, { type EntityTable } from 'dexie';

interface Product {
  id: string;
  category: string;
  subCategory: string;
  manufacturer: string;
  productName: string;
  price: number;
  amount: number;
  unitPrice: number;
  store: string;
  registeredAt: string;
}

const db = new Dexie('PriceTrackerDB') as Dexie & {
  products: EntityTable<
    Product,
    'id'
  >;
};

// Schema declaration:
db.version(1).stores({
  products: 'id, category, subCategory, productName, unitPrice, registeredAt'
});

export type { Product };
export { db };
