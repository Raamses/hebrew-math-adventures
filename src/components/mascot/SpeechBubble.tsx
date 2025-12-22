import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpeechBubbleProps {
    text: string;
    isVisible: boolean;
    variant?: 'speech' | 'thought';
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text, isVisible, variant = 'speech' }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    className="absolute bottom-full mb-4 start-0 z-20 w-48 md:w-64"
                >
                    <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-slate-100 relative">
                        <p className="text-lg font-bold text-slate-700 text-center leading-tight">
                            {text}
                        </p>

                        {/* Bubble Tail */}
                        {variant === 'speech' ? (
                            <div className="absolute -bottom-3 start-8 w-6 h-6 bg-white border-r-2 border-b-2 border-slate-100 transform rotate-45"></div>
                        ) : (
                            <div className="absolute -bottom-4 start-8 flex flex-col items-center gap-1">
                                <div className="w-3 h-3 bg-white border-2 border-slate-100 rounded-full"></div>
                                <div className="w-2 h-2 bg-white border-2 border-slate-100 rounded-full"></div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
