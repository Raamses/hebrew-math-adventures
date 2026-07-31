import type { Problem, ArithmeticProblem, ComparisonProblem, SeriesProblem, WordProblem } from '../lib/gameLogic';
import { RandomUtils } from './utils/ProblemUtils';
import {
    WORD_PROBLEM_TEMPLATES,
    difficultyFromLevel,
    getTemplatesByDifficulty,
    type WordProblemTemplate,
} from '../data/wordProblemTemplates';

// --- Configuration Interfaces ---

export interface BaseProblemConfig {
    max?: number;
    min?: number;
    isChallenge?: boolean;
    isRescue?: boolean;
    [key: string]: any;
}

export interface ArithmeticConfig extends BaseProblemConfig {
    allowNegative?: boolean;
}

export interface SeriesConfig extends BaseProblemConfig {
    step?: number;
    length?: number;
}

export interface WordProblemConfig extends BaseProblemConfig {
    n1?: number;
    n2?: number;
}

// --- Constants & Enums ---

export const ProblemTypes = {
    ARITHMETIC_SIMPLE: 'addition_simple',
    ARITHMETIC_CARRY: 'addition_carry',
    SUBTRACTION_SIMPLE: 'sub_simple',
    SUBTRACTION_BORROW: 'sub_borrow',
    SUBTRACTION_ZERO: 'sub_zero',
    MULTIPLICATION: 'multiplication',
    DIVISION: 'division',
    ALGEBRAIC_MISSING: '_missing',
} as const;

export type ProblemTypeKey = typeof ProblemTypes[keyof typeof ProblemTypes];

// --- Factories ---

export interface IProblemFactory {
    generate(level: number, type: string, config?: BaseProblemConfig): Problem;
}

