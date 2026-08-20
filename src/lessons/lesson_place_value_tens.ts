import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Place value with tens: fill a ten-frame with 10 seashells, see 2 remain.
 * Matches saga node n1_3b (NEW NODE — Place value: tens and ones).
 */

const FRAME: LessonTarget = {
    id: 'frame',
    position: { x: 30, y: 58 },
    capacity: 10,
    currentCount: 0,
    accepts: ['seashell'],
    visual: 'ten_frame',
    columns: 5,
    hideCounter: true,
};


const slot = (index: number) => ({
    x: FRAME.position.x + ((index % 5) - 2) * 7,
    y: FRAME.position.y + (Math.floor(index / 5) - 0.5) * 14,
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
        mascotText: 'lessons.placeValueTens.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'fill_ten_frame',
        type: 'interactive_drag',
        mascotText: 'lessons.placeValueTens.fillFrame',
        mascotEmotion: 'thinking',
        hint: 'lessons.placeValueTens.hintFill',
        items: Array.from({ length: 12 }, (_, i) => loose(`s${i+1}`, 10 + i * 6.5)),
        targets: [FRAME],
        validationCriteria: (_items, targets) => targets[0].currentCount === 10,
    },
    {
        id: 'see_remainder',
        type: 'dialog',
        mascotText: 'lessons.placeValueTens.seeRemainder',
        mascotEmotion: 'excited',
        items: Array.from({ length: 10 }, (_, i) => placed(i)),
        targets: [{ ...FRAME, currentCount: 10 }],
        showEquation: '10 + 2 = 12',
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.placeValueTens.conclusion',
        mascotEmotion: 'excited',
        items: Array.from({ length: 10 }, (_, i) => placed(i)),
        targets: [{ ...FRAME, currentCount: 10 }],
        showEquation: '12 = עשר ועוד שתיים',
    },
];

export const PlaceValueTensLesson: LessonDefinition = {
    id: 'place_value_tens',
    title: 'lessons.placeValueTens.title',
    theme: 'beach',
    operation: 'addition',
    steps,
};
