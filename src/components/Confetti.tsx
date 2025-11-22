import React from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';

export const Confetti: React.FC = () => {
    // Generate particles once on mount
    const particles = React.useMemo(() => {
        return Array.from({ length: 50 }).map((_, i) => ({
            id: i,
            x: (Math.random() - 0.5) * window.innerWidth * 1.5, // Spread wider
            y: (Math.random() - 0.5) * window.innerHeight * 1.5,
            initialX: 0, // Center relative to the container (which we'll center)
            initialY: 0,
            color: ['#FFC700', '#FF0000', '#2E3192', '#41BBC7', '#73C92D'][i % 5],
            rotation: Math.random() * 360 * 4,
            scale: Math.random() * 0.5 + 0.5,
            duration: Math.random() * 1 + 1,
            delay: Math.random() * 0.2
        }));
    }, []);

    const content = (
        <div
            className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center overflow-visible"
        >
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{
                        opacity: 1,
                        x: 0,
                        y: 0,
                        scale: 0,
                    }}
                    animate={{
                        opacity: 0,
                        x: p.x,
                        y: p.y,
                        rotate: p.rotation,
                        scale: p.scale,
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: "easeOut",
                    }}
                    className="absolute w-4 h-4 rounded-sm"
                    style={{
                        backgroundColor: p.color,
                    }}
                />
            ))}
        </div>
    );

    return ReactDOM.createPortal(content, document.body);
};
