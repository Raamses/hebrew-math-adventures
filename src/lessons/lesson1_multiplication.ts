import type { LessonDefinition, LessonStep } from '../types/lesson';

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: "lessons.multiplication.intro",
        mascotEmotion: 'happy',
        items: [],
        targets: []
    },
    {
        id: 'setup_baskets',
        type: 'dialog',
        mascotText: "lessons.multiplication.setup",
        mascotEmotion: 'idle',
        items: [],
        targets: [
            { id: 'b1', position: { x: 20, y: 60 }, capacity: 2, currentCount: 0, accepts: ['apple'] },
            { id: 'b2', position: { x: 50, y: 60 }, capacity: 2, currentCount: 0, accepts: ['apple'] },
            { id: 'b3', position: { x: 80, y: 60 }, capacity: 2, currentCount: 0, accepts: ['apple'] }
        ]
    },
    {
        id: 'action_fill',
        type: 'interactive_drag',
        mascotText: "lessons.multiplication.action",
        mascotEmotion: 'thinking',
        items: [
            { id: 'a1', type: 'apple', position: { x: 10, y: 20 } },
            { id: 'a2', type: 'apple', position: { x: 25, y: 20 } },
            { id: 'a3', type: 'apple', position: { x: 40, y: 20 } },
            { id: 'a4', type: 'apple', position: { x: 55, y: 20 } },
            { id: 'a5', type: 'apple', position: { x: 70, y: 20 } },
            { id: 'a6', type: 'apple', position: { x: 85, y: 20 } }
        ],
        targets: [
            { id: 'b1', position: { x: 20, y: 60 }, capacity: 2, currentCount: 0, accepts: ['apple'] },
            { id: 'b2', position: { x: 50, y: 60 }, capacity: 2, currentCount: 0, accepts: ['apple'] },
            { id: 'b3', position: { x: 80, y: 60 }, capacity: 2, currentCount: 0, accepts: ['apple'] }
        ],
        validationCriteria: (_items, targets) => {
            // Check if every target has exactly 2 items
            return targets.every(t => t.currentCount === 2);
        }
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: "lessons.multiplication.conclusion",
        mascotEmotion: 'excited',
        // Persist final state: 3 baskets full of apples
        targets: [
            { id: 'b1', position: { x: 20, y: 60 }, capacity: 2, currentCount: 2, accepts: ['apple'] },
            { id: 'b2', position: { x: 50, y: 60 }, capacity: 2, currentCount: 2, accepts: ['apple'] },
            { id: 'b3', position: { x: 80, y: 60 }, capacity: 2, currentCount: 2, accepts: ['apple'] }
        ],
        items: [
            // Apples snapped to baskets (approximate positions for visual continuity)
            { id: 'a1', type: 'apple', position: { x: 18, y: 60 } },
            { id: 'a2', type: 'apple', position: { x: 22, y: 60 } },
            { id: 'a3', type: 'apple', position: { x: 48, y: 60 } },
            { id: 'a4', type: 'apple', position: { x: 52, y: 60 } },
            { id: 'a5', type: 'apple', position: { x: 78, y: 60 } },
            { id: 'a6', type: 'apple', position: { x: 82, y: 60 } }
        ],
        showEquation: "3 × 2 = 6"
    }
];

export const MultiplicationLesson: LessonDefinition = {
    id: 'multiplication_intro',
    title: 'lessons.multiplication.title',
    steps
};
