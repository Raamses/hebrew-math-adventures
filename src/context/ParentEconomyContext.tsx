/**
 * ParentEconomyContext.tsx — Shared React context for parent economy state.
 *
 * Provides a single shared state instance for parent economy (coins, streak, badges, gifts)
 * backed by localStorage with multi-tab storage event synchronization, before-dispatch
 * state computation via latestStateRef, and a module-scoped bounded sessionId idempotency guard
 * that survives provider unmount/remount (clearing only on full page reload by design;
 * cross-reload dedupe is W1A-b scope).
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
    type ReactNode,
} from 'react';
import type {
    ParentEconomyState,
    GameResult,
    GiftTransaction,
    GameResultOutcome,
} from '../types/parent';
import {
    createInitialState,
    applyGameResult,
    executeGift,
    applyStreakFreeze,
    getTodayISO,
    migratePersistedState,
} from '../components/parent/games/parentEconomyEngine';
import { STORAGE_KEYS } from '../lib/worldConfig';

export interface ParentEconomyContextType {
    state: ParentEconomyState;
    recordGameResult: (result: GameResult) => GameResultOutcome;
    giftToChild: (childId: string, childName: string, amount: number, maxDaily?: number) => GiftTransaction | null;
    useStreakFreeze: () => boolean;
}

export interface ParentEconomyProviderProps {
    children: ReactNode;
}

export const ParentEconomyContext = createContext<ParentEconomyContextType | null>(null);

/**
 * Module-scoped bounded cache of recent game session IDs to prevent double-counting
 * across provider unmount/remount (e.g. StrictMode double-mount or navigation remounts).
 * Clears only on full page reload by design; cross-reload dedupe is W1A-b scope.
 */
export const recentSessionIds = new Map<string, GameResultOutcome>();
const MAX_RECENT_SESSIONS = 50;

export function loadParentEconomyState(): ParentEconomyState {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.PARENT_ECONOMY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return migratePersistedState(parsed);
        }
    } catch {
        // ignore
    }
    return createInitialState();
}

export const ParentEconomyProvider: React.FC<ParentEconomyProviderProps> = ({
    children,
}) => {
    const [state, setState] = useState<ParentEconomyState>(loadParentEconomyState);
    const latestStateRef = useRef<ParentEconomyState>(state);

    // Persist state to localStorage on mount and on change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.PARENT_ECONOMY, JSON.stringify(state));
        } catch {
            // ignore
        }
    }, [state]);

    // Keep multi-tab instances in sync via storage event
    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key === STORAGE_KEYS.PARENT_ECONOMY) {
                if (event.newValue) {
                    try {
                        const parsed = JSON.parse(event.newValue);
                        const migrated = migratePersistedState(parsed);
                        latestStateRef.current = migrated;
                        setState(migrated);
                    } catch {
                        // ignore
                    }
                } else {
                    const initial = createInitialState();
                    latestStateRef.current = initial;
                    setState(initial);
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    // Record game result with before-dispatch compute, latestStateRef sync, and module-scoped bounded sessionId guard
    const recordGameResult = useCallback((result: GameResult): GameResultOutcome => {
        if (result.sessionId && recentSessionIds.has(result.sessionId)) {
            return recentSessionIds.get(result.sessionId)!;
        }

        const outcome = applyGameResult(latestStateRef.current, result, getTodayISO());
        latestStateRef.current = outcome.state;
        setState(outcome.state);

        if (result.sessionId) {
            recentSessionIds.set(result.sessionId, outcome);
            if (recentSessionIds.size > MAX_RECENT_SESSIONS) {
                const oldestKey = recentSessionIds.keys().next().value;
                if (oldestKey !== undefined) {
                    recentSessionIds.delete(oldestKey);
                }
            }
        }

        return outcome;
    }, []);

    // Gift coins to a child with before-dispatch compute
    const giftToChild = useCallback((
        childId: string,
        childName: string,
        amount: number,
        maxDaily?: number,
    ): GiftTransaction | null => {
        const result = executeGift(latestStateRef.current, childId, childName, amount, getTodayISO(), maxDaily);
        if (result) {
            latestStateRef.current = result.state;
            setState(result.state);
            return result.transaction;
        }
        return null;
    }, []);

    // Use streak freeze with before-dispatch compute
    const useStreakFreeze = useCallback((): boolean => {
        const newState = applyStreakFreeze(latestStateRef.current, getTodayISO());
        if (newState) {
            latestStateRef.current = newState;
            setState(newState);
            return true;
        }
        return false;
    }, []);

    const value = useMemo<ParentEconomyContextType>(
        () => ({
            state,
            recordGameResult,
            giftToChild,
            useStreakFreeze,
        }),
        [state, recordGameResult, giftToChild, useStreakFreeze],
    );

    return (
        <ParentEconomyContext.Provider value={value}>
            {children}
        </ParentEconomyContext.Provider>
    );
};

export const useParentEconomyContext = (): ParentEconomyContextType => {
    const context = useContext(ParentEconomyContext);
    if (!context) {
        throw new Error('useParentEconomyContext must be used within a ParentEconomyProvider');
    }
    return context;
};
