import type { Problem, ArithmeticProblem, ComparisonProblem, SeriesProblem, WordProblem } from '../lib/gameLogic';

export interface IProblemFactory {
    generate(level: number, type: string): Problem;
}

export class ArithmeticFactory implements IProblemFactory {
    generate(level: number, type: string): ArithmeticProblem {
        let num1 = 0, num2 = 0, answer = 0;
        let operator: '+' | '-' | '*' | '/' = '+';
        let subType: 'simple' | 'carry' | 'borrow' | 'zero' | undefined;

        switch (type) {
            case 'addition_simple':
                operator = '+';
                subType = 'simple';
                if (level === 1) {
                    num1 = Math.floor(Math.random() * 10) + 1;
                    num2 = Math.floor(Math.random() * (10 - num1 + 1));
                } else {
                    num1 = Math.floor(Math.random() * 90) + 10;
                    num2 = Math.floor(Math.random() * (100 - num1));
                }
                break;

            case 'addition_carry':
                operator = '+';
                subType = 'carry';
                // Force carry
                do {
                    num1 = Math.floor(Math.random() * 400) + 100;
                    num2 = Math.floor(Math.random() * 400) + 100;
                } while ((num1 % 100) + (num2 % 100) < 100);
                break;

            case 'sub_simple':
                operator = '-';
                subType = 'simple';
                if (level === 1) {
                    num1 = Math.floor(Math.random() * 10) + 1;
                    num2 = Math.floor(Math.random() * num1);
                } else {
                    num1 = Math.floor(Math.random() * 90) + 10;
                    num2 = Math.floor(Math.random() * num1);
                }
                break;

            case 'sub_borrow':
                operator = '-';
                subType = 'borrow';
                num1 = Math.floor(Math.random() * 800) + 100;
                const digit1 = num1 % 10;
                // Force digit2 > digit1
                const digit2 = Math.floor(Math.random() * (9 - digit1)) + digit1 + 1;
                num2 = Math.floor(Math.random() * (num1 - 10)) + 10;
                num2 = (Math.floor(num2 / 10) * 10) + digit2;
                if (num2 > num1) num2 -= 10;
                break;

            case 'sub_zero':
                operator = '-';
                subType = 'zero';
                const hundreds = Math.floor(Math.random() * 9) + 1;
                const ones = Math.floor(Math.random() * 10);
                num1 = hundreds * 100 + ones; // e.g. 503
                num2 = Math.floor(Math.random() * 89) + 10;
                if (num2 > num1) num2 = Math.floor(num1 / 2);
                break;

            case 'multiplication':
                operator = '*';
                num1 = Math.floor(Math.random() * 10) + 1;
                num2 = Math.floor(Math.random() * 10) + 1;
                break;

            case 'division':
                operator = '/';
                num2 = Math.floor(Math.random() * 9) + 2;
                answer = Math.floor(Math.random() * 10) + 1;
                num1 = answer * num2;
                break;
        }

        if (operator === '+') answer = num1 + num2;
        else if (operator === '-') answer = num1 - num2;
        else if (operator === '*') answer = num1 * num2;
        else if (operator === '/' && !answer) answer = num1 / num2;

        return {
            type: 'arithmetic',
            id: crypto.randomUUID(),
            num1,
            num2,
            operator,
            answer,
            missing: 'answer',
            subType
        };
    }
}

export class AlgebraicFactory implements IProblemFactory {
    generate(level: number, type: string): ArithmeticProblem {
        const baseFactory = new ArithmeticFactory();
        const problem = baseFactory.generate(level, type.replace('_missing', ''));

        problem.missing = Math.random() > 0.5 ? 'num1' : 'num2';
        return problem;
    }
}

export class ComparisonFactory implements IProblemFactory {
    generate(level: number, _type: string): ComparisonProblem {
        let num1, num2;

        if (level <= 2) {
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * 10) + 1;
        } else {
            num1 = Math.floor(Math.random() * 100) + 1;
            num2 = Math.floor(Math.random() * 100) + 1;
        }

        let symbol: '>' | '<' | '=' = '=';
        if (num1 > num2) symbol = '>';
        else if (num1 < num2) symbol = '<';

        return {
            type: 'compare',
            id: crypto.randomUUID(),
            num1,
            num2,
            operator: 'compare',
            answer: symbol
        };
    }
}

export class SeriesFactory implements IProblemFactory {
    generate(level: number, _type: string): SeriesProblem {
        // Linear series: start + n*step
        const step = Math.floor(Math.random() * (level * 2)) + 1; // Step size increases with level
        const start = Math.floor(Math.random() * 20);

        const length = 4;
        const sequence: number[] = [];
        for (let i = 0; i < length; i++) {
            sequence.push(start + (i * step));
        }

        // Hide one
        const missingIndex = Math.floor(Math.random() * length);
        const answer = sequence[missingIndex];
        sequence[missingIndex] = 0; // Placeholder

        return {
            type: 'series',
            id: crypto.randomUUID(),
            sequence,
            missingIndex,
            rule: `+${step}`,
            answer
        };
    }
}

export class WordProblemFactory implements IProblemFactory {
    generate(level: number, _type: string): WordProblem {
        // Basic template selection
        const templates = [
            'apples_add',
            'candies_sub'
        ];
        const key = templates[Math.floor(Math.random() * templates.length)];

        const n1 = Math.floor(Math.random() * 5) + 3;
        const n2 = Math.floor(Math.random() * 3) + 1;
        const isAdd = key.includes('add');
        const answer = isAdd ? n1 + n2 : n1 - n2;

        return {
            type: 'word',
            id: crypto.randomUUID(),
            questionKey: `wordProblems.${key}`, // e.g., "Dan has {n1} apples..."
            params: { n1, n2 },
            subType: isAdd ? 'addition' : 'subtraction',
            answer
        };
    }
}
