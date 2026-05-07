'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';

interface InputFormProps {
  onSuccess: () => void;
}

export default function InputForm({ onSuccess }: InputFormProps) {
  const [formData, setFormData] = useState({
    category: '',
    subCategory: '',
    manufacturer: '',
    productName: '',
    price: '',
    amount: '',
    store: '',
  });

  const [unitPrice, setUnitPrice] = useState<number | null>(null);

  useEffect(() => {
    const p = parseFloat(formData.price);
    const a = parseFloat(formData.amount);
    if (!isNaN(p) && !isNaN(a) && a > 0) {
      setUnitPrice(p / a);
    } else {
      setUnitPrice(null);
    }
  }, [formData.price, formData.amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(formData.price);
    const a = parseFloat(formData.amount);

    if (isNaN(p) || isNaN(a) || a <= 0) {
      alert('有効な価格と内容量を入力してください');
      return;
    }

    try {
      await db.products.add({
        id: uuidv4(),
        category: formData.category,
        subCategory: formData.subCategory,
        manufacturer: formData.manufacturer,
        productName: formData.productName,
        price: p,
        amount: a,
        unitPrice: p / a,
        store: formData.store,
        registeredAt: new Date().toISOString(),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('保存に失敗しました');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">新規登録</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="例: 食品, 日用品"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">分類 (小カテゴリ)</label>
          <input
            type="text"
            name="subCategory"
            value={formData.subCategory}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="例: コーヒー粉, 洗剤"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メーカー</label>
          <input
            type="text"
            name="manufacturer"
            value={formData.manufacturer}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="例: ネスカフェ"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">商品名</label>
          <input
            type="text"
            name="productName"
            value={formData.productName}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="例: ゴールドブレンド"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">価格 (税込)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容量 (g/ml)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="0"
              required
            />
          </div>
        </div>

        {unitPrice !== null && (
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <span className="text-sm text-blue-700">1g(ml)あたりの単価: </span>
            <span className="text-xl font-bold text-blue-800">¥{unitPrice.toFixed(3)}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">販売場所</label>
          <input
            type="text"
            name="store"
            value={formData.store}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="例: スーパーライフ, Amazon"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
        >
          保存する
        </button>
      </form>
    </div>
  );
}
