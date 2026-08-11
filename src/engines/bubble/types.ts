
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

export type PowerUpType = 'freeze' | 'double_points' | 'pop_distractors' | 'slow_motion' | 'lightning_chain' | 'rainbow_magnet';

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
}

// --- Interfaces ---

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

    /** Optional: Get current objective instruction (e.g. "2 + 2 = ?") */
    getInstruction?(): string;

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
