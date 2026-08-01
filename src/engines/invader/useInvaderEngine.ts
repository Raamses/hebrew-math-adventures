import { useState, useEffect, useRef, useCallback } from 'react';
import { MathModule } from '../MathModule';
import type { UserCapabilityProfile } from '../../types/progress';
import { INITIAL_CAPABILITY_PROFILE } from '../../types/progress';
import type { Problem, ArithmeticProblem } from '../../lib/gameLogic';
import type {
    InvaderState,
    InvaderBubble,
    AnswerBubble,
} from './types';
import {
    VICTORY_TIME_MS,
    BOSS_WAVE_INTERVAL_MS,
    SPEED_RAMP_INTERVAL_MS,
    FRENZY_COMBO_THRESHOLD,
    createInitialInvaderState,
} from './types';

// --- Helpers ---

let idCounter = 0;
const genId = (prefix: string): string => `${prefix}-${idCounter++}-${Date.now()}`;

/**
 * Format an arithmetic problem as an equation string with "?" for the unknown.
 */
function formatEquation(problem: Problem): string {
    if (problem.type === 'arithmetic') {
        const ap = problem as ArithmeticProblem;
        if (ap.missing === 'answer') return `${ap.num1} ${ap.operator} ${ap.num2} = ?`;
        if (ap.missing === 'num1') return `? ${ap.operator} ${ap.num2} = ${ap.answer}`;
        if (ap.missing === 'num2') return `${ap.num1} ${ap.operator} ? = ${ap.answer}`;
    }
    if (problem.type === 'compare') {
        return `${(problem as any).num1} ? ${(problem as any).num2}`;
    }
    if (problem.type === 'series') {
        const seq = (problem as any).sequence as (number | null)[];
        return seq.map((v) => (v === null ? '?' : v)).join(', ');
    }
    // Fallback for word/other types
    return `${problem.answer}`;
}

/**
 * Generate wrong answer distractors close to the correct answer.
 */
function generateDistractors(correct: number, count: number): number[] {
    const distractors = new Set<number>();
    let attempts = 0;
    while (distractors.size < count && attempts < 30) {
        attempts++;
        const offset = Math.floor(Math.random() * 6) - 3; // -3 to +3
        const candidate = correct + offset;
        if (candidate >= 0 && candidate !== correct) {
            distractors.add(candidate);
        }
    }
    // If we couldn't generate enough, pad with arbitrary numbers
    while (distractors.size < count) {
        const candidate = Math.max(0, correct + distractors.size + 1);
        if (!distractors.has(candidate) && candidate !== correct) {
            distractors.add(candidate);
        } else {
            distractors.add(candidate + 10);
        }
    }
    return Array.from(distractors);
}

// --- Hook ---

export interface UseInvaderEngineOptions {
    targetLevel: number;
    profile?: UserCapabilityProfile | null;
    onGameOver?: (score: number, lives: number) => void;
    onVictory?: (score: number, lives: number) => void;
}

