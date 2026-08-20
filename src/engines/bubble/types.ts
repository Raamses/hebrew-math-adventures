
// --- Enums & Unions ---
// Re-exported from types/game.ts for backward compatibility.
// Canonical definitions live in src/types/game.ts to avoid a lib→engines
// layer violation when worldConfig.ts (lib/) needs these types.

import type {
    WinConditionType,
    FailConditionType,
    DifficultyCurve,
    GameTheme,
} from '../../types/game';

export type {
    WinConditionType,
    FailConditionType,
    DifficultyCurve,
    GameTheme,
    ArcadeMode,
} from '../../types/game';

// --- Power-Ups ---

export type PowerUpType = 'double_points' | 'lightning_chain' | 'rainbow_magnet';

export interface PowerUpState {
    type: PowerUpType;
    active: boolean;
    expiresAt: number; // timestamp (ms)
}

// --- Configuration ---

export interface GameConfig {
    /** Display name for the game mode */
    modeName: string;

    // -- Spawn Rules --
    /** Time in ms between spawn attempts */
    spawnIntervalMs: number;
    /** Maximum number of bubbles allowed on screen at once */
    maxOnScreen: number;
    /** Ratio of Distractors to Targets (e.g., 2 means 2 fakes for every 1 real) */
    distractorRatio: number;
    /** Base velocity of bubbles (visual speed factor) */
    baseVelocity: number;

    // -- Gameplay Rules --
    winCondition: {
        type: WinConditionType;
        value: number; // e.g., 10 (count) or 60 (seconds)
    };
    failCondition: {
        type: FailConditionType;
        value?: number; // e.g., 3 (strikes)
    };

    // -- Difficulty Scaling --
    /** How difficulty increases per "level" or "phase" within the session */
    difficultyScale: DifficultyCurve;
    /** Multiplier applied to speed/spawn rate per level increase */
    levelMultiplier: number;

    // -- Visuals --
    theme: GameTheme;
    vfxEnabled: boolean;

    // -- Power-Ups --
    /** Time in ms between power-up bubble spawns (default 15000 = 15s) */
    powerUpSpawnIntervalMs?: number;

    // -- Custom Flags --
    [key: string]: any; // Allow extensibility for specific strategies (e.g. isMathSensory)
}

// --- Entities ---

export interface BubbleEntity<T = any> {
    id: string;
    /** Horizontal position (0-100%) */
    x: number;
    /** Vertical position (pixels, usually starts off-screen) */
    y: number;
    /** Display content (Text or Number) */
    content: string | number;
    /** Value used for validation logic */
    internalValue: T;
    /** Vertical velocity factor */
    velocity: number;
    speedMultiplier?: number;
    /** Visual size variant */
    variant: 'small' | 'medium' | 'large';
    /** State flag for popped/destroyed bubbles */
    isPopped: boolean;
    /** Creation timestamp (ms) for lifecycle management */
    createdAt: number;
    /** Timestamp when popped (ms) for cleanup */
    poppedAt?: number;
    /** Lane index for lane-based spawn placement */
    lane?: number;

    /** Marks this bubble as a power-up bubble (no answer validation needed) */
    isPowerUp?: boolean;
    /** Which power-up effect this bubble grants when popped */
    powerUpType?: PowerUpType;
    /** Marks this bubble as a boss bubble (requires multiple correct pops to defeat) */
    isBoss?: boolean;
    /** Current health of a boss bubble (decrements on each correct pop) */
    bossHealth?: number;
    /** Maximum health of a boss bubble (for rendering the health bar) */
    bossMaxHealth?: number;

    // --- Combo Fusion Properties ---
    /** Marks this bubble as a Fusion Bubble (special visual, triggers merge on pop) */
    isFusion?: boolean;
    /** The multiplier tier applied when this fusion bubble is popped */
    fusionMultiplier?: number;
    /** Marks this bubble as consumed by a merge (for animation before removal) */
    isMerged?: boolean;
    /** The calculated point value of a merged bubble (displayed in floating text) */
    mergeValue?: number;
    /** Tier index (0=none, 1=1.5×, 2=2×, 3=3×, 4=5×) for visual styling */
    fusionTier?: 0 | 1 | 2 | 3 | 4;
}

// --- Interfaces ---

/** i18n instruction descriptor returned by getInstructionKey() */
export interface InstructionKey {
    /** i18n key, e.g. 'bubble.popNumber' */
    key: string;
    /** Interpolation params for t() */
    params?: Record<string, string | number>;
}

export interface IGameBehavior {
    /** Generate the next bubble's content based on the current config */
    generateNext(config: GameConfig, opts?: { forceTarget?: boolean }): Partial<BubbleEntity>;

    /** Check if the popped bubble is correct */
    validate(entity: BubbleEntity): boolean;

    /** 
     * Called when level starts to set up initial state.
     * @param level Current difficulty level
     * @param config Full game configuration
     */
    initializeLevel(level: number, config: GameConfig): void;

    /** Optional: Get current objective instruction as an i18n key + params */
    getInstructionKey?(): InstructionKey;

    /** Force-regenerate the current problem (for mid-session level changes). */
    regenerateProblem(level: number, config: GameConfig, correctCount?: number): void;

    /**
     * Returns the current target value. Used by the engine to snapshot
     * the target at the moment of a pop, so stale bubbles can be detected.
     * Optional — only MathBehaviorStrategy implements this.
     */
    getTargetValue?(): number;

    /**
     * Validate an entity against a SNAPSHOT target value.
     * Returns 'correct' (matches current), 'stale' (matches previous target),
     * or 'wrong' (doesn't match any known target).
     * Optional — only MathBehaviorStrategy implements this.
     */
    validateAgainst?(entity: BubbleEntity, snapshotTarget: number): 'correct' | 'stale' | 'wrong';
}

export interface GameState {
    score: number;
    combo: number;
    strikes: number;
    targetsPopped: number;
    timeLeft?: number;
    isGameOver: boolean;
    isVictory: boolean;
    isFrenzy: boolean;
    /** Active power-up state (null when none active) */
    powerUpState: PowerUpState | null;
}

// --- Combo Fusion ---

/** Fusion-specific game state, tracked alongside GameState */
export interface FusionState {
    /** Current fusion streak (correct answers in a row, separate from normal combo) */
    fusionStreak: number;
    /** Maximum fusion streak achieved this session */
    maxFusionStreak: number;
    /** Total number of fusion bubbles spawned this session */
    fusionBubblesSpawned: number;
    /** Total number of merges completed this session */
    totalMerges: number;
    /** Total points earned from merges */
    totalMergePoints: number;
    /** Whether a fusion bubble is currently on screen */
    fusionBubbleActive: boolean;
}

/** A merge event for UI animation */
export interface MergeEvent {
    id: string;
    /** The fusion bubble that was popped (center of merge) */
    centerId: string;
    /** IDs of bubbles consumed in the merge */
    consumedIds: string[];
    /** Center position for animation origin */
    centerX: number;
    centerY: number;
    /** Points earned from the merge */
    points: number;
    /** Multiplier applied */
    multiplier: number;
    /** Tier for visual styling */
    tier: 1 | 2 | 3 | 4;
    /** Timestamp for cleanup */
    timestamp: number;
}
