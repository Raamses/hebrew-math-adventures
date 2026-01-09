import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useMathHint } from '../hooks/useMathHint';

interface BorrowingHintProps {
    operand1: number;
    operand2: number;
    answer: number;
    operator: string;
}

const DigitColumn = ({
    label,
    topDigit,
    bottomDigit,
    isActive,
    isBorrowSource,
    isBorrowTarget,
    isAddition,
    step,
    showCrossOut,
    showNewValue,
    showCarry,
    showMinusOne
}: {
    label: string;
    topDigit: number;
    bottomDigit: number;
    isActive: boolean;
    isBorrowSource: boolean;
    isBorrowTarget: boolean;
    isAddition: boolean;
    step: number;
    showCrossOut: boolean;
    showNewValue: boolean;
    showCarry: boolean;
    showMinusOne: boolean;
}) => {
    return (
        <div className="flex flex-col items-center gap-2 w-16 relative">
            {/* Header */}
            <span className={cn(
                "text-xs font-bold uppercase tracking-wider transition-colors duration-300",
                isActive ? "text-blue-500" : "text-slate-400"
            )}>
                {label}
            </span>

            {/* Indicator Zone (Floating above) */}
            <div className="h-8 w-full relative flex justify-center items-end">
                <AnimatePresence>
                    {showMinusOne && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute text-sm text-red-500 font-bold"
                        >
                            -1
                        </motion.div>
                    )}
                    {/* Add +10 indicator for borrow target */}
                    {!isAddition && isBorrowTarget && step >= 2 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute text-sm text-green-500 font-bold"
                        >
                            +10
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Top Digit Area */}
            <div className="relative text-3xl sm:text-5xl font-mono text-center h-12 flex items-center justify-center">
                <motion.span
                    layoutId={`top-${label}`} // Ensure smooth transition if layout changes
                    animate={{
                        color: isBorrowSource ? '#ef4444' : // Red if borrowing from
                            isBorrowTarget ? '#22c55e' : // Green if borrowing to
                                isActive ? '#3b82f6' : '#1e293b',
                        opacity: isBorrowSource ? 0.3 : 1,
                        scale: isActive ? 1.1 : 1
                    }}
                >
                    {topDigit}
                </motion.span>

                {/* Cross out animation */}
                <AnimatePresence>
                    {showCrossOut && (
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            className="absolute inset-0 m-auto h-1 bg-red-500 origin-left"
                            style={{ top: '50%' }}
                        />
                    )}
                </AnimatePresence>

                {/* New Value (Above crossed out) */}
                <AnimatePresence>
                    {showNewValue && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: -20 }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 text-2xl text-red-500 font-bold"
                        >
                            {topDigit - 1}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Digit */}
            <div className="relative text-3xl sm:text-5xl font-mono text-center h-12 flex items-center justify-center">
                <motion.span
                    layoutId={`bottom-${label}`}
                    animate={{
                        color: isActive ? '#3b82f6' : '#1e293b',
                        scale: isActive ? 1.1 : 1
                    }}
                >
                    {bottomDigit}
                </motion.span>
            </div>

            {/* Addition Carry Indicator (Bottom) - Only for Addition */}
            <AnimatePresence>
                {showCarry && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -left-4 bottom-16 text-blue-500 font-bold text-lg" // Positioned to the left of the column
                    >
                        1
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


export const BorrowingHint = ({ operand1, operand2, answer, operator }: BorrowingHintProps) => {
    const { t } = useTranslation();
    const {
        step,
        setStep,
        nextStep,
        prevStep,
        num1Digits,
        num2Digits,
        isAddition,
        focusIndex,
        isBorrowOrCarry
    } = useMathHint(operand1, operand2, operator);

    const placeValues = [
        t('game.placeValues.hundreds'),
        t('game.placeValues.tens'),
        t('game.placeValues.ones')
    ];

    return (
        <div className="flex flex-col items-center gap-6 lg:gap-8 p-6 lg:p-8 w-full max-w-2xl mx-auto relative bg-white/50 rounded-3xl backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-slate-700 text-center">
                {isAddition ? t('game.hints.stepByStepAdd') : t('game.hints.stepByStepSub')}
            </h3>

            {/* Controls */}
            <button
                onClick={prevStep}
                disabled={step === 0}
                aria-label={t('common.prev')}
                className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-50 transition-all z-10"
            >
                <ChevronLeft size={32} />
            </button>
            <button
                onClick={nextStep}
                disabled={step === 3}
                aria-label={t('common.next')}
                className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-50 transition-all z-10"
            >
                <ChevronRight size={32} />
            </button>

            {/* Main Visual Board */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl w-full flex flex-col items-center">
                <div className="flex items-end justify-center gap-2 sm:gap-4 relative" dir="ltr">

                    {/* Columns */}
                    <div className="flex gap-4">
                        {/* Spacer for Operator */}
                        <div className="w-8"></div>

                        {num1Digits.map((digit, i) => {
                            // Logic mapping

                            // Determine states based on focusIndex from hook
                            // i iterates 0 (Hundreds), 1 (Tens), 2 (Ones)
                            const isColActive = step >= 1 && i === focusIndex;

                            // Borrowing Logic (Subtraction)
                            // If we are borrowing, the Source is focusIndex - 1, Target is focusIndex
                            const isSource = !isAddition && step >= 2 && isBorrowOrCarry && i === focusIndex - 1;
                            const isTarget = !isAddition && step >= 2 && isBorrowOrCarry && i === focusIndex;

                            // Carry Logic (Addition)
                            // If carrying, we show the '1' floating to the left of the CURRENT column (so effectively in the prev column's space)
                            // But cleaner: Show it attached to the column that GENERATED it, but offset?
                            // Or attach to the column RECEIVING it?
                            // Standard way: Little '1' above the next column (left).
                            // In my DigitColumn 'showCarry', I put it absolute -left-4.
                            // So if I am the Ones column (i=2) and I carry, it appears between Ones and Tens.
                            const showCarry = isAddition && step >= 2 && isBorrowOrCarry && i === focusIndex;

                            return (
                                <DigitColumn
                                    key={i}
                                    label={placeValues[i]}
                                    topDigit={digit}
                                    bottomDigit={num2Digits[i]}
                                    isActive={isColActive}
                                    isBorrowSource={isSource}
                                    isBorrowTarget={isTarget}
                                    isAddition={isAddition}
                                    step={step}
                                    showCrossOut={isSource}
                                    showNewValue={isSource}
                                    showCarry={showCarry}
                                    showMinusOne={isSource}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Operator Symbol (Absolute or Grid overlay) */}
                <div className="absolute left-[30%] top-[45%] text-slate-400 text-4xl font-mono hidden sm:block">
                    {operator}
                </div>

                {/* Divider Line */}
                <div className="w-64 h-1 bg-slate-200 mt-4 rounded-full" />

                {/* Result */}
                <div className="h-20 flex items-center justify-end w-64 pr-4">
                    {step === 3 && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl sm:text-5xl font-mono font-bold text-primary tracking-[1.5em]"
                        >
                            {answer}
                        </motion.div>
                    )}
                </div>

            </div>

            {/* Explainer Text */}
            <div className="h-24 w-full flex items-center justify-center text-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="max-w-md"
                    >
                        <p className="font-bold text-lg text-primary mb-1">
                            {step === 0 && t('game.hints.step1')}
                            {step === 1 && t(isAddition ? 'game.hints.step2Add' : 'game.hints.step2Sub')}
                            {step === 2 && t(isAddition ? 'game.hints.step3Add' : 'game.hints.step3Sub')}
                            {step === 3 && t('game.hints.result')}
                        </p>
                        <p className="text-slate-600">
                            {step === 0 && (isAddition ? t('game.hints.step1Add') : t('game.hints.step1Sub'))}
                            {step === 1 && (isBorrowOrCarry ?
                                (isAddition ? t('game.hints.step2AddDesc') : t('game.hints.step2SubDesc')) :
                                (isAddition ? t('game.hints.step3AddDesc') : t('game.hints.step3SubNote'))
                            )}
                            {step === 2 && (isBorrowOrCarry ?
                                (isAddition ? t('game.hints.step2AddNote') : t('game.hints.step3SubNote')) :
                                t('game.hints.simpleCalc')
                            )}
                            {step === 3 && t('game.hints.weHaveLeft', { count: answer })}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Progress Dots */}
            <div className="flex gap-3 mt-4">
                {[0, 1, 2, 3].map((i) => (
                    <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={cn(
                            "h-3 w-3 rounded-full transition-all duration-300",
                            i === step ? "bg-primary w-6" : "bg-slate-300 hover:bg-slate-400"
                        )}
                        aria-label={t('common.step', { step: i + 1 })}
                    />
                ))}
            </div>

            {/* Mobile Nav */}
            <div className="flex sm:hidden w-full gap-4 mt-4">
                <button
                    onClick={prevStep}
                    disabled={step === 0}
                    className="flex-1 p-3 bg-white rounded-xl shadow text-primary font-bold disabled:opacity-50"
                >
                    {t('common.prev')}
                </button>
                <button
                    onClick={nextStep}
                    disabled={step === 3}
                    className="flex-1 p-3 bg-primary text-white rounded-xl shadow font-bold disabled:opacity-50"
                >
                    {t('common.next')}
                </button>
            </div>
        </div>
    );
};

