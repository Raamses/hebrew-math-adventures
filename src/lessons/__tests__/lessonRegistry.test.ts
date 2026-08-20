import { describe, it, expect } from 'vitest';
import { LESSONS_BY_NODE, LESSONS_BY_ID, INTRO_PLACEHOLDER_LESSON } from '../index';
import { CURRICULUM } from '../../data/learningPath';

describe('Lesson Registry', () => {
    const lessonNodes = CURRICULUM.flatMap(u => u.nodes).filter(n => n.type === 'LESSON');

    it('should have LESSON nodes in CURRICULUM', () => {
        expect(lessonNodes.length).toBeGreaterThanOrEqual(19);
    });

    it('every LESSON node should have a registry entry', () => {
        lessonNodes.forEach(node => {
            expect(LESSONS_BY_NODE[node.id]).toBeDefined();
            expect(LESSONS_BY_NODE[node.id]).not.toBe(INTRO_PLACEHOLDER_LESSON);
        });
    });

    it('every LESSON node should map to a unique lesson', () => {
        const mapped = lessonNodes.map(n => LESSONS_BY_NODE[n.id].id);
        expect(new Set(mapped).size).toBe(mapped.length);
    });

    it('no two nodes should share the same lesson', () => {
        const lessonCounts: Record<string, number> = {};
        lessonNodes.forEach(n => {
            const lessonId = LESSONS_BY_NODE[n.id].id;
            lessonCounts[lessonId] = (lessonCounts[lessonId] || 0) + 1;
        });
        Object.entries(lessonCounts).forEach(([lesson, count]) => {
            expect(count).toBe(1);
        });
    });

    it('every registered lesson should exist in LESSONS_BY_ID', () => {
        lessonNodes.forEach(node => {
            const lesson = LESSONS_BY_NODE[node.id];
            expect(LESSONS_BY_ID[lesson.id]).toBeDefined();
            expect(LESSONS_BY_ID[lesson.id]).toBe(lesson);
        });
    });
});
