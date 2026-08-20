"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- データ定義 ---
const FIRST_NAMES = ["アレン", "カイト", "レオ", "ルーク", "シオン", "アリス", "クロエ", "ルナ", "リリィ", "エルザ", "レオン", "ゼクス", "レイ", "カイ", "ジン", "サラ", "マリア", "アンナ", "エマ", "オリビア", "ソフィア", "ミア", "アーサー", "ランス", "ガウェイン", "ジャンヌ", "マルグリット"];
const LAST_NAMES = ["・スミス", "・ウィリアムズ", "・ブラウン", "・ジョーンズ", "・ガルシア", "・ミラー", "・デイヴィス", "・ロドリゲス", "・ハート", "・ストーム", "・シャドウ", "・ライト", "・ブレード", "・シールド", "・アロー"];

const generateName = () => {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const useLastName = Math.random() > 0.5;
    const last = useLastName ? LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)] : "";
    return first + last;
};

// 役職の定義
const JOBS = [
    { id: 'SWORDSMAN', name: '剣士', hpMod: 1.3, atkMod: 1.5, defMod: 1.1, spdMod: 1.3, range: 30, color: '#4facfe', growth: { hp: 12, atk: 5, def: 2, spd: 1 } },
    { id: 'HEAVY_ARMOR', name: '重装備兵', hpMod: 2.0, atkMod: 1.0, defMod: 2.0, spdMod: 0.6, range: 35, color: '#43e97b', growth: { hp: 25, atk: 3, def: 4, spd: 0.5 } },
    { id: 'MAGE', name: '魔導士', hpMod: 0.7, atkMod: 1.8, defMod: 0.5, spdMod: 0.9, range: 120, color: '#b224ef', growth: { hp: 5, atk: 5, def: 0.5, spd: 1 } },
    { id: 'ARCHER', name: '弓使い', hpMod: 0.8, atkMod: 1.1, defMod: 0.7, spdMod: 1.5, range: 150, color: '#00f2fe', growth: { hp: 6, atk: 2, def: 1, spd: 2 } },
    { id: 'CLERIC', name: '僧侶', hpMod: 0.9, atkMod: 0.5, defMod: 0.9, spdMod: 1.0, range: 100, color: '#fddb92', growth: { hp: 8, atk: 1, def: 1, spd: 1 } } // 回復役
];

// スキルの定義（15種類）
const SKILLS = [
    { id: 'GROWTH_UP', name: '大器晩成', desc: '勝利後のステータスアップ量が2倍' },
    { id: 'FULL_HEAL', name: '自己再生', desc: '勝利後のHP回復が全回復になる' },
    { id: 'HEAVY_BLOW', name: '渾身の一撃', desc: '与えるダメージが1.5倍になる' },
    { id: 'STEALTH', name: '隠密', desc: '敵から狙われにくくなる' },
    { id: 'TAUNT', name: '挑発', desc: '受けるダメージが20%減るが、攻撃力が下がり、非常に狙われやすくなる' },
    { id: 'DOUBLE_ATTACK', name: '連続攻撃', desc: '20%の確率で2回攻撃する' },
    { id: 'GUTS', name: '根性', desc: 'HPが0になるダメージを受けた時、一度だけHP1で耐える' },
    { id: 'CRITICAL', name: '会心', desc: '15%の確率でダメージが2.5倍になる' },
    { id: 'VAMPIRE', name: '吸血', desc: '与えたダメージの30%分、自分のHPを回復する' },
    { id: 'SPEED_STAR', name: '神速', desc: '移動速度と攻撃速度が1.5倍になる' },
    { id: 'GIANT_KILLING', name: 'ジャイアントキル', desc: '自分より現在HPが高い敵へのダメージが2倍' },
    { id: 'REVENGE', name: '復讐者', desc: '味方が死ぬたびに攻撃力が5%アップ（ステージ中のみ）' },
    { id: 'FIRST_AID', name: '応急処置', desc: '戦闘開始時にHPが最大値の20%回復する' },
    { id: 'ARMOR_PIERCE', name: '貫通', desc: '敵の防御力を無視してダメージを与える' },
    { id: 'LUCKY', name: '幸運', desc: '敵の攻撃を25%の確率で完全に回避する' }
];

