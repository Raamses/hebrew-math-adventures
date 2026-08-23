import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProfileManager } from './ProfileManager';
import { ProgressOverview } from './ProgressOverview';
import { SkillBreakdown } from './SkillBreakdown';
import type { BaseProblemConfig } from '../../engines/ProblemFactory';

interface ParentDashboardProps {
    onExit: () => void;
    onPracticeSkill?: (config: BaseProblemConfig) => void;
}

type TabId = 'profiles' | 'progress' | 'skills';

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onExit, onPracticeSkill }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabId>('profiles');

    const tabs: { id: TabId; label: string; icon: string }[] = [
        { id: 'profiles', label: t('parent.manageProfiles'), icon: '👥' },
        { id: 'progress', label: t('analytics.progress'), icon: '📈' },
        { id: 'skills', label: t('analytics.skillAnalysis'), icon: '📋' },
    ];

    return (
        <div data-testid="parent-dashboard" className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
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

                <nav className="flex gap-2 mb-6 bg-white rounded-2xl shadow-sm p-2 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap min-h-[48px] flex-1 justify-center ${
                                activeTab === tab.id
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {activeTab === 'profiles' && <ProfileManager />}
                {activeTab === 'progress' && <ProgressOverview />}
                {activeTab === 'skills' && <SkillBreakdown onPracticeSkill={onPracticeSkill} />}
            </div>
        </div>
    );
};
