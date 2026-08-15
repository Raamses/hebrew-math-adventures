import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Home, Star } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

interface SessionSummaryProps {
    isOpen: boolean;
    starsGained?: number; // Optional until standardized
    correctCount: number;
    totalCount: number;
    totalScore: number;
    onPlayAgain: () => void;
    onExit: () => void;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
    isOpen,
    starsGained = 0,
    correctCount,
    totalCount,
    totalScore,
    onPlayAgain,
    onExit
}) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm">
                <motion.div
                    data-testid="session-summary"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border-4 border-white relative overflow-hidden max-h-[95vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-primary px-6 py-4 text-center relative overflow-visible rounded-t-[20px] flex-shrink-0">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-50"
                        />

                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-white">{t('summary.title')}</h2>
                            <p className="text-white/80 text-sm">{t('summary.subtitle')}</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="p-4 space-y-3 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-3">
                            <div data-testid="summary-stars" className="bg-yellow-50 p-3 rounded-2xl border-2 border-yellow-100 flex flex-col items-center">
                                <Star className="text-yellow-500 mb-1" size={24} fill="currentColor" />
                                <span className="text-2xl font-bold text-slate-700">+{starsGained}</span>
                                <span className="text-xs text-slate-500">Stars</span>
                            </div>
                            <div data-testid="summary-accuracy" className="bg-blue-50 p-3 rounded-2xl border-2 border-blue-100 flex flex-col items-center">
                                <div className="text-2xl mb-1">🎯</div>
                                <span className="text-2xl font-bold text-slate-700">{accuracy}%</span>
                                <span className="text-xs text-slate-500">{t('summary.accuracy')}</span>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-2xl border-2 border-purple-100 flex flex-col items-center col-span-2">
                                <span className="text-2xl font-bold text-purple-700">{totalScore}</span>
                                <span className="text-xs text-slate-500">{t('summary.totalScore')}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-100 text-center">
                            <p className="text-sm text-slate-600">
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

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-1">
                            <motion.button
                                data-testid="summary-play-again"
                                onClick={onPlayAgain}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-full py-3 bg-primary hover:bg-orange-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={20} />
                                <span>{t('summary.playAgain')}</span>
                            </motion.button>

                            <motion.button
                                data-testid="summary-home"
                                onClick={onExit}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-lg font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                            >
                                <Home size={20} />
                                <span>{t('summary.exit')}</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
