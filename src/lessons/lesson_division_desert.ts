import type { LessonDefinition, LessonStep, LessonItem, LessonTarget, DesertAnimal } from '../types/lesson';

/**
 * Division in the desert: 6 dates shared fairly between 3 animals → 2 each.
 *
 * Matches saga node n4_1 ("Sharing is Caring"). Each plate holds exactly 2, so
 * the engine refuses an unfair 3rd date and the child feels the constraint
 * rather than being told about it.
 */

const GUESTS: { id: string; animal: DesertAnimal; x: number; label: string }[] = [
    { id: 'camel', animal: 'camel', x: 20, label: 'lessons.divisionDesert.camel' },
    { id: 'fox', animal: 'fox', x: 50, label: 'lessons.divisionDesert.fox' },
    { id: 'lizard', animal: 'lizard', x: 80, label: 'lessons.divisionDesert.lizard' },
];

const PLATE_Y = 66;

const plate = (guest: (typeof GUESTS)[number], currentCount = 0): LessonTarget => ({
    id: guest.id,
    position: { x: guest.x, y: PLATE_Y },
    capacity: 2,
    currentCount,
    accepts: ['date'],
    visual: 'animal_plate',
    animal: guest.animal,
    label: guest.label,
    columns: 2,
    hideCounter: true,
});

const plates = (currentCount = 0) => GUESTS.map(g => plate(g, currentCount));

/** Mirrors `LessonEngine.slotPosition` for a 2-wide plate. */
const slot = (guestIndex: number, column: number) => ({
    x: GUESTS[guestIndex].x + (column - 0.5) * 7,
    y: PLATE_Y,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'date',
    position: { x, y: 22 },
});

/** A date already on a plate: visible, inert, not re-draggable. */
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
        mascotText: 'lessons.divisionDesert.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'meet_guests',
        type: 'dialog',
        mascotText: 'lessons.divisionDesert.setup',
        mascotEmotion: 'idle',
        items: [
            loose('d1', 15), loose('d2', 29), loose('d3', 43),
            loose('d4', 57), loose('d5', 71), loose('d6', 85),
        ].map(d => ({ ...d, interactive: false })),
        targets: plates(),
    },
    {
        id: 'share_fairly',
        type: 'interactive_drag',
        mascotText: 'lessons.divisionDesert.action',
        mascotEmotion: 'thinking',
        hint: 'lessons.divisionDesert.hintAction',
        items: [
            loose('d1', 15), loose('d2', 29), loose('d3', 43),
            loose('d4', 57), loose('d5', 71), loose('d6', 85),
        ],
        targets: plates(),
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 2),
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.divisionDesert.conclusion',
        mascotEmotion: 'excited',
        items: GUESTS.flatMap((_, g) => [served(g, 0), served(g, 1)]),
        targets: plates(2),
        showEquation: '6 ÷ 3 = 2',
    },
];

export const DivisionDesertLesson: LessonDefinition = {
    id: 'division_desert',
    title: 'lessons.divisionDesert.title',
    theme: 'desert',
    operation: 'division',
    steps,
};
