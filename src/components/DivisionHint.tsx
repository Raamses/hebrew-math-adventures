import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Apple } from 'lucide-react';

interface DivisionHintProps {
    operand1: number; // Dividend (Total Items)
    operand2: number; // Divisor (Number of Baskets)
    answer: number; // Quotient (Items per Basket)
}

export const DivisionHint: React.FC<DivisionHintProps> = ({ operand1, operand2, answer }) => {
    const { t } = useTranslation();

    // Visual configuration
    const basketWidth = 80;
    const basketHeight = 60;
    const basketSpacing = 20;
    const totalBasketsWidth = operand2 * basketWidth + (operand2 - 1) * basketSpacing;
    const viewWidth = Math.max(400, totalBasketsWidth + 100);
    const viewHeight = 300;
    const startX = (viewWidth - totalBasketsWidth) / 2;
    const basketY = 200;

    // Colors for different baskets
    const basketColors = [
        '#ef4444', // Red
        '#84cc16', // Green
        '#eab308', // Yellow
        '#3b82f6', // Blue
        '#a855f7', // Purple
        '#f97316'  // Orange
    ];

    return (
        <div className="flex flex-col items-center gap-4 p-4 w-full max-w-lg mx-auto">
            <h3 className="text-xl md:text-2xl font-bold text-slate-700 text-center">{t('game.hints.letsSee')}</h3>

            <div className="bg-white rounded-3xl p-4 shadow-xl w-full aspect-[4/3] relative overflow-hidden ring-4 ring-green-50">
                <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    {/* Baskets */}
                    {Array.from({ length: operand2 }).map((_, i) => (
                        <g key={`basket-${i}`}>
                            <rect
                                x={startX + i * (basketWidth + basketSpacing)}
                                y={basketY}
                                width={basketWidth}
                                height={basketHeight}
                                rx={10}
                                fill="#d97706"
                                stroke="#78350f"
                                strokeWidth="3"
                            />
                            {/* Basket Details (Lines) */}
                            <line
                                x1={startX + i * (basketWidth + basketSpacing) + 10}
                                y1={basketY + 20}
                                x2={startX + i * (basketWidth + basketSpacing) + basketWidth - 10}
                                y2={basketY + 20}
                                stroke="#92400e"
                                strokeWidth="2"
                            />
                            <line
                                x1={startX + i * (basketWidth + basketSpacing) + 10}
                                y1={basketY + 40}
                                x2={startX + i * (basketWidth + basketSpacing) + basketWidth - 10}
                                y2={basketY + 40}
                                stroke="#92400e"
                                strokeWidth="2"
                            />

                            {/* Basket Number Label */}
                            <text
                                x={startX + i * (basketWidth + basketSpacing) + basketWidth / 2}
                                y={basketY + basketHeight + 25}
                                textAnchor="middle"
                                fontSize="16"
                                fontWeight="bold"
                                fill="#94a3b8"
                            >
                                {i + 1}
                            </text>

                            {/* Item Count Badge (appears at end) */}
                            <motion.g
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: operand1 * 0.3 + 0.5 }}
                            >
                                <circle
                                    cx={startX + i * (basketWidth + basketSpacing) + basketWidth / 2}
                                    cy={basketY + basketHeight - 15}
                                    r={12}
                                    fill="white"
                                    stroke={basketColors[i % basketColors.length]}
                                    strokeWidth={2}
                                />
                                <text
                                    x={startX + i * (basketWidth + basketSpacing) + basketWidth / 2}
                                    y={basketY + basketHeight - 10}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fontWeight="bold"
                                    fill={basketColors[i % basketColors.length]}
                                >
                                    {answer}
                                </text>
                            </motion.g>
                        </g>
                    ))}

                    {/* Apples being distributed */}
                    {Array.from({ length: operand1 }).map((_, i) => {
                        const targetBasketIndex = i % operand2;
                        const targetBasketX = startX + targetBasketIndex * (basketWidth + basketSpacing) + basketWidth / 2;
                        const itemsInBasketSoFar = Math.floor(i / operand2);
                        // Stack apples in the basket
                        const targetY = basketY - 15 - (itemsInBasketSoFar * 15);
                        // Offset slightly for natural look
                        const offsetX = (i % 2 === 0 ? -10 : 10) * (Math.random() * 0.5 + 0.5);
                        const appleColor = basketColors[targetBasketIndex % basketColors.length];

                        return (
                            <motion.g
                                key={`apple-${i}`}
                                initial={{ x: viewWidth / 2, y: 50, scale: 0 }}
                                animate={{
                                    x: targetBasketX + offsetX,
                                    y: targetY,
                                    scale: 1,
                                    transition: {
                                        delay: i * 0.3, // One by one animation
                                        duration: 0.8,
                                        type: "spring"
                                    }
                                }}
                            >
                                <foreignObject x={-15} y={-15} width={30} height={30}>
                                    <div className="w-full h-full text-green-500">
                                        <Apple size={30} fill={appleColor} stroke="#1e293b" strokeWidth={1} />
                                    </div>
                                </foreignObject>
                            </motion.g>
                        );
                    })}
                </svg>

                {/* Counter / Sum Display */}
                <motion.div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg border-2 border-green-500"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: operand1 * 0.3 + 0.5 }}
                    dir="ltr"
                >
                    <span className="text-2xl font-bold text-slate-800">
                        {operand1}
                        {' ÷ '}
                        {operand2}
                        {' = '}
                        <span className="text-green-600 text-3xl">{answer}</span>
                    </span>
                </motion.div>
            </div>

            {/* Explanation Text */}
            <motion.div
                className="text-center text-lg text-slate-600 max-w-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: operand1 * 0.3 + 0.8 }}
            >
                <p className="text-xl font-bold text-slate-700">
                    {t('game.hints.sharing', { total: operand1, baskets: operand2, perBasket: answer })}
                </p>
            </motion.div>
        </div>
    );
};
