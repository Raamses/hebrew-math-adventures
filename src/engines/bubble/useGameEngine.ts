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
    const lastSpawnTime = useRef<number>(0);
    const lastPowerUpSpawnTime = useRef<number>(0);
    const gameStateRef = useRef(gameState);
    const entitiesRef = useRef<BubbleEntity[]>([]);
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
        const bossProps = behavior.generateNext(currentConfig);

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

    const spawnSystem = useCallback((time: number) => {
        // Read latest config from ref so adaptive difficulty changes to
        // spawnIntervalMs and baseVelocity take effect without recreating the callback.
        const currentConfig = configRef.current;

        // frenzy multiplier: 0.6x interval (40% faster)
        let currentInterval = gameStateRef.current.isFrenzy
            ? currentConfig.spawnIntervalMs * 0.6
            : currentConfig.spawnIntervalMs;

        // Catch-Up Mechanic:
        // If screen is empty (low count), spawn faster to refill
        let activeCount = 0;
        const currentEntities = entitiesRef.current;
        for (let i = 0; i < currentEntities.length; i++) {
            if (!currentEntities[i].isPopped) {
                activeCount++;
            }
        }

        if (activeCount < currentConfig.maxOnScreen - 2) {
            // 50% faster if we have gaps to fill
            currentInterval = currentInterval * 0.5;
        }

        const progressRatio = currentConfig.winCondition.value > 0
            ? gameStateRef.current.targetsPopped / currentConfig.winCondition.value
            : 0;
        const speedMultiplier = Math.min(1.4, 1 + (progressRatio * 0.4));
        currentInterval = currentInterval / speedMultiplier;

        if (time - lastSpawnTime.current <= currentInterval) return;

        // When boss is on screen, reduce normal bubble spawns (just distractors for ambiance)
        const effectiveMaxOnScreen = bossOnScreenRef.current
            ? Math.max(2, Math.floor(currentConfig.maxOnScreen * 0.4))
            : currentConfig.maxOnScreen;

        if (activeCount >= effectiveMaxOnScreen) return;

        // --- Power-Up Spawn Check ---
        const powerUpInterval = currentConfig.powerUpSpawnIntervalMs ?? POWER_UP_SPAWN_INTERVAL_MS;
        const timeSinceLastPowerUp = time - lastPowerUpSpawnTime.current;
        const shouldSpawnPowerUp = timeSinceLastPowerUp >= powerUpInterval && activeCount < currentConfig.maxOnScreen;

        if (shouldSpawnPowerUp) {
            // Spawn a power-up bubble instead of a normal one
            const powerUpType = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];

            // Collision avoidance (same as normal bubbles)
            // Safe range: 8-92vw to keep bubbles fully visible
            let spawnX = Math.random() * 84 + 8;
            const minDistanceVw = 22;
            const effectiveMin = activeCount >= currentConfig.maxOnScreen - 1 ? minDistanceVw * 0.6 : minDistanceVw;
            for (let attempt = 0; attempt < 5; attempt++) {
                const candidate = Math.random() * 84 + 8;
                const tooClose = entitiesRef.current.some(e =>
                    !e.isPopped && Math.abs(e.x - candidate) < effectiveMin
                );
                if (!tooClose) {
                    spawnX = candidate;
                    break;
                }
                if (attempt === 4) {
                    spawnX = candidate;
                }
            }

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

        // --- Normal Bubble Spawn ---
        // When a boss is on screen, only spawn distractors (no target bubbles)
        // Rainbow Magnet: boost target spawn ratio while active
        let effectiveConfig = currentConfig;
        const ps = gameStateRef.current.powerUpState;
        if (ps?.active && ps.type === 'rainbow_magnet') {
            // 70% target chance (distractorRatio ~0.43 → 1/(0.43+1) ≈ 0.7)
            effectiveConfig = { ...currentConfig, distractorRatio: 0.43 };
        }
        const newBubbleProps = behavior.generateNext(effectiveConfig);
        // If boss is on screen, override: generate a distractor instead of a target
        // We detect target vs distractor by checking if the generated bubble would be "correct"
        // The simplest approach: if boss is on screen, generate a distractor value
        // For now we just let generateNext work normally - the boss itself contains the target answer
        // and the normal spawn will add variety. But we want to avoid spawning the SAME answer as the boss.
        // We'll handle this by checking after generation.

        // Collision avoidance: try up to 5 positions
        // Safe range: 8-92vw to keep bubbles fully visible
        const minDistanceVw = 22;
        let spawnX = Math.random() * 84 + 8;
        const effectiveMin = activeCount >= currentConfig.maxOnScreen - 1 ? minDistanceVw * 0.6 : minDistanceVw;
        for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = Math.random() * 84 + 8;
            const tooClose = entitiesRef.current.some(e =>
                !e.isPopped && Math.abs(e.x - candidate) < effectiveMin
            );
            if (!tooClose) {
                spawnX = candidate;
                break;
            }
            if (attempt === 4) {
                // All attempts failed — use last candidate, will likely be caught by maxOnScreen check next frame
                spawnX = candidate;
            }
        }

        const newBubble: BubbleEntity = {
            id: `bubble-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            x: spawnX, // 5% to 95% width
            y: 110, // Start below screen
            velocity: currentConfig.baseVelocity,
            isPopped: false,
            createdAt: Date.now(),
            speedMultiplier,
            ...newBubbleProps
        } as BubbleEntity;

        setEntities(prev => {
            const next = [...prev, newBubble];
            entitiesRef.current = next;
            return next;
        });
        lastSpawnTime.current = time;
    }, [behavior]);

    const cleanupSystem = useCallback(() => {
        const now = Date.now();

        // Performance Optimization: Pre-check before enqueueing a React state update at 60fps
        let needsCleanup = false;
        const currentEntities = entitiesRef.current;
        for (let i = 0; i < currentEntities.length; i++) {
            const e = currentEntities[i];
            const isOld = (now - e.createdAt) > 30000;
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
                const isOld = (now - e.createdAt) > 30000;
                const isPoppedAndDone = e.isPopped && e.poppedAt && (now - e.poppedAt) > 1000;
                if (!isOld && !isPoppedAndDone) {
                    next.push(e);
                }
            }

            // Sync ref immediately and return next state
            entitiesRef.current = next;
            return next;
        });
    }, []);

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
    };
};