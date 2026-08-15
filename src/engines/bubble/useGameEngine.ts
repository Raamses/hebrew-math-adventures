import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameConfig, GameState, BubbleEntity, IGameBehavior, PowerUpType, PowerUpState, FusionState, MergeEvent } from './types';
import { POWER_UP_CONFIG, FRENZY_CONFIG, SCORING_CONFIG, BUBBLE_ENGINE_CONFIG, FUSION_CONFIG, FRENZY_STAR_CONFIG } from '../../lib/worldConfig';
import { ComboFusionStrategy } from './strategies/ComboFusionStrategy';

// --- Power-Up Constants ---

// POWER_UP_CONFIG.SPAWN_INTERVAL_MS now from worldConfig (POWER_UP_CONFIG.SPAWN_INTERVAL_MS)
export const POWER_UP_TYPES = POWER_UP_CONFIG.TYPES;

const POWER_UP_DURATIONS = POWER_UP_CONFIG.DURATIONS;

const POWER_UP_EMOJI = POWER_UP_CONFIG.EMOJI;

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

    // --- Combo Fusion State ---
    const isFusionMode = behavior instanceof ComboFusionStrategy;
    const [fusionState, setFusionState] = useState<FusionState>({
        fusionStreak: 0,
        maxFusionStreak: 0,
        fusionBubblesSpawned: 0,
        totalMerges: 0,
        totalMergePoints: 0,
        fusionBubbleActive: false,
    });
    const [mergeEvents, setMergeEvents] = useState<MergeEvent[]>([]);
    const fusionStateRef = useRef(fusionState);
    useEffect(() => { fusionStateRef.current = fusionState; }, [fusionState]);

    // --- Refs (Mutable state for Game Loop) ---
    const requestRef = useRef<number | undefined>(undefined);
    const lastFrameTime = useRef<number>(0);
    const lastSpawnTime = useRef<number>(0);
    const spawnCredits = useRef<number>(0);
    // Tracks the highest frenzy threshold already rewarded with a Frenzy Star.
    // Reset to 0 when combo drops below the threshold so the next crossing
    // fires again. Ensures the star spawns once per threshold crossing, not
    // every frame.
    const frenzyStarRewardedRef = useRef<number>(0);
    const lastTargetSeenTime = useRef<number>(0);
    const gameStateRef = useRef(gameState);
    const entitiesRef = useRef<BubbleEntity[]>([]);
    // Lane-based spawn placement: divide the 8-92vw range into discrete lanes
    const laneCount = useRef<number>(BUBBLE_ENGINE_CONFIG.LANE_COUNT);
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
        // freeze / slow_motion were removed from the power-up set. No speed
        // modifiers remain, so the effective multiplier is always 1.
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
            y: BUBBLE_ENGINE_CONFIG.SPAWN_Y_OFFSET,
            content: bossProps.content ?? '🛡️',
            internalValue: bossProps.internalValue,
            velocity: currentConfig.baseVelocity * BUBBLE_ENGINE_CONFIG.BOSS_VELOCITY_MULTIPLIER, // Slow
            isPopped: false,
            createdAt: Date.now(),
            speedMultiplier: BUBBLE_ENGINE_CONFIG.BOSS_VELOCITY_MULTIPLIER,
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

    const MAX_BANKED_CREDITS = POWER_UP_CONFIG.MAX_BANKED_CREDITS;

    const isTargetEntity = useCallback((e: BubbleEntity): boolean => {
        // Strict filter: don't count popped, power-up, or boss entities
        if (e.isPopped || e.isPowerUp || e.isBoss) return false;
        return behavior.validate(e);
    }, [behavior]);

    const computeLaneCount = useCallback((currentCfg: GameConfig) =>
        // M2 Fix: Guard against SSR/non-browser environments where window is undefined.
        Math.min(currentCfg.maxOnScreen, Math.max(3, Math.floor((typeof window !== 'undefined' ? window.innerWidth : 480) / 80)))
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

    // --- Frenzy Star Spawn (combo-triggered power-up) ---
    // Spawns a single bonus power-up bubble when the player's combo crosses
    // FRENZY_THRESHOLD. This is a one-shot reward OUTSIDE the normal credit
    // loop — it does not consume spawn credits and does not depend on a timer.
    // The caller (handlePop) guards against firing more than once per crossing.
    const spawnFrenzyStar = useCallback((): void => {
        const currentConfig = configRef.current;

        // Pick a random power-up type from the trimmed 3-type set.
        const powerUpType = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];

        // Lane-based spawn placement (replaces random X + collision avoidance)
        laneCount.current = computeLaneCount(currentConfig);
        const starLane = assignFreeLane(laneCount.current);
        const jitter = (Math.random() - 0.5) * 4; // ±2vw organic jitter
        const spawnX = Math.max(8, Math.min(92, getLaneCenter(starLane, laneCount.current) + jitter));

        const starBubble: BubbleEntity = {
            id: `frenzystar-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            x: spawnX,
            y: BUBBLE_ENGINE_CONFIG.SPAWN_Y_OFFSET,
            content: POWER_UP_EMOJI[powerUpType],
            internalValue: powerUpType,
            velocity: currentConfig.baseVelocity * FRENZY_STAR_CONFIG.VELOCITY_MULTIPLIER,
            isPopped: false,
            createdAt: Date.now(),
            speedMultiplier: FRENZY_STAR_CONFIG.VELOCITY_MULTIPLIER,
            variant: FRENZY_STAR_CONFIG.VARIANT, // 'large' — bigger, easier to spot
            isPowerUp: true,
            powerUpType,
            lane: starLane,
        };

        setEntities(prev => {
            const next = [...prev, starBubble];
            entitiesRef.current = next;
            return next;
        });
    }, [computeLaneCount, assignFreeLane]);

    const spawnSystem = useCallback((time: number) => {
        // Seed frame timing on first callback so we don't accumulate dt from 0
        if (lastFrameTime.current === 0) {
            lastFrameTime.current = time;
            lastSpawnTime.current = time;
            lastTargetSeenTime.current = time; // Seed safety net so it doesn't fire on cold start
            // M1 Fix: Initial bubble burst — seed 3 credits so the screen
            // populates in the first 1-2 frames instead of waiting 4-8s.
            spawnCredits.current = BUBBLE_ENGINE_CONFIG.INITIAL_SPAWN_CREDITS;
        }

        // Per-frame delta
        const dt = time - lastFrameTime.current;
        lastFrameTime.current = time;

        // Tab backgrounded: reset credits and skip accumulation this frame
        if (dt > BUBBLE_ENGINE_CONFIG.STALE_FRAME_THRESHOLD_MS) {
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

        // Boss mode: reduce spawn interval by 30% so answer bubbles appear faster
        if (bossOnScreenRef.current) {
            currentInterval = currentInterval * BUBBLE_ENGINE_CONFIG.BOSS_SPAWN_INTERVAL_FACTOR;
        }

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

        const comboBonus = Math.min(BUBBLE_ENGINE_CONFIG.COMBO_BONUS_CAP, gameStateRef.current.combo * BUBBLE_ENGINE_CONFIG.COMBO_BONUS_PER_COMBO);
        let timeBonus = 0;
        if (currentConfig.winCondition.type === 'time_limit' && currentConfig.winCondition.value > 0) {
            const timeLeft = gameStateRef.current.timeLeft ?? currentConfig.winCondition.value;
            const elapsed = currentConfig.winCondition.value - timeLeft;
            timeBonus = (elapsed / currentConfig.winCondition.value) * 0.2;
        }
        const speedMultiplier = Math.min(BUBBLE_ENGINE_CONFIG.SPEED_MULTIPLIER_CAP, 1 + comboBonus + timeBonus);
        currentInterval = currentInterval / speedMultiplier;

        // Credit accumulator scheduling
        spawnCredits.current += dt / currentInterval;
        spawnCredits.current = Math.min(spawnCredits.current, MAX_BANKED_CREDITS);

        // When boss is on screen, reduce normal bubble spawns (just distractors for ambiance)
        const effectiveMaxOnScreen = bossOnScreenRef.current
            ? Math.max(BUBBLE_ENGINE_CONFIG.BOSS_MAX_ON_SCREEN_FLOOR, Math.floor(currentConfig.maxOnScreen * BUBBLE_ENGINE_CONFIG.BOSS_MAX_ON_SCREEN_RATIO))
            : currentConfig.maxOnScreen;

        if (activeCount >= effectiveMaxOnScreen) return;
        if (spawnCredits.current < 1) return;

        // NOTE: Timer-based power-up spawning has been REMOVED entirely.
        // Power-ups are now earned as a combo reward — crossing
        // FRENZY_THRESHOLD spawns a one-shot "Frenzy Star" bonus bubble
        // outside the credit loop (see spawnFrenzyStar / handlePop). This
        // makes power-ups legible and satisfying instead of invisible.

        // --- Normal Bubble Spawn (multi-credit loop) ---
        let spawnIndex = 0;
        while (spawnCredits.current >= 1 && activeCount < effectiveMaxOnScreen) {
            // Target safety net: if no active targets for > 3s, force the next spawn to be a target
            let forceTarget = false;
            if (activeTargetCount === 0 && lastTargetSeenTime.current !== 0 && time - lastTargetSeenTime.current > BUBBLE_ENGINE_CONFIG.TARGET_DROUGHT_THRESHOLD_MS) {
                forceTarget = true;
            }
            // Low-target net: if target count < 1 for > 2s, also force target (catches edge case
            // where a target exists but is about to expire and none are queued)
            if (!forceTarget && activeTargetCount < 1 && lastTargetSeenTime.current !== 0 && time - lastTargetSeenTime.current > BUBBLE_ENGINE_CONFIG.LOW_TARGET_THRESHOLD_MS) {
                forceTarget = true;
            }

            const newBubbleProps = behavior.generateNext(currentConfig, forceTarget ? { forceTarget: true } : undefined);

            // Combo Fusion: keep the strategy's fusion streak in sync so spawned
            // target bubbles get isFusion=true once the streak reaches the threshold.
            if (isFusionMode && behavior instanceof ComboFusionStrategy) {
                behavior.setFusionStreak(fusionStateRef.current.fusionStreak);
            }

            // Track fusion bubble spawns for session stats
            if (newBubbleProps.isFusion) {
                setFusionState(prev => ({
                    ...prev,
                    fusionBubblesSpawned: prev.fusionBubblesSpawned + 1,
                    fusionBubbleActive: true,
                }));
            }

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
            const spawnY = BUBBLE_ENGINE_CONFIG.SPAWN_Y_OFFSET + (spawnIndex * BUBBLE_ENGINE_CONFIG.SPAWN_Y_STEP);
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
            // M3 Fix: Plan specifies 22s for distractors (was 25s — undocumented deviation)
            return isTargetEntity(e) ? BUBBLE_ENGINE_CONFIG.TARGET_LIFESPAN_MS : BUBBLE_ENGINE_CONFIG.DISTRACTOR_LIFESPAN_MS;
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

        // NOTE: pop_distractors / freeze / slow_motion were removed from the
        // power-up set (they contradicted the faster/more-bubbles direction).
        // Only lightning_chain, double_points, and rainbow_magnet remain.

        // --- Lightning Chain (instant effect) ---
        // Pops the N nearest distractor bubbles to center and awards bonus points
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
                const toPop = distractors.slice(0, POWER_UP_CONFIG.LIGHTNING_CHAIN_POP_COUNT);
                for (const d of toPop) {
                    next[d.index] = { ...next[d.index], isPopped: true, poppedAt: now };
                }
                entitiesRef.current = next;
                return next;
            });
            // Award small score bonus for lightning chain
            setGameState(prev => {
                const next = { ...prev, score: prev.score + POWER_UP_CONFIG.LIGHTNING_CHAIN_BONUS };
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

        // For timed effects (double_points)
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
                    const bonusPoints = SCORING_CONFIG.BOSS_DEFEAT_BONUS_MULTIPLIER * level;

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
                            isFrenzy: newCombo >= FRENZY_CONFIG.FRENZY_THRESHOLD,
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

        // --- Fusion Bubble Handling (Combo Fusion mode) ---
        // Popping a fusion bubble triggers the chain-merge mechanic: nearby
        // target bubbles are absorbed and converted into bonus points scaled by
        // the current multiplier tier. The fusion streak resets to 0.
        if (target.isFusion && isFusionMode) {
            const multiplier = target.fusionMultiplier ?? 1;
            const tier = (target.fusionTier ?? 0) as 1 | 2 | 3 | 4;

            // Visual pop of the fusion bubble itself
            setEntities(prev => {
                const index = prev.findIndex(e => e.id === id);
                if (index === -1) return prev;
                const next = [...prev];
                next[index] = { ...next[index], isPopped: true, poppedAt: Date.now() };
                entitiesRef.current = next;
                return next;
            });

            // Find nearby unpopped target bubbles to merge (within radius)
            const radius = FUSION_CONFIG.MERGE_RADIUS_PERCENT;
            const maxTargets = FUSION_CONFIG.MAX_MERGE_TARGETS;
            const now = Date.now();
            const consumedIds: string[] = [];
            let mergePoints = 0;

            setEntities(prev => {
                const next = [...prev];
                // Collect candidate targets (unpopped, not fusion, not power-up, not boss)
                const candidates: { index: number; e: BubbleEntity }[] = [];
                for (let i = 0; i < next.length; i++) {
                    const e = next[i];
                    if (e.id === id || e.isPopped || e.isFusion || e.isPowerUp || e.isBoss) continue;
                    const isTarget = behavior.validate(e);
                    if (!isTarget) continue;
                    const dx = Math.abs(e.x - (target.x ?? 50));
                    const dy = Math.abs(e.y - (target.y ?? 0));
                    if (dx <= radius && dy <= radius) {
                        candidates.push({ index: i, e });
                    }
                }
                // Sort by distance (closest first) and cap count
                candidates.sort((a, b) => {
                    const da = Math.abs(a.e.x - (target.x ?? 50)) + Math.abs(a.e.y - (target.y ?? 0));
                    const db = Math.abs(b.e.x - (target.x ?? 50)) + Math.abs(b.e.y - (target.y ?? 0));
                    return da - db;
                });
                const toMerge = candidates.slice(0, maxTargets);

                for (const c of toMerge) {
                    consumedIds.push(c.e.id);
                    next[c.index] = { ...next[c.index], isMerged: true, isPopped: true, poppedAt: now };
                    mergePoints += SCORING_CONFIG.BASE_SCORE_CORRECT;
                }

                entitiesRef.current = next;
                return next;
            });

            // Award merge points (scaled by multiplier) and reset fusion streak
            const totalMergePoints = Math.round(mergePoints * multiplier);
            setGameState(prev => {
                const nextGameState: GameState = {
                    ...prev,
                    score: prev.score + totalMergePoints,
                    combo: prev.combo + 1,
                    targetsPopped: prev.targetsPopped + 1 + consumedIds.length,
                    isFrenzy: prev.combo + 1 >= FRENZY_CONFIG.FRENZY_THRESHOLD,
                };
                gameStateRef.current = nextGameState;
                return nextGameState;
            });

            // Update fusion state: reset streak, record merge
            setFusionState(prev => ({
                ...prev,
                fusionStreak: 0,
                totalMerges: prev.totalMerges + 1,
                totalMergePoints: prev.totalMergePoints + totalMergePoints,
                fusionBubbleActive: false,
            }));

            // Emit a merge event for UI animation
            if (consumedIds.length > 0) {
                const event: MergeEvent = {
                    id: `merge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    centerId: id,
                    consumedIds,
                    centerX: target.x ?? 50,
                    centerY: target.y ?? 0,
                    points: totalMergePoints,
                    multiplier,
                    tier,
                    timestamp: now,
                };
                setMergeEvents(prev => [...prev, event]);
                // Auto-cleanup merge events after animation
                setTimeout(() => {
                    setMergeEvents(prev => prev.filter(ev => ev.id !== event.id));
                }, 1200);
            }

            return true;
        }

        // --- Normal Bubble Handling ---
        // ADR 2026-08-zen-answer-race (Fix 2): Snapshot the target value BEFORE
        // validation. After a correct answer, handleSessionLeveling calls
        // regenerateProblem() which rotates targetValue synchronously. Bubbles
        // already on screen carry the OLD internalValue and would validate as
        // wrong. Using validateAgainst() lets us distinguish:
        //   'correct' — matches current target (normal correct answer)
        //   'stale'   — matches a previous target (was correct before rotation)
        //   'wrong'   — doesn't match any known target (genuine distractor)
        // Stale bubbles are IGNORED (no score change, no strike) instead of
        // being counted as wrong, which was causing the zen-mode "state reset".
        let isCorrect: boolean | undefined;
        let isStale = false;

        if (behavior.getTargetValue && behavior.validateAgainst) {
            const snapshot = behavior.getTargetValue();
            const verdict = behavior.validateAgainst(target, snapshot);
            if (verdict === 'stale') {
                isStale = true;
                isCorrect = undefined; // ignore — not correct, not wrong
            } else {
                isCorrect = verdict === 'correct';
            }
        } else {
            isCorrect = behavior.validate(target);
        }

        // If the bubble is stale (from before a target rotation), pop it
        // visually but don't change score/combo/strikes — it was correct when
        // it was spawned, the player shouldn't be penalized for tapping it.
        if (isStale) {
            setEntities(prev => {
                const index = prev.findIndex(e => e.id === id);
                if (index === -1) return prev;
                const next = [...prev];
                next[index] = { ...next[index], isPopped: true, poppedAt: Date.now() };
                entitiesRef.current = next;
                return next;
            });
            return undefined; // ignored — no score, no strike
        }

        // 2. Visual Update (Optimistic)
        setEntities(prev => {
            const index = prev.findIndex(e => e.id === id);
            if (index === -1) return prev;
            const next = [...prev];
            next[index] = { ...next[index], isPopped: true, poppedAt: Date.now() };
            entitiesRef.current = next; // Synchronize immediately
            return next;
        });

        // --- Frenzy Star trigger (combo-earned power-up) ---
        // Compute the post-pop combo so we can detect a FRENZY_THRESHOLD
        // crossing and spawn a one-shot bonus power-up bubble. Fires only
        // once per crossing (guarded by frenzyStarRewardedRef), and resets
        // when the combo drops below the threshold so the next crossing
        // rewards again.
        const newCombo = isCorrect ? gameStateRef.current.combo + 1 : 0;
        if (isCorrect && newCombo >= FRENZY_CONFIG.FRENZY_THRESHOLD && frenzyStarRewardedRef.current < FRENZY_CONFIG.FRENZY_THRESHOLD) {
            frenzyStarRewardedRef.current = FRENZY_CONFIG.FRENZY_THRESHOLD;
            spawnFrenzyStar();
        } else if (!isCorrect) {
            // Combo broken — allow the next crossing to reward again.
            frenzyStarRewardedRef.current = 0;
        }

        // 3. Game State Update
        setGameState(prev => {
            const newCombo = isCorrect ? prev.combo + 1 : 0;
            const baseScoreBonus = isCorrect ? (SCORING_CONFIG.BASE_SCORE_CORRECT * (1 + newCombo * SCORING_CONFIG.COMBO_SCORE_FACTOR)) : 0;
            // Combo milestone multiplier: Frenzy (combo≥5) = 2x, Super (≥10) = 3x, Mega (≥15) = 5x
            const frenzyMultiplier = newCombo >= FRENZY_CONFIG.MEGA_THRESHOLD ? FRENZY_CONFIG.MEGA_MULTIPLIER : newCombo >= FRENZY_CONFIG.SUPER_THRESHOLD ? FRENZY_CONFIG.SUPER_MULTIPLIER : newCombo >= FRENZY_CONFIG.FRENZY_THRESHOLD ? FRENZY_CONFIG.FRENZY_MULTIPLIER : 1;
            // Double points power-up: 2x score (stacks with frenzy)
            const doublePointsMultiplier = (prev.powerUpState?.active && prev.powerUpState.type === 'double_points') ? 2 : 1;
            const scoreBonus = isCorrect ? baseScoreBonus * frenzyMultiplier * doublePointsMultiplier : 0;

            const isFrenzy = isCorrect ? newCombo >= FRENZY_CONFIG.FRENZY_THRESHOLD : false;

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

        // Combo Fusion: track fusion streak separately from normal combo.
        // Increment on correct, reset on wrong. The strategy reads this to
        // decide whether to spawn fusion bubbles.
        if (isFusionMode) {
            setFusionState(prev => {
                const nextStreak = isCorrect ? prev.fusionStreak + 1 : 0;
                return {
                    ...prev,
                    fusionStreak: nextStreak,
                    maxFusionStreak: Math.max(prev.maxFusionStreak, nextStreak),
                };
            });
        }

        return isCorrect;
    }, [config, behavior, activatePowerUp, sessionLevelRefForBoss, isFusionMode, spawnFrenzyStar]);

    const handleOffScreen = useCallback((id: string) => {
        // Combo Fusion: check if the off-screen bubble was a fusion bubble BEFORE
        // removing it from the list, so we can clear the active flag.
        if (isFusionMode) {
            const wasFusion = entitiesRef.current.some(e => e.id === id && e.isFusion);
            if (wasFusion) {
                setFusionState(prev => ({ ...prev, fusionBubbleActive: false }));
            }
        }
        setEntities(prev => {
            const next = prev.filter(e => e.id !== id);
            entitiesRef.current = next; // Synchronize immediately
            return next;
        });
    }, [isFusionMode]);

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
        // Combo Fusion
        fusionState,
        mergeEvents,
    };
};
