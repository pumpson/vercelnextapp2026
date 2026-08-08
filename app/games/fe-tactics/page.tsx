"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, RefreshCw, Hand, ShieldAlert, Swords } from 'lucide-react';

// === Types ===
type JobId = 'fighter' | 'mage' | 'archer' | 'knight' | 'cleric' | 'assassin' | 'cavalry' | 'droid';
type FormationType = 'vanguard' | 'rear' | 'scatter';
type StatType = 'hp' | 'atk' | 'def' | 'res' | 'spd';

interface Job {
    id: JobId; name: string; emoji: string;
    hp: number; atk: number; def: number; res: number; spd: number; mov: number;
    rangeMods: number[]; // 距離1, 2, 3, 4, 5 に対応する威力補正（0〜10）
    color: string; desc: string;
}

interface Weapon {
    id: string; name: string; cost: number;
    atkBonus: number; critBonus: number;
}

interface Skill {
    id: string; name: string; cost: number;
    desc: string;
}

// ユニットの個別のカスタマイズ状態（プレイヤー用）
interface UnitBuild {
    addedStats: Record<StatType, number>; // 各ステータスの強化段階(0,1,2...)
    weaponId: string;
    skillId: string;
}

interface Unit {
    id: string; isPlayer: boolean; x: number; y: number; job: Job;
    hp: number; maxHp: number; isDead: boolean; startX: number; startY: number;

    // 戦闘開始時に計算された最終ステータス（ベース＋強化＋装備）
    finalStats: {
        hp: number; atk: number; def: number; res: number; spd: number;
        critRate: number; // 必殺率(%)
    };
    build?: UnitBuild; // プレイヤーユニットのみ保持
    ct: number; // チャージタイム（0になると行動）
    droidState?: number; // ドロイド専用：現在の行動パターン(0=特殊銃, 1=魔法, 2=近接)
}

// === Constants ===
const ROWS = 9;
const COLS = 11;
const SLEEP_MS = 600;

// ダメージ補正配列（index 0 が 距離1。0=攻撃不可, 10=100%）
const MOD_MELEE = [10, 0, 0, 0, 0, 0, 0];
const MOD_BOW   = [2, 10, 3, 0, 0, 0, 0];
const MOD_MAGIC = [1, 3, 10, 0, 0, 0, 0];
const MOD_GUN   = [2, 2, 2, 10, 3, 0, 0];
const MOD_HEAL  = [0, 10, 5, 0, 0, 0, 0]; // 僧侶用

const JOBS: Record<JobId, Job> = {
    fighter: { id: 'fighter', name: '戦士', emoji: '⚔️', hp: 40, atk: 12, def: 8, res: 3, spd: 10, mov: 3, rangeMods: MOD_MELEE, color: 'bg-red-500', desc: '近接。すべての基準。' },
    knight:  { id: 'knight', name: '重騎士', emoji: '🛡️', hp: 60, atk: 10, def: 18, res: 6, spd: 5, mov: 2, rangeMods: MOD_MELEE, color: 'bg-blue-500', desc: '高耐久。非常に遅い。' },
    assassin:{ id: 'assassin', name: '暗殺者', emoji: '🗡️', hp: 25, atk: 14, def: 3, res: 2, spd: 18, mov: 4, rangeMods: MOD_MELEE, color: 'bg-slate-700', desc: '手数が多く機動力に優れるが脆い。' },
    archer:  { id: 'archer', name: '弓兵', emoji: '🏹', hp: 30, atk: 10, def: 4, res: 5, spd: 12, mov: 3, rangeMods: MOD_BOW, color: 'bg-green-500', desc: '中距離適正。やや速い。' },
    mage:    { id: 'mage', name: '魔道士', emoji: '🔥', hp: 22, atk: 15, def: 2, res: 12, spd: 6, mov: 2, rangeMods: MOD_MAGIC, color: 'bg-purple-500', desc: '遠距離適正。脆くて遅い。' },
    cleric:  { id: 'cleric', name: '僧侶', emoji: '✨', hp: 28, atk: 8, def: 4, res: 12, spd: 9, mov: 2, rangeMods: MOD_HEAL, color: 'bg-yellow-400', desc: '味方のHPを回復する(AIのみ)。' },
    cavalry: { id: 'cavalry', name: '騎兵', emoji: '🐎', hp: 45, atk: 13, def: 10, res: 5, spd: 11, mov: 5, rangeMods: MOD_MELEE, color: 'bg-orange-600', desc: '【敵専用】非常に高い機動力を持つ。' },
    droid:   { id: 'droid', name: 'ドロイド', emoji: '🤖', hp: 80, atk: 16, def: 12, res: 10, spd: 7, mov: 2, rangeMods: MOD_MELEE, color: 'bg-zinc-500', desc: '【敵専用】特殊なAIで3種の攻撃を切り替える。' }
};

