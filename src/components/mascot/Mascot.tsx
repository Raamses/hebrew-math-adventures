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

const OwlMascot: React.FC<{ emotion: MascotEmotion; blinking: boolean; uniqueId: string }> = ({ emotion, blinking, uniqueId }) => {
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

    const u = uniqueId; // Short alias for template strings

    return (
        <motion.div variants={bodyVariants as any} animate={emotion} className="w-full h-full relative">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl overflow-visible">
                <defs>
                    <linearGradient id={`bodyGrad-${u}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#6D28D9" />
                    </linearGradient>
                    <linearGradient id={`bellyGrad-${u}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#DDD6FE" />
                        <stop offset="100%" stopColor="#C4B5FD" />
                    </linearGradient>
                    <filter id={`glow-${u}`}>
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <clipPath id={`leftEyeClip-${u}`}>
                        <circle cx="70" cy="80" r="24" />
                    </clipPath>
                    <clipPath id={`rightEyeClip-${u}`}>
                        <circle cx="130" cy="80" r="24" />
                    </clipPath>
                </defs>

                {/* Wings - Behind Body */}
                <path d="M 40 100 Q 10 130 30 150 Q 50 140 50 100 Z" fill="#5B21B6" />

                {/* Right Wing (Waving) */}
                <path d="M 160 100 Q 190 130 170 150 Q 150 140 150 100 Z" fill="#5B21B6" />

                {/* Body Base */}
                <ellipse cx="100" cy="110" rx="60" ry="70" fill={`url(#bodyGrad-${u})`} stroke="#5B21B6" strokeWidth="4" />

                {/* Belly Area */}
                <ellipse cx="100" cy="130" rx="40" ry="40" fill={`url(#bellyGrad-${u})`} opacity="0.9" />

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
                                clipPath={`url(#leftEyeClip-${u})`}
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
                                clipPath={`url(#rightEyeClip-${u})`}
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
                        <path d="M 20 20 L 30 20 L 25 10 Z" fill="#FCD34D" filter={`url(#glow-${u})`} />
                        <path d="M 180 40 L 190 40 L 185 30 Z" fill="#FCD34D" filter={`url(#glow-${u})`} />
                    </motion.g>
                )}
            </svg>
        </motion.div>
    );
};

