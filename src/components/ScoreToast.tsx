import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScoreToastProps {
    points: number;
    isVisible: boolean;
    onComplete: () => void;
}

export const ScoreToast: React.FC<ScoreToastProps> = ({ points, isVisible, onComplete }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onComplete, 2000); // Allow animation to play out
            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete]);

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
                        duration: 1.5,
                        times: [0, 0.2, 0.8, 1],
                        ease: "easeOut"
                    }}
                    className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                >
                    <div className="relative" dir="ltr">
                        {/* Shadow/Stroke effect using layered text */}
                        <span className="absolute inset-0 text-white stroke-white stroke-[8px] blur-sm select-none font-black text-4xl md:text-6xl tracking-wider whitespace-nowrap">
                            +{points} XP!
                        </span>
                        <span className="absolute inset-0 text-white stroke-white stroke-[4px] select-none font-black text-4xl md:text-6xl tracking-wider whitespace-nowrap">
                            +{points} XP!
                        </span>

                        {/* Main Text */}
                        <span className="relative font-black text-4xl md:text-6xl tracking-wider bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent drop-shadow-lg select-none whitespace-nowrap">
                            +{points} XP!
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
