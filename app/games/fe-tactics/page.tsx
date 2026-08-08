"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, RefreshCw, Hand, ShieldAlert, Swords } from 'lucide-react';

// === Types ===
type JobId = 'fighter' | 'mage' | 'archer' | 'knight' | 'cleric';
type FormationType = 'vanguard' | 'rear' | 'scatter';

interface Job {
    id: JobId; name: string; emoji: string;
    hp: number; atk: number; def: number; res: number; spd: number; mov: number; rng: number;
    color: string; desc: string;
}

interface Unit {
    id: string; isPlayer: boolean; x: number; y: number; job: Job;
    hp: number; maxHp: number; isDead: boolean; startX: number; startY: number;
}

// === Constants ===
const ROWS = 6;
const COLS = 7;
const SLEEP_MS = 600;

const JOBS: Record<JobId, Job> = {
    fighter: { id: 'fighter', name: '戦士', emoji: '⚔️', hp: 30, atk: 12, def: 8, res: 3, spd: 7, mov: 3, rng: 1, color: 'bg-red-500', desc: '近接物理。バランスが良い。' },
    mage:    { id: 'mage', name: '魔道士', emoji: '🔥', hp: 20, atk: 14, def: 3, res: 10, spd: 8, mov: 2, rng: 2, color: 'bg-purple-500', desc: '遠距離魔法。防御は低い。' },
    archer:  { id: 'archer', name: '弓兵', emoji: '🏹', hp: 22, atk: 10, def: 5, res: 4, spd: 9, mov: 2, rng: 2, color: 'bg-green-500', desc: '遠距離物理。魔道士に強い。' },
    knight:  { id: 'knight', name: '重騎士', emoji: '🛡️', hp: 40, atk: 10, def: 15, res: 1, spd: 2, mov: 2, rng: 1, color: 'bg-blue-500', desc: '高HP・高防御の壁役。魔法に弱い。' },
    cleric:  { id: 'cleric', name: '僧侶', emoji: '✨', hp: 24, atk: 8, def: 4, res: 12, spd: 6, mov: 2, rng: 2, color: 'bg-yellow-400', desc: '味方のHPを回復する(AIのみ)。' }
};

const ENEMY_PATTERNS = [
    [{job:'fighter', x:1, y:0}, {job:'fighter', x:3, y:0}, {job:'fighter', x:5, y:0}, {job:'mage', x:2, y:1}, {job:'archer', x:4, y:1}],
    [{job:'knight', x:2, y:0}, {job:'knight', x:4, y:0}, {job:'mage', x:3, y:1}, {job:'cleric', x:3, y:2}],
    [{job:'archer', x:1, y:0}, {job:'archer', x:3, y:0}, {job:'archer', x:5, y:0}, {job:'fighter', x:3, y:1}]
];

