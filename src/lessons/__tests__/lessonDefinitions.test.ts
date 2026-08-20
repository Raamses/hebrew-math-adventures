import { describe, it, expect } from 'vitest';
import { LESSONS_BY_ID } from '../index';
import type { LessonDefinition } from '../../types/lesson';

describe('Lesson Definitions', () => {
    const allLessons = Object.values(LESSONS_BY_ID);

    it('should have at least 19 registered lessons', () => {
        expect(allLessons.length).toBeGreaterThanOrEqual(19);
    });

    it.each(allLessons)('$id should have at least 3 steps', (lesson: LessonDefinition) => {
        expect(lesson.steps.length).toBeGreaterThanOrEqual(3);
    });

    it.each(allLessons)('$id steps should have valid types', (lesson: LessonDefinition) => {
        lesson.steps.forEach(step => {
            expect(['dialog', 'interactive_drag', 'interactive_tap']).toContain(step.type);
        });
    });

    it.each(allLessons)('$id should have at least one interactive step', (lesson: LessonDefinition) => {
        expect(lesson.steps.some(s => s.type !== 'dialog')).toBe(true);
    });

    it.each(allLessons)('$id mascotText should use i18n key format', (lesson: LessonDefinition) => {
        lesson.steps.forEach(step => {
            expect(step.mascotText).toMatch(/^lessons\.\w+\.\w+$/);
        });
    });

    it.each(allLessons)('$id should have a valid theme', (lesson: LessonDefinition) => {
        expect(['beach', 'forest', 'mountain', 'desert', 'space']).toContain(lesson.theme);
    });

    it.each(allLessons)('$id interactive steps should have validation', (lesson: LessonDefinition) => {
        lesson.steps
            .filter(s => s.type !== 'dialog')
            .forEach(s => expect(s.validationCriteria).toBeDefined());
    });

    it.each(allLessons)('$id should have a unique id', (lesson: LessonDefinition) => {
        const matching = allLessons.filter(l => l.id === lesson.id);
        expect(matching.length).toBe(1);
    });
});
