import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Times 5 skip counting: 3 shelves, fill each with 5 crystals → 15.
 * Matches saga node n3_5 ("Times Five").
 */

const ROW_X = [22, 50, 78];
const ROW_Y = 55;

const row = (index: number): LessonTarget => ({
    id: `row${index + 1}`,
    position: { x: ROW_X[index], y: ROW_Y },
    capacity: 5,
    currentCount: 0,
    accepts: ['crystal'],
    visual: 'crystal_row',
    columns: 5,
    hideCounter: true,
});

const rows = (currentCount = 0) => ROW_X.map((_, i) => ({ ...row(i), currentCount }));

const slot = (rowIndex: number, column: number) => ({
    x: ROW_X[rowIndex] + (column - 2) * 5,
    y: ROW_Y,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'crystal',
    position: { x, y: 18 },
});

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
        mascotText: 'lessons.timesFiveSkip.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'meet_shelves',
        type: 'dialog',
        mascotText: 'lessons.timesFiveSkip.setup',
        mascotEmotion: 'idle',
        items: [],
        targets: rows(),
    },
    {
        id: 'fill_shelves',
        type: 'interactive_drag',
        mascotText: 'lessons.timesFiveSkip.fill',
        mascotEmotion: 'thinking',
        hint: 'lessons.timesFiveSkip.hint',
        items: Array.from({ length: 15 }, (_, i) => loose(`c${i+1}`, 8 + i * 5.5)),
        targets: rows(),
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 5),
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.timesFiveSkip.conclusion',
        mascotEmotion: 'excited',
        items: ROW_X.flatMap((_, r) => Array.from({ length: 5 }, (_, c) => seated(r, c))),
        targets: rows(5),
        showEquation: '3 × 5 = 15',
    },
];

export const TimesFiveSkipLesson: LessonDefinition = {
    id: 'times_five_skip',
    title: 'lessons.timesFiveSkip.title',
    theme: 'mountain',
    operation: 'multiplication',
    steps,
};
