import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calculator, Heart, Trophy, X, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { GameMode } from '../../hooks/usePracticeSession';
import sagaBg from '../../assets/map/saga_bg.png';
import { ModeDetailCard } from './ModeDetailCard';

interface SagaModeSelectProps {
    onSelectMode: (mode: GameMode) => void;
    onClose: () => void;
    bestScores?: Record<string, number>;
}

interface MapLocationProps {
    mode: GameMode;
    label: string;
    icon: React.ElementType;
    color: string;
    bestScore?: number;
    delay: number;
    position: string; // Tailwind class for positioning (e.g. "top-1/4 left-1/4")
    onSelect: (mode: GameMode) => void;
    isLocked?: boolean;
    isSelected?: boolean;
}

const MapLocation: React.FC<MapLocationProps> = ({
    mode, label, icon: Icon, color, bestScore, delay, position, onSelect, isLocked, isSelected
}) => {
    // If selected, we hide the node to let the DetailCard take over via layoutId
    if (isSelected) return <div className={cn("absolute", position)} />;

    return (
        <motion.button
            layoutId={`mode-card-${mode}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: delay
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => !isLocked && onSelect(mode)}
            className={cn(
                "absolute flex flex-col items-center group focus:outline-none z-10",
                position
            )}
            aria-label={`${label} mode${bestScore ? `, Best Score: ${bestScore}` : ''}`}
        >
            {/* The Node/Medallion */}
            <div className="relative w-20 h-20 md:w-32 md:h-32">
                {/* Pulse Effect */}
                <div className={cn(
                    "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse",
                    color.replace('bg-', 'bg-') // Ensure it's a bg class
                )} style={{ filter: 'blur(20px)' }} />

                {/* Main Circle */}
                <div className={cn(
                    "relative w-full h-full rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden",
                    "bg-gradient-to-br from-white to-slate-100"
                )}>
                    <div className={cn("absolute inset-0 opacity-10", color)} /> {/* Tint */}

                    {isLocked ? (
                        <Lock className="w-8 h-8 md:w-12 md:h-12 text-slate-400" />
                    ) : (
                        <Icon className={cn("w-8 h-8 md:w-12 md:h-12", color.replace('bg-', 'text-'))} />
                    )}
                </div>

                {/* Stars/Score Badge */}
                {!isLocked && bestScore !== undefined && (
                    <div className="absolute -bottom-2 translate-x-1/2 right-1/2 w-max px-2 py-0.5 md:px-3 md:py-1 bg-white rounded-full shadow-lg border border-slate-100 flex items-center gap-1.5 z-20">
                        <Trophy size={10} className="text-yellow-500 md:w-3 md:h-3" />
                        <span className="text-[10px] md:text-xs font-bold text-slate-700">{bestScore}</span>
                    </div>
                )}
            </div>

            {/* Label */}
            <motion.div
                layoutId={`mode-label-${mode}`}
                className="mt-3 md:mt-4 bg-white/90 backdrop-blur-sm px-3 py-1 md:px-4 md:py-1.5 rounded-full shadow-md border border-white/50"
            >
                <span className="text-xs md:text-base font-black text-slate-800 tracking-wide uppercase whitespace-nowrap">
                    {label}
                </span>
            </motion.div>
        </motion.button>
    );
};

export const SagaModeSelect: React.FC<SagaModeSelectProps> = ({ onSelectMode, onClose, bestScores }) => {
    const { t } = useTranslation();
    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

    // Mode Configuration
    const modes = [
        {
            id: 'STANDARD' as GameMode,
            label: t('practice.zen.title', 'Zen Mountain'),
            desc: t('practice.zen.desc', 'Take your time. No timers, just learning.'),
            rules: [
                t('practice.zen.rule1', 'Solve 10 problems'),
                t('practice.zen.rule2', 'No time limit'),
                t('practice.zen.rule3', 'Earn stars for accuracy')
            ],
            icon: Calculator,
            color: 'bg-blue-500',
            pos: 'top-[30%] left-[50%] -translate-x-[50%]',
            delay: 0.2
        },
        {
            id: 'TIME_ATTACK' as GameMode,
            label: t('practice.time.title', 'Speed Forest'),
            desc: t('practice.time.desc', 'Race the clock! +2s for correct answers.'),
            rules: [
                t('practice.time.rule1', 'Start with 60 seconds'),
                t('practice.time.rule2', '+2 seconds per correct answer'),
                t('practice.time.rule3', 'Game over when time runs out')
            ],
            icon: Clock,
            color: 'bg-orange-500',
            pos: 'bottom-[25%] left-[20%] md:left-[25%]',
            delay: 0.4
        },
        {
            id: 'SURVIVAL' as GameMode,
            label: t('practice.survival.title', 'Survival Peak'),
            desc: t('practice.survival.desc', '3 Lives. Don\'t make a mistake!'),
            rules: [
                t('practice.survival.rule1', 'You have 3 hearts'),
                t('practice.survival.rule2', 'Wrong answer loses a heart'),
                t('practice.survival.rule3', 'Survive as long as you can')
            ],
            icon: Heart,
            color: 'bg-rose-500',
            pos: 'bottom-[25%] right-[20%] md:right-[25%]',
            delay: 0.6
        }
    ];

    return (
        <div className="fixed inset-0 z-50 bg-slate-900">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src={sagaBg}
                    alt="Map Background"
                    className="w-full h-full object-cover opacity-80"
                />
                <div className={cn(
                    "absolute inset-0 bg-black/20 backdrop-blur-[2px] transition-all duration-500",
                    selectedMode ? "backdrop-blur-md bg-black/40" : ""
                )} />
            </div>

            {/* Header / Title - Fade out when selecting mode */}
            <motion.div
                animate={{
                    y: selectedMode ? -100 : 0,
                    opacity: selectedMode ? 0 : 1
                }}
                className="absolute top-8 left-0 right-0 z-20 flex flex-col items-center pointer-events-none"
            >
                <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] font-handwriting transform -rotate-2">
                    {t('practice.chooseMode', 'Choose Your Path')}
                </h1>
                <p className="text-white/90 font-medium text-lg mt-2 drop-shadow-md">
                    {t('practice.chooseModeDesc', 'Where will your journey take you?')}
                </p>
            </motion.div>

            {/* Close Button */}
            {!selectedMode && (
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-30 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-sm"
                    aria-label={t('common.close', 'Close')}
                >
                    <X size={24} />
                </button>
            )}

            {/* Map Interaction Area */}
            <div className="absolute inset-0 z-10 overflow-hidden">
                {/*
                    Positions:
                    - Zen: Top Center (The Mountain?)
                    - Time Attack: Bottom Left (The Forest?)
                    - Survival: Bottom Right (The Volcano?)
                */}

                {modes.map(m => (
                    <MapLocation
                        key={m.id}
                        mode={m.id}
                        label={m.label}
                        icon={m.icon}
                        color={m.color}
                        bestScore={bestScores?.[m.id]}
                        delay={m.delay}
                        position={m.pos}
                        onSelect={() => setSelectedMode(m.id)}
                        isSelected={selectedMode === m.id}
                    />
                ))}

                {/* Show Detail Card Overlay if mode selected */}
                <AnimatePresence>
                    {selectedMode && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center p-4">
                            {(() => {
                                const m = modes.find(x => x.id === selectedMode);
                                if (!m) return null;
                                return (
                                    <ModeDetailCard
                                        mode={m.id}
                                        title={m.label}
                                        description={m.desc}
                                        rules={m.rules}
                                        icon={m.icon}
                                        color={m.color}
                                        bestScore={bestScores?.[m.id]}
                                        onStart={() => onSelectMode(m.id)}
                                        onClose={() => setSelectedMode(null)}
                                    />
                                );
                            })()}
                        </div>
                    )}
                </AnimatePresence>

                {/* Decorative Path Dashes */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    {/* Paths connecting start (50, 38) to left (25, 75) and right (75, 75) */}
                    <motion.path
                        d="M 50 38 Q 25 50 25 75"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        vectorEffect="non-scaling-stroke"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, delay: 0.8 }}
                    />
                    <motion.path
                        d="M 50 38 Q 75 50 75 75"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        vectorEffect="non-scaling-stroke"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, delay: 0.8 }}
                    />
                </svg>
            </div>
        </div>
    );
};
