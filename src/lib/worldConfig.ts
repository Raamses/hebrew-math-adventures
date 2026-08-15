/**
 * worldConfig.ts — Single source of truth for all game-world constants.
 *
 * This module is a TRUE LEAF: it imports only from `lucide-react` (for zone
 * icons) and `types/game` (for shared type definitions).  It never imports
 * from engines/, components/, hooks/, context/, or data/.
 *
 * All other modules import config FROM here; nothing in here imports FROM
 * them.
 *
 * Migration is additive-first: existing exports (WORLD_ZONES, getZoneForLevel,
 * ZoneConfig) remain unchanged.  New config namespaces are added below and
 * consumers are gradually switched over.
 */

import { type LucideIcon, Palmtree, Trees, Mountain, Sparkles } from 'lucide-react';
import type {
    WinConditionType,
    FailConditionType,
    ArcadeMode,
} from '../types/game';

// ================================================================
//  Global Scalars
// ================================================================

export const MAX_LEVEL = 10;
export const MIN_LEVEL = 0;
export const BOSS_LEVELS = [3, 6, 9] as const;
export const BOSS_GATE_PROBLEM_COUNT = 3;

// ================================================================
//  Zone Config (existing — kept as-is)
// ================================================================

export interface ZoneConfig {
    id: string;
    name: string;
    description: string;
    minLevel: number;
    maxLevel: number;
    icon: LucideIcon;
    themeColor: string; // Tailwind class or hex
    backgroundClass: string; // For dynamic background switching
}

export const WORLD_ZONES: ZoneConfig[] = [
    {
        id: 'sensory_beach',
        name: 'zones.sensory.name',
        description: 'zones.sensory.desc',
        minLevel: 0,
        maxLevel: 10, // Always active for current levels
        icon: Sparkles,
        themeColor: 'text-blue-400',
        backgroundClass: 'bg-blue-50'
    },
    {
        id: 'addition_island',
        name: 'zones.addition.name',
        description: 'zones.addition.desc',
        minLevel: 1,
        maxLevel: 2,
        icon: Palmtree,
        themeColor: 'text-emerald-500',
        backgroundClass: 'bg-emerald-50'
    },
    {
        id: 'subtraction_forest',
        name: 'zones.subtraction.name',
        description: 'zones.subtraction.desc',
        minLevel: 3,
        maxLevel: 4,
        icon: Trees,
        themeColor: 'text-amber-600',
        backgroundClass: 'bg-amber-50'
    },
    {
        id: 'multiplication_mountain',
        name: 'zones.multiplication.name',
        description: 'zones.multiplication.desc',
        minLevel: 5,
        maxLevel: 10, // Assuming 10 is max for now
        icon: Mountain,
        themeColor: 'text-indigo-600',
        backgroundClass: 'bg-indigo-50'
    }
];

export const getZoneForLevel = (level: number): ZoneConfig | undefined => {
    return WORLD_ZONES.find(z => level >= z.minLevel && level <= z.maxLevel);
};

// ================================================================
//  Director Config
// ================================================================

export const DIRECTOR_CONFIG = {
    CHALLENGE_THRESHOLD: 5,
    STREAK_THRESHOLD: 5,
    RESCUE_MULTIPLIER: 0.8,
    CHALLENGE_MULTIPLIER: 1.2,
    MIN_MAX_VALUE: 5,
    MASTERY_THRESHOLD: 10,
    MASTERY_ACCURACY: 0.8,
    /** Age-based rescue threshold: age >= 8 → 3 consecutive failures, else 2. */
    RESCUE_THRESHOLD_ADULT: 3,
    RESCUE_THRESHOLD_CHILD: 2,
} as const;

// ================================================================
//  Star Tier Config
// ================================================================

export const STAR_CONFIG = {
    PERFECT_MAX_MISTAKES: 1,
    GOOD_MAX_MISTAKES: 3,
} as const;

// ================================================================
//  Pet Config
// ================================================================

export interface PetStageConfig {
    index: 0 | 1 | 2 | 3 | 4;
    key: 'egg' | 'baby' | 'child' | 'teen' | 'adult';
    minLevel: number;
}

export const PET_STAGES: PetStageConfig[] = [
    { index: 0, key: 'egg',   minLevel: 1 },
    { index: 1, key: 'baby',  minLevel: 2 },
    { index: 2, key: 'child', minLevel: 4 },
    { index: 3, key: 'teen',  minLevel: 6 },
    { index: 4, key: 'adult', minLevel: 8 },
] as const;

