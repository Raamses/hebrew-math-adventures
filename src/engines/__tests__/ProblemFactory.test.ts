import { describe, it, expect } from 'vitest';
import {
    ArithmeticFactory,
    SeriesFactory,
    ComparisonFactory,
    WordProblemFactory,
    ProblemTypes
} from '../ProblemFactory';

describe('ProblemFactory', () => {
    describe('ArithmeticFactory', () => {
        const factory = new ArithmeticFactory();

        it('1. Addition simple: generates valid problem with correct answer (num1 + num2)', () => {
            const problem = factory.generate(1, ProblemTypes.ARITHMETIC_SIMPLE);
            expect(problem.type).toBe('arithmetic');
            expect(problem.operator).toBe('+');
            expect(problem.subType).toBe('simple');
            expect(problem.answer).toBe(problem.num1 + problem.num2);
            expect(problem.id).toBeTruthy();
        });

        it('2. Addition carry: generates numbers where (num1 % 100) + (num2 % 100) >= 100', () => {
            const problem = factory.generate(1, ProblemTypes.ARITHMETIC_CARRY);
            expect(problem.type).toBe('arithmetic');
            expect(problem.operator).toBe('+');
            expect(problem.subType).toBe('carry');
            expect((problem.num1 % 100) + (problem.num2 % 100)).toBeGreaterThanOrEqual(100);
            expect(problem.answer).toBe(problem.num1 + problem.num2);
        });

        it('3. Subtraction simple: generates valid problem with non-negative answer', () => {
            const problem = factory.generate(1, ProblemTypes.SUBTRACTION_SIMPLE);
            expect(problem.type).toBe('arithmetic');
            expect(problem.operator).toBe('-');
            expect(problem.subType).toBe('simple');
            expect(problem.answer).toBeGreaterThanOrEqual(0);
            expect(problem.answer).toBe(problem.num1 - problem.num2);
        });

        it('4. Subtraction borrow: generates problem where borrowing is needed', () => {
            const problem = factory.generate(1, ProblemTypes.SUBTRACTION_BORROW);
            expect(problem.type).toBe('arithmetic');
            expect(problem.operator).toBe('-');
            expect(problem.subType).toBe('borrow');
            expect(problem.num1 % 10).toBeLessThan(problem.num2 % 10);
            expect(problem.answer).toBe(problem.num1 - problem.num2);
        });

        it('5. Multiplication: answer = num1 * num2', () => {
            const problem = factory.generate(1, ProblemTypes.MULTIPLICATION);
            expect(problem.type).toBe('arithmetic');
            expect(problem.operator).toBe('*');
            expect(problem.answer).toBe(problem.num1 * problem.num2);
        });

        it('6. Division: answer is integer, num1 = answer * num2, num2 >= 2', () => {
            const problem = factory.generate(1, ProblemTypes.DIVISION);
            expect(problem.type).toBe('arithmetic');
            expect(problem.operator).toBe('/');
            expect(Number.isInteger(problem.answer)).toBe(true);
            expect(problem.num1).toBe(problem.answer * problem.num2);
            expect(problem.num2).toBeGreaterThanOrEqual(2);
        });
    });

    describe('SeriesFactory', () => {
        const factory = new SeriesFactory();

        it('7. Series: sequence has correct step pattern, missingIndex is valid, answer matches', () => {
            const problem = factory.generate(1, 'series', { step: 3, length: 5 });
            expect(problem.type).toBe('series');
            expect(problem.id).toBeTruthy();
            expect(problem.missingIndex).toBeGreaterThanOrEqual(0);
            expect(problem.missingIndex).toBeLessThan(problem.sequence.length);
            expect(problem.sequence[problem.missingIndex]).toBeNull();

            // Find non-null values to check step pattern rule
            const nonNullIndices = problem.sequence
                .map((val, idx) => (val !== null ? idx : null))
                .filter((idx): idx is number => idx !== null);

            if (nonNullIndices.length >= 2) {
                const i1 = nonNullIndices[0];
                const i2 = nonNullIndices[1];
                const val1 = problem.sequence[i1]!;
                const val2 = problem.sequence[i2]!;
                const inferredStep = (val2 - val1) / (i2 - i1);
                expect(inferredStep).toBe(3);
            }

            // Verify answer matches missing value in series
            const startVal = (problem.sequence[0] !== null)
                ? problem.sequence[0]!
                : (problem.sequence[1]! - 3);
            expect(problem.answer).toBe(startVal + problem.missingIndex * 3);
        });
    });

    describe('ComparisonFactory', () => {
        const factory = new ComparisonFactory();

        it("8. Comparison: answer is correct symbol ('>', '<', or '=')", () => {
            const problem = factory.generate(1, 'compare');
            expect(problem.type).toBe('compare');
            expect(problem.id).toBeTruthy();
            expect(problem.operator).toBe('compare');

            let expectedSymbol: '>' | '<' | '=' = '=';
            if (problem.num1 > problem.num2) expectedSymbol = '>';
            else if (problem.num1 < problem.num2) expectedSymbol = '<';

            expect(problem.answer).toBe(expectedSymbol);
            expect(['>', '<', '=']).toContain(problem.answer);
        });
    });

    describe('WordProblemFactory', () => {
        const factory = new WordProblemFactory();

        it('9. Word problem: has questionKey, params, and correct answer', () => {
            const problem = factory.generate(1, 'word');
            expect(problem.type).toBe('word');
            expect(problem.id).toBeTruthy();
            expect(problem.questionKey).toMatch(/^wordProblems\./);
            expect(problem.params).toBeDefined();
            expect(typeof problem.params.n1).toBe('number');
            expect(typeof problem.params.n2).toBe('number');

            if (problem.subType === 'addition') {
                expect(problem.answer).toBe(problem.params.n1 + problem.params.n2);
            } else {
                expect(problem.answer).toBe(problem.params.n1 - problem.params.n2);
            }
        });
    });

    describe('Common attributes', () => {
        it("10. Each problem has an 'id' field", () => {
            const arithmetic = new ArithmeticFactory().generate(1, ProblemTypes.ARITHMETIC_SIMPLE);
            const series = new SeriesFactory().generate(1, 'series');
            const comparison = new ComparisonFactory().generate(1, 'compare');
            const word = new WordProblemFactory().generate(1, 'word');

            expect(typeof arithmetic.id).toBe('string');
            expect(arithmetic.id.length).toBeGreaterThan(0);
            expect(typeof series.id).toBe('string');
            expect(series.id.length).toBeGreaterThan(0);
            expect(typeof comparison.id).toBe('string');
            expect(comparison.id.length).toBeGreaterThan(0);
            expect(typeof word.id).toBe('string');
            expect(word.id.length).toBeGreaterThan(0);
        });

        it("11. Each problem has correct 'type' field", () => {
            const arithmetic = new ArithmeticFactory().generate(1, ProblemTypes.ARITHMETIC_SIMPLE);
            const series = new SeriesFactory().generate(1, 'series');
            const comparison = new ComparisonFactory().generate(1, 'compare');
            const word = new WordProblemFactory().generate(1, 'word');

            expect(arithmetic.type).toBe('arithmetic');
            expect(series.type).toBe('series');
            expect(comparison.type).toBe('compare');
            expect(word.type).toBe('word');
        });
    });
});
