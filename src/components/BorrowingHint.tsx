import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BorrowingHintProps {
    operand1: number;
    operand2: number;
    answer: number;
}

export const BorrowingHint: React.FC<BorrowingHintProps> = ({ operand1, operand2, answer }) => {
    const [step, setStep] = useState(0);

    // Convert numbers to digit arrays
    const num1Digits = operand1.toString().padStart(3, '0').split('').map(Number);
    const num2Digits = operand2.toString().padStart(3, '0').split('').map(Number);

    useEffect(() => {
        const timer = setInterval(() => {
            setStep(prev => (prev < 3 ? prev + 1 : prev));
        }, 2000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <h3 className="text-2xl font-bold text-slate-700 text-center">שלב אחר שלב - חיסור עם "שאילה"</h3>

            {/* Visual representation */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="flex flex-col items-center gap-4">
                    {/* Problem display */}
                    <div className="text-center space-y-2">
                        <div className="flex justify-center gap-4 text-4xl font-mono">
                            {num1Digits.map((digit, i) => (
                                <motion.span
                                    key={`top-${i}`}
                                    className="w-12 text-center"
                                    animate={{
                                        color: step >= 1 && i === 2 ? '#ef4444' : '#1e293b'
                                    }}
                                >
                                    {digit}
                                </motion.span>
                            ))}
                        </div>
                        <div className="flex justify-center gap-4 text-4xl font-mono">
                            <span className="w-12 text-center">-</span>
                            {num2Digits.slice(1).map((digit, i) => (
                                <span key={`bottom-${i}`} className="w-12 text-center">
                                    {digit}
                                </span>
                            ))}
                        </div>
                        <div className="border-t-4 border-slate-300 mt-2"></div>
                    </div>

                    {/* Step-by-step explanation */}
                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.div
                                key="step0"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-center text-lg text-slate-600 max-w-md"
                            >
                                <p className="font-bold text-primary">שלב 1: התחלה</p>
                                <p>בואו נחסר מספר אחר מספר</p>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-center text-lg text-slate-600 max-w-md"
                            >
                                <p className="font-bold text-primary">שלב 2: זיהוי הבעיה</p>
                                <p>לפעמים הספרה למעלה קטנה מהספרה למטה</p>
                                <p className="text-sm text-slate-500 mt-2">צריך "לשאול" מהספרה השכנה!</p>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-center text-lg text-slate-600 max-w-md"
                            >
                                <p className="font-bold text-primary">שלב 3: השאילה</p>
                                <p>"שואלים" 10 מהספרה השכנה</p>
                                <p className="text-sm text-slate-500 mt-2">עכשיו אפשר לחסר!</p>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-center text-lg text-slate-600 max-w-md"
                            >
                                <p className="font-bold text-primary">!התוצאה</p>
                                <p className="text-3xl font-bold text-primary mt-2">{answer}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Progress indicator */}
            <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`h-2 w-12 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-slate-200'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};
