// Standard HTML implementation to bypass framer-motion issues
import React from 'react';

interface BubbleProps {
    id: string;
    value: number;
    onClick: (id: string, value: number, x: number, y: number) => void;
    x: number;
    delay: number;
    isPopped?: boolean;
    variant?: 'small' | 'medium' | 'large';
}


// Memoized Bubble for stability and performance
export const Bubble: React.FC<BubbleProps> = React.memo(({ id, value, onClick, x, delay, isPopped, variant = 'medium' }) => {
    // Determine size and base duration based on variant
    // Small = Faster (8-14s), Large = Slower (16-24s), Medium = Normal (12-20s)
    const sizeMap = { small: '60px', medium: '80px', large: '110px' };
    const hitAreaMap = { small: '90px', medium: '120px', large: '150px' };

    // Stable random duration based on variant
    const randomDuration = React.useMemo(() => {
        const base = variant === 'small' ? 8 : variant === 'large' ? 16 : 12;
        const range = variant === 'small' ? 6 : variant === 'large' ? 8 : 8;
        return base + Math.random() * range;
    }, [variant]);

    return (
        <div
            className="absolute group flex items-center justify-center select-none"
            style={{
                left: `${x}vw`,
                top: 0, // Position controlled by animation transform
                width: hitAreaMap[variant], // Larger hit area
                height: hitAreaMap[variant],
                zIndex: isPopped ? 0 : 50
            }}
        >
            {/* The Visual Bubble - Animates independently */}
            <div
                onClick={(e) => {
                    if (!isPopped) {
                        e.stopPropagation(); // prevent background clicks
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        onClick(id, value, rect.left + rect.width / 2, rect.top + rect.height / 2);
                    }
                }}
                className={`flex items-center justify-center cursor-pointer transition-all duration-300
                    ${isPopped ? 'animate-pop' : 'animate-float animate-float-paused group-hover:brightness-110 group-hover:shadow-lg'}
                `}
                style={{
                    animationDelay: `${delay}s`,
                    animationDuration: `${randomDuration}s`,
                    width: sizeMap[variant], // Visual size
                    height: sizeMap[variant],
                    borderRadius: '50%',
                    background: variant === 'small'
                        ? 'linear-gradient(135deg, rgba(255, 99, 71, 0.6) 0%, rgba(255, 69, 0, 0.8) 100%)' // Red/Orange (Fast/Danger)
                        : variant === 'large'
                            ? 'linear-gradient(135deg, rgba(72, 209, 204, 0.6) 0%, rgba(32, 178, 170, 0.8) 100%)' // Teal/Green (Slow/Safe)
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(240, 248, 255, 0.8) 100%)', // Default White/Blueish
                    border: '2px solid rgba(255, 255, 255, 0.6)', // Softer border
                    boxShadow: '0 4px 15px rgba(0,0,0,0.15), inset 0 0 15px rgba(255,255,255,0.4)', // Enhanced depth
                    backdropFilter: 'blur(6px)',
                    animationFillMode: 'both', // Ensure initial state matches 0% keyframe (hidden at bottom)
                }}
            >
                <span className={`font-bold text-slate-800 drop-shadow-sm font-fredoka
                    ${variant === 'small' ? 'text-2xl' : variant === 'large' ? 'text-5xl' : 'text-4xl'}
                `}>
                    {value}
                </span>
            </div>
        </div>
    );
}, (prev, next) => {
    // Custom comparison for performance
    return prev.isPopped === next.isPopped && prev.id === next.id && prev.value === next.value;
});
