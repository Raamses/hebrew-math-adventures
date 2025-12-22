import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BorrowingHintProps {
    operand1: number;
    operand2: number;
    answer: number;
    operator: string;
}

export const BorrowingHint: React.FC<BorrowingHintProps> = ({ operand1, operand2, answer, operator }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(0);

    // Convert numbers to digit arrays
    const num1Digits = operand1.toString().padStart(3, '0').split('').map(Number);
    const num2Digits = operand2.toString().padStart(3, '0').split('').map(Number);
    const isAddition = operator === '+';

    const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

    return (
        <div className="flex flex-col items-center gap-6 p-6 w-full max-w-2xl mx-auto relative">
            <h3 className="text-2xl font-bold text-slate-700 text-center">
                {isAddition ? t('game.hints.stepByStepAdd') : t('game.hints.stepByStepSub')}
            </h3>

            {/* Navigation Buttons (Absolute) */}
            <button
                onClick={prevStep}
                disabled={step === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-50 transition-all z-10"
            >
                <ChevronLeft size={32} />
            </button>
            <button
                onClick={nextStep}
                disabled={step === 3}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-50 transition-all z-10"
            >
                <ChevronRight size={32} />
            </button>

            {/* Visual representation */}
            <div className="bg-white rounded-2xl p-8 shadow-lg w-full min-h-[350px] flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-6 w-full">
                    {/* Problem display */}
                    <div className="text-center space-y-2 relative" dir="ltr">
                        {/* Column Headers */}
                        <div className="grid grid-cols-4 gap-4 w-fit mx-auto mb-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                            <div className="w-12"></div>
                            <div className="w-12 text-center">{t('game.placeValues.hundreds')}</div>
                            <div className="w-12 text-center">{t('game.placeValues.tens')}</div>
                            <div className="w-12 text-center">{t('game.placeValues.ones')}</div>
                        </div>

                        {/* Carry/Borrow Indicator Area */}
                        <div className="h-8 w-full relative">
                            <AnimatePresence>
                                {!isAddition && step >= 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute left-[calc(50%+1rem)] -translate-x-1/2 text-sm text-red-500 font-bold"
                                    >
                                        -1
                                    </motion.div>
                                )}
                                {!isAddition && step >= 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute left-[calc(50%+3rem)] -translate-x-1/2 text-sm text-green-500 font-bold"
                                    >
                                        +10
                                    </motion.div>
                                )}
                                {isAddition && step >= 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute left-[calc(50%-1.5rem)] -bottom-2 text-blue-500 font-bold"
                                    >
                                        1
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-5xl font-mono w-fit mx-auto relative transition-all">
                            {/* Top Row */}
                            <div className="w-12"></div> {/* Empty space for operator column */}
                            {num1Digits.map((digit, i) => (
                                <div key={`top-${i}`} className="relative w-12 text-center flex justify-center">
                                    <motion.span
                                        animate={{
                                            color: !isAddition && step >= 2 && i === 1 ? '#ef4444' : // The borrowed-from digit
                                                !isAddition && step >= 2 && i === 2 ? '#22c55e' : // The borrowing digit
                                                    '#1e293b',
                                            opacity: !isAddition && step >= 2 && i === 1 ? 0.3 : 1 // Dim original digit when crossed out
                                        }}
                                        className={i < 3 - operand1.toString().length ? 'invisible' : ''}
                                    >
                                        {digit}
                                    </motion.span>

                                    {/* Subtraction: Crossed out visual */}
                                    {!isAddition && step >= 2 && i === 1 && (
                                        <motion.div
                                            initial={{ scaleX: 0 }}
                                            animate={{ scaleX: 1 }}
                                            className="absolute top-1/2 left-0 w-full h-1 bg-red-500 origin-left"
                                        />
                                    )}
                                    {/* Subtraction: New value above */}
                                    {!isAddition && step >= 2 && i === 1 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: -20 }}
                                            className="absolute top-0 left-1/2 -translate-x-1/2 text-2xl text-red-500 font-bold"
                                        >
                                            {digit - 1}
                                        </motion.div>
                                    )}
                                </div>
                            ))}

                            {/* Bottom Row */}
                            <div className="w-12 text-center flex justify-center text-slate-400">{operator}</div>
                            {num2Digits.map((digit, i) => (
                                <div key={`bottom-${i}`} className="w-12 text-center flex justify-center">
                                    <span className={i < 3 - operand2.toString().length ? 'invisible' : ''}>
                                        {digit}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t-4 border-slate-300 mt-2 w-72 mx-auto"></div>

                        {/* Result Row (Animated) */}
                        <div className="grid grid-cols-4 gap-4 text-5xl font-mono w-fit mx-auto mt-2 h-16">
                            <div className="w-12"></div>
                            {step === 3 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="col-span-3 text-right tracking-[1.3em] font-bold text-primary mr-3"
                                >
                                    {answer}
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Step-by-step explanation */}
                    <div className="h-32 flex items-center justify-center w-full">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`step-${step}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-center text-lg text-slate-600 max-w-md"
                            >
                                {step === 0 && (
                                    <>
                                        <p className="font-bold text-primary">{t('game.hints.step1')}</p>
                                        <p>{isAddition ? t('game.hints.step1Add') : t('game.hints.step1Sub')}</p>
                                    </>
                                )}
                                {step === 1 && (
                                    <>
                                        <p className="font-bold text-primary">{t(isAddition ? 'game.hints.step2Add' : 'game.hints.step2Sub')}</p>
                                        {isAddition ?
                                            <p>{t('game.hints.step2AddDesc')}</p> :
                                            <p>{t('game.hints.step2SubDesc')}</p>
                                        }
                                        {/* Explicit Math show for ones column lookahead */}
                                        <div className="bg-slate-100 px-4 py-2 rounded-lg mt-2 inline-block font-mono text-slate-800">
                                            {num1Digits[2]} {operator} {num2Digits[2]} = {isAddition ? num1Digits[2] + num2Digits[2] : num1Digits[2] - num2Digits[2]}
                                        </div>
                                    </>
                                )}
                                {step === 2 && (
                                    <div className="flex flex-col gap-2 items-center">
                                        <p className="font-bold text-primary">{t(isAddition ? 'game.hints.step3Add' : 'game.hints.step3Sub')}</p>
                                        {isAddition ? (
                                            <div className="flex items-center gap-2 justify-center text-blue-600 bg-blue-50 p-2 rounded-lg w-fit">
                                                <span>Carry the 1!</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 justify-center text-red-600 bg-red-50 p-2 rounded-lg w-fit">
                                                <span>Borrow 10 from neighbor!</span>
                                            </div>
                                        )}
                                        {/* Show the resulting calculation after borrow/carry */}
                                        <div className="bg-slate-100 px-4 py-2 rounded-lg mt-2 inline-block font-mono text-slate-800">
                                            {isAddition ?
                                                `${num1Digits[2]} + ${num2Digits[2]} = ${num1Digits[2] + num2Digits[2]}` :
                                                `1${num1Digits[2]} - ${num2Digits[2]} = ${(10 + num1Digits[2]) - num2Digits[2]}`
                                            }
                                        </div>
                                        <p className="text-sm">
                                            {isAddition ? t('game.hints.step2AddNote') : t('game.hints.step3SubNote')}
                                        </p>
                                    </div>
                                )}
                                {step === 3 && (
                                    <>
                                        <p className="font-bold text-primary">{t('game.hints.result')}</p>
                                        <p className="text-3xl font-bold text-primary mt-2">
                                            {t('game.hints.weHaveLeft', { count: answer })}
                                        </p>
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Progress indicator */}
            <div className="flex gap-3">
                {[0, 1, 2, 3].map((i) => (
                    <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={`h-3 w-3 rounded-full transition-all ${i === step ? 'bg-primary scale-125' : 'bg-slate-300 hover:bg-slate-400'}`}
                        aria-label={`Go to step ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
