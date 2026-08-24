import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Missing addends: 3 apples in basket, need 5. Drag until 5.
 * Matches saga node n2_6 ("Missing Number" — 3 + ? = 5).
 */

const BASKET: LessonTarget = {
    id: 'basket',
    position: { x: 50, y: 58 },
    capacity: 5,
    currentCount: 0,
    accepts: ['apple'],
    visual: 'basket',
    columns: 5,
    hideCounter: true,
};

const slot = (index: number) => ({
    x: BASKET.position.x + ((index % 5) - 2) * 7,
    y: BASKET.position.y,
});

const placed = (index: number): LessonItem => ({
    id: `placed_${index}`,
    type: 'apple',
    position: slot(index),
    interactive: false,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'apple',
    position: { x, y: 22 },
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.missingAddends.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'see_three',
        type: 'dialog',
        mascotText: 'lessons.missingAddends.seeThree',
        mascotEmotion: 'idle',
        items: [placed(0), placed(1), placed(2)],
        targets: [{ ...BASKET, currentCount: 3 }],
    },
    {
        id: 'find_missing',
        type: 'interactive_drag',
        mascotText: 'lessons.missingAddends.find',
        mascotEmotion: 'thinking',
        hint: 'lessons.missingAddends.hint',
        items: [
            placed(0), placed(1), placed(2),
            loose('a1', 15), loose('a2', 30), loose('a3', 45),
            loose('a4', 60), loose('a5', 75),
        ],
        targets: [{ ...BASKET, currentCount: 3 }],
        validationCriteria: (_items, targets) => targets[0].currentCount === 5,
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.missingAddends.conclusion',
        mascotEmotion: 'excited',
        items: Array.from({ length: 5 }, (_, i) => placed(i)),
        targets: [{ ...BASKET, currentCount: 5 }],
        showEquation: '3 + 2 = 5',
    },
];

export const MissingAddendsLesson: LessonDefinition = {
    id: 'missing_addends',
    title: 'lessons.missingAddends.title',
    theme: 'forest',
    operation: 'addition',
    steps,
};
