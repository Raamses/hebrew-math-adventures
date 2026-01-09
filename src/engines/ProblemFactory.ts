import type { Problem, ArithmeticProblem, ComparisonProblem, SeriesProblem, WordProblem } from '../lib/gameLogic';
import { RandomUtils } from './utils/ProblemUtils';

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
                    num2 = RandomUtils.intInRange(0, max - num1);
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
                    num2 = RandomUtils.intInRange(0, num1);
                }
                break;

            case ProblemTypes.SUBTRACTION_BORROW:
                operator = '-';
                subType = 'borrow';
                num1 = RandomUtils.intInRange(100, 900);
                const digit1 = num1 % 10;
                // Force digit2 > digit1 for borrowing
                const digit2 = RandomUtils.intInRange(digit1 + 1, 10);
                num2 = RandomUtils.intInRange(10, num1); // Initial random
                num2 = (Math.floor(num2 / 10) * 10) + digit2; // Adjust last digit
                if (num2 > num1) num2 -= 10; // Ensure subtraction validity
                break;

            case ProblemTypes.SUBTRACTION_ZERO:
                operator = '-';
                subType = 'zero';
                const hundreds = RandomUtils.intInRange(1, 10);
                const ones = RandomUtils.intInRange(0, 10);
                num1 = hundreds * 100 + ones; // e.g. 503
                num2 = RandomUtils.intInRange(10, 100);
                if (num2 > num1) num2 = Math.floor(num1 / 2);
                break;

            case ProblemTypes.MULTIPLICATION:
                operator = '*';
                const multMax = config?.max || 10;
                num1 = RandomUtils.intInRange(1, multMax + 1);
                num2 = RandomUtils.intInRange(1, multMax + 1);
                break;

            case ProblemTypes.DIVISION:
                operator = '/';
                const answerMax = config?.max || 10;
                num2 = RandomUtils.intInRange(2, 11);
                answer = RandomUtils.intInRange(1, answerMax + 1);
                num1 = answer * num2;
                break;
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
        // Remove '_missing' suffix if present to map back to base types
        const baseType = type.replace(ProblemTypes.ALGEBRAIC_MISSING, '');
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
        const sequence: number[] = [];
        for (let i = 0; i < length; i++) {
            sequence.push(start + (i * step));
        }

        // Hide one
        const missingIndex = RandomUtils.intInRange(0, length);
        const answer = sequence[missingIndex];
        sequence[missingIndex] = 0; // Placeholder

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
    generate(_level: number, _type: string, config?: WordProblemConfig): WordProblem {
        const templates = [
            'apples_add',
            'candies_sub'
        ];
        const key = RandomUtils.pickOne(templates);

        const n1 = (config?.n1) || RandomUtils.intInRange(3, 8);
        const n2 = (config?.n2) || RandomUtils.intInRange(1, 4);
        const isAdd = key.includes('add');
        const answer = isAdd ? n1 + n2 : n1 - n2;

        return {
            type: 'word',
            id: RandomUtils.generateId(),
            questionKey: `wordProblems.${key}`, // e.g., "Dan has {n1} apples..."
            params: { n1, n2 },
            subType: isAdd ? 'addition' : 'subtraction',
            answer
        };
    }
}

