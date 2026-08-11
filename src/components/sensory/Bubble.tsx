import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UI_CONFIG } from '../../lib/worldConfig';

// --- Constants & Config ---

type BubbleVariant = 'small' | 'medium' | 'large';

const BUBBLE_SIZES: Record<BubbleVariant, { size: string; hitArea: string; fontSize: string }> = {
    small: { size: 'clamp(40px, 10vw, 52px)', hitArea: 'clamp(60px, 14vw, 76px)', fontSize: 'text-lg sm:text-xl' },
    medium: { size: 'clamp(52px, 13vw, 68px)', hitArea: 'clamp(76px, 20vw, 100px)', fontSize: 'text-2xl sm:text-3xl' },
    large: { size: 'clamp(68px, 18vw, 92px)', hitArea: 'clamp(96px, 26vw, 128px)', fontSize: 'text-3xl sm:text-4xl' }
};

const BUBBLE_THEMES: Record<BubbleVariant, React.CSSProperties> = {
    small: {
        background: 'linear-gradient(135deg, rgba(255, 99, 71, 0.6) 0%, rgba(255, 69, 0, 0.8) 100%)',
    },
    large: {
        background: 'linear-gradient(135deg, rgba(72, 209, 204, 0.6) 0%, rgba(32, 178, 170, 0.8) 100%)',
    },
    medium: { // Default
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(240, 248, 255, 0.8) 100%)',
    }
};

const COMMON_STYLE: React.CSSProperties = {
    border: '2px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15), inset 0 0 15px rgba(255,255,255,0.4)',
    background: 'rgba(255, 255, 255, 0.35)',
    borderRadius: '50%'
};

// --- Power-Up Visual Style ---

const POWER_UP_STYLE: React.CSSProperties = {
    border: '3px solid rgba(255, 215, 0, 0.8)',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 180, 0, 0.3), inset 0 0 20px rgba(255, 255, 200, 0.5)',
    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.7) 0%, rgba(255, 165, 0, 0.85) 50%, rgba(255, 140, 0, 0.9) 100%)',
    borderRadius: '50%',
};

// --- Boss Bubble Style ---

const BOSS_STYLE: React.CSSProperties = {
    border: '4px solid rgba(147, 51, 234, 0.9)',
    boxShadow: '0 0 25px rgba(147, 51, 234, 0.7), 0 0 50px rgba(220, 38, 38, 0.4), inset 0 0 25px rgba(255, 255, 255, 0.3)',
    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.8) 0%, rgba(220, 38, 38, 0.85) 50%, rgba(190, 24, 93, 0.9) 100%)',
    borderRadius: '50%',
};


interface BubbleProps {
    id: string;
    value: number | string;
    onClick: (id: string, value: number | string, x: number, y: number) => void;
    onOffScreen: (id: string) => void;
    x: number;
    delay: number;
    isPopped?: boolean;
    variant?: BubbleVariant;
    speedMultiplier?: number;
    isPowerUp?: boolean;
    isBoss?: boolean;
    bossHealth?: number;
    bossMaxHealth?: number;
}

