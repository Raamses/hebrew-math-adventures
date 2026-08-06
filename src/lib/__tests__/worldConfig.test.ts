import { describe, it, expect } from 'vitest';
import {
    WORLD_ZONES,
    getZoneForLevel,
    type ZoneConfig,
} from '../worldConfig';

/* ------------------------------------------------------------------ *
 * Tests for the consolidated world config (src/lib/worldConfig.ts).
 *
 * Coverage goals:
 *  1. All exports are present and correctly typed
 *  2. WORLD_ZONES data integrity (shape, required fields, no holes)
 *  3. Zone level ranges — coverage, gaps, overlaps
 *  4. getZoneForLevel exhaustive lookup
 *  5. Consumer contract — values that WorldMap / MapZone rely on
 * ------------------------------------------------------------------ */

/* ---------- 1. Export presence ---------- */

describe('worldConfig exports', () => {
    it('exports WORLD_ZONES as a non-empty array', () => {
        expect(Array.isArray(WORLD_ZONES)).toBe(true);
        expect(WORLD_ZONES.length).toBeGreaterThan(0);
    });

    it('exports getZoneForLevel as a function', () => {
        expect(typeof getZoneForLevel).toBe('function');
    });

    it('ZoneConfig interface is usable at compile time (smoke)', () => {
        const z: ZoneConfig = {
            id: 'test',
            name: 'test.name',
            description: 'test.desc',
            minLevel: 0,
            maxLevel: 1,
            icon: WORLD_ZONES[0].icon, // borrow a valid LucideIcon
            themeColor: 'text-red-500',
            backgroundClass: 'bg-red-50',
        };
        expect(z.id).toBe('test');
    });
});

/* ---------- 2. WORLD_ZONES data integrity ---------- */

