import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lightbulb, ArrowRight, Flame } from 'lucide-react';
import { HintVisualizer } from './HintVisualizer';
import type { Problem } from '../lib/gameLogic';
import { useTranslation } from 'react-i18next';

interface MathCardProps {
    problem: Problem;
    onAnswer: (isCorrect: boolean) => void;
    feedback: string | null;
    isProcessing?: boolean;
}

export const MathCard: React.FC<MathCardProps> = ({ problem, onAnswer, feedback, isProcessing = false }) => {
    const { t } = useTranslation();
    const [answer, setAnswer] = useState('');
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [showHintModal, setShowHintModal] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setAnswer('');
        setWrongAttempts(0);
        setShowHintModal(false);
        // Auto-focus input on new problem if it involves typing
        if (problem.type !== 'compare') {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [problem]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isProcessing) return;
        const val = parseInt(answer);
        if (isNaN(val)) return;

        let isCorrect = false;

        if (problem.type === 'arithmetic') {
            let correctVal;
            if (problem.missing === 'answer') correctVal = problem.answer;
            else if (problem.missing === 'num1') correctVal = problem.num1;
            else correctVal = problem.num2;
            isCorrect = val === correctVal;
        } else if (problem.type === 'series') {
            isCorrect = val === problem.answer;
        } else if (problem.type === 'word') {
            isCorrect = val === problem.answer;
        }

        if (!isCorrect) {
            setWrongAttempts(prev => prev + 1);
        }
        onAnswer(isCorrect);
    };

    const handleCompare = (symbol: string) => {
        if (isProcessing) return;
        const isCorrect = symbol === problem.answer;
        if (!isCorrect) setWrongAttempts(prev => prev + 1);
        onAnswer(isCorrect);
    };

    const renderInput = (placeholder = "?", className?: string) => (
        <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={isProcessing}
            className={className || `w-16 h-16 sm:w-24 sm:h-24 text-center font-bold text-indigo-600 bg-indigo-50 rounded-2xl border-4 border-indigo-300 focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder={placeholder}
            autoFocus
        />
    );

    const getTitleKey = () => {
        switch (problem.type) {
            case 'series': return 'game.completePattern';
            case 'compare': return 'game.compareNumbers';
            case 'word': return 'game.readCarefully';
            default: return 'game.howMuch';
        }
    };

    const renderArithmetic = () => {
        if (problem.type !== 'arithmetic') return null;

        const renderNum1 = () => {
            if (problem.missing === 'num1') return renderInput();

            // Hint Logic for borrowing (simplified for keeping this function clean, reuse old hint logic if crucial)
            const showHint = problem.subType === 'borrow' && wrongAttempts >= 2 && problem.missing === 'answer';

            if (showHint && typeof problem.num1 === 'number') {
                const tens = Math.floor(problem.num1 / 10) % 10;
                const ones = problem.num1 % 10;
                const hundreds = Math.floor(problem.num1 / 100);

                return (
                    <div className="relative flex items-center tracking-widest">
                        {hundreds > 0 && <span>{hundreds}</span>}
                        <div className="relative mx-1">
                            <span className="relative">
                                {tens}
                                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="absolute top-1/2 left-0 w-full h-1 bg-red-500 origin-left" />
                            </span>
                            <motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: -20 }} className="absolute top-0 left-1/2 -translate-x-1/2 text-sm text-red-500 font-bold">
                                {tens - 1}
                            </motion.span>
                        </div>
                        <div className="relative">
                            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: -8 }} className="absolute top-0 left-0 text-sm text-red-500 font-bold">1</motion.span>
                            {ones}
                        </div>
                    </div>
                );
            }
            return <span className="tracking-widest">{problem.num1}</span>;
        };

        return (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-3xl sm:text-5xl font-bold text-slate-800 mb-6" dir="ltr" style={{ direction: 'ltr' }}>
                {renderNum1()}
                <span className="text-primary mx-1">
                    {problem.operator === '*' ? '×' : problem.operator === '/' ? '÷' : problem.operator}
                </span>
                {problem.missing === 'num2' ? renderInput() : <span className="tracking-widest">{problem.num2}</span>}
                <span className="mx-1">=</span>
                {problem.missing === 'answer' ? renderInput() : <span className="tracking-widest">{problem.answer}</span>}
            </div>
        );
    };

    const renderComparison = () => {
        if (problem.type !== 'compare') return null;
        return (
            <div className="w-full flex flex-col items-center">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-3xl sm:text-5xl font-bold text-slate-800 mb-6" dir="ltr" style={{ direction: 'ltr' }}>
                    <span className="tracking-widest">{problem.num1}</span>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 ml-3 mr-3 bg-indigo-50 rounded-xl border-4 border-dashed border-indigo-300 flex items-center justify-center text-indigo-400">?</div>
                    <span className="tracking-widest">{problem.num2}</span>
                </div>
                <div className="flex gap-3 sm:gap-4 w-full justify-center" dir="ltr" style={{ direction: 'ltr' }}>
                    {['>', '=', '<'].map((symbol) => (
                        <button
                            key={symbol}
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleCompare(symbol)}
                            className={`w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 hover:bg-indigo-100 text-slate-800 hover:text-indigo-600 text-3xl sm:text-4xl font-bold rounded-2xl border-4 border-slate-300 hover:border-indigo-400 shadow-sm active:scale-95 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}
                        >
                            {symbol}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderSeries = () => {
        if (problem.type !== 'series') return null;
        return (
            <div className="flex flex-nowrap items-center justify-start md:justify-center gap-1 sm:gap-2 w-full mb-8 px-1 sm:px-4 overflow-x-auto md:overflow-visible pb-4 md:pb-0 scrollbar-hide snap-x md:snap-none" dir="ltr">
                {problem.sequence.map((num, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && (
                            <ArrowRight className="text-slate-300 w-4 h-4 sm:w-8 sm:h-8 flex-shrink-0" />
                        )}
                        <div className="flex-1 aspect-square min-w-0 max-w-[6rem] flex items-center justify-center">
                            {idx === problem.missingIndex ? (
                                renderInput("?", `w-full h-full text-center text-lg sm:text-4xl font-bold text-indigo-600 bg-indigo-50 rounded-lg sm:rounded-2xl border-2 sm:border-4 border-indigo-300 focus:border-primary focus:ring-2 sm:focus:ring-4 focus:ring-primary/20 outline-none transition-all shadow-sm p-0 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`)
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg sm:text-4xl font-bold text-slate-700 bg-white rounded-lg sm:rounded-2xl border-2 sm:border-4 border-slate-200 shadow-sm">
                                    {num}
                                </div>
                            )}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        );
    };

    const renderWord = () => {
        if (problem.type !== 'word') return null;
        return (
            <div className="flex flex-col items-center w-full max-w-lg mb-8">
                <p className="text-xl sm:text-2xl text-slate-700 font-medium text-center mb-6 leading-relaxed">
                    {t(problem.questionKey, problem.params)}
                </p>
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-400">=</span>
                    {renderInput()}
                </div>
            </div>
        );
    };

    // Derived State
    const canShowHintButton = wrongAttempts >= 1 && (problem.type === 'arithmetic'); // Only show hint for arithmetic for now

    return (
        <>
            <motion.div
                animate={feedback && !feedback.includes('!') ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={`w-full max-w-md bg-white rounded-3xl shadow-xl p-6 relative overflow-hidden transition-all duration-500 ${problem.metadata?.isChallenge
                        ? 'ring-4 ring-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] scale-[1.02]'
                        : ''
                    }`}
            >
                {/* Question Title & Challenge Badge */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    {problem.metadata?.isChallenge && (
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="text-amber-500"
                        >
                            <Flame className="w-6 h-6 animate-pulse fill-amber-500" />
                        </motion.div>
                    )}
                    <h2 className={`text-2xl font-bold text-center ${problem.metadata?.isChallenge ? 'text-amber-600' : 'text-slate-700'}`}>
                        {t(getTitleKey())}
                    </h2>
                    {problem.metadata?.isChallenge && (
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="text-amber-500"
                        >
                            <Flame className="w-6 h-6 animate-pulse fill-amber-500" />
                        </motion.div>
                    )}
                </div>

                {problem.type !== 'compare' ? (
                    <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
                        {problem.type === 'arithmetic' && renderArithmetic()}
                        {problem.type === 'series' && renderSeries()}
                        {problem.type === 'word' && renderWord()}

                        <button
                            type="submit"
                            disabled={isProcessing}
                            className={`w-full py-4 bg-primary hover:bg-orange-600 text-white text-2xl font-bold rounded-2xl shadow-lg shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}
                        >
                            <Check size={32} />
                            <span>{t('game.check')}</span>
                        </button>
                    </form>
                ) : (
                    renderComparison()
                )}

                {/* Hint Button */}
                {canShowHintButton && (
                    <motion.button
                        type="button"
                        onClick={() => setShowHintModal(true)}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-800 text-xl font-bold rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        <Lightbulb size={24} />
                        <span>{t('game.howTo')}</span>
                    </motion.button>
                )}

                {/* Feedback Overlay */}
                <AnimatePresence>
                    {feedback && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10"
                        >
                            <motion.div
                                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                                transition={{ duration: 0.5 }}
                                className="text-6xl mb-4"
                            >
                                {feedback.includes('!') ? '⭐' : '❌'}
                            </motion.div>
                            <h3 className="text-4xl font-bold text-primary text-center px-4">{feedback}</h3>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Hint Visualizer Modal */}
            {problem.type === 'arithmetic' && (
                <HintVisualizer
                    isOpen={showHintModal}
                    problem={problem}
                    onClose={() => setShowHintModal(false)}
                />
            )}
        </>
    );
};
