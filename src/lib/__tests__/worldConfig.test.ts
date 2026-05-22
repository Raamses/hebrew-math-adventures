import { describe, it, expect } from 'vitest';
import { getZoneForLevel } from '../worldConfig';

describe('getZoneForLevel', () => {
    it('returns the correct zone for level 0', () => {
        const zone = getZoneForLevel(0);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('returns sensory_beach for level 1 due to overlapping ranges', () => {
        // sensory_beach has minLevel 0 and maxLevel 10, and is first in the array.
        // Array.prototype.find returns the first matching element.
        const zone = getZoneForLevel(1);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('returns sensory_beach for level 10', () => {
        const zone = getZoneForLevel(10);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('returns undefined for levels below the minimum range (e.g. -1)', () => {
        const zone = getZoneForLevel(-1);
        expect(zone).toBeUndefined();
    });

    it('returns undefined for levels above the maximum range (e.g. 11)', () => {
        const zone = getZoneForLevel(11);
        expect(zone).toBeUndefined();
    });
});
