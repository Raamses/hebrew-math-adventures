import { describe, it, expect } from 'vitest';
import { LessonEngine } from '../LessonEngine';
import type { LessonDefinition } from '../../types/lesson';

describe('LessonEngine', () => {
    const mockLesson: LessonDefinition = {
        id: 'lesson-1',
        title: 'Test Lesson',
        steps: [
            {
                id: 'step-1',
                type: 'interactive_drag',
                mascotText: 'Hello',
                mascotEmotion: 'happy',
                items: [
                    { id: 'item-1', type: 'apple', position: { x: 0, y: 0 } },
                    { id: 'item-2', type: 'apple', position: { x: 10, y: 10 } }
                ],
                targets: [
                    { id: 'target-1', position: { x: 50, y: 50 }, capacity: 1, currentCount: 0, accepts: ['apple'] }
                ]
            }
        ]
    };

    it('should initialize with correct state', () => {
        const engine = new LessonEngine(mockLesson);
        const state = engine.getCurrentState();

        expect(state.currentStep.id).toBe('step-1');
        expect(state.items.length).toBe(2);
        expect(state.targets.length).toBe(1);
        expect(state.progress).toBe(0);
        expect(state.isLastStep).toBe(true);
    });

    it('should deep copy items and targets using structuredClone', () => {
        const engine = new LessonEngine(mockLesson);

        // Simulate item dropping which modifies the internal state
        engine.onItemDropped('item-1', 'target-1');

        const state = engine.getCurrentState();

        // Check if internal state has been modified
        expect(state.targets[0].currentCount).toBe(1);
        expect(state.items[0].position.x).toBe(50); // Snapped to target center

        // Verify that the original lesson definition was not mutated
        expect(mockLesson.steps[0].targets[0].currentCount).toBe(0);
        expect(mockLesson.steps[0].items[0].position.x).toBe(0);
    });

    it('should allow subscribing to state changes', () => {
        const engine = new LessonEngine(mockLesson);
        let notifiedState: ReturnType<typeof engine.getCurrentState> | null = null;

        const unsubscribe = engine.subscribe((state) => {
            notifiedState = state;
        });

        // Trigger a notification
        engine.onItemDropped('item-2', null); // invalid drop still notifies

        expect(notifiedState).not.toBeNull();
        expect(notifiedState!.items.length).toBe(2);

        unsubscribe();
    });

    describe('performance tracking (star tiers)', () => {
        it('starts at zero performance', () => {
            const engine = new LessonEngine(mockLesson);
            expect(engine.getPerformance()).toEqual({ correct: 0, attempts: 0 });
        });

        it('counts a successful fill as a correct answer', () => {
            const engine = new LessonEngine(mockLesson);
            engine.onItemDropped('item-1', 'target-1');
            expect(engine.getPerformance()).toEqual({ correct: 1, attempts: 1 });
        });

        it('counts a drop into empty space (null target) as a mistake', () => {
            const engine = new LessonEngine(mockLesson);
            engine.onItemDropped('item-1', null);
            expect(engine.getPerformance()).toEqual({ correct: 0, attempts: 1 });
        });

        it('counts a drop into a full target as a mistake', () => {
            const engine = new LessonEngine(mockLesson);
            // target-1 capacity is 1 → first fill is correct, second is a mistake
            engine.onItemDropped('item-1', 'target-1');
            engine.onItemDropped('item-2', 'target-1');
            expect(engine.getPerformance()).toEqual({ correct: 1, attempts: 2 });
        });

        it('recordMistake() adds an attempt without a correct answer', () => {
            const engine = new LessonEngine(mockLesson);
            engine.recordMistake();
            engine.recordMistake();
            engine.onItemDropped('item-1', 'target-1');
            expect(engine.getPerformance()).toEqual({ correct: 1, attempts: 3 });
        });
    });
});
