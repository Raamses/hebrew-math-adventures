import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameConfig, GameState, BubbleEntity, IGameBehavior } from './types';

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
        isFrenzy: false
    });

    const [entities, setEntities] = useState<BubbleEntity[]>([]);

    // --- Refs (Mutable state for Game Loop) ---
    const requestRef = useRef<number | undefined>(undefined);
    const lastSpawnTime = useRef<number>(0);
    const gameStateRef = useRef(gameState);
    const entitiesRef = useRef<BubbleEntity[]>([]);

    // Sync Refs
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    useEffect(() => { entitiesRef.current = entities; }, [entities]);

    // --- Systems ---

    const spawnSystem = useCallback((time: number) => {
        // frenzy multiplier: 0.6x interval (40% faster)
        let currentInterval = gameStateRef.current.isFrenzy
            ? config.spawnIntervalMs * 0.6
            : config.spawnIntervalMs;

        // Catch-Up Mechanic:
        // If screen is empty (low count), spawn faster to refill
        let activeCount = 0;
        const currentEntities = entitiesRef.current;
        for (let i = 0; i < currentEntities.length; i++) {
            if (!currentEntities[i].isPopped) {
                activeCount++;
            }
        }

        if (activeCount < config.maxOnScreen - 2) {
            // 50% faster if we have gaps to fill
            currentInterval = currentInterval * 0.5;
        }

        if (time - lastSpawnTime.current <= currentInterval) return;

        if (activeCount >= config.maxOnScreen) return;

        // Create new bubble
        const newBubbleProps = behavior.generateNext(config);

        // Use Math.random for UI transient entity generation as Web Crypto is undefined in HTTP
        const randomFallback = Math.random();

        const newBubble: BubbleEntity = {
            id: `bubble-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            x: randomFallback * 90 + 5, // 5% to 95% width
            y: 110, // Start below screen
            velocity: config.baseVelocity,
            isPopped: false,
            createdAt: Date.now(),
            ...newBubbleProps
        } as BubbleEntity;

        setEntities(prev => {
            const next = [...prev, newBubble];
            entitiesRef.current = next;
            return next;
        });
        lastSpawnTime.current = time;
    }, [config, behavior]);

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

    // --- Game Loop ---
    const update = useCallback(function loop(time: number) {
        if (gameStateRef.current.isGameOver) return;

        spawnSystem(time);
        cleanupSystem();

        requestRef.current = requestAnimationFrame(loop);
    }, [spawnSystem, cleanupSystem]);

    // Start/Stop Loop
    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [update]);

    // --- Handlers ---

    const handlePop = useCallback((id: string) => {
        const target = entitiesRef.current.find(e => e.id === id);
        if (!target || target.isPopped) return;

        // 1. Logic Check
        const isCorrect = behavior.validate(target);

        // 2. Visual Update (Optimistic)
        setEntities(prev => prev.map(e => e.id === id ? { ...e, isPopped: true, poppedAt: Date.now() } : e));

        // 3. Game State Update
        setGameState(prev => {
            const newCombo = isCorrect ? prev.combo + 1 : 0;
            const scoreBonus = isCorrect ? (10 * (1 + newCombo * 0.1)) : 0;

            const isFrenzy = isCorrect ? newCombo >= 5 : false;

            const nextmnState = {
                ...prev,
                combo: newCombo,
                score: prev.score + scoreBonus,
                strikes: isCorrect ? prev.strikes : prev.strikes + 1,
                targetsPopped: isCorrect ? prev.targetsPopped + 1 : prev.targetsPopped,
                isFrenzy
            };

            // Win Condition
            if (config.winCondition.type === 'target_count' && nextmnState.targetsPopped >= config.winCondition.value) {
                nextmnState.isVictory = true;
                nextmnState.isGameOver = true;
            }

            // Fail Condition
            if (config.failCondition.type === 'strikes' && config.failCondition.value && nextmnState.strikes >= config.failCondition.value) {
                nextmnState.isGameOver = true;
            }

            return nextmnState;
        });

        return isCorrect;
    }, [config, behavior]);

    const handleOffScreen = useCallback((id: string) => {
        setEntities(prev => prev.filter(e => e.id !== id));
    }, []);

    return {
        gameState,
        entities,
        handlePop,
        handleOffScreen
    };
};
