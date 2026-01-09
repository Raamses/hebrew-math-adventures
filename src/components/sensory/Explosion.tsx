import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface ExplosionProps {
    x: number;
    y: number;
    color?: string;
    onComplete: () => void;
}

export const Explosion: React.FC<ExplosionProps> = ({ x, y, color = '#FFD700', onComplete }) => {
    // We only need to generate the random trajectories once
    const [particles] = useState(() => {
        return Array.from({ length: 12 }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / 12;
            const distance = 60 + Math.random() * 40; // Travel distance
            return {
                id: i,
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                scale: 0.5 + Math.random() * 0.5
            };
        });
    });

    return (
        <div
            className="fixed pointer-events-none z-50"
            style={{ left: x, top: y }}
        >
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        width: 12,
                        height: 12,
                        backgroundColor: color,
                        boxShadow: `0 0 6px ${color}`,
                        borderRadius: '50%'
                    }}
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{
                        x: p.x,
                        y: p.y,
                        scale: 0,
                        opacity: 0
                    }}
                    transition={{
                        duration: 0.6,
                        ease: "easeOut"
                    }}
                    onAnimationComplete={() => {
                        // When the last particle finishes, trigger complete
                        if (p.id === particles.length - 1) {
                            onComplete();
                        }
                    }}
                />
            ))}
        </div>
    );
};
