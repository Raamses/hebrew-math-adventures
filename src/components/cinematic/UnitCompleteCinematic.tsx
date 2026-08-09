import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CURRICULUM } from '../../data/learningPath';
import { useSoundManager } from '../../hooks/useSoundManager';

// --- Mascot emoji mapping ---
const MASCOT_EMOJI: Record<string, string> = {
    owl: '🦉',
    bear: '🐻',
    ant: '🐜',
    lion: '🦁',
};

// --- Boss emoji per unit (last CHALLENGE node) ---
const UNIT_BOSS_EMOJI: Record<string, string> = {
    unit_1: '🐙', // Octopus
    unit_2: '🐻', // Bear (forest)
    unit_3: '🦅', // Eagle (mountain)
    unit_4: '🦂', // Scorpion (desert)
    unit_5: '👽', // Alien King (space)
};

// --- Phase types ---
type CinematicPhase = 'charge' | 'shatter' | 'converge' | 'reveal';

interface UnitCompleteCinematicProps {
    /** The unit that was just completed, e.g. "unit_1" */
    unitId: string;
    /** The mascot character the kid chose */
    mascotCharacter: 'owl' | 'bear' | 'ant' | 'lion';
    /** Called when the cinematic finishes and the map should be revealed */
    onComplete: () => void;
}

// localStorage key to track which units have had their cinematic shown
const CINEMATIC_SEEN_KEY = 'cinematic_seen_units';

function getCinematicSeenUnits(): Set<string> {
    try {
        const stored = localStorage.getItem(CINEMATIC_SEEN_KEY);
        return new Set(stored ? JSON.parse(stored) : []);
    } catch {
        return new Set();
    }
}

function markCinematicSeen(unitId: string) {
    try {
        const seen = getCinematicSeenUnits();
        seen.add(unitId);
        localStorage.setItem(CINEMATIC_SEEN_KEY, JSON.stringify([...seen]));
    } catch {
        // ignore
    }
}

/**
 * Check if a unit's cinematic has already been shown.
 * Useful for the parent component to decide whether to trigger.
 */
export function hasCinematicBeenShown(unitId: string): boolean {
    return getCinematicSeenUnits().has(unitId);
}

// --- Star particle generation ---
interface StarParticle {
    id: number;
    x: number;
    y: number;
    rotate: number;
    scale: number;
    delay: number;
}

function generateStarParticles(count: number): StarParticle[] {
    const particles: StarParticle[] = [];
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const distance = 120 + Math.random() * 80;
        particles.push({
            id: i,
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            rotate: Math.random() * 360,
            scale: 0.8 + Math.random() * 0.8,
            delay: Math.random() * 0.15,
        });
    }
    return particles;
}