export class ArithmeticFactory implements IProblemFactory {
    generate(level: number, type: string, config?: ArithmeticConfig): ArithmeticProblem {
        let num1 = 0, num2 = 0, answer = 0;
        let operator: '+' | '-' | '*' | '/' = '+';
        let subType: 'simple' | 'carry' | 'borrow' | 'zero' | undefined;

        // Default constraints
        const maxLimit = config?.max;

        switch (type) {
            case ProblemTypes.ARITHMETIC_SIMPLE:
                operator = '+';
                subType = 'simple';
                if (level <= 2) {
                    const max = maxLimit || 10;
                    num1 = RandomUtils.intInRange(1, Math.floor(max / 2) + 1);
                    num2 = RandomUtils.intInRange(1, max - num1 + 1);
                } else if (level === 3) {
                    const max = maxLimit || 20;
                    num1 = RandomUtils.intInRange(1, 11);
                    num2 = RandomUtils.intInRange(1, max - num1 + 1);
                } else {
                    const max = maxLimit || 100;
                    num1 = RandomUtils.intInRange(10, max);
                    num2 = RandomUtils.intInRange(1, max - num1 + 1); // Ensure num2 >= 1
                }
                break;

            case ProblemTypes.ARITHMETIC_CARRY:
                operator = '+';
                subType = 'carry';
                // Generates two numbers that guarantee a carry operation (sum of mod 100 >= 100 is... questionable heuristic but preserving logic)
                // Original logic: while ((num1 % 100) + (num2 % 100) < 100);
                do {
                    const range = maxLimit || 500;
                    num1 = RandomUtils.intInRange(100, range + 100);
                    num2 = RandomUtils.intInRange(100, range + 100);
                } while ((num1 % 100) + (num2 % 100) < 100);
                break;

            case ProblemTypes.SUBTRACTION_SIMPLE:
                operator = '-';
                subType = 'simple';
                if (level <= 3) {
                    const max = maxLimit || 10;
                    num1 = RandomUtils.intInRange(2, max);
                    num2 = RandomUtils.intInRange(1, num1);
                } else {
                    const max = maxLimit || 100;
                    num1 = RandomUtils.intInRange(10, max);
                    num2 = RandomUtils.intInRange(1, num1); // Ensure answer >= 1 (no zero-answer)
                }
                break;

            case ProblemTypes.SUBTRACTION_BORROW: {
                operator = '-';
                subType = 'borrow';
                do {
                    num1 = RandomUtils.intInRange(100, 900);
                } while (num1 % 10 === 9); // digit1 must leave room for a larger digit2 (0-9)
                const digit1 = num1 % 10;
                // Force digit2 > digit1 for borrowing
                const digit2 = RandomUtils.intInRange(digit1 + 1, 10);
                num2 = RandomUtils.intInRange(10, num1); // Initial random
                num2 = (Math.floor(num2 / 10) * 10) + digit2; // Adjust last digit
                if (num2 > num1) num2 -= 10; // Ensure subtraction validity
                break;
            }

            case ProblemTypes.SUBTRACTION_ZERO: {
                operator = '-';
                subType = 'zero';
                const hundreds = RandomUtils.intInRange(1, 10);
                const ones = RandomUtils.intInRange(0, 10);
                num1 = hundreds * 100 + ones; // e.g. 503
                num2 = RandomUtils.intInRange(10, 100);
                if (num2 > num1) num2 = Math.floor(num1 / 2);
                break;
            }

            case ProblemTypes.MULTIPLICATION: {
                operator = '*';
                const multMax = config?.max || 10;
                num1 = RandomUtils.intInRange(1, multMax + 1);
                num2 = RandomUtils.intInRange(1, multMax + 1);
                break;
            }

            case ProblemTypes.DIVISION: {
                operator = '/';
                const answerMax = config?.max || 10;
                num2 = RandomUtils.intInRange(2, 11);
                answer = RandomUtils.intInRange(1, answerMax + 1);
                num1 = answer * num2;
                break;
            }

            default:
                // Fallback: generate valid addition instead of degenerate 0+0
                operator = '+';
                subType = 'simple';
                num1 = RandomUtils.intInRange(1, 10);
                num2 = RandomUtils.intInRange(1, 10);
                break;
        }

        // Validate: never produce 0+0
        if (num1 === 0 && num2 === 0 && operator === '+') {
            num1 = RandomUtils.intInRange(1, 5);
            num2 = RandomUtils.intInRange(1, 5);
        }

        // Calculate answer if not pre-calculated (like inside division)
        if (operator === '+') answer = num1 + num2;
        else if (operator === '-') answer = num1 - num2;
        else if (operator === '*') answer = num1 * num2;
        else if (operator === '/' && !answer) answer = num1 / num2;

        return {
            type: 'arithmetic',
            id: RandomUtils.generateId(),
            num1,
            num2,
            operator,
            answer,
            missing: 'answer',
            subType,
            metadata: {
                isChallenge: config?.isChallenge,
                isRescue: config?.isRescue
            }
        };
    }
}

export class AlgebraicFactory implements IProblemFactory {
    generate(level: number, type: string, config?: ArithmeticConfig): ArithmeticProblem {
        const baseFactory = new ArithmeticFactory();
        // Map '_missing' suffix back to valid base types
        let baseType = type;
        if (type.endsWith('_missing')) {
            const base = type.replace('_missing', '');
            baseType = base === 'addition' ? 'addition_simple'
                : base === 'sub' ? 'sub_simple'
                : base;
        }
        const problem = baseFactory.generate(level, baseType, config);

        problem.missing = RandomUtils.chance(0.5) ? 'num1' : 'num2';
        return problem;
    }
}

export class ComparisonFactory implements IProblemFactory {
    generate(level: number, _type: string, config?: BaseProblemConfig): ComparisonProblem {
        let num1, num2;

        const max = config?.max || (level <= 2 ? 10 : 100);
        num1 = RandomUtils.intInRange(1, max + 1);
        num2 = RandomUtils.intInRange(1, max + 1);

        let symbol: '>' | '<' | '=' = '=';
        if (num1 > num2) symbol = '>';
        else if (num1 < num2) symbol = '<';

        return {
            type: 'compare',
            id: RandomUtils.generateId(),
            num1,
            num2,
            operator: 'compare',
            answer: symbol
        };
    }
}

