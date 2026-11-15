import { useCallback, useMemo } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import type { PrepItem } from '../types';

export type PrepMode = 'learn' | 'mock';

/**
 * Gifted-prep analytics. Only ids, kinds and numbers: never the child's answers as text.
 * Events: prep_open, prep_session_start, prep_session_end, prep_item_answered, prep_toggle.
 */
export function usePrepAnalytics() {
    const { logEvent } = useAnalytics();

    const open = useCallback(() => { void logEvent('prep_open'); }, [logEvent]);

    const sessionStart = useCallback((mode: PrepMode, section: string, count: number) => {
        void logEvent('prep_session_start', { prep_mode: mode, section, item_count: count });
    }, [logEvent]);

    const sessionEnd = useCallback((mode: PrepMode, section: string, correct: number, total: number, durationSec: number) => {
        void logEvent('prep_session_end', { prep_mode: mode, section, correct, item_count: total, duration_seconds: durationSec });
    }, [logEvent]);

    const itemAnswered = useCallback((item: PrepItem, correct: boolean, ms: number, mode: PrepMode) => {
        void logEvent('prep_item_answered', {
            prep_mode: mode,
            kind: item.kind,
            skill: item.skill,
            difficulty: item.difficulty,
            is_correct: correct,
            response_time_ms: ms,
        });
    }, [logEvent]);

    const toggled = useCallback((enabled: boolean) => {
        void logEvent('prep_toggle', { enabled });
    }, [logEvent]);

    return useMemo(
        () => ({ open, sessionStart, sessionEnd, itemAnswered, toggled }),
        [open, sessionStart, sessionEnd, itemAnswered, toggled],
    );
}
