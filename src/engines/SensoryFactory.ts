import type { SensoryProblem } from '../lib/gameLogic';

export class SensoryFactory {
    static generate(nodeId: string, config: any): SensoryProblem {
        const target = config.target || 5;
        const itemCount = config.itemCount || 20;

        // Generate items (bubbles)
        const items = Array.from({ length: itemCount }, (_, i) => ({
            id: `bubble-${i}`,
            // Ensure ~40% of items are the target, rest are distractors
            value: i < Math.floor(itemCount * 0.4) ? target : SensoryFactory.generateDistractor(target)
        })).sort(() => Math.random() - 0.5);

        return {
            type: 'sensory',
            id: nodeId || `sensory-${Date.now()}`,
            answer: target,
            target: target,
            items
        };
    }

    private static generateDistractor(target: number): number {
        let distractor = target;
        while (distractor === target) {
            distractor = Math.floor(Math.random() * 10) + 1;
        }
        return distractor;
    }
}
