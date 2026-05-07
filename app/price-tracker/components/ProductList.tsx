'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, ArrowUpDown, Trash2, MapPin, Calendar } from 'lucide-react';
import { db, type Product } from '../db';

export default function ProductList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'unitPrice' | 'registeredAt'>('unitPrice');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch products from Dexie
  const products = useLiveQuery(async () => {
    let collection = db.products.toCollection();
    
    // Filtering by subCategory or productName
    const all = await collection.toArray();
    let filtered = all.filter(p => 
      p.subCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sorting
    filtered.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [searchTerm, sortBy, sortOrder]);

  const handleDelete = async (id: string) => {
    if (confirm('このデータを削除してもよろしいですか？')) {
      await db.products.delete(id);
    }
  };

  const toggleSort = (key: 'unitPrice' | 'registeredAt') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="分類または商品名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleSort('unitPrice')}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded text-xs font-medium border ${
              sortBy === 'unitPrice' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <ArrowUpDown size={14} />
            単価順 {sortBy === 'unitPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => toggleSort('registeredAt')}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded text-xs font-medium border ${
              sortBy === 'registeredAt' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <ArrowUpDown size={14} />
            登録日順 {sortBy === 'registeredAt' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {products?.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            データが見つかりません
          </div>
        ) : (
          products?.map((product) => (
            <div key={product.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded mb-1">
                    {product.subCategory}
                  </span>
                  <h3 className="font-bold text-gray-800">{product.productName}</h3>
                  <p className="text-xs text-gray-500">{product.manufacturer}</p>
                </div>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex items-end justify-between mt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-gray-500 text-[10px]">
                    <MapPin size={12} />
                    <span>{product.store || '不明'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-[10px]">
                    <Calendar size={12} />
                    <span>{new Date(product.registeredAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400">¥{product.price} / {product.amount}g(ml)</div>
                  <div className="text-lg font-bold text-blue-600">
                    ¥{product.unitPrice.toFixed(3)}
                    <span className="text-[10px] ml-0.5 text-gray-400 font-normal">/g</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
