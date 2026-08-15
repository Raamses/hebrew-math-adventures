import type { LessonDefinition } from '../types/lesson';
import { AdditionBeachLesson } from './lesson_addition_beach';
import { SubtractionForestLesson } from './lesson_subtraction_forest';
import { MultiplicationMountainLesson } from './lesson_multiplication_mountain';
import { DivisionDesertLesson } from './lesson_division_desert';
import { MultiplicationLesson } from './lesson1_multiplication';

export {
    AdditionBeachLesson,
    SubtractionForestLesson,
    MultiplicationMountainLesson,
    DivisionDesertLesson,
    MultiplicationLesson,
};

/**
 * Saga node id → the story lesson it opens.
 *
 * Adding a LESSON node to the curriculum means adding a line here; nodes with
 * no entry fall back to `FALLBACK_LESSON` so a mis-typed id degrades into a
 * playable lesson instead of a blank modal.
 */
export const LESSONS_BY_NODE: Record<string, LessonDefinition> = {
    n1_3a: AdditionBeachLesson,
    n2_3a: SubtractionForestLesson,
    n3_1: MultiplicationMountainLesson,
    n4_1: DivisionDesertLesson,
};

/** Every lesson, keyed by its own id — used by tests and the parent dashboard. */
export const LESSONS_BY_ID: Record<string, LessonDefinition> = Object.fromEntries(
    [
        AdditionBeachLesson,
        SubtractionForestLesson,
        MultiplicationMountainLesson,
        DivisionDesertLesson,
        MultiplicationLesson,
    ].map(lesson => [lesson.id, lesson]),
);

/** Shown when a LESSON node has no registry entry. */
export const FALLBACK_LESSON: LessonDefinition = MultiplicationMountainLesson;

export const getLessonForNode = (nodeId: string | undefined): LessonDefinition =>
    (nodeId && LESSONS_BY_NODE[nodeId]) || FALLBACK_LESSON;
