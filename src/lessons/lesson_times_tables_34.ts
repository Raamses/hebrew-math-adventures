import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Times tables 3 & 4: 3 rows of 4 dates each → 12.
 * Matches saga node n4_3a (NEW NODE — Times tables 3 & 4 arrays).
 */

const ROW_X = [22, 50, 78];
const ROW_Y = 55;

const row = (index: number): LessonTarget => ({
    id: `row${index + 1}`,
    position: { x: ROW_X[index], y: ROW_Y },
    capacity: 4,
    currentCount: 0,
    accepts: ['date'],
    visual: 'crystal_row',
    columns: 4,
    hideCounter: true,
});

const rows = (currentCount = 0) => ROW_X.map((_, i) => ({ ...row(i), currentCount }));

const slot = (rowIndex: number, column: number) => ({
    x: ROW_X[rowIndex] + (column - 1.5) * 6,
    y: ROW_Y,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'date',
    position: { x, y: 18 },
});

const seated = (rowIndex: number, column: number): LessonItem => ({
    id: `seated_${rowIndex}_${column}`,
    type: 'date',
    position: slot(rowIndex, column),
    interactive: false,
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.timesTables34.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'meet_rows',
        type: 'dialog',
        mascotText: 'lessons.timesTables34.setup',
        mascotEmotion: 'idle',
        items: [],
        targets: rows(),
    },
    {
        id: 'fill_rows',
        type: 'interactive_drag',
        mascotText: 'lessons.timesTables34.fill',
        mascotEmotion: 'thinking',
        hint: 'lessons.timesTables34.hint',
        items: Array.from({ length: 12 }, (_, i) => loose(`d${i+1}`, 8 + i * 7)),
        targets: rows(),
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 4),
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.timesTables34.conclusion',
        mascotEmotion: 'excited',
        items: ROW_X.flatMap((_, r) => Array.from({ length: 4 }, (_, c) => seated(r, c))),
        targets: rows(4),
        showEquation: '3 × 4 = 12',
    },
];

export const TimesTables34Lesson: LessonDefinition = {
    id: 'times_tables_34',
    title: 'lessons.timesTables34.title',
    theme: 'desert',
    operation: 'multiplication',
    steps,
};
