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

