import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface FlyingStarsProps {
    onComplete: () => void;
}

export const FlyingStars: React.FC<FlyingStarsProps> = ({ onComplete }) => {
    const stars = Array.from({ length: 5 });

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {stars.map((_, i) => (
                <motion.div
                    key={i}
                    initial={{
                        opacity: 1,
                        x: window.innerWidth / 2,
                        y: window.innerHeight / 2,
                        scale: 0.5
                    }}
                    animate={{
                        opacity: 0,
                        x: window.innerWidth * 0.8, // Target: Top Right (Score area)
                        y: 50,
                        scale: 1.5,
                        rotate: 360
                    }}
                    transition={{
                        duration: 1,
                        delay: i * 0.1,
                        ease: "easeOut"
                    }}
                    onAnimationComplete={i === stars.length - 1 ? onComplete : undefined}
                    className="absolute text-yellow-400"
                >
                    <Star fill="currentColor" size={40} />
                </motion.div>
            ))}
        </div>
    );
};
