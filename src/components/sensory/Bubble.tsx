// Standard HTML implementation to bypass framer-motion issues
import React from 'react';

interface BubbleProps {
    id: string;
    value: number;
    onClick: (id: string, value: number) => void;
    x: number;
    delay: number;
    isPopped?: boolean;
}

// Memoized Bubble for stability and performance
export const Bubble: React.FC<BubbleProps> = React.memo(({ id, value, onClick, x, delay, isPopped }) => {
    // Note: 'delay' prop is used for animation-delay
    // Use a stable random duration if possible, but here it's fine as long as component doesn't re-mount
    const randomDuration = React.useMemo(() => 12 + Math.random() * 8, []); // 12-20s duration

    return (
        <div
            className="absolute group flex items-center justify-center select-none"
            style={{
                left: `${x}vw`,
                top: 0, // Position controlled by animation transform
                width: '120px', // Larger hit area
                height: '120px',
                zIndex: isPopped ? 0 : 50
            }}
        >
            {/* The Visual Bubble - Animates independently */}
            <div
                onClick={(e) => {
                    if (!isPopped) {
                        e.stopPropagation(); // prevent background clicks
                        onClick(id, value);
                    }
                }}
                className={`flex items-center justify-center cursor-pointer transition-all duration-300
                    ${isPopped ? 'animate-pop' : 'animate-float animate-float-paused group-hover:brightness-110 group-hover:shadow-lg'}
                `}
                style={{
                    animationDelay: `${delay}s`,
                    animationDuration: `${randomDuration}s`,
                    width: '80px', // Visual size
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.45)', // Slightly more visible
                    border: '2px solid rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(6px)',
                    animationFillMode: 'both', // Ensure initial state matches 0% keyframe (hidden at bottom)
                }}
            >
                <span className="text-4xl font-bold text-slate-800 drop-shadow-sm font-fredoka">
                    {value}
                </span>
            </div>
        </div>
    );
}, (prev, next) => {
    // Custom comparison for performance
    return prev.isPopped === next.isPopped && prev.id === next.id && prev.value === next.value;
});
