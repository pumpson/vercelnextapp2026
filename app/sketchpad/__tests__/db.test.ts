import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCanvasData, saveCanvasData, createInitialCanvasData, CanvasData } from '../utils/db';
import * as idbKeyval from 'idb-keyval';

// idb-keyval をモック化する
vi.mock('idb-keyval', () => {
  const store = new Map();
  return {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, val: any) => store.set(key, val)),
    clear: vi.fn(async () => store.clear()),
  };
});

describe('Sketchpad Database Utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // モックのストアをクリア
    const { clear } = await import('idb-keyval');
    await clear();
  });

  describe('createInitialCanvasData', () => {
    it('正しい構造の初期データを生成すること', () => {
      const id = 'canvas-test-1';
      const data = createInitialCanvasData(id);

      expect(data.id).toBe(id);
      expect(data.imageData).toBeUndefined();
      // 名前が YYYYMMDD_HHMMSS の形式（15文字）であることを確認
      expect(data.name).toMatch(/^\d{8}_\d{6}$/);
      // updatedAt が現在時刻に近いことを確認
      expect(Date.now() - data.updatedAt).toBeLessThan(1000);
    });
  });

  describe('saveCanvasData & getCanvasData', () => {
    it('データを保存して取得できること', async () => {
      const testData: CanvasData = {
        id: 'test-1',
        name: '20230101_120000',
        imageData: 'data:image/png;base64,testdata',
        updatedAt: 0, // 保存時に上書きされる想定
      };

      await saveCanvasData(testData);

      const retrievedData = await getCanvasData('test-1');
      expect(retrievedData).toBeDefined();
      expect(retrievedData?.id).toBe(testData.id);
      expect(retrievedData?.name).toBe(testData.name);
      expect(retrievedData?.imageData).toBe(testData.imageData);
      // 保存時に updatedAt が現在時刻に更新されているはず
      expect(retrievedData?.updatedAt).toBeGreaterThan(0);
    });

    it('存在しないデータの場合は undefined を返すこと', async () => {
      const retrievedData = await getCanvasData('non-existent');
      expect(retrievedData).toBeUndefined();
    });
  });
});
