import { useReducer, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MathModule } from '../engines/MathModule';
import { Director } from '../engines/GameDirector';
import { useProfile } from '../context/ProfileContext';
import { INITIAL_CAPABILITY_PROFILE, SKILL_KEY_MAP } from '../types/progress';
import type { Problem } from '../lib/gameLogic';
import type { BaseProblemConfig } from '../engines/ProblemFactory';
import { PRACTICE_CONFIG } from '../lib/worldConfig';

export type GameMode = 'STANDARD' | 'TIME_ATTACK' | 'SURVIVAL' | 'MEMORY' | 'INVADERS';

interface SessionState {
    count: number;
    correct: number;
    attempts: number;
    score: number;
    lives: number;
    timeLeft: number;
    combo: number;
    mode: GameMode;
    isGameOver: boolean;
}

type SessionAction =
    | { type: 'RESET'; mode: GameMode }
    | { type: 'ANSWER'; isCorrect: boolean }
    | { type: 'TICK' }
    | { type: 'GAME_OVER' };


const getInitialState = (mode: GameMode): SessionState => ({
    count: 0,
    correct: 0,
    attempts: 0,
    score: 0,
    lives: mode === 'SURVIVAL' ? PRACTICE_CONFIG.INITIAL_LIVES : 0,
    timeLeft: mode === 'TIME_ATTACK' ? PRACTICE_CONFIG.INITIAL_TIME : 0,
    combo: 1,
    mode,
    isGameOver: false
});

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
    switch (action.type) {
        case 'RESET':
            return getInitialState(action.mode);

        case 'ANSWER': {
            if (state.isGameOver) return state;

            const isCorrect = action.isCorrect;
            let newScore = state.score;
            const newCombo = isCorrect ? state.combo + 1 : 1;
            let newTime = state.timeLeft;
            let newLives = state.lives;
            let isGameOver = false;

            // Score Logic
            if (isCorrect) {
                // Base points (100) * Combo Multiplier (capped at 5x for sanity)
                const multiplier = Math.min(newCombo, 5);
                newScore += 100 * multiplier;

                // Time Attack Bonus
                if (state.mode === 'TIME_ATTACK') {
                    newTime += PRACTICE_CONFIG.TIME_BONUS;
                }
            } else {
                // Wrong Answer Pensalties
                if (state.mode === 'SURVIVAL') {
                    newLives -= 1;
                    if (newLives <= 0) isGameOver = true;
                }
            }

            return {
                ...state,
                count: isCorrect ? state.count + 1 : state.count,
                correct: isCorrect ? state.correct + 1 : state.correct,
                attempts: state.attempts + 1,
                combo: newCombo,
                score: newScore,
                timeLeft: newTime,
                lives: newLives,
                isGameOver
            };
        }

        case 'TICK': {
            if (state.mode !== 'TIME_ATTACK' || state.isGameOver) return state;
            const newTime = state.timeLeft - 1;
            return {
                ...state,
                timeLeft: newTime,
                isGameOver: newTime <= 0
            };
        }

        case 'GAME_OVER':
            return { ...state, isGameOver: true };

        default:
            return state;
    }
}

interface UsePracticeSessionProps {
    targetLevel: number;
    problemConfig?: BaseProblemConfig;
}

export const usePracticeSession = ({ targetLevel, problemConfig }: UsePracticeSessionProps) => {
    const { profile, updateProfile } = useProfile();
    // Default to STANDARD, but PracticeMode component will allow selector to override via restart logic
    const [session, dispatch] = useReducer(sessionReducer, getInitialState('STANDARD'));
    const [problem, setProblem] = useState<Problem | null>(null);

    // Module Instance - Stable across renders
    const mathModule = useMemo(() => new MathModule(), []);

    // Track recent problem signatures to prevent duplicates
    const recentSignaturesRef = useRef<string[]>([]);

    // Timer Ref for Time Attack
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Timer Effect
    useEffect(() => {
        if (session.mode === 'TIME_ATTACK' && !session.isGameOver && session.timeLeft > 0) {
            timerRef.current = setInterval(() => {
                dispatch({ type: 'TICK' });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [session.mode, session.isGameOver, session.timeLeft]);


    const generateNext = useCallback(() => {
        if (!profile) return null;

        const userCapabilities = {
            ...(profile.capabilities || INITIAL_CAPABILITY_PROFILE),
            streak: profile.streak
        };

        // Set currentFocus dynamically based on problem type
        if (problemConfig?.type) {
            const skillKey = SKILL_KEY_MAP[problemConfig.type] || problemConfig.type;
            userCapabilities.currentFocus = skillKey;
        }

        // DIVERSITY LOGIC: Mix it up!
        // If no strict config, randomly pick interesting types available at this level
        const diversityParams = { ...problemConfig };

        if (!problemConfig?.type) {
            // Chance to inject diversity
            const roll = Math.random();
            if (roll > 0.7 && targetLevel >= 2) diversityParams.type = 'series';
            else if (roll > 0.5) diversityParams.type = 'compare';
            // else default arithmetic logic in MathModule handles it
        }

        const problem = mathModule.generateProblem(userCapabilities, {
            difficulty: targetLevel,
            ...diversityParams
        });

        // Dedup: if this problem matches the last one, try once more
        if (problem) {
            const sig = `${problem.type}:${'num1' in problem ? problem.num1 : ''}:${'num2' in problem ? problem.num2 : ''}:${'operator' in problem ? problem.operator : ''}`;
            const lastSig = recentSignaturesRef.current[recentSignaturesRef.current.length - 1];
            if (lastSig && sig === lastSig) {
                const retry = mathModule.generateProblem(userCapabilities, {
                    difficulty: targetLevel,
                    ...diversityParams
                });
                if (retry) {
                    const retrySig = `${retry.type}:${'num1' in retry ? retry.num1 : ''}:${'num2' in retry ? retry.num2 : ''}:${'operator' in retry ? retry.operator : ''}`;
                    recentSignaturesRef.current = [...recentSignaturesRef.current.slice(-4), retrySig];
                    return retry;
                }
            }
            recentSignaturesRef.current = [...recentSignaturesRef.current.slice(-4), sig];
        }

        return problem;
    }, [profile, targetLevel, problemConfig, mathModule]);

    const initSession = useCallback((mode: GameMode = 'STANDARD') => {
        // Only reset if mode changed or explicitly requested
        dispatch({ type: 'RESET', mode });
        const next = generateNext();
        if (next) setProblem(next);
    }, [generateNext]);

    const restartSession = useCallback(() => {
        dispatch({ type: 'RESET', mode: session.mode });
        const next = generateNext();
        if (next) setProblem(next);
    }, [generateNext, session.mode]);

    // Generate next problem WITHOUT resetting session state
    const nextProblem = useCallback(() => {
        const next = generateNext();
        if (next) setProblem(next);
    }, [generateNext]);

    const submitResult = useCallback((isCorrect: boolean) => {
        dispatch({ type: 'ANSWER', isCorrect });

        if (profile) {
            const currentCapabilities = profile.capabilities || INITIAL_CAPABILITY_PROFILE;
            const updatedCapabilities = Director.recordResult(currentCapabilities, isCorrect);
            updateProfile(profile.id, { capabilities: updatedCapabilities });
        }
    }, [profile, updateProfile]);

    const evaluateAnswer = useCallback((currentProblem: Problem, userAnswer: string | number) => {
        return mathModule.evaluate(currentProblem, userAnswer);
    }, [mathModule]);

    return {
        session,
        problem,
        setProblem,
        generateNext,
        nextProblem,
        restartSession,
        submitResult,
        evaluateAnswer,
        initSession
    };
};

