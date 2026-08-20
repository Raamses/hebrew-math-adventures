import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Making 10 strategy: fill a ten-frame to 10, first from 7 (need 3), then from 6 (need 4).
 * Matches saga node n2_3 ("Addition 20" — repurposed as making-10 lesson).
 */

const FRAME: LessonTarget = {
    id: 'frame',
    position: { x: 50, y: 58 },
    capacity: 10,
    currentCount: 0,
    accepts: ['apple'],
    visual: 'ten_frame',
    columns: 5,
    hideCounter: true,
};

const slot = (index: number) => ({
    x: FRAME.position.x + ((index % 5) - 2) * 7,
    y: FRAME.position.y + (Math.floor(index / 5) - 0.5) * 14,
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
    position: { x, y: 20 },
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.makingTen.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'add_to_ten_from_seven',
        type: 'interactive_drag',
        mascotText: 'lessons.makingTen.add',
        mascotEmotion: 'thinking',
        hint: 'lessons.makingTen.hint',
        items: [
            placed(0), placed(1), placed(2), placed(3), placed(4),
            placed(5), placed(6),
            loose('a1', 15), loose('a2', 30), loose('a3', 45),
            loose('a4', 60), loose('a5', 75),
        ],
        targets: [{ ...FRAME, currentCount: 7 }],
        validationCriteria: (_items, targets) => targets[0].currentCount === 10,
    },
    {
        id: 'see_equation_7',
        type: 'dialog',
        mascotText: 'lessons.makingTen.equation',
        mascotEmotion: 'excited',
        items: Array.from({ length: 10 }, (_, i) => placed(i)),
        targets: [{ ...FRAME, currentCount: 10 }],
        showEquation: '7 + 3 = 10',
    },
    {
        id: 'try_from_six',
        type: 'interactive_drag',
        mascotText: 'lessons.makingTen.tryAnother',
        mascotEmotion: 'thinking',
        hint: 'lessons.makingTen.hint',
        items: [
            placed(0), placed(1), placed(2), placed(3), placed(4),
            placed(5),
            loose('b1', 12), loose('b2', 26), loose('b3', 40),
            loose('b4', 54), loose('b5', 68), loose('b6', 82),
        ],
        targets: [{ ...FRAME, currentCount: 6 }],
        validationCriteria: (_items, targets) => targets[0].currentCount === 10,
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.makingTen.conclusion',
        mascotEmotion: 'excited',
        items: Array.from({ length: 10 }, (_, i) => placed(i)),
        targets: [{ ...FRAME, currentCount: 10 }],
        showEquation: '6 + 4 = 10',
    },
];

export const MakingTenLesson: LessonDefinition = {
    id: 'making_ten',
    title: 'lessons.makingTen.title',
    theme: 'forest',
    operation: 'addition',
    steps,
};
