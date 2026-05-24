import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ProductList from '../components/ProductList';

vi.mock('../db', () => ({
  db: {
    products: {
      toArray: vi.fn().mockResolvedValue([
        { id: '1', name: 'りんご', store: 'スーパーA', currentPrice: 100, isLowest: true, lastUpdated: '2023-01-01' },
      ]),
    },
  },
}));

describe('PriceTracker ProductList', () => {
  it('商品リストがレンダリングされること', async () => {
    render(<ProductList />);
    // "単価順" または "登録日順" が描画されていればコンポーネントが描画されたとみなす
    expect(screen.getByText(/単価順/i)).toBeDefined();
  });
});
