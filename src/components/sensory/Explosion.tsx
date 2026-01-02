import React, { useEffect, useState } from 'react';

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
}

interface ExplosionProps {
    x: number;
    y: number;
    color?: string;
    onComplete: () => void;
}

export const Explosion: React.FC<ExplosionProps> = ({ x, y, color = '#FFD700', onComplete }) => {
    const [particles, setParticles] = useState<Particle[]>(() => {
        const count = 20; // Increased count
        const newParticles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 3 + Math.random() * 4; // Faster
            newParticles.push({
                id: i,
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                life: 1.0
            });
        }
        return newParticles;
    });

    useEffect(() => {
        let animationFrame: number;

        const update = () => {
            setParticles(prev => {
                let activeCount = 0;
                const next = prev.map(p => {
                    if (p.life <= 0) return p;
                    activeCount++;
                    return {
                        ...p,
                        x: p.x + p.vx,
                        y: p.y + p.vy + 0.1, // Gravity
                        life: p.life - 0.05
                    };
                });

                if (activeCount === 0) {
                    onComplete();
                    return prev;
                }

                animationFrame = requestAnimationFrame(update);
                return next;
            });
        };

        animationFrame = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationFrame);
    }, [onComplete]);

    if (particles.length === 0 || particles[0].life <= 0) return null;

    return (
        <div
            className="fixed pointer-events-none z-50"
            style={{ left: x, top: y }}
        >
            {particles.map(p => (
                p.life > 0 && (
                    <div
                        key={p.id}
                        className="absolute rounded-full"
                        style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: p.color,
                            boxShadow: `0 0 6px ${p.color}`,
                            transform: `translate(${p.x}px, ${p.y}px) scale(${p.life})`,
                            opacity: p.life,
                            borderRadius: '50%'
                        }}
                    />
                )
            ))}
        </div>
    );
};
