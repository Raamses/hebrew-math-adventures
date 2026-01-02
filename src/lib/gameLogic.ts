export type Difficulty = 'easy' | 'medium' | 'hard';

export type ProblemType = 'arithmetic' | 'compare' | 'series' | 'word' | 'sensory';

export interface BaseProblem {
    type: ProblemType;
    id: string;
    answer: number | string;
    metadata?: { isChallenge?: boolean; isRescue?: boolean };
}

export interface ArithmeticProblem extends BaseProblem {
    type: 'arithmetic';
    num1: number;
    num2: number;
    operator: '+' | '-' | '*' | '/';
    missing: 'answer' | 'num1' | 'num2';
    subType?: 'borrow' | 'carry' | 'simple' | 'zero';
}

export interface ComparisonProblem extends BaseProblem {
    type: 'compare';
    num1: number;
    num2: number;
    operator: 'compare';
    answer: '>' | '<' | '=';
}

export interface SeriesProblem extends BaseProblem {
    type: 'series';
    sequence: number[]; // e.g. [2, 4, 6, 0] where 0 is the missing slot
    missingIndex: number; // index of the answer in the sequence
    rule: string;
}

export interface WordProblem extends BaseProblem {
    type: 'word';
    questionKey: string; // Translation key
    params: Record<string, string | number>;
    subType?: 'addition' | 'subtraction';
}

export interface SensoryProblem extends BaseProblem {
    type: 'sensory';
    target: number; // The number to find/pop
    items: Array<{ value: number; id: string; variant?: 'small' | 'medium' | 'large' }>; // The bubbles
    duration?: number; // Optional time limit
}

export type Problem = ArithmeticProblem | ComparisonProblem | SeriesProblem | WordProblem | SensoryProblem;

export const generateProblem = (streak: number): ArithmeticProblem => {
    let difficulty: Difficulty = 'easy';
    if (streak > 10) difficulty = 'hard';
    else if (streak > 5) difficulty = 'medium';

    let num1, num2, answer;
    let operator: '+' | '-' = Math.random() > 0.5 ? '+' : '-';

    if (difficulty === 'easy') {
        // Sum up to 10
        if (operator === '+') {
            num1 = Math.floor(Math.random() * 6); // 0-5
            num2 = Math.floor(Math.random() * (10 - num1 + 1));
            answer = num1 + num2;
        } else {
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * (num1 + 1));
            answer = num1 - num2;
        }
    } else if (difficulty === 'medium') {
        // Sum up to 15, maybe missing number
        if (operator === '+') {
            num1 = Math.floor(Math.random() * 10);
            num2 = Math.floor(Math.random() * (15 - num1 + 1));
            answer = num1 + num2;
        } else {
            num1 = Math.floor(Math.random() * 15) + 1;
            num2 = Math.floor(Math.random() * (num1 + 1));
            answer = num1 - num2;
        }
    } else {
        // Hard: Sum up to 20
        if (operator === '+') {
            num1 = Math.floor(Math.random() * 15);
            num2 = Math.floor(Math.random() * (20 - num1 + 1));
            answer = num1 + num2;
        } else {
            num1 = Math.floor(Math.random() * 20) + 1;
            num2 = Math.floor(Math.random() * (num1 + 1));
            answer = num1 - num2;
        }
    }

    // Determine missing part based on difficulty/streak
    let missing: 'answer' | 'num1' | 'num2' = 'answer';
    if (difficulty !== 'easy' && Math.random() > 0.6) {
        missing = Math.random() > 0.5 ? 'num1' : 'num2';
    }

    return {
        type: 'arithmetic',
        id: Math.random().toString(36).substr(2, 9),
        num1,
        num2,
        operator,
        missing,
        answer: answer!
    };
};
