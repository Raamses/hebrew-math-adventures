/**
 * WeeklyLeaderboard.tsx — Shows the weekly Blitz leaderboard.
 *
 * Displays ranked scores for the current week (Sunday–Saturday).
 * Resets every Sunday. Local only (no backend).
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Medal } from 'lucide-react';
import type { LeaderboardEntry } from '../../types/parent';
import { getCurrentWeekLeaderboard, getWeekStartISO } from './games/parentEconomyEngine';

interface WeeklyLeaderboardProps {
    entries: LeaderboardEntry[];
    currentPlayerName?: string;
}

export function WeeklyLeaderboard({ entries, currentPlayerName }: WeeklyLeaderboardProps) {
    const { t } = useTranslation();

    const ranked = useMemo(() => {
        return getCurrentWeekLeaderboard(entries, getWeekStartISO()).slice(0, 10);
    }, [entries]);

    const medalColors = ['🥇', '🥈', '🥉'];

    return (
        <div className="rounded-xl bg-gradient-to-b from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('parent.economy.weeklyLeaderboard')}
                </h3>
                <span className="text-xs text-gray-400">
                    {t('parent.economy.resetsSunday')}
                </span>
            </div>

            {ranked.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-400">
                    <Medal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {t('parent.economy.noScoresYet')}
                </div>
            ) : (
                <ol className="space-y-1">
                    {ranked.map((entry, idx) => {
                        const isMe = entry.playerName === currentPlayerName;
                        return (
                            <li
                                key={`${entry.playerName}-${entry.weekStart}`}
                                className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
                                    isMe
                                        ? 'bg-purple-100 dark:bg-purple-900/30 font-semibold'
                                        : idx < 3
                                        ? 'bg-amber-50 dark:bg-amber-900/10'
                                        : ''
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-6 text-center">
                                        {idx < 3 ? medalColors[idx] : `${idx + 1}.`}
                                    </span>
                                    <span className={isMe ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}>
                                        {entry.playerName}
                                        {isMe && <span className="ml-1 text-xs text-purple-400">({t('parent.economy.you')})</span>}
                                    </span>
                                </div>
                                <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                                    {entry.score}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}
