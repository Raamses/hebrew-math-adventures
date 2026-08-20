/**
 * ModeSelectorPage — Full-screen mode selector page (replaces ModeSelectorOverlay).
 *
 * Model: ollama-cloud/glm-5.2 (fallback)
 *
 * NOTE ON DELEGATION: This card requires analysis delegation to a stronger model via
 * `ask-claude --escalate --card`. Both Claude (session limit reached — resets 1:30pm)
 * and Gemini CLI (IneligibleTierError — Gemini Code Assist no longer supported) were
 * unavailable at the time of this run. The artifact was produced by the builder model
 * (glm-5.2) as a fallback. Re-run the card after 1:30pm for a Claude-verified version.
 *
 * DESIGN:
 * - Replaces the framer-motion AnimatePresence popup with a proper full-screen page.
 * - No pop-in animations, no Cancel/X button — uses a Back button instead.
 * - Mobile-first: single column on mobile, responsive grid on larger screens.
 * - Supports two "variants" via the `variant` prop:
 *   - "math": shows the 5 math practice modes (STANDARD, TIME_ATTACK, SURVIVAL, MEMORY, INVADERS)
 *   - "arcade": shows the 5 bubble arcade modes (zen, classic, blitz, survival, fusion)
 * - Uses lucide-react icons consistently (no emoji-from-labels mixing).
 * - CSS-only transitions (hover/active states) — no framer-motion dependency.
 * - RTL/LTR aware via i18next dir().
 * - Accessible: keyboard navigable, aria-labels, semantic HTML.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, Calculator, Heart, Trophy, Layers, Rocket, Target, Zap, Flame, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ARCADE_MODE_LABELS } from '../../lib/arcadeModes';

// --- Types ---

/** Math practice modes (used by PracticeMode) */
import type { GameMode } from '../../hooks/usePracticeSession';
/** Bubble arcade modes (used by SagaMap / BubbleGame) */
import type { ArcadeMode } from '../../engines/bubble/types';

type SelectorVariant = 'math' | 'arcade';

interface ModeSelectorPageProps {
    /** Which set of modes to display */
    variant: SelectorVariant;
    /** Called when the user picks a mode */
    onSelectMode: (mode: string) => void;
    /** Called when the user taps the back button */
    onBack: () => void;
    /** Best scores for display (math variant: keyed by GameMode; arcade variant: keyed by ArcadeMode) */
    bestScores?: Record<string, number>;
}

// --- Mode Definitions ---

interface ModeDef {
    /** The mode identifier passed to onSelectMode */
    id: string;
    /** i18n key for the title (falls back to ARCADE_MODE_LABELS for arcade variant) */
    titleKey?: string;
    /** i18n key for the description */
    descKey?: string;
    /** Lucide icon component */
    icon: React.ElementType;
    /** Tailwind color classes for the icon bubble */
    color: string;
    /** Test id for E2E */
    testId: string;
}

const MATH_MODES: ModeDef[] = [
    {
        id: 'STANDARD',
        titleKey: 'practice.zen.title',
        descKey: 'practice.zen.desc',
        icon: Calculator,
        color: 'bg-blue-500',
        testId: 'mode-card-STANDARD',
    },
    {
        id: 'TIME_ATTACK',
        titleKey: 'practice.time.title',
        descKey: 'practice.time.desc',
        icon: Clock,
        color: 'bg-orange-500',
        testId: 'mode-card-TIME_ATTACK',
    },
    {
        id: 'SURVIVAL',
        titleKey: 'practice.survival.title',
        descKey: 'practice.survival.desc',
        icon: Heart,
        color: 'bg-rose-500',
        testId: 'mode-card-SURVIVAL',
    },
    {
        id: 'MEMORY',
        titleKey: 'memory.title',
        descKey: 'memory.selectMode',
        icon: Layers,
        color: 'bg-violet-500',
        testId: 'mode-card-MEMORY',
    },
    {
        id: 'INVADERS',
        titleKey: 'invaders.title',
        descKey: 'invaders.selectMode',
        icon: Rocket,
        color: 'bg-indigo-500',
        testId: 'mode-card-INVADERS',
    },
];

const ARCADE_ICONS: Record<string, React.ElementType> = {
    zen: Target,
    classic: Calculator,
    blitz: Zap,
    survival: Flame,
    fusion: Sparkles,
};

const ARCADE_COLORS: Record<string, string> = {
    zen: 'bg-emerald-500',
    classic: 'bg-blue-500',
    blitz: 'bg-amber-500',
    survival: 'bg-rose-500',
    fusion: 'bg-violet-500',
};

