import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Clock, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { GameMode } from '../../hooks/usePracticeSession';

interface ArcadeHUDProps {
    mode: GameMode;
    score: number;
    lives: number;
    timeLeft: number;
    combo: number;
}

export const ArcadeHUD: React.FC<ArcadeHUDProps> = ({ mode, score, lives, timeLeft, combo }) => {
    // Local state to animate score increments
    const [displayScore, setDisplayScore] = useState(score);

    useEffect(() => {
        // Simple lerp effect for score
        const interval = setInterval(() => {
            setDisplayScore(prev => {
                if (prev < score) return prev + Math.ceil((score - prev) / 5);
                return score;
            });
        }, 16);
        return () => clearInterval(interval);
    }, [score]);

    if (mode === 'STANDARD') return null;

    return (
        <div className="w-full max-w-2xl mx-auto mb-6 px-4">
            <div className="bg-white/95 backdrop-blur shadow-lg rounded-2xl p-4 flex items-center justify-between border border-slate-100">

                {/* Left: Mode Specific Stat (Time or Lives) */}
                <div className="flex items-center w-1/3">
                    {mode === 'TIME_ATTACK' ? (
                        <div className={cn("flex items-center gap-2 font-mono font-bold text-2xl",
                            timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-700"
                        )}>
                            <Clock className={cn("w-6 h-6", timeLeft < 10 && "fill-current")} />
                            <span>{timeLeft}s</span>
                        </div>
                    ) : (
                        <div className="flex gap-1">
                            {[...Array(3)].map((_, i) => (
                                <Heart
                                    key={i}
                                    className={cn("w-8 h-8 transition-all duration-300",
                                        i < lives ? "fill-rose-500 text-rose-500" : "fill-slate-200 text-slate-200"
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Center: Combo Badge */}
                <div className="flex items-center justify-center w-1/3">
                    <AnimatePresence mode='popLayout'>
                        {combo > 1 && (
                            <motion.div
                                key={combo}
                                initial={{ scale: 0, rotate: -15 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0 }}
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black px-4 py-1 rounded-full shadow-md text-sm whitespace-nowrap"
                            >
                                {combo}x COMBO!
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: Score */}
                <div className="flex items-center justify-end w-1/3 gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score</span>
                        <motion.span
                            key={score}
                            initial={{ scale: 1.2, color: '#f59e0b' }}
                            animate={{ scale: 1, color: '#334155' }}
                            className="text-2xl font-black text-slate-700 font-mono"
                        >
                            {displayScore.toLocaleString()}
                        </motion.span>
                    </div>
                    <div className="bg-orange-100 p-2 rounded-xl">
                        <Trophy className="w-6 h-6 text-orange-500" />
                    </div>
                </div>
            </div>
        </div>
    );
};
