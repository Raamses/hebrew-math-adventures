import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProfileManager } from './ProfileManager';
import { ProgressOverview } from './ProgressOverview';
import { SkillBreakdown } from './SkillBreakdown';
import { ParentGamesHub } from './ParentGamesHub';
import type { BaseProblemConfig } from '../../engines/ProblemFactory';

interface ParentDashboardProps {
    onExit: () => void;
    onPracticeSkill?: (config: BaseProblemConfig) => void;
}

type TabId = 'profiles' | 'progress' | 'games' | 'skills';

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onExit, onPracticeSkill }) => {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabId>('profiles');

    const isRtl = i18n.dir() === 'rtl';

    const tabs: { id: TabId; label: string; icon: string }[] = [
        { id: 'profiles', label: t('parent.manageProfiles'), icon: '👥' },
        { id: 'progress', label: t('analytics.progress'), icon: '📈' },
        { id: 'games', label: t('parent.games.title', 'משחקים'), icon: '🎮' },
        { id: 'skills', label: t('analytics.skillAnalysis'), icon: '📋' },
    ];

    return (
        <div
            data-testid="parent-dashboard"
            dir={i18n.dir()}
            className="min-h-screen bg-slate-50 p-4 sm:p-6 pb-24"
        >
            <div className="w-full max-w-md mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{t('parent.title')}</h1>
                    <button
                        onClick={onExit}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold bg-white px-4 py-2 rounded-lg shadow-sm min-h-[48px]"
                    >
                        <LogOut size={20} />
                        {t('parent.exit')}
                    </button>
                </header>

                {/* Tab Content */}
                <main className="pb-4">
                    {activeTab === 'profiles' && <ProfileManager />}
                    {activeTab === 'progress' && <ProgressOverview />}
                    {activeTab === 'games' && <ParentGamesHub />}
                    {activeTab === 'skills' && <SkillBreakdown onPracticeSkill={onPracticeSkill} />}
                </main>
            </div>

            {/* Fixed Bottom Tab Bar */}
            <nav
                className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-50"
                aria-label={t('parent.title', 'אזור הורים')}
            >
                <div className="max-w-md mx-auto flex">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            aria-label={tab.label}
                            aria-selected={activeTab === tab.id}
                            role="tab"
                            className={`flex-1 flex flex-col items-center gap-1 py-2 min-h-[64px] transition-colors ${
                                activeTab === tab.id
                                    ? 'text-blue-500 border-t-2 border-blue-500'
                                    : 'text-slate-400 border-t-2 border-transparent'
                            }`}
                        >
                            <span className="text-xl" aria-hidden="true">{tab.icon}</span>
                            <span className="text-[11px] font-bold leading-tight">{tab.label}</span>
                        </button>
                    ))}
                </div>
                {/* Safe area padding for iPhone home indicator */}
                <div className="h-[env(safe-area-inset-bottom)]" />
            </nav>
        </div>
    );
};
