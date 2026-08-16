import { useState, useCallback, useEffect } from 'react';
import { MAP_DATA, Station } from '../data/mapData';

// ゲームのフェーズ
export type GamePhase =
  | 'player_dice'   // プレイヤーがサイコロを振る前
  | 'player_move'   // プレイヤー移動中（アニメーション等）
  | 'player_branch' // プレイヤー分岐選択待ち
  | 'player_action' // プレイヤーマスイベント（プラス・マイナス等）
  | 'cpu_dice'      // CPUがサイコロを振る前
  | 'cpu_move'      // CPU移動中
  | 'cpu_action'    // CPUマスイベント
  | 'month_end'     // 月末処理
  | 'game_over';    // ゲーム終了

export interface PlayerState {
  id: 'player' | 'cpu';
  name: string;
  money: number;
  currentStationId: string;
}

export function useSugoroku() {
  // --- 状態定義 ---

  // ターン・時間管理
  const [month, setMonth] = useState<number>(4); // 4月からスタート
  const [yearPassed, setYearPassed] = useState<number>(0);
  const MAX_YEARS = 1; // 1年（12ヶ月）で終了

  // フェーズ管理
  const [phase, setPhase] = useState<GamePhase>('player_dice');

  // プレイヤー状態
  const [player, setPlayer] = useState<PlayerState>({
    id: 'player',
    name: 'あなた',
    money: 1000, // 単位: 万円
    currentStationId: 'yamanote_24', // 東京駅からスタート
  });

  const [cpu, setCpu] = useState<PlayerState>({
    id: 'cpu',
    name: 'CPU',
    money: 1000,
    currentStationId: 'yamanote_8', // 新宿駅からスタート
  });

  // 目的地
  const [destinationId, setDestinationId] = useState<string>('');

  // サイコロの目と残り移動力
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [remainingMoves, setRemainingMoves] = useState<number>(0);

  // ログメッセージ
  const [logs, setLogs] = useState<string[]>(['ゲームスタート！']);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, message]);
  }, []);

  // --- 初期化処理 ---
  useEffect(() => {
    // 最初の目的地をランダムに決定
    const target = MAP_DATA[Math.floor(Math.random() * MAP_DATA.length)];
    setDestinationId(target.id);
    addLog(`最初の目的地は「${target.name}」です！`);
  }, [addLog]);

  // --- サイコロを振る ---
  const rollDice = useCallback(() => {
    if (phase !== 'player_dice' && phase !== 'cpu_dice') return;

    const result = Math.floor(Math.random() * 6) + 1;
    setDiceResult(result);
    setRemainingMoves(result);

    const currentPlayerName = phase === 'player_dice' ? player.name : cpu.name;
    addLog(`${currentPlayerName}はサイコロを振り、「${result}」が出た！`);

    // フェーズ移行
    setPhase(phase === 'player_dice' ? 'player_move' : 'cpu_move');
  }, [phase, player.name, cpu.name, addLog]);

  // --- 次のターン・月末処理へ ---
  const endTurn = useCallback(() => {
    if (phase.startsWith('player')) {
      setPhase('cpu_dice');
    } else if (phase.startsWith('cpu')) {
      setPhase('month_end');
    }
  }, [phase]);

  // --- 月末処理 ---
  useEffect(() => {
    if (phase === 'month_end') {
      let nextMonth = month + 1;
      let nextYearPassed = yearPassed;

      if (nextMonth > 12) {
        nextMonth = 1;
      }
      // 4月に戻ったら1年経過
      if (nextMonth === 4 && month !== 4) {
          nextYearPassed += 1;
      }

      if (nextYearPassed >= MAX_YEARS) {
        setPhase('game_over');
        addLog('1年が経過しました。ゲーム終了です！');
      } else {
        setMonth(nextMonth);
        setYearPassed(nextYearPassed);
        setPhase('player_dice');
        addLog(`--- ${nextMonth}月になりました ---`);
      }
    }
  }, [phase, month, yearPassed, addLog]);

  // --- 移動・マスイベント処理用のヘルパー ---
  const applyStationEffect = useCallback((station: Station, isPlayer: boolean) => {
    const amount = Math.floor(Math.random() * 50) + 10; // 10〜59万円

    if (station.type === 'plus') {
      addLog(`${isPlayer ? player.name : cpu.name}はプラス駅に止まった！ ${amount}万円もらった。`);
      if (isPlayer) {
        setPlayer(p => ({ ...p, money: p.money + amount }));
      } else {
        setCpu(c => ({ ...c, money: c.money + amount }));
      }
    } else if (station.type === 'minus') {
      addLog(`${isPlayer ? player.name : cpu.name}はマイナス駅に止まった... ${amount}万円失った。`);
      if (isPlayer) {
        setPlayer(p => ({ ...p, money: p.money - amount }));
      } else {
        setCpu(c => ({ ...c, money: c.money - amount }));
      }
    } else {
      addLog(`${isPlayer ? player.name : cpu.name}は駅に止まった。何も起きなかった。`);
    }
  }, [player.name, cpu.name, addLog]);

  const checkDestination = useCallback((stationId: string, isPlayer: boolean) => {
    if (stationId === destinationId) {
      const reward = 500; // 到着報酬
      addLog(`🎊 ${isPlayer ? player.name : cpu.name}が目的地に到着！ 援助金${reward}万円を獲得！ 🎊`);

      if (isPlayer) {
        setPlayer(p => ({ ...p, money: p.money + reward }));
      } else {
        setCpu(c => ({ ...c, money: c.money + reward }));
      }

      // 新しい目的地を設定
      let newTarget;
      do {
        newTarget = MAP_DATA[Math.floor(Math.random() * MAP_DATA.length)];
      } while (newTarget.id === destinationId);

      setDestinationId(newTarget.id);
      addLog(`新しい目的地は「${newTarget.name}」です！`);
      return true; // 到着した
    }
    return false;
  }, [destinationId, player.name, cpu.name, addLog]);

  // --- プレイヤーの移動指示 ---
  const movePlayerTo = useCallback((nextStationId: string) => {
    if (phase !== 'player_move' && phase !== 'player_branch') return;

    const nextStation = MAP_DATA.find(s => s.id === nextStationId);
    if (!nextStation) return;

    setPlayer(p => ({ ...p, currentStationId: nextStationId }));
    const nextMoves = remainingMoves - 1;
    setRemainingMoves(nextMoves);

    // 目的地にピッタリ到着したか、または通過したか（今回は「ピッタリ到着」か「通過でも到着扱い」かは簡略化のため「到着マスに止まったら」もしくは「通過したら」とする）
    // 桃鉄風ならピッタリじゃなくても到着扱いで良いことが多いので、通過で到着にする。
    const arrived = checkDestination(nextStationId, true);

    if (arrived) {
      // 到着したら残りの移動力を0にしてターン終了処理へ
      setRemainingMoves(0);
      setPhase('player_action');
      return;
    }

    if (nextMoves === 0) {
      // 移動終了
      setPhase('player_action');
      applyStationEffect(nextStation, true);
    } else {
      // まだ移動できる場合、次の隣接駅をチェック
      const nextNextOptions = nextStation.next;

      // 直前にいた駅に戻るのを防ぐロジックが必要だが、ここでは一旦単純化して
      // 「隣接駅が2つより多ければ分岐」とする。
      // より厳密には、前回の駅(prevStation)を記録して選択肢から外すべきだが、
      // 最初のプロトタイプなので分岐が発生したらプレイヤーに選ばせる。
      if (nextNextOptions.length > 2) {
        setPhase('player_branch');
      } else {
        setPhase('player_move');
      }
    }
  }, [phase, remainingMoves, checkDestination, applyStationEffect]);

  // マスイベント終了後の確認（OKボタンなどでターンを終了する）
  const finishPlayerAction = useCallback(() => {
    if (phase === 'player_action') {
      endTurn();
    }
  }, [phase, endTurn]);

  // --- CPUロジック ---
  useEffect(() => {
    // CPUのターン開始（サイコロを振る）
    if (phase === 'cpu_dice') {
      const timer = setTimeout(() => {
        rollDice();
      }, 1000);
      return () => clearTimeout(timer);
    }

    // CPUの移動処理
    if (phase === 'cpu_move') {
      if (remainingMoves <= 0) return;

      const timer = setTimeout(() => {
        const currentStation = MAP_DATA.find(s => s.id === cpu.currentStationId);
        if (!currentStation) return;

        // BFSで目的地までの最短経路を探す
        // シンプルなBFS（コスト1）
        const queue: { id: string; path: string[] }[] = [{ id: currentStation.id, path: [] }];
        const visited = new Set<string>();
        visited.add(currentStation.id);

        let bestNextStationId = currentStation.next[0]; // デフォルトは適当な隣接駅
        let foundPath = false;

        while (queue.length > 0) {
          const { id, path } = queue.shift()!;

          if (id === destinationId) {
            if (path.length > 0) {
              bestNextStationId = path[0];
              foundPath = true;
            }
            break;
          }

          const node = MAP_DATA.find(s => s.id === id);
          if (node) {
            for (const nextId of node.next) {
              if (!visited.has(nextId)) {
                visited.add(nextId);
                queue.push({ id: nextId, path: [...path, nextId] });
              }
            }
          }
        }

        // もし経路が見つからなかった場合（通常あり得ないが）、ランダムに選ぶ
        if (!foundPath) {
          const validNexts = currentStation.next; // 今回は直前の駅を記憶していないのでランダムでよい
          bestNextStationId = validNexts[Math.floor(Math.random() * validNexts.length)];
        }

        // 移動を実行
        setCpu(c => ({ ...c, currentStationId: bestNextStationId }));
        const nextMoves = remainingMoves - 1;
        setRemainingMoves(nextMoves);

        const arrived = checkDestination(bestNextStationId, false);

        if (arrived) {
          setRemainingMoves(0);
          setPhase('cpu_action');
        } else if (nextMoves === 0) {
          const nextStation = MAP_DATA.find(s => s.id === bestNextStationId);
          if (nextStation) applyStationEffect(nextStation, false);
          setPhase('cpu_action');
        }
      }, 800); // 1マス0.8秒で移動
      return () => clearTimeout(timer);
    }

    // CPUのイベント処理後、ターン終了へ
    if (phase === 'cpu_action') {
      const timer = setTimeout(() => {
        endTurn();
      }, 1500);
      return () => clearTimeout(timer);
    }

  }, [phase, rollDice, remainingMoves, cpu.currentStationId, destinationId, checkDestination, applyStationEffect, endTurn]);

  // ----------------------------------------------------------------------
  // 外部に公開するインターフェース
  return {
    month,
    yearPassed,
    phase,
    player,
    cpu,
    destinationId,
    diceResult,
    remainingMoves,
    logs,
    rollDice,
    movePlayerTo,
    finishPlayerAction,
    setPhase, // CPUロジック等で外部から変更できるように
    setRemainingMoves,
    setCpu,
    checkDestination,
    applyStationEffect,
    endTurn,
  };
}
