import React from 'react';
import { motion } from 'framer-motion';
import { Play, Trophy, X, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { GameMode } from '../../hooks/usePracticeSession';

interface ModeDetailCardProps {
    mode: GameMode;
    title: string;
    description: string;
    rules: string[];
    icon: React.ElementType;
    color: string;
    bestScore?: number;
    onStart: () => void;
    onClose: () => void;
}

export const ModeDetailCard: React.FC<ModeDetailCardProps> = ({
    mode,
    title,
    description,
    rules,
    icon: Icon,
    color,
    bestScore,
    onStart,
    onClose
}) => {
    return (
        <motion.div
            layoutId={`mode-card-${mode}`}
            className={cn(
                "relative w-full max-w-sm md:max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col",
                "border-4 border-white"
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {/* Header / Banner */}
            <div className={cn("h-32 relative flex items-center justify-center overflow-hidden", color)}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

                {/* Large Icon */}
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                >
                    <Icon size={64} className="text-white drop-shadow-md" />
                </motion.div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content Body */}
            <div className="p-6 md:p-8 flex flex-col gap-4">
                {/* Title & Score */}
                <div className="text-center">
                    <motion.h2
                        layoutId={`mode-label-${mode}`}
                        className="text-3xl font-black text-slate-800 tracking-tight"
                    >
                        {title}
                    </motion.h2>

                    {bestScore !== undefined && (
                        <div className="flex items-center justify-center gap-2 mt-2 text-slate-500 font-bold bg-slate-100 py-1 px-3 rounded-full mx-auto w-max">
                            <Trophy size={14} className="text-yellow-500" />
                            <span className="text-sm">Best: {bestScore}</span>
                        </div>
                    )}
                </div>

                {/* Description */}
                <p className="text-center text-slate-600 leading-relaxed font-medium">
                    {description}
                </p>

                {/* Rules List */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                        <Info size={12} />
                        How to Play
                    </h3>
                    <ul className="space-y-2">
                        {rules.map((rule, idx) => (
                            <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (idx * 0.1) }}
                                className="flex items-start gap-3 text-sm text-slate-700 font-medium"
                            >
                                <div className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", color.replace('bg-', 'bg-'))} />
                                {rule}
                            </motion.li>
                        ))}
                    </ul>
                </div>

                {/* Start Action */}
                <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onStart}
                    className={cn(
                        "mt-2 w-full py-4 text-white text-lg font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2",
                        color.replace('bg-', 'bg-'),
                        "hover:brightness-110 active:brightness-90"
                    )}
                >
                    <Play size={24} fill="currentColor" />
                    START GAME
                </motion.button>
            </div>
        </motion.div>
    );
};
