import type { IGameBehavior, GameConfig, BubbleEntity } from '../types';
import { MathModule } from '../../MathModule';
import { INITIAL_CAPABILITY_PROFILE } from '../../../types/progress';
import type { ArithmeticProblem, Problem, SensoryProblem } from '../../../lib/gameLogic';

export class MathBehaviorStrategy implements IGameBehavior {
    private currentProblem: ArithmeticProblem | SensoryProblem | null = null;
    private targetValue: number = 0;
    private readonly mathModule: MathModule;

    // Config Constants
    private static readonly CONFIG = {
        CHANCE_LARGE: 0.8,
        CHANCE_MEDIUM: 0.5,
        DISTRACTOR_RANGE: 10,
        DISTRACTOR_OFFSET: 5,
    } as const;

    private static readonly FALLBACK_PROBLEM: ArithmeticProblem = {
        type: 'arithmetic',
        id: 'fallback',
        num1: 1,
        num2: 1,
        operator: '+',
        missing: 'answer',
        answer: 2
    };

    private level: number = 1;

    constructor() {
        this.mathModule = new MathModule();
    }

    initializeLevel(level: number, config: GameConfig): void {
        this.level = level;

        // If problem was already set (e.g. by setProblem), don't regenerate
        if (this.currentProblem) return;

        // Fallback profile if none provided
        const profile = { ...INITIAL_CAPABILITY_PROFILE, estimatedLevel: this.level };

        const problem = this.mathModule.generateProblem(profile, {
            difficulty: this.level,
            type: config.isMathSensory ? 'addition_simple' : undefined
        });

        // Ensure we only accept arithmetic problems for this strategy
        if (this.isSupportedProblem(problem)) {
            this.setProblem(problem);
        } else {
            this.setProblem(MathBehaviorStrategy.FALLBACK_PROBLEM);
        }
    }

    private isSupportedProblem(p: Problem): p is ArithmeticProblem | SensoryProblem {
        return p.type === 'arithmetic' || p.type === 'sensory';
    }

    setProblem(problem: ArithmeticProblem | SensoryProblem) {
        this.currentProblem = problem;
        if (problem.type === 'sensory') {
            this.targetValue = problem.target;
        } else {
            this.targetValue = Number(problem.answer);
        }
    }

    generateNext(config: GameConfig): Partial<BubbleEntity> {
        // Calculate Probability of Target
        // Ratio = Distractors / Targets
        const targetChance = 1 / (config.distractorRatio + 1);
        const shouldBeTarget = Math.random() < targetChance;

        const value = shouldBeTarget ? this.targetValue : this.generateDistractor();

        return {
            content: value,
            internalValue: value,
            variant: this.determineVariant()
        };
    }

    private generateDistractor(): number {
        let value: number;
        do {
            const range = MathBehaviorStrategy.CONFIG.DISTRACTOR_RANGE;
            const offsetRef = MathBehaviorStrategy.CONFIG.DISTRACTOR_OFFSET;
            const offset = Math.floor(Math.random() * range) - offsetRef;
            value = this.targetValue + offset;
        } while (value === this.targetValue || value < 0);
        return value;
    }

    private determineVariant(): 'small' | 'medium' | 'large' {
        const rand = Math.random();
        if (rand > MathBehaviorStrategy.CONFIG.CHANCE_LARGE) return 'large';
        if (rand > MathBehaviorStrategy.CONFIG.CHANCE_MEDIUM) return 'medium';
        return 'small';
    }

    validate(entity: BubbleEntity): boolean {
        return entity.internalValue === this.targetValue;
    }

    getInstruction(): string {
        if (!this.currentProblem) return "Pop bubbles!";

        const p = this.currentProblem;

        if (p.type === 'sensory') {
            return `Pop ${p.target}`;
        }

        // Arithmetic
        return `${p.num1} ${p.operator} ${p.num2} = ?`;
    }
}
