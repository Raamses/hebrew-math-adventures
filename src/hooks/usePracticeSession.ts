import { useReducer, useState, useMemo, useCallback } from 'react';
import { MathModule } from '../engines/MathModule';
import { useProfile } from '../context/ProfileContext';
import { INITIAL_CAPABILITY_PROFILE } from '../types/progress';
import type { Problem } from '../lib/gameLogic';
import type { BaseProblemConfig } from '../engines/ProblemFactory';

interface SessionState {
    count: number;
    correct: number;
    attempts: number;
}

type SessionAction =
    | { type: 'RESET' }
    | { type: 'ANSWER', isCorrect: boolean };

const initialSessionState: SessionState = {
    count: 0,
    correct: 0,
    attempts: 0
};

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
    switch (action.type) {
        case 'RESET':
            return initialSessionState;
        case 'ANSWER':
            return {
                ...state,
                count: action.isCorrect ? state.count + 1 : state.count,
                correct: action.isCorrect ? state.correct + 1 : state.correct,
                attempts: state.attempts + 1
            };
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
    const [session, dispatch] = useReducer(sessionReducer, initialSessionState);
    const [problem, setProblem] = useState<Problem | null>(null);

    // Module Instance - Stable across renders
    const mathModule = useMemo(() => new MathModule(), []);

    const generateNext = useCallback(() => {
        if (!profile) return null;

        const userCapabilities = {
            ...(profile.capabilities || INITIAL_CAPABILITY_PROFILE),
            streak: profile.streak
        };

        return mathModule.generateProblem(userCapabilities, {
            difficulty: targetLevel,
            ...problemConfig
        });
    }, [profile, targetLevel, problemConfig, mathModule]);

    const initSession = useCallback(() => {
        const next = generateNext();
        if (next) setProblem(next);
    }, [generateNext]);

    const restartSession = useCallback(() => {
        dispatch({ type: 'RESET' });
        const next = generateNext();
        if (next) setProblem(next);
    }, [generateNext]);

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