// ... Placeholders for other animals can remain simpler for now
// ... Bear, Ant, Lion Components ...
const BearMascot: React.FC<{ emotion: MascotEmotion; blinking: boolean; uniqueId: string }> = ({ emotion, blinking, uniqueId }) => {
    const headVariants = {
        idle: { y: [0, 2, 0], transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } },
        happy: { y: [0, -5, 0], rotate: [0, 2, -2, 0], transition: { repeat: Infinity, duration: 2 } },
        excited: { scale: [1, 1.1, 1], y: [0, -10, 0], transition: { repeat: Infinity, duration: 0.8 } },
        thinking: { rotate: [0, 5, 0], transition: { repeat: Infinity, duration: 3 } },
        sad: { y: 10, rotate: -5 },
        encourage: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1.5 } }
    };

    const u = uniqueId;

    return (
        <motion.div variants={headVariants as any} animate={emotion} className="w-full h-full">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                <defs>
                    <clipPath id={`bearEyeClip-${u}`}>
                        <circle cx="0" cy="0" r="10" />
                    </clipPath>
                    <filter id={`furGlow-${u}`}>
                        <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Ears */}
                <g>
                    <circle cx="50" cy="50" r="25" fill="#78350F" />
                    <circle cx="50" cy="50" r="15" fill="#92400E" />
                    <circle cx="150" cy="50" r="25" fill="#78350F" />
                    <circle cx="150" cy="50" r="15" fill="#92400E" />
                </g>

                {/* Head */}
                <ellipse cx="100" cy="110" rx="80" ry="75" fill="#78350F" stroke="#451A03" strokeWidth="3" />

                {/* Muzzle */}
                <ellipse cx="100" cy="135" rx="35" ry="28" fill="#FCD34D" />
                <ellipse cx="100" cy="125" rx="15" ry="10" fill="#451A03" /> {/* Nose */}
                <path d="M 100 135 L 100 150" stroke="#451A03" strokeWidth="3" /> {/* Mouth Line */}
                {emotion === 'happy' || emotion === 'excited' ? (
                    <path d="M 85 150 Q 100 160 115 150" stroke="#451A03" strokeWidth="3" fill="none" />
                ) : emotion === 'sad' ? (
                    <path d="M 85 155 Q 100 145 115 155" stroke="#451A03" strokeWidth="3" fill="none" />
                ) : (
                    <path d="M 90 150 Q 100 152 110 150" stroke="#451A03" strokeWidth="3" fill="none" />
                )}

                {/* Eyes */}
                <g transform="translate(0, -10)">
                    {/* Left Eye */}
                    <g transform="translate(65, 90)">
                        <circle cx="0" cy="0" r="10" fill="white" />
                        <circle cx="0" cy="0" r="5" fill="black" />
                        <motion.rect x="-10" y="-10" width="20" fill="#78350F"
                            initial={{ height: 0 }}
                            animate={{ height: blinking ? 20 : 0 }}
                        />
                    </g>
                    {/* Right Eye */}
                    <g transform="translate(135, 90)">
                        <circle cx="0" cy="0" r="10" fill="white" />
                        <circle cx="0" cy="0" r="5" fill="black" />
                        <motion.rect x="-10" y="-10" width="20" fill="#78350F"
                            initial={{ height: 0 }}
                            animate={{ height: blinking ? 20 : 0 }}
                        />
                    </g>
                </g>

                {/* Paws (if needed for waving) */}
                {emotion === 'excited' && (
                    <motion.path
                        d="M 160 140 Q 190 120 170 180"
                        stroke="#78350F" strokeWidth="20" strokeLinecap="round" fill="none"
                        animate={{ rotate: [0, 20, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                    />
                )}
            </svg>
        </motion.div>
    );
};

const AntMascot: React.FC<{ emotion: MascotEmotion; blinking: boolean }> = ({ emotion, blinking }) => {
    // Ant Animation: Bounce and Antennae Wiggle
    return (
        <motion.div
            animate={emotion === 'happy' ? { y: [0, -10, 0] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="w-full h-full"
        >
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                {/* Legs (Behind Body) */}
                <g stroke="#B91C1C" strokeWidth="4" fill="none" strokeLinecap="round">
                    {/* Top Pair */}
                    <path d="M 80 100 Q 50 80 30 100" />
                    <path d="M 120 100 Q 150 80 170 100" />

                    {/* Middle Pair */}
                    <path d="M 85 125 Q 45 125 25 145" />
                    <path d="M 115 125 Q 155 125 175 145" />

                    {/* Bottom Pair */}
                    <path d="M 90 150 Q 50 170 30 180" />
                    <path d="M 110 150 Q 150 170 170 180" />
                </g>

                {/* Body Segments */}
                <circle cx="100" cy="150" r="40" fill="#EF4444" stroke="#B91C1C" strokeWidth="4" />
                <circle cx="100" cy="100" r="25" fill="#EF4444" stroke="#B91C1C" strokeWidth="4" />

                {/* Head */}
                <circle cx="100" cy="50" r="30" fill="#EF4444" stroke="#B91C1C" strokeWidth="4" />

                {/* Antennae */}
                <motion.path
                    d="M 80 30 Q 60 0 40 10" stroke="#B91C1C" strokeWidth="3" fill="none"
                    animate={{ rotate: [0, 5, 0] }}
                    style={{ originX: 1, originY: 1 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                />
                <circle cx="40" cy="10" r="4" fill="#B91C1C" />

                <motion.path
                    d="M 120 30 Q 140 0 160 10" stroke="#B91C1C" strokeWidth="3" fill="none"
                    animate={{ rotate: [0, -5, 0] }}
                    style={{ originX: 0, originY: 1 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                />
                <circle cx="160" cy="10" r="4" fill="#B91C1C" />

                {/* Eyes */}
                <g transform="translate(0, 0)">
                    <circle cx="85" cy="45" r="8" fill="white" />
                    <circle cx="85" cy="45" r="4" fill="black" />
                    <motion.rect x="75" y="35" width="20" height="20" fill="#EF4444"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: blinking ? 1 : 0 }}
                        style={{ transformOrigin: 'top' }}
                    />

                    <circle cx="115" cy="45" r="8" fill="white" />
                    <circle cx="115" cy="45" r="4" fill="black" />
                    <motion.rect x="105" y="35" width="20" height="20" fill="#EF4444"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: blinking ? 1 : 0 }}
                        style={{ transformOrigin: 'top' }}
                    />
                </g>

                {/* Mouth */}
                {emotion === 'happy' || emotion === 'excited' ? (
                    <path d="M 85 65 Q 100 75 115 65" stroke="white" strokeWidth="3" fill="none" />
                ) : (
                    <path d="M 90 65 Q 100 68 110 65" stroke="white" strokeWidth="3" fill="none" />
                )}
            </svg>
        </motion.div>
    );
};

const LionMascot: React.FC<{ emotion: MascotEmotion; blinking: boolean }> = ({ emotion, blinking }) => {
    // Lion Animation
    return (
        <motion.div animate={emotion} className="w-full h-full">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                {/* Mane */}
                <motion.path
                    d="M 100 20 
                       Q 130 20 150 50 Q 180 80 160 120 Q 180 150 150 170 
                       Q 130 190 100 180 Q 70 190 50 170 Q 20 150 40 120 
                       Q 20 80 50 50 Q 70 20 100 20 Z"
                    fill="#D97706"
                    stroke="#B45309" strokeWidth="3"
                    animate={emotion === 'excited' ? { scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                />

                {/* Face */}
                <circle cx="100" cy="100" r="50" fill="#FCD34D" />

                {/* Ears */}
                <circle cx="60" cy="60" r="12" fill="#FCD34D" stroke="#D97706" strokeWidth="2" />
                <circle cx="140" cy="60" r="12" fill="#FCD34D" stroke="#D97706" strokeWidth="2" />

                {/* Muzzle Area */}
                <circle cx="100" cy="120" r="18" fill="#FFFBEB" opacity="0.6" />

                {/* Nose */}
                <path d="M 90 115 L 110 115 L 100 130 Z" fill="#78350F" />
                <path d="M 100 130 L 100 145" stroke="#78350F" strokeWidth="2" />

                {/* Mouth */}
                {emotion === 'happy' || emotion === 'excited' ? (
                    <path d="M 90 145 Q 100 155 110 145" stroke="#78350F" strokeWidth="2" fill="none" />
                ) : (
                    <path d="M 90 145 Q 100 148 110 145" stroke="#78350F" strokeWidth="2" fill="none" />
                )}

                {/* Eyes */}
                <g>
                    <circle cx="80" cy="90" r="6" fill="black" />
                    <motion.rect x="70" y="80" width="20" fill="#FCD34D"
                        initial={{ height: 0 }}
                        animate={{ height: blinking ? 20 : 0 }}
                    />

                    <circle cx="120" cy="90" r="6" fill="black" />
                    <motion.rect x="110" y="80" width="20" fill="#FCD34D"
                        initial={{ height: 0 }}
                        animate={{ height: blinking ? 20 : 0 }}
                    />
                </g>

                {/* Whiskers */}
                <path d="M 80 120 L 60 115" stroke="#92400E" strokeWidth="1" />
                <path d="M 80 125 L 60 128" stroke="#92400E" strokeWidth="1" />
                <path d="M 120 120 L 140 115" stroke="#92400E" strokeWidth="1" />
                <path d="M 120 125 L 140 128" stroke="#92400E" strokeWidth="1" />

            </svg>
        </motion.div>
    );
};

export const Mascot: React.FC<MascotProps> = ({ character, emotion, className = '' }) => {
    const isBlinking = useBlink();
    // Unique ID for SVG defs to avoid collisions, especially when multiple mascots are on screen (e.g. ProfileSelector)
    // Using simple random string as stable ID isn't strictly required for client-side visual only, 
    // but React.useId is better if available. Fallback to random if needed.
    const uniqueId = React.useId ? React.useId().replace(/:/g, '') : Math.random().toString(36).substr(2, 9);

    return (
        <div className={`w-32 h-32 md:w-48 md:h-48 ${className}`}>
            {character === 'owl' && <OwlMascot emotion={emotion} blinking={isBlinking} uniqueId={uniqueId} />}
            {character === 'bear' && <BearMascot emotion={emotion} blinking={isBlinking} uniqueId={uniqueId} />}
            {character === 'ant' && <AntMascot emotion={emotion} blinking={isBlinking} />}
            {character === 'lion' && <LionMascot emotion={emotion} blinking={isBlinking} />}
        </div>
    );
};