// === Helper ===
function getDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function FETacticsGame() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [stage, setStage] = useState(1);
    const [logs, setLogs] = useState<{msg: string, imp: boolean}[]>([]);
    const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
    const [damageEffects, setDamageEffects] = useState<{id: string, x: number, y: number, text: string, type: string}[]>([]);

    // Player Setup State
    const [playerRoster, setPlayerRoster] = useState<JobId[]>(['fighter', 'mage', 'knight', 'cleric']);
    const [formation, setFormation] = useState<FormationType>('vanguard');
    const [isSetupPhase, setIsSetupPhase] = useState(true);

    const logsEndRef = useRef<HTMLDivElement>(null);
    const isPlayingRef = useRef(false); // Ref to break loops safely
    const unitsRef = useRef<Unit[]>([]); // Ref to hold latest state for async AI loop

    useEffect(() => {
        unitsRef.current = units;
    }, [units]);

    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (msg: string, imp = false) => {
        setLogs(prev => [...prev, {msg, imp}]);
    };

    const showEffect = (unit: Unit, text: string, type: string) => {
        const id = Math.random().toString();
        setDamageEffects(prev => [...prev, {id, x: unit.x, y: unit.y, text, type}]);
        setTimeout(() => {
            setDamageEffects(prev => prev.filter(e => e.id !== id));
        }, 1000);
    };

    const applyFormation = (roster: JobId[], form: FormationType): Unit[] => {
        let pUnits: Unit[] = [];
        const createU = (j: JobId, dx: number, dy: number, isP: boolean) => ({
            id: `p_${Math.random()}`, isPlayer: isP, x: dx, y: dy, startX: dx, startY: dy,
            job: JOBS[j], hp: JOBS[j].hp, maxHp: JOBS[j].hp, isDead: false
        });

        if (form === 'vanguard') { // 前衛集中 (y=4,5)
            const coords = [[2,4], [3,4], [4,4], [3,5], [2,5], [4,5]];
            roster.forEach((job, i) => { if(i < coords.length) pUnits.push(createU(job, coords[i][0], coords[i][1], true)); });
        } else if (form === 'rear') { // 後衛集中 (y=5)
            const coords = [[1,5], [2,5], [3,5], [4,5], [5,5], [3,4]];
            roster.forEach((job, i) => { if(i < coords.length) pUnits.push(createU(job, coords[i][0], coords[i][1], true)); });
        } else if (form === 'scatter') { // 分散
            const coords = [[1,4], [3,4], [5,4], [2,5], [4,5], [0,5]];
            roster.forEach((job, i) => { if(i < coords.length) pUnits.push(createU(job, coords[i][0], coords[i][1], true)); });
        }
        return pUnits;
    };

    const initStage = (stg: number) => {
        const pUnits = applyFormation(playerRoster, formation);
        let eUnits: Unit[] = [];
        const pattern = ENEMY_PATTERNS[(stg - 1) % ENEMY_PATTERNS.length];

        pattern.forEach((e, i) => {
            let j = JOBS[e.job as JobId];
            // ステージバフ
            let buff = (stg - 1) * 2;
            let finalJob = {...j, hp: j.hp + buff*2, atk: j.atk + buff};
            eUnits.push({
                id: `e_${i}`, isPlayer: false, x: e.x, y: e.y, startX: e.x, startY: e.y,
                job: finalJob, hp: finalJob.hp, maxHp: finalJob.hp, isDead: false
            });
        });

        setUnits([...pUnits, ...eUnits]);
        setLogs([]);
        addLog(`=== STAGE ${stg} ===`, true);
        setIsSetupPhase(true);
        setIsPlaying(false);
        isPlayingRef.current = false;
        setActiveUnitId(null);
    };

    useEffect(() => {
        // Initial setup effect
        if (isSetupPhase && !isPlaying) {
            const pUnits = applyFormation(playerRoster, formation);
            setUnits(prev => {
                const eUnits = prev.filter(u => !u.isPlayer);
                return [...pUnits, ...eUnits.length > 0 ? eUnits : []];
            });
        }
    }, [playerRoster, formation]);

    useEffect(() => {
        // Run once on mount to set enemy units
        initStage(1);
    }, []);

    // --- Roster Management ---
    const addClass = (jobId: JobId) => {
        if(playerRoster.length < 5) setPlayerRoster([...playerRoster, jobId]);
    };
    const removeClass = (idx: number) => {
        if(playerRoster.length > 1) {
            let n = [...playerRoster]; n.splice(idx, 1); setPlayerRoster(n);
        }
    };

    // --- AI Logic ---
    const getMoveArea = (unit: Unit, allUnits: Unit[]) => {
        let visited = new Set<string>();
        let queue = [{x: unit.x, y: unit.y, dist: 0}];
        visited.add(`${unit.x},${unit.y}`);
        let area = [{x: unit.x, y: unit.y}];

        while (queue.length > 0) {
            let curr = queue.shift()!;
            if (curr.dist >= unit.job.mov) continue;
            let dirs = [[1,0], [-1,0], [0,1], [0,-1]];
            for (let [dx, dy] of dirs) {
                let nx = curr.x + dx, ny = curr.y + dy;
                if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
                    let key = `${nx},${ny}`;
                    if (!visited.has(key) && !allUnits.find(u => u.x === nx && u.y === ny && !u.isDead)) {
                        visited.add(key);
                        queue.push({x: nx, y: ny, dist: curr.dist + 1});
                        area.push({x: nx, y: ny});
                    }
                }
            }
        }
        return area;
    };

    const updateUnit = (id: string, partial: Partial<Unit>) => {
        setUnits(prev => prev.map(u => u.id === id ? { ...u, ...partial } : u));
        // Also update ref immediately for logic to use in same tick
        unitsRef.current = unitsRef.current.map(u => u.id === id ? { ...u, ...partial } : u);
    };

    const executeAITurn = async (unitId: string) => {
        if (!isPlayingRef.current) return;
        let u = unitsRef.current.find(u => u.id === unitId);
        if (!u || u.isDead) return;

        setActiveUnitId(u.id);
        await sleep(SLEEP_MS / 2);

        u = unitsRef.current.find(u => u.id === unitId)!; // refresh
        if (u.isDead || !isPlayingRef.current) return;

        let curUnits = unitsRef.current;
        let friends = curUnits.filter(x => x.isPlayer === u!.isPlayer && !x.isDead);
        let enemies = curUnits.filter(x => x.isPlayer !== u!.isPlayer && !x.isDead);

        if (enemies.length === 0) return;

        // Healing Logic
        if (u.job.id === 'cleric') {
            let hurtFriends = friends.filter(f => f.hp < f.maxHp);
            if (hurtFriends.length > 0) {
                let target = hurtFriends.sort((a,b) => a.hp - b.hp)[0]; // Lowest HP
                let area = getMoveArea(u, curUnits);
                let bestMove = {x: u.x, y: u.y};
                let minTDist = Infinity;

                for (let pos of area) {
                    let d = getDistance(pos.x, pos.y, target.x, target.y);
                    if (d <= u.job.rng && d < minTDist) {
                        minTDist = d; bestMove = pos;
                    }
                }

                if (minTDist <= u.job.rng) {
                    updateUnit(u.id, {x: bestMove.x, y: bestMove.y});
                    addLog(`${u.job.name} は移動した。`);
                    await sleep(SLEEP_MS);

                    let heal = u.job.atk + Math.floor(Math.random()*3);
                    let newHp = Math.min(target.maxHp, target.hp + heal);
                    updateUnit(target.id, { hp: newHp });
                    showEffect(target, `+${heal}`, 'text-green-400');
                    addLog(`${u.job.name} のヒール！ ${target.job.name}を ${heal} 回復！`);
                    await sleep(SLEEP_MS);
                    setActiveUnitId(null);
                    return;
                }
            }
        }

        // Attack Logic
        let target = enemies.sort((a,b) => getDistance(u!.x, u!.y, a.x, a.y) - getDistance(u!.x, u!.y, b.x, b.y))[0];
        let area = getMoveArea(u, curUnits);
        let bestMove = {x: u.x, y: u.y};
        let minTDist = Infinity;

        // Try to attack
        for (let pos of area) {
            let d = getDistance(pos.x, pos.y, target.x, target.y);
            if (d <= u.job.rng && d < minTDist) {
                minTDist = d; bestMove = pos;
            }
        }

        // Move closer if cannot attack
        if (minTDist > u.job.rng) {
            for (let pos of area) {
                let d = getDistance(pos.x, pos.y, target.x, target.y);
                if (d < minTDist) {
                    minTDist = d; bestMove = pos;
                }
            }
        }

        if (bestMove.x !== u.x || bestMove.y !== u.y) {
            updateUnit(u.id, {x: bestMove.x, y: bestMove.y});
            addLog(`${u.job.name} は移動した。`);
            await sleep(SLEEP_MS);
            u = unitsRef.current.find(x => x.id === unitId)!;
        }

        let distToTarget = getDistance(u.x, u.y, target.x, target.y);
        if (distToTarget <= u.job.rng) {
            // Combat calculation
            let isMagic = u.job.id === 'mage' || u.job.id === 'cleric';
            let defStat = isMagic ? target.job.res : target.job.def;
            let dmg = Math.max(0, u.job.atk - defStat) + Math.floor(Math.random()*3);

            // Job advantage
            if (u.job.id === 'archer' && target.job.id === 'mage') dmg = Math.floor(dmg * 1.5);
            if (u.job.id === 'mage' && target.job.id === 'knight') dmg = Math.floor(dmg * 1.5);

            if (dmg <= 0) dmg = 1;

            let newHp = target.hp - dmg;
            let died = newHp <= 0;

            updateUnit(target.id, { hp: died ? 0 : newHp, isDead: died });
            showEffect(target, `-${dmg}`, 'text-red-400 font-bold text-xl');
            addLog(`${u.job.name} の攻撃！ ${target.job.name} に ${dmg} ダメージ！`);

            if (died) {
                addLog(`☠️ ${target.job.name} は倒れた！`, true);
            }
            await sleep(SLEEP_MS);
        }

        setActiveUnitId(null);
    };

    const startGameLoop = async () => {
        setIsPlaying(true);
        setIsSetupPhase(false);
        isPlayingRef.current = true;

        while (isPlayingRef.current) {
            let activeUnits = unitsRef.current.filter(u => !u.isDead);
            // Sort by Speed
            activeUnits.sort((a,b) => b.job.spd - a.job.spd);

            for (let unit of activeUnits) {
                if (!isPlayingRef.current) break;
                await executeAITurn(unit.id);
                await sleep(100); // tiny buffer

                let cur = unitsRef.current;
                let pAlive = cur.filter(x => x.isPlayer && !x.isDead).length;
                let eAlive = cur.filter(x => !x.isPlayer && !x.isDead).length;

                if (pAlive === 0 || eAlive === 0) {
                    isPlayingRef.current = false;
                    setIsPlaying(false);
                    if (pAlive === 0) {
                        addLog('>>> 敗北...部隊は全滅した。', true);
                    } else {
                        addLog('>>> 勝利！敵を殲滅した！', true);
                        await sleep(1000);
                        setStage(s => s + 1);
                        initStage(stage + 1);
                    }
                    break;
                }
            }
        }
    };

    const stopGame = () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
    };

    const resetStage = () => {
        stopGame();
        initStage(stage);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center">
            {/* Header / Nav */}
            <div className="w-full max-w-lg p-4 flex items-center justify-between">
                <Link href="/games" className="flex items-center text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5 mr-1" /> 一覧へ
                </Link>
                <div className="font-bold text-xl tracking-wider text-blue-400">
                    STAGE {stage}
                </div>
            </div>

            <div className="w-full max-w-lg flex-1 flex flex-col gap-4 px-2 pb-4">

                {/* Board Area */}
                <div className="bg-slate-700 p-1 rounded-xl shadow-2xl border-4 border-slate-600">
                    <div
                        className="grid gap-[2px] bg-slate-800"
                        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
                    >
                        {Array.from({length: ROWS * COLS}).map((_, idx) => {
                            const x = idx % COLS;
                            const y = Math.floor(idx / COLS);
                            const unit = units.find(u => u.x === x && u.y === y && !u.isDead);
                            const isActive = activeUnitId === unit?.id;
                            const effects = damageEffects.filter(e => e.x === x && e.y === y);

                            return (
                                <div key={idx} className="aspect-square bg-slate-600 relative flex items-center justify-center">
                                    {/* Checker pattern logic inside cell optional, plain looks fine too */}
                                    {unit && (
                                        <div className={`w-[85%] h-[85%] rounded-full flex flex-col items-center justify-center shadow-lg transition-transform duration-300 relative ${unit.job.color} ${isActive ? 'scale-110 ring-4 ring-white z-10' : ''} ${unit.isPlayer ? 'border-2 border-blue-200' : 'border-2 border-red-900 brightness-75'}`}>
                                            <span className="text-xl md:text-2xl drop-shadow-md">{unit.job.emoji}</span>

                                            {/* HP Bar */}
                                            <div className="absolute -bottom-1 w-3/4 h-1.5 bg-black/50 rounded overflow-hidden">
                                                <div
                                                    className={`h-full ${unit.isPlayer ? 'bg-green-400' : 'bg-red-500'}`}
                                                    style={{width: `${(unit.hp/unit.maxHp)*100}%`}}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Damage Effects */}
                                    {effects.map(e => (
                                        <div key={e.id} className={`absolute z-20 font-black animate-[slideUp_1s_ease-out_forwards] ${e.type}`} style={{ textShadow: '0 0 4px black' }}>
                                            {e.text}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Setup & Control Panel */}
                <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
                    {isSetupPhase ? (
                        <div className="space-y-4">
                            <h3 className="font-bold text-center border-b border-slate-700 pb-2 text-blue-300">編成フェイズ</h3>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-400 block mb-1">陣形を選択:</label>
                                    <select
                                        value={formation}
                                        onChange={(e) => setFormation(e.target.value as FormationType)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="vanguard">前衛集中陣 (突撃)</option>
                                        <option value="rear">後衛集中陣 (防衛)</option>
                                        <option value="scatter">分散陣 (バランス)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">部隊 (最大5人):</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {playerRoster.map((job, idx) => (
                                        <div key={idx} onClick={() => removeClass(idx)} className="cursor-pointer bg-slate-700 hover:bg-red-900/50 px-3 py-1 rounded-full text-sm border border-slate-600 flex items-center gap-1 transition-colors">
                                            {JOBS[job].emoji} {JOBS[job].name} <span className="text-red-400 ml-1 text-xs">x</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 flex-wrap border-t border-slate-700 pt-2">
                                    {(Object.keys(JOBS) as JobId[]).map(key => (
                                        <button
                                            key={key}
                                            onClick={() => addClass(key)}
                                            disabled={playerRoster.length >= 5}
                                            className="bg-slate-900 hover:bg-slate-700 disabled:opacity-50 px-2 py-1 rounded text-sm border border-slate-700 flex items-center gap-1 transition-colors"
                                        >
                                            {JOBS[key].emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={startGameLoop}
                                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                <Play size={20} /> 戦闘開始 (オート)
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {isPlaying ? (
                                <button
                                    onClick={stopGame}
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Hand size={20} /> 停止
                                </button>
                            ) : (
                                <button
                                    onClick={startGameLoop}
                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Play size={20} /> 再開
                                </button>
                            )}
                            <button
                                onClick={resetStage}
                                className="px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg shadow flex items-center justify-center active:scale-95"
                            >
                                <RefreshCw size={20} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Log Panel */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 h-40 overflow-y-auto text-sm shadow-inner font-mono flex-1 min-h-[150px]">
                    {logs.map((log, i) => (
                        <div key={i} className={`mb-1 ${log.imp ? 'text-yellow-300 font-bold' : 'text-slate-400'}`}>
                            {log.msg}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideUp {
                    0% { transform: translateY(0); opacity: 1; }
                    100% { transform: translateY(-20px); opacity: 0; }
                }
            `}} />
        </div>
    );
}
