import React from 'react';
import { motion } from 'framer-motion';

export type MascotCharacter = 'owl' | 'bear' | 'ant' | 'lion';
export type MascotEmotion = 'idle' | 'happy' | 'sad' | 'thinking' | 'excited' | 'encourage';

interface MascotProps {
    character: MascotCharacter;
    emotion: MascotEmotion;
    className?: string;
}

// Animation variants based on emotion
const variants = {
    idle: { y: [0, -5, 0], transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } },
    happy: { y: [0, -20, 0], scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 0.6 } },
    excited: { y: [0, -30, 0], rotate: [0, -10, 10, 0], transition: { repeat: Infinity, duration: 0.4 } },
    sad: { y: 5, rotate: -5, scale: 0.95 },
    thinking: { rotate: [0, 15, 0], transition: { repeat: Infinity, duration: 2 } },
    encourage: { scale: [1, 1.2, 1], transition: { repeat: Infinity, duration: 1 } }
} as any;

export const Mascot: React.FC<MascotProps> = ({ character, emotion, className = '' }) => {

    const renderCharacter = () => {
        switch (character) {
            case 'owl':
                return (
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                        {/* Body */}
                        <path d="M20 30 Q50 5 80 30 L80 80 Q50 95 20 80 Z" fill="#a78bfa" stroke="#7c3aed" strokeWidth="3" />
                        {/* Belly */}
                        <path d="M30 80 Q50 90 70 80 L70 50 Q50 60 30 50 Z" fill="#ddd6fe" />
                        {/* Eyes */}
                        <circle cx="35" cy="40" r="12" fill="white" stroke="#7c3aed" strokeWidth="2" />
                        <circle cx="65" cy="40" r="12" fill="white" stroke="#7c3aed" strokeWidth="2" />
                        {/* Pupils - Static for now to prevent crash */}
                        <circle cx={emotion === 'thinking' ? 38 : 35} cy="40" r="4" fill="#4c1d95" />
                        <circle cx={emotion === 'thinking' ? 68 : 65} cy="40" r="4" fill="#4c1d95" />
                        {/* Beak */}
                        <path d="M45 50 L55 50 L50 60 Z" fill="#f59e0b" />
                        {/* Wings */}
                        <path d="M15 40 Q5 60 20 70" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="2" />
                        <path d="M85 40 Q95 60 80 70" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="2" />
                    </svg>
                );
            case 'bear':
                return (
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                        {/* Ears */}
                        <circle cx="25" cy="25" r="10" fill="#78350f" />
                        <circle cx="75" cy="25" r="10" fill="#78350f" />
                        {/* Head */}
                        <circle cx="50" cy="50" r="35" fill="#92400e" stroke="#78350f" strokeWidth="3" />
                        {/* Snout */}
                        <ellipse cx="50" cy="60" rx="12" ry="10" fill="#fcd34d" />
                        <circle cx="50" cy="56" r="3" fill="#451a03" />
                        {/* Eyes */}
                        <circle cx="40" cy="45" r="3" fill="black" />
                        <circle cx="60" cy="45" r="3" fill="black" />
                        {/* Mouth */}
                        <path d="M47 65 Q50 68 53 65" fill="none" stroke="#451a03" strokeWidth="2" />
                    </svg>
                );
            case 'ant':
                return (
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                        {/* Body Segments */}
                        <circle cx="50" cy="75" r="15" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
                        <circle cx="50" cy="50" r="10" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
                        <circle cx="50" cy="25" r="12" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
                        {/* Legs */}
                        <path d="M40 50 L20 40" stroke="#b91c1c" strokeWidth="2" />
                        <path d="M60 50 L80 40" stroke="#b91c1c" strokeWidth="2" />
                        <path d="M40 55 L20 65" stroke="#b91c1c" strokeWidth="2" />
                        <path d="M60 55 L80 65" stroke="#b91c1c" strokeWidth="2" />
                        {/* Eyes */}
                        <circle cx="45" cy="22" r="2" fill="white" />
                        <circle cx="45" cy="22" r="1" fill="black" />
                        <circle cx="55" cy="22" r="2" fill="white" />
                        <circle cx="55" cy="22" r="1" fill="black" />
                        {/* Antennae */}
                        <path d="M45 15 L35 5" stroke="#b91c1c" strokeWidth="2" />
                        <path d="M55 15 L65 5" stroke="#b91c1c" strokeWidth="2" />
                    </svg>
                );
            case 'lion':
                return (
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                        {/* Mane */}
                        <circle cx="50" cy="50" r="40" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
                        {/* Face */}
                        <circle cx="50" cy="50" r="25" fill="#fcd34d" />
                        {/* Ears */}
                        <circle cx="30" cy="30" r="6" fill="#fcd34d" />
                        <circle cx="70" cy="30" r="6" fill="#fcd34d" />
                        {/* Eyes */}
                        <circle cx="42" cy="45" r="3" fill="black" />
                        <circle cx="58" cy="45" r="3" fill="black" />
                        {/* Nose */}
                        <path d="M46 55 L54 55 L50 62 Z" fill="#78350f" />
                        {/* Whiskers */}
                        <path d="M30 55 L15 50" stroke="#d97706" strokeWidth="1" />
                        <path d="M30 60 L15 65" stroke="#d97706" strokeWidth="1" />
                        <path d="M70 55 L85 50" stroke="#d97706" strokeWidth="1" />
                        <path d="M70 60 L85 65" stroke="#d97706" strokeWidth="1" />
                    </svg>
                );
        }
    };

    return (
        <motion.div
            className={`w-32 h-32 md:w-40 md:h-40 ${className}`}
            variants={variants}
            animate={emotion}
        >
            {renderCharacter()}
        </motion.div>
    );
};
