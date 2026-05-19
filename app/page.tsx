import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
        WalkingField & PriceTracker
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        <Link href="/games/walkingfield" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-blue-500 transition-all hover:scale-105 shadow-xl">
          <div className="text-4xl mb-4">🚶</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">WalkingField</h2>
          <p className="text-gray-400">無限に広がる世界を探索し、自分だけの拠点を作るサバイバル・クラフトゲーム。</p>
        </Link>

        <Link href="/price-tracker" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-green-500 transition-all hover:scale-105 shadow-xl">
          <div className="text-4xl mb-4">📈</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-green-400 transition-colors">Price Tracker</h2>
          <p className="text-gray-400">商品の価格推移を記録・管理するための便利ツール。</p>
        </Link>

        <Link href="/three-good-things" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-orange-500 transition-all hover:scale-105 shadow-xl">
          <div className="text-4xl mb-4">✨</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-orange-400 transition-colors">Three Good Things</h2>
          <p className="text-gray-400">毎日の「3つの良いこと」を記録して、ポジティブな毎日を送りましょう。</p>
        </Link>
      </div>

      <footer className="mt-16 text-gray-500 text-sm">
        Built with Next.js & Vercel
      </footer>
    </div>
  );
}
