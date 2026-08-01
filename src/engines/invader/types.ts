// --- Math Invaders Engine Types ---

export interface InvaderBubble {
    id: string;
    /** Display equation string, e.g. "7 + 3 = ?" */
    equation: string;
    /** The correct numeric answer */
    answer: number;
    /** Horizontal position as percentage 0-100 */
    x: number;
    /** Vertical position as percentage 0-100 (0 = top, 100 = bottom) */
    y: number;
    /** Descending speed in percentage units per frame */
    velocity: number;
    /** Boss bubble flag */
    isBoss?: boolean;
    /** Boss bubble HP (number of correct answers needed) */
    hp?: number;
    /** Max HP for boss (for HP bar rendering) */
    maxHp?: number;
}

export interface AnswerBubble {
    id: string;
    /** The numeric value displayed on this bubble */
    value: number;
    /** Horizontal position as percentage 0-100 */
    x: number;
    /** Vertical position as percentage 0-100 (starts at 100 = bottom, moves toward 0 = top) */
    y: number;
    /** Ascending speed in percentage units per frame */
    velocity: number;
    /** Whether this is the correct answer for the lowest equation */
    isCorrect: boolean;
    /** Visual pop state */
    isPopped: boolean;
    /** Timestamp when popped (ms) for cleanup */
    poppedAt?: number;
}

export interface InvaderState {
    equations: InvaderBubble[];
    answers: AnswerBubble[];
    score: number;
    lives: number;
    combo: number;
    level: number;
    isBossWave: boolean;
    bossHP: number;
    isPlaying: boolean;
    isGameOver: boolean;
    isVictory: boolean;
    frenzy: boolean;
}

export const INITIAL_LIVES = 3;
export const MAX_LIVES = 3;
export const VICTORY_TIME_MS = 60_000; // Survive 60 seconds = victory
export const BOSS_WAVE_INTERVAL_MS = 30_000; // Boss every 30 seconds
export const SPEED_RAMP_INTERVAL_MS = 10_000; // Speed up every 10 seconds
export const FRENZY_COMBO_THRESHOLD = 5;

export const createInitialInvaderState = (): InvaderState => ({
    equations: [],
    answers: [],
    score: 0,
    lives: INITIAL_LIVES,
    combo: 0,
    level: 1,
    isBossWave: false,
    bossHP: 0,
    isPlaying: true,
    isGameOver: false,
    isVictory: false,
    frenzy: false,
});