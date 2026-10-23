/**
 * CelebrationTray.tsx — Contextual celebration card in PostcardHub (Card PG-4).
 *
 * Appears when a new badge or milestone fired since the last parent visit.
 * Displays the specific win (badge icon + milestone text) and one-tap actions:
 *   - 'שלח מטבעות' (Send coins): validates using validateGift and enforces the 25 coins/day cap,
 *     skipping the child-picker step (contextual to the win shown).
 *   - 'שלח מחיאות כפיים' (Send cheer): sends encouragement with daily cap enforcement.
 *
 * Surfacing economy wiring:
 *   - Shows parent coin balance and prompts: "שחקו סיבוב קצר, ואז שלחו את המטבעות של היום ל[kid]".
 *
 * Kid-side delivery:
 *   - The kid sees the gift/cheer as a mascot moment ('קיבלת מתנה מאמא/אבא! 🎁' or
 *     'קיבלת מחיאות כפיים מאמא/אבא! 👏') via ScoreToast / in-game mailbox — NEVER the parent-side mechanics.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Sparkles, X } from 'lucide-react';
import i18n from '../../i18n';
import { BADGE_MAP } from '../../data/badges';
import { useParentEconomy } from '../../hooks/useParentEconomy';
import { useProfile } from '../../context/ProfileContext';
import { validateGift, getTodayISO } from './games/parentEconomyEngine';
import { ScoreToast } from '../ScoreToast';
import type { ParentEconomyState } from '../../types/parent';
import type { UserProfile } from '../../types/user';

// ================================================================
//  Constants & Storage Keys
// ================================================================

export const CELEBRATION_DAILY_CAP = 25; // 25 coins per day per child
export const DEFAULT_CELEBRATION_GIFT_AMOUNT = 5;
export const MAX_DAILY_CHEERS = 25;

export const SEEN_MILESTONES_STORAGE_KEY = 'hebrew-math-parent-seen-milestones';
export const KID_MAILBOX_STORAGE_KEY = 'hebrew-math-kid-mailbox';
export const CHEERS_HISTORY_STORAGE_KEY = 'hebrew-math-parent-cheers-history';

// ================================================================
//  Types
// ================================================================

export interface CelebrationMilestone {
    id: string;
    badgeIcon: string;
    milestoneText: string;
    childId: string;
    childName: string;
    badgeId?: string;
    type?: 'badge' | 'streak' | 'general';
}

export interface KidCelebration {
    id: string;
    childId: string;
    type: 'gift' | 'cheer';
    amount?: number;
    message: string;
    createdAt: number;
    delivered?: boolean;
}

// ================================================================
//  Milestone Detection Helpers
// ================================================================

export function getSeenMilestones(childId: string): string[] {
    try {
        const raw = localStorage.getItem(`${SEEN_MILESTONES_STORAGE_KEY}_${childId}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        // ignore
    }
    return [];
}

export function recordMilestoneSeen(childId: string, milestoneId: string): void {
    try {
        const existing = getSeenMilestones(childId);
        if (!existing.includes(milestoneId)) {
            const updated = [...existing, milestoneId];
            localStorage.setItem(`${SEEN_MILESTONES_STORAGE_KEY}_${childId}`, JSON.stringify(updated));
        }
    } catch {
        // ignore
    }
}

export const BADGE_LOCALIZED_NAMES_HE: Record<string, string> = {
    first_steps: 'צעדים ראשונים',
    sharp_shooter: 'צלף מדויק',
    century: 'מאה מושלמת',
    on_fire: 'בלתי עציר',
    lightning: 'מהיר כברק',
    boss_slayer: 'קוטל בוסים',
    perfectionist: 'פרפקציוניסט',
    dedicated: 'מתמיד',
    weekly_warrior: 'אלוף השבוע',
    bubble_master: 'אדון הבועות',
    streak_star: 'כוכב הרצף',
    superstar: 'סופרסטאר',
};

/**
 * Detects whether a new milestone/badge has fired since last visit.
 * Returns null if nothing new.
 * Badge names and milestone descriptions are routed through i18n / localized definitions.
 */
