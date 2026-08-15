import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VISIBLE_MS = 1600;

interface CheckpointBannerProps {
    message: string | null;
    onComplete: () => void;
}

export const CheckpointBanner: React.FC<CheckpointBannerProps> = ({ message, onComplete }) => {
    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    useEffect(() => {
        if (!message) return;
        const t = window.setTimeout(() => onCompleteRef.current(), VISIBLE_MS);
        return () => clearTimeout(t);
    }, [message]);

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
                    role="status"
                    aria-live="polite"
                    data-testid="checkpoint-banner"
                >
                    <div dir="auto" className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30 border-2 border-white/70">
                        <p className="text-lg md:text-xl font-black text-white whitespace-nowrap drop-shadow">
                            {message}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
