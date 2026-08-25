import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundManager } from '../../hooks/useSoundManager';
import { useTranslation } from 'react-i18next';

type FrenzyVariant = 'bubble' | 'practice' | 'invaders';

interface FrenzyOverlayProps {
    isActive: boolean;
    combo: number;
    variant?: FrenzyVariant;
}

const PARTICLE_COUNT = 5;

// Combo milestone tiers
type FrenzyTier = 'frenzy' | 'super' | 'mega';

const getFrenzyTier = (combo: number): FrenzyTier | null => {
    if (combo >= 15) return 'mega';
    if (combo >= 10) return 'super';
    if (combo >= 5) return 'frenzy';
    return null;
};

const TIER_CONFIG: Record<FrenzyTier, {
    labelKey: string;
    colors: string;
    border: string;
    glow: string;
    textGradient: string;
    multiplier: number;
}> = {
    frenzy: {
        labelKey: 'game.frenzy',
        colors: 'border-orange-500/50',
        border: 'border-orange-500/50',
        glow: 'shadow-[inset_0_0_50px_rgba(255,100,0,0.5)]',
        textGradient: 'from-yellow-300 to-red-600',
        multiplier: 2,
    },
    super: {
        labelKey: 'game.superFrenzy',
        colors: 'border-purple-500/60',
        border: 'border-purple-500/60',
        glow: 'shadow-[inset_0_0_60px_rgba(168,85,247,0.6)]',
        textGradient: 'from-yellow-300 via-pink-400 to-purple-600',
        multiplier: 3,
    },
    mega: {
        labelKey: 'game.megaFrenzy',
        colors: 'border-rose-500/70',
        border: 'border-rose-500/70',
        glow: 'shadow-[inset_0_0_80px_rgba(244,63,94,0.7)]',
        textGradient: 'from-yellow-300 via-orange-400 to-rose-600',
        multiplier: 5,
    },
};

// Mode-aware positioning: where the burst flash and persistent badge appear
const VARIANT_LAYOUT: Record<FrenzyVariant, {
    burstPosition: string;
    badgePosition: string;
}> = {
    bubble: {
        burstPosition: 'top-[140px] left-1/2 -translate-x-1/2',
        badgePosition: 'top-[130px] right-3',
    },
    practice: {
        burstPosition: 'top-[100px] left-1/2 -translate-x-1/2',
        badgePosition: 'top-2 right-3',
    },
    invaders: {
        burstPosition: 'top-[90px] left-1/2 -translate-x-1/2',
        badgePosition: 'top-2 right-3',
    },
};

// Tier emoji for the persistent badge
const TIER_EMOJI: Record<FrenzyTier, string> = {
    frenzy: '✨',
    super: '⚡',
    mega: '🔥',
};

// ⚡ Bolt: Wrapped in React.memo to prevent unnecessary component reconciliations in high-frequency game loops
// where parent states update frequently up to 60fps, but the overlay state only changes occasionally.
export const FrenzyOverlay = React.memo(function FrenzyOverlay({
    isActive,
    combo,
    variant = 'bubble',
}: FrenzyOverlayProps) {
    const { play } = useSoundManager();
    const { t } = useTranslation();

    const tier = getFrenzyTier(combo);
    const config = tier ? TIER_CONFIG[tier] : null;
    const layout = VARIANT_LAYOUT[variant];

    // Burst state: transient announcement that shows on activation / tier upgrade
    const [showBurst, setShowBurst] = useState(false);
    const prevTierRef = useRef<FrenzyTier | null>(null);

    useEffect(() => {
        if (isActive && tier) {
            play('frenzy');
        }
    }, [isActive, tier, play]);

    // Burst logic: show on activation or tier upgrade, auto-hide after 1.8s
    useEffect(() => {
        if (isActive && tier && tier !== prevTierRef.current) {
            setShowBurst(true);
            const timer = setTimeout(() => setShowBurst(false), 1800);
            prevTierRef.current = tier;
            return () => clearTimeout(timer);
        }
        if (!isActive) {
            prevTierRef.current = null;
        }
    }, [isActive, tier]);

    return (
        <AnimatePresence>
            {isActive && config && (
                <div
                    className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
                    role="status"
                    aria-live="polite"
                    aria-label={t('game.frenzyActivated', { label: t(config.labelKey) })}
                >
                    {/* Pulsing Border */}
                    <motion.div
                        className={`absolute inset-0 border-[8px] ${config.border} ${config.glow}`}
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: [0.5, 1, 0.5],
                            scale: [1, 1.02, 1],
                            transition: {
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }
                        }}
                        exit={{
                            opacity: 0,
                            transition: { duration: 0.2 }
                        }}
                    />

                    {/* BURST: Transient announcement text (shows for ~1.8s on activation / tier upgrade) */}
                    <AnimatePresence>
                        {showBurst && (
                            <motion.div
                                className={`absolute ${layout.burstPosition}`}
                                initial={{ scale: 0, opacity: 0, rotate: -10 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 1.5, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            >
                                <div className="flex flex-col items-center bg-black/40 rounded-2xl px-6 py-3">
                                    <h2 className={`text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b ${config.textGradient} drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-widest italic`}>
                                        {t(config.labelKey)}
                                    </h2>
                                    {tier !== 'frenzy' && (
                                        <motion.p
                                            className="text-center text-xl sm:text-2xl font-bold text-white drop-shadow-lg mt-1"
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            {t('game.scoreMultiplier', { multiplier: config.multiplier })}
                                        </motion.p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* BADGE: Persistent small pill that stays for the entire frenzy duration */}
                    <motion.div
                        className={`absolute ${layout.badgePosition}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [1, 1.08, 1],
                            opacity: [0.85, 1, 0.85],
                        }}
                        transition={{
                            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                            opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                        }}
                    >
                        <div className={`flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 border-2 ${config.border}`}>
                            <span className="text-sm">
                                {TIER_EMOJI[tier!]}
                            </span>
                            <span className={`text-xs font-black text-transparent bg-clip-text bg-gradient-to-b ${config.textGradient}`}>
                                {config.multiplier}x
                            </span>
                        </div>
                    </motion.div>

                    {/* Ember Particles (Lightweight) — more particles for higher tiers */}
                    {Array.from({ length: PARTICLE_COUNT * (tier === 'mega' ? 3 : tier === 'super' ? 2 : 1) }, (_, i) => (
                        <motion.div
                            key={i}
                            className={`absolute bottom-0 w-2 h-2 rounded-full ${
                                tier === 'mega' ? 'bg-rose-400' :
                                tier === 'super' ? 'bg-purple-400' :
                                'bg-orange-400'
                            }`}
                            style={{
                                left: `${10 + (i * 7) % 80}%`,
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
                                delay: (i * 0.1) % 1.5,
                                ease: "easeOut"
                            }}
                        />
                    ))}

                    {/* Mega Frenzy screen shake effect */}
                    {tier === 'mega' && (
                        <motion.div
                            className="absolute inset-0 bg-rose-500/5"
                            animate={{
                                opacity: [0, 0.1, 0],
                                scale: [1, 1.01, 1],
                                transition: { duration: 0.5, repeat: Infinity }
                            }}
                        />
                    )}
                </div>
            )}
        </AnimatePresence>
    );
});