import type { IGameModule, GameFeedback } from './interfaces';
import type { UserCapabilityProfile } from '../types/progress';
import type { UserProfile } from '../types/user';
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
        // Logic to translate "Medical Record" to specific factory params
        // Check for manual override or Director params
        const level = params?.difficulty || profile.estimatedLevel || 1;

        // If the focus is explicitly set to a difficulty level (legacy support)
        // In the future this switches to looking at profile.skills['addition_sum_5']

        // If the focus is explicitly set to a difficulty level (legacy support)
        // In the future this switches to looking at profile.skills['addition_sum_5']

        // Simple Bag-Deck logic (simplified from QuestionGenerator)
        // Check for manual type override in params (e.g., from Node Config)
        const type = params?.type || this.pickProblemType(level);

        // ADAPTIVE LOGIC with DIRECTOR
        // The Director 'tunes' the static config based on the user's profile
        const effectiveConfig = Director.tuneConfig(params || {}, profile); // Merge params with profile adaptation

        // If type changed during tuning (e.g., rescue mode downgrade), respect it
        const finalType = effectiveConfig.type || type;

        // Identify correct factory
        let factory: IProblemFactory;

        if (finalType.startsWith('series')) factory = this.factories.series;
        else if (finalType.startsWith('word')) factory = this.factories.word;
        else if (finalType.includes('missing')) factory = this.factories.algebraic;
        else if (finalType.startsWith('compare') || finalType === 'comparison_simple') factory = this.factories.comparison;
        else factory = this.factories.arithmetic;

        return factory.generate(level, finalType, effectiveConfig);
    }

    evaluate(problem: Problem, answer: string | number, profile: UserProfile): GameFeedback { // Use profile: UserProfile
        const isCorrect = problem.answer.toString() === answer.toString();

        // Default XP logic (can be made smarter later)
        let xp = 0;
        if (isCorrect) {
            xp = 5 + (profile.streak * 2); // Simple streak bonus
        } else {
            xp = -2;
        }

        return {
            isCorrect,
            correctAnswer: problem.answer,
            xpGained: xp,
            message: isCorrect ? 'Great job!' : 'Try again!'
        };
    }

    private pickProblemType(level: number): string {
        // Fallback logic if no specific type is requested in params
        // Returns a random suitable problem type for the given difficulty level

        const types: string[] = ['addition_simple']; // Always available

        if (level >= 1) {
            types.push('sub_simple', 'comparison');
        }
        if (level >= 2) {
            types.push('series');
        }
        if (level >= 3) {
            types.push('addition_carry', 'sub_borrow', 'word');
        }
        if (level >= 4) {
            types.push('multiplication');
        }
        if (level >= 5) {
            types.push('division', 'sub_zero');
        }

        // Randomly select one
        return types[Math.floor(Math.random() * types.length)];
    }
}
