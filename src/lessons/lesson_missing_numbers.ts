import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Missing numbers in sequence: find which number fits the gap.
 * Matches saga node n1_7 ("Missing Link").
 * Uses number sprites and a basket target — simple drag the right number.
 */

const SLOT: LessonTarget = {
    id: 'gap',
    position: { x: 50, y: 60 },
    capacity: 1,
    currentCount: 0,
    accepts: ['number'],
    visual: 'basket',
    columns: 1,
    hideCounter: true,
};

const numLoose = (id: string, x: number, value: number): LessonItem => ({
    id,
    type: 'number',
    position: { x, y: 22 },
    value,
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.missingNumbers.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'show_sequence',
        type: 'dialog',
        mascotText: 'lessons.missingNumbers.showSequence',
        mascotEmotion: 'idle',
        items: [
            { id: 'n1', type: 'number', position: { x: 20, y: 50 }, value: 1, interactive: false },
            { id: 'n2', type: 'number', position: { x: 35, y: 50 }, value: 2, interactive: false },
            { id: 'n4', type: 'number', position: { x: 65, y: 50 }, value: 4, interactive: false },
            { id: 'n5', type: 'number', position: { x: 80, y: 50 }, value: 5, interactive: false },
        ],
        targets: [],
    },
    {
        id: 'find_missing',
        type: 'interactive_drag',
        mascotText: 'lessons.missingNumbers.find',
        mascotEmotion: 'thinking',
        hint: 'lessons.missingNumbers.hint',
        items: [
            { id: 'n1', type: 'number', position: { x: 20, y: 50 }, value: 1, interactive: false },
            { id: 'n2', type: 'number', position: { x: 35, y: 50 }, value: 2, interactive: false },
            numLoose('n3a', 20, 3), numLoose('n3b', 40, 6), numLoose('n3c', 60, 7),
            { id: 'n4', type: 'number', position: { x: 65, y: 50 }, value: 4, interactive: false },
            { id: 'n5', type: 'number', position: { x: 80, y: 50 }, value: 5, interactive: false },
        ],
        targets: [SLOT],
        validationCriteria: (_items, targets) => targets[0].currentCount === 1,
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.missingNumbers.conclusion',
        mascotEmotion: 'excited',
        items: [
            { id: 'n1', type: 'number', position: { x: 15, y: 50 }, value: 1, interactive: false },
            { id: 'n2', type: 'number', position: { x: 30, y: 50 }, value: 2, interactive: false },
            { id: 'n3', type: 'number', position: { x: 50, y: 60 }, value: 3, interactive: false },
            { id: 'n4', type: 'number', position: { x: 70, y: 50 }, value: 4, interactive: false },
            { id: 'n5', type: 'number', position: { x: 85, y: 50 }, value: 5, interactive: false },
        ],
        targets: [{ ...SLOT, currentCount: 1 }],
        showEquation: '1, 2, 3, 4, 5',
    },
];

export const MissingNumbersLesson: LessonDefinition = {
    id: 'missing_numbers',
    title: 'lessons.missingNumbers.title',
    theme: 'beach',
    operation: 'addition',
    steps,
};
