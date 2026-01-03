import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface FrenzyOverlayProps {
    isActive: boolean;
}

const PARTICLE_COUNT = 5;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => i);

export const FrenzyOverlay: React.FC<FrenzyOverlayProps> = ({ isActive }) => {
    const { t } = useTranslation();

    return (
        <AnimatePresence>
            {isActive && (
                <div
                    className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
                    role="status"
                    aria-live="polite"
                    aria-label="Frenzy Mode Activated"
                >
                    {/* Pulsing Border */}
                    <motion.div
                        className="absolute inset-0 border-[8px] border-orange-500/50 shadow-[inset_0_0_50px_rgba(255,100,0,0.5)]"
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: [0.5, 1, 0.5],
                            scale: [1, 1.02, 1],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* FRENZY Text */}
                    <motion.div
                        className="absolute top-20 left-1/2 -translate-x-1/2"
                        initial={{ scale: 0, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                        <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-600 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-widest italic animate-pulse">
                            {t('game.frenzy')}
                        </h2>
                    </motion.div>

                    {/* Ember Particles (Lightweight) */}
                    {PARTICLES.map((i) => (
                        <motion.div
                            key={i}
                            className="absolute bottom-0 w-2 h-2 bg-orange-400 rounded-full"
                            style={{
                                left: `${20 + i * 15}%`,
                            }}
                            initial={{ y: 0, opacity: 1 }}
                            animate={{
                                y: -500,
                                opacity: 0,
                                x: Math.random() * 50 - 25
                            }}
                            transition={{
                                duration: 1 + Math.random(),
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeOut"
                            }}
                        />
                    ))}
                </div>
            )}
        </AnimatePresence>
    );
};
