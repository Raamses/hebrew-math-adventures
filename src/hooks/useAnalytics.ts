import { useCallback } from 'react';
import { logEvent as firebaseLogEvent } from 'firebase/analytics';
import { analyticsReady } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import type { Severity } from '@/lib/anomalyDetection';

// ================================================================
//  User Segmentation
// ================================================================

export type UserSegment = 'new_user' | 'returning_user' | 'struggling_user' | 'advanced_user';

const SEGMENT_KEY = 'user_segment';
const WEEK_KEY = 'last_reported_week';
const SESSION_COUNT_KEY = 'session_count';

function getISOWeek(): string {
    const now = new Date();
    const onejan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
}

function safeGetLocalStorage(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}

function safeSetLocalStorage(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* noop */ }
}

/**
 * Determine user segment based on session count and accuracy.
 */
export function computeSegment(sessionCount: number, accuracy: number): UserSegment {
    if (sessionCount <= 1) return 'new_user';
    if (accuracy < 0.5) return 'struggling_user';
    if (accuracy > 0.9) return 'advanced_user';
    return 'returning_user';
}

/**
 * Get the current stored segment, or compute and store a new one.
 */
export function getOrAssignSegment(accuracy: number): UserSegment {
    const stored = safeGetLocalStorage(SEGMENT_KEY);
    const sessionCount = parseInt(safeGetLocalStorage(SESSION_COUNT_KEY) || '0', 10) + 1;
    safeSetLocalStorage(SESSION_COUNT_KEY, String(sessionCount));

    const segment = computeSegment(sessionCount, accuracy);
    if (stored !== segment) {
        safeSetLocalStorage(SEGMENT_KEY, segment);
        return segment; // changed — caller should fire event
    }
    return segment as UserSegment;
}

/**
 * Check if a weekly engagement summary should be fired (once per ISO week).
 */
export function shouldFireWeeklySummary(): boolean {
    const lastWeek = safeGetLocalStorage(WEEK_KEY);
    const currentWeek = getISOWeek();
    return lastWeek !== currentWeek;
}

/**
 * Mark the weekly summary as fired for the current week.
 */
export function markWeeklySummaryFired(): void {
    safeSetLocalStorage(WEEK_KEY, getISOWeek());
}

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
    // Story micro-lessons
    | 'lesson_start'
    | 'lesson_step_complete'
    | 'lesson_complete'
    // Performance
    | 'question_answered'
    // Power-ups
    | 'powerup_spawned'
    | 'powerup_activated'
    // Segmentation
    | 'user_segment_assigned'
    | 'weekly_engagement_summary'
    // Anomaly detection
    | 'anomaly_detected'
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

    // Lessons
    lesson_id?: string;
    step_id?: string;
    step_index?: number;
    step_count?: number;
    step_type?: string;
    operation?: string;
    theme?: string;
    correct?: number;
    attempts?: number;

    // Question Performance
    equation?: string;
    is_correct?: boolean;
    response_time_ms?: number;
    attempt_count?: number;
    mode?: 'practice' | 'sensory' | 'lesson' | 'STANDARD' | 'TIME_ATTACK' | 'SURVIVAL' | 'MEMORY' | 'INVADERS';

    // Power-ups
    /** Power-up type (e.g. 'lightning_chain', 'double_points', 'rainbow_magnet') */
    powerup_type?: string;
    /** Arcade sub-mode active when the power-up spawned/activated (e.g. 'zen', 'blitz') */
    arcade_mode?: string;
    /** Player's combo count at the moment the power-up bubble spawned */
    combo_count_at_spawn?: number;

    // Segmentation
    segment?: 'new_user' | 'returning_user' | 'struggling_user' | 'advanced_user';
    session_count?: number;
    weekly_sessions?: number;
    weekly_questions?: number;
    weekly_accuracy?: number;
    weekly_minutes?: number;

    // Anomaly detection
    anomaly_type?: string;
    severity?: Severity;
    anomaly_message?: string;

    [key: string]: string | number | boolean | undefined;
}

export const useAnalytics = () => {
    const logEvent = useCallback(async (eventName: AnalyticsEvent | string, params?: AnalyticsParams) => {
        // Wait for initialization to complete
        const instance = await analyticsReady;

        if (!instance) {
            logger.log(`[Analytics Dev Mock] Event: ${eventName}`, params);
            return;
        }

        try {
            firebaseLogEvent(instance, eventName, params);
            logger.log(`[Analytics] Logged: ${eventName}`, params);
        } catch (error) {
            logger.warn('Failed to log analytics event:', error);
        }
    }, []);

    return { logEvent };
};