describe('WORLD_ZONES data integrity', () => {
    it('every zone has all required fields', () => {
        for (const zone of WORLD_ZONES) {
            expect(typeof zone.id).toBe('string');
            expect(zone.id.length).toBeGreaterThan(0);

            expect(typeof zone.name).toBe('string');
            expect(zone.name.length).toBeGreaterThan(0);

            expect(typeof zone.description).toBe('string');
            expect(zone.description.length).toBeGreaterThan(0);

            expect(typeof zone.minLevel).toBe('number');
            expect(Number.isInteger(zone.minLevel)).toBe(true);

            expect(typeof zone.maxLevel).toBe('number');
            expect(Number.isInteger(zone.maxLevel)).toBe(true);

            // icon is a component (LucideIcon) — verify it's a function/object
            expect(zone.icon).toBeDefined();
            expect(typeof zone.icon).toBe('object');

            expect(typeof zone.themeColor).toBe('string');
            expect(zone.themeColor.length).toBeGreaterThan(0);

            expect(typeof zone.backgroundClass).toBe('string');
            expect(zone.backgroundClass.length).toBeGreaterThan(0);
        }
    });

    it('every zone id is unique', () => {
        const ids = WORLD_ZONES.map(z => z.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every zone has minLevel <= maxLevel', () => {
        for (const zone of WORLD_ZONES) {
            expect(zone.minLevel).toBeLessThanOrEqual(zone.maxLevel);
        }
    });

    it('every zone minLevel is non-negative', () => {
        for (const zone of WORLD_ZONES) {
            expect(zone.minLevel).toBeGreaterThanOrEqual(0);
        }
    });

    it('zone ids match expected set', () => {
        const expectedIds = [
            'sensory_beach',
            'addition_island',
            'subtraction_forest',
            'multiplication_mountain',
        ];
        expect(WORLD_ZONES.map(z => z.id)).toEqual(expectedIds);
    });

    it('zone count is 4', () => {
        expect(WORLD_ZONES).toHaveLength(4);
    });

    it('themeColor values are non-empty Tailwind classes', () => {
        for (const zone of WORLD_ZONES) {
            // Tailwind text color class pattern: text-{color}-{shade}
            expect(zone.themeColor).toMatch(/^text-/);
        }
    });

    it('backgroundClass values are non-empty Tailwind classes', () => {
        for (const zone of WORLD_ZONES) {
            // Tailwind background class pattern: bg-{color}-{shade}
            expect(zone.backgroundClass).toMatch(/^bg-/);
        }
    });

    it('name and description are i18n keys (dot-notation)', () => {
        for (const zone of WORLD_ZONES) {
            expect(zone.name).toMatch(/^zones\.\w+\.\w+$/);
            expect(zone.description).toMatch(/^zones\.\w+\.\w+$/);
        }
    });
});

/* ---------- 3. Zone level ranges ---------- */

describe('WORLD_ZONES level ranges', () => {
    it('zones are ordered by ascending minLevel', () => {
        for (let i = 1; i < WORLD_ZONES.length; i++) {
            expect(WORLD_ZONES[i].minLevel).toBeGreaterThanOrEqual(
                WORLD_ZONES[i - 1].minLevel,
            );
        }
    });

    it('covers level 0 (sensory entry point)', () => {
        const covers0 = WORLD_ZONES.some(
            z => z.minLevel <= 0 && z.maxLevel >= 0,
        );
        expect(covers0).toBe(true);
    });

    it('sensory_beach spans 0-10 (always active)', () => {
        const sensory = WORLD_ZONES.find(z => z.id === 'sensory_beach');
        expect(sensory).toBeDefined();
        expect(sensory!.minLevel).toBe(0);
        expect(sensory!.maxLevel).toBe(10);
    });

    it('addition_island spans levels 1-2', () => {
        const addition = WORLD_ZONES.find(z => z.id === 'addition_island');
        expect(addition).toBeDefined();
        expect(addition!.minLevel).toBe(1);
        expect(addition!.maxLevel).toBe(2);
    });

    it('subtraction_forest spans levels 3-4', () => {
        const sub = WORLD_ZONES.find(z => z.id === 'subtraction_forest');
        expect(sub).toBeDefined();
        expect(sub!.minLevel).toBe(3);
        expect(sub!.maxLevel).toBe(4);
    });

    it('multiplication_mountain spans levels 5-10', () => {
        const mult = WORLD_ZONES.find(z => z.id === 'multiplication_mountain');
        expect(mult).toBeDefined();
        expect(mult!.minLevel).toBe(5);
        expect(mult!.maxLevel).toBe(10);
    });
});

/* ---------- 4. getZoneForLevel exhaustive lookup ---------- */

describe('getZoneForLevel', () => {
    it('returns sensory_beach for level 0', () => {
        const zone = getZoneForLevel(0);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('returns sensory_beach for level 1 (overlapping range, first match wins)', () => {
        // sensory_beach (0-10) is first in the array, so it wins over addition_island (1-2)
        const zone = getZoneForLevel(1);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('returns sensory_beach for level 2 (overlap with addition_island)', () => {
        const zone = getZoneForLevel(2);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('returns sensory_beach for level 3 (overlap with subtraction_forest)', () => {
        const zone = getZoneForLevel(3);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('returns sensory_beach for level 4 (overlap with subtraction_forest)', () => {
        const zone = getZoneForLevel(4);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('returns sensory_beach for level 5 (overlap with multiplication_mountain)', () => {
        const zone = getZoneForLevel(5);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('returns sensory_beach for level 10 (upper boundary)', () => {
        const zone = getZoneForLevel(10);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('returns undefined for level -1 (below all ranges)', () => {
        const zone = getZoneForLevel(-1);
        expect(zone).toBeUndefined();
    });

    it('returns undefined for level 11 (above all ranges)', () => {
        const zone = getZoneForLevel(11);
        expect(zone).toBeUndefined();
    });

    it('returns undefined for NaN', () => {
        const zone = getZoneForLevel(NaN);
        // NaN comparisons are always false, so no zone matches
        expect(zone).toBeUndefined();
    });

    it('returns a ZoneConfig object with all fields for a valid level', () => {
        const zone = getZoneForLevel(0);
        expect(zone).toBeDefined();
        expect(zone).toHaveProperty('id');
        expect(zone).toHaveProperty('name');
        expect(zone).toHaveProperty('description');
        expect(zone).toHaveProperty('minLevel');
        expect(zone).toHaveProperty('maxLevel');
        expect(zone).toHaveProperty('icon');
        expect(zone).toHaveProperty('themeColor');
        expect(zone).toHaveProperty('backgroundClass');
    });

    it('is consistent — same level always returns same zone', () => {
        const a = getZoneForLevel(7);
        const b = getZoneForLevel(7);
        expect(a).toBe(b); // referential equality (same array element)
    });
});

/* ---------- 5. Consumer contract ---------- *
 *
 * WorldMap.tsx uses: WORLD_ZONES.map(zone => ...)
 * MapZone.tsx uses: zone.minLevel, zone.maxLevel, zone.icon,
 *                  zone.backgroundClass, zone.themeColor,
 *                  zone.name, zone.description
 *
 * These tests verify the contract that consumers depend on.
 */

describe('consumer contract (WorldMap & MapZone)', () => {
    it('WORLD_ZONES is iterable (can be mapped over)', () => {
        const ids = WORLD_ZONES.map(z => z.id);
        expect(ids).toHaveLength(4);
    });

    it('every zone icon is a renderable component (has displayName or is function-like)', () => {
        // Lucide icons are forwardRef components — they are objects with
        // $$typeof or render methods. We verify they're truthy and not plain strings.
        for (const zone of WORLD_ZONES) {
            expect(zone.icon).toBeTruthy();
            expect(typeof zone.icon).not.toBe('string');
        }
    });

    it('minLevel/maxLevel can be used for isLocked/isCompleted/isActive logic', () => {
        // Simulates MapZone.tsx logic:
        //   isLocked = currentLevel < zone.minLevel
        //   isCompleted = currentLevel > zone.maxLevel
        //   isActive = currentLevel >= zone.minLevel && currentLevel <= zone.maxLevel
        for (const zone of WORLD_ZONES) {
            const testLevel = zone.minLevel;
            const isLocked = testLevel < zone.minLevel;
            const isCompleted = testLevel > zone.maxLevel;
            const isActive = testLevel >= zone.minLevel && testLevel <= zone.maxLevel;

            expect(isLocked).toBe(false);
            expect(isCompleted).toBe(false);
            expect(isActive).toBe(true);
        }
    });

    it('progress bar calculation does not divide by zero', () => {
        // MapZone computes: (currentLevel - minLevel) / (maxLevel - minLevel + 1)
        for (const zone of WORLD_ZONES) {
            const denominator = zone.maxLevel - zone.minLevel + 1;
            expect(denominator).toBeGreaterThan(0);
        }
    });

    it('zone.name and zone.description are valid i18n keys for useTranslation', () => {
        // Both consumers call t(zone.name) and t(zone.description)
        for (const zone of WORLD_ZONES) {
            // i18n keys should be dot-separated strings
            expect(zone.name).toMatch(/\./);
            expect(zone.description).toMatch(/\./);
        }
    });

    it('no missing exports — all consumer imports resolve', () => {
        // Verify that the module exports everything WorldMap and MapZone import:
        //   WorldMap: WORLD_ZONES, ZoneConfig (type)
        //   MapZone: ZoneConfig (type)
        expect(WORLD_ZONES).toBeDefined();
        expect(getZoneForLevel).toBeDefined();
        // ZoneConfig is a type-only export — verified at compile time
    });
});
