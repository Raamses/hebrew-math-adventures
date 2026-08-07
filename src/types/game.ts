/**
 * Shared game types — leaf-level type definitions used across engines and lib.
 *
 * This file exists to break the lib→engines dependency that would occur if
 * worldConfig.ts (in lib/) imported types from engines/bubble/types.ts.
 *
 * Engines that previously defined these types should re-export from here
 * for backward compatibility.
 */

// --- Condition Types ---

export type WinConditionType = 'target_count' | 'time_limit' | 'endless';
export type FailConditionType = 'timer_zero' | 'screen_full' | 'missed_target_limit' | 'strikes';

// --- Arcade Mode ---

export type ArcadeMode = 'zen' | 'classic' | 'blitz' | 'survival';

// --- Difficulty / Theme (used by GameConfig) ---

export type DifficultyCurve = 'linear' | 'exponential' | 'static';
export type GameTheme = 'space' | 'underwater' | 'standard';
