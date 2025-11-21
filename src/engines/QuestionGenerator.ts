import type { Problem } from '../lib/gameLogic';

type QuestionType = 'addition_simple' | 'addition_carry' | 'sub_simple' | 'sub_borrow' | 'sub_zero' | 'multiplication' | 'division';

export class QuestionGenerator {
    private static instance: QuestionGenerator;
    private bag: QuestionType[] = [];
    private history: Problem[] = [];
    private readonly HISTORY_SIZE = 3;

    private constructor() { }

    public static getInstance(): QuestionGenerator {
        if (!QuestionGenerator.instance) {
            QuestionGenerator.instance = new QuestionGenerator();
        }
        return QuestionGenerator.instance;
    }

    private refillBag(level: number) {
        this.bag = [];

        if (level === 1) {
            // Level 1: Single-digit only (for 6-year-olds)
            this.bag = ['addition_simple', 'sub_simple', 'addition_simple', 'sub_simple'];
        } else if (level === 2) {
            // Level 2: 2-digit simple operations
            this.bag = ['addition_simple', 'sub_simple', 'addition_simple', 'sub_simple'];
        } else if (level === 3) {
            // Level 3: Intro to 3-digit and more complex 2-digit
            this.bag = [
                'addition_carry', 'addition_carry',
                'sub_borrow', 'sub_borrow',
                'addition_simple', 'sub_simple',
                'sub_zero'
            ];
        } else {
            // Level 4+: Full mix including mult/div
            this.bag = [
                'addition_carry', 'sub_borrow', 'sub_zero',
                'multiplication', 'multiplication',
                'division', 'division'
            ];
        }

        // Shuffle
        for (let i = this.bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
    }

    private getNextType(level: number): QuestionType {
        if (this.bag.length === 0) {
            this.refillBag(level);
        }
        return this.bag.pop()!;
    }

    private isDuplicate(problem: Problem): boolean {
        return this.history.some(p =>
            (p.num1 === problem.num1 && p.num2 === problem.num2 && p.operator === problem.operator) ||
            (p.answer === problem.answer) // Avoid same answer repeatedly
        );
    }

    private addToHistory(problem: Problem) {
        this.history.push(problem);
        if (this.history.length > this.HISTORY_SIZE) {
            this.history.shift();
        }
    }

    public reset() {
        this.history = [];
        this.bag = [];
    }

    public generate(level: number): Problem {
        let problem: Problem;
        let attempts = 0;

        do {
            const type = this.getNextType(level);
            problem = this.createProblemFromType(type, level);
            attempts++;
        } while (this.isDuplicate(problem) && attempts < 5);

        this.addToHistory(problem);
        return problem;
    }

    private createProblemFromType(type: QuestionType, level: number): Problem {
        let num1 = 0, num2 = 0, answer = 0;
        let operator: '+' | '-' | '*' | '/' = '+';
        let subType: 'simple' | 'carry' | 'borrow' | 'zero' | undefined;

        switch (type) {
            case 'addition_simple':
                operator = '+';
                subType = 'simple';
                if (level === 1) {
                    // Level 1: Single-digit, sum ≤ 10
                    num1 = Math.floor(Math.random() * 10) + 1; // 1-10
                    num2 = Math.floor(Math.random() * (10 - num1 + 1)); // Ensure sum ≤ 10
                } else {
                    // Level 2+: 2-digit simple
                    num1 = Math.floor(Math.random() * 90) + 10;
                    num2 = Math.floor(Math.random() * (100 - num1));
                }
                break;

            case 'addition_carry':
                operator = '+';
                subType = 'carry';
                // 3-digit carry: (a % 100) + (b % 100) > 100 is too strict for "carry", 
                // let's just ensure a carry happens in ones or tens.
                // User requested: a = random(100, 899), b = random(100, 999-a). Ensure (a%100)+(b%100) > 100 not strictly needed for carry, 
                // but let's follow the spirit: force a carry.

                // Let's try: 
                // num1 = 100-899
                // num2 such that sum < 1000 but carry occurs.
                num1 = Math.floor(Math.random() * 400) + 100;
                num2 = Math.floor(Math.random() * 400) + 100;
                // Force carry in tens place: (num1 % 100) + (num2 % 100) >= 100
                // Or simpler: just ensure result > num1 and result > num2 and some digit logic.
                // Let's stick to the user's specific request logic if possible, or a robust approximation.
                // User: "Ensure (a % 100) + (b % 100) > 100" -> This implies carry from tens to hundreds.
                while ((num1 % 100) + (num2 % 100) < 100) {
                    num1 = Math.floor(Math.random() * 400) + 100;
                    num2 = Math.floor(Math.random() * 400) + 100;
                }
                break;

            case 'sub_simple':
                operator = '-';
                subType = 'simple';
                if (level === 1) {
                    // Level 1: Single-digit subtraction
                    num1 = Math.floor(Math.random() * 10) + 1; // 1-10
                    num2 = Math.floor(Math.random() * num1); // Ensure non-negative
                } else {
                    // Level 2+: 2-digit subtraction
                    num1 = Math.floor(Math.random() * 90) + 10;
                    num2 = Math.floor(Math.random() * num1);
                }
                break;

            case 'sub_borrow':
                operator = '-';
                subType = 'borrow';
                // User: Generate a (minuend) and b (subtrahend). Ensure (a % 10) < (b % 10).
                // 3-digit range for Level 3+
                num1 = Math.floor(Math.random() * 800) + 100; // 100-900
                let digit1 = num1 % 10;
                // Force digit2 > digit1
                let digit2 = Math.floor(Math.random() * (9 - digit1)) + digit1 + 1;
                // Reconstruct num2
                // We need num2 < num1. 
                // Let's just pick num2 randomly and fix the last digit.
                num2 = Math.floor(Math.random() * (num1 - 10)) + 10;
                // Adjust num2's last digit to be digit2 (which is > digit1)
                num2 = (Math.floor(num2 / 10) * 10) + digit2;
                if (num2 > num1) num2 -= 10; // Ensure it's smaller
                break;

            case 'sub_zero':
                operator = '-';
                subType = 'zero';
                // e.g. 503 - 15
                // num1 has a 0 in the tens place.
                const hundreds = Math.floor(Math.random() * 9) + 1; // 1-9
                const ones = Math.floor(Math.random() * 10);
                num1 = hundreds * 100 + ones; // e.g. 503

                // num2 should be small enough to force borrowing from the zero
                // e.g. 10-99
                num2 = Math.floor(Math.random() * 89) + 10;

                // Ensure result is positive
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
            missing: 'answer', // Default to answer for now
            subType
        };
    }
}
