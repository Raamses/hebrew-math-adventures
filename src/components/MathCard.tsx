import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lightbulb, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HintVisualizer } from './HintVisualizer';
import type { Problem } from '../lib/gameLogic';
import { cn } from '../lib/utils';

import { ArithmeticView } from './math-card/ArithmeticView';
import { ComparisonView } from './math-card/ComparisonView';
import { SeriesView } from './math-card/SeriesView';
import { WordProblemView } from './math-card/WordProblemView';

interface MathCardProps {
    problem: Problem;
    onAnswer: (isCorrect: boolean) => void;
    feedback: string | null;
    isProcessing?: boolean;
}

const MathCardInner: React.FC<MathCardProps> = ({ problem, onAnswer, feedback, isProcessing = false }) => {
    const { t } = useTranslation();
    const [answer, setAnswer] = useState('');
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [showHintModal, setShowHintModal] = useState(false);

    // The state is now reset by the wrapper component remounting MathCardInner with a new key.
    // No need for useEffect here.

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

    const getTitleKey = () => {
        switch (problem.type) {
            case 'series': return 'game.completePattern';
            case 'compare': return 'game.compareNumbers';
            case 'word': return 'game.readCarefully';
            default: return 'game.howMuch';
        }
    };

    const canShowHintButton = wrongAttempts >= 1 && (problem.type === 'arithmetic');

    // The problemKey is now handled by the wrapper component to remount MathCardInner.
    // The inner motion.div will use a key based on the problem type to ensure its content animates correctly.
    const innerMotionKey = problem.type;

    return (
        <>
            <motion.div
                animate={feedback && !feedback.includes('!') ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                layout
                className={cn(
                    "w-full max-w-md bg-white rounded-3xl shadow-xl p-6 relative overflow-hidden transition-all duration-500",
                    problem.metadata?.isChallenge && "ring-4 ring-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] scale-[1.02]"
                )}
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
                    <h2 className={cn(
                        "text-2xl font-bold text-center",
                        problem.metadata?.isChallenge ? "text-amber-600" : "text-slate-700"
                    )}>
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

                <AnimatePresence mode="wait">
                    <motion.div
                        key={innerMotionKey} // Use problem.type as key for inner animation
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {problem.type !== 'compare' ? (
                            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
                                <ArithmeticView
                                    problem={problem}
                                    answer={answer}
                                    setAnswer={setAnswer}
                                    isProcessing={isProcessing}
                                    wrongAttempts={wrongAttempts}
                                />
                                <SeriesView
                                    problem={problem}
                                    answer={answer}
                                    setAnswer={setAnswer}
                                    isProcessing={isProcessing}
                                />
                                <WordProblemView
                                    problem={problem}
                                    answer={answer}
                                    setAnswer={setAnswer}
                                    isProcessing={isProcessing}
                                />

                                <motion.button
                                    type="submit"
                                    disabled={isProcessing}
                                    className={cn(
                                        "w-full py-4 bg-primary hover:bg-orange-600 text-white text-2xl font-bold rounded-2xl",
                                        "shadow-lg shadow-orange-500/30 transition-colors flex items-center justify-center gap-2",
                                        isProcessing && "opacity-50 cursor-not-allowed"
                                    )}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Check size={32} />
                                    <span>{t('game.check')}</span>
                                </motion.button>
                            </form>
                        ) : (
                            <ComparisonView
                                problem={problem}
                                isProcessing={isProcessing}
                                onCompare={handleCompare}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>

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

export const MathCard: React.FC<MathCardProps> = (props) => {
    // Helper to generate a unique key for the problem to force remounting
    const getProblemId = (p: Problem) => {
        if (p.type === 'arithmetic' || p.type === 'compare') return `${p.num1}-${p.operator}-${p.num2}`;
        if (p.type === 'series') return p.sequence.join(',');
        if (p.type === 'word') return JSON.stringify(p.params);
        return '';
    };

    // We use a key based on problem properties to force MathCardInner to remount
    // This ensures its internal state (answer, wrongAttempts, showHintModal) is reset
    // and auto-focus works reliably when the problem changes.
    const problemKey = `${props.problem.type}-${getProblemId(props.problem)}`;

    return <MathCardInner key={problemKey} {...props} />;
};
