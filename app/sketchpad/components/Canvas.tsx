"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

export type ToolType = "pencil" | "eraser" | "fill";

interface CanvasProps {
  /** キャンバスの横幅 */
  width: number;
  /** キャンバスの縦幅 */
  height: number;
  /** 初期画像のData URL（保存された絵の復元用） */
  initialImageData?: string;
  /** 現在選択されているツール */
  tool: ToolType;
  /** 現在選択されている色 */
  color: string;
  /** 描画が行われ、内容が変更されたときに呼ばれるコールバック */
  onChange: (imageData: string) => void;
  /** 別の場所がクリックされた等、意図的に保存のタイミングを作るためのイベント(任意) */
  onBlur?: () => void;
}

export function Canvas({
  width,
  height,
  initialImageData,
  tool,
  color,
  onChange,
  onBlur,
}: CanvasProps) {
  // キャンバスのDOM要素への参照
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 描画中かどうかの状態
  const [isDrawing, setIsDrawing] = useState(false);

  // 初期画像のロード済みフラグ
  const isInitialized = useRef(false);

  // 初期画像のロード処理（マウント時に1回だけ実行）
  useEffect(() => {
    // 既に初期化済みであれば実行しない（描画による更新で再リセットされるのを防ぐ）
    if (isInitialized.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 背景を白で初期化
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    if (initialImageData) {
      const img = new Image();
      img.onload = () => {
        // 画像が読み込まれたらキャンバスに描画
        ctx.drawImage(img, 0, 0);
        isInitialized.current = true;
      };
      img.src = initialImageData;
    } else {
      isInitialized.current = true;
    }
  }, [initialImageData, width, height]);

  // 描画関連の設定（ツールや色が変わったときに更新）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "eraser") {
      ctx.strokeStyle = "#ffffff"; // 消しゴムは背景色(白)で描く
      ctx.lineWidth = 20; // 消しゴムは太めに
    } else if (tool === "pencil") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
    }
  }, [tool, color]);

  // 変更を親コンポーネントに通知する処理
  const notifyChange = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  }, [onChange]);

  // ---------------------------------------------------------
  // 塗りつぶし（バケツ）ツールの実装（Flood Fill アルゴリズム）
  // ---------------------------------------------------------
  const fillCanvas = useCallback((startX: number, startY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // クリックされた位置のインデックス
    const startIndex = (startY * width + startX) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];

    // 選択された色をRGBに変換 (16進数 #RRGGBB を想定)
    const hex = color.replace(/^#/, "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = 255;

    // クリックした場所が既に同じ色なら何もしない
    if (r === startR && g === startG && b === startB && a === startA) {
      return;
    }

    // 色が一致するか判定するヘルパー関数
    const matchStartColor = (pixelPos: number) => {
      return (
        data[pixelPos] === startR &&
        data[pixelPos + 1] === startG &&
        data[pixelPos + 2] === startB &&
        data[pixelPos + 3] === startA
      );
    };

    // 色を塗るヘルパー関数
    const colorPixel = (pixelPos: number) => {
      data[pixelPos] = r;
      data[pixelPos + 1] = g;
      data[pixelPos + 2] = b;
      data[pixelPos + 3] = a;
    };

    // キューを用いた Flood Fill 処理
    const pixelStack = [[startX, startY]];

    while (pixelStack.length > 0) {
      const newPos = pixelStack.pop();
      if (!newPos) continue;
      const x = newPos[0];
      let y = newPos[1];
      let pixelPos = (y * width + x) * 4;

      // 上方向へ進めるだけ進む
      while (y-- >= 0 && matchStartColor(pixelPos)) {
        pixelPos -= width * 4;
      }
      pixelPos += width * 4;
      ++y;

      let reachLeft = false;
      let reachRight = false;

      // 下方向へ進みながら色を塗る
      while (y++ < height - 1 && matchStartColor(pixelPos)) {
        colorPixel(pixelPos);

        // 左側をチェック
        if (x > 0) {
          if (matchStartColor(pixelPos - 4)) {
            if (!reachLeft) {
              pixelStack.push([x - 1, y]);
              reachLeft = true;
            }
          } else if (reachLeft) {
            reachLeft = false;
          }
        }

        // 右側をチェック
        if (x < width - 1) {
          if (matchStartColor(pixelPos + 4)) {
            if (!reachRight) {
              pixelStack.push([x + 1, y]);
              reachRight = true;
            }
          } else if (reachRight) {
            reachRight = false;
          }
        }

        pixelPos += width * 4;
      }
    }

    // 変更した画像データをキャンバスに反映
    ctx.putImageData(imageData, 0, 0);
    notifyChange();
  }, [color, width, height, notifyChange]);

  // ---------------------------------------------------------
  // マウス/タッチ イベントハンドラ
  // ---------------------------------------------------------

  // 描画開始
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // タッチ時のスクロールを防ぐ

    const canvas = canvasRef.current;
    if (!canvas) return;

    // キャンバス上の相対座標を計算
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = Math.floor(clientX - rect.left);
    const y = Math.floor(clientY - rect.top);

    if (tool === "fill") {
      // 塗りつぶしツールの場合
      fillCanvas(x, y);
    } else {
      // 鉛筆・消しゴムの場合
      setIsDrawing(true);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  // 描画中（移動中）
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // タッチ時のスクロールを防ぐ
    if (!isDrawing || tool === "fill") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  // 描画終了
  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.closePath();
      }
    }

    // 描画が終わったタイミングで親コンポーネントに変更を通知
    notifyChange();
  };

  // 描画領域から外れた時の処理（描画を中断して保存を促す）
  const handleMouseOut = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      stopDrawing(e);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseOut={handleMouseOut}
      onBlur={onBlur}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      onTouchCancel={stopDrawing}
      className="bg-white rounded shadow-sm border border-gray-300 touch-none cursor-crosshair"
      style={{ width, height }} // CSSでもサイズを固定
    />
  );
}
