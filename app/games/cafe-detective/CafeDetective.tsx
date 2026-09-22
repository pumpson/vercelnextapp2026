"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- シナリオデータ ---
// 日本語の分かりやすいコメント：ゲームのストーリー進行を管理するオブジェクトです。
// 各シーンは配列になっており、順番にテキストを表示します。
type Choice = { label: string; target: string };
type Line = {
  speaker?: string;
  text: string;
  char?: string;
  charAnim?: string;
  effect?: string;
  choices?: Choice[];
  nextScene?: string;
};

const SCENARIO: Record<string, Line[]> = {
  start: [
      { text: "深夜2時。\n雨音が響く路地裏の小さなカフェ『Noir』。", char: "" },
      { text: "あなたはマスターとして、最後の客が帰るのを待っていた。\nしかし、ドアベルが鳴り、一人の女性が転がり込んできた。", char: "" },
      { speaker: "???", text: "ハァ、ハァ……。\nマスター、まだ開いてる？", char: "🕵️‍♀️", charAnim: "char-enter" },
      { speaker: "マスター(あなた)", text: "ええ、看板は出ていますよ。\nどうぞ、温かいものでも。", char: "🕵️‍♀️", charAnim: "char-breathe" },
      { speaker: "探偵の女", text: "助かるわ。私、探偵をやっているんだけど……\n厄介な事件を追っていてね。", char: "☕🕵️‍♀️", charAnim: "char-breathe",
          choices: [
              { label: "どんな事件ですか？", target: "ask_incident" },
              { label: "深入りはしないでおこう（黙ってコーヒーを出す）", target: "serve_coffee" }
          ]
      }
  ],
  ask_incident: [
      { speaker: "マスター(あなた)", text: "どんな事件を追っているんですか？", char: "☕🕵️‍♀️", charAnim: "char-breathe" },
      { speaker: "探偵の女", text: "『三毛猫』よ。\n最近、この界隈で光り物ばかりを盗む、怪盗みたいな三毛猫がいるの。", char: "🐈🕵️‍♀️", charAnim: "char-enter" },
      { speaker: "探偵の女", text: "そいつを路地裏まで追い詰めたんだけど……\n雨で見失っちゃって。", char: "🌧️🕵️‍♀️", charAnim: "char-breathe", nextScene: "detective_continue" }
  ],
  serve_coffee: [
      { text: "（黙ってブレンドコーヒーを差し出す）", char: "☕", charAnim: "char-enter" },
      { speaker: "探偵の女", text: "……無口なマスターね。\nまあいいわ。聞いてよ、私、『三毛猫』を追っていたの。", char: "🐈🕵️‍♀️", charAnim: "char-breathe" },
      { speaker: "探偵の女", text: "最近この辺りを荒らしている怪盗なんだけど、\nさっき路地裏で雨に降られて、見失っちゃったのよ。", char: "🌧️🕵️‍♀️", charAnim: "char-breathe", nextScene: "detective_continue" }
  ],
  detective_continue: [
      { speaker: "探偵の女", text: "マスター、何か怪しい影を見なかった？", char: "🕵️‍♀️", charAnim: "char-breathe",
          choices: [
              { label: "「何も見ていません」", target: "deny" },
              { label: "「そういえば、窓のそとに……」", target: "point_window" }
          ]
      }
  ],
  point_window: [
      { speaker: "マスター(あなた)", text: "そういえば、さっき窓の外を横切る小さな影を見ました。", char: "🕵️‍♀️", charAnim: "char-breathe" },
      { speaker: "探偵の女", text: "本当！？ どっちの方角へ行った！？", char: "❗️🕵️‍♀️", charAnim: "char-shake", effect: "shake" },
      { speaker: "マスター(あなた)", text: "駅の方へ向かったようです。\nですが、この雨では……", char: "🕵️‍♀️", charAnim: "char-breathe" },
      { speaker: "探偵の女", text: "ありがとう！\nこれ、コーヒー代！ 釣りはとっといて！！", char: "💴🕵️‍♀️", charAnim: "char-enter" },
      { text: "探偵の女は嵐の中へ飛び出していった……。\nしかし、彼女が追っていたのは本当に『猫』だったのだろうか？", char: "" },
      { text: "【 BAD END? : 嵐の夜の幻 】", char: "" }
  ],
  deny: [
      { speaker: "マスター(あなた)", text: "いいえ……雨がひどくて、外の様子は見ていません。", char: "🕵️‍♀️", charAnim: "char-breathe" },
      { speaker: "探偵の女", text: "そう……残念。手掛かりが途絶えちゃったわ。", char: "💧🕵️‍♀️", charAnim: "char-breathe" },
      { speaker: "探偵の女", text: "仕方ないわね。少しここで雨宿りしていくわ。", char: "☕🕵️‍♀️", charAnim: "char-enter", nextScene: "salaryman_enter" }
  ],
  salaryman_enter: [
      { text: "カランコロン…", char: "" },
      { speaker: "???", text: "はぁ、はぁ……ずぶ濡れだ……。\nマスター、エスプレッソを頼む……。", char: "👨‍💼", charAnim: "char-enter" },
      { speaker: "マスター(あなた)", text: "お疲れのようですね。\nタオルをどうぞ。", char: "👨‍💼", charAnim: "char-breathe" },
      { speaker: "サラリーマン", text: "ありがとう……。実は、大事な『商売道具』を盗まれてしまってね。\n酷い目に遭ったよ……。", char: "💦👨‍💼", charAnim: "char-shake",
          choices: [
              { label: "何を盗まれたのか聞く", target: "ask_stolen" },
              { label: "黙ってコーヒーを出す", target: "serve_silent" }
          ]
      }
  ],
  ask_stolen: [
      { speaker: "マスター(あなた)", text: "何を盗まれたのですか？", char: "👨‍💼", charAnim: "char-breathe" },
      { speaker: "サラリーマン", text: "先代から受け継いだ、手品用のアンティーク『シルクハット』だよ。\nしかも、信じられないことに……", char: "👨‍💼", charAnim: "char-breathe", nextScene: "detective_reacts" }
  ],
  serve_silent: [
      { text: "（エスプレッソを静かに差し出す）", char: "☕", charAnim: "char-enter" },
      { speaker: "サラリーマン", text: "……信じられないかもしれないが、盗んだ犯人は人間じゃないんだ。\n私の手品用の『シルクハット』を……", char: "👨‍💼", charAnim: "char-breathe", nextScene: "detective_reacts" }
  ],
  detective_reacts: [
      { speaker: "探偵の女", text: "ちょっとアンタ！！\nその話、詳しく聞かせて！！", char: "❗️🕵️‍♀️", charAnim: "char-enter", effect: "shake" },
      { speaker: "サラリーマン", text: "ひっ！？ な、なんだね君は！", char: "💦👨‍💼", charAnim: "char-shake" },
      { speaker: "探偵の女", text: "私は探偵よ！\nひょっとして、アンタの帽子を盗んだのは『三毛猫』じゃない！？", char: "🕵️‍♀️", charAnim: "char-breathe" },
      { speaker: "サラリーマン", text: "そ、その通りだ！ なぜそれを……！？", char: "😲👨‍💼", charAnim: "char-enter" },
      { speaker: "マスター(あなた)", text: "（点と点が繋がったようだ……）", char: "" },
      { text: "カランコロン…", char: "" },
      { text: "その時、店のドアが開き、奇妙な人物が入ってきた。", char: "", nextScene: "fortune_teller_enter" }
  ],
  fortune_teller_enter: [
      { speaker: "占い師", text: "フフフ……星の導きにより、迷える子羊たちが集まっているようね。", char: "🔮", charAnim: "char-enter" },
      { speaker: "マスター(あなた)", text: "いらっしゃいませ。\n……そ、その腕に抱いているのは……！", char: "🔮", charAnim: "char-breathe" },
      { speaker: "三毛猫", text: "ニャア。", char: "🐱🎩", charAnim: "char-enter" },
      { speaker: "サラリーマン", text: "ああっ！ 私の帽子！！", char: "😱👨‍💼", charAnim: "char-shake", effect: "shake" },
      { speaker: "探偵の女", text: "探していた三毛猫！！\nちょっと占い師、その猫を渡しなさい！", char: "💢🕵️‍♀️", charAnim: "char-enter" },
      { speaker: "占い師", text: "あら、この子は路地裏で震えていたのよ。\nこの不思議な帽子が、微かな『魔力』を放っていてね……引かれ合ったの。", char: "🔮", charAnim: "char-breathe" },
      { text: "店内は一触即発の空気になった。\nマスターとして、どう立ち回るべきか……？", char: "🐱🎩", charAnim: "char-breathe",
          choices: [
              { label: "猫に温かいミルクをあげる", target: "end_milk" },
              { label: "帽子を返すよう占い師を説得する", target: "end_persuade" },
              { label: "自分の運勢を占ってもらう", target: "end_joke" }
          ]
      }
  ],
  end_milk: [
      { speaker: "マスター(あなた)", text: "まあまあ、皆さん落ち着いて。\nまずは猫ちゃんに、温かいミルクでも。", char: "🥛", charAnim: "char-enter" },
      { speaker: "三毛猫", text: "ニャッ！", char: "🐱", charAnim: "char-enter" },
      { text: "三毛猫はシルクハットを放り出し、カウンターのミルクへ飛びついた！", char: "🐱🥛", charAnim: "char-breathe" },
      { speaker: "サラリーマン", text: "おお！ 帽子が戻ってきた！\nありがとう、マスター！", char: "😭👨‍💼", charAnim: "char-enter" },
      { speaker: "探偵の女", text: "あっけなく事件解決ね。\nマスターの機転に乾杯。", char: "☕🕵️‍♀️", charAnim: "char-breathe" },
      { speaker: "占い師", text: "フフ、平和な結末。\nこれもまた、星の導き通りだわ。", char: "🔮", charAnim: "char-breathe" },
      { text: "深夜のカフェに、再び穏やかな時間が戻った。\n【 GOOD END : カフェ・ド・ミルク 】", char: "" }
  ],
  end_persuade: [
      { speaker: "マスター(あなた)", text: "占い師さん、その帽子は彼の大事な商売道具です。\n返してあげてください。", char: "🔮", charAnim: "char-breathe" },
      { speaker: "占い師", text: "あら、星の運命に逆らうというの？\n……いいわ、力づくで奪ってみなさい！", char: "🔥🔮", charAnim: "char-shake", effect: "shake" },
      { speaker: "探偵の女", text: "マスター、下がって！\n私が相手よ！ 行くわよオオォォ！！", char: "🥊🕵️‍♀️", charAnim: "char-enter" },
      { text: "ドタバタバタッ！！ ガシャーーーン！！", char: "💥", charAnim: "char-shake", effect: "shake" },
      { speaker: "マスター(あなた)", text: "（頼むから、うちの店で暴れないでほしい……）", char: "🤦‍♂️", charAnim: "char-breathe" },
      { text: "店の修繕費は、探偵にツケておくことにしよう。\n【 ACTION END : 深夜の大立ち回り 】", char: "" }
  ],
  end_joke: [
      { speaker: "マスター(あなた)", text: "そんなことより占い師さん。\n私の明日の運勢を占ってください。", char: "🔮", charAnim: "char-breathe" },
      { speaker: "占い師", text: "えっ？ あ、はい。\n……『大吉』ね。金運が絶好調よ。", char: "😅🔮", charAnim: "char-breathe" },
      { speaker: "サラリーマン", text: "マスター！？ 私の帽子は！？", char: "💦👨‍💼", charAnim: "char-shake" },
      { speaker: "探偵の女", text: "ちょっとマスター！\n事件はどうなったのよ！！", char: "💢🕵️‍♀️", charAnim: "char-shake", effect: "shake" },
      { speaker: "マスター(あなた)", text: "大吉か……。\n明日は良いコーヒー豆が仕入れられそうだ。", char: "☕", charAnim: "char-breathe" },
      { text: "事件は未解決のまま、夜は更けていく……。\n【 JOKE END : マイペース・マスター 】", char: "" }
  ]
};

