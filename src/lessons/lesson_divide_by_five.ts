import type { LessonDefinition, LessonStep, LessonItem, LessonTarget, DesertAnimal } from '../types/lesson';

/**
 * Divide by 5 (grouping): 15 dates shared among 3 animals → 5 each.
 * Matches saga node n4_5 ("Divide by 5").
 */

const GUESTS: { id: string; animal: DesertAnimal; x: number; label: string }[] = [
    { id: 'camel', animal: 'camel', x: 20, label: 'lessons.divideByFive.camel' },
    { id: 'fox', animal: 'fox', x: 50, label: 'lessons.divideByFive.fox' },
    { id: 'lizard', animal: 'lizard', x: 80, label: 'lessons.divideByFive.lizard' },
];

const PLATE_Y = 66;

const plate = (guest: (typeof GUESTS)[number], currentCount = 0): LessonTarget => ({
    id: guest.id,
    position: { x: guest.x, y: PLATE_Y },
    capacity: 5,
    currentCount,
    accepts: ['date'],
    visual: 'animal_plate',
    animal: guest.animal,
    label: guest.label,
    columns: 5,
    hideCounter: true,
});

const plates = (currentCount = 0) => GUESTS.map(g => plate(g, currentCount));

const slot = (guestIndex: number, column: number) => ({
    x: GUESTS[guestIndex].x + (column - 2) * 5,
    y: PLATE_Y,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'date',
    position: { x, y: 18 },
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
        mascotText: 'lessons.divideByFive.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'meet_animals',
        type: 'dialog',
        mascotText: 'lessons.divideByFive.setup',
        mascotEmotion: 'idle',
        items: [],
        targets: plates(),
    },
    {
        id: 'share_fairly',
        type: 'interactive_drag',
        mascotText: 'lessons.divideByFive.share',
        mascotEmotion: 'thinking',
        hint: 'lessons.divideByFive.hint',
        items: Array.from({ length: 15 }, (_, i) => loose(`d${i+1}`, 5 + i * 6)),
        targets: plates(),
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 5),
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.divideByFive.conclusion',
        mascotEmotion: 'excited',
        items: GUESTS.flatMap((_, g) => Array.from({ length: 5 }, (_, c) => served(g, c))),
        targets: plates(5),
        showEquation: '15 ÷ 3 = 5',
    },
];

export const DivideByFiveLesson: LessonDefinition = {
    id: 'divide_by_five',
    title: 'lessons.divideByFive.title',
    theme: 'desert',
    operation: 'division',
    steps,
};
