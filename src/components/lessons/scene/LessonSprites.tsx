import React from 'react';
import type { DesertAnimal, LessonItemType, LessonTargetVisual } from '../../../types/lesson';
import type { ThemePalette } from './sceneThemes';

/**
 * Every sprite draws into a 0 0 100 100 viewBox so the scene can size them
 * uniformly and only the artwork differs per type.
 */
interface SpriteProps {
    type: LessonItemType;
    value?: number;
    animal?: DesertAnimal;
}

export const ItemSprite: React.FC<SpriteProps> = ({ type, value, animal }) => (
    <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md" aria-hidden="true">
        {SPRITE_ART[type]?.({ value, animal }) ?? SPRITE_ART.apple({ value, animal })}
    </svg>
);

type ArtFn = (props: { value?: number; animal?: DesertAnimal }) => React.ReactElement;

const Apple: ArtFn = () => (
    <g>
        <path d="M 50 90 Q 20 90 20 60 Q 20 30 50 40 Q 80 30 80 60 Q 80 90 50 90" fill="#EF4444" stroke="#991B1B" strokeWidth="2" />
        <path d="M 50 40 Q 40 10 70 10 Q 60 40 50 40" fill="#4ADE80" stroke="#166534" strokeWidth="2" />
        <circle cx="35" cy="55" r="3" fill="white" opacity="0.4" />
    </g>
);

const Basket: ArtFn = () => (
    <g>
        <path d="M 10 30 Q 50 100 90 30" fill="#D97706" stroke="#92400E" strokeWidth="3" />
        <ellipse cx="50" cy="30" rx="40" ry="10" fill="#F59E0B" stroke="#92400E" strokeWidth="3" />
    </g>
);

/** A fan-shaped scallop shell. Beach lesson counter for addition. */
const Seashell: ArtFn = () => (
    <g>
        <path d="M50 88 Q12 62 18 32 Q30 12 50 12 Q70 12 82 32 Q88 62 50 88 Z" fill="#FDA4AF" stroke="#BE123C" strokeWidth="2.5" />
        <path d="M50 88 L50 16 M50 88 Q32 58 34 24 M50 88 Q68 58 66 24 M50 88 Q20 60 22 34 M50 88 Q80 60 78 34"
            stroke="#F43F5E" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.75" />
        <ellipse cx="50" cy="86" rx="9" ry="5" fill="#FECDD3" stroke="#BE123C" strokeWidth="2" />
    </g>
);

/** Faceted gem. Mountain lesson counter for multiplication arrays. */
const Crystal: ArtFn = () => (
    <g>
        <path d="M50 8 L80 38 L62 90 L38 90 L20 38 Z" fill="#C084FC" stroke="#6B21A8" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M50 8 L62 90 L38 90 Z" fill="#E9D5FF" opacity="0.85" />
        <path d="M50 8 L20 38 L38 90 Z" fill="#A855F7" opacity="0.5" />
        <path d="M20 38 L80 38" stroke="#6B21A8" strokeWidth="2" opacity="0.6" />
        <circle cx="43" cy="30" r="4" fill="white" opacity="0.75" />
    </g>
);

/** A date fruit (תמר). Desert lesson counter for division. */
const DateFruit: ArtFn = () => (
    <g>
        <ellipse cx="50" cy="56" rx="24" ry="32" fill="#92400E" stroke="#451A03" strokeWidth="2.5" />
        <ellipse cx="50" cy="56" rx="14" ry="24" fill="#B45309" opacity="0.7" />
        <ellipse cx="41" cy="42" rx="5" ry="9" fill="#FDBA74" opacity="0.5" />
        <path d="M50 24 L50 16" stroke="#166534" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M50 18 Q40 12 34 18 Q44 22 50 18 Z" fill="#22C55E" stroke="#166534" strokeWidth="1.5" />
    </g>
);

