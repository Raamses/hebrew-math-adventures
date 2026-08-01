import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameConfig, GameState, BubbleEntity, IGameBehavior, PowerUpType, PowerUpState } from './types';

// --- Power-Up Constants ---

const POWER_UP_SPAWN_INTERVAL_MS = 15000; // default 15s
export const POWER_UP_TYPES: PowerUpType[] = ['freeze', 'double_points', 'pop_distractors', 'slow_motion', 'lightning_chain', 'rainbow_magnet'];

const POWER_UP_DURATIONS: Record<PowerUpType, number> = {
    freeze: 3000,
    double_points: 5000,
    pop_distractors: 0, // instant
    slow_motion: 4000,
    lightning_chain: 0,    // instant
    rainbow_magnet: 3000,  // 3 seconds of magnet
};

const POWER_UP_EMOJI: Record<PowerUpType, string> = {
    freeze: '❄️',
    double_points: '✨',
    pop_distractors: '💥',
    slow_motion: '🐌',
    lightning_chain: '⚡',
    rainbow_magnet: '🌈',
};

export const getPowerUpEmoji = (type: PowerUpType): string => POWER_UP_EMOJI[type];

// --- Hook ---

export interface BossDefeatResult {
    bossDefeated: true;
    bonusPoints: number;
    level: number;
}

