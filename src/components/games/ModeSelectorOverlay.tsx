import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calculator, Heart, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { GameMode } from '../../hooks/usePracticeSession'; // Will define this next

interface ModeCardProps {
    mode: GameMode;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    onSelect: (mode: GameMode) => void;
    bestScore?: number;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    },
    exit: { opacity: 0 }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 24 } as any
    }
};

interface ModeSelectorOverlayProps {
    onSelectMode: (mode: GameMode) => void;
    onClose: () => void;
    isOpen: boolean;
    bestIcons?: Record<string, React.ElementType>; // Future proofing
    bestScores?: Record<string, number>;
}

const ModeCard: React.FC<Omit<ModeCardProps, 'delay'>> = ({ mode, title, description, icon: Icon, color, onSelect, bestScore }) => {
    return (
        <motion.button
            variants={itemVariants}
            onClick={() => onSelect(mode)}
            className="group relative w-full h-auto min-h-[16rem] sm:min-h-[16rem] bg-white/90 backdrop-blur-sm rounded-3xl p-6 
                       flex flex-col items-center text-center justify-between
                       shadow-xl border-2 border-transparent hover:border-white/50
                       transition-all hover:scale-[1.02]"
        >
            {/* Background Glow */}
            <div className={cn("absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500", color)} />

            {/* Icon Bubble */}
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-inner shrink-0", color, "bg-opacity-10")}>
                <Icon size={40} className={cn("text-slate-700", color.replace('bg-', 'text-'))} />
            </div>

            <div className="space-y-2 z-10 flex-grow flex flex-col justify-center">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
                <p className="text-slate-500 font-medium text-sm leading-snug">{description}</p>
            </div>

            {/* High Score Badge */}
            <div className="mt-4 flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full shrink-0">
                <Trophy size={14} className="text-yellow-500" />
                <span className="text-xs font-bold text-slate-600">
                    {bestScore ? `Best: ${bestScore}` : 'No Record'}
                </span>
            </div>
        </motion.button>
    );
};

export const ModeSelectorOverlay: React.FC<ModeSelectorOverlayProps> = ({ onSelectMode, onClose, isOpen, bestScores }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {/* 1. Backdrop (Fixed) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md"
                aria-hidden="true"
            />

            {/* 2. Scroll Wrapper (Fixed + Overflow) */}
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="relative w-full max-w-6xl flex flex-col items-center"
                    >
                        {/* Header */}
                        <motion.div variants={itemVariants} className="mb-8 md:mb-12">
                            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-lg mb-2 tracking-tight">
                                {t('practice.chooseMode', 'Choose Your Challenge')}
                            </h1>
                            <p className="text-white/80 font-medium text-lg max-w-lg mx-auto leading-relaxed">
                                {t('practice.chooseModeDesc', 'Select how you want to play today')}
                            </p>
                        </motion.div>

                        {/* Close Button (Absolute relative to this container, or Fixed if desired, sticking to flow here) */}
                        <button
                            onClick={onClose}
                            className="fixed top-4 right-4 md:absolute md:-top-12 md:-right-4 p-2 bg-black/20 md:bg-transparent rounded-full text-white/80 hover:text-white hover:bg-black/40 md:hover:bg-transparent transition-all z-50"
                            aria-label={t('common.close')}
                        >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                            <ModeCard
                                mode="STANDARD"
                                title={t('practice.zen.title', 'Zen Math')}
                                description={t('practice.zen.desc', 'Take your time. No timers, just learning.')}
                                icon={Calculator}
                                color="bg-blue-500"
                                onSelect={onSelectMode}
                                bestScore={bestScores?.['STANDARD']}
                            />
                            <ModeCard
                                mode="TIME_ATTACK"
                                title={t('practice.time.title', 'Time Attack')}
                                description={t('practice.time.desc', 'Race the clock! +2s for correct answers.')}
                                icon={Clock}
                                color="bg-orange-500"
                                onSelect={onSelectMode}
                                bestScore={bestScores?.['TIME_ATTACK']}
                            />
                            <ModeCard
                                mode="SURVIVAL"
                                title={t('practice.survival.title', 'Survival')}
                                description={t('practice.survival.desc', '3 Lives. Don\'t make a mistake!')}
                                icon={Heart}
                                color="bg-rose-500"
                                onSelect={onSelectMode}
                                bestScore={bestScores?.['SURVIVAL']}
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    );
};
