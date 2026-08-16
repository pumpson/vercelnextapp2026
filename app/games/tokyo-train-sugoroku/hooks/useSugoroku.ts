import { useState, useCallback, useEffect } from 'react';
import { MAP_DATA, Station } from '../data/mapData';

// ゲームのフェーズ
export type GamePhase =
  | 'player_dice'   // プレイヤーがサイコロを振る前
  | 'player_select_destination' // プレイヤーが到達可能な駅を選ぶフェーズ
  | 'player_animating' // 選択された駅へ自動移動している最中
  | 'player_action' // プレイヤーマスイベント（プラス・マイナス等）
  | 'cpu_dice'      // CPUがサイコロを振る前
  | 'cpu_move'      // CPU移動中 (アニメーションも兼ねる)
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

  // 到達可能な駅と、そこへのルートを保持するマップ
  const [playerRoutes, setPlayerRoutes] = useState<Map<string, string[]>>(new Map());

  // アニメーション用ステート
  const [currentAnimatingPath, setCurrentAnimatingPath] = useState<string[]>([]);
  const [animatingEntity, setAnimatingEntity] = useState<'player' | 'cpu' | null>(null);

  // ログメッセージ
  const [logs, setLogs] = useState<string[]>(['ゲームスタート！']);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, message]);
  }, []);

  // --- 移動ロジック（到達可能駅の算出） ---

  // ちょうど N 歩で到達できる駅のIDリストを算出する (DFS)
  // 戻り値は Map<到達駅ID, 到達駅までの経路(駅IDの配列)>
  const getReachableStations = useCallback((startStationId: string, steps: number): Map<string, string[]> => {
    const reachable = new Map<string, string[]>();

    const dfs = (currentId: string, prevId: string | null, currentSteps: number, path: string[]) => {
      const currentPath = [...path, currentId];

      if (currentSteps === steps) {
        // 同じ駅に複数ルートで到達できる場合、最初のルートを採用する（シンプル化のため）
        if (!reachable.has(currentId)) {
          reachable.set(currentId, currentPath);
        }
        return;
      }

      const station = MAP_DATA.find(s => s.id === currentId);
      if (!station) return;

      const nextCandidates = station.next.filter(id => id !== prevId);

      if (nextCandidates.length === 0 && prevId) {
        // 行き止まりの場合は引き返す
        dfs(prevId, currentId, currentSteps + 1, currentPath);
      } else {
        nextCandidates.forEach(nextId => {
          dfs(nextId, currentId, currentSteps + 1, currentPath);
        });
      }
    };

    dfs(startStationId, null, 0, []);
    return reachable;
  }, []);

  // 指定駅間の最短距離（ホップ数）をBFSで取得する
  const getDistanceBfs = useCallback((start: string, target: string): number => {
    if (start === target) return 0;

    const queue: { id: string, dist: number }[] = [{ id: start, dist: 0 }];
    const visited = new Set<string>();
    visited.add(start);

    while(queue.length > 0) {
        const current = queue.shift()!;
        if (current.id === target) return current.dist;

        const station = MAP_DATA.find(s => s.id === current.id);
        if (station) {
            for (const nextId of station.next) {
                if (!visited.has(nextId)) {
                    visited.add(nextId);
                    queue.push({ id: nextId, dist: current.dist + 1 });
                }
            }
        }
    }
    return Infinity;
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

    if (phase === 'player_dice') {
        // プレイヤーの場合は到達可能駅を算出
        const routes = getReachableStations(player.currentStationId, result);
        setPlayerRoutes(routes);
        addLog(`行きたい駅（光っている駅）をタップしてください。`);
        setPhase('player_select_destination');
    } else {
        // CPUのフェーズ移行はuseEffect内で行うためここでは何もしない
    }
  }, [phase, player.name, cpu.name, player.currentStationId, getReachableStations, addLog]);

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

  // --- プレイヤーの目的地選択 ---
  const movePlayerTo = useCallback((targetStationId: string) => {
    if (phase !== 'player_select_destination') return;

    const route = playerRoutes.get(targetStationId);
    if (!route) return;

    // アニメーション開始
    setPhase('player_animating');
    setAnimatingEntity('player');
    setCurrentAnimatingPath(route); // 最初の要素は現在地
  }, [phase, playerRoutes]);

  // --- アニメーション処理（プレイヤー・CPU共通） ---
  useEffect(() => {
    if ((phase !== 'player_animating' && phase !== 'cpu_move') || currentAnimatingPath.length === 0) return;

    if (currentAnimatingPath.length === 1) {
      // アニメーション完了（最後の駅に到着した）
      const finalStationId = currentAnimatingPath[0];
      const finalStation = MAP_DATA.find(s => s.id === finalStationId);

      const isPlayer = animatingEntity === 'player';

      // 通過での目的地到着チェックは一旦省き、最終到着駅でのみイベント判定を行う
      const arrived = checkDestination(finalStationId, isPlayer);
      if (!arrived && finalStation) {
        applyStationEffect(finalStation, isPlayer);
      }

      // フェーズを移行
      if (isPlayer) {
        setPhase('player_action');
      } else {
        setPhase('cpu_action');
      }

      setAnimatingEntity(null);
      setCurrentAnimatingPath([]);
      return;
    }

    const timerId = setTimeout(() => {
      const nextPath = [...currentAnimatingPath];
      nextPath.shift(); // 先頭（現在地）を削除
      const nextStationId = nextPath[0];

      // コマを進める
      if (animatingEntity === 'player') {
        setPlayer(p => ({ ...p, currentStationId: nextStationId }));
        // 通過駅での目的地到着チェック（桃鉄風：通過で到着）
        if (checkDestination(nextStationId, true)) {
           // 到着した場合、アニメーションを強制終了
           setPhase('player_action');
           setAnimatingEntity(null);
           setCurrentAnimatingPath([]);
           return;
        }
      } else if (animatingEntity === 'cpu') {
        setCpu(c => ({ ...c, currentStationId: nextStationId }));
        if (checkDestination(nextStationId, false)) {
           setPhase('cpu_action');
           setAnimatingEntity(null);
           setCurrentAnimatingPath([]);
           return;
        }
      }

      setCurrentAnimatingPath(nextPath);
      setRemainingMoves(nextPath.length - 1);
    }, 400); // 1マスあたりの移動時間(ms)

    return () => clearTimeout(timerId);
  }, [phase, currentAnimatingPath, animatingEntity, checkDestination, applyStationEffect]);


  // プレイヤー・CPUのマスイベント後、自動でターンを終了する
  useEffect(() => {
    if (phase === 'player_action' || phase === 'cpu_action') {
      const timer = setTimeout(() => {
        endTurn();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, endTurn]);

  // --- CPUロジック ---
  useEffect(() => {
    // CPUのターン開始（サイコロを振る）
    if (phase === 'cpu_dice') {
      const timer = setTimeout(() => {
        rollDice();
        setPhase('cpu_move');
      }, 1000);
      return () => clearTimeout(timer);
    }

    // サイコロを振った後、CPUのルートを決定してアニメーションを開始する
    if (phase === 'cpu_move' && animatingEntity === null && diceResult !== null) {
        // 出目の数だけ進んだ到達可能駅から、目的地に最も近い駅を選ぶ
        const reachableMap = getReachableStations(cpu.currentStationId, diceResult);
        let bestTarget = "";
        let minDistance = Infinity;
        let bestRoute: string[] = [];

        reachableMap.forEach((route, targetStationId) => {
            const dist = getDistanceBfs(targetStationId, destinationId);
            if (dist < minDistance) {
                minDistance = dist;
                bestTarget = targetStationId;
                bestRoute = route;
            }
        });

        // 経路が見つからない場合のフォールバック（通常ありえないが）
        if (bestRoute.length === 0 && reachableMap.size > 0) {
            const firstEntry = Array.from(reachableMap.entries())[0];
            bestRoute = firstEntry[1];
        }

        // アニメーション設定
        setAnimatingEntity('cpu');
        setCurrentAnimatingPath(bestRoute);
    }

  }, [phase, rollDice, diceResult, cpu.currentStationId, destinationId, animatingEntity, getReachableStations, getDistanceBfs]);

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
    selectableStations: phase === 'player_select_destination' ? Array.from(playerRoutes.keys()) : [],
    rollDice,
    movePlayerTo,
    setCpu,
    checkDestination,
    applyStationEffect,
    endTurn,
  };
}
