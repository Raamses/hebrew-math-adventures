import React, { useEffect, useState } from 'react';
import { CURRICULUM } from '../../data/learningPath';
import { useProgress } from '../../context/ProgressContext';
import type { LearningNode } from '../../types/learningPath';
import { Star, Lock, LogOut, Globe, Award, ShoppingBag, Menu, X, Gamepad2, Settings } from 'lucide-react';
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
    onParentAccess?: () => void;
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

export const SagaMap: React.FC<SagaMapProps> = ({ onNodeSelect, onLogout, onArcadeMode, onOpenPet, onParentAccess }) => {
    const { isNodeLocked, getStars } = useProgress();
    const { t, i18n } = useTranslation();
    const { logEvent } = useAnalytics();
    const { profile } = useProfile();
    const { todayChallenge } = useQuest();
    const [showModeSelector, setShowModeSelector] = useState(false);
    const [showBadges, setShowBadges] = useState(false);
    const [showShop, setShowShop] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            <header className="sticky top-0 bg-white/95 backdrop-blur-md z-40 shadow-xs border-b border-slate-200/80 px-3 py-2.5">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
                    {/* Title / Brand */}
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base shadow-xs shrink-0 select-none">
                            🗺️
                        </div>
                        <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight truncate">
                            {t('app.journey')}
                        </h1>
                    </div>

                    {/* Right side (End in RTL): Balances, Pet & Menu Toggle */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Coin balance */}
                        <div
                            className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-full shadow-xs text-xs font-black text-amber-900"
                            title={t('shop.coins', 'מטבעות')}
                            aria-label={`${profile?.coins || 0} ${t('shop.coins', 'מטבעות')}`}
                        >
                            <span className="text-xs select-none">🪙</span>
                            <span>{profile?.coins || 0}</span>
                        </div>

                        {/* Gem balance */}
                        <div
                            className="flex items-center gap-1 bg-purple-50 border border-purple-200/80 px-2 py-1 rounded-full shadow-xs text-xs font-black text-purple-900"
                            title="יהלומים"
                            aria-label={`${profile?.gems || 0} יהלומים`}
                        >
                            <span className="text-xs select-none">💎</span>
                            <span>{profile?.gems || 0}</span>
                        </div>

                        {/* Pet button (compact in header if pet active) */}
                        {profile?.pet && (
                            <button
                                onClick={onOpenPet}
                                data-testid="pet-button"
                                className="p-1 bg-pink-50 hover:bg-pink-100 border border-pink-200/80 rounded-full transition-all active:scale-95 shadow-xs flex items-center justify-center cursor-pointer"
                                title={t('pet.title', 'החיה שלי')}
                                aria-label={t('pet.title', 'החיה שלי')}
                            >
                                <PetAvatar
                                    pet={profile.pet}
                                    level={profile.capabilities?.estimatedLevel ?? 1}
                                    variant="badge"
                                    className="!text-lg"
                                />
                            </button>
                        )}

                        {/* Collapsible Menu Toggle Button */}
                        <button
                            data-testid="menu-toggle"
                            onClick={() => setIsMenuOpen(prev => !prev)}
                            className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                                isMenuOpen
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            aria-expanded={isMenuOpen}
                            aria-label={isMenuOpen ? t('app.common.close', 'סגור') : 'Menu'}
                        >
                            {isMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                        </button>
                    </div>
                </div>

                {/* Collapsible Menu Popover Drawer */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <>
                            {/* Backdrop overlay */}
                            <motion.div
                                key="menu-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMenuOpen(false)}
                                className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
                                aria-hidden="true"
                            />

                            {/* Dropdown Menu */}
                            <motion.div
                                key="menu-content"
                                initial={{ opacity: 0, y: -12, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                className={`fixed top-14 ${
                                    isRtl ? 'left-3' : 'right-3'
                                } z-50 w-[calc(100vw-24px)] max-w-xs bg-white rounded-3xl p-3.5 shadow-2xl border border-slate-100 text-slate-800`}
                            >
                                <div className="flex flex-col gap-2">
                                    {/* Menu Header */}
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            {t('menu.gameMenu', 'תפריט')}
                                        </span>
                                        {profile?.name && (
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                {profile.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* 1. Arcade Mode */}
                                    <button
                                        data-testid="arcade-button"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setShowModeSelector(true);
                                        }}
                                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/60 text-slate-800 transition-all active:scale-[0.98] cursor-pointer text-start w-full min-h-[48px]"
                                        title={t('app.arcade')}
                                        aria-label={t('app.arcade')}
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                                            <Gamepad2 size={19} aria-hidden="true" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-black text-orange-950">{t('app.arcade')}</div>
                                            <div className="text-[11px] text-orange-700/80 truncate">
                                                {isRtl ? 'משחקי מהירות ואתגרים' : 'Mini-games & challenges'}
                                            </div>
                                        </div>
                                    </button>

                                    {/* 2. Shop */}
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setShowShop(true);
                                        }}
                                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/60 text-slate-800 transition-all active:scale-[0.98] cursor-pointer text-start w-full min-h-[48px]"
                                        title={t('shop.title')}
                                        aria-label={t('shop.title')}
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                                            <ShoppingBag size={19} aria-hidden="true" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-black text-emerald-950">{t('shop.title')}</div>
                                            <div className="text-[11px] text-emerald-700/80 truncate">
                                                {isRtl ? 'שדרוגים, פריטים והפתעות' : 'Items & upgrades'}
                                            </div>
                                        </div>
                                    </button>

                                    {/* 3. Badges */}
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setShowBadges(true);
                                        }}
                                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200/60 text-slate-800 transition-all active:scale-[0.98] cursor-pointer text-start w-full min-h-[48px]"
                                        title={t('badges.collection')}
                                        aria-label={t('badges.collection')}
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-xs shrink-0">
                                            <Award size={19} aria-hidden="true" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-black text-purple-950">{t('badges.collection')}</div>
                                            <div className="text-[11px] text-purple-700/80 truncate">
                                                {isRtl ? 'הישגים ומדליות' : 'Achievements & medals'}
                                            </div>
                                        </div>
                                    </button>


                                    {/* Parent Zone Access */}
                                    <button
                                        data-testid="parent-zone-button"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            onParentAccess?.();
                                        }}
                                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 border border-slate-200/60 text-slate-800 transition-all active:scale-[0.98] cursor-pointer text-start w-full min-h-[48px]"
                                        title={t('parent.title', 'אזור הורים')}
                                        aria-label={t('parent.title', 'אזור הורים')}
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-slate-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                            <Settings size={19} aria-hidden="true" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-black text-slate-800">{t('parent.title', 'אזור הורים')}</div>
                                            <div className="text-[11px] text-slate-600/80 truncate">
                                                {isRtl ? 'ניהול פרופילים והתקדמות' : 'Profiles & progress'}
                                            </div>
                                        </div>
                                    </button>

                                    <div className="my-0.5 border-t border-slate-100" />

                                    {/* 4. Language Selector */}
                                    <button
                                        data-testid="language-toggle"
                                        onClick={() => {
                                            toggleLanguage();
                                        }}
                                        className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/70 text-slate-700 transition-all active:scale-[0.98] cursor-pointer w-full min-h-[48px]"
                                        title={i18n.language.toUpperCase()}
                                        aria-label={t('app.switchLanguage')}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                <Globe size={18} aria-hidden="true" />
                                            </div>
                                            <span className="text-sm font-bold">{t('app.switchLanguage')}</span>
                                        </div>
                                        <span className="text-xs font-black bg-white px-2.5 py-1 rounded-full border border-slate-200 text-slate-600">
                                            {i18n.language === 'en' ? '🇬🇧 EN' : '🇮🇱 עב'}
                                        </span>
                                    </button>

                                    {/* 5. Logout Button */}
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            onLogout();
                                        }}
                                        className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/50 text-rose-700 transition-all active:scale-[0.98] cursor-pointer w-full min-h-[48px]"
                                        title={t('menu.logout')}
                                        aria-label={t('menu.logout')}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                            <LogOut size={18} aria-hidden="true" />
                                        </div>
                                        <span className="text-sm font-bold">{t('menu.logout')}</span>
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
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
                                {(['zen', 'classic', 'blitz', 'survival', 'fusion'] as ArcadeMode[]).map(mode => {
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
