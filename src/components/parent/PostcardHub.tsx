import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import { Mascot, type MascotCharacter } from '../mascot/Mascot';
import { deriveSkillInsights } from '../../lib/skillAnalysis';
import {
    selectPracticeTarget,
    getSkillLabel,
    getSkillPracticeConfig,
    SKILL_LABELS,
    SKILL_PRACTICE_CONFIGS,
} from '../../lib/skillFocus';
import { getWeekStartISO } from './games/parentEconomyEngine';
import { CelebrationTray } from './CelebrationTray';
import type { BaseProblemConfig } from '../../engines/ProblemFactory';
import type { UserProfile } from '../../types/user';

export { SKILL_LABELS, SKILL_PRACTICE_CONFIGS };

/**
 * Derives a single positive, mascot-voice narrative sentence based on the child's
 * skillAnalysis and streak (e.g. "רן תרגל 12 דקות השבוע, הכי חזק בחיבור").
 */
export function deriveNarrativeSentence(profile?: UserProfile | null): string {
    if (!profile) {
        return 'בחרו פרופיל כדי לראות את הגלויה השבועית';
    }

    const name = profile.name || 'הילד/ה';
    const analysis = deriveSkillInsights(profile.capabilities);
    const strongest = analysis.strongest;

    // Calculate minutes practiced in the last 7 days from sessionHistory
    const sevenDaysAgoStr = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

    const recentSessions = (profile.sessionHistory || []).filter(s => s.date >= sevenDaysAgoStr);
    const recentSec = recentSessions.reduce((sum, s) => sum + s.durationSec, 0);
    let minutes = Math.round(recentSec / 60);

    // If no recent sessions in window, but profile has session history, use total minutes
    if (minutes === 0 && (profile.sessionHistory || []).length > 0) {
        const totalSec = profile.sessionHistory!.reduce((sum, s) => sum + s.durationSec, 0);
        minutes = Math.round(totalSec / 60);
    }

    const strongestLabel = strongest ? getSkillLabel(strongest.skillKey) : null;
    const streak = profile.streak || 0;

    if (minutes > 0 && strongestLabel) {
        return `${name} תרגל ${minutes} דקות השבוע, הכי חזק ב${strongestLabel}`;
    }

    if (minutes > 0) {
        return `${name} תרגל ${minutes} דקות השבוע, עם רצף של ${streak} ימים`;
    }

    if (strongestLabel) {
        return `${name} הכי חזק ב${strongestLabel}, עם רצף של ${streak} ימים`;
    }

    if (streak > 0) {
        return `${name} ברצף של ${streak} ימים של תרגול מתמטיקה`;
    }

    return `${name} מוכן למסע למידה חדש השבוע`;
}

export interface PostcardHubProps {
    profile?: UserProfile | null;
    onPracticeSkill?: (config: BaseProblemConfig) => void;
    onOpenDetails?: () => void;
    onOpenGames?: () => void;
}

