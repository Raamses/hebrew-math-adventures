import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Home, Star } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { useProfile } from '../context/ProfileContext';
import { getXPForNextLevel } from '../types/user';

interface SessionSummaryProps {
    isOpen: boolean;
    xpGained: number;
    correctCount: number;
    totalCount: number;
    totalScore: number;
    onPlayAgain: () => void;
    onExit: () => void;
    targetLevel: number;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
    isOpen,
    xpGained,
    correctCount,
    totalCount,
    totalScore,
    onPlayAgain,
    onExit,
    targetLevel
}) => {
    const { t } = useTranslation();
    const { profile } = useProfile();

    if (!isOpen) return null;

    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border-4 border-white"
                >
                    {/* Header */}
                    <div className="bg-primary p-6 text-center relative overflow-hidden">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
                        />
                        <h2 className="text-3xl font-bold text-white relative z-10">{t('summary.title')}</h2>
                        <p className="text-white/80 text-lg relative z-10">{t('summary.subtitle')}</p>
                    </div>

                    {/* Stats */}
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-100 flex flex-col items-center">
                                <Star className="text-yellow-500 mb-2" size={32} fill="currentColor" />
                                <span className="text-3xl font-bold text-slate-700">+{xpGained}</span>
                                <span className="text-sm text-slate-500">{t('summary.points')}</span>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 flex flex-col items-center">
                                <div className="text-3xl mb-2">🎯</div>
                                <span className="text-3xl font-bold text-slate-700">{accuracy}%</span>
                                <span className="text-sm text-slate-500">{t('summary.accuracy')}</span>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-100 flex flex-col items-center col-span-2">
                                <span className="text-3xl font-bold text-purple-700">{totalScore}</span>
                                <span className="text-sm text-slate-500">{t('summary.totalScore')}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 text-center">
                            <p className="text-slate-600">
                                <Trans
                                    i18nKey="summary.result"
                                    values={{ correct: correctCount, total: totalCount }}
                                    components={{
                                        c: <span className="font-bold text-primary" />,
                                        t: <span className="font-bold text-slate-800" />
                                    }}
                                />
                            </p>
                        </div>

                        {/* Progression Bar (Only if playing at current level) */}
                        {profile && targetLevel === profile.currentLevel ? (
                            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                                <div className="flex justify-between text-sm text-slate-500 mb-1">
                                    <span>{t('summary.levelProgress', { level: profile.currentLevel + 1 })}</span>
                                    <span>{profile.xp} / {getXPForNextLevel(profile.currentLevel)} XP</span>
                                </div>
                                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                                    <div
                                        className="bg-primary h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (profile.xp / getXPForNextLevel(profile.currentLevel)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                                <span className="text-emerald-700 font-bold">{t('summary.practiceComplete')}</span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={onPlayAgain}
                                className="w-full py-4 bg-primary hover:bg-orange-600 text-white text-xl font-bold rounded-2xl shadow-lg shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={24} />
                                <span>{t('summary.playAgain')}</span>
                            </button>

                            <button
                                onClick={onExit}
                                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xl font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Home size={24} />
                                <span>{t('summary.exit')}</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
