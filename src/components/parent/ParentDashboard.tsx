import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import { PostcardHub } from './PostcardHub';
import { SkillBreakdown } from './SkillBreakdown';
import { ParentGamesHub } from './ParentGamesHub';
import { ProfileManager } from './ProfileManager';
import { SKILL_CONFIGS, getSkillLabel, getSkillPracticeConfig } from '../../lib/skillFocus';
import { getWeekStartISO, PARENT_BADGES } from './games/parentEconomyEngine';
import { useParentEconomy } from '../../hooks/useParentEconomy';
import type { BaseProblemConfig } from '../../engines/ProblemFactory';
import type { UserProfile, WeeklyGoal } from '../../types/user';
import type { ParentBadgeId } from '../../types/parent';

export type ParentTabId = 'postcard' | 'goals' | 'games' | 'settings';

export interface TabConfig {
    id: ParentTabId;
    labelKey: string;
    defaultLabel: string;
    icon: string;
}

export const PARENT_TABS: TabConfig[] = [
    { id: 'postcard', labelKey: 'parent.tabs.postcard', defaultLabel: 'גלויה', icon: '💌' },
    { id: 'goals', labelKey: 'parent.tabs.goals', defaultLabel: 'מטרות', icon: '🎯' },
    { id: 'games', labelKey: 'parent.tabs.games', defaultLabel: 'משחקים', icon: '🎮' },
    { id: 'settings', labelKey: 'parent.tabs.settings', defaultLabel: 'הגדרות', icon: '⚙️' },
];

export interface WeeklyGoalCardProps {
    profile?: UserProfile | null;
    onPracticeSkill?: (config: BaseProblemConfig) => void;
    onSetGoal?: (goal: WeeklyGoal | undefined) => void;
}

