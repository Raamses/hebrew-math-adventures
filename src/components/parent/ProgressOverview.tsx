import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import { useQuest } from '../../context/QuestContext';
import { deriveSkillInsights, getWeeklyData } from '../../lib/skillAnalysis';
import { StatCard } from './StatCard';
import { WeeklyChart } from './WeeklyChart';
import { StreakHeatmap } from './StreakHeatmap';

const TOTAL_POSSIBLE_STARS = 150; // 50 nodes × 3 stars
const TOTAL_BADGES = 12;

export const ProgressOverview: React.FC = () => {
    const { t } = useTranslation();
    const { allProfiles } = useProfile();
    const { dailyProgress } = useQuest();
    const [selectedProfileId, setSelectedProfileId] = useState(allProfiles[0]?.id || '');

    const selectedProfile = useMemo(
        () => allProfiles.find(p => p.id === selectedProfileId) || allProfiles[0],
        [allProfiles, selectedProfileId],
    );

    const weeklyData = useMemo(
        () => getWeeklyData(selectedProfile?.sessionHistory),
        [selectedProfile?.sessionHistory],
    );

    const skillAnalysis = useMemo(
        () => deriveSkillInsights(selectedProfile?.capabilities),
        [selectedProfile?.capabilities],
    );

    if (!selectedProfile) {
        return (
            <div className="text-center text-slate-400 py-12">
                <div className="text-4xl mb-2">📊</div>
                <p>{t('parent.table.noProfiles')}</p>
            </div>
        );
    }

    // Calculate total correct across all skills
    const totalCorrect = skillAnalysis.insights.reduce((sum, i) => sum + i.correct, 0);
    const totalAttempts = skillAnalysis.insights.reduce((sum, i) => sum + i.attempts, 0);

    // Time played (from session history)
    const totalTimePlayed = (selectedProfile.sessionHistory || []).reduce((sum, s) => sum + s.durationSec, 0);
    const timePlayedMin = Math.round(totalTimePlayed / 60);

    // Use dailyStamps from QuestContext for the selected profile
    const dailyStamps = dailyProgress?.dailyStamps || selectedProfile.dailyStamps || [];
    const streakCount = selectedProfile.streak || 0;

    return (
        <div className="space-y-6">
            {/* Profile Selector */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-500">{t('analytics.selectProfile')}</label>
                <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="flex-1 max-w-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 min-h-[44px]"
                >
                    {allProfiles.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.avatarId} {p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Stat Cards — 2-col grid on mobile, expanding to 5-col on larger screens */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard
                    icon="⭐"
                    label={t('analytics.stars')}
                    value={`${totalCorrect > 0 ? '✓' : '0'}/${TOTAL_POSSIBLE_STARS}`}
                    color="text-amber-500"
                />
                <StatCard
                    icon="🏅"
                    label={t('analytics.badges')}
                    value={`${(selectedProfile.unlockedBadges || []).length}/${TOTAL_BADGES}`}
                    color="text-purple-500"
                />
                <StatCard
                    icon="🪙"
                    label={t('analytics.coins')}
                    value={selectedProfile.coins || 0}
                    color="text-yellow-600"
                />
                <StatCard
                    icon="⚡"
                    label={t('analytics.streak')}
                    value={streakCount}
                    color="text-orange-500"
                />
                {/* Time card spans full width on mobile (2 cols) */}
                <StatCard
                    icon="⏱️"
                    label={t('analytics.timePlayed')}
                    value={`${timePlayedMin} ${t('analytics.minutes')}`}
                    color="text-blue-500"
                    className="col-span-2 sm:col-span-1"
                />
            </div>

            {/* Weekly Chart */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span>📈</span> {t('analytics.weekly')}
                </h3>
                <WeeklyChart data={weeklyData} />
            </section>

            {/* Streak Heatmap */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span>🔥</span> {t('analytics.streak')}
                </h3>
                <StreakHeatmap dailyStamps={dailyStamps} />
            </section>

            {/* Overall Accuracy */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span>🎯</span> {t('analytics.overallAccuracy')}
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                            style={{ width: `${totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0}%` }}
                        />
                    </div>
                    <span className="text-xl font-black text-slate-700">
                        {totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0}%
                    </span>
                </div>
                <p className="text-sm text-slate-400 mt-2">
                    {totalCorrect} / {totalAttempts} {t('analytics.answers')}
                </p>
            </section>
        </div>
    );
};
