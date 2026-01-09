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

    const spawnSystem = (time: number) => {
        // frenzy multiplier: 0.6x interval (40% faster)
        let currentInterval = gameStateRef.current.isFrenzy
            ? config.spawnIntervalMs * 0.6
            : config.spawnIntervalMs;

        // Catch-Up Mechanic:
        // If screen is empty (low count), spawn faster to refill
        const activeCount = entitiesRef.current.filter(e => !e.isPopped).length;
        if (activeCount < config.maxOnScreen - 2) {
            // 50% faster if we have gaps to fill
            currentInterval = currentInterval * 0.5;
        }

        if (time - lastSpawnTime.current <= currentInterval) return;

        if (activeCount >= config.maxOnScreen) return;

        // Create new bubble
        const newBubbleProps = behavior.generateNext(config);
        const newBubble: BubbleEntity = {
            id: `bubble-${Date.now()}-${Math.random()}`,
            x: Math.random() * 90 + 5, // 5% to 95% width
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
    };

    const cleanupSystem = () => {
        const now = Date.now();
        // Remove entities older than 30s OR popped more than 1s ago
        setEntities(prev => {
            const next = prev.filter(e => {
                const isOld = (now - e.createdAt) > 30000;
                const isPoppedAndDone = e.isPopped && e.poppedAt && (now - e.poppedAt) > 1000;
                return !isOld && !isPoppedAndDone;
            });

            // Performance Fix: Only update state if length changed
            if (next.length !== prev.length) {
                entitiesRef.current = next; // Sync ref immediately
                return next;
            }
            return prev;
        });
    };

    // --- Game Loop ---
    const update = useCallback((time: number) => {
        if (gameStateRef.current.isGameOver) return;

        spawnSystem(time);
        cleanupSystem();

        requestRef.current = requestAnimationFrame(update);
    }, [config, behavior]);

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
