import type { LessonDefinition, LessonStep } from '../types/lesson';

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: "Hi! Welcome to Multiplication Mountain! Let's learn a magic trick called 'Multiplication'.",
        mascotEmotion: 'happy',
        items: [],
        targets: []
    },
    {
        id: 'setup_baskets',
        type: 'dialog',
        mascotText: "First, look at these 3 baskets. They are empty.",
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
        mascotText: "Can you put 2 apples in EACH basket?",
        mascotEmotion: 'thinking',
        items: [
            { id: 'a1', type: 'apple', position: { x: 10, y: 20 } },
            { id: 'a2', type: 'apple', position: { x: 20, y: 20 } },
            { id: 'a3', type: 'apple', position: { x: 30, y: 20 } },
            { id: 'a4', type: 'apple', position: { x: 40, y: 20 } },
            { id: 'a5', type: 'apple', position: { x: 50, y: 20 } },
            { id: 'a6', type: 'apple', position: { x: 60, y: 20 } }
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
        mascotText: "Awesome! You have 3 baskets with 2 apples each. That's 3 times 2... which equals 6!",
        mascotEmotion: 'excited',
        items: [], // In a real engine we'd keep the items from previous step, but for MVP we might reset or persist
        targets: []
    }
];

export const MultiplicationLesson: LessonDefinition = {
    id: 'multiplication_intro',
    title: 'Intro to Multiplication',
    steps
};
