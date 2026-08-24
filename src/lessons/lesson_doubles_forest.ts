import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Doubles in the forest: 4 apples on the left, drag 4 more to the right → 8.
 * Matches saga node n2_3b (NEW NODE — Doubles & near doubles).
 */

const BASKET: LessonTarget = {
    id: 'basket',
    position: { x: 72, y: 58 },
    capacity: 4,
    currentCount: 0,
    accepts: ['apple'],
    visual: 'basket',
    columns: 4,
    hideCounter: true,
};

const slot = (index: number) => ({
    x: BASKET.position.x + ((index % 4) - 1.5) * 7,
    y: BASKET.position.y,
});

const placedLeft = (index: number): LessonItem => ({
    id: `left_${index}`,
    type: 'apple',
    position: { x: 20 + (index % 4) * 7, y: 50 },
    interactive: false,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'apple',
    position: { x, y: 22 },
});

const placedRight = (index: number): LessonItem => ({
    id: `right_${index}`,
    type: 'apple',
    position: slot(index),
    interactive: false,
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.doublesForest.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'see_four',
        type: 'dialog',
        mascotText: 'lessons.doublesForest.seeFour',
        mascotEmotion: 'idle',
        items: [placedLeft(0), placedLeft(1), placedLeft(2), placedLeft(3)],
        targets: [],
    },
    {
        id: 'match_doubles',
        type: 'interactive_drag',
        mascotText: 'lessons.doublesForest.match',
        mascotEmotion: 'thinking',
        hint: 'lessons.doublesForest.hint',
        items: [
            placedLeft(0), placedLeft(1), placedLeft(2), placedLeft(3),
            loose('a1', 30), loose('a2', 45), loose('a3', 60), loose('a4', 85),
        ],
        targets: [BASKET],
        validationCriteria: (_items, targets) => targets[0].currentCount === 4,
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.doublesForest.conclusion',
        mascotEmotion: 'excited',
        items: [
            placedLeft(0), placedLeft(1), placedLeft(2), placedLeft(3),
            placedRight(0), placedRight(1), placedRight(2), placedRight(3),
        ],
        targets: [{ ...BASKET, currentCount: 4 }],
        showEquation: '4 + 4 = 8',
    },
];

export const DoublesForestLesson: LessonDefinition = {
    id: 'doubles_forest',
    title: 'lessons.doublesForest.title',
    theme: 'forest',
    operation: 'addition',
    steps,
};
