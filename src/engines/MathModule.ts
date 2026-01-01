import type { IGameModule, GameFeedback } from './interfaces';
import type { UserCapabilityProfile } from '../types/progress';
import type { UserProfile } from '../types/user';
import type { Problem } from '../lib/gameLogic';
import { ArithmeticFactory, AlgebraicFactory, ComparisonFactory, SeriesFactory, WordProblemFactory, type IProblemFactory } from './ProblemFactory';

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

        // ADAPTIVE LOGIC
        // 1. Get stats for this problem type
        const stats = profile.skills[type];

        // Clone params (or create new) to avoid mutation
        const effectiveConfig = { ...params };

        if (stats) {
            // BOOST: If doing very well (>5 correct in a row), increase challenge
            if (stats.consecutiveCorrect > 5) {
                // Example: Increase max number by 20% if max is defined
                if (effectiveConfig.max) {
                    effectiveConfig.max = Math.floor(effectiveConfig.max * 1.2);
                }
                effectiveConfig.isBoosted = true; // Flag for UI?
            }

            // ASSIST: If struggling (>2 wrong in a row), decrease challenge
            if (stats.consecutiveWrong > 2) {
                if (effectiveConfig.max) {
                    effectiveConfig.max = Math.floor(Math.max(5, effectiveConfig.max * 0.8));
                }
                effectiveConfig.isAssisted = true;
            }
        }

        // Identify correct factory
        let factory: IProblemFactory;

        if (type.startsWith('series')) factory = this.factories.series;
        else if (type.startsWith('word')) factory = this.factories.word;
        else if (type.includes('missing')) factory = this.factories.algebraic;
        else if (type.startsWith('compare') || type === 'comparison_simple') factory = this.factories.comparison;
        else factory = this.factories.arithmetic;

        return factory.generate(level, type, effectiveConfig);
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
        // This duplicates logic from QuestionGenerator for now. 
        // In full refactor, this becomes granular.
        if (level === 1) return Math.random() > 0.5 ? 'addition_simple' : 'sub_simple';
        if (level === 2) return 'addition_simple'; // Placeholder

        // Fallback default
        return 'addition_simple';
    }
}
