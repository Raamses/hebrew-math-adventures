import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const PARTICLE_COUNT = 50;
const COLORS = ['#FFC700', '#FF0000', '#2E3192', '#41BBC7', '#73C92D'];

interface Particle {
    id: number;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    duration: number;
    delay: number;
    color: string;
}

export const Confetti = () => {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        // Generate particles only on the client to avoid hydration mismatch
        const newParticles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
            id: i,
            x: (Math.random() - 0.5) * window.innerWidth * 1.5,
            y: (Math.random() - 0.5) * window.innerHeight * 1.5,
            rotation: Math.random() * 360 * 4,
            scale: Math.random() * 0.5 + 0.5,
            duration: Math.random() * 1 + 1,
            delay: Math.random() * 0.2,
            color: COLORS[i % COLORS.length],
        }));
        setParticles(newParticles);
    }, []);

    // Don't render anything until we have particles (client-side only)
    if (particles.length === 0) return null;

    const content = (
        <div
            className={cn(
                "fixed inset-0 pointer-events-none z-[9999]",
                "flex items-center justify-center overflow-visible"
            )}
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

    // Fallback to body if overlay-root is missing (though it should be there)
    const container = document.getElementById('overlay-root') || document.body;
    return createPortal(content, container);
};
