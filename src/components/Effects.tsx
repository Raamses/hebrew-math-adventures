import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const STAR_COUNT = 5;
const ANIMATION_DURATION = 1;
const STAGGER_DELAY = 0.1;

interface FlyingStarsProps {
    onComplete: () => void;
}

export const FlyingStars: React.FC<FlyingStarsProps> = ({ onComplete }) => {
    // Stable array for rendering
    const stars = React.useMemo(() => Array.from({ length: STAR_COUNT }), []);

    return (
        <div
            className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
            aria-hidden="true"
        >
            {stars.map((_, i) => (
                <motion.div
                    key={i}
                    initial={{
                        opacity: 1,
                        x: "50vw", // Center
                        y: "50vh", // Center
                        scale: 0.5
                    }}
                    animate={{
                        opacity: 0,
                        x: "85vw", // Target: Top Right (Score area)
                        y: "5vh",
                        scale: 1.5,
                        rotate: 360
                    }}
                    transition={{
                        duration: ANIMATION_DURATION,
                        delay: i * STAGGER_DELAY,
                        ease: "easeOut"
                    }}
                    onAnimationComplete={i === STAR_COUNT - 1 ? onComplete : undefined}
                    className="absolute text-yellow-400"
                >
                    <Star fill="currentColor" size={40} />
                </motion.div>
            ))}
        </div>
    );
};