const generateCharacter = (isPlayer: boolean, stage: number, averageLevel: number = 1) => {
    // レベルの決定
    let level = 1;
    if (isPlayer) {
        if (stage === 1) {
            level = 1;
        } else {
            // 新規加入兵は平均レベル±2（最低1）
            level = Math.max(1, averageLevel + Math.floor(Math.random() * 5) - 2);
        }
    } else {
        // 敵のレベルは味方平均レベル + ステージに応じた緩やかなボーナス
        level = Math.max(1, averageLevel + Math.floor(stage / 3) + Math.floor(Math.random() * 3) - 1);
    }

    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    const skill = isPlayer ? SKILLS[Math.floor(Math.random() * SKILLS.length)] : null;

    // ステータス算出: (基礎値 + 成長率 * レベル) * 役職補正 + 個体値(-10%~+10%)
    const applyVariance = (val: number) => Math.floor(val * (0.9 + Math.random() * 0.2));

    const baseHp = applyVariance((100 + job.growth.hp * (level - 1)) * job.hpMod);
    const baseAtk = applyVariance((15 + job.growth.atk * (level - 1)) * job.atkMod);
    const baseDef = applyVariance((5 + job.growth.def * (level - 1)) * job.defMod);
    const baseSpd = applyVariance((30 + job.growth.spd * (level - 1)) * job.spdMod);

    return {
        id: Math.random().toString(36).substring(2, 9),
        name: generateName(),
        isPlayer,
        job,
        skill,
        level,
        maxHp: baseHp,
        hp: baseHp,
        atk: baseAtk,
        def: baseDef,
        spd: baseSpd,
        kills: 0,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        cooldown: 0,
        isDead: false,
        gutsUsed: false,
        battleAtkMod: 1.0, // 戦闘中のバフ用
        survivedStages: 0, // 生存したステージ数
        exp: 0 // 現在の経験値
    };
};

// 称号（ランク）の取得ロジック
const getRankDisplay = (survivedStages: number) => {
    if (survivedStages === 0) return { title: '新兵', icon: '' };
    if (survivedStages <= 2) return { title: '熟練兵', icon: '🥉' };
    if (survivedStages <= 5) return { title: '精鋭', icon: '🥈' };
    if (survivedStages <= 9) return { title: '歴戦', icon: '🥇' };
    if (survivedStages <= 19) return { title: '英雄', icon: '🎖️' };
    return { title: '伝説', icon: '👑' };
};

