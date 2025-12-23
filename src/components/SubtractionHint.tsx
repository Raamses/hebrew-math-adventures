import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface SubtractionHintProps {
    operand1: number;
    operand2: number;
    answer: number;
}

export const SubtractionHint: React.FC<SubtractionHintProps> = ({ operand1, operand2, answer }) => {
    const { t } = useTranslation();

    // Generate organic positions (similar to AdditionHint)
    const getPosition = (index: number, total: number) => {
        if (index === 0) return { x: 200, y: 120 }; // Center
        const angle = ((index - 1) / (total - 1)) * 2 * Math.PI - Math.PI / 2;

        // Dynamic radius based on total count
        const radius = total <= 7 ? 40 : index <= 6 ? 35 : 65;

        // Two rings for larger numbers
        if (total > 7 && index > 6) {
            const outerAngle = ((index - 7) / (total - 7)) * 2 * Math.PI;
            return {
                x: 200 + Math.cos(outerAngle) * radius,
                y: 120 + Math.sin(outerAngle) * radius
            };
        }

        return {
            x: 200 + Math.cos(angle) * radius,
            y: 120 + Math.sin(angle) * radius
        };
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4 w-full max-w-lg mx-auto">
            <h3 className="text-xl md:text-2xl font-bold text-slate-700 text-center">{t('game.hints.letsSee')}</h3>

            <div className="bg-white rounded-3xl p-4 shadow-xl w-full aspect-[5/3] relative overflow-hidden ring-4 ring-red-50">
                <svg viewBox="0 0 400 240" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <radialGradient id="blue-grad" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#2563eb" />
                        </radialGradient>
                        <radialGradient id="red-pop-grad" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#fca5a5" />
                            <stop offset="100%" stopColor="#ef4444" />
                        </radialGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <AnimatePresence>
                        {Array.from({ length: operand1 }).map((_, i) => {
                            const isBeingRemoved = i >= operand1 - operand2; // Remove the last ones
                            const pos = getPosition(i, operand1);

                            return (
                                <motion.g
                                    key={`sub-item-${i}`}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={isBeingRemoved ? {
                                        scale: [1, 1.2, 0], // Pop effect
                                        opacity: [1, 0.8, 0],
                                        filter: "brightness(2)"
                                    } : {
                                        scale: 1,
                                        opacity: 1
                                    }}
                                    transition={isBeingRemoved ? {
                                        delay: 1.5 + (i - (operand1 - operand2)) * 0.3, // Staggered removal
                                        duration: 0.5,
                                        times: [0, 0.4, 1]
                                    } : {
                                        delay: i * 0.05,
                                        duration: 0.5
                                    }}
                                >
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={isBeingRemoved ? 16 : 18}
                                        fill={isBeingRemoved ? "url(#red-pop-grad)" : "url(#blue-grad)"}
                                        filter="url(#glow)"
                                    />
                                    <text
                                        x={pos.x}
                                        y={pos.y + 5}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="14"
                                        fontWeight="bold"
                                        className="pointer-events-none"
                                        style={{ opacity: isBeingRemoved ? 0 : 1 }} // Hide number on pop
                                    >
                                        {i + 1}
                                    </text>
                                </motion.g>
                            );
                        })}
                    </AnimatePresence>
                </svg>

                {/* Counter / Diff Display */}
                <motion.div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg border-2 border-primary"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.5 + operand2 * 0.3 + 0.5 }}
                    dir="ltr"
                >
                    <span className="text-2xl font-bold text-slate-800">
                        <span className="text-blue-500">{operand1}</span>
                        {' - '}
                        <span className="text-red-500">{operand2}</span>
                        {' = '}
                        <span className="text-purple-600 text-3xl">{answer}</span>
                    </span>
                </motion.div>
            </div>

            <div className="text-center text-slate-600 font-medium max-w-xs">
                {t('game.hints.subtractionExplainer', { total: operand1, removed: operand2, left: answer, defaultValue: `We had ${operand1}, we took away ${operand2}, so we have ${answer} left!` })}
            </div>
        </div>
    );
};