/** The forest lesson's hungry bunny — taps remove apples "eaten". */
const Bunny: ArtFn = () => (
    <g>
        <ellipse cx="38" cy="30" rx="8" ry="20" fill="#F1F5F9" stroke="#64748B" strokeWidth="2.5" />
        <ellipse cx="62" cy="30" rx="8" ry="20" fill="#F1F5F9" stroke="#64748B" strokeWidth="2.5" />
        <ellipse cx="38" cy="30" rx="4" ry="13" fill="#FBCFE8" />
        <ellipse cx="62" cy="30" rx="4" ry="13" fill="#FBCFE8" />
        <circle cx="50" cy="64" r="26" fill="#F8FAFC" stroke="#64748B" strokeWidth="2.5" />
        <circle cx="40" cy="60" r="3.5" fill="#1E293B" />
        <circle cx="60" cy="60" r="3.5" fill="#1E293B" />
        <path d="M50 70 L46 74 h8 Z" fill="#FB7185" />
        <path d="M50 74 Q44 80 38 77 M50 74 Q56 80 62 77" stroke="#64748B" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
);

const Tree: ArtFn = () => (
    <g>
        <rect x="43" y="56" width="14" height="38" rx="4" fill="#92400E" stroke="#451A03" strokeWidth="2" />
        <circle cx="50" cy="40" r="26" fill="#22C55E" stroke="#166534" strokeWidth="2.5" />
        <circle cx="30" cy="52" r="16" fill="#16A34A" stroke="#166534" strokeWidth="2.5" />
        <circle cx="70" cy="52" r="16" fill="#4ADE80" stroke="#166534" strokeWidth="2.5" />
    </g>
);

const NumberSprite: ArtFn = ({ value }) => (
    <g>
        <circle cx="50" cy="50" r="40" fill="#FFFFFF" stroke="#6366F1" strokeWidth="5" />
        {/* dir="ltr": digits are LTR even inside a Hebrew UI. */}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="#4338CA" fontSize="46" fontWeight="bold" direction="ltr">
            {value ?? '?'}
        </text>
    </g>
);

/** A miniature 2x5 ten-frame used as a *sprite* (scenery/legend), not a target. */
const TenFrameSprite: ArtFn = () => (
    <g>
        <rect x="6" y="28" width="88" height="44" rx="4" fill="#FFFFFF" stroke="#0E7490" strokeWidth="3" />
        {[0, 1, 2, 3, 4].map(c => (
            <line key={c} x1={6 + (c + 1) * 17.6} y1="28" x2={6 + (c + 1) * 17.6} y2="72" stroke="#0E7490" strokeWidth="2" />
        ))}
        <line x1="6" y1="50" x2="94" y2="50" stroke="#0E7490" strokeWidth="2" />
    </g>
);

const ANIMAL_ART: Record<DesertAnimal, React.ReactElement> = {
    camel: (
        <g>
            <path d="M22 78 Q18 58 32 54 Q40 36 54 44 Q66 34 74 50 Q86 54 84 78" fill="#D9A066" stroke="#92400E" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M22 78 v10 M38 78 v10 M68 78 v10 M84 78 v10" stroke="#92400E" strokeWidth="4" strokeLinecap="round" />
            <path d="M84 62 Q92 46 82 34 Q76 28 70 32" fill="#D9A066" stroke="#92400E" strokeWidth="2.5" />
            <circle cx="80" cy="34" r="2.5" fill="#1E293B" />
        </g>
    ),
    fox: (
        <g>
            <path d="M30 40 L26 18 L44 30 Z" fill="#FB923C" stroke="#9A3412" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M70 40 L74 18 L56 30 Z" fill="#FB923C" stroke="#9A3412" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M50 84 Q22 74 26 48 Q38 32 50 34 Q62 32 74 48 Q78 74 50 84 Z" fill="#F97316" stroke="#9A3412" strokeWidth="2.5" />
            <path d="M50 84 Q34 70 38 54 Q46 48 50 50 Q54 48 62 54 Q66 70 50 84 Z" fill="#FFEDD5" opacity="0.9" />
            <circle cx="40" cy="56" r="3.5" fill="#1E293B" />
            <circle cx="60" cy="56" r="3.5" fill="#1E293B" />
            <path d="M50 68 L45 63 h10 Z" fill="#1E293B" />
        </g>
    ),
    lizard: (
        <g>
            <path d="M14 70 Q30 56 48 62 Q66 68 82 56 Q92 50 88 42" fill="none" stroke="#65A30D" strokeWidth="9" strokeLinecap="round" />
            <ellipse cx="46" cy="62" rx="22" ry="13" fill="#84CC16" stroke="#3F6212" strokeWidth="2.5" />
            <circle cx="72" cy="54" r="11" fill="#A3E635" stroke="#3F6212" strokeWidth="2.5" />
            <circle cx="76" cy="51" r="2.8" fill="#1E293B" />
            <path d="M34 72 l-8 10 M56 72 l8 10" stroke="#3F6212" strokeWidth="4" strokeLinecap="round" />
        </g>
    ),
};

