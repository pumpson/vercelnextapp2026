import { get, set } from 'idb-keyval';

/**
 * 1つのキャンバスが持つデータの型定義
 */
export interface CanvasData {
  /**
   * キャンバスの識別子（例: canvas-0）
   */
  id: string;
  /**
   * キャンバスの名前（例: 20231026_120000）
   */
  name: string;
  /**
   * 画像のデータ（Data URL形式の文字列。Base64）
   * まだ描画されていない場合は undefined
   */
  imageData?: string;
  /**
   * 最後に更新された日時（ミリ秒）
   */
  updatedAt: number;
}

// -----------------------------------------------------------------------------
// キャンバスのデータを保存・取得するためのユーティリティ関数群
// ブラウザの IndexedDB を利用してデータを永続化します。
// -----------------------------------------------------------------------------

/**
 * 指定したIDのキャンバスデータを取得します。
 * @param id 取得したいキャンバスのID（例: 'canvas-0'）
 * @returns キャンバスデータ、存在しない場合は undefined
 */
export async function getCanvasData(id: string): Promise<CanvasData | undefined> {
  try {
    const data = await get<CanvasData>(`sketchpad_${id}`);
    return data;
  } catch (error) {
    console.error(`キャンバスデータ(ID: ${id})の取得に失敗しました:`, error);
    return undefined;
  }
}

/**
 * キャンバスデータを保存します。
 * @param data 保存したいキャンバスデータ
 */
export async function saveCanvasData(data: CanvasData): Promise<void> {
  try {
    // 常に最新のタイムスタンプを付与して保存する
    const dataToSave = {
      ...data,
      updatedAt: Date.now(),
    };
    await set(`sketchpad_${data.id}`, dataToSave);
  } catch (error) {
    console.error(`キャンバスデータ(ID: ${data.id})の保存に失敗しました:`, error);
  }
}

/**
 * キャンバスの初期状態（白紙）を生成して返します。
 * 名前は現在の日時ベース（YYYYMMDD_HHMMSS）で自動命名されます。
 * @param id キャンバスのID（0〜8）
 * @returns 初期状態のCanvasData
 */
export function createInitialCanvasData(id: string, index?: number): CanvasData {
  const now = new Date();

  // 日時ベースの名前を生成（例: 20231026_120000）
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  // 同時に複数作成された場合に名前が被るのを防ぐため、連番(index)があれば付与する
  const suffix = index !== undefined ? `_${index + 1}` : '';
  const name = `${yyyy}${MM}${dd}_${HH}${mm}${ss}${suffix}`;

  return {
    id,
    name,
    imageData: undefined,
    updatedAt: now.getTime(),
  };
}