export default function CafeDetective() {
  const [currentScene, setCurrentScene] = useState<string>("start");
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);

  // テキストタイピング用
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // エフェクト用
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const typeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 現在のセリフデータを取得
  const currentLine = SCENARIO[currentScene]?.[currentLineIndex];

  // タイピングアニメーション（1文字ずつ表示する演出）
  const typeText = useCallback((fullText: string) => {
    setIsTyping(true);
    setDisplayedText("");
    let charIndex = 0;

    const typeNextChar = () => {
      if (charIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, charIndex + 1));
        charIndex++;
        typeTimeoutRef.current = setTimeout(typeNextChar, 50); // 1文字50ms
      } else {
        setIsTyping(false);
      }
    };

    typeNextChar();
  }, []);

  const initRef = useRef(false);

  // 初回マウント時のみ実行
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      if (SCENARIO["start"]?.[0]) {
        // 非同期で実行してeslintの警告を回避する
        setTimeout(() => {
           typeText(SCENARIO["start"][0].text);
        }, 0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // クリック時の進行処理
  const advanceText = () => {
    // 選択肢表示中はクリックで進めないようにする
    if (currentLine?.choices) return;

    if (isTyping) {
      // タイピング中なら一気に全文字表示する
      if (typeTimeoutRef.current) {
        clearTimeout(typeTimeoutRef.current);
      }
      setDisplayedText(currentLine?.text || "");
      setIsTyping(false);
    } else {
      // 次のセリフ、または次のシーンへ進む
      const sceneLines = SCENARIO[currentScene];
      let nextLine = null;
      if (currentLineIndex < sceneLines.length - 1) {
        setCurrentLineIndex(prev => prev + 1);
        nextLine = sceneLines[currentLineIndex + 1];
      } else if (currentLine?.nextScene) {
        setCurrentScene(currentLine.nextScene);
        setCurrentLineIndex(0);
        nextLine = SCENARIO[currentLine.nextScene]?.[0];
      }

      if (nextLine) {
        if (nextLine.effect === "shake") {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500); // 0.5秒後に元に戻す
        }
        typeText(nextLine.text);
      }
    }
  };

  // 選択肢を選んだときの処理
  const handleChoice = (targetScene: string) => {
    setCurrentScene(targetScene);
    setCurrentLineIndex(0);

    const nextLine = SCENARIO[targetScene]?.[0];
    if (nextLine) {
      if (nextLine.effect === "shake") {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500); // 0.5秒後に元に戻す
      }
      typeText(nextLine.text);
    }
  };

  // セリフがない場合は何も表示しない（エラー防止）
  if (!currentLine) return null;

  return (
    <div
      className={`relative w-full h-screen bg-[#1a1a1a] text-white font-serif overflow-hidden select-none flex items-center justify-center ${isShaking ? 'animate-[shake_0.5s]' : ''}`}
      onClick={advanceText}
    >
      <style>{`
        @keyframes slideUp {
            from { transform: translateY(80px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes breathe {
            0% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0); }
        }
        @keyframes shake {
            0% { transform: translate(1px, 1px) rotate(0deg); }
            10% { transform: translate(-1px, -2px) rotate(-1deg); }
            20% { transform: translate(-3px, 0px) rotate(1deg); }
            30% { transform: translate(3px, 2px) rotate(0deg); }
            40% { transform: translate(1px, -1px) rotate(1deg); }
            50% { transform: translate(-1px, 2px) rotate(-1deg); }
            60% { transform: translate(-3px, 1px) rotate(0deg); }
            70% { transform: translate(3px, 1px) rotate(-1deg); }
            80% { transform: translate(-1px, -1px) rotate(1deg); }
            90% { transform: translate(1px, 2px) rotate(0deg); }
            100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        .char-enter { animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .char-breathe { animation: breathe 3s infinite ease-in-out; }
        .char-shake { animation: shake 0.5s; }
      `}</style>

      {/* 背景エフェクト */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_#3a3a3a_0%,_#1a1a1a_80%)] opacity-50"></div>

      {/* 画面をスマホサイズに制限 */}
      <div className="relative w-full max-w-md h-full flex flex-col justify-end z-10 border-x border-gray-800 shadow-2xl">

        {/* キャラクター表示部 */}
        {currentLine.char && (
          <div className="flex justify-center items-end flex-grow mb-4 pointer-events-none">
             <div
               key={`${currentScene}-${currentLineIndex}`} // キーを変えることでアニメーションを再トリガー
               className={`text-9xl ${currentLine.charAnim || ''}`}
             >
               {currentLine.char}
             </div>
          </div>
        )}

        {/* 選択肢の表示 */}
        {currentLine.choices && !isTyping && (
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 flex flex-col gap-3 z-50">
             {currentLine.choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoice(choice.target);
                  }}
                  className="bg-gray-800/90 text-white border border-gray-600 rounded-lg p-3 text-center transition hover:bg-gray-700 hover:-translate-y-1 font-bold text-sm shadow-lg backdrop-blur-sm"
                >
                  {choice.label}
                </button>
             ))}
           </div>
        )}

        {/* テキストウィンドウ */}
        <div className="bg-black/80 backdrop-blur-md p-5 rounded-t-2xl border-t-2 border-gray-700 min-h-[220px] relative">
            {/* スピーカー名 */}
            {currentLine.speaker && (
                <div className="absolute -top-4 left-4 bg-gray-700/90 px-4 py-1 rounded-md text-sm font-bold tracking-wider shadow-md text-gray-200">
                    {currentLine.speaker}
                </div>
            )}

            {/* セリフ本文 */}
            <div className="text-lg leading-relaxed mt-2 whitespace-pre-wrap font-sans text-gray-100 min-h-[100px]">
                {displayedText}
            </div>

            {/* 次へ進むアイコン（タイピング完了＆選択肢無しの場合のみ表示） */}
            {!isTyping && !currentLine.choices && (
                <div className="absolute bottom-4 right-5 text-gray-400 animate-bounce">
                    ▼
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
