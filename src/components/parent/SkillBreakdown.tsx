import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import { deriveSkillInsights } from '../../lib/skillAnalysis';
import type { BaseProblemConfig } from '../../engines/ProblemFactory';

// Canonical skill keys and their Hebrew labels + problem config for targeted practice
const SKILL_CONFIGS: Record<string, { labelHe: string; labelEn: string; config: BaseProblemConfig }> = {
    addition: {
        labelHe: 'חיבור',
        labelEn: 'Addition',
        config: { type: 'addition_simple' },
    },
    'addition_carry': {
        labelHe: 'חיבור בשאלה',
        labelEn: 'Addition (Carry)',
        config: { type: 'addition_carry' },
    },
    subtraction: {
        labelHe: 'חיסור',
        labelEn: 'Subtraction',
        config: { type: 'sub_simple' },
    },
    'subtraction_borrow': {
        labelHe: 'חיסור בשאילה',
        labelEn: 'Subtraction (Borrow)',
        config: { type: 'sub_borrow' },
    },
    multiplication: {
        labelHe: 'כפל',
        labelEn: 'Multiplication',
        config: { type: 'multiplication' },
    },
    division: {
        labelHe: 'חילוק',
        labelEn: 'Division',
        config: { type: 'division' },
    },
    series: {
        labelHe: 'סדרות',
        labelEn: 'Series',
        config: { type: 'series_simple' },
    },
    comparison: {
        labelHe: 'השוואה',
        labelEn: 'Comparison',
        config: { type: 'comparison_simple' },
    },
    word_problems: {
        labelHe: 'בעיות מילוליות',
        labelEn: 'Word Problems',
        config: { type: 'word' },
    },
    algebraic: {
        labelHe: 'אלגברה',
        labelEn: 'Algebra',
        config: { type: 'addition_simple' }, // fallback
    },
};

interface SkillBreakdownProps {
    onPracticeSkill?: (config: BaseProblemConfig) => void;
}

export const SkillBreakdown: React.FC<SkillBreakdownProps> = ({ onPracticeSkill }) => {
    const { t } = useTranslation();
    const { allProfiles } = useProfile();
    const [selectedProfileId, setSelectedProfileId] = useState(allProfiles[0]?.id || '');

    const selectedProfile = useMemo(
        () => allProfiles.find(p => p.id === selectedProfileId) || allProfiles[0],
        [allProfiles, selectedProfileId],
    );

    const analysis = useMemo(
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

    // Bar colors based on accuracy
    const getBarColor = (accuracy: number): string => {
        if (accuracy >= 80) return 'from-green-400 to-green-600';
        if (accuracy >= 60) return 'from-yellow-400 to-yellow-600';
        if (accuracy >= 40) return 'from-orange-400 to-orange-600';
        return 'from-red-400 to-red-600';
    };

    return (
        <div className="space-y-6">
            {/* Profile Selector */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-500">{t('analytics.selectProfile')}</label>
                <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="flex-1 max-w-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400"
                >
                    {allProfiles.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.avatarId} {p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Strongest & Weakest highlight cards */}
            {(analysis.strongest || analysis.weakest) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {analysis.strongest && (
                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-4 flex items-center gap-3">
                            <div className="text-3xl">🏆</div>
                            <div className="flex-1">
                                <div className="text-xs font-bold text-amber-600">{t('analytics.strongest')}</div>
                                <div className="text-lg font-black text-slate-700">
                                    {SKILL_CONFIGS[analysis.strongest.skillKey]?.labelHe || analysis.strongest.skillKey}
                                </div>
                                <div className="text-sm text-slate-500">
                                    {analysis.strongest.accuracy}% · {analysis.strongest.avgSpeedSec}s
                                </div>
                            </div>
                        </div>
                    )}
                    {analysis.weakest && analysis.weakest.skillKey !== analysis.strongest?.skillKey && (() => {
                        const weakest = analysis.weakest!;
                        return (
                        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-200 p-4 flex items-center gap-3">
                            <div className="text-3xl">💪</div>
                            <div className="flex-1">
                                <div className="text-xs font-bold text-red-500">{t('analytics.weakest')}</div>
                                <div className="text-lg font-black text-slate-700">
                                    {SKILL_CONFIGS[weakest.skillKey]?.labelHe || weakest.skillKey}
                                </div>
                                <div className="text-sm text-slate-500">
                                    {weakest.accuracy}% · {weakest.avgSpeedSec}s
                                </div>
                            </div>
                            {onPracticeSkill && (
                                <button
                                    onClick={() => onPracticeSkill(SKILL_CONFIGS[weakest.skillKey]?.config || { type: 'addition_simple' })}
                                    className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm px-3 py-2 rounded-xl transition-all min-h-[48px] whitespace-nowrap"
                                >
                                    {t('analytics.practiceThis')}
                                </button>
                            )}
                        </div>
                        );
                    })()}
                </div>
            )}

            {/* Per-skill breakdown bars */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span>📋</span> {t('analytics.skillBreakdown')}
                </h3>

                {analysis.insights.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        <div className="text-3xl mb-2">📭</div>
                        <p>{t('analytics.noData')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {analysis.insights.map((insight) => {
                            const config = SKILL_CONFIGS[insight.skillKey];
                            const label = config?.labelHe || insight.skillKey;
                            const isWeakest = analysis.weakest?.skillKey === insight.skillKey;
                            const isStrongest = analysis.strongest?.skillKey === insight.skillKey;

                            return (
                                <div key={insight.skillKey} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-700">{label}</span>
                                            {isStrongest && <span className="text-xs">🏆</span>}
                                            {isWeakest && <span className="text-xs">💪</span>}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400">
                                            <span>{insight.avgSpeedSec}s avg</span>
                                            <span className="font-bold text-slate-600">{insight.accuracy}%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                            <div
                                                className={`h-full bg-gradient-to-r ${getBarColor(insight.accuracy)} rounded-full transition-all`}
                                                style={{ width: `${insight.accuracy}%` }}
                                            />
                                        </div>
                                        {isWeakest && onPracticeSkill && (
                                            <button
                                                onClick={() => onPracticeSkill(config?.config || { type: 'addition_simple' })}
                                                className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all min-h-[40px] whitespace-nowrap"
                                            >
                                                {t('analytics.practiceThis')}
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {insight.correct}/{insight.attempts} {t('analytics.answers')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};