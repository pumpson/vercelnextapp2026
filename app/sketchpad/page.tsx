"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import { Canvas, ToolType } from "./components/Canvas";
import { CanvasData, getCanvasData, saveCanvasData, createInitialCanvasData } from "./utils/db";

const CANVAS_COUNT = 9;
const CANVAS_SIZE = 300;

export default function SketchpadPage() {
  // キャンバスデータの配列状態
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  // 現在選択されているツール（デフォルトは鉛筆）
  const [currentTool, setCurrentTool] = useState<ToolType>("pencil");
  // 現在選択されている色（デフォルトは黒）
  const [currentColor, setCurrentColor] = useState<string>("#000000");
  // ロード中かどうかの状態
  const [isLoading, setIsLoading] = useState(true);

  // 初期化：IndexedDBからデータを読み込む
  useEffect(() => {
    const loadData = async () => {
      const loadedData: CanvasData[] = [];
      for (let i = 0; i < CANVAS_COUNT; i++) {
        const id = `canvas-${i}`;
        let data = await getCanvasData(id);

        // データが存在しない場合（初回アクセス時など）は新規作成して保存
        if (!data) {
          data = createInitialCanvasData(id, i);
          await saveCanvasData(data);
        }
        loadedData.push(data);
      }
      setCanvases(loadedData);
      setIsLoading(false);
    };

    loadData();
  }, []);

  // キャンバスに描画された際に呼ばれ、画像をIndexedDBに保存する処理
  const handleCanvasChange = useCallback(async (index: number, imageData: string) => {
    setCanvases(prev => {
      const newCanvases = [...prev];
      const currentCanvas = newCanvases[index];

      // 更新するデータを作成
      const updatedData: CanvasData = {
        ...currentCanvas,
        imageData,
      };

      // 状態を更新
      newCanvases[index] = updatedData;

      // 非同期でIndexedDBに保存（画面の描画をブロックしないように）
      saveCanvasData(updatedData).catch(console.error);

      return newCanvases;
    });
  }, []);

  // 画像をPNGとしてローカルにダウンロード（エクスポート）する処理
  const handleDownload = (canvasData: CanvasData) => {
    // 画像データがない（白紙の）場合は何もしない
    if (!canvasData.imageData) {
      alert("まだ絵が描かれていません！");
      return;
    }

    const link = document.createElement("a");
    link.download = `sketch_${canvasData.name}.png`;
    link.href = canvasData.imageData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <p className="text-gray-400">キャンバス読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* ヘッダー領域 */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
            Sketchpad
          </h1>
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            ← ホームに戻る
          </Link>
        </header>

        {/* ツールバー（ツール選択と色選択） */}
        <div className="bg-gray-800 p-4 rounded-xl mb-8 flex flex-wrap gap-6 items-center shadow-lg border border-gray-700">

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentTool("pencil")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentTool === "pencil" ? "bg-pink-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              ✏️ 鉛筆
            </button>
            <button
              onClick={() => setCurrentTool("eraser")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentTool === "eraser" ? "bg-pink-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              🧹 消しゴム
            </button>
            <button
              onClick={() => setCurrentTool("fill")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentTool === "fill" ? "bg-pink-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              🪣 塗りつぶし
            </button>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <label htmlFor="colorPicker" className="text-sm font-medium text-gray-300">
              色:
            </label>
            <input
              id="colorPicker"
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
              title="色を選択"
            />
          </div>
        </div>

        {/* キャンバスグリッド領域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
          {canvases.map((canvasData, index) => (
            <div key={canvasData.id} className="flex flex-col items-center bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-xl">

              {/* キャンバスのタイトルとダウンロードボタン */}
              <div className="w-full flex justify-between items-center mb-3">
                <span className="text-sm text-gray-400 font-mono">
                  {canvasData.name}
                </span>
                <button
                  onClick={() => handleDownload(canvasData)}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                  title="画像をダウンロード"
                >
                  📥 保存
                </button>
              </div>

              {/* キャンバス本体 */}
              <div className="bg-white rounded overflow-hidden">
                <Canvas
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  tool={currentTool}
                  color={currentColor}
                  initialImageData={canvasData.imageData}
                  onChange={(imageData) => handleCanvasChange(index, imageData)}
                />
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
