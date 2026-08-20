import React from 'react';
import type { DesertAnimal, LessonItemType, LessonTarget, LessonTheme } from '../../types/lesson';

/**
 * LessonSprites — every drawing the story scene can put on stage.
 *
 * All sprites are pure, prop-driven SVG on a 0..100 viewBox so the scene can
 * size them purely with CSS. Nothing here reads context, i18n or state: the
 * scene owns behaviour, this file owns pixels.
 */

// ================================================================
//  Backgrounds — one per world
// ================================================================

const BEACH = (
    <>
        <defs>
            <linearGradient id="lesson-sky-beach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BAE6FD" />
                <stop offset="100%" stopColor="#E0F2FE" />
            </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#lesson-sky-beach)" />
        <circle cx="88" cy="14" r="9" fill="#FDE68A" />
        <path d="M0 62 Q 25 56 50 62 T 100 62 V 74 H 0 Z" fill="#7DD3FC" opacity="0.85" />
        <path d="M0 70 Q 25 64 50 70 T 100 70 V 100 H 0 Z" fill="#FEF3C7" />
        <path d="M0 78 Q 30 74 60 79 T 100 77" stroke="#FDE68A" strokeWidth="1.5" fill="none" />
    </>
);

const FOREST = (
    <>
        <defs>
            <linearGradient id="lesson-sky-forest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D9F99D" />
                <stop offset="100%" stopColor="#ECFCCB" />
            </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#lesson-sky-forest)" />
        <circle cx="12" cy="16" r="7" fill="#FEF08A" opacity="0.8" />
        <path d="M0 72 Q 20 62 40 72 T 80 70 T 100 74 V 100 H 0 Z" fill="#86EFAC" />
        <path d="M0 82 Q 30 76 60 84 T 100 80 V 100 H 0 Z" fill="#4ADE80" />
    </>
);

const MOUNTAIN = (
    <>
        <defs>
            <linearGradient id="lesson-sky-mountain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C7D2FE" />
                <stop offset="100%" stopColor="#EEF2FF" />
            </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#lesson-sky-mountain)" />
        <path d="M-5 78 L 20 40 L 40 78 Z" fill="#A5B4FC" />
        <path d="M20 40 L 27 51 L 13 51 Z" fill="#F8FAFC" />
        <path d="M30 80 L 62 34 L 92 80 Z" fill="#818CF8" />
        <path d="M62 34 L 72 49 L 52 49 Z" fill="#F8FAFC" />
        <rect y="78" width="100" height="22" fill="#C4B5FD" />
    </>
);

const DESERT = (
    <>
        <defs>
            <linearGradient id="lesson-sky-desert" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FED7AA" />
                <stop offset="100%" stopColor="#FFEDD5" />
            </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#lesson-sky-desert)" />
        <circle cx="80" cy="16" r="10" fill="#FCD34D" opacity="0.9" />
        <path d="M0 74 Q 22 62 44 74 T 100 70 V 100 H 0 Z" fill="#FDBA74" />
        <path d="M0 84 Q 34 76 68 86 T 100 82 V 100 H 0 Z" fill="#FB923C" opacity="0.75" />
    </>
);


const SPACE: React.ReactNode = (
    <>
        <defs>
            <linearGradient id="lesson-sky-space" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#lesson-sky-space)" />
        <circle cx="20" cy="15" r="1.5" fill="#F1F5F9" opacity="0.8" />
        <circle cx="50" cy="25" r="1" fill="#F1F5F9" opacity="0.6" />
        <circle cx="75" cy="10" r="2" fill="#F1F5F9" opacity="0.9" />
        <circle cx="35" cy="40" r="1" fill="#F8FAFC" opacity="0.5" />
        <circle cx="85" cy="35" r="1.5" fill="#F1F5F9" opacity="0.7" />
    </>
);

