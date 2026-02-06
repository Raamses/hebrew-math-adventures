import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Star } from 'lucide-react';
import type { LearningNode } from '../../types/learningPath';
import { cn } from '../../lib/utils';

interface MapNodeProps {
    node: LearningNode;
    index: number;
    locked: boolean;
    stars: number;
    x: number;
    y: number;
    onSelect: (node: LearningNode) => void;
}

export const MapNode: React.FC<MapNodeProps> = ({ node, index, locked, stars, x, y, onSelect }) => {
    return (
        <motion.div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
            style={{ left: x, top: y }}
            whileHover={!locked ? { scale: 1.1 } : {}}
            whileTap={!locked ? { scale: 0.95 } : {}}
            onClick={() => !locked && onSelect(node)}
        >
            <div className="relative w-20 h-20 flex items-center justify-center transition-transform duration-300">
                {/* SVG Level Token */}
                <svg viewBox="0 0 100 100" className={cn("w-full h-full drop-shadow-md", locked && "grayscale opacity-80")}>
                    {/* Outer Border/Shadow */}
                    <circle cx="50" cy="50" r="48" fill="#0f172a" opacity="0.2" />

                    {/* Main Body */}
                    <circle cx="50" cy="48" r="45" fill={locked ? "#94a3b8" : "#3b82f6"} />

                    {/* Top Highlight (Bevel) */}
                    <circle cx="50" cy="48" r="40" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />

                    {/* Bottom Shadow (Bevel) */}
                    <path d="M 15,65 Q 50,90 85,65" fill="none" stroke="black" strokeWidth="4" opacity="0.1" />

                    {/* Gradient Overlay for shine */}
                    <defs>
                        <linearGradient id="tokenShine" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <circle cx="50" cy="48" r="45" fill="url(#tokenShine)" />
                </svg>

                {/* Content Overlay */}
                {!locked ? (
                    <span className="absolute text-3xl font-black text-white drop-shadow-sm font-sans tracking-tight pt-1">
                        {index + 1}
                    </span>
                ) : (
                    <Lock className="absolute text-slate-600/50 w-8 h-8" />
                )}
            </div>

            {/* Stars */}
            {!locked && stars > 0 && (
                <div className="flex gap-1 mt-[-10px] bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm z-20">
                    {[1, 2, 3].map(s => (
                        <Star
                            key={s}
                            size={12}
                            className={cn(
                                "drop-shadow-sm",
                                s <= stars ? "fill-yellow-400 text-yellow-400" : "text-slate-500 fill-slate-700"
                            )}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
};
