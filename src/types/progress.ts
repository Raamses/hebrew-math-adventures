export interface SkillStats {
    attempts: number;
    correct: number;
    consecutiveCorrect: number;
    consecutiveWrong: number;
    lastPlayedAt: number; // Timestamp
    avgSpeedMs: number;
}

export interface UserCapabilityProfile {
    // Skills index: e.g. "addition_sum_5", "subtraction_borrow"
    skills: Record<string, SkillStats>;

    // Heuristics for the Director
    currentFocus: string; // The active Skill ID being trained
    consecutiveFailures: number; // Global failure count (for immediate rescue)

    // Legacy mapping (optional, for UI display if needed)
    estimatedLevel: number;
}

export const INITIAL_CAPABILITY_PROFILE: UserCapabilityProfile = {
    skills: {},
    currentFocus: 'addition_sum_5',
    consecutiveFailures: 0,
    estimatedLevel: 1
};
