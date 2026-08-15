import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ANIM_S = 0.9;
const DISMISS_MS = ANIM_S * 1000;

interface ScoreToastProps {
    message: string;
    isVisible: boolean;
    onComplete: () => void;
}

export const ScoreToast: React.FC<ScoreToastProps> = ({ message, isVisible, onComplete }) => {
    // Held in a ref so a new inline-arrow `onComplete` from the parent does not
    // restart the dismiss timer on every parent render.
    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    useEffect(() => {
        if (!isVisible) return;
        const timer = window.setTimeout(() => onCompleteRef.current(), DISMISS_MS);
        return () => clearTimeout(timer);
    }, [isVisible]); // `onComplete` removed from deps: that was the leak

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 50 }}
                    animate={{
                        opacity: [0, 1, 1, 0],
                        scale: [0.5, 1.2, 1, 1],
                        y: [20, -100, -120, -150]
                    }}
                    transition={{
                        duration: ANIM_S,
                        times: [0, 0.2, 0.8, 1],
                        ease: "easeOut"
                    }}
                    className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    role="status"
                    aria-live="polite"
                >
                    <div className="relative" dir="auto">
                        {/* Shadow/Stroke effect using layered text */}
                        <span className="absolute inset-0 text-white stroke-white stroke-[8px] blur-sm select-none font-black text-4xl md:text-6xl tracking-wider whitespace-nowrap">
                            {message}
                        </span>
                        <span className="absolute inset-0 text-white stroke-white stroke-[4px] select-none font-black text-4xl md:text-6xl tracking-wider whitespace-nowrap">
                            {message}
                        </span>

                        {/* Main Text */}
                        <span className="relative font-black text-4xl md:text-6xl tracking-wider bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent drop-shadow-lg select-none whitespace-nowrap">
                            {message}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
