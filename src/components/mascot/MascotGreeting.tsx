import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Mascot, type MascotEmotion } from './Mascot';
import { getMascotGreeting, type MascotLine } from '../../data/mascotDialogue';
import { UI_CONFIG } from '../../lib/worldConfig';

interface MascotGreetingProps {
    mascotId: string; // 'owl' | 'bear' | 'ant' | 'lion'
    streak: number;
    onDismiss: () => void;
}


// Map dialogue emotions to MascotEmotion (MascotEmotion includes 'idle' | 'happy' | 'sad' | 'thinking' | 'excited' | 'encourage')
const EMOTION_MAP: Record<string, MascotEmotion> = {
    happy: 'happy',
    excited: 'excited',
    thinking: 'thinking',
    encourage: 'encourage',
};

export const MascotGreeting: React.FC<MascotGreetingProps> = ({ mascotId, streak, onDismiss }) => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(true);
    const [greeting, setGreeting] = useState<MascotLine | null>(null);

    useEffect(() => {
        const line = getMascotGreeting(mascotId, streak);
        setGreeting(line);

        const timer = setTimeout(() => {
            handleDismiss();
        }, UI_CONFIG.GREETING_DURATION_MS);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mascotId, streak]);

    const handleDismiss = useCallback(() => {
        setIsVisible(false);
        // Wait for exit animation
        setTimeout(onDismiss, 300);
    }, [onDismiss]);

    if (!greeting) return null;

    const emotion = EMOTION_MAP[greeting.emotion] || 'happy';
    const greetingText = t(greeting.textKey, '');

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-auto"
                    onClick={handleDismiss}
                    style={{ touchAction: 'manipulation' }}
                >
                    {/* Speech bubble */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
                        className="bg-white rounded-3xl px-6 py-4 shadow-2xl border-2 border-indigo-100 max-w-xs sm:max-w-sm mb-2 relative"
                    >
                        <p className="text-lg font-bold text-slate-700 text-center leading-snug">
                            {greetingText}
                        </p>
                        {/* Tail pointing down to mascot */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-r-2 border-b-2 border-indigo-100 transform rotate-45" />
                    </motion.div>

                    {/* Mascot */}
                    <motion.div
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="w-32 h-32 md:w-40 md:h-40 mb-4"
                    >
                        <Mascot character={mascotId as 'owl' | 'bear' | 'ant' | 'lion'} emotion={emotion} className="w-full h-full" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};