const DesertAnimalSprite: ArtFn = ({ animal }) => ANIMAL_ART[animal ?? 'camel'];

const SPRITE_ART: Record<LessonItemType, ArtFn> = {
    apple: Apple,
    basket: Basket,
    number: NumberSprite,
    seashell: Seashell,
    crystal: Crystal,
    date: DateFruit,
    bunny: Bunny,
    tree: Tree,
    ten_frame: TenFrameSprite,
    desert_animal: DesertAnimalSprite,
};

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

interface TargetArtProps {
    visual: LessonTargetVisual;
    columns: number;
    rows: number;
    capacity: number;
    currentCount: number;
    animal?: DesertAnimal;
    palette: ThemePalette;
}

/**
 * Drop-zone artwork. The component fills its parent box, which the scene sizes
 * to exactly `columns x rows` engine slots — so the drawn cells line up with
 * where `LessonEngine.slotPosition` actually snaps a dropped item.
 */
export const TargetArt: React.FC<TargetArtProps> = ({ visual, columns, rows, capacity, currentCount, animal, palette }) => {
    if (visual === 'ten_frame' || visual === 'crystal_row') {
        const isFrame = visual === 'ten_frame';
        return (
            <div
                className="absolute inset-0 grid rounded-2xl p-1 shadow-lg"
                style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                    background: isFrame ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                    border: `4px solid ${palette.ink}`,
                }}
            >
                {Array.from({ length: capacity }, (_, i) => (
                    <div
                        key={i}
                        className="m-0.5 rounded-lg border-2 border-dashed transition-colors"
                        style={{
                            borderColor: i < currentCount ? 'transparent' : palette.slot,
                            background: i < currentCount ? 'transparent' : 'rgba(255,255,255,0.45)',
                        }}
                    />
                ))}
            </div>
        );
    }

    if (visual === 'animal_plate') {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-end">
                {/* The animal peeks above its plate; the plate is the visual floor of the drop box. */}
                <svg viewBox="0 0 100 100" className="h-3/4 w-3/4 drop-shadow-md" aria-hidden="true">
                    {ANIMAL_ART[animal ?? 'camel']}
                </svg>
                <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-6 w-full drop-shadow" aria-hidden="true">
                    <path d="M4 2 Q50 26 96 2 Z" fill={palette.ground} stroke={palette.ink} strokeWidth="3" />
                </svg>
            </div>
        );
    }

    // Default: the legacy basket. Kept centred at a comfortable minimum size so
    // a shallow (capacity 2) basket still reads as a basket.
    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="drop-shadow-xl" style={{ width: '100%', minWidth: 110, minHeight: 110 }} aria-hidden="true">
                <path d="M 10 30 Q 50 100 90 30" fill="#D97706" stroke="#92400E" strokeWidth="3" />
                <ellipse cx="50" cy="30" rx="40" ry="10" fill="#F59E0B" stroke="#92400E" strokeWidth="3" />
            </svg>
        </div>
    );
};
