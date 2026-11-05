/**
 * useParentEconomy.ts — React hook for managing parent economy state.
 *
 * Consumes ParentEconomyContext when available (within ParentEconomyProvider).
 * Falls back to a legacy local instance when rendered without a provider,
 * preserving compatibility with existing unit tests.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ParentEconomyState, GameResult } from '../types/parent';
import {
    applyGameResult,
    executeGift,
    applyStreakFreeze,
    getTodayISO,
} from '../components/parent/games/parentEconomyEngine';
import {
    useParentEconomyContext,
    loadParentEconomyState,
    type ParentEconomyContextType,
} from '../context/ParentEconomyContext';
import { STORAGE_KEYS } from '../lib/worldConfig';

function useLegacyParentEconomy(): ParentEconomyContextType {
    const [state, setState] = useState<ParentEconomyState>(loadParentEconomyState);
    const isInitialMount = useRef(true);

    // Persist state to localStorage on change (legacy skip on mount)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEYS.PARENT_ECONOMY, JSON.stringify(state));
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

export function useParentEconomy(): ParentEconomyContextType {
    let context: ParentEconomyContextType | null = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        context = useParentEconomyContext();
    } catch {
        // Fallback when rendered without ParentEconomyProvider
    }

    if (context) {
        return context;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useLegacyParentEconomy();
}
