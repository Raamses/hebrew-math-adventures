import type { Problem } from '../lib/gameLogic';

export interface IProblemFactory {
    generate(level: number, type: string): Problem;
}

export class ArithmeticFactory implements IProblemFactory {
    generate(level: number, type: string): Problem {
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
    generate(level: number, type: string): Problem {
        // Reuse arithmetic logic for base numbers, but change 'missing'
        // For simplicity, we delegate to ArithmeticFactory then modify result
        const baseFactory = new ArithmeticFactory();
        const problem = baseFactory.generate(level, type.replace('_missing', '')); // map 'addition_simple_missing' -> 'addition_simple'

        // Randomly hide operand
        problem.missing = Math.random() > 0.5 ? 'num1' : 'num2';

        return problem;
    }
}

export class ComparisonFactory implements IProblemFactory {
    generate(level: number, _type: string): Problem {
        let num1, num2;

        if (level <= 2) {
            // 1-digit comparison
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * 10) + 1;
        } else {
            // 2-digit comparison
            num1 = Math.floor(Math.random() * 100) + 1;
            num2 = Math.floor(Math.random() * 100) + 1;
        }

        let symbol = '=';
        if (num1 > num2) symbol = '>';
        else if (num1 < num2) symbol = '<';

        return {
            num1,
            num2,
            operator: 'compare',
            answer: symbol,
            missing: 'answer',
            subType: 'simple'
        };
    }
}
