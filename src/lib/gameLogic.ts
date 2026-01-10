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

export const formatProblemEquation = (p: Problem): string => {
    if (p.type === 'arithmetic') {
        const ap = p as ArithmeticProblem;
        return `${ap.num1} ${ap.operator} ${ap.num2}`;
    }
    if (p.type === 'compare') {
        return `${(p as ComparisonProblem).num1} ? ${(p as ComparisonProblem).num2}`;
    }
    if (p.type === 'series') {
        return `Series: ${(p as SeriesProblem).sequence.join(', ')}`;
    }
    if (p.type === 'word') {
        return `Word Problem: ${(p as WordProblem).questionKey}`;
    }
    return 'Unknown Problem';
};
