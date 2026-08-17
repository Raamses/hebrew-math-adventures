import React from 'react';
import type { LessonTheme } from '../../../types/lesson';

/**
 * Per-theme palette. Sprites read from here so a seashell on the beach and a
 * crystal on the mountain share one colour language instead of each lesson
 * inventing its own.
 */
export interface ThemePalette {
    /** Tailwind classes for the scene container (behind the SVG backdrop). */
    containerClass: string;
    /** Colour of the "ground"/surface objects rest on. */
    ground: string;
    /** Ink used for target outlines and counters. */
    ink: string;
    /** Accent used for empty slot outlines. */
    slot: string;
}

export const THEME_PALETTES: Record<LessonTheme, ThemePalette> = {
    beach: {
        containerClass: 'bg-gradient-to-b from-sky-200 via-sky-100 to-amber-100',
        ground: '#FCD9A0',
        ink: '#0E7490',
        slot: '#38BDF8',
    },
    forest: {
        containerClass: 'bg-gradient-to-b from-emerald-100 via-lime-50 to-emerald-200',
        ground: '#86C06C',
        ink: '#166534',
        slot: '#4ADE80',
    },
    mountain: {
        containerClass: 'bg-gradient-to-b from-indigo-100 via-slate-50 to-amber-100',
        ground: '#C4B5A0',
        ink: '#4338CA',
        slot: '#818CF8',
    },
    desert: {
        containerClass: 'bg-gradient-to-b from-orange-100 via-amber-50 to-yellow-200',
        ground: '#E8C88F',
        ink: '#B45309',
        slot: '#FBBF24',
    },
};

/**
 * Full-bleed scene backdrop for a theme. Drawn on a 16:9 viewBox so it lines up
 * with the scene's percentage coordinate space: an item authored at
 * `{ x: 50, y: 80 }` sits on the horizon line at y=72 of this art.
 *
 * `aria-hidden` throughout — this is pure decoration; the mascot's speech
 * carries the instruction.
 */
export const SceneBackdrop: React.FC<{ theme: LessonTheme }> = ({ theme }) => (
    <svg
        viewBox="0 0 160 90"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        data-testid={`scene-backdrop-${theme}`}
    >
        {theme === 'beach' && <BeachBackdrop />}
        {theme === 'forest' && <ForestBackdrop />}
        {theme === 'mountain' && <MountainBackdrop />}
        {theme === 'desert' && <DesertBackdrop />}
    </svg>
);

const Sun: React.FC<{ x: number; y: number; fill?: string }> = ({ x, y, fill = '#FDE047' }) => (
    <g>
        <circle cx={x} cy={y} r="9" fill={fill} opacity="0.35" />
        <circle cx={x} cy={y} r="6" fill={fill} />
    </g>
);

const BeachBackdrop: React.FC = () => (
    <g>
        <rect width="160" height="90" fill="#BAE6FD" />
        <Sun x={132} y={16} />
        {/* Sea */}
        <path d="M0 46 H160 V70 H0 Z" fill="#38BDF8" />
        <path d="M0 46 Q20 42 40 46 T80 46 T120 46 T160 46 V52 H0 Z" fill="#7DD3FC" />
        {/* Foam line */}
        <path d="M0 68 Q26 64 52 68 T104 68 T160 68 V72 H0 Z" fill="#E0F2FE" opacity="0.9" />
        {/* Sand */}
        <path d="M0 70 Q40 66 80 70 T160 70 V90 H0 Z" fill="#FCD9A0" />
        <path d="M0 80 Q50 76 100 80 T160 79 V90 H0 Z" fill="#F5C77E" opacity="0.6" />
        {/* Palm */}
        <path d="M18 90 Q16 76 20 66" stroke="#A16207" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M20 66 Q10 60 4 64 M20 66 Q30 58 38 62 M20 66 Q18 56 24 52" stroke="#15803D" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
);

const ForestBackdrop: React.FC = () => (
    <g>
        <rect width="160" height="90" fill="#D9F99D" />
        <Sun x={26} y={14} fill="#FEF08A" />
        {/* Distant hills */}
        <path d="M0 58 Q30 40 60 58 T120 56 T160 60 V90 H0 Z" fill="#A7D98A" />
        {/* Trees */}
        {[10, 34, 126, 150].map((x, i) => (
            <g key={x} transform={`translate(${x} ${52 + (i % 2) * 4})`}>
                <rect x="-2" y="0" width="4" height="20" rx="1.5" fill="#92400E" />
                <circle cx="0" cy="-4" r="11" fill="#22C55E" />
                <circle cx="-7" cy="2" r="8" fill="#16A34A" />
                <circle cx="7" cy="2" r="8" fill="#4ADE80" />
            </g>
        ))}
        {/* Grass floor */}
        <path d="M0 70 Q40 66 80 70 T160 70 V90 H0 Z" fill="#86C06C" />
        <path d="M0 78 Q50 74 100 78 T160 77 V90 H0 Z" fill="#65A34C" opacity="0.5" />
    </g>
);

const MountainBackdrop: React.FC = () => (
    <g>
        <rect width="160" height="90" fill="#E0E7FF" />
        <Sun x={136} y={14} fill="#C7D2FE" />
        {/* Peaks */}
        <path d="M-10 72 L28 26 L60 72 Z" fill="#A5B4FC" />
        <path d="M28 26 L40 44 L16 44 Z" fill="#F8FAFC" />
        <path d="M40 74 L86 20 L132 74 Z" fill="#818CF8" />
        <path d="M86 20 L102 42 L70 42 Z" fill="#FFFFFF" />
        <path d="M108 72 L140 34 L172 72 Z" fill="#A5B4FC" />
        {/* Crystal outcrops */}
        <path d="M144 72 L148 58 L152 72 Z" fill="#C084FC" opacity="0.8" />
        <path d="M8 74 L12 62 L16 74 Z" fill="#A78BFA" opacity="0.8" />
        {/* Rocky ledge */}
        <path d="M0 72 Q40 68 80 72 T160 72 V90 H0 Z" fill="#C4B5A0" />
        <path d="M0 80 Q50 77 100 80 T160 79 V90 H0 Z" fill="#A8998A" opacity="0.5" />
    </g>
);

const DesertBackdrop: React.FC = () => (
    <g>
        <rect width="160" height="90" fill="#FED7AA" />
        <Sun x={130} y={16} fill="#FB923C" />
        {/* Dunes */}
        <path d="M0 56 Q34 44 68 56 T136 54 T160 58 V90 H0 Z" fill="#F3C77B" />
        <path d="M0 68 Q40 58 84 68 T160 66 V90 H0 Z" fill="#E8C88F" />
        <path d="M0 80 Q50 74 104 80 T160 78 V90 H0 Z" fill="#D9AE6B" opacity="0.5" />
        {/* Date palms */}
        {[22, 140].map(x => (
            <g key={x} transform={`translate(${x} 68)`}>
                <path d="M0 0 Q-2 -12 2 -22" stroke="#A16207" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M2 -22 Q-8 -28 -14 -24 M2 -22 Q12 -30 20 -26 M2 -22 Q0 -32 6 -36" stroke="#166534" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
        ))}
        {/* Pyramid silhouette */}
        <path d="M96 58 L112 34 L128 58 Z" fill="#E0B378" opacity="0.7" />
    </g>
);
