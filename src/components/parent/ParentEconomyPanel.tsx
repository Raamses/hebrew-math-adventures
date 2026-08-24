/**
 * ParentEconomyPanel.tsx — Displays parent coins, streak, and badges.
 *
 * Shown on the ParentDashboard, this panel summarizes the parent's economy:
 *   - Current coin balance (with gift button)
 *   - Daily play streak (with streak freeze option)
 *   - Unlocked badges grid
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Flame, Gift, Shield, Award } from 'lucide-react';
import type { ParentEconomyState, ParentBadgeId } from '../../types/parent';
import { PARENT_BADGES } from './games/parentEconomyEngine';

interface ParentEconomyPanelProps {
    state: ParentEconomyState;
    onGiftClick: () => void;
    onStreakFreeze: () => void;
}

export function ParentEconomyPanel({ state, onGiftClick, onStreakFreeze }: ParentEconomyPanelProps) {
    const { t } = useTranslation();
    const unlockedSet = useMemo(
        () => new Set(state.unlockedBadges ?? []),
        [state.unlockedBadges],
    );

    const allBadgeIds = Object.keys(PARENT_BADGES) as ParentBadgeId[];

    return (
        <div className="space-y-4">
            {/* Coins + Streak row */}
            <div className="grid grid-cols-2 gap-3">
                {/* Coins card */}
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Coins className="w-5 h-5" />
                        <span className="text-sm font-medium">{t('parent.economy.coins')}</span>
                    </div>
                    <div className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
                        {state.coins}
                    </div>
                    <button
                        onClick={onGiftClick}
                        className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                    >
                        <Gift className="w-3 h-3" />
                        {t('parent.economy.giftToChild')}
                    </button>
                </div>

                {/* Streak card */}
                <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 p-4 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <Flame className="w-5 h-5" />
                        <span className="text-sm font-medium">{t('parent.economy.streak')}</span>
                    </div>
                    <div className="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {state.streak}
                        <span className="text-sm font-normal ml-1">
                            {t('parent.economy.days')}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-orange-500 dark:text-orange-500">
                            {t('parent.economy.best')}: {state.bestStreak}
                        </span>
                        <button
                            onClick={onStreakFreeze}
                            className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                        >
                            <Shield className="w-3 h-3" />
                            {t('parent.economy.freeze')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Badges section */}
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t('parent.economy.badges')}
                    </h3>
                    <span className="text-xs text-gray-400">
                        ({unlockedSet.size}/{allBadgeIds.length})
                    </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {allBadgeIds.map((badgeId) => {
                        const badge = PARENT_BADGES[badgeId];
                        const unlocked = unlockedSet.has(badgeId);
                        return (
                            <div
                                key={badgeId}
                                title={unlocked ? t(badge.titleKey) : t('parent.economy.locked')}
                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center transition-all ${
                                    unlocked
                                        ? 'bg-white dark:bg-gray-700 shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-800 opacity-40 grayscale'
                                }`}
                            >
                                <span className="text-2xl">{badge.icon}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
