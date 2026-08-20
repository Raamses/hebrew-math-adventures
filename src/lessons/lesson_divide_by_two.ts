import type { LessonDefinition, LessonStep, LessonItem, LessonTarget, DesertAnimal } from '../types/lesson';

/**
 * Divide by 2: 8 dates shared between 2 camels → 4 each.
 * Matches saga node n4_2 ("Divide by 2").
 */

const GUESTS: { id: string; animal: DesertAnimal; x: number; label: string }[] = [
    { id: 'camel1', animal: 'camel', x: 30, label: 'lessons.divideByTwo.camel1' },
    { id: 'camel2', animal: 'camel', x: 70, label: 'lessons.divideByTwo.camel2' },
];

const PLATE_Y = 66;

const plate = (guest: (typeof GUESTS)[number], currentCount = 0): LessonTarget => ({
    id: guest.id,
    position: { x: guest.x, y: PLATE_Y },
    capacity: 4,
    currentCount,
    accepts: ['date'],
    visual: 'animal_plate',
    animal: guest.animal,
    label: guest.label,
    columns: 4,
    hideCounter: true,
});

const plates = (currentCount = 0) => GUESTS.map(g => plate(g, currentCount));

const slot = (guestIndex: number, column: number) => ({
    x: GUESTS[guestIndex].x + (column - 1.5) * 6,
    y: PLATE_Y,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'date',
    position: { x, y: 20 },
});

const served = (guestIndex: number, column: number): LessonItem => ({
    id: `served_${guestIndex}_${column}`,
    type: 'date',
    position: slot(guestIndex, column),
    interactive: false,
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.divideByTwo.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'meet_camels',
        type: 'dialog',
        mascotText: 'lessons.divideByTwo.setup',
        mascotEmotion: 'idle',
        items: [],
        targets: plates(),
    },
    {
        id: 'share_dates',
        type: 'interactive_drag',
        mascotText: 'lessons.divideByTwo.share',
        mascotEmotion: 'thinking',
        hint: 'lessons.divideByTwo.hint',
        items: Array.from({ length: 8 }, (_, i) => loose(`d${i+1}`, 10 + i * 10)),
        targets: plates(),
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 4),
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.divideByTwo.conclusion',
        mascotEmotion: 'excited',
        items: GUESTS.flatMap((_, g) => Array.from({ length: 4 }, (_, c) => served(g, c))),
        targets: plates(4),
        showEquation: '8 ÷ 2 = 4',
    },
];

export const DivideByTwoLesson: LessonDefinition = {
    id: 'divide_by_two',
    title: 'lessons.divideByTwo.title',
    theme: 'desert',
    operation: 'division',
    steps,
};