const BACKGROUNDS: Record<LessonTheme, React.ReactNode> = {
    beach: BEACH,
    forest: FOREST,
    mountain: MOUNTAIN,
    desert: DESERT,
    space: SPACE,
};

export const SceneBackground: React.FC<{ theme: LessonTheme }> = ({ theme }) => (
    <svg
        data-testid={`lesson-background-${theme}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
    >
        {BACKGROUNDS[theme] ?? BACKGROUNDS.mountain}
    </svg>
);

// ================================================================
//  Item sprites
// ================================================================

const Apple = (
    <>
        <path d="M 50 90 Q 20 90 20 60 Q 20 30 50 40 Q 80 30 80 60 Q 80 90 50 90" fill="#EF4444" stroke="#991B1B" strokeWidth="3" />
        <path d="M 50 40 Q 40 10 70 10 Q 60 40 50 40" fill="#4ADE80" stroke="#166534" strokeWidth="3" />
        <circle cx="35" cy="55" r="4" fill="white" opacity="0.45" />
    </>
);

const Seashell = (
    <>
        <path d="M 50 88 L 12 44 Q 50 6 88 44 Z" fill="#FBCFE8" stroke="#BE185D" strokeWidth="3" strokeLinejoin="round" />
        <path d="M50 88 L 50 20 M 50 88 L 27 34 M 50 88 L 73 34" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="84" r="5" fill="#FDF2F8" stroke="#BE185D" strokeWidth="2" />
    </>
);

const Crystal = (
    <>
        <path d="M50 6 L 84 40 L 66 92 H 34 L 16 40 Z" fill="#67E8F9" stroke="#0E7490" strokeWidth="3" strokeLinejoin="round" />
        <path d="M50 6 L 50 92 M 16 40 L 84 40" stroke="#22D3EE" strokeWidth="3" />
        <path d="M50 6 L 34 40 L 50 92 L 66 40 Z" fill="#A5F3FC" opacity="0.65" />
    </>
);

const DateFruit = (
    <>
        <ellipse cx="50" cy="56" rx="26" ry="36" fill="#B45309" stroke="#78350F" strokeWidth="3" />
        <ellipse cx="41" cy="42" rx="7" ry="12" fill="#FCD34D" opacity="0.4" />
        <path d="M50 20 Q 48 8 58 6" stroke="#4D7C0F" strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
);

const Bunny = (
    <>
        <ellipse cx="50" cy="68" rx="28" ry="24" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="3" />
        <circle cx="50" cy="38" r="19" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="3" />
        <ellipse cx="39" cy="14" rx="7" ry="16" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="3" />
        <ellipse cx="61" cy="14" rx="7" ry="16" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="3" />
        <ellipse cx="39" cy="14" rx="3" ry="9" fill="#FBCFE8" />
        <ellipse cx="61" cy="14" rx="3" ry="9" fill="#FBCFE8" />
        <circle cx="43" cy="36" r="3.5" fill="#0F172A" />
        <circle cx="57" cy="36" r="3.5" fill="#0F172A" />
        <path d="M46 46 Q 50 50 54 46" stroke="#F472B6" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="74" cy="80" r="8" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="3" />
    </>
);

const Tree = (
    <>
        <rect x="43" y="52" width="14" height="44" rx="4" fill="#92400E" />
        <circle cx="50" cy="34" r="30" fill="#22C55E" stroke="#15803D" strokeWidth="3" />
        <circle cx="30" cy="46" r="17" fill="#4ADE80" stroke="#15803D" strokeWidth="3" />
        <circle cx="70" cy="46" r="17" fill="#4ADE80" stroke="#15803D" strokeWidth="3" />
        <circle cx="38" cy="30" r="5" fill="#EF4444" />
        <circle cx="62" cy="38" r="5" fill="#EF4444" />
    </>
);

const ANIMALS: Record<DesertAnimal, React.ReactNode> = {
    camel: (
        <>
            <path d="M18 78 Q 22 52 38 54 Q 44 34 54 46 Q 62 34 70 50 Q 84 54 84 78" fill="#D9A066" stroke="#92400E" strokeWidth="3" strokeLinejoin="round" />
            <rect x="24" y="74" width="7" height="20" rx="3" fill="#D9A066" stroke="#92400E" strokeWidth="3" />
            <rect x="70" y="74" width="7" height="20" rx="3" fill="#D9A066" stroke="#92400E" strokeWidth="3" />
            <path d="M18 78 Q 8 70 10 52" stroke="#92400E" strokeWidth="3" fill="none" />
            <circle cx="11" cy="46" r="10" fill="#D9A066" stroke="#92400E" strokeWidth="3" />
            <circle cx="8" cy="44" r="2.5" fill="#0F172A" />
        </>
    ),
    fox: (
        <>
            <ellipse cx="50" cy="66" rx="27" ry="22" fill="#FB923C" stroke="#9A3412" strokeWidth="3" />
            <circle cx="50" cy="38" r="20" fill="#FDBA74" stroke="#9A3412" strokeWidth="3" />
            <path d="M32 24 L 28 4 L 46 16 Z" fill="#FB923C" stroke="#9A3412" strokeWidth="3" strokeLinejoin="round" />
            <path d="M68 24 L 72 4 L 54 16 Z" fill="#FB923C" stroke="#9A3412" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="43" cy="36" r="3.5" fill="#0F172A" />
            <circle cx="57" cy="36" r="3.5" fill="#0F172A" />
            <path d="M50 46 L 46 42 H 54 Z" fill="#0F172A" />
            <path d="M77 66 Q 96 62 92 44" stroke="#FB923C" strokeWidth="9" fill="none" strokeLinecap="round" />
        </>
    ),
    lizard: (
        <>
            <path d="M14 74 Q 34 54 54 68 Q 70 78 88 62" stroke="#65A30D" strokeWidth="14" fill="none" strokeLinecap="round" />
            <circle cx="20" cy="64" r="13" fill="#84CC16" stroke="#3F6212" strokeWidth="3" />
            <circle cx="16" cy="60" r="3" fill="#0F172A" />
            <path d="M34 78 L 30 92 M 52 80 L 54 94 M 70 74 L 76 88" stroke="#65A30D" strokeWidth="6" strokeLinecap="round" />
            <path d="M30 60 L 36 52 L 42 60 M 48 62 L 54 54 L 60 62" stroke="#3F6212" strokeWidth="3" fill="none" />
        </>
    ),
};

interface ItemSpriteProps {
    type: LessonItemType;
    value?: number;
    animal?: DesertAnimal;
    className?: string;
}

/** Draws a single lesson item. Unknown types fall back to a neutral pebble. */
export const ItemSprite: React.FC<ItemSpriteProps> = ({ type, value, animal = 'camel', className }) => {
    let body: React.ReactNode;

    switch (type) {
        case 'apple':
            body = Apple;
            break;
        case 'seashell':
            body = Seashell;
            break;
        case 'crystal':
            body = Crystal;
            break;
        case 'date':
            body = DateFruit;
            break;
        case 'bunny':
            body = Bunny;
            break;
        case 'tree':
            body = Tree;
            break;
        case 'desert_animal':
            body = ANIMALS[animal] ?? ANIMALS.camel;
            break;
        case 'basket':
            body = <BasketShape />;
            break;
        case 'number':
            body = (
                <>
                    <circle cx="50" cy="50" r="42" fill="#FFFFFF" stroke="#6366F1" strokeWidth="5" />
                    <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="#4338CA" fontSize="46" fontWeight="bold">
                        {value ?? ''}
                    </text>
                </>
            );
            break;
        default:
            body = <circle cx="50" cy="55" r="34" fill="#CBD5E1" stroke="#64748B" strokeWidth="3" />;
    }

    return (
        <svg viewBox="0 0 100 100" className={className ?? 'w-full h-full drop-shadow-md'} aria-hidden="true">
            {body}
        </svg>
    );
};

// ================================================================
//  Target sprites
// ================================================================

const BasketShape: React.FC = () => (
    <>
        <path d="M 10 30 Q 50 100 90 30" fill="#D97706" stroke="#92400E" strokeWidth="3" />
        <ellipse cx="50" cy="30" rx="40" ry="10" fill="#F59E0B" stroke="#92400E" strokeWidth="3" />
    </>
);

/** A frame of empty slots — the ten-frame / crystal-row drop zone. */
const SlotGrid: React.FC<{ capacity: number; columns: number; filled: number; accent: string; border: string }> = ({
    capacity,
    columns,
    filled,
    accent,
    border,
}) => {
    const rows = Math.ceil(capacity / columns);
    const cells = Array.from({ length: capacity }, (_, i) => i);
    const cellW = 100 / columns;
    const cellH = 100 / rows;

    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full drop-shadow-lg" aria-hidden="true">
            <rect x="1" y="1" width="98" height="98" rx="6" fill="white" fillOpacity="0.55" stroke={border} strokeWidth="3" />
            {cells.map(i => {
                const col = i % columns;
                const row = Math.floor(i / columns);
                return (
                    <rect
                        key={i}
                        x={col * cellW + 2}
                        y={row * cellH + 2}
                        width={cellW - 4}
                        height={cellH - 4}
                        rx="4"
                        fill={i < filled ? accent : 'transparent'}
                        fillOpacity={i < filled ? 0.35 : 0}
                        stroke={border}
                        strokeWidth="2"
                        strokeDasharray={i < filled ? undefined : '5 4'}
                    />
                );
            })}
        </svg>
    );
};

interface TargetSpriteProps {
    target: LessonTarget;
    /** Highlighted while an item is selected / dragged over it. */
    isActive?: boolean;
}

/**
 * Draws a drop zone. Filled counts are rendered by the item sprites that snap
 * into the slots, so targets only draw the *container*.
 */
export const TargetSprite: React.FC<TargetSpriteProps> = ({ target, isActive }) => {
    const visual = target.visual ?? 'basket';
    const columns = target.columns ?? Math.min(target.capacity, 5);
    const isFull = target.currentCount >= target.capacity;

    const counter = !target.hideCounter && (
        <div
            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-lg font-black shadow-md border-2 ${isFull ? 'bg-emerald-500 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300'
                }`}
            dir="ltr"
        >
            {target.currentCount}/{target.capacity}
        </div>
    );

    if (visual === 'ten_frame' || visual === 'crystal_row') {
        const accent = visual === 'ten_frame' ? '#38BDF8' : '#22D3EE';
        const border = visual === 'ten_frame' ? '#0369A1' : '#0E7490';
        return (
            <div className={`w-full h-full relative transition-transform ${isActive ? 'scale-105' : ''}`}>
                <SlotGrid capacity={target.capacity} columns={columns} filled={target.currentCount} accent={accent} border={border} />
                {counter}
            </div>
        );
    }

    if (visual === 'animal_plate') {
        return (
            <div className={`w-full h-full relative transition-transform ${isActive ? 'scale-105' : ''}`}>
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" aria-hidden="true">
                    <g transform="translate(0,-12) scale(0.85) translate(9,0)">{ANIMALS[target.animal ?? 'camel']}</g>
                    <ellipse cx="50" cy="90" rx="38" ry="10" fill="#FFFBEB" stroke="#B45309" strokeWidth="3" />
                </svg>
                {counter}
            </div>
        );
    }

    // Default: the classic basket.
    return (
        <div className={`w-full h-full relative transition-transform ${isActive ? 'scale-105' : ''}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible" aria-hidden="true">
                <BasketShape />
            </svg>
            {counter}
        </div>
    );
};
