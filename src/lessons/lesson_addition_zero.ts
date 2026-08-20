import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Addition with zero (identity): 5 stars already placed, no more to add → 5 + 0 = 5.
 * Matches saga node n5_2 ("Zero Gravity").
 * The interactive step requires dragging 0 items — the child taps "next" to
 * see that nothing changes. Teaches the identity property.
 */

const ROW: LessonTarget = {
    id: 'row',
    position: { x: 50, y: 55 },
    capacity: 5,
    currentCount: 5,
    accepts: ['star'],
    visual: 'crystal_row',
    columns: 5,
    hideCounter: true,
};

const slot = (index: number) => ({
    x: ROW.position.x + (index - 2) * 5,
    y: ROW.position.y,
});

const placed = (index: number): LessonItem => ({
    id: `placed_${index}`,
    type: 'star',
    position: slot(index),
    interactive: false,
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.additionZero.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'see_five',
        type: 'dialog',
        mascotText: 'lessons.additionZero.seeFive',
        mascotEmotion: 'idle',
        items: Array.from({ length: 5 }, (_, i) => placed(i)),
        targets: [{ ...ROW, currentCount: 5 }],
    },
    {
        id: 'add_zero',
        type: 'interactive_drag',
        mascotText: 'lessons.additionZero.addZero',
        mascotEmotion: 'thinking',
        hint: 'lessons.additionZero.hint',
        items: Array.from({ length: 5 }, (_, i) => placed(i)),
        targets: [{ ...ROW, currentCount: 5 }],
        validationCriteria: (_items, targets) => targets[0].currentCount === 5,
        showEquation: '5 + 0 = ?',
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.additionZero.conclusion',
        mascotEmotion: 'excited',
        items: Array.from({ length: 5 }, (_, i) => placed(i)),
        targets: [{ ...ROW, currentCount: 5 }],
        showEquation: '5 + 0 = 5',
    },
];

export const AdditionZeroLesson: LessonDefinition = {
    id: 'addition_zero',
    title: 'lessons.additionZero.title',
    theme: 'space',
    operation: 'addition',
    steps,
};
