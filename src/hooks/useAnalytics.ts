import { useCallback } from 'react';
import { logEvent as firebaseLogEvent } from 'firebase/analytics';
import { analyticsReady } from '@/lib/firebase';

// Standardized event types based on @analytics_strategy.md
export type AnalyticsEvent =
    // Lifecycle
    | 'login'
    | 'signup'
    | 'app_open'
    | 'mascot_change'
    // Progression
    | 'node_select'
    | 'node_start'
    | 'node_complete'
    | 'streak_milestone'
    // Performance
    | 'question_answered'
    // Legacy/Generic
    | 'page_view'
    | 'level_start'
    | 'level_complete'
    | 'level_failed';

// Extended parameter types
export interface AnalyticsParams {
    // Common
    page_title?: string;

    // User
    profile_id?: string;
    age_group?: string;
    mascot_id?: string;
    new_mascot?: string;
    old_mascot?: string;
    age?: number;
    avatar_id?: string;
    streak_count?: number;

    // Node/Level
    node_id?: string;
    unit_id?: string;
    node_type?: string;
    is_locked?: boolean;
    target_level?: number;
    stars_earned?: number;
    total_mistakes?: number;
    success?: boolean;
    duration_seconds?: number;

    // Question Performance
    equation?: string;
    is_correct?: boolean;
    response_time_ms?: number;
    attempt_count?: number;
    mode?: 'practice' | 'sensory' | 'lesson';

    [key: string]: string | number | boolean | undefined;
}

export const useAnalytics = () => {
    const logEvent = useCallback(async (eventName: AnalyticsEvent | string, params?: AnalyticsParams) => {
        // Wait for initialization to complete
        const instance = await analyticsReady;

        if (!instance) {
            if (import.meta.env.DEV) {
                console.log(`[Analytics Dev Mock] Event: ${eventName}`, params);
            }
            return;
        }

        try {
            firebaseLogEvent(instance, eventName, params);
            if (import.meta.env.DEV) {
                console.log(`[Analytics] Logged: ${eventName}`, params);
            }
        } catch (error) {
            console.warn('Failed to log analytics event:', error);
        }
    }, []);

    return { logEvent };
};