function getArcadeModes(): ModeDef[] {
    return (['zen', 'classic', 'blitz', 'survival', 'fusion'] as ArcadeMode[]).map(mode => {
        const label = ARCADE_MODE_LABELS[mode];
        return {
            id: mode,
            titleKey: undefined, // Use ARCADE_MODE_LABELS directly
            descKey: undefined,
            icon: ARCADE_ICONS[mode] || Target,
            color: ARCADE_COLORS[mode] || 'bg-slate-500',
            testId: `arcade-mode-${mode}`,
        };
    });
}

// --- ModeCard ---

interface ModeCardProps {
    mode: ModeDef;
    title: string;
    description: string;
    bestScore?: number;
    onSelect: (id: string) => void;
}

const ModeCard: React.FC<ModeCardProps> = ({ mode, title, description, bestScore, onSelect }) => {
    const { t } = useTranslation();
    const Icon = mode.icon;

    return (
        <button
            data-testid={mode.testId}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(mode.id);
                }
            }}
            onClick={() => onSelect(mode.id)}
            className="group relative w-full min-h-[12rem] bg-white rounded-3xl p-5 sm:p-6
                       flex flex-col items-center text-center justify-between
                       shadow-lg border-2 border-transparent hover:border-slate-200
                       transition-all duration-200 hover:shadow-xl hover:scale-[1.02]
                       focus:outline-none focus:ring-4 focus:ring-blue-300/50"
            aria-label={title}
        >
            {/* Icon Bubble */}
            <div className={cn('w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 shrink-0', mode.color, 'bg-opacity-10')}>
                <Icon size={36} className={cn(mode.color.replace('bg-', 'text-'))} />
            </div>

            {/* Title + Description */}
            <div className="space-y-1.5 z-10 flex-grow flex flex-col justify-center">
                <h3 dir="auto" className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
                <p dir="auto" className="text-slate-500 font-medium text-sm leading-snug">{description}</p>
            </div>

            {/* High Score Badge */}
            <div className="mt-4 flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full shrink-0">
                <Trophy size={14} className="text-yellow-500" />
                <span dir="auto" className="text-xs font-bold text-slate-600">
                    {bestScore !== undefined && bestScore > 0
                        ? t('practice.bestScore', { score: bestScore })
                        : t('practice.noRecord', 'No Record')}
                </span>
            </div>
        </button>
    );
};

// --- ModeSelectorPage ---

export const ModeSelectorPage: React.FC<ModeSelectorPageProps> = ({
    variant,
    onSelectMode,
    onBack,
    bestScores,
}) => {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.dir() === 'rtl';

    const modes = variant === 'math' ? MATH_MODES : getArcadeModes();
    const headerTitle = variant === 'math'
        ? t('practice.chooseMode', 'Choose Your Challenge')
        : t('app.arcade', 'Arcade');
    const headerDesc = variant === 'math'
        ? t('practice.chooseModeDesc', 'Select how you want to play today')
        : t('practice.chooseModeDesc', 'Select how you want to play today');

    return (
        <div
            data-testid="mode-selector-page"
            className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex flex-col"
            dir={i18n.dir()}
        >
            {/* Top Bar with Back Button */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label={t('onboarding.back', 'Back')}
                    >
                        {isRtl ? (
                            <ArrowLeft size={24} className="rotate-180" />
                        ) : (
                            <ArrowLeft size={24} />
                        )}
                        <span className="font-bold text-sm sm:text-base">
                            {t('onboarding.back', 'Back')}
                        </span>
                    </button>
                </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
                {/* Header */}
                <div className="mb-8 md:mb-12 text-center">
                    <h1 dir="auto" className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 mb-2 tracking-tight">
                        {headerTitle}
                    </h1>
                    <p dir="auto" className="text-slate-500 font-medium text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
                        {headerDesc}
                    </p>
                </div>

                {/* Mode Cards Grid */}
                <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                    {modes.map((mode) => {
                        // Resolve title and description
                        let title: string;
                        let description: string;

                        if (variant === 'math') {
                            title = t(mode.titleKey!, mode.id);
                            description = t(mode.descKey!, '');
                        } else {
                            // Arcade variant: use ARCADE_MODE_LABELS for name/desc
                            const label = ARCADE_MODE_LABELS[mode.id];
                            title = label?.name ?? mode.id;
                            description = label?.desc ?? '';
                        }

                        return (
                            <ModeCard
                                key={mode.id}
                                mode={mode}
                                title={title}
                                description={description}
                                bestScore={bestScores?.[mode.id]}
                                onSelect={onSelectMode}
                            />
                        );
                    })}
                </div>

                {/* Keyboard Hint (math variant only) */}
                {variant === 'math' && (
                    <p dir="auto" className="mt-8 text-slate-400 font-medium text-sm sm:text-base text-center">
                        {t('game.tip')} {t('practice.keyboardHint', 'Prefer typing? Try Practice Mode for keyboard-friendly play')}
                    </p>
                )}
            </main>
        </div>
    );
};
