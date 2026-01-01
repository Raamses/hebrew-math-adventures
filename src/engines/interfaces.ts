import type { Problem } from '../lib/gameLogic';
import type { UserCapabilityProfile } from '../types/progress';
import type { UserProfile } from '../types/user';

export interface GameFeedback {
    isCorrect: boolean;
    correctAnswer: string | number;
    xpGained: number;
    message?: string;
}

export interface IGameModule {
    moduleId: string;

    // Ask the module for a problem appropriate for these capabilities
    generateProblem(profile: UserCapabilityProfile, params?: Record<string, any>): Problem;

    // Evaluate answer (returns XP, feedback, etc.)
    evaluate(problem: Problem, answer: string | number, profile: UserProfile): GameFeedback;
}

export interface GameSessionConfig {
    moduleId: string;
    // Potentially specific config for the session
    params?: Record<string, any>;
}

export interface IGameDirector {
    // The "Brain" - decides which module/difficulty to serve next
    getNextConfig(profile: UserCapabilityProfile): GameSessionConfig;
    tuneConfig(baseConfig: any, profile: UserCapabilityProfile): any;
    // Notifies director of result (so it can update heuristics)
    recordResult(profile: UserCapabilityProfile, isCorrect: boolean): UserCapabilityProfile;
}