export function detectNewMilestone(
    profile: UserProfile | null | undefined,
    seenIds: string[] = [],
    t?: (key: string, options?: any) => string,
): CelebrationMilestone | null {
    if (!profile) return null;

    const translate = t || i18n.t.bind(i18n);
    const childName = profile.name || 'הילד/ה';
    const unlockedBadges = profile.unlockedBadges || [];

    // 1. Check for unseen badges in unlockedBadges
    for (let i = unlockedBadges.length - 1; i >= 0; i--) {
        const badgeId = unlockedBadges[i];
        if (!seenIds.includes(badgeId)) {
            const badgeDef = BADGE_MAP[badgeId];
            const badgeIcon = badgeDef?.emoji || '🏅';
            let badgeName = badgeId;
            if (badgeDef?.nameKey) {
                const translated = translate(badgeDef.nameKey);
                badgeName = (translated && translated !== badgeDef.nameKey)
                    ? translated
                    : (BADGE_LOCALIZED_NAMES_HE[badgeId] || badgeId);
            } else if (BADGE_LOCALIZED_NAMES_HE[badgeId]) {
                badgeName = BADGE_LOCALIZED_NAMES_HE[badgeId];
            }

            const milestoneText = translate('celebration.badgeWon', {
                childName,
                badgeName,
                defaultValue: `${childName} זכה/תה בתג ${badgeName}!`,
            });

            return {
                id: badgeId,
                badgeId,
                badgeIcon,
                milestoneText,
                childId: profile.id,
                childName,
                type: 'badge',
            };
        }
    }

    // 2. Check for unseen streak milestones (e.g. streak >= 3)
    const streak = profile.streak || 0;
    if (streak >= 3) {
        const streakMilestoneId = `streak-${streak}`;
        if (!seenIds.includes(streakMilestoneId)) {
            const milestoneText = translate('celebration.streakMilestone', {
                childName,
                streak,
                defaultValue: `${childName} הגיע/ה לרצף מרשים של ${streak} ימים!`,
            });
            return {
                id: streakMilestoneId,
                badgeIcon: '🔥',
                milestoneText,
                childId: profile.id,
                childName,
                type: 'streak',
            };
        }
    }

    return null;
}

// ================================================================
//  Kid Mailbox / Delivery Storage
// ================================================================

export function getPendingKidCelebrations(childId: string): KidCelebration[] {
    try {
        const raw = localStorage.getItem(`${KID_MAILBOX_STORAGE_KEY}_${childId}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter((c: KidCelebration) => !c.delivered);
            }
        }
    } catch {
        // ignore
    }
    return [];
}

export function queueKidCelebration(celebration: Omit<KidCelebration, 'id' | 'createdAt' | 'delivered'>): KidCelebration {
    const item: KidCelebration = {
        ...celebration,
        id: `cel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        delivered: false,
    };
    try {
        const existing = getPendingKidCelebrations(item.childId);
        const updated = [...existing, item];
        localStorage.setItem(`${KID_MAILBOX_STORAGE_KEY}_${item.childId}`, JSON.stringify(updated));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('kid-celebration-queued'));
        }
    } catch {
        // ignore
    }
    return item;
}

export function markKidCelebrationDelivered(childId: string, celebrationId: string): void {
    try {
        const raw = localStorage.getItem(`${KID_MAILBOX_STORAGE_KEY}_${childId}`);
        if (raw) {
            const list: KidCelebration[] = JSON.parse(raw);
            const updated = list.map(c => c.id === celebrationId ? { ...c, delivered: true } : c);
            localStorage.setItem(`${KID_MAILBOX_STORAGE_KEY}_${childId}`, JSON.stringify(updated));
        }
    } catch {
        // ignore
    }
}

export function clearKidCelebrations(childId: string): void {
    try {
        localStorage.removeItem(`${KID_MAILBOX_STORAGE_KEY}_${childId}`);
    } catch {
        // ignore
    }
}

