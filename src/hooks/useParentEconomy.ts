/**
 * useParentEconomy.ts — React hook for managing parent economy state.
 *
 * Handles localStorage persistence, game result application, gift execution,
 * streak freeze, and leaderboard management.
 */

import { useState, useCallback, useEffect } from 'react';
import type { ParentEconomyState, GameResult, LeaderboardEntry } from '../types/parent';
import {
    createInitialState,
    applyGameResult,
    executeGift,
    applyStreakFreeze,
    submitLeaderboardScore,
    pruneOldLeaderboardEntries,
    getTodayISO,
} from '../components/parent/games/parentEconomyEngine';

const STORAGE_KEY = 'hebrew-math-parent-economy';
const LEADERBOARD_KEY = 'hebrew-math-parent-leaderboard';

function loadState(): ParentEconomyState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...createInitialState(), ...parsed };
        }
    } catch {
        // ignore
    }
    return createInitialState();
}

function loadLeaderboard(): LeaderboardEntry[] {
    try {
        const raw = localStorage.getItem(LEADERBOARD_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return pruneOldLeaderboardEntries(parsed);
        }
    } catch {
        // ignore
    }
    return [];
}

export function useParentEconomy() {
    const [state, setState] = useState<ParentEconomyState>(loadState);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(loadLeaderboard);

    // Persist state to localStorage on change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            // ignore
        }
    }, [state]);

    // Persist leaderboard on change
    useEffect(() => {
        try {
            localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
        } catch {
            // ignore
        }
    }, [leaderboard]);

    // Record a game result (earn coins, update streak, check badges)
    const recordGameResult = useCallback((result: GameResult) => {
        const outcome = applyGameResult(state, result, getTodayISO());
        setState(outcome.state);
        return outcome;
    }, [state]);

    // Gift coins to a child
    const giftToChild = useCallback((childId: string, childName: string, amount: number) => {
        const result = executeGift(state, childId, childName, amount, getTodayISO());
        if (result) {
            setState(result.state);
            return result.transaction;
        }
        return null;
    }, [state]);

    // Use streak freeze
    const useStreakFreeze = useCallback(() => {
        const newState = applyStreakFreeze(state, getTodayISO());
        if (newState) {
            setState(newState);
            return true;
        }
        return false;
    }, [state]);

    // Submit a score to the weekly leaderboard
    const submitScore = useCallback((playerName: string, score: number) => {
        setLeaderboard(prev => submitLeaderboardScore(prev, playerName, score));
    }, []);

    return {
        state,
        leaderboard,
        recordGameResult,
        giftToChild,
        useStreakFreeze,
        submitScore,
    };
}
