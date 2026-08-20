import type { LessonDefinition } from '../types/lesson';
import { AdditionBeachLesson } from './lesson_addition_beach';
import { AdditionZeroLesson } from './lesson_addition_zero';
import { CountingSeashellsLesson } from './lesson_counting_seashells';
import { DivideByFiveLesson } from './lesson_divide_by_five';
import { DivideByTwoLesson } from './lesson_divide_by_two';
import { DivisionDesertLesson } from './lesson_division_desert';
import { DivisionRemaindersLesson } from './lesson_division_remainders';
import { DoublesForestLesson } from './lesson_doubles_forest';
import { MakingTenLesson } from './lesson_making_ten';
import { MissingAddendsLesson } from './lesson_missing_addends';
import { MissingNumbersLesson } from './lesson_missing_numbers';
import { MultiplicationMountainLesson } from './lesson_multiplication_mountain';
import { MultiplicationReviewLesson } from './lesson_multiplication_review';
import { PlaceValueTensLesson } from './lesson_place_value_tens';
import { SubtractionBorrowLesson } from './lesson_subtraction_borrow';
import { SubtractionCountbackLesson } from './lesson_subtraction_countback';
import { SubtractionForestLesson } from './lesson_subtraction_forest';
import { TimesFiveSkipLesson } from './lesson_times_five_skip';
import { TimesTables34Lesson } from './lesson_times_tables_34';
import { MultiplicationLesson } from './lesson1_multiplication';

export {
    AdditionBeachLesson,
    AdditionZeroLesson,
    CountingSeashellsLesson,
    DivideByFiveLesson,
    DivideByTwoLesson,
    DivisionDesertLesson,
    DivisionRemaindersLesson,
    DoublesForestLesson,
    MakingTenLesson,
    MissingAddendsLesson,
    MissingNumbersLesson,
    MultiplicationMountainLesson,
    MultiplicationReviewLesson,
    PlaceValueTensLesson,
    SubtractionBorrowLesson,
    SubtractionCountbackLesson,
    SubtractionForestLesson,
    TimesFiveSkipLesson,
    TimesTables34Lesson,
    MultiplicationLesson,
};

/**
 * Saga node id → the story lesson it opens.
 *
 * Adding a LESSON node to the curriculum means adding a line here; nodes with
 * no entry fall back to `INTRO_PLACEHOLDER_LESSON` so a mis-typed id degrades
 * into a playable lesson instead of a blank modal.
 */
export const LESSONS_BY_NODE: Record<string, LessonDefinition> = {
    // Unit 1 — Beginner Beach
    n1_2: CountingSeashellsLesson,
    n1_3a: AdditionBeachLesson,
    n1_3b: PlaceValueTensLesson,
    n1_7: MissingNumbersLesson,
    // Unit 2 — Forest
    n2_3: MakingTenLesson,
    n2_3a: SubtractionForestLesson,
    n2_3b: DoublesForestLesson,
    n2_6: MissingAddendsLesson,
    // Unit 3 — Mountain
    n3_1: MultiplicationMountainLesson,
    n3_3: SubtractionCountbackLesson,
    n3_5: TimesFiveSkipLesson,
    // Unit 4 — Desert
    n4_1: DivisionDesertLesson,
    n4_2: DivideByTwoLesson,
    n4_3a: TimesTables34Lesson,
    n4_5: DivideByFiveLesson,
    // Unit 5 — Space
    n5_1a: DivisionRemaindersLesson,
    n5_2: AdditionZeroLesson,
    n5_5a: SubtractionBorrowLesson,
    n5_8: MultiplicationReviewLesson,
};

/**
 * Every curriculum lesson, keyed by its own id — used by tests and the parent
 * dashboard. `INTRO_PLACEHOLDER_LESSON` is deliberately absent: it is a
 * safety net, not teachable content.
 */
export const LESSONS_BY_ID: Record<string, LessonDefinition> = Object.fromEntries(
    [
        AdditionBeachLesson,
        AdditionZeroLesson,
        CountingSeashellsLesson,
        DivideByFiveLesson,
        DivideByTwoLesson,
        DivisionDesertLesson,
        DivisionRemaindersLesson,
        DoublesForestLesson,
        MakingTenLesson,
        MissingAddendsLesson,
        MissingNumbersLesson,
        MultiplicationMountainLesson,
        MultiplicationReviewLesson,
        PlaceValueTensLesson,
        SubtractionBorrowLesson,
        SubtractionCountbackLesson,
        SubtractionForestLesson,
        TimesFiveSkipLesson,
        TimesTables34Lesson,
    ].map(lesson => [lesson.id, lesson]),
);

/** Shown when a LESSON node has no registry entry. */
export const INTRO_PLACEHOLDER_LESSON: LessonDefinition = MultiplicationLesson;

export const getLessonForNode = (nodeId: string | undefined): LessonDefinition =>
    (nodeId && LESSONS_BY_NODE[nodeId]) || INTRO_PLACEHOLDER_LESSON;