export const WeeklyGoalCard: React.FC<WeeklyGoalCardProps> = ({
    profile: propProfile,
    onPracticeSkill,
    onSetGoal,
}) => {
    const { t } = useTranslation();
    let contextProfile: UserProfile | null = null;
    let updateProfile: ((id: string, updates: Partial<UserProfile>) => void) | undefined = undefined;
    try {
        const ctx = useProfile();
        contextProfile = ctx.profile;
        updateProfile = ctx.updateProfile;
    } catch {
        // Fallback for tests rendered without ProfileProvider
    }
    const activeProfile = propProfile !== undefined ? propProfile : contextProfile;

    const currentWeek = getWeekStartISO();
    const rawGoal = activeProfile?.weeklyGoal;
    const isRolledOver = Boolean(rawGoal && rawGoal.weekStart !== currentWeek);
    const activeGoal = isRolledOver ? null : rawGoal;

    // Auto-clear on rollover if weekStart mismatch
    useEffect(() => {
        if (isRolledOver && activeProfile?.id) {
            if (updateProfile) {
                updateProfile(activeProfile.id, { weeklyGoal: undefined });
            }
            if (onSetGoal) {
                onSetGoal(undefined);
            }
        }
    }, [isRolledOver, activeProfile?.id, updateProfile, onSetGoal]);

    const [isEditing, setIsEditing] = useState(false);
    const skillKeys = useMemo(() => Object.keys(SKILL_CONFIGS), []);
    const [selectedSkill, setSelectedSkill] = useState<string>(activeGoal?.skillKey || skillKeys[0] || 'addition');
    const [targetCount, setTargetCount] = useState<number>(activeGoal?.target || 5);

    // Sync form state when activeGoal changes
    useEffect(() => {
        if (activeGoal) {
            setSelectedSkill(activeGoal.skillKey);
            setTargetCount(activeGoal.target);
        } else {
            setSelectedSkill(skillKeys[0] || 'addition');
            setTargetCount(5);
        }
    }, [activeGoal, skillKeys]);

    const handleSave = useCallback(() => {
        const target = Math.max(1, Number(targetCount) || 5);
        const goalData: WeeklyGoal = {
            skillKey: selectedSkill,
            target,
            weekStart: currentWeek,
        };
        if (activeProfile?.id && updateProfile) {
            updateProfile(activeProfile.id, { weeklyGoal: goalData });
        }
        if (onSetGoal) {
            onSetGoal(goalData);
        }
        setIsEditing(false);
    }, [activeProfile?.id, selectedSkill, targetCount, currentWeek, updateProfile, onSetGoal]);

    const handleClear = useCallback(() => {
        if (activeProfile?.id && updateProfile) {
            updateProfile(activeProfile.id, { weeklyGoal: undefined });
        }
        if (onSetGoal) {
            onSetGoal(undefined);
        }
        setIsEditing(false);
    }, [activeProfile?.id, updateProfile, onSetGoal]);

    if (!activeProfile) {
        return null;
    }

    const showForm = !activeGoal || isEditing;

    return (
        <div
            data-testid="weekly-goal-card"
            className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4"
        >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl shrink-0">
                        🎯
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-slate-800 leading-tight">
                            {t('parent.goals.title', 'מטרה שבועית')}
                        </h2>
                        <p className="text-xs text-slate-400">
                            {t('parent.goals.subtitle', 'הגדר יעד שיופיע כאתגר מיוחד לילד/ה')}
                        </p>
                    </div>
                </div>
                {activeGoal && !isEditing && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        {t('parent.goals.activeStatus', 'פעיל השבוע ✓')}
                    </span>
                )}
            </div>

            {showForm ? (
                <div data-testid="weekly-goal-form" className="space-y-4">
                    <div>
                        <label
                            htmlFor="weekly-goal-skill-picker"
                            className="block text-xs font-bold text-slate-600 mb-1.5"
                        >
                            {t('parent.goals.selectSkill', 'בחר מיומנות יעד:')}
                        </label>
                        <select
                            id="weekly-goal-skill-picker"
                            data-testid="weekly-goal-skill-picker"
                            value={selectedSkill}
                            onChange={(e) => setSelectedSkill(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 min-h-[44px] shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                        >
                            {skillKeys.map((key) => (
                                <option key={key} value={key}>
                                    {SKILL_CONFIGS[key]?.defaultLabelHe || key}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="weekly-goal-target-input"
                            className="block text-xs font-bold text-slate-600 mb-1.5"
                        >
                            {t('parent.goals.selectCount', 'כמות תרגילים:')}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                id="weekly-goal-target-input"
                                type="number"
                                data-testid="weekly-goal-target-input"
                                min={1}
                                max={100}
                                value={targetCount}
                                onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-center text-slate-800 min-h-[44px] shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            {[5, 10, 15, 20].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setTargetCount(preset)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] transition-colors cursor-pointer ${
                                        targetCount === preset
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            data-testid="weekly-goal-save-btn"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all min-h-[44px] shadow-xs cursor-pointer"
                        >
                            {activeGoal ? t('common.save', 'שמור שינויים') : t('parent.goals.saveGoal', 'שמור מטרה')}
                        </button>
                        {activeGoal && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                data-testid="weekly-goal-cancel-btn"
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-2.5 px-4 rounded-xl transition-all min-h-[44px] cursor-pointer"
                            >
                                {t('common.cancel', 'ביטול')}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div data-testid="weekly-goal-display" className="space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-bold text-slate-400 mb-0.5">
                                {t('parent.goals.activeGoalTitle', 'יעד שהוגדר')}
                            </div>
                            <div
                                data-testid="weekly-goal-text"
                                className="text-lg font-black text-slate-800"
                            >
                                {`${activeGoal.target} תרגילי ${getSkillLabel(activeGoal.skillKey)}`}
                            </div>
                            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                                {`שבוע שהחל ב-${activeGoal.weekStart}`}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                data-testid="weekly-goal-edit-btn"
                                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition-all min-h-[44px] shadow-xs cursor-pointer"
                            >
                                {t('parent.goals.edit', 'ערוך')}
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                data-testid="weekly-goal-clear-btn"
                                aria-label="נקה מטרה"
                                className="bg-white border border-rose-100 hover:bg-rose-50 text-rose-600 font-bold text-xs p-2 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shadow-xs cursor-pointer"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>

                    {onPracticeSkill && (
                        <button
                            type="button"
                            onClick={() => onPracticeSkill(getSkillPracticeConfig(activeGoal.skillKey))}
                            data-testid="weekly-goal-practice-btn"
                            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                        >
                            <span>{t('parent.goals.practiceTarget', 'תרגל יעד שבועי עכשיו')}</span>
                            <span aria-hidden="true">←</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export interface ParentDashboardProps {
    onExit: () => void;
    onPracticeSkill?: (config: BaseProblemConfig) => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onExit, onPracticeSkill }) => {
    const { t, i18n } = useTranslation();
    const { profile, allProfiles, switchProfile } = useProfile();
    const [activeTab, setActiveTab] = useState<ParentTabId>('postcard');
    const [selectedChildId, setSelectedChildId] = useState<string>(
        profile?.id || (allProfiles && allProfiles.length > 0 ? allProfiles[0].id : '')
    );

    // Keep child selection in sync with ProfileContext
    useEffect(() => {
        if (profile?.id && profile.id !== selectedChildId) {
            setSelectedChildId(profile.id);
        }
    }, [profile?.id, selectedChildId]);

    const selectedProfile = useMemo(() => {
        if (allProfiles && allProfiles.length > 0) {
            const found = allProfiles.find(p => p.id === selectedChildId);
            if (found) return found;
        }
        return profile || (allProfiles && allProfiles.length > 0 ? allProfiles[0] : null);
    }, [allProfiles, selectedChildId, profile]);

    const handleChildChange = useCallback((newId: string) => {
        setSelectedChildId(newId);
        if (switchProfile) {
            switchProfile(newId);
        }
    }, [switchProfile]);

    const handleExit = useCallback(() => {
        // Reset in-memory tab view to default landing
        setActiveTab('postcard');
        onExit();
    }, [onExit]);

    const { state: economyState } = useParentEconomy();

    return (
        <div
            data-testid="parent-dashboard"
            dir={i18n.dir ? i18n.dir() : 'rtl'}
            className="min-h-screen bg-slate-50 p-4 sm:p-6 pb-24"
        >
            <div className="w-full max-w-md mx-auto">
                {/* Top Bar: Child Switcher + Exit Button (44px tap zones) */}
                <header className="flex justify-between items-center mb-6 gap-2">
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="parent-child-select"
                            className="text-xs font-bold text-slate-500 whitespace-nowrap"
                        >
                            {t('parent.switcher.label', 'ילד/ה:')}
                        </label>
                        <select
                            id="parent-child-select"
                            data-testid="parent-child-switcher"
                            aria-label={t('parent.switcher.aria', 'החלף ילד')}
                            value={selectedProfile?.id || ''}
                            onChange={(e) => handleChildChange(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 min-h-[44px] shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                        >
                            {allProfiles && allProfiles.length > 0 ? (
                                allProfiles.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))
                            ) : (
                                <option value="">{t('parent.noProfiles', 'אין פרופילים')}</option>
                            )}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleExit}
                        data-testid="parent-exit-button"
                        aria-label={t('parent.backToGame', 'חזרה למשחק')}
                        className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold bg-white px-3.5 py-2 rounded-xl shadow-xs border border-slate-200 min-h-[44px] min-w-[44px] text-sm cursor-pointer transition-colors active:scale-95"
                    >
                        <LogOut size={18} />
                        <span>{t('parent.backToGame', 'חזרה למשחק')}</span>
                    </button>
                </header>

                {/* Tab Content */}
                <main className="pb-4">
                    {activeTab === 'postcard' && (
                        <PostcardHub
                            profile={selectedProfile}
                            onPracticeSkill={onPracticeSkill}
                            onOpenDetails={() => setActiveTab('goals')}
                            onOpenGames={() => setActiveTab('games')}
                        />
                    )}
                    {activeTab === 'goals' && (
                        <div className="space-y-6" data-testid="parent-goals-tab">
                            <WeeklyGoalCard
                                profile={selectedProfile}
                                onPracticeSkill={onPracticeSkill}
                            />
                            <SkillBreakdown onPracticeSkill={onPracticeSkill} />
                        </div>
                    )}
                    {activeTab === 'games' && (
                        <div className="space-y-6" data-testid="parent-games-tab">
                            {/* Economy Summary: Coins Balance + Streak + Badges */}
                            <div
                                data-testid="parent-economy-bar"
                                className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-5 shadow-xs"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🪙</span>
                                        <div>
                                            <div className="text-xs font-bold text-amber-700">
                                                {t('parent.economy.balance', 'מטבעות שצברת')}
                                            </div>
                                            <div
                                                data-testid="parent-coin-balance"
                                                className="text-2xl font-black text-amber-900 leading-tight"
                                            >
                                                {economyState.coins}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🔥</span>
                                        <div>
                                            <div className="text-xs font-bold text-orange-700">
                                                {t('parent.economy.streak', 'רצף הורה')}
                                            </div>
                                            <div
                                                data-testid="parent-streak-count"
                                                className="text-2xl font-black text-orange-900 leading-tight"
                                            >
                                                {economyState.streak}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🏅</span>
                                        <div>
                                            <div className="text-xs font-bold text-purple-700">
                                                {t('parent.economy.badges', 'תגי הורה')}
                                            </div>
                                            <div
                                                data-testid="parent-badges-count"
                                                className="text-2xl font-black text-purple-900 leading-tight"
                                            >
                                                {economyState.unlockedBadges.length}/{Object.keys(PARENT_BADGES).length}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Parent Badges Strip */}
                                <div className="pt-2 border-t border-amber-200/60">
                                    <div className="text-[11px] font-bold text-amber-800/80 mb-2">
                                        {t('parent.economy.myBadges', 'תגים שצברת במשחקים:')}
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1" data-testid="parent-badges-strip">
                                        {(Object.keys(PARENT_BADGES) as ParentBadgeId[]).map((badgeId) => {
                                            const badge = PARENT_BADGES[badgeId];
                                            const isUnlocked = economyState.unlockedBadges.includes(badgeId);
                                            return (
                                                <div
                                                    key={badgeId}
                                                    data-testid={`parent-badge-${badgeId}`}
                                                    title={isUnlocked ? t(badge.titleKey, badgeId) : t('parent.economy.locked', 'נעול')}
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all ${
                                                        isUnlocked
                                                            ? 'bg-white shadow-xs border border-amber-200 scale-105'
                                                            : 'bg-black/5 opacity-30 grayscale'
                                                    }`}
                                                >
                                                    {badge.icon}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Mini-Games Hub UI (Kept Intact) */}
                            <ParentGamesHub />
                        </div>
                    )}
                    {activeTab === 'settings' && (
                        <ProfileManager />
                    )}
                </main>
            </div>

            {/* Fixed Bottom Tab Bar: 4 tabs, RTL-ordered */}
            <nav
                className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-50"
                aria-label={t('parent.title', 'אזור הורים')}
            >
                <div className="max-w-md mx-auto flex" dir={i18n.dir ? i18n.dir() : 'rtl'}>
                    {PARENT_TABS.map(tab => (
                        <button
                            key={tab.id}
                            data-testid={`tab-${tab.id}`}
                            onClick={() => setActiveTab(tab.id)}
                            aria-label={t(tab.labelKey, tab.defaultLabel)}
                            aria-selected={activeTab === tab.id}
                            role="tab"
                            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[60px] transition-colors cursor-pointer ${
                                activeTab === tab.id
                                    ? 'text-blue-600 border-t-2 border-blue-600 font-bold'
                                    : 'text-slate-400 border-t-2 border-transparent'
                            }`}
                        >
                            <span className="text-xl" aria-hidden="true">{tab.icon}</span>
                            <span className="text-[11px] font-bold leading-tight">
                                {t(tab.labelKey, tab.defaultLabel)}
                            </span>
                        </button>
                    ))}
                </div>
                {/* Safe area padding for mobile devices */}
                <div className="h-[env(safe-area-inset-bottom)]" />
            </nav>
        </div>
    );
};
