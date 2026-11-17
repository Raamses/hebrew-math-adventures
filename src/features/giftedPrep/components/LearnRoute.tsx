'use client';
import { useState } from 'react';
import type { PrepItem, PrepSection } from '../types';
import { buildAdaptiveMath } from '../engine/adaptive';
import { getSectionBuilder } from '../engine/sections';
import { mulberry32, newSeed } from '../engine/prng';
import { usePrepProgress } from '../context/PrepProgressContext';
import { LearnSession } from './LearnSession';

/** Learning sessions are short: 10–12 items (plan §3); math is adaptive and slightly longer (G7.3). */
export const LEARN_COUNT = 12;

interface LearnRouteProps {
    readonly section: PrepSection;
    readonly onAgain: () => void;
    readonly onExit: () => void;
}

/** Builds one session's items once (fresh crypto seed per run), then hands them to the player. */
export function LearnRoute({ section, onAgain, onExit }: LearnRouteProps) {
    const { progress } = usePrepProgress();
    const [items] = useState<readonly PrepItem[]>(() => {
        if (section === 'math') return buildAdaptiveMath(mulberry32(newSeed()), progress);
        const build = getSectionBuilder(section);
        return build ? build(mulberry32(newSeed()), LEARN_COUNT, new Set(progress.seenIds)) : [];
    });
    return <LearnSession section={section} items={items} onAgain={onAgain} onExit={onExit} />;
}
