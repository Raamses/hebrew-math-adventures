import React, { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RotateCcw, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMemoryGame } from '../../hooks/useMemoryGame';
import { useSound } from '../../hooks/useSound';
import { useMusicalSound } from '../../hooks/useMusicalSound';
import { useProfile } from '../../context/ProfileContext';
import type { UserCapabilityProfile } from '../../types/progress';

interface MemoryDuelGameProps {
    level: number;
    onExit: () => void;
    onComplete?: (stats: { time: number; moves: number; matchedCount: number }) => void;
    profile?: UserCapabilityProfile;
}

const MASCOT_EMOJI = '🦉';

export const MemoryDuelGame: React.FC<MemoryDuelGameProps> = ({
    level,
    onExit,
    onComplete,
    profile,
}) => {
    const { t } = useTranslation();
    const cardCount = 12; // 6 pairs

    const { playSound } = useSound();
    const { profile: contextProfile, recordSession } = useProfile();
    const { playMelodyNote, playWrongMelody } = useMusicalSound(contextProfile?.settings?.soundGarden ?? false);
    const sessionStartTimeRef = useRef(Date.now());

    const {
        cards,
        matchedCount,
        moves,
        elapsedTime,
        status,
        wrongPair,
        totalPairs,
        bestScore,
        initGame,
        flipCard,
    } = useMemoryGame({
        config: { level, cardCount, problemTypes: [] },
        profile,
    });

    // Initialize on mount
    useEffect(() => {
        initGame();
    }, [initGame]);

    // Notify on completion
    useEffect(() => {
        if (status === 'complete' && onComplete) {
            recordSession({
                date: new Date().toISOString().slice(0, 10),
                durationSec: Math.round((Date.now() - sessionStartTimeRef.current) / 1000),
                correct: matchedCount,
                attempts: moves,
                skillFocus: 'memory',
                gameMode: 'memory',
            });
            onComplete({ time: elapsedTime, moves, matchedCount });
        }
    }, [status, onComplete, elapsedTime, moves, matchedCount, recordSession]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handlePlayAgain = useCallback(() => {
        sessionStartTimeRef.current = Date.now();
        initGame();
    }, [initGame]);

    // Sound wrapper for card flip - detect match/mismatch
    const prevMatchedRef = useRef(0);
    const handleFlipCard = useCallback((index: number) => {
        flipCard(index);
        // Check if a match happened after this flip (matchedCount will increase)
        setTimeout(() => {
            const newMatched = matchedCount;
            if (newMatched > prevMatchedRef.current) {
                // Match!
                if (contextProfile?.settings?.soundGarden) {
                    playMelodyNote();
                } else {
                    playSound('correct');
                }
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
            } else if (wrongPair.length > 0) {
                // Mismatch
                if (contextProfile?.settings?.soundGarden) {
                    playWrongMelody();
                } else {
                    playSound('wrong');
                }
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
            }
            prevMatchedRef.current = newMatched;
        }, 50);
    }, [flipCard, matchedCount, wrongPair, contextProfile, playMelodyNote, playWrongMelody, playSound]);

    // Determine grid layout — 3×4 on mobile portrait, 4×3 on landscape
    // We use CSS grid with responsive cols
    const isComplete = status === 'complete';

    return (
        <div dir="rtl" className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-800 flex flex-col items-center justify-start p-4 pt-8 select-none">
            {/* HUD */}
            <div className="w-full max-w-2xl flex items-center justify-between mb-6">
                <button
                    onClick={onExit}
                    className="flex items-center gap-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full px-3 py-2 transition-all min-h-[48px]"
                    aria-label={t('saga.back', 'Back')}
                >
                    <ArrowLeft size={20} className="rotate-180" />
                    <span className="text-sm font-semibold">{t('saga.back', 'Back')}</span>
                </button>

                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                        <Clock size={18} className="text-cyan-300" />
                        <span className="text-white font-bold text-sm sm:text-base tabular-nums">
                            {formatTime(elapsedTime)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                        <span className="text-white font-bold text-sm sm:text-base">
                            {t('memory.moves', 'Moves')}: {moves}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                        <Sparkles size={18} className="text-yellow-300" />
                        <span className="text-white font-bold text-sm sm:text-base">
                            {matchedCount}/{totalPairs}
                        </span>
                    </div>
                </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 tracking-tight text-center">
                🎴 {t('memory.title', 'Memory Duel')}
            </h2>

            {/* Card Grid */}
            <div
                className={cn(
                    "grid gap-3 sm:gap-4 w-full max-w-2xl",
                    "grid-cols-4 grid-rows-3",
                )}
                style={{ aspectRatio: '4 / 3' }}
            >
                {cards.map((card, index) => {
                    const isFlipped = card.isFlipped || card.isMatched;
                    const isMatched = card.isMatched;
                    const isWrong = wrongPair.includes(index);

                    return (
                        <motion.button
                            key={card.id}
                            onClick={() => handleFlipCard(index)}
                            disabled={isMatched || isFlipped || status !== 'playing'}
                            className="relative w-full aspect-square [perspective:600px]"
                            style={{ minHeight: '80px' }}
                            whileTap={{ scale: isMatched || isFlipped ? 1 : 0.95 }}
                        >
                            {/* Card inner with 3D flip */}
                            <motion.div
                                className="relative w-full h-full [transform-style:preserve-3d]"
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
                            >
                                {/* Card back (face-down) */}
                                <div
                                    className={cn(
                                        "absolute inset-0 [backface-visibility:hidden] rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg",
                                        "bg-gradient-to-br from-violet-500 to-purple-600 border-2 border-violet-300/30",
                                        "hover:border-violet-200/50 transition-colors",
                                    )}
                                >
                                    <span className="opacity-80">{MASCOT_EMOJI}</span>
                                </div>

                                {/* Card front (face-up) */}
                                <div
                                    className={cn(
                                        "absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl flex items-center justify-center shadow-lg border-2",
                                        isMatched
                                            ? "bg-gradient-to-br from-green-400 to-emerald-500 border-green-200 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                                            : isWrong
                                                ? "bg-gradient-to-br from-red-400 to-rose-500 border-red-200"
                                                : "bg-gradient-to-br from-white to-slate-100 border-slate-300",
                                    )}
                                >
                                    {isMatched && (
                                        <div className="absolute top-1 right-1">
                                            <Check size={16} className="text-white" />
                                        </div>
                                    )}
                                    <span
                                        dir="ltr"
                                        className={cn(
                                            "font-black text-lg sm:text-2xl text-center px-2 tabular-nums",
                                            isMatched
                                                ? "text-white"
                                                : isWrong
                                                    ? "text-white"
                                                    : "text-slate-800",
                                        )}
                                    >
                                        {card.displayValue}
                                    </span>
                                </div>
                            </motion.div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Completion Overlay */}
            <AnimatePresence>
                {isComplete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
                        >
                            <div className="text-6xl mb-4">🎉</div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2">
                                {t('memory.complete', 'You did it!')}
                            </h2>
                            <p className="text-slate-500 font-medium mb-6">
                                {t('memory.matches', 'All pairs matched!')}
                            </p>

                            {/* Stats */}
                            <div className="flex justify-center gap-6 mb-6">
                                <div className="flex flex-col items-center">
                                    <Clock size={24} className="text-cyan-500 mb-1" />
                                    <span className="text-2xl font-black text-slate-800">
                                        {formatTime(elapsedTime)}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">
                                        {t('memory.time', 'Time')}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <Sparkles size={24} className="text-yellow-500 mb-1" />
                                    <span className="text-2xl font-black text-slate-800">
                                        {moves}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">
                                        {t('memory.moves', 'Moves')}
                                    </span>
                                </div>
                            </div>

                            {/* Best Score */}
                            {(bestScore.bestTime !== null || bestScore.bestMoves !== null) && (
                                <div className="bg-amber-50 rounded-xl p-3 mb-6 flex items-center justify-center gap-2">
                                    <span className="text-amber-600 text-sm font-bold">
                                        🏆 {t('memory.best', 'Best')}: {
                                            bestScore.bestTime !== null
                                                ? formatTime(bestScore.bestTime)
                                                : '—'
                                        } · {bestScore.bestMoves ?? '—'} {t('memory.moves', 'Moves')}
                                    </span>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handlePlayAgain}
                                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl py-3 px-6 transition-all min-h-[48px] shadow-lg"
                                >
                                    <RotateCcw size={20} />
                                    {t('memory.playAgain', 'Play Again')}
                                </button>
                                <button
                                    onClick={onExit}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl py-3 px-6 transition-all min-h-[48px]"
                                >
                                    {t('saga.back', 'Back to Map')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
