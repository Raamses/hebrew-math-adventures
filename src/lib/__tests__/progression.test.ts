import { describe, it, expect } from 'vitest';
import { getRecommendedStartingUnit } from '../progression';

describe('getRecommendedStartingUnit', () => {
    it('returns unit_1 for children under 5', () => {
        expect(getRecommendedStartingUnit(3)).toBe('unit_1');
        expect(getRecommendedStartingUnit(4)).toBe('unit_1');
    });

    it('returns unit_2 for children aged 5 and 6', () => {
        expect(getRecommendedStartingUnit(5)).toBe('unit_2');
        expect(getRecommendedStartingUnit(6)).toBe('unit_2');
    });

    it('returns unit_3 for children aged 7 and 8', () => {
        expect(getRecommendedStartingUnit(7)).toBe('unit_3');
        expect(getRecommendedStartingUnit(8)).toBe('unit_3');
    });

    it('returns unit_4 for children aged 9 and above', () => {
        expect(getRecommendedStartingUnit(9)).toBe('unit_4');
        expect(getRecommendedStartingUnit(12)).toBe('unit_4');
    });
});
