import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Turbopackのメモリ退避機能とファイルシステムキャッシュを有効化し、
    // 長時間の開発セッションや大規模アプリにおけるメモリ不足エラーを防止します。
    turbopackMemoryEviction: "full",
    turbopackFileSystemCacheForBuild: true,
  },
};

export default nextConfig;
