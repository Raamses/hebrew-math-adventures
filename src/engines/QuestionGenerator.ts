import type { Problem } from '../lib/gameLogic';
import type { IProblemFactory } from './ProblemFactory';
import { ArithmeticFactory, AlgebraicFactory, ComparisonFactory, SeriesFactory, WordProblemFactory } from './ProblemFactory';

type QuestionType = 'addition_simple' | 'addition_carry' | 'sub_simple' | 'sub_borrow' | 'sub_zero' | 'multiplication' | 'division' |
    'addition_simple_missing' | 'sub_simple_missing' | 'comparison_simple' | 'series_simple' | 'word_problem_simple';

export class QuestionGenerator {
    private static instance: QuestionGenerator;
    private bag: QuestionType[] = [];
    private history: Problem[] = [];
    private readonly HISTORY_SIZE = 3;

    private arithmeticFactory: IProblemFactory;
    private algebraicFactory: IProblemFactory;
    private comparisonFactory: IProblemFactory;
    private seriesFactory: IProblemFactory;
    private wordProblemFactory: IProblemFactory;

    private constructor() {
        this.arithmeticFactory = new ArithmeticFactory();
        this.algebraicFactory = new AlgebraicFactory();
        this.comparisonFactory = new ComparisonFactory();
        this.seriesFactory = new SeriesFactory();
        this.wordProblemFactory = new WordProblemFactory();
    }

    public static getInstance(): QuestionGenerator {
        if (!QuestionGenerator.instance) {
            QuestionGenerator.instance = new QuestionGenerator();
        }
        return QuestionGenerator.instance;
    }

    private refillBag(level: number) {
        this.bag = [];

        if (level === 1) {
            // Level 1: Single-digit only
            this.bag = ['addition_simple', 'sub_simple', 'addition_simple', 'sub_simple'];
        } else if (level === 2) {
            // Level 2: 2-digit simple
            this.bag = [
                'addition_simple', 'sub_simple',
                'addition_simple', 'sub_simple',
                'comparison_simple', 'comparison_simple'
            ];
        } else if (level === 3) {
            // Level 3: Intro to 3-digit + Algebraic Start + Series
            this.bag = [
                'addition_carry', 'sub_borrow',
                'addition_simple', 'sub_simple',
                'sub_zero',
                'addition_simple_missing',
                'comparison_simple',
                'series_simple',
                'word_problem_simple'
            ];
        } else {
            // Level 4+: Full mix
            this.bag = [
                'addition_carry', 'sub_borrow', 'sub_zero',
                'multiplication', 'multiplication',
                'division', 'division',
                'addition_simple_missing', 'sub_simple_missing',
                'comparison_simple',
                'series_simple',
                'word_problem_simple'
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
        // Simple duplicate check based on ID or answer if possible, but distinct types have different structures
        // New approach: Check generic properties or type specific
        // For now, simpler check
        return this.history.some(p => p.answer === problem.answer && p.type === problem.type);
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
            // Factory Selection Strategy
            if (type.startsWith('series')) {
                problem = this.seriesFactory.generate(level, type);
            } else if (type.startsWith('word')) {
                problem = this.wordProblemFactory.generate(level, type);
            } else if (type.includes('missing')) {
                problem = this.algebraicFactory.generate(level, type);
            } else if (type === 'comparison_simple') {
                problem = this.comparisonFactory.generate(level, type);
            } else {
                problem = this.arithmeticFactory.generate(level, type);
            }
            attempts++;
        } while (this.isDuplicate(problem) && attempts < 5);

        this.addToHistory(problem);
        return problem;
    }
}