// Cheers daily tracking
export function getCheersCountToday(childId: string, today: string = getTodayISO()): number {
    try {
        const raw = localStorage.getItem(`${CHEERS_HISTORY_STORAGE_KEY}_${childId}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.date === today && typeof parsed.count === 'number') {
                return parsed.count;
            }
        }
    } catch {
        // ignore
    }
    return 0;
}

export function incrementCheersToday(childId: string, today: string = getTodayISO()): number {
    const count = getCheersCountToday(childId, today) + 1;
    try {
        localStorage.setItem(`${CHEERS_HISTORY_STORAGE_KEY}_${childId}`, JSON.stringify({ date: today, count }));
    } catch {
        // ignore
    }
    return count;
}

// ================================================================
//  Kid Delivery Toast Component (Mascot moment with 0 leakage)
// ================================================================

export interface KidCelebrationDeliveryProps {
    childId?: string;
    onDelivered?: (celebration: KidCelebration) => void;
}

/**
 * KidCelebrationDelivery — Kid-side receiver.
 * Displays the mascot moment ('קיבלת מתנה מאמא/אבא! 🎁' or 'קיבלת מחיאות כפיים מאמא/אבא! 👏')
 * with ZERO parent-side mechanics leakage (no balance, no caps, no adult banking terms).
 */
export const KidCelebrationDelivery: React.FC<KidCelebrationDeliveryProps> = ({ childId: propChildId, onDelivered }) => {
    let contextChildId = '';
    try {
        const { profile } = useProfile();
        contextChildId = profile?.id || '';
    } catch {
        // no profile provider
    }
    const childId = propChildId || contextChildId;

    const [celebration, setCelebration] = useState<KidCelebration | null>(() => {
        if (!childId) return null;
        const pending = getPendingKidCelebrations(childId);
        return pending.length > 0 ? pending[0] : null;
    });

    useEffect(() => {
        if (!childId) return;
        const checkForCelebration = () => {
            const pending = getPendingKidCelebrations(childId);
            if (pending.length > 0) {
                setCelebration((prev) => prev || pending[0]);
            }
        };
        checkForCelebration();
        window.addEventListener('storage', checkForCelebration);
        window.addEventListener('kid-celebration-queued', checkForCelebration);
        return () => {
            window.removeEventListener('storage', checkForCelebration);
            window.removeEventListener('kid-celebration-queued', checkForCelebration);
        };
    }, [childId]);

    const handleDismiss = useCallback(() => {
        if (celebration && childId) {
            markKidCelebrationDelivered(childId, celebration.id);
            if (onDelivered) {
                onDelivered(celebration);
            }
            setCelebration(null);
        }
    }, [celebration, childId, onDelivered]);

    if (!celebration) return null;

    return (
        <div data-testid="kid-celebration-moment">
            <ScoreToast
                message={celebration.message}
                isVisible={true}
                onComplete={handleDismiss}
            />
        </div>
    );
};

// ================================================================
//  CelebrationTray Component
// ================================================================

export interface CelebrationTrayProps {
    profile?: UserProfile | null;
    milestone?: CelebrationMilestone | null;
    economyState?: ParentEconomyState;
    onSendGift?: (amount: number) => void;
    onSendCheer?: () => void;
    onPlayGames?: () => void;
    onDismiss?: () => void;
}

export const CelebrationTray: React.FC<CelebrationTrayProps> = ({
    profile: propProfile,
    milestone: propMilestone,
    economyState: propEconomyState,
    onSendGift,
    onSendCheer,
    onPlayGames,
    onDismiss,
}) => {
    const { t } = useTranslation();

    let contextProfile: UserProfile | null = null;
    let updateProfile: ((id: string, updates: Partial<UserProfile>) => void) | undefined = undefined;
    try {
        const ctx = useProfile();
        contextProfile = ctx.profile;
        updateProfile = ctx.updateProfile;
    } catch {
        // Fallback when rendered without ProfileProvider
    }
    const activeProfile = propProfile !== undefined ? propProfile : contextProfile;

    const economyHook = useParentEconomy();
    const economyState = propEconomyState || economyHook.state;
    const giftToChild = economyHook.giftToChild;

    const childId = activeProfile?.id || propMilestone?.childId || '';
    const childName = activeProfile?.name || propMilestone?.childName || 'הילד/ה';

    // Derive or detect active milestone
    const activeMilestone = useMemo(() => {
        if (propMilestone !== undefined) {
            return propMilestone;
        }
        if (!activeProfile) return null;
        const seen = getSeenMilestones(activeProfile.id);
        return detectNewMilestone(activeProfile, seen, t);
    }, [propMilestone, activeProfile, t]);

    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [actionState, setActionState] = useState<'idle' | 'gift_sent' | 'cheer_sent'>('idle');

    const today = getTodayISO();

    // Calculate remaining daily gift allowance for this child under CELEBRATION_DAILY_CAP (25/day)
    const todaysGiftsToChild = (economyState.giftHistory ?? [])
        .filter((g) => g.date === today && g.childProfileId === childId)
        .reduce((sum, g) => sum + g.amount, 0);

    const remainingDailyCoins = Math.max(0, CELEBRATION_DAILY_CAP - todaysGiftsToChild);

    // Validation for sending default gift amount (5 coins)
    const giftAmount = Math.min(DEFAULT_CELEBRATION_GIFT_AMOUNT, remainingDailyCoins);

    const giftValidationError = useMemo(() => {
        if (!childId) return 'no_child';
        if (remainingDailyCoins <= 0) return 'child_daily_limit_exceeded';
        return validateGift(economyState, childId, giftAmount > 0 ? giftAmount : DEFAULT_CELEBRATION_GIFT_AMOUNT, today, CELEBRATION_DAILY_CAP);
    }, [economyState, childId, giftAmount, remainingDailyCoins, today]);

    const cheersToday = getCheersCountToday(childId, today);
    const cheerAllowed = cheersToday < MAX_DAILY_CHEERS;

    // Handle one-tap "שלח מטבעות"
    const handleSendGift = useCallback(() => {
        if (giftValidationError || giftAmount <= 0) return;

        if (onSendGift) {
            onSendGift(giftAmount);
        } else {
            giftToChild(childId, childName, giftAmount, CELEBRATION_DAILY_CAP);
            if (activeProfile?.id && updateProfile) {
                updateProfile(activeProfile.id, {
                    coins: (activeProfile.coins || 0) + giftAmount,
                });
            }
        }

        // Queue kid-side mascot moment
        queueKidCelebration({
            childId,
            type: 'gift',
            amount: giftAmount,
            message: 'קיבלת מתנה מאמא/אבא! 🎁',
        });

        // Record milestone as seen
        if (activeMilestone) {
            recordMilestoneSeen(childId, activeMilestone.id);
        }

        setActionState('gift_sent');
        setStatusMessage(`נשלחו ${giftAmount} מטבעות ל${childName}! 🎁`);
    }, [giftValidationError, giftAmount, onSendGift, giftToChild, childId, childName, activeProfile, updateProfile, activeMilestone]);

    // Handle one-tap "שלח מחיאות כפיים"
    const handleSendCheer = useCallback(() => {
        if (!cheerAllowed) return;

        incrementCheersToday(childId, today);

        if (onSendCheer) {
            onSendCheer();
        }

        // Queue kid-side mascot moment
        queueKidCelebration({
            childId,
            type: 'cheer',
            message: 'קיבלת מחיאות כפיים מאמא/אבא! 👏',
        });

        // Record milestone as seen
        if (activeMilestone) {
            recordMilestoneSeen(childId, activeMilestone.id);
        }

        setActionState('cheer_sent');
        setStatusMessage(`נשלחו מחיאות כפיים ל${childName}! 👏`);
    }, [cheerAllowed, childId, today, onSendCheer, activeMilestone, childName]);

    const handleDismiss = useCallback(() => {
        if (activeMilestone && childId) {
            recordMilestoneSeen(childId, activeMilestone.id);
        }
        if (onDismiss) {
            onDismiss();
        }
    }, [activeMilestone, childId, onDismiss]);

    // If no new milestone fired, tray does NOT render
    if (!activeMilestone) {
        return null;
    }

    const economyPrompt = `שחקו סיבוב קצר, ואז שלחו את המטבעות של היום ל${childName}`;

    return (
        <div
            data-testid="celebration-tray"
            className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden"
        >
            {/* Header: Win Announcement */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div
                        data-testid="celebration-badge-icon"
                        className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl shadow-xs shrink-0"
                    >
                        {activeMilestone.badgeIcon}
                    </div>
                    <div>
                        <div className="text-xs font-bold text-amber-700 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{t('celebration.winHeader', t('parent.celebration.winHeader', 'הישג חדש שנרשם!'))}</span>
                        </div>
                        <div
                            data-testid="celebration-milestone-text"
                            className="text-base font-extrabold text-slate-800 leading-snug"
                        >
                            {activeMilestone.milestoneText}
                        </div>
                    </div>
                </div>

                {onDismiss && (
                    <button
                        type="button"
                        onClick={handleDismiss}
                        data-testid="celebration-dismiss-btn"
                        aria-label={t('celebration.dismiss', 'סגור חגיגה')}
                        className="text-slate-400 hover:text-slate-600 p-1 text-sm cursor-pointer rounded-lg hover:bg-amber-100/50 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Economy prompt: "play a quick round, then send today's coins to [kid]" */}
            <div
                data-testid="celebration-economy-prompt"
                className="bg-white/80 rounded-2xl border border-amber-200/80 p-3 text-xs flex items-center justify-between gap-2"
            >
                <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                        <span className="font-bold text-slate-700">{economyPrompt}</span>
                        <div className="text-[11px] text-amber-700 mt-0.5">
                            {`יתרת המטבעות שלך: ${economyState.coins} (עד ${CELEBRATION_DAILY_CAP} ליום לילד)`}
                        </div>
                    </div>
                </div>
                {onPlayGames && (
                    <button
                        type="button"
                        onClick={onPlayGames}
                        data-testid="celebration-play-games-btn"
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer"
                    >
                        {t('celebration.playNow', 'שחקו עכשיו 🎮')}
                    </button>
                )}
            </div>

            {/* Status Feedback (inline) */}
            {statusMessage && (
                <div
                    data-testid="celebration-status-message"
                    className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl text-center"
                >
                    {statusMessage}
                </div>
            )}

            {/* One-Tap Actions: 'שלח מטבעות' + 'שלח מחיאות כפיים' */}
            <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                    type="button"
                    onClick={handleSendGift}
                    disabled={Boolean(giftValidationError) || giftAmount <= 0}
                    data-testid="celebration-send-coins-btn"
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-white font-extrabold text-sm py-3 px-3 rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                >
                    <Coins className="w-4 h-4 shrink-0" />
                    <span>{t('celebration.sendCoins', 'שלח מטבעות')}</span>
                </button>

                <button
                    type="button"
                    onClick={handleSendCheer}
                    disabled={!cheerAllowed}
                    data-testid="celebration-send-cheer-btn"
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-white font-extrabold text-sm py-3 px-3 rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>{t('celebration.sendCheer', 'שלח מחיאות כפיים')}</span>
                </button>
            </div>

            {/* Error notice if limit hit or insufficient coins */}
            {giftValidationError && giftValidationError !== 'no_child' && actionState === 'idle' && (
                <div data-testid="celebration-limit-notice" className="text-[11px] text-amber-700 text-center font-medium">
                    {giftValidationError === 'insufficient_coins'
                        ? 'שחקו סיבוב קצר במשחקי הורים כדי לצבור מטבעות'
                        : giftValidationError === 'child_daily_limit_exceeded'
                        ? `הגעת למכסה היומית של ${CELEBRATION_DAILY_CAP} מטבעות לילד זה`
                        : t(`parent.economy.errors.${giftValidationError}`, 'לא ניתן לשלוח כרגע')}
                </div>
            )}
        </div>
    );
};
