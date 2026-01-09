import type { Problem } from '../lib/gameLogic';
import type { UserCapabilityProfile } from '../types/progress';

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
    evaluate(problem: Problem, answer: string | number): GameFeedback;
}

export interface GameSessionConfig {
    moduleId: string;
    // Potentially specific config for the session
    params?: Record<string, any>;
}

export interface BaseGameConfig {
    isRescue?: boolean;
    isChallenge?: boolean;
    max?: number;
    type?: string;
    step?: number;
    density?: number;
    [key: string]: any;
}

export interface IGameDirector {
    // The "Brain" - decides which module/difficulty to serve next
    getNextConfig(profile: UserCapabilityProfile): GameSessionConfig;
    tuneConfig<T extends BaseGameConfig>(baseConfig: T, profile: UserCapabilityProfile): T;
    // Notifies director of result (so it can update heuristics)
    recordResult(profile: UserCapabilityProfile, isCorrect: boolean): UserCapabilityProfile;
}
