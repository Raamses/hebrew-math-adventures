import React, { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy, Heart, Zap, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useInvaderEngine } from '../../engines/invader/useInvaderEngine';
import { useSound } from '../../hooks/useSound';
import { useMusicalSound } from '../../hooks/useMusicalSound';
import { useProfile } from '../../context/ProfileContext';
import { FrenzyOverlay } from './FrenzyOverlay';
import type { UserCapabilityProfile } from '../../types/progress';

interface MathInvadersGameProps {
    level: number;
    onExit: () => void;
    onComplete?: (stats: { score: number; lives: number; victory: boolean }) => void;
    profile?: UserCapabilityProfile | null;
}

export const MathInvadersGame: React.FC<MathInvadersGameProps> = ({
    level,
    onExit,
    onComplete,
    profile: _profile,
}) => {
    const { t } = useTranslation();
    const { playSound } = useSound();
    const { profile: contextProfile, updateArcadeBestScore, recordSession } = useProfile();
    const { playMelodyNote, playWrongMelody } = useMusicalSound(contextProfile?.settings?.soundGarden ?? false);
    const sessionStartTimeRef = useRef(Date.now());
    const sessionCorrectRef = useRef(0);
    const sessionAttemptsRef = useRef(0);

    const onGameOver = useCallback((score: number, _lives: number) => {
        if (contextProfile) {
            updateArcadeBestScore('INVADERS', score);
        }
        recordSession({
            date: new Date().toISOString().slice(0, 10),
            durationSec: Math.round((Date.now() - sessionStartTimeRef.current) / 1000),
            correct: sessionCorrectRef.current,
            attempts: sessionAttemptsRef.current,
            skillFocus: 'mixed',
            gameMode: 'invaders',
        });
    }, [contextProfile, updateArcadeBestScore, recordSession]);

    const onVictory = useCallback((score: number, lives: number) => {
        if (contextProfile) {
            updateArcadeBestScore('INVADERS', score);
        }
        recordSession({
            date: new Date().toISOString().slice(0, 10),
            durationSec: Math.round((Date.now() - sessionStartTimeRef.current) / 1000),
            correct: sessionCorrectRef.current,
            attempts: sessionAttemptsRef.current,
            skillFocus: 'mixed',
            gameMode: 'invaders',
        });
        if (onComplete) onComplete({ score, lives, victory: true });
    }, [contextProfile, updateArcadeBestScore, recordSession, onComplete]);

    const { state, handleAnswerTap, reset } = useInvaderEngine({
        targetLevel: level,
        profile: contextProfile?.capabilities || null,
        onGameOver,
        onVictory,
    });

    // Track for game over callback
    const gameOverFiredRef = useRef(false);
    useEffect(() => {
        if (state.isGameOver && !state.isVictory && !gameOverFiredRef.current) {
            gameOverFiredRef.current = true;
            if (onComplete) onComplete({ score: state.score, lives: state.lives, victory: false });
        }
    }, [state.isGameOver, state.isVictory, state.score, state.lives, onComplete]);

    // Track for victory callback (engine fires onVictory, but we also need to fire onComplete)
    const victoryFiredRef = useRef(false);
    useEffect(() => {
        if (state.isVictory && !victoryFiredRef.current) {
            victoryFiredRef.current = true;
        }
    }, [state.isVictory]);

    const handleTap = useCallback((answerId: string) => {
        const result = handleAnswerTap(answerId);
        sessionAttemptsRef.current++;
        if (result) {
            sessionCorrectRef.current++;
            if (contextProfile?.settings?.soundGarden) {
                playMelodyNote();
            } else {
                playSound('correct');
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
        } else {
            if (contextProfile?.settings?.soundGarden) {
                playWrongMelody();
            } else {
                playSound('wrong');
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
        }
    }, [handleAnswerTap, playSound, contextProfile, playMelodyNote, playWrongMelody]);

    const handlePlayAgain = useCallback(() => {
        gameOverFiredRef.current = false;
        victoryFiredRef.current = false;
        sessionStartTimeRef.current = Date.now();
        sessionCorrectRef.current = 0;
        sessionAttemptsRef.current = 0;
        reset();
    }, [reset]);

    const isGameOver = state.isGameOver;
    const isVictory = state.isVictory;
    const showEndScreen = isGameOver || isVictory;

    // Star rating: 3 stars if lives >= 2, 2 stars if lives = 1, 1 star if lives = 0 but won
    const stars = isVictory
        ? (state.lives >= 2 ? 3 : state.lives === 1 ? 2 : 1)
        : 0;

    return (
        <div
            dir="rtl"
            className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 flex flex-col items-center justify-start select-none overflow-hidden relative"
        >
            {/* Starfield background */}
            <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{
                            width: `${1 + Math.random() * 2}px`,
                            height: `${1 + Math.random() * 2}px`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            opacity: 0.2 + Math.random() * 0.5,
                        }}
                    />
                ))}
            </div>

            {/* HUD */}
            <div className="w-full max-w-3xl flex items-center justify-between p-3 z-20 relative">
                <button
                    onClick={onExit}
                    className="flex items-center gap-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full px-3 py-2 transition-all min-h-[48px]"
                    aria-label={t('saga.back', 'Back')}
                >
                    <ArrowLeft size={20} className="rotate-180" />
                    <span className="text-sm font-semibold">{t('saga.back', 'Back')}</span>
                </button>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                    {/* Lives */}
                    <div className="flex gap-1 bg-white/10 rounded-full px-3 py-1.5">
                        {[...Array(3)].map((_, i) => (
                            <Heart
                                key={i}
                                className={cn(
                                    'w-5 h-5 transition-all duration-300',
                                    i < state.lives ? 'fill-rose-500 text-rose-500' : 'fill-slate-600 text-slate-600'
                                )}
                            />
                        ))}
                    </div>

                    {/* Combo */}
                    {state.combo > 1 && (
                        <motion.div
                            key={state.combo}
                            initial={{ scale: 0, rotate: -15 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0 }}
                            className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black px-3 py-1.5 rounded-full text-xs whitespace-nowrap"
                        >
                            <Zap size={14} />
                            {state.combo}x
                        </motion.div>
                    )}

                    {/* Score */}
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                        <Trophy size={16} className="text-yellow-400" />
                        <span className="text-white font-bold text-sm tabular-nums">
                            {state.score.toLocaleString()}
                        </span>
                    </div>

                    {/* Level */}
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                        <Star size={16} className="text-cyan-400" />
                        <span className="text-white font-bold text-sm">
                            {t('invaders.level', 'Level')} {state.level}
                        </span>
                    </div>
                </div>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight text-center z-20 relative">
                🚀 {t('invaders.title', 'Math Invaders')}
            </h2>

            {/* Game Area */}
            <div
                className="relative w-full max-w-3xl flex-1 overflow-hidden"
                style={{ minHeight: '400px' }}
            >
                {/* Frenzy Overlay */}
                <FrenzyOverlay isActive={state.frenzy} combo={state.combo} />

                {/* Equation Bubbles */}
                <AnimatePresence>
                    {state.equations.map((eq) => (
                        <motion.div
                            key={eq.id}
                            className={cn(
                                'absolute z-10 rounded-2xl flex items-center justify-center text-center font-bold shadow-lg border-2',
                                eq.isBoss
                                    ? 'bg-gradient-to-br from-purple-600 to-red-700 border-red-400 text-white text-lg sm:text-2xl px-6 py-4 min-w-[180px]'
                                    : 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-300/50 text-white text-sm sm:text-lg px-4 py-2 min-w-[100px]'
                            )}
                            style={{
                                left: `${eq.x}%`,
                                top: `${eq.y}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{eq.equation}</span>
                            {eq.isBoss && eq.hp !== undefined && eq.maxHp !== undefined && (
                                <div className="absolute -top-3 left-0 right-0 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-300"
                                        style={{ width: `${(eq.hp / eq.maxHp) * 100}%` }}
                                    />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Answer Bubbles */}
                <AnimatePresence>
                    {state.answers.map((ans) => (
                        !ans.isPopped && (
                            <motion.button
                                key={ans.id}
                                onClick={() => handleTap(ans.id)}
                                className="absolute z-10 rounded-full flex items-center justify-center text-lg sm:text-2xl font-black shadow-lg border-2 border-emerald-300/50 bg-gradient-to-br from-emerald-500 to-green-600 text-white min-w-[48px] min-h-[48px] w-12 h-12 sm:w-14 sm:h-14"
                                style={{
                                    left: `${ans.x}%`,
                                    top: `${ans.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                whileTap={{ scale: 0.85 }}
                            >
                                <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{ans.value}</span>
                            </motion.button>
                        )
                    ))}
                </AnimatePresence>

                {/* Ship at bottom */}
                <div
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 z-5 text-4xl sm:text-5xl pointer-events-none"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(0, 200, 255, 0.6))' }}
                >
                    🚀
                </div>

                {/* Boss wave indicator */}
                <AnimatePresence>
                    {state.isBossWave && (
                        <motion.div
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -50, opacity: 0 }}
                            className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black px-4 py-1 rounded-full text-sm shadow-lg z-30"
                        >
                            👾 {t('invaders.bossWave', 'BOSS WAVE!')}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Game Over / Victory Screen */}
            <AnimatePresence>
                {showEndScreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
                        >
                            <div className="text-6xl mb-4">
                                {isVictory ? '🎉' : '💥'}
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2">
                                {isVictory
                                    ? t('invaders.victory', 'You did it!')
                                    : t('invaders.gameOver', 'Nice try!')}
                            </h2>
                            <p className="text-slate-500 font-medium mb-6">
                                {isVictory
                                    ? t('invaders.victoryDesc', 'You defended your ship!')
                                    : t('invaders.gameOverDesc', 'The invaders got past your defenses.')}
                            </p>

                            {/* Stars (victory only) */}
                            {isVictory && (
                                <div className="flex justify-center gap-2 mb-6">
                                    {[...Array(3)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ scale: 0, rotate: -30 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ delay: 0.2 + i * 0.15, type: 'spring' }}
                                        >
                                            <Star
                                                size={32}
                                                className={cn(
                                                    'transition-all',
                                                    i < stars ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-200 text-slate-200'
                                                )}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Score */}
                            <div className="flex justify-center gap-6 mb-6">
                                <div className="flex flex-col items-center">
                                    <Trophy size={24} className="text-yellow-500 mb-1" />
                                    <span className="text-2xl font-black text-slate-800">
                                        {state.score.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">
                                        {t('invaders.score', 'Score')}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <Heart size={24} className="text-rose-500 mb-1" />
                                    <span className="text-2xl font-black text-slate-800">
                                        {state.lives}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">
                                        {t('invaders.lives', 'Lives')}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <Zap size={24} className="text-orange-500 mb-1" />
                                    <span className="text-2xl font-black text-slate-800">
                                        {state.combo}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">
                                        {t('invaders.combo', 'Combo')}
                                    </span>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handlePlayAgain}
                                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl py-3 px-6 transition-all min-h-[48px] shadow-lg"
                                >
                                    <RotateCcw size={20} />
                                    {t('invaders.playAgain', 'Play Again')}
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
