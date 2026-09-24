import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import { PostcardHub } from './PostcardHub';
import { SkillBreakdown } from './SkillBreakdown';
import { ParentGamesHub } from './ParentGamesHub';
import { ProfileManager } from './ProfileManager';
import type { BaseProblemConfig } from '../../engines/ProblemFactory';

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

/**
 * Strict sandbox reset:
 * Clears any parent gate/authentication tokens and temporary parent session state
 * from storage so nothing parent-visible leaks into keys the kid engine reads.
 */
export function resetParentSandbox(): void {
    try {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('parent_gate_token');
            sessionStorage.removeItem('parent_authenticated');
            sessionStorage.removeItem('parent_session');
            sessionStorage.removeItem('parent_gate_passed');
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('parent_temp_state');
            localStorage.removeItem('parent_gate_verified');
        }
    } catch {
        // Safe fallback if storage is restricted
    }
}

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
        // Reset internal tab view to default landing
        setActiveTab('postcard');
        // Clear sandbox tokens and parent temporary storage
        resetParentSandbox();
        onExit();
    }, [onExit]);

    // Ensure sandbox cleans up when unmounting
    useEffect(() => {
        return () => {
            resetParentSandbox();
        };
    }, []);

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
                        />
                    )}
                    {activeTab === 'goals' && (
                        <SkillBreakdown onPracticeSkill={onPracticeSkill} />
                    )}
                    {activeTab === 'games' && (
                        <ParentGamesHub />
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