export const useInvaderEngine = ({
    targetLevel,
    profile,
    onGameOver,
    onVictory,
}: UseInvaderEngineOptions) => {
    const [state, setState] = useState<InvaderState>(createInitialInvaderState);

    // Refs for game loop (avoid stale closures)
    const stateRef = useRef(state);
    const rafRef = useRef<number | undefined>(undefined);
    const lastSpawnRef = useRef<number>(0);
    const lastAnswerSpawnRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const lastSpeedRampRef = useRef<number>(0);
    const lastBossWaveRef = useRef<number>(0);
    const currentProblemRef = useRef<Problem | null>(null);
    const speedMultiplierRef = useRef<number>(1);
    const usedSignaturesRef = useRef<string[]>([]);

    // Math module instance
    const mathModuleRef = useRef(new MathModule());

    // Sync state ref
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // --- Problem Generation ---
    const generateProblem = useCallback((): Problem => {
        const mod = mathModuleRef.current;
        const userCapabilities: UserCapabilityProfile = {
            ...INITIAL_CAPABILITY_PROFILE,
            ...profile,
        };

        // DIVERSITY: Mix up problem types based on level
        const diversityParams: Record<string, any> = {};
        if (!profile?.currentFocus) {
            const roll = Math.random();
            if (roll > 0.7 && targetLevel >= 2) diversityParams.type = 'series';
            else if (roll > 0.5) diversityParams.type = 'compare';
        }

        const problem = mod.generateProblem(userCapabilities, {
            difficulty: targetLevel,
            excludeSignatures: usedSignaturesRef.current,
            ...diversityParams,
        });

        // Track signature for anti-repeat
        const sig = `${problem.type}:${(problem as any).num1 ?? ''}:${(problem as any).operator ?? ''}:${(problem as any).num2 ?? ''}:${problem.answer}`;
        usedSignaturesRef.current.push(sig);
        if (usedSignaturesRef.current.length > 8) {
            usedSignaturesRef.current.shift();
        }

        return problem;
    }, [profile, targetLevel]);

    // --- Spawn Equation Bubble ---
    const spawnEquation = useCallback((time: number): void => {
        const currentState = stateRef.current;
        if (currentState.isGameOver || currentState.isVictory) return;
        if (currentState.isBossWave) return; // Don't spawn normal equations during boss

        // Spawn interval scales with level
        const baseInterval = 2500 / speedMultiplierRef.current;
        const frenzyMultiplier = currentState.frenzy ? 0.6 : 1;
        const interval = baseInterval * frenzyMultiplier;

        if (time - lastSpawnRef.current < interval) return;

        // Max 3 equations on screen
        if (currentState.equations.length >= 3) return;

        const problem = generateProblem();
        currentProblemRef.current = problem;
        const equation = formatEquation(problem);
        const answer = typeof problem.answer === 'number' ? problem.answer : parseInt(String(problem.answer), 10);

        const bubble: InvaderBubble = {
            id: genId('eq'),
            equation,
            answer,
            x: 10 + Math.random() * 80, // 10% to 90%
            y: 0, // Start at top
            velocity: 0.15 + (targetLevel * 0.02), // Base velocity + level scaling
        };

        setState((prev) => {
            const next = { ...prev, equations: [...prev.equations, bubble] };
            stateRef.current = next;
            return next;
        });
        lastSpawnRef.current = time;
    }, [generateProblem, targetLevel]);

    // --- Spawn Answer Bubbles ---
    const spawnAnswers = useCallback((time: number): void => {
        const currentState = stateRef.current;
        if (currentState.isGameOver || currentState.isVictory) return;

        // Spawn answers when there's at least one equation and fewer than 4 answer bubbles
        if (currentState.equations.length === 0) return;
        if (currentState.answers.filter((a) => !a.isPopped).length >= 4) return;

        const baseInterval = 2000;
        if (time - lastAnswerSpawnRef.current < baseInterval) return;

        // Find the lowest equation (most urgent)
        const sorted = [...currentState.equations].sort((a, b) => b.y - a.y);
        const targetEquation = sorted[0];
        const correctValue = targetEquation.answer;

        // Generate 3 distractors + 1 correct = 4 options
        const distractors = generateDistractors(correctValue, 3);
        const allValues = [...distractors, correctValue];
        // Shuffle
        for (let i = allValues.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allValues[i], allValues[j]] = [allValues[j], allValues[i]];
        }

        const newAnswers: AnswerBubble[] = allValues.map((val, idx) => ({
            id: genId('ans'),
            value: val,
            x: 10 + (idx * 25) + Math.random() * 5, // Spread across bottom
            y: 100, // Start at bottom
            velocity: 0.1 + Math.random() * 0.05,
            isCorrect: val === correctValue,
            isPopped: false,
        }));

        setState((prev) => {
            const next = { ...prev, answers: [...prev.answers, ...newAnswers] };
            stateRef.current = next;
            return next;
        });
        lastAnswerSpawnRef.current = time;
    }, []);

    // --- Spawn Boss ---
    const spawnBoss = useCallback((): void => {
        const problem = generateProblem();
        currentProblemRef.current = problem;
        const equation = formatEquation(problem);
        const answer = typeof problem.answer === 'number' ? problem.answer : parseInt(String(problem.answer), 10);

        const bossBubble: InvaderBubble = {
            id: genId('boss'),
            equation,
            answer,
            x: 50,
            y: 5,
            velocity: 0.05, // Boss moves slowly
            isBoss: true,
            hp: 3,
            maxHp: 3,
        };

        setState((prev) => {
            const next = {
                ...prev,
                equations: [bossBubble], // Clear normal equations, add boss
                isBossWave: true,
                bossHP: 3,
            };
            stateRef.current = next;
            return next;
        });
    }, [generateProblem]);

    // --- Handle Answer Tap ---
    const handleAnswerTap = useCallback((answerId: string): boolean => {
        const currentState = stateRef.current;
        if (currentState.isGameOver || currentState.isVictory) return false;

        const answerBubble = currentState.answers.find((a) => a.id === answerId);
        if (!answerBubble || answerBubble.isPopped) return false;

        // Find the lowest equation (most urgent)
        const sorted = [...currentState.equations].sort((a, b) => b.y - a.y);
        if (sorted.length === 0) return false;
        const targetEquation = sorted[0];

        const isCorrect = answerBubble.value === targetEquation.answer;

        // Pop the answer bubble visually
        setState((prev) => {
            const newAnswers = prev.answers.map((a) =>
                a.id === answerId ? { ...a, isPopped: true, poppedAt: Date.now() } : a
            );

            if (isCorrect) {
                const newCombo = prev.combo + 1;
                const frenzyMultiplier = newCombo >= 15 ? 5 : newCombo >= 10 ? 3 : newCombo >= FRENZY_COMBO_THRESHOLD ? 2 : 1;
                const baseScore = targetEquation.isBoss ? 100 : 10;
                const scoreGain = baseScore * frenzyMultiplier;

                let newEquations = prev.equations;
                let newBossHP = prev.bossHP;
                let newIsBossWave = prev.isBossWave;

                if (targetEquation.isBoss) {
                    // Boss hit
                    const newHP = (targetEquation.hp ?? 1) - 1;
                    if (newHP <= 0) {
                        // Boss defeated!
                        const bonusPoints = 500 * prev.level;
                        newEquations = prev.equations.filter((e) => e.id !== targetEquation.id);
                        newBossHP = 0;
                        newIsBossWave = false;

                        return {
                            ...prev,
                            equations: newEquations,
                            answers: newAnswers,
                            score: prev.score + scoreGain + bonusPoints,
                            combo: newCombo,
                            frenzy: newCombo >= FRENZY_COMBO_THRESHOLD,
                            isBossWave: newIsBossWave,
                            bossHP: newBossHP,
                        };
                    } else {
                        // Boss hit but not defeated
                        newEquations = prev.equations.map((e) =>
                            e.id === targetEquation.id ? { ...e, hp: newHP } : e
                        );
                        newBossHP = newHP;

                        return {
                            ...prev,
                            equations: newEquations,
                            answers: newAnswers,
                            score: prev.score + scoreGain,
                            combo: newCombo,
                            frenzy: newCombo >= FRENZY_COMBO_THRESHOLD,
                            bossHP: newBossHP,
                        };
                    }
                } else {
                    // Normal equation destroyed
                    newEquations = prev.equations.filter((e) => e.id !== targetEquation.id);

                    return {
                        ...prev,
                        equations: newEquations,
                        answers: newAnswers,
                        score: prev.score + scoreGain,
                        combo: newCombo,
                        frenzy: newCombo >= FRENZY_COMBO_THRESHOLD,
                    };
                }
            } else {
                // Wrong answer
                const newLives = prev.lives - 1;
                const gameOver = newLives <= 0;

                if (gameOver && onGameOver) {
                    onGameOver(prev.score, 0);
                }

                return {
                    ...prev,
                    answers: newAnswers,
                    combo: 0,
                    frenzy: false,
                    lives: newLives,
                    isGameOver: gameOver,
                };
            }
        });

        return isCorrect;
    }, [onGameOver]);

    // --- Game Loop ---
    useEffect(() => {
        startTimeRef.current = performance.now();

        const loop = (time: number) => {
            const currentState = stateRef.current;
            if (currentState.isGameOver || currentState.isVictory) return;

            const elapsed = time - startTimeRef.current;

            // Speed ramp: increase speed every 10 seconds
            if (elapsed - lastSpeedRampRef.current >= SPEED_RAMP_INTERVAL_MS) {
                speedMultiplierRef.current = Math.min(3, speedMultiplierRef.current + 0.2);
                lastSpeedRampRef.current = elapsed;
            }

            // Boss wave every 30 seconds (if not already in boss wave)
            if (
                elapsed > 5000 && // Grace period 5s
                elapsed - lastBossWaveRef.current >= BOSS_WAVE_INTERVAL_MS &&
                !currentState.isBossWave
            ) {
                lastBossWaveRef.current = elapsed;
                spawnBoss();
            }

            // Victory check: survive 60 seconds
            if (elapsed >= VICTORY_TIME_MS && !currentState.isBossWave) {
                setState((prev) => {
                    const next = { ...prev, isVictory: true, isGameOver: true };
                    stateRef.current = next;
                    return next;
                });
                if (onVictory) onVictory(currentState.score, currentState.lives);
                return;
            }

            // Spawn equations and answers
            spawnEquation(time);
            spawnAnswers(time);

            // Update positions: equations move down, answers move up
            const currentSpeed = speedMultiplierRef.current;
            const frenzySpeedBoost = currentState.frenzy ? 1.5 : 1;

            setState((prev) => {
                let lives = prev.lives;
                let isGameOver = prev.isGameOver;
                let combo = prev.combo;
                let frenzy = prev.frenzy;

                // Move equations down
                const updatedEquations: InvaderBubble[] = [];
                for (const eq of prev.equations) {
                    const newY = eq.y + eq.velocity * currentSpeed * frenzySpeedBoost;
                    if (newY >= 95 && !eq.isBoss) {
                        // Equation reached the bottom — lose a life
                        lives -= 1;
                        combo = 0;
                        frenzy = false;
                        if (lives <= 0) {
                            isGameOver = true;
                        }
                        // Don't add this equation back (it's destroyed)
                    } else if (newY >= 85 && eq.isBoss) {
                        // Boss reached the bottom — game over!
                        isGameOver = true;
                    } else {
                        updatedEquations.push({ ...eq, y: newY });
                    }
                }

                // Move answers up
                const updatedAnswers: AnswerBubble[] = [];
                for (const ans of prev.answers) {
                    if (ans.isPopped) {
                        // Clean up popped answers after 500ms
                        if (ans.poppedAt && Date.now() - ans.poppedAt < 500) {
                            updatedAnswers.push(ans);
                        }
                        continue;
                    }
                    const newY = ans.y - ans.velocity * currentSpeed;
                    if (newY > -5) {
                        updatedAnswers.push({ ...ans, y: newY });
                    }
                    // If it goes above the top, just let it disappear (no penalty)
                }

                const nextState: InvaderState = {
                    ...prev,
                    equations: updatedEquations,
                    answers: updatedAnswers,
                    lives,
                    isGameOver,
                    combo,
                    frenzy,
                };

                if (isGameOver && !prev.isGameOver && onGameOver) {
                    onGameOver(prev.score, lives);
                }

                stateRef.current = nextState;
                return nextState;
            });

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Reset / Restart ---
    const reset = useCallback(() => {
        idCounter = 0;
        usedSignaturesRef.current = [];
        speedMultiplierRef.current = 1;
        lastSpawnRef.current = 0;
        lastAnswerSpawnRef.current = 0;
        lastSpeedRampRef.current = 0;
        lastBossWaveRef.current = 0;
        startTimeRef.current = performance.now();
        setState(createInitialInvaderState());
    }, []);

    return {
        state,
        handleAnswerTap,
        reset,
    };
};