export const useGameEngine = (
    config: GameConfig,
    behavior: IGameBehavior
) => {
    // --- State ---
    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        combo: 0,
        strikes: 0,
        targetsPopped: 0,
        timeLeft: config.winCondition.type === 'time_limit' ? config.winCondition.value : undefined,
        isGameOver: false,
        isVictory: false,
        isFrenzy: false,
        powerUpState: null,
    });

    const [entities, setEntities] = useState<BubbleEntity[]>([]);

    // --- Refs (Mutable state for Game Loop) ---
    const requestRef = useRef<number | undefined>(undefined);
    const lastFrameTime = useRef<number>(0);
    const lastSpawnTime = useRef<number>(0);
    const lastPowerUpSpawnTime = useRef<number>(0);
    const spawnCredits = useRef<number>(0);
    const lastTargetSeenTime = useRef<number>(0);
    const gameStateRef = useRef(gameState);
    const entitiesRef = useRef<BubbleEntity[]>([]);
    // Lane-based spawn placement: divide the 8-92vw range into discrete lanes
    const laneCount = useRef<number>(6);
    const laneOccupied = useRef<boolean[]>([]);
    // Keep a ref of the latest config so the game loop picks up adaptive changes
    // to spawnIntervalMs and baseVelocity without recreating the loop callback.
    const configRef = useRef(config);

    // Sync Refs
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    useEffect(() => { entitiesRef.current = entities; }, [entities]);
    useEffect(() => { configRef.current = config; }, [config]);

    // --- Boss Bubble State ---
    const [bossOnScreen, setBossOnScreen] = useState(false);
    const bossOnScreenRef = useRef(false);
    // Ref for boss bonus calculation (set by BubbleGameContainer via spawnBoss)
    const sessionLevelRefForBoss = useRef(1);

    // Sync boss ref
    useEffect(() => { bossOnScreenRef.current = bossOnScreen; }, [bossOnScreen]);

    // --- Power-Up Helpers ---

    const getEffectiveSpeedMultiplier = useCallback((): number => {
        const ps = gameStateRef.current.powerUpState;
        if (!ps || !ps.active) return 1;
        if (ps.type === 'slow_motion') return 0.3;
        if (ps.type === 'freeze') return 0; // frozen
        return 1;
    }, []);

    const isDoublePointsActive = useCallback((): boolean => {
        const ps = gameStateRef.current.powerUpState;
        return ps?.active && ps.type === 'double_points' || false;
    }, []);

    // --- Boss Spawn ---
    const spawnBoss = useCallback((_level: number): void => {
        const currentConfig = configRef.current;

        // Generate the current target problem to get the answer
        const bossProps = behavior.generateNext(currentConfig, { forceTarget: true });

        // Use the same internalValue as the current target (boss shows the answer)
        const bossBubble: BubbleEntity = {
            id: `boss-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            x: 50, // Center of screen
            y: 110,
            content: bossProps.content ?? '🛡️',
            internalValue: bossProps.internalValue,
            velocity: currentConfig.baseVelocity * 0.3, // Slow
            isPopped: false,
            createdAt: Date.now(),
            speedMultiplier: 0.3,
            variant: 'large',
            isBoss: true,
            bossHealth: 3,
            bossMaxHealth: 3,
        };

        setEntities(prev => {
            const next = [...prev, bossBubble];
            entitiesRef.current = next;
            return next;
        });
        setBossOnScreen(true);
        bossOnScreenRef.current = true;
    }, [behavior]);

    // --- Spawn System ---

    const MAX_BANKED_CREDITS = 3;

    const isTargetEntity = useCallback((e: BubbleEntity): boolean => {
        // Strict filter: don't count popped, power-up, or boss entities
        if (e.isPopped || e.isPowerUp || e.isBoss) return false;
        return behavior.validate(e);
    }, [behavior]);

    const computeLaneCount = useCallback((currentCfg: GameConfig) =>
        Math.min(currentCfg.maxOnScreen, Math.max(3, Math.floor(window.innerWidth / 80)))
    , []);

    const getLaneCenter = (laneIndex: number, count: number): number => {
        // 8-92vw range = 84vw total; lane i center = 8 + (i + 0.5) * (84 / count)
        return 8 + (laneIndex + 0.5) * (84 / count);
    };

    const recomputeLaneOccupancy = useCallback((count: number) => {
        const occupied: boolean[] = new Array(count).fill(false);
        for (const e of entitiesRef.current) {
            if (e.isPopped || e.lane === undefined) continue;
            // Only consider bubbles still near the bottom spawn zone
            if (e.y > 85 && e.lane >= 0 && e.lane < count) {
                occupied[e.lane] = true;
            }
        }
        return occupied;
    }, []);

    const assignFreeLane = useCallback((count: number): number => {
        laneOccupied.current = recomputeLaneOccupancy(count);
        const freeLanes: number[] = [];
        for (let i = 0; i < count; i++) {
            if (!laneOccupied.current[i]) freeLanes.push(i);
        }
        if (freeLanes.length === 0) {
            // Fall back to least occupied lane
            return Math.floor(Math.random() * count);
        }
        return freeLanes[Math.floor(Math.random() * freeLanes.length)];
    }, [recomputeLaneOccupancy]);

    const spawnSystem = useCallback((time: number) => {
        // Seed frame timing on first callback so we don't accumulate dt from 0
        if (lastFrameTime.current === 0) {
            lastFrameTime.current = time;
            lastSpawnTime.current = time;
            lastTargetSeenTime.current = time; // Seed safety net so it doesn't fire on cold start
        }

        // Per-frame delta
        const dt = time - lastFrameTime.current;
        lastFrameTime.current = time;

        // Tab backgrounded: reset credits and skip accumulation this frame
        if (dt > 2000) {
            spawnCredits.current = 0;
            return;
        }

        // Read latest config from ref so adaptive difficulty changes to
        // spawnIntervalMs and baseVelocity take effect without recreating the callback.
        const currentConfig = configRef.current;

        // frenzy multiplier: 0.6x interval (40% faster)
        let currentInterval = gameStateRef.current.isFrenzy
            ? currentConfig.spawnIntervalMs * 0.6
            : currentConfig.spawnIntervalMs;

        let activeCount = 0;
        let activeTargetCount = 0;
        const currentEntities = entitiesRef.current;
        for (let i = 0; i < currentEntities.length; i++) {
            const e = currentEntities[i];
            if (!e.isPopped) {
                activeCount++;
                if (isTargetEntity(e)) {
                    activeTargetCount++;
                }
            }
        }

        const comboBonus = Math.min(0.3, gameStateRef.current.combo * 0.02);
        let timeBonus = 0;
        if (currentConfig.winCondition.type === 'time_limit' && currentConfig.winCondition.value > 0) {
            const timeLeft = gameStateRef.current.timeLeft ?? currentConfig.winCondition.value;
            const elapsed = currentConfig.winCondition.value - timeLeft;
            timeBonus = (elapsed / currentConfig.winCondition.value) * 0.2;
        }
        const speedMultiplier = Math.min(1.6, 1 + comboBonus + timeBonus);
        currentInterval = currentInterval / speedMultiplier;

        // Credit accumulator scheduling
        spawnCredits.current += dt / currentInterval;
        spawnCredits.current = Math.min(spawnCredits.current, MAX_BANKED_CREDITS);

        // When boss is on screen, reduce normal bubble spawns (just distractors for ambiance)
        const effectiveMaxOnScreen = bossOnScreenRef.current
            ? Math.max(2, Math.floor(currentConfig.maxOnScreen * 0.4))
            : currentConfig.maxOnScreen;

        if (activeCount >= effectiveMaxOnScreen) return;
        if (spawnCredits.current < 1) return;

        // --- Power-Up Spawn Check ---
        const powerUpInterval = currentConfig.powerUpSpawnIntervalMs ?? POWER_UP_SPAWN_INTERVAL_MS;
        const timeSinceLastPowerUp = time - lastPowerUpSpawnTime.current;
        const shouldSpawnPowerUp = timeSinceLastPowerUp >= powerUpInterval && activeCount < currentConfig.maxOnScreen;

        if (shouldSpawnPowerUp) {
            spawnCredits.current -= 1;
            // Spawn a power-up bubble instead of a normal one
            const powerUpType = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];

            // Lane-based spawn placement (replaces random X + collision avoidance)
            laneCount.current = computeLaneCount(currentConfig);
            const powerUpLane = assignFreeLane(laneCount.current);
            const jitter = (Math.random() - 0.5) * 4; // ±2vw organic jitter
            const spawnX = Math.max(8, Math.min(92, getLaneCenter(powerUpLane, laneCount.current) + jitter));

            const newPowerUpBubble: BubbleEntity = {
                id: `powerup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                x: spawnX,
                y: 110,
                content: POWER_UP_EMOJI[powerUpType],
                internalValue: powerUpType,
                velocity: currentConfig.baseVelocity,
                isPopped: false,
                createdAt: Date.now(),
                speedMultiplier,
                variant: 'medium',
                isPowerUp: true,
                powerUpType,
                lane: powerUpLane,
            };

            setEntities(prev => {
                const next = [...prev, newPowerUpBubble];
                entitiesRef.current = next;
                return next;
            });
            lastSpawnTime.current = time;
            lastPowerUpSpawnTime.current = time;
            return;
        }

        // --- Normal Bubble Spawn (multi-credit loop) ---
        let spawnIndex = 0;
        while (spawnCredits.current >= 1 && activeCount < effectiveMaxOnScreen) {
            // Target safety net: if no active targets for > 6s, force the next spawn to be a target
            let forceTarget = false;
            if (activeTargetCount === 0 && lastTargetSeenTime.current !== 0 && time - lastTargetSeenTime.current > 6000) {
                forceTarget = true;
            }

            const newBubbleProps = behavior.generateNext(currentConfig, forceTarget ? { forceTarget: true } : undefined);

            // Clear force after exactly one forced target and record we saw a target
            if (forceTarget) {
                activeTargetCount += 1;
                lastTargetSeenTime.current = time;
            }

            // Lane-based spawn placement (replaces random X + collision avoidance)
            laneCount.current = computeLaneCount(currentConfig);
            const bubbleLane = assignFreeLane(laneCount.current);
            const jitter = (Math.random() - 0.5) * 4; // ±2vw organic jitter
            let spawnX = getLaneCenter(bubbleLane, laneCount.current) + jitter;
            // If this is a multi-credit burst, stagger Y so they don't stack exactly
            const spawnY = 110 + (spawnIndex * 12);
            // Slightly vary x per bubble even within the same lane for organic look
            spawnX += (Math.random() - 0.5) * 2;
            // Clamp to 8-92vw safe boundary (prevents edge drift from jitter + offset)
            spawnX = Math.max(8, Math.min(92, spawnX));

            const newBubble: BubbleEntity = {
                id: `bubble-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                x: spawnX,
                y: spawnY,
                velocity: currentConfig.baseVelocity,
                isPopped: false,
                createdAt: Date.now(),
                speedMultiplier,
                lane: bubbleLane,
                ...newBubbleProps
            } as BubbleEntity;

            setEntities(prev => {
                const next = [...prev, newBubble];
                entitiesRef.current = next;
                return next;
            });

            activeCount++;
            spawnCredits.current -= 1;
            spawnIndex++;

            // Update target bookkeeping when a real target spawns
            // Use behavior.validate() instead of reaching into private fields
            if (!forceTarget) {
                const testEntity = { ...newBubble, internalValue: newBubbleProps.internalValue } as BubbleEntity;
                if (isTargetEntity(testEntity)) {
                    lastTargetSeenTime.current = time;
                    activeTargetCount += 1;
                }
            }
        }

        lastSpawnTime.current = time;
    }, [behavior, isTargetEntity]);

    const cleanupSystem = useCallback(() => {
        const now = Date.now();

        // Asymmetric despawn TTL: targets live longer, distractors shorter
        const getTtlForEntity = (e: BubbleEntity): number => {
            if (e.isPopped || e.isPowerUp || e.isBoss) return 30000;
            return isTargetEntity(e) ? 35000 : 25000;
        };

        // Performance Optimization: Pre-check before enqueueing a React state update at 60fps
        let needsCleanup = false;
        const currentEntities = entitiesRef.current;
        for (let i = 0; i < currentEntities.length; i++) {
            const e = currentEntities[i];
            const ttl = getTtlForEntity(e);
            const isOld = (now - e.createdAt) > ttl;
            const isPoppedAndDone = e.isPopped && e.poppedAt && (now - e.poppedAt) > 1000;
            if (isOld || isPoppedAndDone) {
                needsCleanup = true;
                break;
            }
        }

        if (!needsCleanup) return;

        setEntities(prev => {
            const next = [];
            for (let i = 0; i < prev.length; i++) {
                const e = prev[i];
                const ttl = getTtlForEntity(e);
                const isOld = (now - e.createdAt) > ttl;
                const isPoppedAndDone = e.isPopped && e.poppedAt && (now - e.poppedAt) > 1000;
                if (!isOld && !isPoppedAndDone) {
                    next.push(e);
                }
            }

            // Sync ref immediately and return next state
            entitiesRef.current = next;
            return next;
        });
    }, [isTargetEntity]);

    // --- Power-Up Expiry Check ---
    const checkPowerUpExpiry = useCallback(() => {
        const ps = gameStateRef.current.powerUpState;
        if (ps && ps.active && Date.now() >= ps.expiresAt) {
            setGameState(prev => {
                const next = { ...prev, powerUpState: null };
                gameStateRef.current = next;
                return next;
            });
        }
    }, []);

    // --- Activate Power-Up Effect ---
    const activatePowerUp = useCallback((type: PowerUpType): void => {
        const duration = POWER_UP_DURATIONS[type];
        const now = Date.now();

        if (type === 'pop_distractors') {
            // Instant effect: pop all non-target bubbles (they just disappear, no score)
            setEntities(prev => {
                const next: BubbleEntity[] = [];
                for (const e of prev) {
                    // Keep target bubbles and already-popped ones; remove distractors
                    const isTarget = behavior.validate(e);
                    if (isTarget || e.isPopped || e.isPowerUp) {
                        next.push(e);
                    } else {
                        // Mark as popped so they visually disappear
                        next.push({ ...e, isPopped: true, poppedAt: now });
                    }
                }
                entitiesRef.current = next;
                return next;
            });
            // No ongoing state needed for instant effect
            setGameState(prev => {
                const next = { ...prev, powerUpState: null };
                gameStateRef.current = next;
                return next;
            });
            return;
        }

        // --- Lightning Chain (instant effect) ---
        // Pops the 3 nearest distractor bubbles to center and awards bonus points
        if (type === 'lightning_chain') {
            setEntities(prev => {
                const next = [...prev];
                // Find all unpopped, non-target, non-powerup, non-boss bubbles
                const distractors: { index: number; x: number }[] = [];
                for (let i = 0; i < next.length; i++) {
                    const e = next[i];
                    if (!e.isPopped && !e.isPowerUp && !e.isBoss) {
                        const isTarget = behavior.validate(e);
                        if (!isTarget) {
                            distractors.push({ index: i, x: e.x });
                        }
                    }
                }
                // Sort by distance to center (x=50) and pop the 3 closest
                distractors.sort((a, b) => Math.abs(a.x - 50) - Math.abs(b.x - 50));
                const toPop = distractors.slice(0, 3);
                for (const d of toPop) {
                    next[d.index] = { ...next[d.index], isPopped: true, poppedAt: now };
                }
                entitiesRef.current = next;
                return next;
            });
            // Award small score bonus for lightning chain
            setGameState(prev => {
                const next = { ...prev, score: prev.score + 30 };
                gameStateRef.current = next;
                return next;
            });
            return;
        }

        // --- Rainbow Magnet (timed effect) ---
        // While active, target spawn ratio is boosted (more targets = easier to score)
        if (type === 'rainbow_magnet') {
            const newPowerUpState: PowerUpState = {
                type,
                active: true,
                expiresAt: now + duration,
            };
            setGameState(prev => {
                const next = { ...prev, powerUpState: newPowerUpState };
                gameStateRef.current = next;
                return next;
            });
            return;
        }

        // For timed effects (freeze, double_points, slow_motion)
        const newPowerUpState: PowerUpState = {
            type,
            active: true,
            expiresAt: now + duration,
        };

        setGameState(prev => {
            const next = { ...prev, powerUpState: newPowerUpState };
            gameStateRef.current = next;
            return next;
        });
    }, [behavior]);

    // --- Timer Countdown (for time_limit / Blitz mode) ---
    const lastTimerTickRef = useRef<number>(0);
    const timerSystem = useCallback((time: number) => {
        const cfg = configRef.current;
        if (cfg.winCondition.type !== 'time_limit') return;
        if (gameStateRef.current.isGameOver) return;

        // Tick every ~1000ms (using rAF time which is in ms)
        if (time - lastTimerTickRef.current < 1000) return;
        lastTimerTickRef.current = time;

        setGameState(prev => {
            const newTimeLeft = (prev.timeLeft ?? 0) - 1;
            if (newTimeLeft <= 0) {
                const next = { ...prev, timeLeft: 0, isVictory: true, isGameOver: true };
                gameStateRef.current = next;
                return next;
            }
            const next = { ...prev, timeLeft: newTimeLeft };
            gameStateRef.current = next;
            return next;
        });
    }, []);

    // --- Game Loop ---
    const update = useCallback(function loop(time: number) {
        if (gameStateRef.current.isGameOver) return;

        spawnSystem(time);
        cleanupSystem();
        checkPowerUpExpiry();
        timerSystem(time);

        requestRef.current = requestAnimationFrame(loop);
    }, [spawnSystem, cleanupSystem, checkPowerUpExpiry, timerSystem]);

    // Start/Stop Loop
    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [update]);

    // --- Handlers ---

    const handlePop = useCallback((id: string): boolean | undefined | BossDefeatResult => {
        const target = entitiesRef.current.find(e => e.id === id);
        if (!target || target.isPopped) return undefined;

        // --- Power-Up Bubble Handling ---
        if (target.isPowerUp && target.powerUpType) {
            // 1. Visual pop
            setEntities(prev => {
                const index = prev.findIndex(e => e.id === id);
                if (index === -1) return prev;
                const next = [...prev];
                next[index] = { ...next[index], isPopped: true, poppedAt: Date.now() };
                entitiesRef.current = next;
                return next;
            });

            // 2. Activate the power-up effect
            activatePowerUp(target.powerUpType);

            // 3. Return undefined to signal "not a normal answer" (no score change, no strike)
            return undefined;
        }

        // --- Boss Bubble Handling ---
        if (target.isBoss) {
            const isCorrect = behavior.validate(target);

            if (isCorrect) {
                // Decrement boss health
                const currentHealth = target.bossHealth ?? 1;
                const newHealth = currentHealth - 1;

                if (newHealth <= 0) {
                    // Boss defeated!
                    const level = sessionLevelRefForBoss.current;
                    const bonusPoints = 500 * level;

                    // Visual pop
                    setEntities(prev => {
                        const index = prev.findIndex(e => e.id === id);
                        if (index === -1) return prev;
                        const next = [...prev];
                        next[index] = { ...next[index], isPopped: true, poppedAt: Date.now(), bossHealth: 0 };
                        entitiesRef.current = next;
                        return next;
                    });

                    // Clear boss state
                    setBossOnScreen(false);
                    bossOnScreenRef.current = false;

                    // Award bonus points
                    setGameState(prev => {
                        const nextGameState: GameState = {
                            ...prev,
                            score: prev.score + bonusPoints,
                            combo: prev.combo + 1,
                            targetsPopped: prev.targetsPopped + 1,
                            isFrenzy: prev.combo + 1 >= 5,
                        };
                        gameStateRef.current = nextGameState;
                        return nextGameState;
                    });

                    return { bossDefeated: true, bonusPoints, level } as BossDefeatResult;
                } else {
                    // Boss hit but not defeated — show hit reaction, keep going
                    setEntities(prev => {
                        const index = prev.findIndex(e => e.id === id);
                        if (index === -1) return prev;
                        const next = [...prev];
                        next[index] = { ...next[index], bossHealth: newHealth };
                        entitiesRef.current = next;
                        return next;
                    });

                    // Small score for hitting boss
                    setGameState(prev => {
                        const newCombo = prev.combo + 1;
                        const nextGameState: GameState = {
                            ...prev,
                            combo: newCombo,
                            score: prev.score + 25,
                            isFrenzy: newCombo >= 5,
                        };
                        gameStateRef.current = nextGameState;
                        return nextGameState;
                    });

                    return true;
                }
            } else {
                // Wrong answer on boss — strike, no damage to boss
                setGameState(prev => {
                    const nextGameState: GameState = {
                        ...prev,
                        combo: 0,
                        strikes: prev.strikes + 1,
                    };
                    gameStateRef.current = nextGameState;
                    return nextGameState;
                });
                return false;
            }
        }

        // --- Normal Bubble Handling ---
        const isCorrect = behavior.validate(target);

        // 2. Visual Update (Optimistic)
        setEntities(prev => {
            const index = prev.findIndex(e => e.id === id);
            if (index === -1) return prev;
            const next = [...prev];
            next[index] = { ...next[index], isPopped: true, poppedAt: Date.now() };
            entitiesRef.current = next; // Synchronize immediately
            return next;
        });

        // 3. Game State Update
        setGameState(prev => {
            const newCombo = isCorrect ? prev.combo + 1 : 0;
            const baseScoreBonus = isCorrect ? (10 * (1 + newCombo * 0.1)) : 0;
            // Combo milestone multiplier: Frenzy (combo≥5) = 2x, Super (≥10) = 3x, Mega (≥15) = 5x
            const frenzyMultiplier = newCombo >= 15 ? 5 : newCombo >= 10 ? 3 : newCombo >= 5 ? 2 : 1;
            // Double points power-up: 2x score (stacks with frenzy)
            const doublePointsMultiplier = (prev.powerUpState?.active && prev.powerUpState.type === 'double_points') ? 2 : 1;
            const scoreBonus = isCorrect ? baseScoreBonus * frenzyMultiplier * doublePointsMultiplier : 0;

            const isFrenzy = isCorrect ? newCombo >= 5 : false;

            const nextGameState: GameState = {
                ...prev,
                combo: newCombo,
                score: prev.score + scoreBonus,
                strikes: isCorrect ? prev.strikes : prev.strikes + 1,
                targetsPopped: isCorrect ? prev.targetsPopped + 1 : prev.targetsPopped,
                isFrenzy,
            };

            // Win Condition
            if (config.winCondition.type === 'target_count' && nextGameState.targetsPopped >= config.winCondition.value) {
                nextGameState.isVictory = true;
                nextGameState.isGameOver = true;
            }

            // Fail Condition
            if (config.failCondition.type === 'strikes' && config.failCondition.value && nextGameState.strikes >= config.failCondition.value) {
                nextGameState.isGameOver = true;
            }

            gameStateRef.current = nextGameState; // Synchronize immediately
            return nextGameState;
        });

        return isCorrect;
    }, [config, behavior, activatePowerUp, sessionLevelRefForBoss]);

    const handleOffScreen = useCallback((id: string) => {
        setEntities(prev => {
            const next = prev.filter(e => e.id !== id);
            entitiesRef.current = next; // Synchronize immediately
            return next;
        });
    }, []);

    // --- Boss Target Update ---
    const updateBossTarget = useCallback((newValue: number): void => {
        setEntities(prev => {
            const next = [...prev];
            const bossIdx = next.findIndex(e => e.isBoss && !e.isPopped);
            if (bossIdx !== -1) {
                next[bossIdx] = { ...next[bossIdx], internalValue: newValue, content: newValue };
                entitiesRef.current = next;
            }
            return next;
        });
    }, []);

    return {
        gameState,
        entities,
        handlePop,
        handleOffScreen,
        getEffectiveSpeedMultiplier,
        isDoublePointsActive,
        spawnBoss,
        bossOnScreen,
        sessionLevelRefForBoss,
        updateBossTarget,
    };
};
