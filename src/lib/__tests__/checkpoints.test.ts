import { describe, it, expect } from 'vitest';
import { isCheckpoint, CHECKPOINTS } from '../checkpoints';

describe('isCheckpoint', () => {
    it('returns true for Q3 in STANDARD mode', () => {
        expect(isCheckpoint(3, 'STANDARD')).toBe(true);
    });

    it('returns true for Q6 in STANDARD mode', () => {
        expect(isCheckpoint(6, 'STANDARD')).toBe(true);
    });

    it('returns false for non-checkpoint questions in STANDARD mode', () => {
        for (const q of [1, 2, 4, 5, 7, 8, 9]) {
            expect(isCheckpoint(q, 'STANDARD')).toBe(false);
        }
    });

    it('returns false for Q10 (session length) — never collides with summary', () => {
        expect(isCheckpoint(10, 'STANDARD')).toBe(false);
    });

    it('returns false for arcade modes (SURVIVAL, TIME_ATTACK)', () => {
        expect(isCheckpoint(3, 'SURVIVAL')).toBe(false);
        expect(isCheckpoint(6, 'TIME_ATTACK')).toBe(false);
    });

    it('CHECKPOINTS array contains exactly 3 and 6', () => {
        expect(CHECKPOINTS).toEqual([3, 6]);
    });
});
