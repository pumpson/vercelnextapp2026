# Walking Field (無限マップ探索ゲーム)

## 概要
Next.js (App Router) と Phaser 3 を使用した、マイクラのような無限に広がるマップを探索するゲームです。
マップは手続き型生成（Procedural Generation）によって動的に生成され、プレイヤーは自由に歩き回り、アイテムを配置することができます。

## 技術スタック
- **Frontend Framework**: Next.js (TypeScript)
- **Game Engine**: Phaser 3
- **Styling**: Tailwind CSS (UI Layer)
- **Communication**: Custom EventBus (Phaser ↔ React)
- **Persistence**: IndexedDB (Chunk-based)

## ディレクトリ構造
- `page.tsx`: ゲームのメインエントリーポイント。Phaser のインスタンス化とリサイズ管理を行います。
- `game/`: ゲームエンジンのコアロジック
    - `MainScene.ts`: マップ生成、描画、プレイヤー操作、チャンク管理などの中心ロジック。
    - `db.ts`: IndexedDB を操作するためのラッパーモジュール。
    - `types.ts`: 定数（タイルサイズ、チャンクサイズ等）と型定義。
    - `EventBus.ts`: React コンポーネントと Phaser シーン間のイベント通信用。
- `components/`: UI コンポーネント
    - `GameOverlay.tsx`: ゲーム画面上にオーバーレイされる UI（ステータス、アイテム選択、保存ボタン等）。

## 主要システム

### 1. 地形生成 (Terrain Generation)
`smoothNoise` 関数を用いたノイズ生成により、無限の地形を作成しています。
「高さ（Height）」と「湿度（Moisture）」の2つのノイズを組み合わせることで、多様なバイオーム（砂漠、ジャングル、雪山など）を表現しています。

### 2. チャンクシステム (Chunking) & 永続化
パフォーマンス維持と大規模建築への対応のため、世界を「チャンク」単位で管理・保存しています。
- プレイヤーの周囲のチャンクのみを生成・保持。
- 建築データ（変更されたタイル）は **IndexedDB** にチャンクごとに保存されます。
- これにより、LocalStorage の容量制限 (5MB) を気にせず、無限に建築を行うことが可能です。

### 4. 衝突判定 (Collision)
`isPassable` 関数により、通行可能なタイルを判定しています。
- 基本的に「水」以上の高さのタイルが通行可能。
- 「橋」を置くことで水の上を通行可能にする特殊ロジックがあります。

## 今後の拡張予定
- バイオームの多様化（湿度ノイズの導入など）
- 絵文字から画像アセットへの差し替え
- クラフト要素や敵キャラクターの追加
