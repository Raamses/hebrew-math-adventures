import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface AdditionHintProps {
    operand1: number;
    operand2: number;
    answer: number;
}

const getFinalPosition = (index: number, total: number) => {
    if (index === 0) return { x: 200, y: 100 }; // Center
    const angle = ((index - 1) / (total - 1)) * 2 * Math.PI - Math.PI / 2;

    // Small numbers: single ring
    if (total <= 7) {
        return {
            x: 200 + Math.cos(angle) * 35,
            y: 100 + Math.sin(angle) * 35
        };
    }

    // Larger numbers: inner ring (6) + outer ring
    if (index <= 6) {
        const innerAngle = ((index - 1) / 6) * 2 * Math.PI;
        return {
            x: 200 + Math.cos(innerAngle) * 30,
            y: 100 + Math.sin(innerAngle) * 30
        };
    }

    // Outer ring
    const outerAngle = ((index - 7) / (total - 7)) * 2 * Math.PI;
    return {
        x: 200 + Math.cos(outerAngle) * 55,
        y: 100 + Math.sin(outerAngle) * 55
    };
};

const itemVariants: Variants = {
    initial: (custom: { index: number, isSecondGroup: boolean }) => ({
        x: custom.isSecondGroup
            ? 320 - (custom.index % 3) * 30
            : 80 + (custom.index % 3) * 30,
        y: 80 + Math.floor(custom.index / 3) * 30,
        opacity: 0,
        scale: 0.5
    }),
    animate: (custom: { index: number, total: number, globalIndex: number }) => ({
        x: getFinalPosition(custom.globalIndex, custom.total).x,
        y: getFinalPosition(custom.globalIndex, custom.total).y,
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            bounce: 0.4,
            duration: 1.2
        }
    })
};

const containerVariants: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.5
        }
    }
};

export const AdditionHint: React.FC<AdditionHintProps> = ({ operand1, operand2, answer }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center gap-4 p-4 w-full max-w-lg mx-auto">
            <h3 className={cn("text-xl md:text-2xl font-bold text-slate-700 text-center")}>
                {t('game.hints.letsSee', 'Let\'s see how much they make together!')}
            </h3>

            <div className={cn(
                "bg-white rounded-3xl p-4 shadow-xl w-full aspect-[5/3] relative overflow-hidden",
                "ring-4 ring-blue-50"
            )}>
                <svg
                    viewBox="0 0 400 240"
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label={t('game.hints.additionVisual', {
                        defaultValue: `Visual aid showing {{op1}} blue dots and {{op2}} red dots merging to form {{answer}}`,
                        op1: operand1,
                        op2: operand2,
                        answer: answer
                    })}
                >
                    <defs>
                        <radialGradient id="blue-grad" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#2563eb" />
                        </radialGradient>
                        <radialGradient id="red-grad" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#f87171" />
                            <stop offset="100%" stopColor="#dc2626" />
                        </radialGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Group 1 (Blue) */}
                    <motion.g
                        variants={containerVariants}
                        initial="initial"
                        animate="animate"
                    >
                        {Array.from({ length: operand1 }).map((_, i) => (
                            <motion.g
                                key={`op1-${i}`}
                                variants={itemVariants}
                                custom={{
                                    index: i,
                                    globalIndex: i,
                                    total: answer,
                                    isSecondGroup: false
                                }}
                            >
                                <circle r={14} fill="url(#blue-grad)" filter="url(#glow)" />
                                <text
                                    y={5}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="14"
                                    fontWeight="bold"
                                    className="pointer-events-none"
                                >
                                    {i + 1}
                                </text>
                            </motion.g>
                        ))}
                    </motion.g>

                    {/* Group 2 (Red) - Delayed start to follow Blue */}
                    <motion.g
                        variants={containerVariants}
                        initial="initial"
                        animate="animate"
                        transition={{ delayChildren: 0.5 + (operand1 * 0.1) + 0.5 }} // Wait for blue to finish staggering
                    >
                        {Array.from({ length: operand2 }).map((_, i) => (
                            <motion.g
                                key={`op2-${i}`}
                                variants={itemVariants}
                                custom={{
                                    index: i,
                                    globalIndex: operand1 + i,
                                    total: answer,
                                    isSecondGroup: true
                                }}
                            >
                                <circle r={14} fill="url(#red-grad)" filter="url(#glow)" />
                                <text
                                    y={5}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="14"
                                    fontWeight="bold"
                                    className="pointer-events-none"
                                >
                                    {operand1 + i + 1}
                                </text>
                            </motion.g>
                        ))}
                    </motion.g>

                    {/* Merging Path Arrow */}
                    <motion.path
                        d="M 120 70 Q 200 20 280 70"
                        fill="transparent"
                        stroke="#818cf8"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="10 10"
                        initial={{ opacity: 1, pathLength: 0 }}
                        animate={{ opacity: 0, pathLength: 1 }}
                        transition={{ duration: 1, delay: 0.5 }}
                    />
                </svg>

                {/* Counter / Sum Display */}
                <motion.div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg border-2 border-primary"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1 + (answer * 0.1) + 0.5 }} // Show after all dots arrive
                    dir="ltr"
                >
                    <span className="text-2xl font-bold text-slate-800">
                        <span className="text-blue-500">{operand1}</span>
                        {' + '}
                        <span className="text-red-500">{operand2}</span>
                        {' = '}
                        <span className="text-purple-600 text-3xl">{answer}</span>
                    </span>
                </motion.div>
            </div>

            <div className="text-center text-slate-600 font-medium max-w-xs">
                {t('game.hints.additionExplainer', {
                    op1: operand1,
                    op2: operand2,
                    answer: answer,
                    defaultValue: `We have ${operand1}, we add ${operand2}, together they make ${answer}!`
                })}
            </div>
        </div>
    );
};
