import React, { useEffect } from 'react';
import { CURRICULUM } from '../../data/learningPath';
import { useProgress } from '../../context/ProgressContext';
import type { LearningNode } from '../../types/learningPath';
import { Star, Lock, LogOut, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SagaMapProps {
    onNodeSelect: (node: LearningNode) => void;
    onLogout: () => void;
}

export const SagaMap: React.FC<SagaMapProps> = ({ onNodeSelect, onLogout }) => {
    const { isNodeLocked, getStars } = useProgress();
    const { t, i18n } = useTranslation();

    const isRtl = i18n.language === 'he';

    useEffect(() => {
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [isRtl, i18n.language]);

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'he' : 'en');
    };

    return (
        <div className="w-full min-h-screen bg-slate-100 pb-20 overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
            <header className="sticky top-0 bg-white/90 backdrop-blur z-50 shadow-sm border-b border-slate-200 px-4 py-4 flex items-center justify-between">
                <button
                    onClick={toggleLanguage}
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors flex gap-2 items-center"
                    title="Switch Language"
                >
                    <Globe size={20} />
                    <span className="text-sm font-bold">{i18n.language.toUpperCase()}</span>
                </button>

                <h1 className="text-2xl font-bold text-slate-700">
                    {t('app.journey')}
                </h1>

                <button
                    onClick={onLogout}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title={t('menu.logout')}
                >
                    <LogOut size={20} />
                </button>
            </header>

            <div className="max-w-md mx-auto relative">
                {/* Global SVG Path Background layer could go here if we calculate all points */}

                {CURRICULUM.map((unit) => (
                    <div key={unit.id} className={`relative py-12 ${unit.backgroundClass} border-b border-white`}>
                        <div className={`absolute top-4 ${isRtl ? 'right-4' : 'left-4'} bg-white/60 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wide text-slate-600`}>
                            {t(`saga.${unit.id}_title`)}
                        </div>

                        {/* Render Nodes */}
                        <div className="relative" style={{ height: `${unit.nodes.length * 150 + 100}px` }}>

                            {/* Connector Lines (Simple SVG for now) */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                                {/* Ideally we draw bezier curves between nodes here. 
                                    For MVP, we just rely on the eye following the buttons. 
                                    Enhancement: Add curved path <path /> 
                                */}
                            </svg>

                            {unit.nodes.map((node, index) => {
                                const locked = isNodeLocked(node.id);
                                const stars = getStars(node.id);
                                const isGolden = stars === 3;

                                return (
                                    <div
                                        key={node.id}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
                                        style={{ left: `${node.position.x}%`, top: `${150 * (index + 0.5)}px` }} // Simple vertical spacing
                                        onClick={() => !locked && onNodeSelect(node)}
                                    >
                                        {/* The Button */}
                                        <div className={`
                                            w-20 h-20 rounded-full flex items-center justify-center
                                            border-4 shadow-[0_8px_0_rgb(0,0,0,0.2)] transition-all
                                            ${locked
                                                ? 'bg-slate-300 border-slate-400 cursor-not-allowed'
                                                : isGolden
                                                    ? 'bg-yellow-400 border-yellow-500 cursor-pointer active:translate-y-[4px] active:shadow-none animate-bounce-subtle'
                                                    : 'bg-white border-slate-200 cursor-pointer hover:border-blue-400 active:translate-y-[4px] active:shadow-none'
                                            }
                                        `}>
                                            {locked ? (
                                                <Lock className="text-slate-500 w-8 h-8" />
                                            ) : stars > 0 ? (
                                                <div className="text-center">
                                                    <span className="text-2xl font-black text-slate-700">{index + 1}</span>
                                                </div>
                                            ) : (
                                                <Star className="text-blue-500 w-8 h-8 fill-blue-500" />
                                            )}
                                        </div>

                                        {/* Stars Indicator */}
                                        {!locked && stars > 0 && (
                                            <div className="flex gap-1 mt-2 bg-slate-800/80 px-2 py-1 rounded-full backdrop-blur-sm">
                                                {[1, 2, 3].map(s => (
                                                    <Star
                                                        key={s}
                                                        size={12}
                                                        className={s <= stars ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Title Tooltip */}
                                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded text-xs font-bold shadow-md whitespace-nowrap z-10 pointer-events-none">
                                            {t(`saga.${node.id}_title`)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
