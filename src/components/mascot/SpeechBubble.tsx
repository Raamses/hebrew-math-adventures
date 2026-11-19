import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpeechBubbleProps {
    text: string;
    isVisible: boolean;
    variant?: 'speech' | 'thought';
    position?: 'left' | 'right' | 'center';
    className?: string;
    /** Below md, render in normal flow (full width of its container, no tail) instead of
     *  floating above the anchor. Used where there is no room to float, e.g. the lesson modal. */
    inlineOnMobile?: boolean;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text, isVisible, variant = 'speech', position = 'left', className = '', inlineOnMobile = false }) => {
    const alignmentClass = position === 'right' ? 'end-0' :
        position === 'center' ? 'left-1/2 -translate-x-1/2' :
            'start-0';

    const mdAlignmentClass = position === 'right' ? 'md:end-0' :
        position === 'center' ? 'md:left-1/2 md:-translate-x-1/2' :
            'md:start-0';

    const tailPositionClass = position === 'right' ? 'end-8' :
        position === 'center' ? 'left-1/2 -translate-x-1/2' :
            'start-8';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    className={inlineOnMobile
                        ? `relative w-full md:absolute md:bottom-full md:mb-4 ${mdAlignmentClass} z-20 md:w-64 ${className}`
                        : `absolute bottom-full mb-4 ${alignmentClass} z-20 w-48 md:w-64 ${className}`}
                >
                    <div className={`bg-white rounded-2xl ${inlineOnMobile ? 'px-3 py-2 md:p-4' : 'p-4'} shadow-lg border-2 border-slate-100 relative`}>
                        <p className={`${inlineOnMobile ? 'text-base md:text-lg [overflow-wrap:anywhere]' : 'text-lg'} font-bold text-slate-700 text-center leading-tight`}>
                            {text}
                        </p>

                        {/* Bubble Tail */}
                        {variant === 'speech' ? (
                            <div className={`${inlineOnMobile ? 'hidden md:block ' : ''}absolute -bottom-3 ${tailPositionClass} w-6 h-6 bg-white border-r-2 border-b-2 border-slate-100 transform rotate-45`}></div>
                        ) : (
                            <div className={`${inlineOnMobile ? 'hidden md:flex ' : 'flex '}absolute -bottom-4 ${tailPositionClass} flex-col items-center gap-1`}>
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
