import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';

interface MultiplicationHintProps {
    operand1: number; // Groups (Rows)
    operand2: number; // Items per group (Cols)
    answer: number;
}

export const MultiplicationHint: React.FC<MultiplicationHintProps> = ({ operand1, operand2, answer }) => {
    const { t } = useTranslation();

    // Determine grid size for viewBox to ensure responsiveness
    // Each cell is 40x40 roughly
    const cellWidth = 50;
    const cellHeight = 50;
    const gridWidth = operand2 * cellWidth;
    const gridHeight = operand1 * cellHeight;
    const viewWidth = Math.max(300, gridWidth + 100);
    const viewHeight = Math.max(200, gridHeight + 100);
    const startX = (viewWidth - gridWidth) / 2;
    const startY = (viewHeight - gridHeight) / 2;

    return (
        <div className="flex flex-col items-center gap-4 p-4 w-full max-w-lg mx-auto">
            <h3 className="text-xl md:text-2xl font-bold text-slate-700 text-center">{t('game.hints.letsSee')}</h3>

            <div className="bg-white rounded-3xl p-4 shadow-xl w-full aspect-[4/3] relative overflow-hidden ring-4 ring-yellow-50">
                <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fcd34d" />
                            <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                        <filter id="star-glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Row Numbers (Left) */}
                    {Array.from({ length: operand1 }).map((_, i) => (
                        <text
                            key={`row-num-${i}`}
                            x={startX - 15}
                            y={startY + i * cellHeight + cellHeight / 2 + 5}
                            textAnchor="end"
                            fontSize="16"
                            fontWeight="bold"
                            fill="#64748b"
                        >
                            {i + 1}
                        </text>
                    ))}

                    {/* Column Numbers (Top) */}
                    {Array.from({ length: operand2 }).map((_, i) => (
                        <text
                            key={`col-num-${i}`}
                            x={startX + i * cellWidth + cellWidth / 2}
                            y={startY - 10}
                            textAnchor="middle"
                            fontSize="16"
                            fontWeight="bold"
                            fill="#64748b"
                        >
                            {i + 1}
                        </text>
                    ))}

                    {/* Grid Lines */}
                    <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Horizontal Lines */}
                        {Array.from({ length: operand1 + 1 }).map((_, i) => (
                            <line
                                key={`h-${i}`}
                                x1={startX}
                                y1={startY + i * cellHeight}
                                x2={startX + gridWidth}
                                y2={startY + i * cellHeight}
                                stroke="#94a3b8"
                                strokeWidth="2"
                            />
                        ))}
                        {/* Vertical Lines */}
                        {Array.from({ length: operand2 + 1 }).map((_, i) => (
                            <line
                                key={`v-${i}`}
                                x1={startX + i * cellWidth}
                                y1={startY}
                                x2={startX + i * cellWidth}
                                y2={startY + gridHeight}
                                stroke="#94a3b8"
                                strokeWidth="2"
                            />
                        ))}
                    </motion.g>

                    {/* Stars filling the grid row by row */}
                    {Array.from({ length: operand1 }).map((_, row) =>
                        Array.from({ length: operand2 }).map((_, col) => (
                            <motion.g
                                key={`star-${row}-${col}`}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                    delay: row * 0.5 + col * 0.1, // Stagger rows, then columns
                                    type: "spring",
                                    bounce: 0.5
                                }}
                                className="origin-center"
                                style={{ transformBox: 'fill-box' }}
                            >
                                <foreignObject
                                    x={startX + col * cellWidth + 5}
                                    y={startY + row * cellHeight + 5}
                                    width={40}
                                    height={40}
                                >
                                    <div className="flex items-center justify-center w-full h-full text-yellow-500">
                                        <Star fill="url(#star-grad)" size={32} strokeWidth={1} />
                                    </div>
                                </foreignObject>
                            </motion.g>
                        ))
                    )}
                </svg>

                {/* Counter / Sum Display */}
                <motion.div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg border-2 border-yellow-400"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: operand1 * 0.5 + 0.5 }}
                    dir="ltr"
                >
                    <span className="text-2xl font-bold text-slate-800">
                        {operand1}
                        {' x '}
                        {operand2}
                        {' = '}
                        <span className="text-yellow-600 text-3xl">{answer}</span>
                    </span>
                </motion.div>
            </div>

            {/* Explanation Text */}
            <motion.div
                className="text-center text-lg text-slate-600 max-w-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: operand1 * 0.5 + 0.8 }}
            >
                <p className="text-xl font-bold text-slate-700">
                    {t('game.hints.groups', { count: operand1, items: operand2, total: answer })}
                </p>
            </motion.div>
        </div>
    );
};