export const PostcardHub: React.FC<PostcardHubProps> = ({
    profile: propProfile,
    onPracticeSkill,
    onOpenDetails,
    onOpenGames,
}) => {
    const { t, i18n } = useTranslation();
    let contextProfile: UserProfile | null = null;
    try {
        const ctx = useProfile();
        contextProfile = ctx.profile;
    } catch {
        // Fallback for tests rendered without ProfileProvider
    }
    const activeProfile = propProfile !== undefined ? propProfile : contextProfile;

    const skillAnalysis = useMemo(
        () => deriveSkillInsights(activeProfile?.capabilities),
        [activeProfile?.capabilities],
    );

    const narrative = useMemo(
        () => deriveNarrativeSentence(activeProfile),
        [activeProfile],
    );

    // Derive weakest skill for the single action chip using shared helper
    const practiceTarget = useMemo(() => {
        return selectPracticeTarget(skillAnalysis);
    }, [skillAnalysis]);

    // Active weekly goal (if present and current weekStart matches)
    const activeWeeklyGoal = useMemo(() => {
        if (!activeProfile?.weeklyGoal) return null;
        const currentWeek = getWeekStartISO();
        if (activeProfile.weeklyGoal.weekStart !== currentWeek) return null;
        return activeProfile.weeklyGoal;
    }, [activeProfile?.weeklyGoal]);

    // 3 compact stats
    const streak = activeProfile?.streak || 0;
    const badgesCount = (activeProfile?.unlockedBadges || []).length;
    const totalCorrect = skillAnalysis.insights.reduce((sum, i) => sum + i.correct, 0);
    const totalAttempts = skillAnalysis.insights.reduce((sum, i) => sum + i.attempts, 0);
    const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    // 7-day compact presence strip (ending today)
    const last7Days = useMemo(() => {
        const dayLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
        const dailyStamps = activeProfile?.dailyStamps || [];

        const days: { date: string; dayLabel: string; isToday: boolean; hasActivity: boolean }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000);
            const dateStr = d.toISOString().slice(0, 10);
            days.push({
                date: dateStr,
                dayLabel: dayLabels[d.getUTCDay()],
                isToday: i === 0,
                hasActivity: dailyStamps.includes(dateStr),
            });
        }
        return days;
    }, [activeProfile?.dailyStamps]);

    const mascotChar: MascotCharacter = (
        activeProfile?.mascotId && ['owl', 'bear', 'ant', 'lion'].includes(activeProfile.mascotId)
            ? activeProfile.mascotId
            : 'bear'
    ) as MascotCharacter;

    if (!activeProfile) {
        return (
            <div data-testid="postcard-hub" className="text-center text-slate-400 py-12">
                <div className="text-4xl mb-2">💌</div>
                <p>{t('parent.noProfileSelected', 'לא נבחר פרופיל')}</p>
            </div>
        );
    }

    return (
        <div
            data-testid="postcard-hub"
            dir={i18n.dir ? i18n.dir() : 'rtl'}
            className="space-y-4 max-w-md mx-auto"
        >
            {/* 1. Mascot Narrative Card (Postcard Hero) */}
            <div
                data-testid="postcard-hero"
                className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-100/40 border border-amber-200/90 rounded-3xl p-5 shadow-xs relative overflow-hidden"
            >
                <div className="flex items-center gap-4">
                    <div className="shrink-0 relative">
                        <Mascot
                            character={mascotChar}
                            emotion="happy"
                            size="sm"
                            className="w-16 h-16"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="text-xs font-bold text-amber-700/80 mb-1 flex items-center gap-1">
                            <span>💌</span>
                            <span>{t('parent.postcard.badge', 'גלויה מהמדריך')}</span>
                        </div>
                        <p
                            data-testid="postcard-narrative"
                            className="text-base font-bold text-slate-800 leading-snug"
                        >
                            {narrative}
                        </p>
                    </div>
                </div>
            </div>

            {/* CelebrationTray (Card PG-4) — Contextual card when new milestone/badge fired */}
            <CelebrationTray
                profile={activeProfile}
                onPlayGames={onOpenGames}
            />

            {/* 2. ONE Action Chip: the weakest-skill practice */}
            <div
                data-testid="postcard-action-chip"
                className="bg-white rounded-2xl border border-rose-100 p-4 shadow-xs flex items-center justify-between gap-3"
            >
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 font-black text-xl shrink-0">
                        💪
                    </div>
                    <div>
                        <div className="text-xs font-bold text-rose-500">
                            {t('parent.postcard.actionTitle', 'חיזוק מומלץ')}
                        </div>
                        <div className="text-sm font-extrabold text-slate-800">
                            {practiceTarget.label}
                            {practiceTarget.accuracy > 0 ? ` (${practiceTarget.accuracy}% דיוק)` : ''}
                        </div>
                    </div>
                </div>
                {onPracticeSkill && (
                    <button
                        type="button"
                        onClick={() => onPracticeSkill(practiceTarget.config)}
                        data-testid="postcard-practice-btn"
                        className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all min-h-[44px] shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                        <span>{t('analytics.practiceThis', 'תרגל עכשיו')}</span>
                        <span aria-hidden="true">←</span>
                    </button>
                )}
            </div>

            {/* Weekly Goal Chip (card PG-3) */}
            {activeWeeklyGoal ? (
                <div
                    data-testid="postcard-weekly-goal-chip"
                    className="bg-white rounded-2xl border border-blue-100 p-4 shadow-xs flex items-center justify-between gap-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 font-black text-xl shrink-0">
                            🎯
                        </div>
                        <div>
                            <div className="text-xs font-bold text-blue-500">
                                {t('parent.postcard.weeklyGoalTitle', 'יעד שבועי')}
                            </div>
                            <div className="text-sm font-extrabold text-slate-800">
                                {`${activeWeeklyGoal.target} תרגילי ${getSkillLabel(activeWeeklyGoal.skillKey)}`}
                            </div>
                        </div>
                    </div>
                    {onPracticeSkill ? (
                        <button
                            type="button"
                            onClick={() => onPracticeSkill(getSkillPracticeConfig(activeWeeklyGoal.skillKey))}
                            data-testid="postcard-goal-practice-btn"
                            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all min-h-[44px] shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                            <span>{t('analytics.practiceThis', 'תרגל עכשיו')}</span>
                            <span aria-hidden="true">←</span>
                        </button>
                    ) : onOpenDetails ? (
                        <button
                            type="button"
                            onClick={onOpenDetails}
                            data-testid="postcard-goal-details-btn"
                            className="text-blue-600 font-bold text-xs hover:underline cursor-pointer"
                        >
                            {t('parent.tabs.goals', 'מטרות')} →
                        </button>
                    ) : null}
                </div>
            ) : onOpenDetails ? (
                <div
                    data-testid="postcard-weekly-goal-chip"
                    className="bg-white/80 rounded-2xl border border-dashed border-slate-200 p-3.5 flex items-center justify-between gap-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-base shrink-0">
                            🎯
                        </div>
                        <div className="text-xs font-bold text-slate-500">
                            {t('parent.postcard.noWeeklyGoal', 'טרם הוגדר יעד שבועי')}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onOpenDetails}
                        data-testid="postcard-set-goal-btn"
                        className="text-blue-600 hover:text-blue-700 font-bold text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                        {t('parent.postcard.setGoalAction', 'הגדר יעד')} +
                    </button>
                </div>
            ) : null}

            {/* 3. Compact 3-Stat Strip (streak / badges / accuracy) */}
            <div data-testid="postcard-stat-strip" className="grid grid-cols-3 gap-2.5">
                <div
                    data-testid="postcard-stat-streak"
                    className="bg-white rounded-2xl border border-slate-100 p-3 shadow-xs flex flex-col items-center text-center"
                >
                    <span className="text-2xl mb-1" aria-hidden="true">🔥</span>
                    <span className="text-xl font-black text-slate-800 leading-none">{streak}</span>
                    <span className="text-[11px] font-bold text-slate-400 mt-1">{t('analytics.streak', 'רצף ימים')}</span>
                </div>

                <div
                    data-testid="postcard-stat-badges"
                    className="bg-white rounded-2xl border border-slate-100 p-3 shadow-xs flex flex-col items-center text-center"
                >
                    <span className="text-2xl mb-1" aria-hidden="true">🏅</span>
                    <span className="text-xl font-black text-slate-800 leading-none">{badgesCount}</span>
                    <span className="text-[11px] font-bold text-slate-400 mt-1">{t('analytics.badges', 'תגים נצברו')}</span>
                </div>

                <div
                    data-testid="postcard-stat-accuracy"
                    className="bg-white rounded-2xl border border-slate-100 p-3 shadow-xs flex flex-col items-center text-center"
                >
                    <span className="text-2xl mb-1" aria-hidden="true">🎯</span>
                    <span className="text-xl font-black text-slate-800 leading-none">{overallAccuracy}%</span>
                    <span className="text-[11px] font-bold text-slate-400 mt-1">{t('analytics.accuracy', 'דיוק כללי')}</span>
                </div>
            </div>

            {/* 4. Compact 7-Day Heatmap Strip */}
            <div
                data-testid="postcard-heatmap-strip"
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs"
            >
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span>🗓️</span>
                        <span>{t('parent.postcard.presenceTitle', 'נוכחות השבוע')}</span>
                    </span>
                    <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {t('parent.postcard.presenceMotto', 'ימי מנוחה הם חלק מהלמידה 🌿')}
                    </span>
                </div>

                {/* 7 circles for the 7 days */}
                <div className="flex justify-between items-center px-1">
                    {last7Days.map(day => (
                        <div key={day.date} className="flex flex-col items-center gap-1.5">
                            <div
                                data-testid={`heatmap-day-${day.date}`}
                                title={`${day.date}${day.hasActivity ? ' - נרשמה פעילות' : ''}`}
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    day.hasActivity
                                        ? 'bg-emerald-500 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-400'
                                } ${day.isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                            >
                                {day.hasActivity ? '✓' : '•'}
                            </div>
                            <span className="text-[11px] font-bold text-slate-400">{day.dayLabel}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 5. "פרטים נוספים" Drill-Down Link */}
            <div className="flex justify-center pt-1">
                <button
                    type="button"
                    onClick={onOpenDetails}
                    data-testid="postcard-details-link"
                    className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline min-h-[44px] px-4 py-2 cursor-pointer transition-colors"
                >
                    <span>{t('parent.postcard.moreDetails', 'פרטים נוספים')}</span>
                    <span aria-hidden="true">←</span>
                </button>
            </div>
        </div>
    );
};