// ================================================================
//  Theme Unlock Config
// ================================================================

/**
 * THEME_UNLOCKS holds just the star thresholds.  The full Theme objects
 * (with colors, patterns, etc.) remain in themes.ts and import these
 * thresholds from here.  This separates "when does a theme unlock?" (config)
 * from "what does a theme look like?" (content).
 */
export const THEME_UNLOCKS = [
    { id: 'default', unlockStars: 0 },
    { id: 'forest',  unlockStars: 30 },
    { id: 'space',   unlockStars: 60 },
    { id: 'candy',   unlockStars: 90 },
] as const;

// ================================================================
//  Mascot Unlock Config
// ================================================================

/**
 * MASCOT_UNLOCKS holds the star thresholds for mascot unlocks.
 * The mascot display data (emoji, name, species) stays in MascotSelector.tsx
 * and pet.ts.  This centralises the unlock-gate values.
 */
export const MASCOT_UNLOCKS = [
    { id: 'owl',  unlockStars: 0 },
    { id: 'bear', unlockStars: 50 },
    { id: 'ant',  unlockStars: 100 },
    { id: 'lion', unlockStars: 150 },
] as const;

// ================================================================
//  Problem Type Progression
// ================================================================

export const LEVEL_PROGRESSION: Record<number, readonly string[]> = {
    1: ['sub_simple', 'comparison'],
    2: ['series'],
    3: ['addition_carry', 'sub_borrow', 'word'],
    4: ['multiplication'],
    5: ['division', 'sub_zero'],
} as const;

export const BUBBLE_SUPPORTED_TYPES: ReadonlySet<string> = new Set([
    'addition_simple', 'addition_carry',
    'sub_simple', 'sub_borrow', 'sub_zero',
    'multiplication', 'division',
]);

// ================================================================
//  Memory Game Operations
// ================================================================

export const MEMORY_LEVEL_OPS: Record<number, readonly ('+' | '-' | '×' | '÷')[]> = {
    1:  ['+', '-'],
    2:  ['+', '-'],
    3:  ['+', '-'],
    4:  ['+', '-', '×'],
    5:  ['+', '-', '×', '÷'],
    6:  ['+', '-', '×', '÷'],
    7:  ['+', '-', '×', '÷'],
    8:  ['+', '-', '×', '÷'],
    9:  ['+', '-', '×', '÷'],
    10: ['+', '-', '×', '÷'],
} as const;

// ================================================================
//  Word Problem Difficulty Breakpoints
// ================================================================

export const DIFFICULTY_BREAKPOINTS = {
    EASY_MAX_LEVEL: 3,
    MEDIUM_MAX_LEVEL: 6,
} as const;

// ================================================================
//  Arcade Mode Config
// ================================================================

/**
 * ARCADE_CONFIGS holds the per-mode configuration data.
 * getArcadeModeConfig() in arcadeModes.ts returns Partial<GameConfig> by
 * looking up these values.  This moves the *data* out of the switch
 * statement while keeping the *function* in arcadeModes.ts.
 *
 * Types WinConditionType and FailConditionType come from types/game.ts
 * (not engines/bubble/types.ts) to maintain leaf-module purity.
 */
export interface ArcadeModeConfigEntry {
    winCondition: { type: WinConditionType; value: number };
    failCondition: { type: FailConditionType; value: number };
    spawnIntervalMs: number;
    distractorRatio: number;
    levelMultiplier?: number;
}

export const ARCADE_CONFIGS: Record<ArcadeMode, ArcadeModeConfigEntry> = {
    zen: {
        winCondition: { type: 'endless', value: 0 },
        failCondition: { type: 'strikes', value: 0 },
        spawnIntervalMs: 950,
        distractorRatio: 0.8,
    },
    blitz: {
        winCondition: { type: 'time_limit', value: 60 },
        failCondition: { type: 'strikes', value: 0 },
        spawnIntervalMs: 650,
        distractorRatio: 1.2,
    },
    survival: {
        winCondition: { type: 'endless', value: 0 },
        failCondition: { type: 'strikes', value: 3 },
        spawnIntervalMs: 650,
        levelMultiplier: 1.5,
        distractorRatio: 1.5,
    },
    classic: {
        winCondition: { type: 'target_count', value: 20 },
        failCondition: { type: 'strikes', value: 3 },
        spawnIntervalMs: 650,
        levelMultiplier: 1.0,
        distractorRatio: 1.5,
    },
    fusion: {
        winCondition: { type: 'time_limit', value: 120 },
        failCondition: { type: 'strikes', value: 3 },
        spawnIntervalMs: 650,
        levelMultiplier: 1.2,
        distractorRatio: 1.5,
    },
} as const;

