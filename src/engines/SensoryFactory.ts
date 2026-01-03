import type { Problem, SensoryProblem } from '../lib/gameLogic';

export interface SensoryLevelConfig {
    target?: number;
    itemCount?: number;
    /** Ratio of target items to total/distractors (e.g. 0-1 or custom scale) */
    density?: number;
    /** Maximum value for distractors */
    max?: number;
}

export class SensoryFactory {
    private static readonly DEFAULT_TARGET = 5;
    private static readonly DEFAULT_COUNT = 15;
    private static readonly DEFAULT_DENSITY = 0.3; // Ratio of targets (0.3 = 30%)
    private static readonly PROBABILITY_CLOSE_DISTRACTOR = 0.3;

    /**
     * Adapts an existing (Math) problem into a Sensory problem container.
     */
    static generateFromProblem(problem: Problem): SensoryProblem {
        // "Math Bubble Blast" Adapter
        // MathStrategy generates bubbles dynamically, so we don't need to pre-generate items here.
        const targetValue = typeof problem.answer === 'number' ? problem.answer : parseInt(problem.answer as string) || SensoryFactory.DEFAULT_TARGET;

        return {
            type: 'sensory',
            id: problem.id || `math-sensory-${Date.now()}`,
            answer: targetValue,
            target: targetValue,
            items: [] // Empty items, handled by Strategy
        };
    }

    /**
     * Generates a standalone Sensory problem (e.g., "Find the Number 5").
     */
    static generate(nodeId: string, config: SensoryLevelConfig): SensoryProblem {
        // Legacy/Standard Sensory Mode (Numbers only)
        const target = config.target ?? SensoryFactory.DEFAULT_TARGET;
        const itemCount = config.itemCount ?? SensoryFactory.DEFAULT_COUNT;
        const density = config.density ?? SensoryFactory.DEFAULT_DENSITY;
        const distractorMax = config.max ?? Math.max(20, target * 2);

        // Generate items (bubbles)
        const items = Array.from({ length: itemCount }, (_, i) => ({
            id: `bubble-${i}`,
            // Use density logic (simplified: first N items are targets)
            // Note: This logic assumes simple density. Ideally use a ratio check.
            value: i < Math.floor(itemCount * density) ? target : SensoryFactory.generateDistractor(target, distractorMax),
            variant: 'medium' as const
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

        // Loop ensures we don't accidentally pick the target
        while (distractor === target) {
            if (r < SensoryFactory.PROBABILITY_CLOSE_DISTRACTOR) {
                // Close call (Target +/- small offset)
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
