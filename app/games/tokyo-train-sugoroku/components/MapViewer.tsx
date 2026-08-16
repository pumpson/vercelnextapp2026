"use client";

import React, { useRef, useState, useEffect } from 'react';
import { MAP_DATA, LineColors, Station } from '../data/mapData';

interface MapViewerProps {
  playerStationId: string;
  cpuStationId: string;
  destinationId: string;
  // 分岐選択中などにクリック可能な駅
  selectableStations?: string[];
  onStationClick?: (stationId: string) => void;
}

export default function MapViewer({
  playerStationId,
  cpuStationId,
  destinationId,
  selectableStations = [],
  onStationClick
}: MapViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // パン・ズームの状態
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 1000 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // プレイヤーが現在いる駅を中心に表示する（初回のみ）
  // 全体が見えるようにさらに広い視野で初期化する
  useEffect(() => {
    const pStation = MAP_DATA.find(s => s.id === playerStationId);
    if (pStation) {
      setViewBox({
        x: pStation.x - 1500, // 画面幅の半分をさらに広く
        y: pStation.y - 1500,
        w: 3000,
        h: 3000
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ドラッグ操作（パン）
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    // 表示スケールに応じた移動量の調整
    // svgの実際のサイズ（クライアント幅）とviewBoxの幅の比率
    const svgRect = svgRef.current?.getBoundingClientRect();
    const scale = svgRect ? viewBox.w / svgRect.width : 1;

    const dx = (dragStart.x - e.clientX) * scale;
    const dy = (dragStart.y - e.clientY) * scale;

    setViewBox(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ズーム操作
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const isZoomIn = e.deltaY < 0;

    setViewBox(prev => {
      const newW = isZoomIn ? prev.w / zoomFactor : prev.w * zoomFactor;
      const newH = isZoomIn ? prev.h / zoomFactor : prev.h * zoomFactor;

      // ズームしすぎ、引きすぎの制限 (最大ズームアウトを広げる)
      if (newW < 200 || newW > 6000) return prev;

      // マウス位置を中心にズーム
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return prev;

      const mouseX = e.clientX - svgRect.left;
      const mouseY = e.clientY - svgRect.top;

      // マウスの相対位置 (0~1)
      const relX = mouseX / svgRect.width;
      const relY = mouseY / svgRect.height;

      // 新しいviewBoxの左上座標
      const newX = prev.x + (prev.w - newW) * relX;
      const newY = prev.y + (prev.h - newH) * relY;

      return { x: newX, y: newY, w: newW, h: newH };
    });
  };

  // 線分の描画（重複を避けるために一意のペアを作成）
  const drawnEdges = new Set<string>();
  const edges: React.ReactNode[] = [];

  MAP_DATA.forEach(station => {
    station.next.forEach(nextId => {
      const nextStation = MAP_DATA.find(s => s.id === nextId);
      if (!nextStation) return;

      const edgeId1 = `${station.id}-${nextId}`;
      const edgeId2 = `${nextId}-${station.id}`;

      if (!drawnEdges.has(edgeId1) && !drawnEdges.has(edgeId2)) {
        drawnEdges.add(edgeId1);

        // 線の色を決定（両方の駅が共通して持つ路線色を優先）
        let strokeColor = '#555';
        for (const line of station.lines) {
          if (nextStation.lines.includes(line)) {
            strokeColor = LineColors[line];
            break;
          }
        }

        // 駅間が広くなったため、線を少し太めに
        edges.push(
          <line
            key={edgeId1}
            x1={station.x}
            y1={station.y}
            x2={nextStation.x}
            y2={nextStation.y}
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      }
    });
  });

  return (
    <div
      className="w-full h-full cursor-grab active:cursor-grabbing bg-[#1a1c29]"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }} // ブラウザのデフォルトスクロールを防ぐ
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      >
        {/* 背景のグリッド（オプショナル） */}
        <defs>
          <pattern id="grid" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#ffffff0a" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect x={viewBox.x - 4000} y={viewBox.y - 4000} width={viewBox.w + 8000} height={viewBox.h + 8000} fill="url(#grid)" />

        {/* 路線（エッジ）の描画 */}
        {edges}

        {/* 駅（ノード）の描画 */}
        {MAP_DATA.map(station => {
          const isDestination = station.id === destinationId;
          const isSelectable = selectableStations.includes(station.id);

          let fillColor = '#cbd5e1'; // neutral
          if (station.type === 'plus') fillColor = '#3b82f6'; // blue
          if (station.type === 'minus') fillColor = '#ef4444'; // red

          return (
            <g
              key={station.id}
              transform={`translate(${station.x}, ${station.y})`}
              onClick={() => isSelectable && onStationClick && onStationClick(station.id)}
              className={isSelectable ? "cursor-pointer" : ""}
            >
              {/* 目的地ハイライト */}
              {isDestination && (
                <>
                  <circle r="35" fill="#facc15" className="animate-ping opacity-75" />
                  <circle r="28" fill="#facc15" stroke="#fff" strokeWidth="4" />
                  <text y="-35" textAnchor="middle" fill="#facc15" fontSize="20" fontWeight="bold" className="drop-shadow-md">
                    目的地
                  </text>
                </>
              )}

              {/* 選択可能ハイライト */}
              {isSelectable && (
                <circle r="26" fill="none" stroke="#22d3ee" strokeWidth="6" className="animate-pulse" />
              )}

              {/* 駅のサイズを少し大きく */}
              <circle
                r="18"
                fill={fillColor}
                stroke="#fff"
                strokeWidth="3"
                className={`transition-all duration-300 ${isSelectable ? 'hover:scale-110' : ''}`}
              />

              {/* 駅名のフォントサイズを大きくし、背景と区別しやすくする */}
              <text
                y="32"
                textAnchor="middle"
                fill="#f8fafc"
                fontSize="18"
                fontWeight="bold"
                className="select-none pointer-events-none"
                style={{ textShadow: '2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000, 0 0 8px #000' }}
              >
                {station.name}
              </text>
            </g>
          );
        })}

        {/* CPUの描画 */}
        {MAP_DATA.map(station => {
          if (station.id !== cpuStationId) return null;
          return (
            <g key="cpu-marker" transform={`translate(${station.x + 15}, ${station.y - 15})`} className="pointer-events-none transition-transform duration-500">
              <circle r="20" fill="#ef4444" stroke="#fff" strokeWidth="3" />
              <text y="6" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">C</text>
            </g>
          );
        })}

        {/* プレイヤーの描画 */}
        {MAP_DATA.map(station => {
          if (station.id !== playerStationId) return null;
          return (
            <g key="player-marker" transform={`translate(${station.x - 15}, ${station.y - 15})`} className="pointer-events-none transition-transform duration-500">
              <circle r="22" fill="#22c55e" stroke="#fff" strokeWidth="4" />
              <text y="7" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="bold">P</text>
            </g>
          );
        })}
      </svg>

      {/* コントロール案内 */}
      <div className="absolute bottom-4 left-4 bg-gray-900/80 p-2 rounded text-xs text-gray-400 pointer-events-none">
        ドラッグで移動 / マウスホイールで拡大縮小
      </div>
    </div>
  );
}