export const ARCADE_MODE_LABELS: Record<string, { emoji: string; name: string; desc: string }> = {
    zen:      { emoji: '🧘', name: 'Zen',      desc: 'Pop at your own pace — no timer, no fails' },
    classic:  { emoji: '🎯', name: 'Classic',  desc: 'Hit 10 targets — but watch your strikes!' },
    blitz:    { emoji: '⚡', name: 'Blitz',    desc: '60 seconds — pop as many as you can!' },
    survival: { emoji: '🔥', name: 'Survival', desc: 'Endless mode — 3 strikes and you\'re out' },
    memory:   { emoji: '🎴', name: 'Memory Duel', desc: 'Match equations with their answers!' },
    invaders: { emoji: '🚀', name: 'Math Invaders', desc: 'Defend your ship from math aliens!' },
    fusion:   { emoji: '🌀', name: 'Combo Fusion', desc: 'Chain correct answers → spawn Fusion Bubbles → pop them to merge nearby bubbles!' },
};

// ================================================================
//  Session Config (bubble game internal leveling)
// ================================================================

export const SESSION_CONFIG = {
    LEVEL_UP_THRESHOLDS: [5, 5, 4, 4, 3, 3, 3, 3, 3] as const,
    LEVEL_DOWN_THRESHOLD: 3,
    PROBLEM_ROTATION_EVERY: 3,
    ANSWER_LOCK_MS: 120,
} as const;

export const SESSION_THEMES = [
    { bg: 'bg-blue-50',    accent: 'text-blue-600' },
    { bg: 'bg-emerald-50', accent: 'text-emerald-600' },
    { bg: 'bg-amber-50',   accent: 'text-amber-600' },
    { bg: 'bg-indigo-50',  accent: 'text-indigo-600' },
    { bg: 'bg-rose-50',    accent: 'text-rose-600' },
] as const;

// ================================================================
//  Power-Up Config
// ================================================================

export const POWER_UP_CONFIG = {
    // NOTE: Timer-based power-up spawning has been REMOVED entirely (see
    // useGameEngine). Power-ups are now earned as a combo reward: crossing
    // FRENZY_THRESHOLD spawns a one-shot "Frenzy Star" bonus bubble outside
    // the normal credit loop. SPAWN_INTERVAL_MS is retained only for
    // backward-compat references and is no longer used by the spawn loop.
    SPAWN_INTERVAL_MS: 8000,  // legacy — no longer drives spawning
    MAX_BANKED_CREDITS: 5,     // was 3 — higher cap lets the accumulator bank more credits during droughts
    // Cut from 6 to 3 types. freeze / slow_motion / pop_distractors were
    // dropped because they contradict the faster/more-bubbles playability
    // direction (44 activations / 2 users in 28 days = invisible).
    TYPES: ['lightning_chain', 'double_points', 'rainbow_magnet'] as const,
    DURATIONS: {
        double_points: 8000,    // was 5000 — too short to stack combos
        lightning_chain: 0,     // instant
        rainbow_magnet: 6000,   // was 3000 — too short to boost targets meaningfully
    } as const,
    EMOJI: {
        double_points: '✨',
        lightning_chain: '⚡',
        rainbow_magnet: '🌈',
    } as const,
    // Lightning Chain: pop N nearest distractors, award bonus points
    LIGHTNING_CHAIN_POP_COUNT: 5,     // was 3 (hardcoded in useGameEngine)
    LIGHTNING_CHAIN_BONUS: 50,        // was 30 (hardcoded in useGameEngine)
} as const;

// ================================================================
//  Frenzy Star Config (combo-triggered power-up)
// ================================================================

/**
 * FRENZY_STAR_CONFIG drives the combo-earned power-up spawn.
 * When the player's combo crosses FRENZY_THRESHOLD, a single bonus
 * "Frenzy Star" bubble is spawned (one-shot, outside the credit loop).
 * It only fires once per threshold crossing, not every frame.
 */
export const FRENZY_STAR_CONFIG = {
    /** Combo threshold that triggers the bonus power-up spawn. */
    TRIGGER_COMBO: 5,
    /** Visual size variant for the star bubble (larger than normal). */
    VARIANT: 'large' as const,
    /** Velocity multiplier — star drifts slower so kids can reach it. */
    VELOCITY_MULTIPLIER: 0.7,
    /** Max Frenzy Stars allowed on screen at once (prevents stacking). */
    MAX_ON_SCREEN: 1,
} as const;

