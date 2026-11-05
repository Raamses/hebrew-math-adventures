/**
 * sessionCoins.ts — Kid session-coins calculation and ledger management.
 *
 * Scope:
 *  - SESSION_COIN_DAILY_CAP = 25 (separate from parent CELEBRATION_DAILY_CAP).
 *  - calculateSessionCoins: PURE function respecting daily cap, daily challenge exclusions,
 *    and guarding invalid/failed stats.
 *  - awardSessionCoins: Thin effectful wrapper that deduplicates on stable session IDs
 *    via a localStorage ledger, prevents double-invocation under StrictMode/remounts,
 *    and invokes addCoins only with positive amounts.
 */

import { STORAGE_KEYS } from './worldConfig';

export const SESSION_COIN_DAILY_CAP = 25;

export interface SessionCoinStats {
    correct?: number;
    attempts?: number;
    success?: boolean;
    coins?: number;
    score?: number;
    stars?: number;
    failed?: boolean;
    aborted?: boolean;
}

export interface SessionCoinDailyContext {
    coinsAwardedToday?: number;
    isDailyChallenge?: boolean;
}

/**
 * Pure calculation of coins earned in a session.
 *
 * Contract:
 *  - Respects SESSION_COIN_DAILY_CAP (25/day per child).
 *  - Clamps partial awards: award min(remaining, earned).
 *  - Returns 0 when cap is already reached.
 *  - Returns 0 for daily-challenge-sourced sessions (their reward is handled separately).
 *  - Returns 0 for failed or 0-coin sessions.
 *  - Guards NaN, undefined, negative, or Infinity stats, clamping them to 0.
 *  - Output is never NaN or negative.
 */
export function calculateSessionCoins(
    stats?: SessionCoinStats | number | null,
    dailyContext?: SessionCoinDailyContext | null
): number {
    if (dailyContext?.isDailyChallenge) {
        return 0;
    }

    if (stats === null || stats === undefined) {
        return 0;
    }

    if (typeof stats === 'object') {
        if (stats.success === false || stats.failed === true || stats.aborted === true) {
            return 0;
        }
    }

    let raw: number | undefined;
    if (typeof stats === 'number') {
        raw = stats;
    } else {
        if (stats.coins !== undefined) {
            raw = stats.coins;
        } else if (stats.correct !== undefined) {
            raw = stats.correct;
        } else if (stats.stars !== undefined) {
            raw = stats.stars;
        } else {
            raw = 0;
        }
    }

    if (typeof raw !== 'number' || isNaN(raw) || !isFinite(raw) || raw <= 0) {
        return 0;
    }

    const earned = Math.floor(raw);
    if (earned <= 0) {
        return 0;
    }

    const rawToday = dailyContext?.coinsAwardedToday;
    let coinsAwardedToday = 0;
    if (typeof rawToday === 'number' && !isNaN(rawToday)) {
        if (!isFinite(rawToday) && rawToday > 0) {
            coinsAwardedToday = SESSION_COIN_DAILY_CAP;
        } else if (isFinite(rawToday) && rawToday > 0) {
            coinsAwardedToday = rawToday;
        }
    }

    const remaining = Math.max(0, SESSION_COIN_DAILY_CAP - coinsAwardedToday);
    if (remaining <= 0) {
        return 0;
    }

    const awarded = Math.min(remaining, earned);
    return Math.max(0, Math.floor(awarded));
}

// ================================================================
//  Ledger Persistence & Award Wrapper
// ================================================================

export interface SessionLedgerDay {
    coinsAwarded: number;
    awardedSessionIds: string[];
    sessions?: Record<string, number>;
}

export type SessionCoinsLedger = Record<string, SessionLedgerDay>;

export function getTodayDateString(date?: Date): string {
    return (date || new Date()).toISOString().slice(0, 10);
}

function getLedgerKey(profileId?: string | null, dateStr?: string): string {
    const p = profileId && profileId.trim().length > 0 ? profileId : 'default';
    const d = dateStr || getTodayDateString();
    return `${p}:${d}`;
}

export function getSessionCoinsLedger(): SessionCoinsLedger {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return {};
        }
        const raw = window.localStorage.getItem(STORAGE_KEYS.SESSION_COINS_LEDGER);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}

export function saveSessionCoinsLedger(ledger: SessionCoinsLedger): void {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        window.localStorage.setItem(STORAGE_KEYS.SESSION_COINS_LEDGER, JSON.stringify(ledger));
    } catch {
        // ignore storage quota errors
    }
}

export function getCoinsAwardedToday(profileId?: string | null, dateStr?: string): number {
    const ledger = getSessionCoinsLedger();
    const key = getLedgerKey(profileId, dateStr);
    return ledger[key]?.coinsAwarded ?? 0;
}

export function isSessionAwarded(sessionId: string, profileId?: string | null, dateStr?: string): boolean {
    const ledger = getSessionCoinsLedger();
    const key = getLedgerKey(profileId, dateStr);
    const day = ledger[key];
    if (!day) return false;
    return day.awardedSessionIds.includes(sessionId);
}

export interface AwardSessionCoinsParams {
    profileId?: string | null;
    sessionId: string;
    stats: SessionCoinStats | number;
    isDailyChallenge?: boolean;
    addCoins?: (amount: number) => void;
    date?: string;
}

/**
 * Deduplicated, effectful session coin award helper.
 *
 * Guarantees:
 *  - Deduplicates on stable `sessionId` via localStorage ledger.
 *  - Safe against StrictMode double-mounted effects and component remounts.
 *  - Invokes `addCoins` exactly once per session, ONLY with positive amount.
 *  - Respects SESSION_COIN_DAILY_CAP.
 *  - Returns coins awarded for this session (idempotent across remounts).
 */
export function awardSessionCoins(params: AwardSessionCoinsParams): number {
    const { profileId, sessionId, stats, isDailyChallenge, addCoins, date } = params;
    if (!sessionId) return 0;

    const dateStr = date || getTodayDateString();
    const ledger = getSessionCoinsLedger();
    const key = getLedgerKey(profileId, dateStr);
    const dayRecord: SessionLedgerDay = ledger[key] || {
        coinsAwarded: 0,
        awardedSessionIds: [],
        sessions: {},
    };

    if (!dayRecord.sessions) {
        dayRecord.sessions = {};
    }

    // Already awarded this session? Return previously recorded amount, do not double-invoke addCoins.
    if (dayRecord.awardedSessionIds.includes(sessionId)) {
        return dayRecord.sessions[sessionId] ?? 0;
    }

    const coinsAwardedToday = dayRecord.coinsAwarded;
    const coinsToAward = calculateSessionCoins(stats, {
        coinsAwardedToday,
        isDailyChallenge: Boolean(isDailyChallenge),
    });

    if (coinsToAward > 0 && typeof addCoins === 'function') {
        addCoins(coinsToAward);
    }

    // Record in ledger
    dayRecord.coinsAwarded += coinsToAward;
    dayRecord.awardedSessionIds.push(sessionId);
    dayRecord.sessions[sessionId] = coinsToAward;
    ledger[key] = dayRecord;

    saveSessionCoinsLedger(ledger);

    return coinsToAward;
}
