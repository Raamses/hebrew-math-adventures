import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Counting seashells 1-5: drag seashells into a basket to learn counting.
 * Matches saga node n1_2 ("Count to 5").
 */

const BASKET: LessonTarget = {
    id: 'basket',
    position: { x: 50, y: 62 },
    capacity: 5,
    currentCount: 0,
    accepts: ['seashell'],
    visual: 'basket',
    columns: 5,
    hideCounter: true,
};

const slot = (index: number) => ({
    x: BASKET.position.x + ((index % 5) - 2) * 7,
    y: BASKET.position.y,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'seashell',
    position: { x, y: 20 },
});

const placed = (index: number): LessonItem => ({
    id: `placed_${index}`,
    type: 'seashell',
    position: slot(index),
    interactive: false,
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.countingSeashells.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'count_five',
        type: 'interactive_drag',
        mascotText: 'lessons.countingSeashells.countFive',
        mascotEmotion: 'thinking',
        hint: 'lessons.countingSeashells.hintCount',
        items: [
            loose('s1', 15), loose('s2', 30), loose('s3', 45),
            loose('s4', 60), loose('s5', 75),
        ],
        targets: [BASKET],
        validationCriteria: (_items, targets) => targets[0].currentCount === 5,
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.countingSeashells.conclusion',
        mascotEmotion: 'excited',
        items: Array.from({ length: 5 }, (_, i) => placed(i)),
        targets: [{ ...BASKET, currentCount: 5 }],
        showEquation: '1, 2, 3, 4, 5',
    },
];

export const CountingSeashellsLesson: LessonDefinition = {
    id: 'counting_seashells',
    title: 'lessons.countingSeashells.title',
    theme: 'beach',
    operation: 'addition',
    steps,
};