// ================================================================
//  Spawn Strategy Config
// ================================================================

export const SPAWN_CONFIG = {
    MAX_RECENT_SIGNATURES: 12,
    MAX_REGEN_ATTEMPTS: 8,
    CHANCE_LARGE: 0.8,
    CHANCE_MEDIUM: 0.5,
} as const;

// ================================================================
//  Invader Config
// ================================================================

export const INVADER_CONFIG = {
    INITIAL_LIVES: 3,
    MAX_LIVES: 3,
    VICTORY_TIME_MS: 60_000,
    BOSS_WAVE_INTERVAL_MS: 30_000,
    SPEED_RAMP_INTERVAL_MS: 10_000,
    FRENZY_COMBO_THRESHOLD: 5,
} as const;

// ================================================================
//  Practice Session Config
// ================================================================

export const PRACTICE_CONFIG = {
    INITIAL_LIVES: 3,
    INITIAL_TIME: 60,
    TIME_BONUS: 2,
} as const;

// ================================================================
//  Frenzy Config (shared score multipliers)
// ================================================================

export const FRENZY_CONFIG = {
    /** Combo count to trigger frenzy mode */
    FRENZY_THRESHOLD: 5,
    SUPER_THRESHOLD: 10,
    MEGA_THRESHOLD: 15,
    /** Score multipliers per frenzy tier */
    FRENZY_MULTIPLIER: 2,
    SUPER_MULTIPLIER: 3,
    MEGA_MULTIPLIER: 5,
} as const;

// ================================================================
//  Combo Fusion Config
// ================================================================

/**
 * FUSION_CONFIG holds the constants for the Combo Fusion arcade mode.
 * Streak thresholds map to score multipliers: 3-streak=1.5×, 5-streak=2×,
 * 7-streak=3×, 10-streak=5×. A Fusion Bubble spawns once the fusion streak
 * reaches MIN_FUSION_STREAK, and popping it merges nearby bubbles.
 */
export interface FusionConfig {
    /** Streak thresholds → multiplier mapping */
    STREAK_TIERS: Readonly<Record<number, number>>;
    /** Pixel radius for merge absorption (relative to bubble x%,y coordinates) */
    MERGE_RADIUS_PERCENT: number;
    /** Maximum bubbles that can be consumed in a single merge */
    MAX_MERGE_TARGETS: number;
    /** Minimum streak to spawn a fusion bubble */
    MIN_FUSION_STREAK: number;
}

export const FUSION_CONFIG: FusionConfig = {
    STREAK_TIERS: { 3: 1.5, 5: 2.0, 7: 3.0, 10: 5.0 },
    MERGE_RADIUS_PERCENT: 25,  // 25% of screen width/height
    MAX_MERGE_TARGETS: 8,
    MIN_FUSION_STREAK: 3,
} as const;


// ================================================================
//  Storage Keys (localStorage)
// ================================================================

/**
 * Central registry for all localStorage keys used across the app.
 * Every module that reads/writes localStorage should import from here
 * to prevent key drift and silent data loss.
 */
export const STORAGE_KEYS = {
    PROFILES: 'hebrew-math-profiles',
    SAGA_PROGRESS: 'hebrew_game_saga_progress_v1',
    DAILY_PROGRESS: 'hebrew-math-daily-progress',
    THEME: 'hebrew-math-theme',
    MEMORY_BEST_SCORE: 'hebrew-math-memory-best',
    INVADERS_BEST_SCORE: 'hebrew-math-invaders-best',
    COMBO_FUSION_BEST_SCORE: 'hebrew-math-combo-fusion-best',
    CINEMATIC_SEEN: 'cinematic_seen_units',
    IS_MUTED: 'isMuted',
} as const;

// ================================================================
//  Sensory Factory Config
// ================================================================

/**
 * Default parameters for the SensoryFactory — controls target value,
 * item count, density of target items, and probability of close
 * distractors in sensory mode bubbles.
 */
export const SENSORY_CONFIG = {
    DEFAULT_TARGET: 5,
    DEFAULT_COUNT: 15,
    DEFAULT_DENSITY: 0.3,
    PROBABILITY_CLOSE_DISTRACTOR: 0.3,
} as const;

// ================================================================
//  Behavioral UI Config
// ================================================================

