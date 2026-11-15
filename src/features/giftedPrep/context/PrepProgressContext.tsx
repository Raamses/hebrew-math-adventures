'use client';
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { PrepAttempt, PrepMockResult, PrepProgressState } from '../types';
import { loadPrepProgress, recordAttempt, recordMock, savePrepProgress } from '../engine/storage';

interface PrepProgressValue {
    readonly progress: PrepProgressState;
    readonly addAttempt: (attempt: PrepAttempt) => void;
    readonly addMock: (mock: PrepMockResult) => void;
    /** Vocalized text on/off for this profile (default on). */
    readonly niqqud: boolean;
    readonly setNiqqud: (on: boolean) => void;
}

const PrepProgressContext = createContext<PrepProgressValue | null>(null);

interface PrepProgressProviderProps {
    readonly profileId: string;
    readonly children: ReactNode;
}

/** Mounted only under the 'prep' view, so saga screens never re-render on prep progress. */
export function PrepProgressProvider({ profileId, children }: PrepProgressProviderProps) {
    const [progress, setProgress] = useState<PrepProgressState>(() => loadPrepProgress(profileId));

    const update = useCallback((fn: (s: PrepProgressState) => PrepProgressState) => {
        setProgress(prev => {
            const next = fn(prev);
            savePrepProgress(profileId, next);
            return next;
        });
    }, [profileId]);

    const addAttempt = useCallback((a: PrepAttempt) => update(s => recordAttempt(s, a)), [update]);
    const addMock = useCallback((m: PrepMockResult) => update(s => recordMock(s, m)), [update]);
    const setNiqqud = useCallback((on: boolean) => update(s => ({ ...s, niqqud: on })), [update]);
    const niqqud = progress.niqqud ?? true;

    const value = useMemo(
        () => ({ progress, addAttempt, addMock, niqqud, setNiqqud }),
        [progress, addAttempt, addMock, niqqud, setNiqqud],
    );
    return <PrepProgressContext value={value}>{children}</PrepProgressContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrepProgress(): PrepProgressValue {
    const ctx = use(PrepProgressContext);
    if (!ctx) throw new Error('usePrepProgress must be used inside PrepProgressProvider');
    return ctx;
}
