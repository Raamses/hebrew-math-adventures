import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export type MascotCharacter = 'owl' | 'bear' | 'ant' | 'lion';
export type MascotEmotion = 'idle' | 'happy' | 'sad' | 'thinking' | 'excited' | 'encourage';

interface MascotProps {
    character: MascotCharacter;
    emotion: MascotEmotion;
    className?: string;
}

// Hook for random blinking
const useBlink = () => {
    const [isBlinking, setIsBlinking] = useState(false);

    useEffect(() => {
        const blinkLoop = () => {
            const nextBlink = Math.random() * 3000 + 2000; // 2-5s
            setTimeout(() => {
                setIsBlinking(true);
                setTimeout(() => {
                    setIsBlinking(false);
                    blinkLoop();
                }, 150);
            }, nextBlink);
        };
        blinkLoop();
        return () => setIsBlinking(false); // Cleanup
    }, []);

    return isBlinking;
};

// --- Character Components ---

const OwlMascot: React.FC<{ emotion: MascotEmotion; blinking: boolean }> = ({ emotion, blinking }) => {
    // Body Animation
    const bodyVariants = {
        idle: { y: [0, -3, 0], scale: 1, transition: { repeat: Infinity, duration: 4, type: "tween", ease: "easeInOut" } },
        happy: {
            y: [0, -15, 0],
            scale: [1, 1.05, 1],
            transition: { repeat: Infinity, duration: 0.8, type: "tween", ease: "easeInOut" }
        },
        excited: {
            rotate: [0, -10, 10, -5, 5, 0],
            scale: [1, 1.2, 1],
            transition: { repeat: Infinity, duration: 1.5 }
        },
        thinking: { rotate: [0, 5, 0], transition: { repeat: Infinity, duration: 2.5 } },
        sad: { y: 10, scale: 0.95, rotate: -5 },
        encourage: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 1.5 } }
    };

    // Wing Animation - Managed via simple transforms if needed, or static for now
    // const wingVariants = { ... };

    return (
        <motion.div variants={bodyVariants as any} animate={emotion} className="w-full h-full relative">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl overflow-visible">
                <defs>
                    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#6D28D9" />
                    </linearGradient>
                    <linearGradient id="bellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#DDD6FE" />
                        <stop offset="100%" stopColor="#C4B5FD" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <clipPath id="leftEyeClip">
                        <circle cx="70" cy="80" r="24" />
                    </clipPath>
                    <clipPath id="rightEyeClip">
                        <circle cx="130" cy="80" r="24" />
                    </clipPath>
                </defs>

                {/* Wings - Behind Body */}
                <path d="M 40 100 Q 10 130 30 150 Q 50 140 50 100 Z" fill="#5B21B6" />

                {/* Right Wing (Waving) */}
                <path d="M 160 100 Q 190 130 170 150 Q 150 140 150 100 Z" fill="#5B21B6" />

                {/* Body Base */}
                <ellipse cx="100" cy="110" rx="60" ry="70" fill="url(#bodyGrad)" stroke="#5B21B6" strokeWidth="4" />

                {/* Belly Area */}
                <ellipse cx="100" cy="130" rx="40" ry="40" fill="url(#bellyGrad)" opacity="0.9" />

                {/* Feet */}
                <path d="M 80 175 L 75 185 L 85 185 Z" fill="#F59E0B" />
                <path d="M 120 175 L 115 185 L 125 185 Z" fill="#F59E0B" />

                {/* Face Area */}
                <g transform={emotion === 'thinking' ? "rotate(-10, 100, 100)" : ""}>
                    {/* Eyes Container */}
                    <g transform="translate(0, 10)">
                        {/* Left Eye */}
                        <g>
                            <circle cx="70" cy="80" r="24" fill="white" stroke="#5B21B6" strokeWidth="3" />
                            <motion.circle
                                cx={emotion === 'thinking' ? 75 : 70}
                                cy="80" r="8" fill="#1E1B4B"
                                initial={{ opacity: 1 }}
                            />
                            {/* Eyelid - Animating Height */}
                            <motion.rect
                                x="46" y="56" width="48"
                                fill="#8B5CF6"
                                clipPath="url(#leftEyeClip)"
                                initial={{ height: 0 }}
                                animate={{ height: blinking ? 48 : 0 }}
                                transition={{ duration: 0.1 }}
                            />
                        </g>

                        {/* Right Eye */}
                        <g>
                            <circle cx="130" cy="80" r="24" fill="white" stroke="#5B21B6" strokeWidth="3" />
                            <motion.circle
                                cx={emotion === 'thinking' ? 135 : 130}
                                cy="80" r="8" fill="#1E1B4B"
                                initial={{ opacity: 1 }}
                            />
                            {/* Eyelid */}
                            <motion.rect
                                x="106" y="56" width="48"
                                fill="#8B5CF6"
                                clipPath="url(#rightEyeClip)"
                                initial={{ height: 0 }}
                                animate={{ height: blinking ? 48 : 0 }}
                                transition={{ duration: 0.1 }}
                            />
                        </g>
                    </g>

                    {/* Beak */}
                    <path d="M 90 105 L 110 105 L 100 125 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />

                    {/* Eyebrows (for expression) */}
                    {emotion === 'thinking' && (
                        <>
                            <path d="M 60 55 Q 70 45 80 55" stroke="#5B21B6" strokeWidth="3" fill="none" />
                            <path d="M 120 50 L 140 45" stroke="#5B21B6" strokeWidth="3" fill="none" />
                        </>
                    )}
                    {emotion === 'sad' && (
                        <>
                            <path d="M 60 60 Q 70 55 80 60" stroke="#5B21B6" strokeWidth="3" fill="none" />
                            <path d="M 120 60 Q 130 55 140 60" stroke="#5B21B6" strokeWidth="3" fill="none" />
                        </>
                    )}
                </g>

                {/* Stars for Excited */}
                {emotion === 'excited' && (
                    <motion.g
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1, rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        <path d="M 20 20 L 30 20 L 25 10 Z" fill="#FCD34D" filter="url(#glow)" />
                        <path d="M 180 40 L 190 40 L 185 30 Z" fill="#FCD34D" filter="url(#glow)" />
                    </motion.g>
                )}
            </svg>
        </motion.div>
    );
};