/**
 * UI constants that affect game behavior (not purely cosmetic).
 * - SESSION_LENGTH: questions per practice session
 * - BOSS_SIZE_MULTIPLIER: boss bubble rendering scale
 * - GREETING_DURATION_MS: mascot greeting display time
 */
export const UI_CONFIG = {
    SESSION_LENGTH: 10,
    BOSS_SIZE_MULTIPLIER: 1.5,
    GREETING_DURATION_MS: 4000,
    /** Answer lock (ms) — how long input stays disabled after an answer.
     *  Kept short for ages 4–8; visual/audio rewards outlive the lock and are
     *  cleaned up independently (see useFeedbackEffects). */
    ANSWER_LOCK_CORRECT_MS: 400,
    ANSWER_LOCK_WRONG_MS: 600,
} as const;

// ================================================================
//  Scoring Config (shared across game modes)
// ================================================================

/**
 * Scoring constants shared across bubble and invader game modes.
 * Centralised to prevent divergence between engines.
 */
export const SCORING_CONFIG = {
    BASE_SCORE_CORRECT: 10,
    BASE_SCORE_BOSS: 100,
    BOSS_DEFEAT_BONUS_MULTIPLIER: 500,  // bonusPoints = BOSS_DEFEAT_BONUS_MULTIPLIER * level
    COMBO_SCORE_FACTOR: 0.1,            // baseScoreBonus = BASE_SCORE_CORRECT * (1 + combo * COMBO_SCORE_FACTOR)
    INVADER_SPAWN_BASE_INTERVAL_MS: 2500,
    INVADER_ANSWER_SPAWN_BASE_INTERVAL_MS: 2000,
} as const;

// ================================================================
//  Bubble Engine Config
// ================================================================

/**
 * Internal constants for the bubble game engine — lane geometry,
 * combo/speed caps, power-up slow speed, stale-frame threshold,
 * and bubble lifespans.
 */
export const BUBBLE_ENGINE_CONFIG = {
    LANE_COUNT: 6,
    SPAWN_Y_OFFSET: 110,
    SPAWN_Y_STEP: 12,
    COMBO_BONUS_PER_COMBO: 0.02,
    COMBO_BONUS_CAP: 0.3,
    SPEED_MULTIPLIER_CAP: 1.6,
    POWER_UP_SLOW_SPEED: 0.3,
    STALE_FRAME_THRESHOLD_MS: 2000,
    TARGET_LIFESPAN_MS: 20000,   // was 35000 — bubbles sat too long, lanes stayed occupied
    DISTRACTOR_LIFESPAN_MS: 13000, // was 22000 — faster turnover frees lanes for targets
    // --- Bubble Spawn Remediation (card 56d68ec3) ---
    // Initial spawn credits: seed 5 so screen populates in first 1-2 frames (was 3)
    INITIAL_SPAWN_CREDITS: 5,
    // Target drought: fire safety net after 3s with NO targets (was 6s hardcoded)
    TARGET_DROUGHT_THRESHOLD_MS: 3000,
    // Low-target net: if target count < 1 for >2s, force next spawn to be target
    LOW_TARGET_THRESHOLD_MS: 2000,
    // Boss bubble tuning: keep screen populated during boss fights
    BOSS_MAX_ON_SCREEN_FLOOR: 5,       // was effectively 2 (Math.max(2, floor(max*0.4)))
    BOSS_MAX_ON_SCREEN_RATIO: 0.6,     // was 0.4
    BOSS_VELOCITY_MULTIPLIER: 0.5,     // was 0.3 (very slow)
    // Boss mode: reduce spawn interval by this factor (faster answer bubbles)
    BOSS_SPAWN_INTERVAL_FACTOR: 0.7,   // 0.7 = 30% faster
} as const;

// ================================================================
//  Deferred Constants (acknowledged in plan, not yet migrated)
// ================================================================

/**
 * Badge thresholds — defined in src/data/badges.ts.
 * totalCorrect >= 10 → first badge, >= 50 → second, >= 100 → third.
 * maxCombo >= 10 → combo badge.
 * Deferred: these are content-adjacent and may move in a future pass.
 */

/**
 * Streak multiplier thresholds — defined in src/data/dailyChallenges.ts.
 * streak >= 3 → 1.5x, streak >= 7 → 2x.
 * Deferred: challenge-specific, may move in a future pass.
 */

/**
 * Frenzy score multipliers — were duplicated in useGameEngine.ts (2x/3x/5x)
 * and useInvaderEngine.ts (2x/3x/5x). Now consolidated in FRENZY_CONFIG above.
 */
