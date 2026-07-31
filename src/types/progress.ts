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
    streak: number;
    age?: number;
}

export const SKILL_KEY_MAP: Record<string, string> = {
    'addition_simple': 'addition',
    'addition_carry': 'addition_carry',
    'addition_missing': 'addition_missing',
    'sub_simple': 'subtraction',
    'sub_borrow': 'subtraction_borrow',
    'multiplication': 'multiplication',
    'division': 'division',
    'series_simple': 'series',
    'series_geometric': 'series_geometric',
    'comparison_simple': 'comparison',
    'comparison_complex': 'comparison',
    'word_simple': 'word_problems',
    'word': 'word_problems',
    'algebraic': 'algebraic',
};

export const INITIAL_CAPABILITY_PROFILE: UserCapabilityProfile = {
    skills: {},
    currentFocus: 'addition',
    consecutiveFailures: 0,
    estimatedLevel: 1,
    streak: 0
};

// --- Memory Duel Best Score Tracking ---
export interface MemoryBestScore {
    bestTime: number | null;
    bestMoves: number | null;
}

export const MEMORY_BEST_SCORE_KEY = 'hebrew-math-memory-best';

// --- Math Invaders Best Score Tracking ---
export const INVADERS_BEST_SCORE_KEY = 'hebrew-math-invaders-best';
