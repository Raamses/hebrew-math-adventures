import type { LessonDefinition, LessonStep, LessonItem } from '../types/lesson';
import { activeItems } from '../types/lesson';

/**
 * Subtraction with borrowing: 20 stars on shelves, tap to remove 7 → 13.
 * Simplified from 50-13 to 20-7 per Claude analysis (too advanced for the drag model).
 * Matches saga node n5_5a (NEW NODE — Subtraction with borrowing).
 */

const STAR_SPOTS = [
    { x: 15, y: 25 }, { x: 35, y: 25 }, { x: 55, y: 25 }, { x: 75, y: 25 },
    { x: 20, y: 45 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 80, y: 45 },
    { x: 15, y: 65 }, { x: 35, y: 65 }, { x: 55, y: 65 }, { x: 75, y: 65 },
    { x: 20, y: 85 }, { x: 40, y: 85 }, { x: 60, y: 85 }, { x: 80, y: 85 },
    { x: 15, y: 35 }, { x: 85, y: 35 }, { x: 50, y: 55 }, { x: 30, y: 75 },
];

const star = (index: number): LessonItem => ({
    id: `star_${index + 1}`,
    type: 'star',
    position: STAR_SPOTS[index],
    tapAction: 'remove',
});

const stars = (count: number) => Array.from({ length: count }, (_, i) => star(i));

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.subtractionBorrow.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'see_stars',
        type: 'dialog',
        mascotText: 'lessons.subtractionBorrow.seeStars',
        mascotEmotion: 'idle',
        items: stars(20),
        targets: [],
    },
    {
        id: 'remove_seven',
        type: 'interactive_tap',
        mascotText: 'lessons.subtractionBorrow.remove',
        mascotEmotion: 'thinking',
        hint: 'lessons.subtractionBorrow.hint',
        items: stars(20),
        targets: [],
        tapGoal: 7,
        validationCriteria: items => activeItems(items).filter(i => i.type === 'star').length === 13,
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.subtractionBorrow.conclusion',
        mascotEmotion: 'excited',
        items: stars(13),
        targets: [],
        showEquation: '20 − 7 = 13',
    },
];

export const SubtractionBorrowLesson: LessonDefinition = {
    id: 'subtraction_borrow',
    title: 'lessons.subtractionBorrow.title',
    theme: 'space',
    operation: 'subtraction',
    steps,
};