export class SeriesFactory implements IProblemFactory {
    generate(level: number, _type: string, config?: SeriesConfig): SeriesProblem {
        // Linear series: start + n*step
        const step = config?.step || RandomUtils.intInRange(1, (level * 2) + 1);
        const start = RandomUtils.intInRange(0, 20);

        const length = config?.length || 4;
        const sequence: (number | null)[] = [];
        for (let i = 0; i < length; i++) {
            sequence.push(start + (i * step));
        }

        // Hide one
        const missingIndex = RandomUtils.intInRange(0, length);
        const answer = sequence[missingIndex] as number;
        sequence[missingIndex] = null; // Placeholder (0 would collide with legitimate 0 answers)

        return {
            type: 'series',
            id: RandomUtils.generateId(),
            sequence,
            missingIndex,
            rule: `+${step}`,
            answer,
            metadata: {
                isChallenge: config?.isChallenge,
                isRescue: config?.isRescue
            }
        };
    }
}

export class WordProblemFactory implements IProblemFactory {
    /**
     * Recent template IDs to avoid repeating the same template too soon.
     * Tracks the last few template IDs used across calls.
     */
    private static recentIds: string[] = [];
    private static readonly RECENT_LIMIT = 5;

    generate(level: number, _type: string, config?: WordProblemConfig): WordProblem {
        // Determine difficulty from level, falling back to 'easy'
        const difficulty = difficultyFromLevel(level);
        let pool = getTemplatesByDifficulty(difficulty);

        // If pool is somehow empty, fall back to all templates
        if (pool.length === 0) {
            pool = WORD_PROBLEM_TEMPLATES;
        }

        // Filter out recently used templates to improve variety
        let available = pool.filter(
            (t) => !WordProblemFactory.recentIds.includes(t.id),
        );
        if (available.length === 0) {
            available = pool; // All were used recently — reset
        }

        const template: WordProblemTemplate = RandomUtils.pickOne(available);

        // Track recent usage
        WordProblemFactory.recentIds.push(template.id);
        if (WordProblemFactory.recentIds.length > WordProblemFactory.RECENT_LIMIT) {
            WordProblemFactory.recentIds.shift();
        }

        // Generate numbers within template ranges
        let n1 = config?.n1 ?? RandomUtils.intInclusive(template.minN1, template.maxN1);
        let n2 = config?.n2 ?? RandomUtils.intInclusive(template.minN2, template.maxN2);

        // For division: ensure n1 is divisible by n2 (clean integer answer)
        if (template.operation === '/') {
            n2 = Math.max(n2, 2); // no divide by 0 or 1 (trivial)
            n1 = n1 * n2; // guarantee clean division
        }

        // For subtraction: ensure n1 >= n2 (no negatives for kids)
        if (template.operation === '-') {
            if (n1 < n2) {
                [n1, n2] = [n2, n1]; // swap so n1 >= n2
            }
        }

        // Compute answer
        let answer: number;
        let subType: 'addition' | 'subtraction' | 'multiplication' | 'division';
        switch (template.operation) {
            case '+':
                answer = n1 + n2;
                subType = 'addition';
                break;
            case '-':
                answer = n1 - n2;
                subType = 'subtraction';
                break;
            case '*':
                answer = n1 * n2;
                subType = 'multiplication';
                break;
            case '/':
                answer = n1 / n2;
                subType = 'division';
                break;
        }

        return {
            type: 'word',
            id: RandomUtils.generateId(),
            questionKey: template.i18nKey,
            params: { n1, n2 },
            subType,
            answer,
        };
    }
}

