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
    private static readonly MAX_RECENT_SIGNATURES = 18;
    private static readonly MAX_REGEN_ATTEMPTS = 8;

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

        // P1-11: If still colliding after max attempts, try adjacent levels as fallback
        if (this.recentSignatures.includes(signature)) {
            const fallbackLevels = [level + 1, Math.max(1, level - 1), level + 2];
            for (const fallbackLevel of fallbackLevels) {
                const fallbackProfile = { ...INITIAL_CAPABILITY_PROFILE, estimatedLevel: fallbackLevel };
                problem = this.mathModule.generateProblem(fallbackProfile, {
                    difficulty: fallbackLevel,
                    supportedTypes: ['arithmetic'],
                    excludeSignatures: this.recentSignatures,
                });
                signature = this.problemSignature(problem);
                if (!this.recentSignatures.includes(signature)) break;
            }
        }

        // Ensure we only accept arithmetic/sensory problems for this strategy
        if (this.isSupportedProblem(problem)) {
            this.setProblem(problem);
        } else {
            this.setProblem(MathBehaviorStrategy.FALLBACK_PROBLEM);
        }

        // P0-8: Track the DISPLAYED signature (what the player actually sees),
        // not the generated one. If we fell back to FALLBACK_PROBLEM, track that
        // signature — otherwise duplicates of the fallback go undetected.
        const displayedSig = this.problemSignature(this.currentProblem as ArithmeticProblem | SensoryProblem);
        this.pushSignature(displayedSig);
    }

    private problemSignature(p: Problem | ArithmeticProblem | SensoryProblem): string {
        if (p.type === 'arithmetic') {
            return `${p.type}:${p.num1}:${p.operator}:${p.num2}:${p.answer}`;
        }
        if (p.type === 'sensory') {
            return `${p.type}:${p.target}`;
        }
        return `${p.type}:${(p as Problem).id}`;
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

        // P1-13: Pedagogical (misconception-based) distractors
        if (this.currentProblem && this.currentProblem.type === 'arithmetic' && Math.random() < 0.5) {
            const ap = this.currentProblem as ArithmeticProblem;
            const answer = Number(ap.answer);
            const candidates: number[] = [];

            // Off-by-one errors
            candidates.push(answer + 1, answer - 1);

            // Operation confusion
            if (ap.operator === '+') {
                candidates.push(ap.num1 * ap.num2);
            }
            if (ap.operator === '*') {
                candidates.push(ap.num1 + ap.num2);
            }
            if (ap.operator === '-') {
                candidates.push(ap.num1 + ap.num2);
            }

            // Digit swap for 2-digit answers (10-99)
            if (answer >= 10 && answer <= 99) {
                const swapped = (answer % 10) * 10 + Math.floor(answer / 10);
                candidates.push(swapped);
            }

            // Filter: remove answer, negatives, > 999
            const valid = candidates.filter(c => c !== answer && c >= 0 && c <= 999);

            if (valid.length > 0) {
                return valid[Math.floor(Math.random() * valid.length)];
            }
        }

        // P1-12: Scale distractor range to target magnitude (min 5 instead of 10)
        const range = Math.max(5, Math.floor(safeTarget * 0.4));
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