export const UnitCompleteCinematic: React.FC<UnitCompleteCinematicProps> = ({
    unitId,
    mascotCharacter,
    onComplete,
}) => {
    const { t } = useTranslation();
    const { playSound } = useSoundManager();
    const [phase, setPhase] = useState<CinematicPhase>('charge');
    const stars = useMemo(() => generateStarParticles(10), []);

    const mascotEmoji = MASCOT_EMOJI[mascotCharacter] || '🦉';
    const bossEmoji = UNIT_BOSS_EMOJI[unitId] || '👹';

    // Find next unit for preview
    const currentUnit = CURRICULUM.find((u) => u.id === unitId);
    const nextUnit = CURRICULUM.find((u) => u.order === (currentUnit?.order ?? 0) + 1);
    const nextUnitTitle = nextUnit ? t(`saga.${nextUnit.id}_title`) : '';

    // Phase timing
    useEffect(() => {
        playSound('milestone');

        // Phase 1: Charge (1s)
        const t1 = setTimeout(() => setPhase('shatter'), 1000);

        // Phase 2: Shatter (1.5s) — play a "shatter" sound
        const t2 = setTimeout(() => {
            setPhase('converge');
            playSound('streak');
        }, 2500);

        // Phase 3: Converge (1.5s)
        const t3 = setTimeout(() => setPhase('reveal'), 4000);

        // Phase 4: Reveal (1s) then onComplete
        const t4 = setTimeout(() => {
            markCinematicSeen(unitId);
            onComplete();
        }, 5000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, [unitId, onComplete, playSound]);

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900"
            initial={{ y: 0 }}
            animate={phase === 'reveal' ? { y: '100%' } : { y: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            dir="ltr" // Force LTR for the cinematic animation
        >
            {/* Phase 1 & 2: Mascot charges, Boss appears then shatters */}
            <AnimatePresence>
                {phase !== 'reveal' && (
                    <>
                        {/* Mascot emoji — zooms in from left */}
                        <motion.div
                            className="absolute text-7xl sm:text-8xl"
                            initial={{ x: -300, scale: 0.5, opacity: 0 }}
                            animate={{
                                x: phase === 'charge' ? -60 : 20,
                                scale: phase === 'charge' ? 1.2 : 1.5,
                                opacity: 1,
                            }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        >
                            {mascotEmoji}
                        </motion.div>

                        {/* Boss emoji — comes from right, then shatters */}
                        {phase !== 'converge' && (
                            <motion.div
                                className="absolute text-7xl sm:text-8xl"
                                initial={{ x: 300, scale: 0.5, opacity: 0 }}
                                animate={{
                                    x: phase === 'charge' ? 60 : 0,
                                    scale: phase === 'charge' ? 1.2 : 0,
                                    opacity: phase === 'charge' ? 1 : 0,
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                            >
                                {bossEmoji}
                            </motion.div>
                        )}

                        {/* Shatter stars — only in shatter & converge phases */}
                        {(phase === 'shatter' || phase === 'converge') &&
                            stars.map((star) => (
                                <motion.div
                                    key={star.id}
                                    className="absolute text-3xl"
                                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                    animate={
                                        phase === 'shatter'
                                            ? {
                                                  x: star.x,
                                                  y: star.y,
                                                  scale: star.scale,
                                                  opacity: 1,
                                                  rotate: star.rotate,
                                              }
                                            : {
                                                  x: 0,
                                                  y: 0,
                                                  scale: 2.5,
                                                  opacity: 0,
                                                  rotate: star.rotate * 2,
                                              }
                                    }
                                    transition={{
                                        duration: phase === 'shatter' ? 0.8 : 1.0,
                                        delay: star.delay,
                                        ease: 'easeOut',
                                    }}
                                >
                                    ⭐
                                </motion.div>
                            ))}
                    </>
                )}
            </AnimatePresence>

            {/* Phase 3: "Unit Complete!" text + next unit preview */}
            <AnimatePresence>
                {phase === 'converge' && (
                    <motion.div
                        className="absolute flex flex-col items-center gap-4 px-6"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <motion.h2
                            className="text-3xl sm:text-5xl font-bold text-yellow-300 text-center drop-shadow-lg"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                        >
                            {t('cinematic.unitComplete', 'Unit Complete!')}
                        </motion.h2>

                        {nextUnit && (
                            <motion.div
                                className="flex flex-col items-center gap-2"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.9, duration: 0.5 }}
                            >
                                <span className="text-lg sm:text-xl text-purple-200">
                                    {t('cinematic.nextUnit', 'Next:')} 
                                </span>
                                <span className="text-2xl sm:text-3xl font-bold text-white">
                                    {nextUnitTitle}
                                </span>
                                <motion.div
                                    className="text-4xl mt-2"
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    {nextUnit.theme === 'beach' ? '🏖️' :
                                     nextUnit.theme === 'forest' ? '🌲' :
                                     nextUnit.theme === 'mountain' ? '⛰️' :
                                     nextUnit.theme === 'space' ? '🚀' : '✨'}
                                </motion.div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Skip button (small, for impatient kids) */}
            <motion.button
                className="absolute bottom-4 right-4 text-sm text-white/50 hover:text-white/80 px-4 py-2 min-h-[48px] min-w-[48px]"
                onClick={() => {
                    markCinematicSeen(unitId);
                    onComplete();
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
            >
                {t('cinematic.skip', 'Skip')}
            </motion.button>
        </motion.div>
    );
};