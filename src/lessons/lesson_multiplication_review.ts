import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Multiplication tables review: 4 rows of 6 stars each → 24.
 * Matches saga node n5_8 ("Supernova").
 */

const ROW_X = [15, 38, 62, 85];
const ROW_Y = 50;

const row = (index: number): LessonTarget => ({
    id: `row${index + 1}`,
    position: { x: ROW_X[index], y: ROW_Y },
    capacity: 6,
    currentCount: 0,
    accepts: ['star'],
    visual: 'crystal_row',
    columns: 6,
    hideCounter: true,
});

const rows = (currentCount = 0) => ROW_X.map((_, i) => ({ ...row(i), currentCount }));

const slot = (rowIndex: number, column: number) => ({
    x: ROW_X[rowIndex] + (column - 2.5) * 4,
    y: ROW_Y,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'star',
    position: { x, y: 18 },
});

const placed = (rowIndex: number, column: number): LessonItem => ({
    id: `placed_${rowIndex}_${column}`,
    type: 'star',
    position: slot(rowIndex, column),
    interactive: false,
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.multiplicationReview.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'meet_grid',
        type: 'dialog',
        mascotText: 'lessons.multiplicationReview.setup',
        mascotEmotion: 'idle',
        items: [],
        targets: rows(),
    },
    {
        id: 'fill_grid',
        type: 'interactive_drag',
        mascotText: 'lessons.multiplicationReview.fill',
        mascotEmotion: 'thinking',
        hint: 'lessons.multiplicationReview.hint',
        items: Array.from({ length: 24 }, (_, i) => loose(`s${i+1}`, 5 + i * 3.8)),
        targets: rows(),
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 6),
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.multiplicationReview.conclusion',
        mascotEmotion: 'excited',
        items: ROW_X.flatMap((_, r) => Array.from({ length: 6 }, (_, c) => placed(r, c))),
        targets: rows(6),
        showEquation: '4 × 6 = 24',
    },
];

export const MultiplicationReviewLesson: LessonDefinition = {
    id: 'multiplication_review',
    title: 'lessons.multiplicationReview.title',
    theme: 'space',
    operation: 'multiplication',
    steps,
};
