import React, { useEffect, useState } from 'react';
import { CURRICULUM } from '../../data/learningPath';
import { useProgress } from '../../context/ProgressContext';
import type { LearningNode } from '../../types/learningPath';
import { Star, Lock, LogOut, Globe, Award, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import type { ArcadeMode } from '../../engines/bubble/types';
import { ARCADE_MODE_LABELS } from '../../lib/arcadeModes';
import { QuestPanel } from '../quests/QuestPanel';
import { BadgeCollection } from '../badges/BadgeCollection';
import { TreasureShop } from '../shop/TreasureShop';
import { PetAvatar } from '../pet/PetAvatar';
import { useProfile } from '../../context/ProfileContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useQuest } from '../../context/QuestContext';

interface SagaMapProps {
    onNodeSelect: (node: LearningNode) => void;
    onLogout: () => void;
    onArcadeMode: (mode?: ArcadeMode, dailyMode?: string, dailyTarget?: number) => void;
    onOpenPet: () => void;
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

export const SagaMap: React.FC<SagaMapProps> = ({ onNodeSelect, onLogout, onArcadeMode, onOpenPet }) => {
    const { isNodeLocked, getStars } = useProgress();
    const { t, i18n } = useTranslation();
    const { logEvent } = useAnalytics();
    const { profile } = useProfile();
    const { todayChallenge } = useQuest();
    const [showModeSelector, setShowModeSelector] = useState(false);
    const [showBadges, setShowBadges] = useState(false);
    const [showShop, setShowShop] = useState(false);

    const isRtl = i18n.language === 'he';

    useEffect(() => {
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [isRtl, i18n.language]);

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'he' : 'en');
    };

    return (
        <div className="w-full min-h-screen bg-slate-100 pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
            <header className="sticky top-0 bg-white/90 backdrop-blur z-50 shadow-sm border-b border-slate-200 px-2 py-3 flex items-center justify-between">
                <button
                    data-testid="language-toggle"
                    onClick={toggleLanguage}
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                    title={i18n.language.toUpperCase()}
                    aria-label={t('app.switchLanguage')}
                >
                    <Globe size={20} aria-hidden="true" />
                </button>

                <h1 className="text-lg md:text-2xl font-bold text-slate-700">
                    {t('app.journey')}
                </h1>

                <div className="flex gap-1 items-center">
                    {/* Coin balance */}
                    <div className="flex items-center gap-1 bg-yellow-100 px-1.5 py-0.5 rounded-full">
                        <span className="text-xs">🪙</span>
                        <span className="text-xs font-bold text-yellow-700">{profile?.coins || 0}</span>
                    </div>

                    {/* Gem balance */}
                    <div className="flex items-center gap-1 bg-purple-100 px-1.5 py-0.5 rounded-full">
                        <span className="text-xs">💎</span>
                        <span className="text-xs font-bold text-purple-700">{profile?.gems || 0}</span>
                    </div>

                    {/* Pet button */}
                    {profile?.pet && (
                        <button
                            onClick={onOpenPet}
                            data-testid="pet-button"
                            className="p-1.5 bg-pink-100 hover:bg-pink-200 rounded-full transition-colors"
                            title={t('pet.title', 'החיה שלי')}
                            aria-label={t('pet.title', 'החיה שלי')}
                        >
                            <PetAvatar pet={profile.pet} level={profile.capabilities?.estimatedLevel ?? 1} variant="badge" className="!text-xl" />
                        </button>
                    )}

                    {/* Badge collection button */}
                    <button
                        onClick={() => setShowBadges(true)}
                        className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 rounded-full transition-colors"
                        title={t('badges.collection')}
                        aria-label={t('badges.collection')}
                    >
                        <Award size={20} aria-hidden="true" />
                    </button>

                    {/* Shop button */}
                    <button
                        onClick={() => setShowShop(true)}
                        className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-full transition-colors"
                        title={t('shop.title')}
                        aria-label={t('shop.title')}
                    >
                        <ShoppingBag size={20} aria-hidden="true" />
                    </button>

                    {/* Arcade button */}
                    <button
                        data-testid="arcade-button"
                        onClick={() => setShowModeSelector(true)}
                        className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-sm transition-colors"
                        title={t('app.arcade')}
                        aria-label={t('app.arcade')}
                    >
                        <Globe size={18} aria-hidden="true" />
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

            {/* Quest Panel banner */}
            <QuestPanel onStartChallenge={() => onArcadeMode(todayChallenge.mode as ArcadeMode, todayChallenge.mode, todayChallenge.target)} />

            {/* Arcade Mode Selector Modal */}
            <AnimatePresence>
                {showModeSelector && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowModeSelector(false)}
                    >
                        <motion.div
                            className="bg-white rounded-3xl p-6 m-4 max-w-sm w-full shadow-2xl"
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold text-center text-slate-700 mb-1">{t('app.arcade')}</h2>
                            <p className="text-center text-slate-400 text-sm mb-6">Pick your challenge! 🎮</p>
                            <div className="grid grid-cols-2 gap-3">
                                {(['zen', 'classic', 'blitz', 'survival'] as ArcadeMode[]).map(mode => {
                                    const info = ARCADE_MODE_LABELS[mode];
                                    return (
                                        <button
                                            key={mode}
                                            data-testid={`arcade-mode-${mode}`}
                                            onClick={() => {
                                                logEvent('arcade_mode_select', { arcade_mode: mode });
                                                setShowModeSelector(false);
                                                onArcadeMode(mode);
                                            }}
                                            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50 transition-colors text-center"
                                        >
                                            <span className="text-4xl">{info.emoji}</span>
                                            <span className="font-bold text-slate-700 text-lg">{info.name}</span>
                                            <span className="text-xs text-slate-400">{info.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setShowModeSelector(false)}
                                className="mt-4 w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-sm"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Badge Collection Modal */}
            <BadgeCollection open={showBadges} onClose={() => setShowBadges(false)} />

            {/* Treasure Shop Modal */}
            <TreasureShop open={showShop} onClose={() => setShowShop(false)} />

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
                                        data-testid={`saga-node-${node.id}`}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                                        style={{ left: `${node.position.x}%`, top: `${150 * (index + 0.5)}px` }}
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
                                            whileInView={{ opacity: 1, y: 0 }}
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
