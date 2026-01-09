
// --- Enums & Unions ---

export type WinConditionType = 'target_count' | 'time_limit' | 'endless';
export type FailConditionType = 'timer_zero' | 'screen_full' | 'missed_target_limit' | 'strikes';
export type DifficultyCurve = 'linear' | 'exponential' | 'static';
export type GameTheme = 'space' | 'underwater' | 'standard';

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
    /** Visual size variant */
    variant: 'small' | 'medium' | 'large';
    /** State flag for popped/destroyed bubbles */
    isPopped: boolean;
    /** Creation timestamp (ms) for lifecycle management */
    createdAt: number;
    /** Timestamp when popped (ms) for cleanup */
    poppedAt?: number;
}

// --- Interfaces ---

export interface IGameBehavior {
    /** Generate the next bubble's content based on the current config */
    generateNext(config: GameConfig): Partial<BubbleEntity>;

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
}
