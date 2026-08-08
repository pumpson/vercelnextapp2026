"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, RefreshCw, Hand, ShieldAlert, Swords, HelpCircle, X } from 'lucide-react';

// === Types ===
type JobId = 'fighter' | 'mage' | 'archer' | 'knight' | 'cleric' | 'assassin' | 'cavalry' | 'droid';
type FormationType = 'vanguard' | 'rear' | 'scatter';
type StatType = 'hp' | 'atk' | 'def' | 'res' | 'spd';

interface Job {
    id: JobId; name: string; emoji: string;
    hp: number; atk: number; def: number; res: number; spd: number; mov: number;
    rangeMods: number[]; // 距離1, 2, 3, 4, 5 に対応する威力補正（0〜10）
    color: string; desc: string;
    deployCost: number; // 編成コスト（部隊コスト300制限用）
}

interface Weapon {
    id: string; name: string; cost: number;
    atkBonus: number; critBonus: number;
    reqJob?: JobId; // 特定の職業専用の場合
    effectiveAgainst?: JobId[]; // 特効対象の職業
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
    fighter: { id: 'fighter', name: '戦士', emoji: '⚔️', hp: 50, atk: 20, def: 8, res: 0, spd: 10, mov: 3, rangeMods: MOD_MELEE, color: 'bg-red-500', desc: '近接。すべての基準。', deployCost: 50 },
    archer:  { id: 'archer', name: '弓兵', emoji: '🏹', hp: 40, atk: 18, def: 4, res: 0, spd: 12, mov: 3, rangeMods: MOD_BOW, color: 'bg-green-500', desc: '中距離適正。やや速い。', deployCost: 55 },
    mage:    { id: 'mage', name: '魔道士', emoji: '🔥', hp: 30, atk: 23, def: 2, res: 15, spd: 6, mov: 2, rangeMods: MOD_MAGIC, color: 'bg-purple-500', desc: '遠距離適正。脆くて遅い。', deployCost: 60 },
    cleric:  { id: 'cleric', name: '僧侶', emoji: '✨', hp: 38, atk: 16, def: 4, res: 15, spd: 9, mov: 2, rangeMods: MOD_HEAL, color: 'bg-yellow-400', desc: '味方のHPを回復する(AIのみ)。', deployCost: 60 },
    knight:  { id: 'knight', name: '重騎士', emoji: '🛡️', hp: 80, atk: 18, def: 20, res: 0, spd: 5, mov: 2, rangeMods: MOD_MELEE, color: 'bg-blue-500', desc: '高耐久。非常に遅い。', deployCost: 70 },
    assassin:{ id: 'assassin', name: '暗殺者', emoji: '🗡️', hp: 35, atk: 22, def: 3, res: 0, spd: 18, mov: 4, rangeMods: MOD_MELEE, color: 'bg-slate-700', desc: '手数が多く機動力に優れるが脆い。', deployCost: 80 },
    cavalry: { id: 'cavalry', name: '騎兵', emoji: '🐎', hp: 55, atk: 21, def: 10, res: 0, spd: 11, mov: 5, rangeMods: MOD_MELEE, color: 'bg-orange-600', desc: '【敵専用】非常に高い機動力を持つ。', deployCost: 80 },
    droid:   { id: 'droid', name: 'ドロイド', emoji: '🤖', hp: 100, atk: 24, def: 15, res: 10, spd: 7, mov: 2, rangeMods: MOD_MELEE, color: 'bg-zinc-500', desc: '【敵専用】特殊なAIで3種の攻撃を切り替える。', deployCost: 120 }
};

const WEAPONS: Weapon[] = [
    { id: 'iron', name: '鉄の武器', cost: 0, atkBonus: 0, critBonus: 0 },
    { id: 'steel', name: '鋼の武器', cost: 5, atkBonus: 3, critBonus: 0 },
    { id: 'killer', name: 'キラー武器', cost: 10, atkBonus: 1, critBonus: 20 },
    { id: 'silver', name: '銀の武器', cost: 15, atkBonus: 6, critBonus: 0 },
    { id: 'brave', name: '勇者の斧', cost: 20, atkBonus: 4, critBonus: 0, reqJob: 'fighter' },
    { id: 'horseslayer', name: 'ナイトキラー', cost: 10, atkBonus: 2, critBonus: 0, effectiveAgainst: ['cavalry'] },
    { id: 'armorslayer', name: 'アーマーキラー', cost: 10, atkBonus: 2, critBonus: 0, effectiveAgainst: ['knight'] },
];

