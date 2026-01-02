import type { SensoryProblem } from '../lib/gameLogic';

export class SensoryFactory {
    static generateFromProblem(problem: any): SensoryProblem {
        // "Math Bubble Blast" Adapter
        const target = typeof problem.answer === 'number' ? problem.answer : parseInt(problem.answer as string) || 5;

        // Dynamic Distractor Range
        const distractorMax = Math.max(20, target * 2);

        const itemCount = 20;
        const density = 0.25;

        // Generate items with Variants!
        const items = Array.from({ length: itemCount }, (_, i) => {
            const isTarget = i < Math.floor(itemCount * density);
            const variant = Math.random() > 0.7 ? (Math.random() > 0.5 ? 'large' : 'small') : 'medium';

            return {
                id: `puzzle-bubble-${i}-${Date.now()}`,
                value: isTarget ? target : SensoryFactory.generateDistractor(target, distractorMax),
                variant: variant as 'small' | 'medium' | 'large'
            };
        }).sort(() => Math.random() - 0.5);

        return {
            type: 'sensory',
            id: problem.id || `math-sensory-${Date.now()}`,
            answer: target,
            target: target,
            items
        };
    }

    static generate(nodeId: string, config: any): SensoryProblem {
        // Legacy/Standard Sensory Mode (Numbers only)
        const target = config.target || 5;
        const itemCount = config.itemCount || 20;
        const density = config.density || 0.25; // Default 25% are correct (was 40% hardcoded)
        const distractorMax = config.max || Math.max(20, target * 2);

        // Generate items (bubbles)
        const items = Array.from({ length: itemCount }, (_, i) => ({
            id: `bubble-${i}`,
            // Use density config
            value: i < Math.floor(itemCount * density) ? target : SensoryFactory.generateDistractor(target, distractorMax),
            variant: 'medium' as const // Default variant
        })).sort(() => Math.random() - 0.5);

        return {
            type: 'sensory',
            id: nodeId || `sensory-${Date.now()}`,
            answer: target,
            target: target,
            items
        };
    }

    private static generateDistractor(target: number, max: number): number {
        const r = Math.random();
        let distractor = target;

        // Smart Distractors (Math Bubble Blast logic)
        // 30% chance: Close Call (+/- 1 or 2)
        // 10% chance: Visual Trick (inverted 6/9 etc - simplified as close range for now)
        // 60% chance: Random in range

        while (distractor === target) {
            if (r < 0.3) {
                // Close call
                const offset = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1);
                distractor = target + offset;
            } else {
                // Random in range
                distractor = Math.floor(Math.random() * max);
            }

            // Bounds check
            if (distractor < 0) distractor = 0;
        }
        return distractor;
    }
}