// ... Placeholders for other animals can remain simpler for now
// ... Bear, Ant, Lion Components ...
const BearMascot: React.FC<{ emotion: MascotEmotion }> = ({ emotion }) => (
    <motion.div animate={emotion} className="w-full h-full">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
            <circle cx="25" cy="25" r="10" fill="#78350f" />
            <circle cx="75" cy="25" r="10" fill="#78350f" />
            <circle cx="50" cy="50" r="35" fill="#92400e" stroke="#78350f" strokeWidth="3" />
            <ellipse cx="50" cy="60" rx="12" ry="10" fill="#fcd34d" />
            <circle cx="50" cy="56" r="3" fill="#451a03" />
            <circle cx="40" cy="45" r="3" fill="black" />
            <circle cx="60" cy="45" r="3" fill="black" />
            <path d="M47 65 Q50 68 53 65" fill="none" stroke="#451a03" strokeWidth="2" />
        </svg>
    </motion.div>
);

const AntMascot: React.FC<{ emotion: MascotEmotion }> = ({ emotion }) => (
    <motion.div animate={emotion} className="w-full h-full">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
            <circle cx="50" cy="75" r="15" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
            <circle cx="50" cy="50" r="10" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
            <circle cx="50" cy="25" r="12" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
            <path d="M40 50 L20 40" stroke="#b91c1c" strokeWidth="2" />
            <path d="M60 50 L80 40" stroke="#b91c1c" strokeWidth="2" />
            <path d="M40 55 L20 65" stroke="#b91c1c" strokeWidth="2" />
            <path d="M60 55 L80 65" stroke="#b91c1c" strokeWidth="2" />
            <circle cx="45" cy="22" r="2" fill="white" />
            <circle cx="45" cy="22" r="1" fill="black" />
            <circle cx="55" cy="22" r="2" fill="white" />
            <circle cx="55" cy="22" r="1" fill="black" />
            <path d="M45 15 L35 5" stroke="#b91c1c" strokeWidth="2" />
            <path d="M55 15 L65 5" stroke="#b91c1c" strokeWidth="2" />
        </svg>
    </motion.div>
);

const LionMascot: React.FC<{ emotion: MascotEmotion }> = ({ emotion }) => (
    <motion.div animate={emotion} className="w-full h-full">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
            <circle cx="50" cy="50" r="40" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
            <circle cx="50" cy="50" r="25" fill="#fcd34d" />
            <circle cx="30" cy="30" r="6" fill="#fcd34d" />
            <circle cx="70" cy="30" r="6" fill="#fcd34d" />
            <circle cx="42" cy="45" r="3" fill="black" />
            <circle cx="58" cy="45" r="3" fill="black" />
            <path d="M46 55 L54 55 L50 62 Z" fill="#78350f" />
            <path d="M30 55 L15 50" stroke="#d97706" strokeWidth="1" />
            <path d="M30 60 L15 65" stroke="#d97706" strokeWidth="1" />
            <path d="M70 55 L85 50" stroke="#d97706" strokeWidth="1" />
            <path d="M70 60 L85 65" stroke="#d97706" strokeWidth="1" />
        </svg>
    </motion.div>
);

export const Mascot: React.FC<MascotProps> = ({ character, emotion, className = '' }) => {
    const isBlinking = useBlink();

    return (
        <div className={`w-32 h-32 md:w-48 md:h-48 ${className}`}>
            {character === 'owl' && <OwlMascot emotion={emotion} blinking={isBlinking} />}
            {character === 'bear' && <BearMascot emotion={emotion} />}
            {character === 'ant' && <AntMascot emotion={emotion} />}
            {character === 'lion' && <LionMascot emotion={emotion} />}
        </div>
    );
};
