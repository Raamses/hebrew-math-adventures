import type { LessonDefinition, LessonStep, LessonItem } from '../types/lesson';
import { activeItems } from '../types/lesson';

/**
 * Subtraction by counting back: 8 crystals, tap to remove 3 → 5 remain.
 * Matches saga node n3_3 ("Times Two" — repurposed as subtraction counting back).
 * Uses interactive_tap, same pattern as SubtractionForestLesson.
 */

const crystal = (index: number): LessonItem => ({
    id: `crystal_${index + 1}`,
    type: 'crystal',
    position: { x: 15 + (index % 4) * 24, y: 30 + Math.floor(index / 4) * 18 },
    tapAction: 'remove',
});

const crystals = (count: number) => Array.from({ length: count }, (_, i) => crystal(i));

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.subtractionCountback.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'see_crystals',
        type: 'dialog',
        mascotText: 'lessons.subtractionCountback.seeCrystals',
        mascotEmotion: 'idle',
        items: crystals(8),
        targets: [],
    },
    {
        id: 'remove_three',
        type: 'interactive_tap',
        mascotText: 'lessons.subtractionCountback.action',
        mascotEmotion: 'thinking',
        hint: 'lessons.subtractionCountback.hint',
        items: crystals(8),
        targets: [],
        tapGoal: 3,
        validationCriteria: items => activeItems(items).filter(i => i.type === 'crystal').length === 5,
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.subtractionCountback.conclusion',
        mascotEmotion: 'excited',
        items: crystals(5),
        targets: [],
        showEquation: '8 − 3 = 5',
    },
];

export const SubtractionCountbackLesson: LessonDefinition = {
    id: 'subtraction_countback',
    title: 'lessons.subtractionCountback.title',
    theme: 'mountain',
    operation: 'subtraction',
    steps,
};
