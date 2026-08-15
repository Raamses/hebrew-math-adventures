import { UI_CONFIG } from './worldConfig';

/** Question numbers (1-indexed) that earn a mid-session encouragement banner. */
export const CHECKPOINTS = [3, 6] as const;

/** Checkpoints are a STANDARD-mode affordance; arcade modes have the HUD. */
export const isCheckpoint = (questionNumber: number, mode: string): boolean =>
    mode === 'STANDARD' &&
    questionNumber < UI_CONFIG.SESSION_LENGTH &&
    (CHECKPOINTS as readonly number[]).includes(questionNumber);
