/**
 * useParentEconomy.ts — React hook for managing parent economy state.
 *
 * Handles localStorage persistence, game result application, gift execution,
 * and streak freeze.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ParentEconomyState, GameResult } from '../types/parent';
import {
    createInitialState,
    applyGameResult,
    executeGift,
    applyStreakFreeze,
    getTodayISO,
} from '../components/parent/games/parentEconomyEngine';

const STORAGE_KEY = 'hebrew-math-parent-economy';

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

export function useParentEconomy() {
    const [state, setState] = useState<ParentEconomyState>(loadState);
    const isInitialMount = useRef(true);

    // Persist state to localStorage on change
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            // ignore
        }
    }, [state]);

    // Record a game result (earn coins, update streak, check badges)
    const recordGameResult = useCallback((result: GameResult) => {
        const outcome = applyGameResult(state, result, getTodayISO());
        setState(outcome.state);
        return outcome;
    }, [state]);

    // Gift coins to a child
    const giftToChild = useCallback((childId: string, childName: string, amount: number, maxDaily?: number) => {
        const result = executeGift(state, childId, childName, amount, getTodayISO(), maxDaily);
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

    return {
        state,
        recordGameResult,
        giftToChild,
        useStreakFreeze,
    };
}
