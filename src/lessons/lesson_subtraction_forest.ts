import type { LessonDefinition, LessonStep, LessonItem } from '../types/lesson';
import { activeItems } from '../types/lesson';

/**
 * Subtraction in the forest: 8 apples on the tree, a hungry bunny eats 3 → 5.
 *
 * Tap-to-remove rather than drag: subtraction is "taking away", and the
 * gesture should feel like taking away. The step's `tapGoal` stops the child
 * from eating past 3 and stranding the step in an unsolvable state.
 */

/** The 8 apples hanging in the canopy, in two arcs. */
const APPLE_SPOTS = [
    { x: 30, y: 26 }, { x: 42, y: 20 }, { x: 54, y: 20 }, { x: 66, y: 26 },
    { x: 33, y: 40 }, { x: 45, y: 44 }, { x: 57, y: 44 }, { x: 69, y: 40 },
];

const apple = (index: number): LessonItem => ({
    id: `apple_${index + 1}`,
    type: 'apple',
    position: APPLE_SPOTS[index],
    tapAction: 'remove',
});

const apples = (count: number) => Array.from({ length: count }, (_, i) => apple(i));

/** Scenery: the tree behind the apples and the bunny waiting below. */
const TREE: LessonItem = {
    id: 'tree',
    type: 'tree',
    position: { x: 50, y: 34 },
    scale: 4.2,
    interactive: false,
};

const BUNNY: LessonItem = {
    id: 'bunny',
    type: 'bunny',
    position: { x: 82, y: 74 },
    scale: 1.8,
    interactive: false,
    label: 'lessons.subtractionForest.bunnyName',
};

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.subtractionForest.intro',
        mascotEmotion: 'happy',
        items: [TREE, BUNNY],
        targets: [],
    },
    {
        id: 'count_apples',
        type: 'dialog',
        mascotText: 'lessons.subtractionForest.count',
        mascotEmotion: 'idle',
        items: [TREE, ...apples(8), BUNNY],
        targets: [],
    },
    {
        id: 'bunny_eats',
        type: 'interactive_tap',
        mascotText: 'lessons.subtractionForest.action',
        mascotEmotion: 'thinking',
        hint: 'lessons.subtractionForest.hintAction',
        items: [TREE, ...apples(8), BUNNY],
        targets: [],
        tapGoal: 3,
        // Scenery is never removable, so "5 apples left" is the same as
        // "5 apples + the 2 scenery sprites still on screen".
        validationCriteria: items => activeItems(items).filter(i => i.type === 'apple').length === 5,
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.subtractionForest.conclusion',
        mascotEmotion: 'excited',
        items: [TREE, ...apples(5), { ...BUNNY, position: { x: 82, y: 74 } }],
        targets: [],
        showEquation: '8 - 3 = 5',
    },
];

export const SubtractionForestLesson: LessonDefinition = {
    id: 'subtraction_forest',
    title: 'lessons.subtractionForest.title',
    theme: 'forest',
    operation: 'subtraction',
    steps,
};