export default function RpgSquadBattler() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [phase, setPhase] = useState<'setup' | 'battle' | 'result' | 'gameover'>('setup');
    const [stage, setStage] = useState(1);

    // ReactのStateとしては概要だけ保持。詳細な位置座標などはRefで管理する。
    const [players, setPlayers] = useState<any[]>([]);
    const [enemies, setEnemies] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [aliveEnemyCount, setAliveEnemyCount] = useState<number>(0);

    const battleStateRef = useRef({
        players: [] as any[],
        enemies: [] as any[],
        projectiles: [] as any[],
        particles: [] as any[],
        floatingTexts: [] as any[],
        phase: 'setup',
        stage: 1,
        lastTime: 0,
        lastUiUpdateTime: 0
    });

    const reqIdRef = useRef<number>();

    // ログ追加関数
    const addLog = useCallback((msg: string) => {
        setLogs(prev => {
            const newLogs = [msg, ...prev];
            if (newLogs.length > 50) newLogs.pop();
            return newLogs;
        });
    }, []);

    // --- ゲーム初期化 ---
    const initRef = useRef(false);
    useEffect(() => {
        if (!initRef.current) {
            initRef.current = true;
            const initialPlayers = [];
            for (let i = 0; i < 30; i++) {
                initialPlayers.push(generateCharacter(true, 1));
            }
            setTimeout(() => {
                setPlayers(initialPlayers);
            }, 0);
            battleStateRef.current.players = JSON.parse(JSON.stringify(initialPlayers));
        }

        return () => {
            if (reqIdRef.current) {
                cancelAnimationFrame(reqIdRef.current);
            }
        };
    }, []);

    // --- 戦闘開始 ---
    const startBattle = () => {
        const s = battleStateRef.current;
        s.stage = stage;

        // 味方の平均レベルを算出
        const alivePlayers = s.players.filter(p => !p.isDead);
        const averageLevel = alivePlayers.length > 0
            ? Math.floor(alivePlayers.reduce((sum, p) => sum + p.level, 0) / alivePlayers.length)
            : 1;

        // 敵の生成（ステージに応じて数と強さが変動。基本10～30人）
        const enemyCount = Math.floor(10 + Math.random() * 21) + Math.floor(stage / 2); // eslint-disable-line react-hooks/purity
        const newEnemies = [];
        for (let i = 0; i < enemyCount; i++) {
            newEnemies.push(generateCharacter(false, stage, averageLevel));
        }
        setEnemies(newEnemies);
        s.enemies = newEnemies;
        setAliveEnemyCount(newEnemies.length);

        // 配置初期化
        const CANVAS_W = 1000;
        const CANVAS_H = 600;

        s.players.forEach((p) => {
            if (p.isDead) return;
            // 味方は左側
            p.x = 50 + Math.random() * 200;
            p.y = 50 + Math.random() * (CANVAS_H - 100);
            p.cooldown = Math.random(); // 初期攻撃タイミングをバラけさせる
            p.gutsUsed = false;
            p.battleAtkMod = 1.0;

            // スキル「応急処置」
            if (p.skill?.id === 'FIRST_AID') {
                const heal = Math.floor(p.maxHp * 0.2);
                p.hp = Math.min(p.maxHp, p.hp + heal);
            }
        });

        s.enemies.forEach((e) => {
            // 敵は右側
            e.x = CANVAS_W - 50 - Math.random() * 200;
            e.y = 50 + Math.random() * (CANVAS_H - 100);
            e.cooldown = Math.random();
        });

        s.projectiles = [];
        s.particles = [];
        s.floatingTexts = [];
        s.phase = 'battle';
        s.lastTime = performance.now(); // eslint-disable-line react-hooks/purity
        setPhase('battle');
        addLog(`=== ステージ ${stage} 開始！ ===`);
        addLog(`敵部隊が ${enemyCount} 体現れた！`);

        if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
        reqIdRef.current = requestAnimationFrame(gameLoop);
    };

    // --- 戦闘ループ ---
    const gameLoop = (now: number) => {
        const s = battleStateRef.current;
        if (s.phase !== 'battle') return;

        let dt = (now - s.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        s.lastTime = now;

        const CW = 1000;
        const CH = 600;

        const allUnits = [...s.players, ...s.enemies].filter(u => !u.isDead);

        // ユニットの行動処理
        allUnits.forEach(unit => {
            unit.cooldown -= dt;
            const friends = unit.isPlayer ? s.players : s.enemies;
            const opponents = unit.isPlayer ? s.enemies : s.players;
            const aliveOpponents = opponents.filter(o => !o.isDead);

            if (aliveOpponents.length === 0) return;

            // ターゲット選定（一番近い敵をベースに、挑発や隠密を考慮）
            let target = null;

            // 僧侶の場合はHPが減っている味方を探す
            if (unit.job.id === 'CLERIC') {
                const needHealFriends = friends.filter(f => !f.isDead && f.hp < f.maxHp);
                if (needHealFriends.length > 0) {
                     // HP割合が一番低い味方をターゲット
                     needHealFriends.sort((a, b) => (a.hp/a.maxHp) - (b.hp/b.maxHp));
                     target = needHealFriends[0];
                } else {
                     // 回復対象がいなければ一番近い敵をターゲット（攻撃も一応する）
                     target = findBestTarget(unit, aliveOpponents);
                }
            } else {
                 target = findBestTarget(unit, aliveOpponents);
            }

            if (!target) return;

            const dist = Math.hypot(target.x - unit.x, target.y - unit.y);
            const actualSpd = unit.skill?.id === 'SPEED_STAR' ? unit.spd * 1.5 : unit.spd;

            // 遠距離クラスは攻撃間隔を長くする（DPSを下げる）
            let baseInterval = 1.0;
            if (unit.job.id === 'ARCHER' || unit.job.id === 'MAGE') {
                baseInterval = 2.0;
            } else if (unit.job.id === 'CLERIC') {
                baseInterval = 1.5;
            } else {
                baseInterval = 0.8; // 近接は攻撃間隔を短くする（DPSを上げる）
            }

            const attackInterval = unit.skill?.id === 'SPEED_STAR' ? baseInterval * 0.7 : baseInterval;

            if (dist > unit.job.range) {
                // 移動
                const dx = target.x - unit.x;
                const dy = target.y - unit.y;
                unit.x += (dx / dist) * actualSpd * dt;
                unit.y += (dy / dist) * actualSpd * dt;
            } else {
                // 射程内なら攻撃（または回復）
                if (unit.cooldown <= 0) {
                    if (unit.job.id === 'CLERIC' && target.isPlayer === unit.isPlayer) {
                        // 回復行動
                        const healAmt = Math.floor(unit.atk * 1.5);
                        target.hp = Math.min(target.maxHp, target.hp + healAmt);
                        s.floatingTexts.push({ x: target.x, y: target.y - 20, text: `+${healAmt}`, color: '#10b981', life: 1 });
                        spawnParticles(s.particles, target.x, target.y, '#10b981', 5);

                        // 回復経験値
                        giveExp(unit, 5 + (healAmt / target.maxHp) * 20, s);
                    } else {
                        // 攻撃行動
                        executeAttack(unit, target, s);

                        // スキル：連続攻撃
                        if (unit.skill?.id === 'DOUBLE_ATTACK' && Math.random() < 0.2) {
                            setTimeout(() => {
                                if (!target.isDead) {
                                    executeAttack(unit, target, s);
                                    s.floatingTexts.push({ x: unit.x, y: unit.y - 30, text: "連続攻撃!", color: '#fbbf24', life: 1 });
                                }
                            }, 200);
                        }
                    }
                    unit.cooldown = attackInterval;
                }
            }

            // 画面外に出ないように制限
            unit.x = Math.max(10, Math.min(CW - 10, unit.x));
            unit.y = Math.max(10, Math.min(CH - 10, unit.y));
        });

        // 投射物の更新
        s.projectiles = s.projectiles.filter(p => {
            if (p.target.isDead && p.type !== 'HEAL') return false; // ターゲット死亡で消滅
            const dx = p.target.x - p.x;
            const dy = p.target.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 10) {
                // 着弾
                if (p.type === 'HEAL') {
                     // 既に回復処理は発射時に済ませているか、着弾時にするか
                } else {
                    applyDamage(p.source, p.target, p.damage, s);
                }
                spawnParticles(s.particles, p.target.x, p.target.y, p.color, 5);
                return false;
            }
            p.x += (dx / dist) * p.speed * dt;
            p.y += (dy / dist) * p.speed * dt;
            return true;
        });

        // パーティクル・テキストの更新
        s.particles = s.particles.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            return p.life > 0;
        });
        s.floatingTexts = s.floatingTexts.filter(t => {
            t.y -= 30 * dt;
            t.life -= dt;
            return t.life > 0;
        });

        // 描画
        drawBattle(s);

        // UIの定期更新（0.5秒ごと）
        if (now - s.lastUiUpdateTime > 500) {
            s.lastUiUpdateTime = now;
            setPlayers([...s.players]);
            setEnemies([...s.enemies]);
        }

        // 勝敗判定
        const aliveP = s.players.filter(p => !p.isDead).length;
        const aliveE = s.enemies.filter(e => !e.isDead).length;
        setAliveEnemyCount(aliveE);

        if (aliveP === 0) {
            s.phase = 'gameover';
            setPhase('gameover');
            setPlayers(s.players); // 状態をReactに同期
            addLog('部隊は全滅した……。');
        } else if (aliveE === 0) {
            s.phase = 'result';
            setPhase('result');
            setPlayers(s.players);
            addLog(`ステージ ${stage} をクリア！ 生存者: ${aliveP}名`);
        } else {
            reqIdRef.current = requestAnimationFrame(gameLoop);
        }
    };

    const findBestTarget = (unit: any, opponents: any[]) => {
        let bestTarget = null;
        let maxScore = -Infinity;
        opponents.forEach(o => {
            const dist = Math.hypot(o.x - unit.x, o.y - unit.y);
            let score = 1000 - dist; // 近いほどスコアが高い

            if (o.skill?.id === 'TAUNT') score += 500; // 挑発は狙われやすい
            if (o.skill?.id === 'STEALTH') score -= 500; // 隠密は狙われにくい

            if (score > maxScore) {
                maxScore = score;
                bestTarget = o;
            }
        });
        return bestTarget;
    };

    const executeAttack = (attacker: any, target: any, s: any) => {
        let baseDmg = Math.max(1, attacker.atk * attacker.battleAtkMod - target.def);

        // スキル：貫通
        if (attacker.skill?.id === 'ARMOR_PIERCE') {
             baseDmg = attacker.atk * attacker.battleAtkMod;
        }

        // スキル：渾身の一撃
        if (attacker.skill?.id === 'HEAVY_BLOW') baseDmg *= 1.5;
        // スキル：挑発（攻撃力ダウン）
        if (attacker.skill?.id === 'TAUNT') baseDmg *= 0.7;

        // スキル：ジャイアントキル
        if (attacker.skill?.id === 'GIANT_KILLING' && target.hp > attacker.hp) baseDmg *= 2.0;

        // 遠距離攻撃ならProjectileを発射、近接なら直接ダメージ
        if (attacker.job.range > 50) {
            s.projectiles.push({
                source: attacker,
                target: target,
                x: attacker.x,
                y: attacker.y,
                damage: baseDmg,
                speed: 400,
                color: attacker.job.color,
                type: 'ATTACK'
            });
        } else {
            applyDamage(attacker, target, baseDmg, s);
            spawnParticles(s.particles, target.x, target.y, '#fff', 3);
        }
    };

    const giveExp = (unit: any, expGain: number, s: any) => {
        if (unit.isDead) return;
        unit.exp += Math.floor(expGain);
        const nextLevelExp = unit.level * 100;
        if (unit.exp >= nextLevelExp) {
            unit.exp -= nextLevelExp;
            unit.level += 1;

            // レベルアップ時のステータス上昇
            const applyVariance = (val: number) => Math.max(1, Math.floor(val * (0.9 + Math.random() * 0.2)));
            let growthMult = 1.0;
            if (unit.skill?.id === 'GROWTH_UP') growthMult = 2.0;

            const hpUp = applyVariance(unit.job.growth.hp * growthMult * unit.job.hpMod);
            unit.maxHp += hpUp;
            unit.hp = Math.min(unit.maxHp, unit.hp + Math.floor(unit.maxHp * 0.2)); // 20%回復
            unit.atk += applyVariance(unit.job.growth.atk * growthMult * unit.job.atkMod);
            unit.def += applyVariance(unit.job.growth.def * growthMult * unit.job.defMod);
            unit.spd += applyVariance(unit.job.growth.spd * growthMult * unit.job.spdMod);

            s.floatingTexts.push({ x: unit.x, y: unit.y - 40, text: "LEVEL UP!", color: '#fbbf24', life: 1.5 });
            spawnParticles(s.particles, unit.x, unit.y, '#fbbf24', 10);

            // 再帰的にチェック（一気に2レベル以上上がる場合）
            if (unit.exp >= unit.level * 100) {
                giveExp(unit, 0, s);
            }
        }
    };

    const applyDamage = (attacker: any, target: any, rawDmg: number, s: any) => {
        // スキル：幸運（回避）
        if (target.skill?.id === 'LUCKY' && Math.random() < 0.25) { // eslint-disable-line react-hooks/purity
            s.floatingTexts.push({ x: target.x, y: target.y - 20, text: "MISS!", color: '#9ca3af', life: 1 });
            return;
        }

        let finalDmg = rawDmg;

        // スキル：会心
        let isCrit = false;
        if (attacker.skill?.id === 'CRITICAL' && Math.random() < 0.15) { // eslint-disable-line react-hooks/purity
            finalDmg *= 2.5;
            isCrit = true;
        }

        // 挑発の被ダメ減
        if (target.skill?.id === 'TAUNT') finalDmg *= 0.8;

        finalDmg = Math.max(1, Math.floor(finalDmg));
        target.hp -= finalDmg;

        s.floatingTexts.push({
            x: target.x,
            y: target.y - 20,
            text: isCrit ? `CRITICAL -${finalDmg}!` : `-${finalDmg}`,
            color: isCrit ? '#f59e0b' : '#ef4444',
            life: 1
        });

        // ダメージによる経験値付与
        giveExp(attacker, 5 + (finalDmg / target.maxHp) * 20, s);

        // スキル：吸血
        if (attacker.skill?.id === 'VAMPIRE') {
            const heal = Math.floor(finalDmg * 0.3);
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
            s.floatingTexts.push({ x: attacker.x, y: attacker.y - 20, text: `+${heal}`, color: '#10b981', life: 1 });
        }

        // 死亡判定
        if (target.hp <= 0) {
            // スキル：根性
            if (target.skill?.id === 'GUTS' && !target.gutsUsed) {
                target.hp = 1;
                target.gutsUsed = true;
                s.floatingTexts.push({ x: target.x, y: target.y - 30, text: "根性!", color: '#fbbf24', life: 1 });
            } else {
                target.hp = 0;
                target.isDead = true;
                attacker.kills++;

                // 撃破経験値
                giveExp(attacker, 50, s);

                if (target.isPlayer) {
                    addLog(`仲間の ${target.name} が戦死した…`);
                    // スキル：復讐者
                    s.players.forEach((p:any) => {
                        if (!p.isDead && p.skill?.id === 'REVENGE') {
                            p.battleAtkMod += 0.05;
                            s.floatingTexts.push({ x: p.x, y: p.y - 30, text: "復讐!", color: '#dc2626', life: 1 });
                        }
                    });
                }
            }
        }
    };

    const spawnParticles = (particles: any[], x: number, y: number, color: string, count: number) => {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: Math.random() * 0.3 + 0.1,
                color
            });
        }
    };

    const drawBattle = (s: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 背景
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 陣地ライン
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, 0);
        ctx.lineTo(canvas.width/2, canvas.height);
        ctx.stroke();

        const allUnits = [...s.players, ...s.enemies].filter(u => !u.isDead);

        // Y座標でソートして奥から描画（擬似3D）
        allUnits.sort((a, b) => a.y - b.y);

        allUnits.forEach(u => {
            ctx.save();
            ctx.translate(u.x, u.y);

            // HPバー
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-15, -25, 30, 4);
            ctx.fillStyle = u.isPlayer ? '#3b82f6' : '#ef4444';
            ctx.fillRect(-15, -25, 30 * Math.max(0, u.hp / u.maxHp), 4);

            // ユニット本体（役職の色）
            ctx.fillStyle = u.job.color;
            ctx.beginPath();
            ctx.arc(0, -10, 8, 0, Math.PI * 2);
            ctx.fill();

            // プレイヤーなら白い縁取り、敵なら赤い縁取り
            ctx.strokeStyle = u.isPlayer ? '#fff' : '#fca5a5';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 武器の簡易描画
            if (u.job.id === 'SWORDSMAN' || u.job.id === 'HEAVY_ARMOR') {
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(u.isPlayer ? 15 : -15, -15);
                ctx.strokeStyle = '#ccc';
                ctx.stroke();
            } else if (u.job.id === 'MAGE' || u.job.id === 'CLERIC') {
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(u.isPlayer ? 10 : -10, -20);
                ctx.strokeStyle = '#d4d4d8';
                ctx.stroke();
                ctx.fillStyle = u.job.id === 'MAGE' ? '#fde047' : '#6ee7b7';
                ctx.beginPath();
                ctx.arc(u.isPlayer ? 10 : -10, -20, 3, 0, Math.PI*2);
                ctx.fill();
            } else if (u.job.id === 'ARCHER') {
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(u.isPlayer ? 10 : -10, -10);
                ctx.strokeStyle = '#8b5cf6';
                ctx.stroke();
            }

            ctx.restore();
        });

        // 投射物
        s.projectiles.forEach((p:any) => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // パーティクル
        s.particles.forEach((p:any) => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        // テキスト
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        s.floatingTexts.forEach((t:any) => {
            ctx.fillStyle = t.color;
            ctx.globalAlpha = t.life;
            ctx.fillText(t.text, t.x, t.y);
            ctx.globalAlpha = 1.0;
        });
    };

    // --- 次のステージへ進む処理 ---
    const nextStage = () => {
        const s = battleStateRef.current;

        // 生存者のステータスアップと回復
        s.players.forEach(p => {
            if (!p.isDead) {
                p.survivedStages += 1;

                // ステージクリアボーナス経験値
                giveExp(p, 50, s);

                if (p.skill?.id === 'FULL_HEAL') {
                    p.hp = p.maxHp;
                } else {
                    p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.5));
                }
            }
        });

        // 死亡者の除外
        s.players = s.players.filter(p => !p.isDead);

        // 味方の平均レベルを算出（新規加入用）
        const averageLevel = s.players.length > 0
            ? Math.floor(s.players.reduce((sum, p) => sum + p.level, 0) / s.players.length)
            : 1;

        // 新規加入 (毎ステージ 3〜5人ランダム補充、ただし上限30人)
        const recruitsCount = Math.floor(3 + Math.random() * 3);
        for(let i=0; i<recruitsCount; i++) {
             if (s.players.length < 30) {
                 s.players.push(generateCharacter(true, stage, averageLevel));
             }
        }

        setStage(prev => prev + 1);
        setPlayers([...s.players]);
        setPhase('setup');
    };

    // --- リトライ処理 ---
    const retryGame = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4">
            <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                RPG Squad Battler
            </h1>
            <p className="text-gray-400 mb-4 text-sm">役職とスキルを持つキャラクター達が織りなすエンドレス総力戦</p>

            <div className="flex gap-4 w-full max-w-[1600px]">
                {/* 左サイドバー：味方部隊リスト */}
                <div className="w-[300px] flex flex-col gap-4 flex-shrink-0">
                    <div className="bg-gray-800 rounded-lg p-4 flex-grow flex flex-col border border-gray-700 shadow-md h-[calc(100vh-140px)]">
                        <h3 className="font-bold text-gray-300 mb-2 border-b border-gray-700 pb-1 flex justify-between">
                            <span className="text-blue-400">味方部隊名簿</span>
                            <span className="text-sm text-gray-500">生存 {players.filter(p=>!p.isDead).length}名</span>
                        </h3>
                        <div className="overflow-y-auto flex-grow space-y-2 pr-1 custom-scrollbar">
                            {players.map((p) => {
                                const rankInfo = getRankDisplay(p.survivedStages || 0);
                                const expPercent = Math.min(100, (p.exp / (p.level * 100)) * 100);
                                return (
                                <div key={p.id} className={`p-2 rounded bg-gray-900 border ${p.isDead ? 'border-red-900/50 opacity-50' : 'border-gray-700'} flex flex-col gap-1`}>
                                    <div className="flex justify-between items-center">
                                        <div className="font-bold text-sm flex items-center gap-1 truncate max-w-[150px]">
                                            <span style={{color: p.job.color}}>●</span>
                                            {p.name}
                                            {rankInfo.icon && <span className="text-xs" title={rankInfo.title}>{rankInfo.icon}</span>}
                                        </div>
                                        <div className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                                            <span className="font-mono text-[10px]">Lv.{p.level}</span>
                                            {rankInfo.title !== '新兵' && <span className="text-[10px] text-yellow-500 border border-yellow-700/50 bg-yellow-900/20 px-1 rounded">{rankInfo.title}</span>}
                                            {p.job.name}
                                        </div>
                                    </div>

                                    {!p.isDead ? (
                                        <>
                                            <div className="flex flex-col gap-1">
                                                {/* HP Bar */}
                                                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-green-500 h-full transition-all duration-300" style={{width: `${(p.hp/p.maxHp)*100}%`}}></div>
                                                </div>
                                                {/* EXP Bar */}
                                                <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden flex">
                                                    <div className="bg-yellow-400 h-full transition-all duration-300" style={{width: `${expPercent}%`}}></div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                                <span>HP:{p.hp}/{p.maxHp}</span>
                                                <span>攻:{p.atk} 防:{p.def} 速:{p.spd}</span>
                                            </div>

                                            {p.skill && (
                                                <div className="text-[10px] bg-indigo-900/50 text-indigo-200 px-1.5 py-0.5 rounded inline-block w-fit mt-0.5" title={p.skill.desc}>
                                                    ★ {p.skill.name}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-xs text-red-500 font-bold text-center mt-1">戦死 (Kills: {p.kills})</div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* メイン画面 (中央) */}
                <div className="flex-grow flex flex-col gap-4 min-w-[700px]">
                    {/* ステータスヘッダー */}
                    <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                        <div className="text-xl font-bold text-blue-400">STAGE {stage}</div>
                        <div className="flex gap-4 text-sm">
                            <div className="bg-gray-900 px-3 py-1 rounded">
                                味方生存: <span className="text-blue-400 font-bold">{players.filter(p => !p.isDead).length}</span> / 30
                            </div>
                            {phase === 'battle' && (
                                <div className="bg-gray-900 px-3 py-1 rounded">
                                    敵残存: <span className="text-red-400 font-bold">{aliveEnemyCount}</span>
                                </div>
                            )}
                        </div>
                        <div>
                            {phase === 'setup' && (
                                <button onClick={startBattle} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold shadow-lg transition transform hover:scale-105 active:scale-95">
                                    戦闘開始
                                </button>
                            )}
                            {phase === 'result' && (
                                <button onClick={nextStage} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-bold shadow-lg transition transform hover:scale-105 active:scale-95">
                                    次のステージへ進む
                                </button>
                            )}
                            {phase === 'gameover' && (
                                <button onClick={retryGame} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg font-bold shadow-lg transition transform hover:scale-105 active:scale-95">
                                    部隊を再編する (リトライ)
                                </button>
                            )}
                        </div>
                    </div>

                    {/* キャンバスエリア */}
                    <div className="relative w-full aspect-[5/3] bg-gray-950 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
                        {(phase === 'battle' || phase === 'result' || phase === 'gameover') ? (
                             <canvas ref={canvasRef} width="1000" height="600" className="w-full h-full object-contain" />
                        ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-gray-500 flex-col">
                                 <div className="text-6xl mb-4">⛺</div>
                                 <div className="text-xl">部隊編成中...</div>
                                 <div className="text-sm mt-2">準備が完了したら「戦闘開始」を押してください</div>
                             </div>
                        )}

                        {phase === 'gameover' && (
                             <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col z-10 backdrop-blur-sm">
                                 <h2 className="text-5xl font-black text-red-500 mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">ANNIHILATED</h2>
                                 <p className="text-xl text-gray-300">部隊は全滅した。到達ステージ: {stage}</p>
                             </div>
                        )}
                        {phase === 'result' && (
                             <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center flex-col z-10 backdrop-blur-[2px]">
                                 <h2 className="text-5xl font-black text-blue-400 mb-4 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]">STAGE CLEAR!</h2>
                                 <p className="text-xl text-white">生存者たちが経験を積み、休息をとっています...</p>
                             </div>
                        )}
                    </div>
                </div>

                {/* 右サイドバー：戦闘ログと敵部隊リスト */}
                <div className="w-[300px] flex flex-col gap-4 flex-shrink-0">
                    {/* 戦闘ログ */}
                    <div className="bg-gray-800 rounded-lg p-4 h-[250px] flex flex-col border border-gray-700 shadow-md">
                        <h3 className="font-bold text-gray-300 mb-2 border-b border-gray-700 pb-1">戦闘ログ</h3>
                        <div className="overflow-y-auto flex-grow text-xs font-mono space-y-1 pr-1 custom-scrollbar">
                            {logs.map((log, idx) => (
                                <div key={idx} className={`${idx === 0 ? 'text-white' : 'text-gray-400'}`}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 敵部隊リスト */}
                    <div className="bg-gray-800 rounded-lg p-4 flex-grow flex flex-col border border-gray-700 shadow-md h-[calc(100vh-410px)]">
                        <h3 className="font-bold text-gray-300 mb-2 border-b border-gray-700 pb-1 flex justify-between">
                            <span className="text-red-400">敵部隊名簿</span>
                            <span className="text-sm text-gray-500">残存 {enemies.filter(e=>!e.isDead).length}名</span>
                        </h3>
                        <div className="overflow-y-auto flex-grow space-y-2 pr-1 custom-scrollbar">
                            {enemies.map((e) => (
                                <div key={e.id} className={`p-2 rounded bg-gray-900 border ${e.isDead ? 'border-red-900/50 opacity-50' : 'border-gray-700'} flex flex-col gap-1`}>
                                    <div className="flex justify-between items-center">
                                        <div className="font-bold text-sm flex items-center gap-1 truncate max-w-[150px]">
                                            <span style={{color: e.job.color}}>●</span> {e.name}
                                        </div>
                                        <div className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                                            <span className="font-mono text-[10px]">Lv.{e.level}</span>
                                            {e.job.name}
                                        </div>
                                    </div>

                                    {!e.isDead ? (
                                        <>
                                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-red-500 h-full transition-all duration-300" style={{width: `${(e.hp/e.maxHp)*100}%`}}></div>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                                <span>HP:{e.hp}/{e.maxHp}</span>
                                                <span>攻:{e.atk} 防:{e.def} 速:{e.spd}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-xs text-red-500 font-bold text-center mt-1">撃破</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
            `}} />
        </div>
    );
}
