import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';
import { Mascot, type MascotEmotion } from '../mascot/Mascot';
import { FlyingStars } from '../Effects';
import { Confetti } from '../Confetti';
import { FrenzyOverlay } from '../games/FrenzyOverlay';

interface PracticeFeedbackProps {
    mascotEmotion: MascotEmotion;
    mascotMessage: string;
    showBubble: boolean;
    showStars: boolean;
    showConfetti: boolean;
    onStarsComplete: () => void;
}

/**
 * Peeking Mascot Design
 * ----------------------
 * The mascot peeks from the right edge of the screen — only partially visible,
 * like it's watching from behind the screen. When it has a message (showBubble=true),
 * it slides in fully, shows the speech bubble, then retreats back to peeking position.
 *
 * Key properties:
 * - Fixed position (bottom-right corner) — doesn't affect layout flow
 * - Small size (sm variant ~64-80px) — doesn't block content
 * - Peeking state: translateX(~55%) — only left ~45% of the mascot is visible
 * - Active state: translateX(0) — fully visible with speech bubble
 * - pointer-events-none — never blocks taps
 * - z-40 — stays above FrenzyOverlay (z-30)
 */
export const PracticeFeedback: React.FC<PracticeFeedbackProps> = ({
    mascotEmotion,
    mascotMessage,
    showBubble,
    showStars,
    showConfetti,
    onStarsComplete
}) => {
    const { profile } = useProfile();

    return (
        <>
            <FrenzyOverlay isActive={(profile?.streak || 0) >= 5} combo={profile?.streak || 0} variant="practice" />
            {showStars && <FlyingStars onComplete={onStarsComplete} />}
            {showConfetti && <Confetti />}

            {/* Peeking Mascot — fixed bottom-right, doesn't affect layout */}
            <div className="fixed bottom-2 right-0 z-40 pointer-events-none">
                <motion.div
                    initial={{ x: '55%' }}
                    animate={{ x: showBubble ? '0%' : '55%' }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    className="relative"
                >
                    {/* Speech bubble appears to the left of the mascot */}
                    <AnimatePresence>
                        {showBubble && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="absolute bottom-full right-2 mb-2 z-20 w-44 md:w-56"
                            >
                                <div className="bg-white rounded-2xl p-3 shadow-lg border-2 border-slate-100 relative">
                                    <p className="text-base md:text-lg font-bold text-slate-700 text-center leading-tight">
                                        {mascotMessage}
                                    </p>
                                    {/* Bubble tail pointing down-right toward mascot */}
                                    <div className="absolute -bottom-3 right-6 w-6 h-6 bg-white border-r-2 border-b-2 border-slate-100 transform rotate-45" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Mascot — small size, peeks from right edge */}
                    <Mascot
                        character={profile?.mascotId || 'owl'}
                        emotion={mascotEmotion}
                        size="sm"
                        className="opacity-90 drop-shadow-lg"
                    />
                </motion.div>
            </div>
        </>
    );
};