import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface SubtractionHintProps {
    operand1: number;
    operand2: number;
    answer: number;
}

export const SubtractionHint: React.FC<SubtractionHintProps> = ({ operand1, operand2, answer }) => {
    const { t } = useTranslation();

    const renderObjects = () => {
        const objects = [];
        for (let i = 0; i < operand1; i++) {
            const isCrossedOut = i < operand2;
            const row = Math.floor(i / 5);
            const col = i % 5;

            objects.push(
                <motion.g
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                >
                    {/* Circle */}
                    <circle
                        cx={50 + col * 50}
                        cy={60 + row * 50}
                        r={18}
                        fill={isCrossedOut ? '#cbd5e1' : '#3b82f6'}
                        className="transition-colors duration-300"
                    />

                    {/* Cross-out animation */}
                    {isCrossedOut && (
                        <motion.line
                            x1={50 + col * 50 - 15}
                            y1={60 + row * 50 - 15}
                            x2={50 + col * 50 + 15}
                            y2={60 + row * 50 + 15}
                            stroke="#ef4444"
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{
                                delay: operand1 * 0.1 + 0.5 + i * 0.15,
                                duration: 0.3
                            }}
                        />
                    )}
                </motion.g>
            );
        }
        return objects;
    };

    return (
        <div className="flex flex-col items-center gap-4 p-6">
            <h3 className="text-2xl font-bold text-slate-700 text-center">{t('game.hints.letsSee')}</h3>

            {/* Visual representation */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
                <svg width="400" height="250" className="mx-auto">
                    {/* Title */}
                    <text x="20" y="30" className="text-lg font-bold fill-blue-600">
                        {operand1}{t('game.hints.circles')}
                    </text>

                    {renderObjects()}

                    {/* Minus sign */}
                    <motion.text
                        x="320"
                        y="130"
                        className="text-3xl font-bold fill-slate-600"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: operand1 * 0.1 + 0.3 }}
                    >
                        - {operand2}
                    </motion.text>
                </svg>
            </div>

            {/* Explanation text */}
            <motion.div
                className="text-center text-lg text-slate-600 max-w-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: operand1 * 0.1 + operand2 * 0.15 + 1 }}
            >
                <p className="font-medium">
                    {t('game.hints.weHad')}<span className="text-blue-600 font-bold">{operand1}</span>{t('game.hints.circles')}
                </p>
                <p className="font-medium mt-1">
                    {t('game.hints.weRemoved')}<span className="text-red-500 font-bold">{operand2}</span>{t('game.hints.circles')}
                </p>
                <p className="text-2xl font-bold text-primary mt-2">
                    {t('game.hints.weHaveLeft', { count: answer })}
                </p>
            </motion.div>
        </div>
    );
};
