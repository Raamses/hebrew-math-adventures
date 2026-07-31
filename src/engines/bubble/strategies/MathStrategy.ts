import type { IGameBehavior, GameConfig, BubbleEntity } from '../types';
import { MathModule } from '../../MathModule';
import { INITIAL_CAPABILITY_PROFILE } from '../../../types/progress';
import type { ArithmeticProblem, Problem, SensoryProblem } from '../../../lib/gameLogic';

export class MathBehaviorStrategy implements IGameBehavior {
    private currentProblem: ArithmeticProblem | SensoryProblem | null = null;
    private targetValue: number = 0;
    private readonly mathModule: MathModule;

    // Anti-repeat: track recent problem signatures to avoid duplicates
    private recentSignatures: string[] = [];
    private static readonly MAX_RECENT_SIGNATURES = 10;
    private static readonly MAX_REGEN_ATTEMPTS = 5;

    // Config Constants
    private static readonly CONFIG = {
        CHANCE_LARGE: 0.8,
        CHANCE_MEDIUM: 0.5,
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

    constructor() {
        this.mathModule = new MathModule();
    }

    initializeLevel(level: number, config: GameConfig): void {
        // If problem was already set (e.g. by setProblem), don't regenerate
        if (this.currentProblem) return;

        this.generateAndSetProblem(level, config);
    }

    regenerateProblem(level: number, config: GameConfig): void {
        // Force regeneration regardless of currentProblem state
        this.generateAndSetProblem(level, config);
    }

    private generateAndSetProblem(level: number, _config: GameConfig): void {
        // Fallback profile if none provided
        const profile = { ...INITIAL_CAPABILITY_PROFILE, estimatedLevel: level };

        let problem: Problem;
        let attempts = 0;
        let signature = '';

        // Try up to MAX_REGEN_ATTEMPTS to get a non-repeating problem
        do {
            problem = this.mathModule.generateProblem(profile, {
                difficulty: level,
                excludeSignatures: this.recentSignatures,
            });
            signature = this.problemSignature(problem);
            attempts++;
        } while (this.recentSignatures.includes(signature) && attempts < MathBehaviorStrategy.MAX_REGEN_ATTEMPTS);

        // Ensure we only accept arithmetic/sensory problems for this strategy
        if (this.isSupportedProblem(problem)) {
            this.setProblem(problem);
        } else {
            this.setProblem(MathBehaviorStrategy.FALLBACK_PROBLEM);
        }

        // Track signature for anti-repeat
        this.pushSignature(signature);
    }

    private problemSignature(p: Problem): string {
        if (p.type === 'arithmetic') {
            return `${p.type}:${p.num1}:${p.operator}:${p.num2}:${p.answer}`;
        }
        if (p.type === 'sensory') {
            return `${p.type}:${p.target}`;
        }
        return `${p.type}:${p.id}`;
    }

    private pushSignature(sig: string): void {
        this.recentSignatures.push(sig);
        if (this.recentSignatures.length > MathBehaviorStrategy.MAX_RECENT_SIGNATURES) {
            this.recentSignatures.shift();
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
        const safeTarget = Math.max(1, this.targetValue);
        const range = Math.max(10, Math.floor(safeTarget * 0.4));
        const offset = Math.floor(range / 2);
        let value: number;
        do {
            value = safeTarget + Math.floor(Math.random() * range) - offset;
            value = Math.min(value, 999);
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
