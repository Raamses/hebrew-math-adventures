import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface AdditionHintProps {
    operand1: number;
    operand2: number;
    answer: number;
}

export const AdditionHint: React.FC<AdditionHintProps> = ({ operand1, operand2, answer }) => {
    const { t } = useTranslation();

    const renderDots = (count: number, color: string, startX: number) => {
        const dots = [];

        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / 5);
            const col = i % 5;
            dots.push(
                <motion.circle
                    key={i}
                    cx={startX + col * 30}
                    cy={50 + row * 30}
                    r={12}
                    fill={color}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                />
            );
        }
        return dots;
    };

    return (
        <div className="flex flex-col items-center gap-4 p-6">
            <h3 className="text-2xl font-bold text-slate-700 text-center">{t('game.hints.letsSee')}</h3>

            {/* Visual representation */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
                <svg width="400" height="200" className="mx-auto">
                    {/* First group of dots */}
                    <text x="20" y="30" className="text-lg font-bold fill-blue-600">
                        {operand1}
                    </text>
                    {renderDots(operand1, '#3b82f6', 20)}

                    {/* Plus sign */}
                    <motion.text
                        x="180"
                        y="120"
                        className="text-3xl font-bold fill-slate-600"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: operand1 * 0.1 + 0.3 }}
                    >
                        +
                    </motion.text>

                    {/* Second group of dots */}
                    <text x="220" y="30" className="text-lg font-bold fill-green-600">
                        {operand2}
                    </text>
                    {renderDots(operand2, '#10b981', 220)}

                    {/* Equals sign and answer */}
                    <motion.g
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (operand1 + operand2) * 0.1 + 0.5 }}
                    >
                        <text x="360" y="30" className="text-xl font-bold fill-orange-500">
                            = {answer}
                        </text>
                    </motion.g>
                </svg>
            </div>

            {/* Explanation text */}
            <motion.div
                className="text-center text-lg text-slate-600 max-w-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: (operand1 + operand2) * 0.1 + 0.8 }}
            >
                <p className="font-medium">
                    {t('game.hints.weHave')}<span className="text-blue-600 font-bold">{operand1}</span>{t('game.hints.blueDots')}
                    {' '}+{' '}
                    <span className="text-green-600 font-bold">{operand2}</span>{t('game.hints.greenDots')}
                </p>
                <p className="text-2xl font-bold text-primary mt-2">
                    = {answer}{t('game.hints.totalPoints')}
                </p>
            </motion.div>
        </div>
    );
};