const WEAPONS: Weapon[] = [
    { id: 'iron', name: '鉄の武器', cost: 0, atkBonus: 0, critBonus: 0 },
    { id: 'steel', name: '鋼の武器', cost: 5, atkBonus: 3, critBonus: 0 },
    { id: 'killer', name: 'キラー武器', cost: 10, atkBonus: 1, critBonus: 20 },
    { id: 'silver', name: '銀の武器', cost: 15, atkBonus: 6, critBonus: 0 },
];

const SKILLS: Skill[] = [
    { id: 'none', name: 'なし', cost: 0, desc: 'スキルを持たない' },
    { id: 'regen', name: '自己再生', cost: 10, desc: '自ターン開始時、HPが少し回復する' },
    { id: 'bulwark', name: '鉄壁', cost: 15, desc: '防御・魔防+5、速度-3' },
    { id: 'deathblow', name: '必殺覚醒', cost: 12, desc: '必殺率+15%' },
];

const ENEMY_PATTERNS = [
    [{job:'fighter', x:3, y:0}, {job:'fighter', x:7, y:0}, {job:'mage', x:5, y:1}, {job:'archer', x:2, y:1}, {job:'archer', x:8, y:1}],
    [{job:'knight', x:4, y:0}, {job:'knight', x:6, y:0}, {job:'mage', x:5, y:1}, {job:'cleric', x:5, y:2}, {job:'cavalry', x:1, y:1}, {job:'cavalry', x:9, y:1}],
    [{job:'assassin', x:2, y:0}, {job:'assassin', x:8, y:0}, {job:'archer', x:4, y:0}, {job:'archer', x:6, y:0}, {job:'fighter', x:5, y:1}],
    [{job:'knight', x:3, y:0}, {job:'knight', x:7, y:0}, {job:'droid', x:5, y:1}, {job:'cleric', x:4, y:2}, {job:'cleric', x:6, y:2}],
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
    const [playerBuilds, setPlayerBuilds] = useState<UnitBuild[]>([
        { addedStats: { hp: 0, atk: 0, def: 0, res: 0, spd: 0 }, weaponId: 'iron', skillId: 'none' },
        { addedStats: { hp: 0, atk: 0, def: 0, res: 0, spd: 0 }, weaponId: 'iron', skillId: 'none' },
        { addedStats: { hp: 0, atk: 0, def: 0, res: 0, spd: 0 }, weaponId: 'iron', skillId: 'none' },
        { addedStats: { hp: 0, atk: 0, def: 0, res: 0, spd: 0 }, weaponId: 'iron', skillId: 'none' },
    ]);
    const [formation, setFormation] = useState<FormationType>('vanguard');
    const [isSetupPhase, setIsSetupPhase] = useState(true);

    // UI State for Setup
    const [editingUnitIdx, setEditingUnitIdx] = useState<number>(0);

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
        setLogs(prev => [{msg, imp}, ...prev]); // 常に先頭に追加（上が最新）
    };

    const showEffect = (unit: Unit, text: string, type: string) => {
        const id = Math.random().toString();
        setDamageEffects(prev => [...prev, {id, x: unit.x, y: unit.y, text, type}]);
        setTimeout(() => {
            setDamageEffects(prev => prev.filter(e => e.id !== id));
        }, 1000);
    };

    const calculateCost = (stageCount: number) => {
        // ステータス上昇段階に応じた累加コスト (1段階なら1, 2段階なら3, 3段階なら6, 4段階なら10...)
        return (stageCount * (stageCount + 1)) / 2;
    };

    const getTotalCost = () => {
        let total = 0;
        playerBuilds.forEach(build => {
            Object.values(build.addedStats).forEach(st => total += calculateCost(st));
            total += WEAPONS.find(w => w.id === build.weaponId)?.cost || 0;
            total += SKILLS.find(s => s.id === build.skillId)?.cost || 0;
        });
        return total;
    };

    const getFinalStats = (job: Job, build?: UnitBuild, isEnemy: boolean = false, enemyBuff: number = 0) => {
        if (isEnemy) {
            return {
                hp: job.hp + enemyBuff * 2,
                atk: job.atk + enemyBuff,
                def: job.def + Math.floor(enemyBuff/2),
                res: job.res + Math.floor(enemyBuff/2),
                spd: job.spd + Math.floor(enemyBuff/2),
                critRate: 5
            };
        }

        if (!build) return { hp: job.hp, atk: job.atk, def: job.def, res: job.res, spd: job.spd, critRate: 5 };

        const weapon = WEAPONS.find(w => w.id === build.weaponId)!;
        const skill = SKILLS.find(s => s.id === build.skillId)!;

        let fHp = job.hp + build.addedStats.hp * 5;
        let fAtk = job.atk + build.addedStats.atk + weapon.atkBonus;
        let fDef = job.def + build.addedStats.def;
        let fRes = job.res + build.addedStats.res;
        let fSpd = job.spd + build.addedStats.spd;
        let fCrit = 5 + weapon.critBonus;

        if (skill.id === 'bulwark') { fDef += 5; fRes += 5; fSpd -= 3; }
        if (skill.id === 'deathblow') { fCrit += 15; }

        return { hp: fHp, atk: fAtk, def: fDef, res: fRes, spd: fSpd, critRate: fCrit };
    };

    const applyFormation = (roster: JobId[], builds: UnitBuild[], form: FormationType): Unit[] => {
        let pUnits: Unit[] = [];
        const createU = (j: JobId, build: UnitBuild, dx: number, dy: number, isP: boolean) => {
            const jobBase = JOBS[j];
            const fStats = getFinalStats(jobBase, build);
            return {
                id: `p_${Math.random()}`, isPlayer: isP, x: dx, y: dy, startX: dx, startY: dy,
                job: jobBase, hp: fStats.hp, maxHp: fStats.hp, isDead: false,
                finalStats: fStats, build: build, ct: 0
            };
        };

        if (form === 'vanguard') { // 前衛集中 (y=6,7)
            const coords = [[4,6], [5,6], [6,6], [5,7], [4,7], [6,7]];
            roster.forEach((job, i) => { if(i < coords.length) pUnits.push(createU(job, builds[i], coords[i][0], coords[i][1], true)); });
        } else if (form === 'rear') { // 後衛集中 (y=7,8)
            const coords = [[3,8], [5,8], [7,8], [4,7], [6,7], [5,7]];
            roster.forEach((job, i) => { if(i < coords.length) pUnits.push(createU(job, builds[i], coords[i][0], coords[i][1], true)); });
        } else if (form === 'scatter') { // 分散
            const coords = [[2,7], [5,6], [8,7], [4,8], [6,8], [0,8]];
            roster.forEach((job, i) => { if(i < coords.length) pUnits.push(createU(job, builds[i], coords[i][0], coords[i][1], true)); });
        }
        return pUnits;
    };

    const initStage = (stg: number) => {
        const pUnits = applyFormation(playerRoster, playerBuilds, formation);
        let eUnits: Unit[] = [];
        const pattern = ENEMY_PATTERNS[(stg - 1) % ENEMY_PATTERNS.length];

        pattern.forEach((e, i) => {
            let jobBase = JOBS[e.job as JobId];
            let buff = (stg - 1) * 2;
            let fStats = getFinalStats(jobBase, undefined, true, buff);

            eUnits.push({
                id: `e_${i}`, isPlayer: false, x: e.x, y: e.y, startX: e.x, startY: e.y,
                job: jobBase, hp: fStats.hp, maxHp: fStats.hp, isDead: false,
                finalStats: fStats, ct: 0, droidState: jobBase.id === 'droid' ? 0 : undefined
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
            const pUnits = applyFormation(playerRoster, playerBuilds, formation);
            setUnits(prev => {
                const eUnits = prev.filter(u => !u.isPlayer);
                return [...pUnits, ...eUnits.length > 0 ? eUnits : []];
            });
        }
    }, [playerRoster, playerBuilds, formation]);

    useEffect(() => {
        // Run once on mount to set enemy units
        initStage(1);
    }, []);

    // --- Roster Management ---
    const addClass = (jobId: JobId) => {
        if(playerRoster.length < 5) {
            setPlayerRoster([...playerRoster, jobId]);
            setPlayerBuilds([...playerBuilds, { addedStats: { hp: 0, atk: 0, def: 0, res: 0, spd: 0 }, weaponId: 'iron', skillId: 'none' }]);
        }
    };
    const removeClass = (idx: number) => {
        if(playerRoster.length > 1) {
            let n = [...playerRoster]; n.splice(idx, 1); setPlayerRoster(n);
            let b = [...playerBuilds]; b.splice(idx, 1); setPlayerBuilds(b);
            if (editingUnitIdx >= n.length) setEditingUnitIdx(Math.max(0, n.length - 1));
        }
    };

    const updateBuild = (idx: number, partial: Partial<UnitBuild>) => {
        const newBuilds = [...playerBuilds];
        newBuilds[idx] = { ...newBuilds[idx], ...partial };
        setPlayerBuilds(newBuilds);
    };

    const updateAddedStat = (idx: number, stat: StatType, delta: number) => {
        const newBuilds = [...playerBuilds];
        const currentVal = newBuilds[idx].addedStats[stat];
        const newVal = Math.max(0, currentVal + delta); // 下限は0

        // 仮に更新してみてコストが100を超える場合はキャンセル（減らす場合はOK）
        if (delta > 0) {
            const costDiff = calculateCost(newVal) - calculateCost(currentVal);
            if (getTotalCost() + costDiff > 100) return;
        }

        newBuilds[idx].addedStats = { ...newBuilds[idx].addedStats, [stat]: newVal };
        setPlayerBuilds(newBuilds);
    };

    const currentTotalCost = getTotalCost();

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
                    // 僧侶の回復射程は MOD_HEAL に基づく。威力が0より大きいなら届く。
                    let modIdx = d - 1;
                    if (modIdx >= 0 && modIdx < MOD_HEAL.length && MOD_HEAL[modIdx] > 0 && d < minTDist) {
                        minTDist = d; bestMove = pos;
                    }
                }

                let finalModIdx = minTDist - 1;
                if (finalModIdx >= 0 && finalModIdx < MOD_HEAL.length && MOD_HEAL[finalModIdx] > 0) {
                    if (bestMove.x !== u.x || bestMove.y !== u.y) {
                        updateUnit(u.id, {x: bestMove.x, y: bestMove.y});
                        addLog(`${u.job.name} は移動した。`);
                        await sleep(SLEEP_MS);
                    }

                    let healMod = MOD_HEAL[finalModIdx] / 10;
                    let heal = Math.floor((u.job.atk + Math.floor(Math.random()*3)) * healMod);
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

        // Helper: get damage multiplier for a given distance
        const getDamageMod = (unit: Unit, dist: number) => {
            let mods = unit.job.rangeMods;

            // ドロイドの特殊処理：状態に応じて使う武器（レンジ補正）が変わる
            if (unit.job.id === 'droid') {
                const state = unit.droidState || 0;
                if (state === 0) mods = MOD_GUN;
                else if (state === 1) mods = MOD_MAGIC;
                else mods = MOD_MELEE;
            }

            const idx = dist - 1;
            if (idx < 0 || idx >= mods.length) return 0;
            return mods[idx] / 10; // 10 means 1.0
        };

        // Attack Logic
        // Find best target and move combination that yields highest expected damage modifier
        let target = enemies.sort((a,b) => getDistance(u!.x, u!.y, a.x, a.y) - getDistance(u!.x, u!.y, b.x, b.y))[0]; // fallback closest
        let area = getMoveArea(u, curUnits);

        let bestMove = {x: u.x, y: u.y};
        let bestTarget = target;
        let maxExpectedMod = -1;
        let minTDistToAny = Infinity;

        for (let pos of area) {
            for (let en of enemies) {
                let d = getDistance(pos.x, pos.y, en.x, en.y);
                if (d < minTDistToAny) { minTDistToAny = d; target = en; } // for moving closer fallback

                let mod = getDamageMod(u, d);
                if (mod > maxExpectedMod) {
                    maxExpectedMod = mod;
                    bestMove = pos;
                    bestTarget = en;
                } else if (mod === maxExpectedMod && mod > 0) {
                    // Tie-breaker: distance to target (closer might be better for body blocking, but arbitrary)
                    let d1 = getDistance(pos.x, pos.y, bestTarget.x, bestTarget.y);
                    if (d < d1) { bestMove = pos; bestTarget = en; }
                }
            }
        }

        // Move closer if no attack is possible (mod == 0)
        if (maxExpectedMod <= 0) {
            let closestDist = Infinity;
            for (let pos of area) {
                let d = getDistance(pos.x, pos.y, target.x, target.y);
                if (d < closestDist) {
                    closestDist = d; bestMove = pos;
                }
            }
        } else {
            target = bestTarget;
        }

        if (bestMove.x !== u.x || bestMove.y !== u.y) {
            updateUnit(u.id, {x: bestMove.x, y: bestMove.y});
            addLog(`${u.job.name} は移動した。`);
            await sleep(SLEEP_MS);
            u = unitsRef.current.find(x => x.id === unitId)!;
        }

        let distToTarget = getDistance(u.x, u.y, target.x, target.y);
        let currentMod = getDamageMod(u, distToTarget);

        if (currentMod > 0) {
            // Combat calculation (using finalStats and distance mod)
            let isMagic = u.job.id === 'mage' || u.job.id === 'cleric' || (u.job.id === 'droid' && u.droidState === 1);
            let defStat = isMagic ? target.finalStats.res : target.finalStats.def;

            // Critical Hit check
            let isCrit = Math.random() * 100 < u.finalStats.critRate;
            if (isCrit) {
                defStat = Math.floor(defStat * 0.3);
            }

            let baseDmg = Math.max(0, u.finalStats.atk - defStat) + Math.floor(Math.random()*3);
            let dmg = Math.floor(baseDmg * currentMod);

            // Job advantage
            if (u.job.id === 'archer' && target.job.id === 'mage') dmg = Math.floor(dmg * 1.5);
            if (u.job.id === 'mage' && target.job.id === 'knight') dmg = Math.floor(dmg * 1.5);
            if (u.job.id === 'assassin' && target.job.id === 'mage') dmg = Math.floor(dmg * 1.5);

            if (dmg <= 0) dmg = 1;

            let newHp = target.hp - dmg;
            let died = newHp <= 0;

            // ドロイドの攻撃パターン名
            let attackName = "の攻撃";
            if (u.job.id === 'droid') {
                if (u.droidState === 0) attackName = "の特殊銃撃";
                if (u.droidState === 1) attackName = "の魔法攻撃";
                if (u.droidState === 2) attackName = "の近接攻撃";
            }

            updateUnit(target.id, { hp: died ? 0 : newHp, isDead: died });

            if (isCrit) {
                showEffect(target, `CRITICAL! -${dmg}`, 'text-yellow-400 font-black text-2xl');
                addLog(`🔥 必殺の一撃！ ${u.job.name}${attackName}！ ${target.job.name} に ${dmg} ダメージ！`, true);
            } else {
                showEffect(target, `-${dmg}`, 'text-red-400 font-bold text-xl');
                addLog(`${u.job.name}${attackName}！ ${target.job.name} に ${dmg} ダメージ！`);
            }

            if (died) {
                addLog(`☠️ ${target.job.name} は倒れた！`);
            }

            // ドロイドは攻撃に成功した場合のみ状態を遷移させる
            if (u.job.id === 'droid') {
                updateUnit(u.id, { droidState: ((u.droidState || 0) + 1) % 3 });
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
            let curUnits = unitsRef.current.filter(u => !u.isDead);

            // 時間進行（全員のCTを素早さ分だけ減らす）
            let minCtUnit: Unit | null = null;
            let minCt = Infinity;

            for (let u of curUnits) {
                if (u.ct < minCt) {
                    minCt = u.ct;
                    minCtUnit = u;
                }
            }

            // 誰も行動可能(CT<=0)でないなら時間を進める
            if (minCt > 0) {
                const tick = 1; // tick幅
                const updatedUnits = curUnits.map(u => ({ ...u, ct: u.ct - (u.finalStats.spd * tick) }));
                setUnits(prev => prev.map(p => {
                    const match = updatedUnits.find(u => u.id === p.id);
                    return match ? { ...p, ct: match.ct } : p;
                }));
                unitsRef.current = unitsRef.current.map(p => {
                    const match = updatedUnits.find(u => u.id === p.id);
                    return match ? { ...p, ct: match.ct } : p;
                });
                await sleep(50); // 描画待ち
                continue;
            }

            // CT<=0 になったユニットが行動する（複数いる場合は素早さ順にしたいが、まずは見つかった順）
            let actingUnit = curUnits.find(u => u.ct <= 0);
            if (!actingUnit) continue;

            // 行動前スキル処理（ターン開始として扱う）
            if (actingUnit.build?.skillId === 'regen' && actingUnit.hp < actingUnit.maxHp) {
                let heal = 5;
                let newHp = Math.min(actingUnit.maxHp, actingUnit.hp + heal);
                updateUnit(actingUnit.id, { hp: newHp });
                showEffect(actingUnit, `+${heal}`, 'text-green-400');
                addLog(`🌿 自己再生: ${actingUnit.job.name} が ${heal} 回復！`);
                await sleep(300);
            }

            if (!isPlayingRef.current) break;

            await executeAITurn(actingUnit.id);

            // 行動終了後、CTをリセット（ディレイ発生）
            updateUnit(actingUnit.id, { ct: 1000 }); // 基準値1000から素早さ分減っていく

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
                            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                <h3 className="font-bold text-blue-300">編成・強化フェイズ</h3>
                                <div className={`font-bold ${currentTotalCost > 100 ? 'text-red-400' : 'text-green-400'}`}>
                                    コスト: {currentTotalCost} / 100
                                </div>
                            </div>

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
                                        <div
                                            key={idx}
                                            onClick={() => setEditingUnitIdx(idx)}
                                            className={`cursor-pointer px-3 py-1 rounded-full text-sm border flex items-center gap-1 transition-colors ${editingUnitIdx === idx ? 'bg-blue-600 border-blue-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}
                                        >
                                            {JOBS[job].emoji} {JOBS[job].name}
                                            <span onClick={(e) => { e.stopPropagation(); removeClass(idx); }} className="text-red-400 ml-1 text-xs hover:text-red-300 p-1">×</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 flex-wrap">
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

                            {/* ユニット強化パネル */}
                            {playerRoster[editingUnitIdx] && (
                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 mt-2">
                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
                                        <span className="text-2xl">{JOBS[playerRoster[editingUnitIdx]].emoji}</span>
                                        <span className="font-bold">{JOBS[playerRoster[editingUnitIdx]].name} の強化</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            {['hp', 'atk', 'def', 'res', 'spd'].map((stat) => {
                                                const sType = stat as StatType;
                                                const lvl = playerBuilds[editingUnitIdx].addedStats[sType];
                                                const nextCost = lvl + 1; // 1段階上げるのに必要な追加コスト
                                                const canAfford = currentTotalCost + nextCost <= 100;

                                                return (
                                                    <div key={stat} className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-400 uppercase w-8">{stat}</span>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => updateAddedStat(editingUnitIdx, sType, -1)} disabled={lvl === 0} className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center disabled:opacity-30">-</button>
                                                            <span className="w-4 text-center text-blue-300 font-bold">+{lvl}</span>
                                                            <button onClick={() => updateAddedStat(editingUnitIdx, sType, 1)} disabled={!canAfford} className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center disabled:opacity-30">+</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">武器</label>
                                                <select
                                                    value={playerBuilds[editingUnitIdx].weaponId}
                                                    onChange={(e) => {
                                                        const newW = WEAPONS.find(w => w.id === e.target.value)!;
                                                        const oldW = WEAPONS.find(w => w.id === playerBuilds[editingUnitIdx].weaponId)!;
                                                        if (currentTotalCost - oldW.cost + newW.cost <= 100) {
                                                            updateBuild(editingUnitIdx, { weaponId: newW.id });
                                                        }
                                                    }}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm focus:outline-none focus:border-blue-500"
                                                >
                                                    {WEAPONS.map(w => <option key={w.id} value={w.id}>{w.name} (ｺスト{w.cost})</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">スキル</label>
                                                <select
                                                    value={playerBuilds[editingUnitIdx].skillId}
                                                    onChange={(e) => {
                                                        const newS = SKILLS.find(s => s.id === e.target.value)!;
                                                        const oldS = SKILLS.find(s => s.id === playerBuilds[editingUnitIdx].skillId)!;
                                                        if (currentTotalCost - oldS.cost + newS.cost <= 100) {
                                                            updateBuild(editingUnitIdx, { skillId: newS.id });
                                                        }
                                                    }}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm focus:outline-none focus:border-blue-500"
                                                >
                                                    {SKILLS.map(s => <option key={s.id} value={s.id}>{s.name} (ｺスト{s.cost})</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={startGameLoop}
                                disabled={currentTotalCost > 100 || playerRoster.length === 0}
                                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-400 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
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
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 h-48 w-full overflow-y-auto text-sm shadow-inner font-mono flex-shrink-0 relative">
                    <div className="absolute top-0 w-full pr-3 pb-4">
                        {logs.map((log, i) => (
                            <div key={i} className={`mb-1.5 border-b border-slate-800 pb-1 ${log.imp ? 'text-yellow-300 font-bold' : 'text-slate-300'}`}>
                                {log.msg}
                            </div>
                        ))}
                    </div>
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
