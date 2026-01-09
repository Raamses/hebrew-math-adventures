import type { IGameModule, GameFeedback } from './interfaces';
import type { UserCapabilityProfile } from '../types/progress';
import type { Problem } from '../lib/gameLogic';
import { ArithmeticFactory, AlgebraicFactory, ComparisonFactory, SeriesFactory, WordProblemFactory, type IProblemFactory } from './ProblemFactory';
import { Director } from './GameDirector';

export class MathModule implements IGameModule {
    moduleId = 'math_core';

    private factories: Record<string, IProblemFactory> = {
        arithmetic: new ArithmeticFactory(),
        algebraic: new AlgebraicFactory(),
        comparison: new ComparisonFactory(),
        series: new SeriesFactory(),
        word: new WordProblemFactory()
    };

    generateProblem(profile: UserCapabilityProfile, params?: Record<string, any>): Problem {
        // 1. Determine Difficulty Level
        const level = params?.difficulty || profile.estimatedLevel || 1;

        // 2. Determine Problem Type (Manual Override -> Adaptive Selection)
        const initialType = params?.type || this.pickProblemType(level);

        // 3. Apply AI Director Tuning (Adaptive Logic)
        const effectiveConfig = Director.tuneConfig(params || {}, profile);
        const finalType = effectiveConfig.type || initialType;

        // 4. Select Factory & Generate
        const factory = this.getFactoryForType(finalType);
        return factory.generate(level, finalType, effectiveConfig);
    }

    private getFactoryForType(type: string): IProblemFactory {
        if (type.startsWith('series')) return this.factories.series;
        if (type.startsWith('word')) return this.factories.word;
        if (type.includes('missing')) return this.factories.algebraic;
        if (type.startsWith('compare') || type === 'comparison_simple') return this.factories.comparison;
        return this.factories.arithmetic;
    }

    evaluate(problem: Problem, answer: string | number): GameFeedback {
        const isCorrect = this.checkAnswer(problem, answer);

        return {
            isCorrect,
            correctAnswer: problem.answer,
            xpGained: 0, // Deprecated, preserved for interface compat until full cleanup
            message: isCorrect ? 'feedback.correct' : 'feedback.defaultError'
        };
    }

    private checkAnswer(problem: Problem, answer: string | number): boolean {
        return problem.answer.toString() === answer.toString();
    }

    // Configuration for Level Progression
    // Maps Level -> New Problem Types introduced at that level
    private static readonly LEVEL_PROGRESSION: Record<number, string[]> = {
        1: ['sub_simple', 'comparison'],
        2: ['series'],
        3: ['addition_carry', 'sub_borrow', 'word'],
        4: ['multiplication'],
        5: ['division', 'sub_zero']
    };

    private pickProblemType(level: number): string {
        // Start with base types available at Level 0/1
        const availableTypes: string[] = ['addition_simple'];

        // Accumulate types from all levels up to the current one
        for (let l = 1; l <= level; l++) {
            const newTypes = MathModule.LEVEL_PROGRESSION[l];
            if (newTypes) {
                availableTypes.push(...newTypes);
            }
        }

        // Randomly select one
        return availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }
}
