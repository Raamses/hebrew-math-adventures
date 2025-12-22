import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lightbulb } from 'lucide-react';
import { HintVisualizer } from './HintVisualizer';
import type { Problem } from '../lib/gameLogic';
import { useTranslation } from 'react-i18next';

interface MathCardProps {
    problem: Problem;
    onAnswer: (isCorrect: boolean) => void;
    feedback: string | null;
}

export const MathCard: React.FC<MathCardProps> = ({ problem, onAnswer, feedback }) => {
    const { t } = useTranslation();
    const [answer, setAnswer] = useState('');
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [showHintModal, setShowHintModal] = useState(false);

    useEffect(() => {
        setAnswer('');
        setWrongAttempts(0);
        setShowHintModal(false);
    }, [problem]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseInt(answer);
        if (isNaN(val)) return;

        let correctVal;
        if (problem.missing === 'answer') correctVal = problem.answer;
        else if (problem.missing === 'num1') correctVal = problem.num1;
        else correctVal = problem.num2;

        const isCorrect = val === correctVal;
        if (!isCorrect) {
            setWrongAttempts(prev => prev + 1);
        }
        onAnswer(isCorrect);
    };

    const showHint = problem.subType === 'borrow' && wrongAttempts >= 2 && problem.missing === 'answer';
    const canShowHintButton = wrongAttempts >= 1;



    const renderNum1 = () => {
        if (problem.missing === 'num1') {
            return <div className="w-20 h-20 bg-indigo-100 rounded-xl border-4 border-indigo-300 flex items-center justify-center text-indigo-600">?</div>;
        }

        if (showHint) {
            const tens = Math.floor(problem.num1 / 10) % 10;
            const ones = problem.num1 % 10;
            const hundreds = Math.floor(problem.num1 / 100);

            return (
                <div className="relative flex items-center tracking-widest">
                    {hundreds > 0 && <span>{hundreds}</span>}
                    <div className="relative mx-1">
                        <span className="relative">
                            {tens}
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                className="absolute top-1/2 left-0 w-full h-1 bg-red-500 origin-left"
                            />
                        </span>
                        <motion.span
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: -20 }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 text-sm text-red-500 font-bold"
                        >
                            {tens - 1}
                        </motion.span>
                    </div>
                    <div className="relative">
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: -8 }}
                            className="absolute top-0 left-0 text-sm text-red-500 font-bold"
                        >
                            1
                        </motion.span>
                        {ones}
                    </div>
                </div>
            );
        }

        return <span className="tracking-widest">{problem.num1}</span>;
    };

    return (
        <>
            <motion.div
                animate={feedback && !feedback.includes('!') ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 relative overflow-hidden"
            >
                {/* Question Text */}
                <h2 className="text-2xl font-bold text-slate-700 mb-4 text-center">{t('game.howMuch')}</h2>

                {/* Equation (LTR) */}
                <div className="flex items-center justify-center gap-3 text-5xl font-bold text-slate-800 mb-6" dir="ltr">
                    {renderNum1()}

                    <span className="text-primary">{problem.operator === '*' ? '×' : problem.operator === '/' ? '÷' : problem.operator}</span>

                    {problem.missing === 'num2' ? (
                        <div className="w-20 h-20 bg-indigo-100 rounded-xl border-4 border-indigo-300 flex items-center justify-center text-indigo-600">?</div>
                    ) : (
                        <span className="tracking-widest">{problem.num2}</span>
                    )}

                    <span>=</span>

                    {problem.missing === 'answer' ? (
                        <div className="w-24 h-24 bg-indigo-50 rounded-xl border-4 border-dashed border-indigo-300 flex items-center justify-center">
                            <span className="text-indigo-300">?</span>
                        </div>
                    ) : (
                        <span className="tracking-widest">{problem.answer}</span>
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
                    <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="w-32 h-20 text-4xl text-center font-bold text-slate-800 bg-slate-100 rounded-2xl border-2 border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                        placeholder="?"
                        autoFocus
                    />

                    <button
                        type="submit"
                        className="w-full py-4 bg-primary hover:bg-orange-600 text-white text-2xl font-bold rounded-2xl shadow-lg shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Check size={32} />
                        <span>{t('game.check')}</span>
                    </button>

                    {/* Hint Button */}
                    {canShowHintButton && (
                        <motion.button
                            type="button"
                            onClick={() => setShowHintModal(true)}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-800 text-xl font-bold rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Lightbulb size={24} />
                            <span>{t('game.howTo')}</span>
                        </motion.button>
                    )}
                </form>

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
            <HintVisualizer
                isOpen={showHintModal}
                problem={problem}
                onClose={() => setShowHintModal(false)}
            />
        </>
    );
};