// Memoized Bubble for stability and performance
export const Bubble: React.FC<BubbleProps> = React.memo(({ id, value, onClick, onOffScreen, x, delay, isPopped, variant = 'medium', speedMultiplier = 1.0, isPowerUp = false, isBoss = false, bossHealth, bossMaxHealth }) => {
    const bubbleRef = useRef<HTMLButtonElement>(null);

    // Stable random duration based on variant
    const randomDuration = useMemo(() => {
        const base = (variant === 'small' ? 8 : variant === 'large' ? 16 : 12) / (speedMultiplier || 1);
        const range = variant === 'small' ? 6 : variant === 'large' ? 8 : 8;
        return base + Math.random() * range;
    }, [variant, speedMultiplier]);

    // Off-Screen Detection
    // We keep the IntersectionObserver because Framer Motion's onViewportLeave is for *layout* elements, 
    // and we want precise logic for game cleanup.
    useEffect(() => {
        if (isPopped) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    const rect = entry.boundingClientRect;
                    if (rect.top < 0) {
                        onOffScreen(id);
                    }
                }
            },
            { threshold: 0 }
        );

        if (bubbleRef.current) {
            observer.observe(bubbleRef.current);
        }

        return () => observer.disconnect();
    }, [id, onOffScreen, isPopped]);

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        if (!isPopped) {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onClick(id, value, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
    };

    const config = BUBBLE_SIZES[variant];
    const themeStyle = BUBBLE_THEMES[variant];

    // Boss bubbles get larger size and special style
    const bossScale = isBoss ? UI_CONFIG.BOSS_SIZE_MULTIPLIER : 1;

    // Power-up bubbles get a special golden style and sparkle animation
    const bubbleStyle = isPowerUp ? POWER_UP_STYLE : isBoss ? BOSS_STYLE : { ...COMMON_STYLE, ...themeStyle };

    return (
        <div
            className="absolute flex items-center justify-center select-none"
            style={{
                left: `${x}vw`,
                top: 0,
                width: isBoss ? `calc(${config.hitArea} * ${bossScale})` : config.hitArea,
                height: isBoss ? `calc(${config.hitArea} * ${bossScale})` : config.hitArea,
                zIndex: isPopped ? 0 : isBoss ? 100 : 50,
                pointerEvents: isPopped ? 'none' : 'auto'
            }}
        >
            {/* The Visual Bubble - Animates independently */}
            <motion.button
                ref={bubbleRef}
                data-testid={`bubble-${value}`}
                onClick={handleClick}
                aria-label={isPowerUp ? `Pop power-up bubble: ${value}` : isBoss ? `Pop boss bubble with value ${value}` : `Pop bubble with value ${value}`}
                initial={{ y: "110vh", opacity: 0, scale: 0.5 }}
                animate={
                    isPopped
                        ? { scale: 2, opacity: 0 }
                        : { y: "-20vh", opacity: 1, scale: isBoss ? bossScale : 1 }
                }
                transition={
                    isPopped
                        ? { duration: 0.3, ease: "easeOut" }
                        : {
                            y: { duration: randomDuration, ease: "linear", delay: delay },
                            opacity: { duration: 0.5, delay: delay },
                            scale: { duration: 0.5, delay: delay }
                        }
                }
                className={`flex items-center justify-center cursor-pointer hover:brightness-110 hover:shadow-lg transition-colors outline-none focus-visible:ring-4 focus-visible:ring-white/50 ${isPowerUp ? 'animate-pulse' : ''} ${isBoss ? 'cursor-crosshair' : ''}`}
                style={{
                    ...bubbleStyle,
                    width: isBoss ? `calc(${config.size} * ${bossScale})` : config.size,
                    height: isBoss ? `calc(${config.size} * ${bossScale})` : config.size,
                }}
                whileHover={{ scale: (isBoss ? bossScale : 1) * 1.05 }}
                whileTap={{ scale: (isBoss ? bossScale : 1) * 0.95 }}
            >
                {isBoss && (
                    <>
                        {/* Pulsing aura ring */}
                        <motion.div
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                inset: '-8px',
                                border: '3px solid rgba(220, 38, 38, 0.5)',
                                borderRadius: '50%',
                            }}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.4, 0.8, 0.4],
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                        {/* Outer glow ring */}
                        <motion.div
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                inset: '-16px',
                                border: '2px solid rgba(147, 51, 234, 0.3)',
                                borderRadius: '50%',
                            }}
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.2, 0.5, 0.2],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    </>
                )}
                {isPowerUp && (
                    <>
                        {/* Sparkle ring effect for power-ups */}
                        <motion.div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                                border: '2px dashed rgba(255, 255, 255, 0.6)',
                            }}
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                        />
                        {/* Golden glow ring */}
                        <motion.div
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                inset: '-4px',
                                border: '2px solid rgba(255, 215, 0, 0.4)',
                                borderRadius: '50%',
                            }}
                            animate={{
                                scale: [1, 1.15, 1],
                                opacity: [0.4, 0.8, 0.4],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    </>
                )}
                <span className={`font-bold drop-shadow-sm font-fredoka ${config.fontSize} ${isPowerUp ? 'text-white' : isBoss ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-800'}`} style={isBoss ? { fontSize: 'clamp(1.5rem, 8vw, 2.5rem)' } : undefined}>
                    {value}
                </span>
                {isBoss && bossHealth !== undefined && bossMaxHealth !== undefined && !isPopped && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                        {Array.from({ length: bossMaxHealth }).map((_, i) => (
                            <div
                                key={i}
                                className="w-4 h-4 rounded-full border-2 border-white/80 transition-all duration-300"
                                style={{
                                    background: i < bossHealth
                                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                        : 'rgba(255,255,255,0.2)',
                                    boxShadow: i < bossHealth
                                        ? '0 0 8px rgba(239,68,68,0.8)'
                                        : 'none',
                                }}
                            />
                        ))}
                    </div>
                )}
            </motion.button>
        </div>
    );
}, (prev, next) => {
    return prev.isPopped === next.isPopped && prev.id === next.id && prev.value === next.value && prev.bossHealth === next.bossHealth;
});