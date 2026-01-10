import React, { useEffect } from 'react';
import { CURRICULUM } from '../../data/learningPath';
import { useProgress } from '../../context/ProgressContext';
import type { LearningNode } from '../../types/learningPath';
import { Star, Lock, LogOut, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, type Variants } from 'framer-motion';

interface SagaMapProps {
    onNodeSelect: (node: LearningNode) => void;
    onLogout: () => void;
    onArcadeMode: () => void;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2
        }
    }
};

const unitVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const nodeVariants: Variants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: { type: "spring", stiffness: 260, damping: 20 }
    }
};

import { useAnalytics } from '../../hooks/useAnalytics';

export const SagaMap: React.FC<SagaMapProps> = ({ onNodeSelect, onLogout, onArcadeMode }) => {
    const { isNodeLocked, getStars } = useProgress();
    const { t, i18n } = useTranslation();
    const { logEvent } = useAnalytics();

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
                    title={t('app.switchLanguage')}
                    aria-label={t('app.switchLanguage')}
                >
                    <Globe size={20} aria-hidden="true" />
                    <span className="text-sm font-bold">{i18n.language.toUpperCase()}</span>
                </button>

                <h1 className="text-2xl font-bold text-slate-700">
                    {t('app.journey')}
                </h1>

                <div className="flex gap-2">
                    <button
                        onClick={onArcadeMode}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-bold shadow-sm transition-colors flex items-center gap-1"
                    >
                        <Globe size={16} /> {/* Should probably import Joystick or Gamepad icon but Globe is available */}
                        <span>{t('app.arcade')}</span>
                    </button>

                    <button
                        onClick={onLogout}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title={t('menu.logout')}
                        aria-label={t('menu.logout')}
                    >
                        <LogOut size={20} aria-hidden="true" />
                    </button>
                </div>
            </header>

            <motion.div
                className="max-w-md mx-auto relative"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Global SVG Path Background layer could go here if we calculate all points */}

                {CURRICULUM.map((unit) => (
                    <motion.div
                        key={unit.id}
                        className={`relative py-12 ${unit.backgroundClass} border-b border-white overflow-hidden`}
                        variants={unitVariants}
                    >
                        {/* Unit Title Badge */}
                        <div className={`absolute top-4 ${isRtl ? 'right-4' : 'left-4'} bg-white/60 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wide text-slate-600 z-10`}>
                            {t(`saga.${unit.id}_title`)}
                        </div>

                        {/* Render Nodes */}
                        <div className="relative" style={{ height: `${unit.nodes.length * 150 + 100}px` }}>

                            {/* Decorative Background Elements */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white blur-xl" />
                                <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-black/5 blur-xl" />
                            </div>

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
                                    <motion.div
                                        key={node.id}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                                        style={{ left: `${node.position.x}%`, top: `${150 * (index + 0.5)}px` }} // Simple vertical spacing
                                        onClick={() => {
                                            if (!locked) {
                                                logEvent('node_select', {
                                                    node_id: node.id,
                                                    unit_id: unit.id,
                                                    node_type: node.type,
                                                    is_locked: false
                                                });
                                                onNodeSelect(node);
                                            }
                                        }}
                                        variants={nodeVariants}
                                        whileHover={{ scale: locked ? 1 : 1.1 }}
                                        whileTap={{ scale: locked ? 1 : 0.95 }}
                                    >
                                        {/* The Button */}
                                        <div className={`
                                            w-20 h-20 rounded-full flex items-center justify-center
                                            border-4 shadow-[0_8px_0_rgb(0,0,0,0.2)] transition-colors duration-300
                                            ${locked
                                                ? 'bg-slate-300 border-slate-400 cursor-not-allowed grayscale'
                                                : isGolden
                                                    ? 'bg-yellow-400 border-yellow-500'
                                                    : 'bg-white border-slate-200 hover:border-blue-400'
                                            }
                                        `}>
                                            {locked ? (
                                                <Lock className="text-slate-500 w-8 h-8" aria-hidden="true" />
                                            ) : stars > 0 ? (
                                                <div className="text-center">
                                                    <span className="text-2xl font-black text-slate-700">{index + 1}</span>
                                                </div>
                                            ) : (
                                                <Star className="text-blue-500 w-8 h-8 fill-blue-500" aria-hidden="true" />
                                            )}
                                        </div>

                                        {/* Stars Indicator */}
                                        {!locked && stars > 0 && (
                                            <div className="flex gap-1 mt-2 bg-slate-800/80 px-2 py-1 rounded-full backdrop-blur-sm shadow-md">
                                                {[1, 2, 3].map(s => (
                                                    <Star
                                                        key={s}
                                                        size={12}
                                                        className={s <= stars ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}
                                                        aria-hidden="true"
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Title Tooltip */}
                                        <motion.div
                                            className="mt-2 text-center bg-white px-3 py-1 rounded-lg text-xs font-bold shadow-md whitespace-nowrap z-10 pointer-events-none text-slate-700"
                                            initial={{ opacity: 0, y: -5 }}
                                            whileInView={{ opacity: 1, y: 0 }} // Always show name for accessibility/clarity, or keep hover logic
                                            viewport={{ once: true }}
                                        >
                                            {t(`saga.${node.id}_title`)}
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};