const SKILLS: Skill[] = [
    { id: 'none', name: 'なし', cost: 0, desc: 'スキルを持たない' },
    { id: 'regen', name: '自己再生', cost: 10, desc: '自ターン開始時、HPが少し回復する' },
    { id: 'bulwark', name: '鉄壁', cost: 15, desc: '防御・魔防+5、速度-3' },
    { id: 'deathblow', name: '必殺覚醒', cost: 12, desc: '必殺率+15%' },
    { id: 'mov_up', name: '機動強化', cost: 15, desc: '移動力(MOV)+1' },
    { id: 'drain', name: '吸血', cost: 12, desc: '攻撃時、30%の確率で与えたダメージの半分を回復' },
    { id: 'double_attack', name: '追撃', cost: 18, desc: '攻撃時、20%の確率で連続攻撃を行う' },
    { id: 'berserk_crit', name: '捨て身の必殺', cost: 15, desc: '必殺時ダメージ1.5倍・防御7割無視になるが、自身の最大HP20%の反動ダメージ' },
    { id: 'swift_stance', name: '飛燕の構え', cost: 10, desc: '攻撃力(ATK)-5、速度(SPD)+10' },
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
    const [logs, setLogs] = useState<{msg: string, imp: boolean, isPlayerAction: boolean | null}[]>([]);
    const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
    const [damageEffects, setDamageEffects] = useState<{id: string, x: number, y: number, text: string, type: string}[]>([]);

    // Player Setup State
    const [playerRoster, setPlayerRoster] = useState<JobId[]>(['fighter', 'fighter', 'mage', 'knight', 'cleric']);
    const [playerBuilds, setPlayerBuilds] = useState<UnitBuild[]>([
        { addedStats: { hp: 0, atk: 0, def: 0, res: 0, spd: 0 }, weaponId: 'iron', skillId: 'none' },
        { addedStats: { hp: 0, atk: 0, def: 0, res: 0, spd: 0 }, weaponId: 'iron', skillId: 'none' },
        { addedStats: { hp: 0, atk: 0, def: 0, res: 0, spd: 0 }, weaponId: 'iron', skillId: 'none' },
        { addedStats: { hp: 0, atk: 0, def: 0, res: 0, spd: 0 }, weaponId: 'iron', skillId: 'none' },
        { addedStats: { hp: 0, atk: 0, def: 0, res: 0, spd: 0 }, weaponId: 'iron', skillId: 'none' },
    ]);
    const [formation, setFormation] = useState<FormationType>('vanguard');
    const [isSetupPhase, setIsSetupPhase] = useState(true);
    const [maxCost, setMaxCost] = useState(300); // 初期コスト上限300

    // UI State for Setup
    const [editingUnitIdx, setEditingUnitIdx] = useState<number>(0);
    const [showHelp, setShowHelp] = useState(false);
    const [showDebug, setShowDebug] = useState(false);

    const isPlayingRef = useRef(false); // Ref to break loops safely
    const unitsRef = useRef<Unit[]>([]); // Ref to hold latest state for async AI loop

    useEffect(() => {
        unitsRef.current = units;
    }, [units]);

    const addLog = (msg: string, imp = false, isPlayerAction: boolean | null = null) => {
        setLogs(prev => [{msg, imp, isPlayerAction}, ...prev]); // 常に先頭に追加（上が最新）
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
        playerRoster.forEach((jobId, idx) => {
            total += JOBS[jobId].deployCost;
            const build = playerBuilds[idx];
            if (build) {
                Object.values(build.addedStats).forEach(st => total += calculateCost(st));
                total += WEAPONS.find(w => w.id === build.weaponId)?.cost || 0;
                total += SKILLS.find(s => s.id === build.skillId)?.cost || 0;
            }
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
                mov: job.mov,
                critRate: 5
            };
        }

        if (!build) return { hp: job.hp, atk: job.atk, def: job.def, res: job.res, spd: job.spd, mov: job.mov, critRate: 5 };

        const weapon = WEAPONS.find(w => w.id === build.weaponId)!;
        const skill = SKILLS.find(s => s.id === build.skillId)!;

        let fHp = job.hp + build.addedStats.hp * 2; // HPは1振りにつき+2に変更
        let fAtk = job.atk + build.addedStats.atk + weapon.atkBonus;
        let fDef = job.def + build.addedStats.def;
        let fRes = job.res + build.addedStats.res;
        let fSpd = job.spd + build.addedStats.spd;
        let fMov = job.mov;
        let fCrit = 5 + weapon.critBonus;

        if (skill.id === 'bulwark') { fDef += 5; fRes += 5; fSpd -= 3; }
        if (skill.id === 'deathblow') { fCrit += 15; }
        if (skill.id === 'mov_up') { fMov += 1; }
        if (skill.id === 'swift_stance') { fAtk -= 5; fSpd += 10; }

        return { hp: fHp, atk: fAtk, def: fDef, res: fRes, spd: fSpd, mov: fMov, critRate: fCrit };
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
        if(playerRoster.length < 6) {
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

        // 仮に更新してみてコストが最大コストを超える場合はキャンセル（減らす場合はOK）
        if (delta > 0) {
            const costDiff = calculateCost(newVal) - calculateCost(currentVal);
            if (getTotalCost() + costDiff > maxCost) return;
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

        let hasMovedInTurn = false;
        if (bestMove.x !== u.x || bestMove.y !== u.y) {
            updateUnit(u.id, {x: bestMove.x, y: bestMove.y});
            addLog(`${u.job.name} は移動した。`);
            await sleep(SLEEP_MS);
            u = unitsRef.current.find(x => x.id === unitId)!;
            hasMovedInTurn = true;
        }

        let distToTarget = getDistance(u.x, u.y, target.x, target.y);
        let currentMod = getDamageMod(u, distToTarget);

        // 移動せずに攻撃する場合はダメージ1.2倍ボーナス
        if (!hasMovedInTurn && currentMod > 0) {
            currentMod *= 1.2;
        }

        if (currentMod > 0) {
            // Combat calculation (using finalStats and distance mod)
            let isMagic = u.job.id === 'mage' || u.job.id === 'cleric' || (u.job.id === 'droid' && u.droidState === 1);
            let defStat = isMagic ? target.finalStats.res : target.finalStats.def;

            // Attack loop (handles double attack skill and brave weapon)
            let isBrave = u.build?.weaponId === 'brave';
            let attackCount = 1;
            if (isBrave) attackCount = 2; // 勇者の斧は確定2回攻撃
            else if (u.build?.skillId === 'double_attack' && Math.random() < 0.2) attackCount = 2;

            // ドロイドの攻撃パターン名
            let attackName = "の攻撃";
            if (u.job.id === 'droid') {
                if (u.droidState === 0) attackName = "の特殊銃撃";
                if (u.droidState === 1) attackName = "の魔法攻撃";
                if (u.droidState === 2) attackName = "の近接攻撃";
            }

            for (let i = 0; i < attackCount; i++) {
                if (target.isDead) break;

                // Critical Hit check
                let isCrit = Math.random() * 100 < u.finalStats.critRate;
                let currentDef = defStat;
                let isBerserk = isCrit && u.build?.skillId === 'berserk_crit';

                if (isBerserk) {
                    currentDef = Math.floor(currentDef * 0.3); // berserk: 7割無視
                } else if (isCrit) {
                    currentDef = Math.floor(currentDef * 0.7); // 通常: 3割無視
                }

                let baseDmg = Math.max(0, u.finalStats.atk - currentDef) + Math.floor(Math.random()*3);
                let dmg = Math.floor(baseDmg * currentMod);

                if (isBerserk) dmg = Math.floor(dmg * 1.5);

                // Job advantage
                if (u.job.id === 'archer' && target.job.id === 'mage') dmg = Math.floor(dmg * 1.5);
                if (u.job.id === 'mage' && target.job.id === 'knight') dmg = Math.floor(dmg * 1.5);
                if (u.job.id === 'assassin' && target.job.id === 'mage') dmg = Math.floor(dmg * 1.5);

                // Effective Against (Weapon)
                const weapon = WEAPONS.find(w => w.id === u.build?.weaponId);
                if (weapon?.effectiveAgainst?.includes(target.job.id)) {
                    dmg = Math.floor(dmg * 1.5);
                }

                if (dmg <= 0) dmg = 1;

                let newHp = target.hp - dmg;
                let died = newHp <= 0;

                updateUnit(target.id, { hp: died ? 0 : newHp, isDead: died });

                let prefix = i === 1 ? "【追撃】 " : "";

                if (isCrit) {
                    showEffect(target, `CRITICAL! -${dmg}`, 'text-yellow-400 font-black text-2xl');
                    addLog(`${prefix}🔥 必殺の一撃！ ${u.job.name}${attackName}！ ${target.job.name} に ${dmg} ダメージ！`, true, u.isPlayer);

                    if (isBerserk) {
                        let recoil = Math.max(1, Math.floor(u.maxHp * 0.2));
                        let uNewHp = Math.max(1, u.hp - recoil); // 反動では死なない(1残る)
                        updateUnit(u.id, { hp: uNewHp });
                        showEffect(u, `-${recoil}`, 'text-red-600 font-bold text-sm');
                        addLog(`⚠️ 捨て身の反動！ ${u.job.name} は ${recoil} のダメージを受けた。`, false, u.isPlayer);
                    }
                } else {
                    showEffect(target, `-${dmg}`, 'text-red-400 font-bold text-xl');
                    addLog(`${prefix}${u.job.name}${attackName}！ ${target.job.name} に ${dmg} ダメージ！`, false, u.isPlayer);
                }

                // Drain skill
                if (u.build?.skillId === 'drain' && Math.random() < 0.3) {
                    let heal = Math.max(1, Math.floor(dmg / 2));
                    let uNewHp = Math.min(u.maxHp, u.hp + heal);
                    updateUnit(u.id, { hp: uNewHp });
                    showEffect(u, `+${heal}`, 'text-green-400 font-bold text-sm');
                    addLog(`🦇 吸血！ ${u.job.name} は ${heal} 回復した。`, false, u.isPlayer);
                }

                if (died) {
                    addLog(`☠️ ${target.job.name} は倒れた！`, false, target.isPlayer);
                    target.isDead = true; // loop内での状態更新
                }

                await sleep(SLEEP_MS);
            }

            // ドロイドは攻撃に成功した場合のみ状態を遷移させる
            if (u.job.id === 'droid') {
                updateUnit(u.id, { droidState: ((u.droidState || 0) + 1) % 3 });
            }
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
                // 最も早く行動順が回ってくるユニットがちょうど CT<=0 になるようにtick幅を計算する（時間短縮）
                // ただし、0除算を防ぐため最低1とする
                let maxTick = 1;
                curUnits.forEach(u => {
                    if (u.finalStats.spd > 0) {
                        const requiredTick = Math.ceil(u.ct / u.finalStats.spd);
                        if (minCtUnit && u.id === minCtUnit.id) {
                            maxTick = requiredTick;
                        }
                    }
                });
                const tick = Math.max(1, maxTick);

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

            // 行動開始前の位置を記録
            let startX = actingUnit.x;
            let startY = actingUnit.y;

            await executeAITurn(actingUnit.id);

            // 最新の状態を取得して移動距離を計算
            let actedUnit = unitsRef.current.find(u => u.id === actingUnit!.id);
            if (actedUnit) {
                let movedDist = getDistance(startX, startY, actedUnit.x, actedUnit.y);
                // 行動終了後、CTをリセット（移動したマス数 * 100 をディレイに追加）
                let addedDelay = movedDist * 100;
                updateUnit(actingUnit.id, { ct: 1000 + addedDelay });
            }

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
                        setMaxCost(prev => prev + 10); // ステージクリアで最大コスト+10
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

    // --- Debug Helper ---
    const updateJobStat = (jobId: JobId, stat: keyof Job, value: number) => {
        // Warning: This mutates the JOBS constant directly for debugging purposes.
        // In a real app, JOBS should be in a state or context.
        (JOBS[jobId] as any)[stat] = value;
        // Trigger a re-render by creating a new reference for the player builds (hacky but works for debug UI refresh)
        setPlayerBuilds([...playerBuilds]);
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
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowDebug(true)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors border border-slate-600 text-slate-400"
                    >
                        DEBUG
                    </button>
                    <button
                        onClick={() => setShowHelp(true)}
                        className="flex items-center gap-1 text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full transition-colors border border-slate-600 text-slate-300"
                    >
                        <HelpCircle size={16} /> 解説書
                    </button>
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
                                <div className={`font-bold ${currentTotalCost > maxCost ? 'text-red-400' : 'text-green-400'}`}>
                                    コスト: {currentTotalCost} / {maxCost}
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
                                <label className="text-xs text-slate-400 block mb-1">部隊 (最大6人):</label>
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
                                    {(Object.keys(JOBS) as JobId[]).map(key => {
                                        const jobBase = JOBS[key];
                                        // 敵専用のクラスは追加ボタンを表示しない
                                        if (jobBase.deployCost === 80 && (key === 'cavalry' || key === 'droid')) return null;

                                        return (
                                            <button
                                                key={key}
                                                onClick={() => addClass(key)}
                                                disabled={playerRoster.length >= 6}
                                                className="bg-slate-900 hover:bg-slate-700 disabled:opacity-50 px-2 py-1 rounded text-sm border border-slate-700 flex items-center gap-1 transition-colors"
                                                title={`${jobBase.name} (コスト${jobBase.deployCost})`}
                                            >
                                                {jobBase.emoji}
                                            </button>
                                        );
                                    })}
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
                                                const canAfford = currentTotalCost + nextCost <= maxCost;

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
                                                        if (currentTotalCost - oldW.cost + newW.cost <= maxCost) {
                                                            updateBuild(editingUnitIdx, { weaponId: newW.id });
                                                        }
                                                    }}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm focus:outline-none focus:border-blue-500"
                                                >
                                                    {WEAPONS.map(w => {
                                                        const canEquip = !w.reqJob || w.reqJob === playerRoster[editingUnitIdx];
                                                        return canEquip ? <option key={w.id} value={w.id}>{w.name} (ｺスト{w.cost})</option> : null;
                                                    })}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">スキル</label>
                                                <select
                                                    value={playerBuilds[editingUnitIdx].skillId}
                                                    onChange={(e) => {
                                                        const newS = SKILLS.find(s => s.id === e.target.value)!;
                                                        const oldS = SKILLS.find(s => s.id === playerBuilds[editingUnitIdx].skillId)!;
                                                        if (currentTotalCost - oldS.cost + newS.cost <= maxCost) {
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
                                disabled={currentTotalCost > maxCost || playerRoster.length === 0}
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
                        {logs.map((log, i) => {
                            let colorClass = 'text-slate-300';
                            if (log.imp) colorClass = 'text-yellow-300 font-bold';
                            else if (log.isPlayerAction === true) colorClass = 'text-blue-300';
                            else if (log.isPlayerAction === false) colorClass = 'text-red-300';

                            return (
                                <div key={i} className={`mb-1.5 border-b border-slate-800 pb-1 ${colorClass}`}>
                                    {log.msg}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
                        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <HelpCircle size={24} className="text-blue-400" />
                                オートタクティクス 解説書
                            </h2>
                            <button onClick={() => setShowHelp(false)} className="p-1 bg-slate-700 hover:bg-red-500 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-6 text-sm text-slate-300">

                            <section>
                                <h3 className="text-lg font-bold text-blue-300 border-b border-slate-700 mb-2 pb-1">システム概要</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>部隊全体で共有する <strong>コスト100</strong> の範囲内で、ユニットのステータス強化・武器・スキルを割り当てます。</li>
                                    <li>戦闘はフルオートで進行します。行動順は「素早さ (SPD)」に応じたCT（チャージタイム）システムです。</li>
                                    <li>行動後、移動した距離（マス数）に応じて追加のディレイ（CTペナルティ）が発生します。</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-blue-300 border-b border-slate-700 mb-2 pb-1">クラスと適正距離</h3>
                                <p className="mb-2">武器によって、対象との距離（マンハッタン距離）に応じたダメージ補正がかかります。適正距離以外ではダメージが激減するか、攻撃自体が届きません。</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left bg-slate-900 border border-slate-700">
                                        <thead>
                                            <tr className="bg-slate-700 text-slate-200">
                                                <th className="p-2 border-r border-slate-600">クラス</th>
                                                <th className="p-2 border-r border-slate-600 text-center">距1</th>
                                                <th className="p-2 border-r border-slate-600 text-center">距2</th>
                                                <th className="p-2 border-r border-slate-600 text-center">距3</th>
                                                <th className="p-2 border-r border-slate-600 text-center">距4</th>
                                                <th className="p-2 text-center">距5</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-slate-700">
                                                <td className="p-2 border-r border-slate-700">⚔️ 戦士・🛡️ 重騎士・🗡️ 暗殺者</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-yellow-300 font-bold">100%</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-slate-600">-</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-slate-600">-</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-slate-600">-</td>
                                                <td className="p-2 text-center text-slate-600">-</td>
                                            </tr>
                                            <tr className="border-b border-slate-700">
                                                <td className="p-2 border-r border-slate-700">🏹 弓兵</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-slate-400">20%</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-yellow-300 font-bold">100%</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-slate-400">30%</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-slate-600">-</td>
                                                <td className="p-2 text-center text-slate-600">-</td>
                                            </tr>
                                            <tr className="border-b border-slate-700">
                                                <td className="p-2 border-r border-slate-700">🔥 魔道士</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-slate-400">10%</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-slate-400">30%</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-yellow-300 font-bold">100%</td>
                                                <td className="p-2 border-r border-slate-700 text-center text-slate-600">-</td>
                                                <td className="p-2 text-center text-slate-600">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-blue-300 border-b border-slate-700 mb-2 pb-1">ステータス強化コスト</h3>
                                <p className="mb-2">1つのステータスを上げる際、強化段階が上がるごとに必要なコストが増加します。<br/>※HPは1振りにつき+2されます。</p>
                                <ul className="list-none space-y-1 bg-slate-900 p-3 rounded border border-slate-700 font-mono text-xs">
                                    <li>+1 強化: コスト 1 (累計 1)</li>
                                    <li>+2 強化: コスト 2 (累計 3)</li>
                                    <li>+3 強化: コスト 3 (累計 6)</li>
                                    <li>+4 強化: コスト 4 (累計 10)</li>
                                    <li>+5 強化: コスト 5 (累計 15)</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-blue-300 border-b border-slate-700 mb-2 pb-1">クラス相性・クリティカル・移動ボーナス</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>特効と相性</strong>: 弓兵・暗殺者は魔道士に1.5倍、魔道士は重騎士に1.5倍のダメージを与えます。また、特効武器（ナイトキラー等）を装備していると対象へ1.5倍のダメージになります。</li>
                                    <li><strong>クリティカル（必殺）</strong>: 発動すると、相手の防御・魔防を <strong>3割無視（0.7倍）</strong> して計算します。</li>
                                    <li><strong>不動ボーナス</strong>: ユニットが移動せずにその場で攻撃した場合、最終ダメージが <strong>1.2倍</strong> になります。</li>
                                </ul>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* Debug Modal */}
            {showDebug && (
                <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
                        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-slate-300 flex items-center gap-2">
                                🛠️ デバッグ：基本ステータス調整
                            </h2>
                            <button onClick={() => setShowDebug(false)} className="p-1 bg-slate-700 hover:bg-red-500 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {(Object.keys(JOBS) as JobId[]).map(jobId => {
                                const job = JOBS[jobId];
                                return (
                                    <div key={jobId} className="bg-slate-900 p-3 rounded border border-slate-700">
                                        <div className="font-bold text-white mb-2">{job.emoji} {job.name} <span className="text-slate-400 text-xs">(Cost: {job.deployCost || '-'})</span></div>
                                        <div className="grid grid-cols-5 gap-2">
                                            {['hp', 'atk', 'def', 'res', 'spd'].map(stat => (
                                                <div key={stat} className="flex flex-col">
                                                    <label className="text-[10px] text-slate-400 uppercase">{stat}</label>
                                                    <input
                                                        type="number"
                                                        value={(job as any)[stat]}
                                                        onChange={(e) => updateJobStat(jobId, stat as keyof Job, Number(e.target.value))}
                                                        className="bg-slate-800 border border-slate-600 text-white p-1 rounded text-sm w-full"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideUp {
                    0% { transform: translateY(0); opacity: 1; }
                    100% { transform: translateY(-20px); opacity: 0; }
                }
            `}} />
        </div>
    );
}
