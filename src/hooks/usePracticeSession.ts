import { useReducer, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MathModule } from '../engines/MathModule';
import { useProfile } from '../context/ProfileContext';
import { INITIAL_CAPABILITY_PROFILE } from '../types/progress';
import type { Problem } from '../lib/gameLogic';
import type { BaseProblemConfig } from '../engines/ProblemFactory';

export type GameMode = 'STANDARD' | 'TIME_ATTACK' | 'SURVIVAL';

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

const INITIAL_LIVES = 3;
const INITIAL_TIME = 60;
const TIME_BONUS = 2;

const getInitialState = (mode: GameMode): SessionState => ({
    count: 0,
    correct: 0,
    attempts: 0,
    score: 0,
    lives: mode === 'SURVIVAL' ? INITIAL_LIVES : 0,
    timeLeft: mode === 'TIME_ATTACK' ? INITIAL_TIME : 0,
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
                    newTime += TIME_BONUS;
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
    const { profile } = useProfile();
    // Default to STANDARD, but PracticeMode component will allow selector to override via restart logic
    const [session, dispatch] = useReducer(sessionReducer, getInitialState('STANDARD'));
    const [problem, setProblem] = useState<Problem | null>(null);

    // Module Instance - Stable across renders
    const mathModule = useMemo(() => new MathModule(), []);

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

        return mathModule.generateProblem(userCapabilities, {
            difficulty: targetLevel,
            ...diversityParams
        });
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

    const submitResult = useCallback((isCorrect: boolean) => {
        dispatch({ type: 'ANSWER', isCorrect });
    }, []);

    const evaluateAnswer = useCallback((currentProblem: Problem, userAnswer: string | number) => {
        return mathModule.evaluate(currentProblem, userAnswer);
    }, [mathModule]);

    return {
        session,
        problem,
        setProblem,
        generateNext,
        restartSession,
        submitResult,
        evaluateAnswer,
        initSession
    };
};

