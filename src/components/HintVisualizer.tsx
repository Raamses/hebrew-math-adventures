import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb } from 'lucide-react';
import { AdditionHint } from './AdditionHint';
import { SubtractionHint } from './SubtractionHint';
import { BorrowingHint } from './BorrowingHint';
import type { Problem } from '../lib/gameLogic';
import { useTranslation } from 'react-i18next';

interface HintVisualizerProps {
    isOpen: boolean;
    problem: Problem;
    onClose: () => void;
}

export const HintVisualizer: React.FC<HintVisualizerProps> = ({ isOpen, problem, onClose }) => {
    const { t, i18n } = useTranslation();
    if (!isOpen) return null;

    const renderHint = () => {
        const { num1, num2, operator, answer, subType } = problem;

        // For small numbers (≤ 20), show visual hints
        if (operator === '+' && num1 <= 10 && num2 <= 10) {
            return <AdditionHint operand1={num1} operand2={num2} answer={answer} />;
        }

        if (operator === '-' && num1 <= 20 && num2 <= 10) {
            return <SubtractionHint operand1={num1} operand2={num2} answer={answer} />;
        }

        // For borrowing/carrying or larger numbers, show step-by-step
        if ((operator === '-' && subType === 'borrow') || (operator === '+' && subType === 'carry')) {
            return <BorrowingHint operand1={num1} operand2={num2} answer={answer} operator={operator} />;
        }

        // Default: Simple explanation
        return (
            <div className="flex flex-col items-center gap-4 p-6">
                <h3 className="text-2xl font-bold text-slate-700 text-center">{t('game.hintCalcTogether')}</h3>
                <div className="bg-white rounded-2xl p-8 shadow-lg" dir="ltr">
                    <div className="text-5xl font-bold text-center space-y-4">
                        <div>{num1}</div>
                        <div className="text-3xl">{operator}</div>
                        <div>{num2}</div>
                        <div className="border-t-4 border-slate-300 pt-4 text-primary">
                            = {answer}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl shadow-2xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        dir={i18n.dir()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md text-slate-600 hover:text-slate-800 transition-colors z-10"
                        >
                            <X size={24} />
                        </button>

                        {/* Header */}
                        <div className="bg-primary/10 p-6 rounded-t-3xl flex items-center justify-center gap-2">
                            <Lightbulb className="text-primary" size={32} />
                            <h2 className="text-3xl font-bold text-primary">{t('game.hintHeader')}</h2>
                        </div>

                        {/* Content */}
                        {renderHint()}

                        {/* Footer */}
                        <div className="p-6">
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-primary hover:bg-orange-600 text-white text-xl font-bold rounded-2xl shadow-lg transition-all active:scale-95"
                            >
                                {t('game.hintClose')}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
