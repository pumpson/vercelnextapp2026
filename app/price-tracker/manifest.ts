import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '底値比較PWA',
    short_name: '底値比較',
    description: 'スーパー等でどの商品が1gあたり一番安いかをご利用のアプライアンスで瞬時に計算・比較し、オフラインでも過去の底値を確認できる個人用ツール。',
    start_url: '/price-tracker',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
