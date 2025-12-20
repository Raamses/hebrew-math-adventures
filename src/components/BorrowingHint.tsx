import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BorrowingHintProps {
    operand1: number;
    operand2: number;
    answer: number;
    operator: string;
}

export const BorrowingHint: React.FC<BorrowingHintProps> = ({ operand1, operand2, answer, operator }) => {
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

    const isAddition = operator === '+';

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <h3 className="text-2xl font-bold text-slate-700 text-center">
                {isAddition ? 'שלב אחר שלב - חיבור במאונך' : 'שלב אחר שלב - חיסור עם "שאילה"'}
            </h3>

            {/* Visual representation */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="flex flex-col items-center gap-4">
                    {/* Problem display */}
                    <div className="text-center space-y-2" dir="ltr">
                        <div className="grid grid-cols-4 gap-2 text-4xl font-mono w-fit mx-auto">
                            {/* Top Row */}
                            <div className="w-12"></div> {/* Empty space for operator column */}
                            {num1Digits.map((digit, i) => (
                                <motion.div
                                    key={`top-${i}`}
                                    className="w-12 text-center flex justify-center"
                                    animate={{
                                        color: !isAddition && step >= 1 && i === 2 ? '#ef4444' : '#1e293b'
                                    }}
                                >
                                    {/* Hide leading zeros if original number is smaller */}
                                    <span className={i < 3 - operand1.toString().length ? 'invisible' : ''}>
                                        {digit}
                                    </span>
                                </motion.div>
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
                        <div className="border-t-4 border-slate-300 mt-2 w-64 mx-auto"></div>
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
                                <p>{isAddition ? 'בואו נחבר מספר אחר מספר' : 'בואו נחסר מספר אחר מספר'}</p>
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
                                <p className="font-bold text-primary">שלב 2: {isAddition ? 'חיבור' : 'זיהוי הבעיה'}</p>
                                {isAddition ? (
                                    <>
                                        <p>מחברים את היחידות, ואז את העשרות...</p>
                                        <p className="text-sm text-slate-500 mt-2">אם התוצאה גדולה מ-9, זוכרים בצד!</p>
                                    </>
                                ) : (
                                    <>
                                        <p>לפעמים הספרה למעלה קטנה מהספרה למטה</p>
                                        <p className="text-sm text-slate-500 mt-2">צריך "לשאול" מהספרה השכנה!</p>
                                    </>
                                )}
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
                                <p className="font-bold text-primary">שלב 3: {isAddition ? 'סיום' : 'השאילה'}</p>
                                {isAddition ? (
                                    <p>ממשיכים לחבר עד שמסיימים את כל המספרים</p>
                                ) : (
                                    <>
                                        <p>"שואלים" 10 מהספרה השכנה</p>
                                        <p className="text-sm text-slate-500 mt-2">עכשיו אפשר לחסר!</p>
                                    </>
                                )}
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
