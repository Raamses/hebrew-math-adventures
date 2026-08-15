import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Multiplication on the mountain: 3 crystal sockets, 2 crystals in each → 6.
 *
 * Matches saga node n3_1 ("Groups of 2"). The three identical rows are the
 * whole idea — equal groups, counted once as "3 times 2".
 */

const ROW_X = [22, 50, 78];
const ROW_Y = 62;

const row = (index: number): LessonTarget => ({
    id: `row${index + 1}`,
    position: { x: ROW_X[index], y: ROW_Y },
    capacity: 2,
    currentCount: 0,
    accepts: ['crystal'],
    visual: 'crystal_row',
    columns: 2,
    hideCounter: true,
});

const rows = (currentCount = 0) => ROW_X.map((_, i) => ({ ...row(i), currentCount }));

/** Mirrors `LessonEngine.slotPosition` for a 2-wide row. */
const slot = (rowIndex: number, column: number) => ({
    x: ROW_X[rowIndex] + (column - 0.5) * 7,
    y: ROW_Y,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'crystal',
    position: { x, y: 22 },
});

/** A crystal already seated in a socket: visible, inert, not re-draggable. */
const seated = (rowIndex: number, column: number): LessonItem => ({
    id: `seated_${rowIndex}_${column}`,
    type: 'crystal',
    position: slot(rowIndex, column),
    interactive: false,
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.multiplicationMountain.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'meet_sockets',
        type: 'dialog',
        mascotText: 'lessons.multiplicationMountain.setup',
        mascotEmotion: 'idle',
        items: [],
        targets: rows(),
    },
    {
        id: 'fill_rows',
        type: 'interactive_drag',
        mascotText: 'lessons.multiplicationMountain.action',
        mascotEmotion: 'thinking',
        hint: 'lessons.multiplicationMountain.hintAction',
        items: [
            loose('c1', 12), loose('c2', 26), loose('c3', 40),
            loose('c4', 54), loose('c5', 68), loose('c6', 82),
        ],
        targets: rows(),
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 2),
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.multiplicationMountain.conclusion',
        mascotEmotion: 'excited',
        items: ROW_X.flatMap((_, r) => [seated(r, 0), seated(r, 1)]),
        targets: rows(2),
        showEquation: '3 × 2 = 6',
    },
];

export const MultiplicationMountainLesson: LessonDefinition = {
    id: 'multiplication_mountain',
    title: 'lessons.multiplicationMountain.title',
    theme: 'mountain',
    operation: 'multiplication',
    steps,
};
