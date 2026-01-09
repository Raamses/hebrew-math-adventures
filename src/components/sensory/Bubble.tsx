import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

// --- Constants & Config ---

type BubbleVariant = 'small' | 'medium' | 'large';

const BUBBLE_SIZES: Record<BubbleVariant, { size: string; hitArea: string; fontSize: string }> = {
    small: { size: '60px', hitArea: '90px', fontSize: 'text-2xl' },
    medium: { size: '80px', hitArea: '120px', fontSize: 'text-4xl' },
    large: { size: '110px', hitArea: '150px', fontSize: 'text-5xl' }
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
    backdropFilter: 'blur(6px)',
    borderRadius: '50%'
};

interface BubbleProps {
    id: string;
    value: number;
    onClick: (id: string, value: number, x: number, y: number) => void;
    onOffScreen: (id: string) => void;
    x: number;
    delay: number;
    isPopped?: boolean;
    variant?: BubbleVariant;
}

// Memoized Bubble for stability and performance
export const Bubble: React.FC<BubbleProps> = React.memo(({ id, value, onClick, onOffScreen, x, delay, isPopped, variant = 'medium' }) => {
    const bubbleRef = useRef<HTMLButtonElement>(null);

    // Stable random duration based on variant
    const randomDuration = useMemo(() => {
        const base = variant === 'small' ? 8 : variant === 'large' ? 16 : 12;
        const range = variant === 'small' ? 6 : variant === 'large' ? 8 : 8;
        return base + Math.random() * range;
    }, [variant]);

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

    return (
        <div
            className="absolute flex items-center justify-center select-none"
            style={{
                left: `${x}vw`,
                top: 0,
                width: config.hitArea,
                height: config.hitArea,
                zIndex: isPopped ? 0 : 50,
                pointerEvents: isPopped ? 'none' : 'auto'
            }}
        >
            {/* The Visual Bubble - Animates independently */}
            <motion.button
                ref={bubbleRef}
                onClick={handleClick}
                aria-label={`Pop bubble with value ${value}`}
                initial={{ y: "110vh", opacity: 0, scale: 0.5 }}
                animate={
                    isPopped
                        ? { scale: 2, opacity: 0 }
                        : { y: "-20vh", opacity: 1, scale: 1 }
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
                className="flex items-center justify-center cursor-pointer hover:brightness-110 hover:shadow-lg transition-colors outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                style={{
                    ...COMMON_STYLE,
                    ...themeStyle,
                    width: config.size,
                    height: config.size,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <span className={`font-bold text-slate-800 drop-shadow-sm font-fredoka ${config.fontSize}`}>
                    {value}
                </span>
            </motion.button>
        </div>
    );
}, (prev, next) => {
    return prev.isPopped === next.isPopped && prev.id === next.id && prev.value === next.value;
});
