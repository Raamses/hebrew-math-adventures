import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Addition on the beach: collect seashells into a ten-frame.
 *
 * 3 shells, then 4 more → 7. The ten-frame is the point: the child *sees* that
 * "3 and 4 more" lands on the same square as counting to 7.
 */

const FRAME: LessonTarget = {
    id: 'frame',
    position: { x: 50, y: 58 },
    capacity: 10,
    currentCount: 0,
    accepts: ['seashell'],
    visual: 'ten_frame',
    columns: 5,
    hideCounter: true,
};

/**
 * Mirrors `LessonEngine.slotPosition` for the ten-frame so already-placed
 * shells in later steps sit exactly where the engine would have snapped them.
 */
const slot = (index: number) => ({
    x: FRAME.position.x + ((index % 5) - 2) * 7,
    y: FRAME.position.y + (Math.floor(index / 5) - 0.5) * 14,
});

/** A shell already in the frame: visible, but not draggable and not counted again. */
const placedShell = (index: number): LessonItem => ({
    id: `placed_${index}`,
    type: 'seashell',
    position: slot(index),
    interactive: false,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'seashell',
    position: { x, y: 20 },
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.additionBeach.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'meet_frame',
        type: 'dialog',
        mascotText: 'lessons.additionBeach.meetFrame',
        mascotEmotion: 'idle',
        items: [],
        targets: [FRAME],
    },
    {
        id: 'add_first_three',
        type: 'interactive_drag',
        mascotText: 'lessons.additionBeach.addFirst',
        mascotEmotion: 'thinking',
        hint: 'lessons.additionBeach.hintFirst',
        items: [loose('s1', 20), loose('s2', 35), loose('s3', 50)],
        targets: [FRAME],
        validationCriteria: (_items, targets) => targets[0].currentCount === 3,
    },
    {
        id: 'add_four_more',
        type: 'interactive_drag',
        mascotText: 'lessons.additionBeach.addMore',
        mascotEmotion: 'thinking',
        hint: 'lessons.additionBeach.hintMore',
        items: [
            placedShell(0),
            placedShell(1),
            placedShell(2),
            loose('s4', 18),
            loose('s5', 32),
            loose('s6', 46),
            loose('s7', 60),
        ],
        // Starts already holding the 3 shells from the previous step, so the
        // engine snaps the next drop into slot 3.
        targets: [{ ...FRAME, currentCount: 3 }],
        validationCriteria: (_items, targets) => targets[0].currentCount === 7,
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.additionBeach.conclusion',
        mascotEmotion: 'excited',
        items: Array.from({ length: 7 }, (_, i) => placedShell(i)),
        targets: [{ ...FRAME, currentCount: 7 }],
        showEquation: '3 + 4 = 7',
    },
];

export const AdditionBeachLesson: LessonDefinition = {
    id: 'addition_beach',
    title: 'lessons.additionBeach.title',
    theme: 'beach',
    operation: 'addition',
    steps,
};
