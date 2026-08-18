import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function GamesIndexPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8">
      <div className="w-full max-w-6xl mb-8 flex items-center">
        <Link href="/" className="flex items-center text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          ホームに戻る
        </Link>
      </div>

      <h1 className="text-4xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
        Games Arcade
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        <Link href="/games/walkingfield" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-blue-500 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">🚶</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">WalkingField</h2>
          <p className="text-gray-400 flex-grow">無限に広がる世界を探索し、自分だけの拠点を作るサバイバル・クラフトゲーム。</p>
        </Link>

        <Link href="/games/hit-and-blow" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-indigo-500 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-indigo-400 transition-colors">Hit & Blow</h2>
          <p className="text-gray-400 flex-grow">数字を推理して当てる、クラシックな論理パズルゲーム。</p>
        </Link>

        <Link href="/games/mario-like" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-red-500 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">🍄</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-red-400 transition-colors">Action Jump</h2>
          <p className="text-gray-400 flex-grow">ジャンプして敵を避け、ゴールを目指すレトロ風アクションゲーム。</p>
        </Link>

        <Link href="/games/minecraft-like" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-green-500 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">⛏️</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-green-400 transition-colors">Crafting World</h2>
          <p className="text-gray-400 flex-grow">ブロックを置いて道や橋を作り、自分だけの世界を開拓するゲーム。</p>
        </Link>

        <Link href="/games/traffic" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-yellow-500 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">🚗</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-yellow-400 transition-colors">Traffic Simulator</h2>
          <p className="text-gray-400 flex-grow">大量の車が走る高速道路のシミュレーター。渋滞を観察しよう。</p>
        </Link>

        <Link href="/games/neon-shooting" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-cyan-500 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-cyan-400 transition-colors">Neon Shooting</h2>
          <p className="text-gray-400 flex-grow">ネオン輝くサイバーパンクシティを破壊する縦スクロールシューティング。</p>
        </Link>

        <Link href="/games/fishing" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-blue-400 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">🎣</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">Fishing Master</h2>
          <p className="text-gray-400 flex-grow">タップで魚を釣る、時間帯によって釣れる魚が変わる放置系釣りゲーム。</p>
        </Link>

        <Link href="/games/geo-collector" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-green-600 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-green-500 transition-colors">Geo Collector</h2>
          <p className="text-gray-400 flex-grow">現実の位置情報（GPS）を使ってマップ上のオブジェを集めるゲーム。</p>
        </Link>

        <Link href="/games/fe-tactics" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-red-600 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">⚔️</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-red-500 transition-colors">Auto Tactics</h2>
          <p className="text-gray-400 flex-grow">部隊と陣形を編成し、フルオートで敵部隊と戦うシミュレーションRPG。</p>
        </Link>

        <Link href="/games/tokyo-train-sugoroku" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-emerald-600 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">🚆</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-emerald-500 transition-colors">東京トレインすごろく</h2>
          <p className="text-gray-400 flex-grow">東京の地下鉄やJRを舞台にした鉄道すごろくゲーム。目的地を目指して資産を増やそう。</p>
        </Link>

        <Link href="/games/auto-battler" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-orange-500 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">⚔️</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-orange-400 transition-colors">Auto Battler</h2>
          <p className="text-gray-400 flex-grow">30対30のキャラクターが戦う総力戦戦争ゲーム。ステータスがバラバラなキャラを指揮してステージをクリアしよう。</p>
        </Link>

        <Link href="/games/cafe-detective" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-purple-500 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">☕</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-purple-400 transition-colors">Cafe Detective</h2>
          <p className="text-gray-400 flex-grow">深夜のカフェを舞台にした推理アドベンチャー。探偵と常連客と織りなす怪盗三毛猫事件。</p>
        </Link>

        <Link href="/games/stickman-line-wars" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-pink-500 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">🤺</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-pink-400 transition-colors">Stickman Line Wars</h2>
          <p className="text-gray-400 flex-grow">資金を使ってユニットを召喚し、敵の拠点を破壊するラインディフェンスゲーム。</p>
        </Link>

        <Link href="/games/supply-squad" className="group p-8 bg-gray-800 rounded-3xl border border-gray-700 hover:border-emerald-400 transition-all hover:scale-105 shadow-xl flex flex-col">
          <div className="text-4xl mb-4">📦</div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-emerald-300 transition-colors">Supply Squad</h2>
          <p className="text-gray-400 flex-grow">味方の兵士をタップして弾薬を補給し、迫りくる敵から拠点を守り抜くシミュレーター。</p>
        </Link>
      </div>
    </div>
  );
}
