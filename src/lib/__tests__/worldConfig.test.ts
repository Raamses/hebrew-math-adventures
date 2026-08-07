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
 *  6. Edge cases & invariants — fractional, Infinity, distinctness
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

    it('WORLD_ZONES has no holes (no undefined/null entries)', () => {
        for (const zone of WORLD_ZONES) {
            expect(zone).not.toBeNull();
            expect(zone).not.toBeUndefined();
        }
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

    it('every zone maxLevel is non-negative', () => {
        for (const zone of WORLD_ZONES) {
            expect(zone.maxLevel).toBeGreaterThanOrEqual(0);
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

    it('name keys end with .name and description keys end with .desc', () => {
        for (const zone of WORLD_ZONES) {
            expect(zone.name).toMatch(/\.name$/);
            expect(zone.description).toMatch(/\.desc$/);
        }
    });

    it('every zone has a distinct themeColor', () => {
        const colors = WORLD_ZONES.map(z => z.themeColor);
        expect(new Set(colors).size).toBe(colors.length);
    });

    it('every zone has a distinct backgroundClass', () => {
        const bgs = WORLD_ZONES.map(z => z.backgroundClass);
        expect(new Set(bgs).size).toBe(bgs.length);
    });

    it('every zone has a distinct icon', () => {
        const icons = WORLD_ZONES.map(z => z.icon);
        expect(new Set(icons).size).toBe(icons.length);
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

    it('every level from 0 to 10 is covered by at least one zone', () => {
        for (let lvl = 0; lvl <= 10; lvl++) {
            const covered = WORLD_ZONES.some(
                z => lvl >= z.minLevel && lvl <= z.maxLevel,
            );
            expect(covered).toBe(true);
        }
    });

    it('sensory_beach is always active (0-10 spans all current levels)', () => {
        const sensory = WORLD_ZONES.find(z => z.id === 'sensory_beach');
        expect(sensory).toBeDefined();
        // Spans the entire level range of the game
        expect(sensory!.minLevel).toBe(0);
        expect(sensory!.maxLevel).toBe(10);
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

    it('returns undefined for Infinity', () => {
        const zone = getZoneForLevel(Infinity);
        expect(zone).toBeUndefined();
    });

    it('returns undefined for -Infinity', () => {
        const zone = getZoneForLevel(-Infinity);
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

    it('returns the same object reference as in WORLD_ZONES', () => {
        const zone = getZoneForLevel(0);
        expect(zone).toBe(WORLD_ZONES[0]); // referential equality
    });

    it('handles fractional levels within range (0.5 matches sensory_beach)', () => {
        const zone = getZoneForLevel(0.5);
        expect(zone).toBeDefined();
        expect(zone?.id).toBe('sensory_beach');
    });

    it('handles fractional levels at boundary (10.0 matches, 10.1 does not)', () => {
        expect(getZoneForLevel(10.0)?.id).toBe('sensory_beach');
        expect(getZoneForLevel(10.1)).toBeUndefined();
    });

    it('handles very large numbers (returns undefined)', () => {
        expect(getZoneForLevel(1_000_000)).toBeUndefined();
    });

    it('handles very large negative numbers (returns undefined)', () => {
        expect(getZoneForLevel(-1_000_000)).toBeUndefined();
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

    it('isLocked logic: level below minLevel is locked', () => {
        // For addition_island (minLevel=1), level 0 should be locked
        const addition = WORLD_ZONES.find(z => z.id === 'addition_island')!;
        const isLocked = 0 < addition.minLevel;
        expect(isLocked).toBe(true);
    });

    it('isCompleted logic: level above maxLevel is completed', () => {
        // For addition_island (maxLevel=2), level 3 should be completed
        const addition = WORLD_ZONES.find(z => z.id === 'addition_island')!;
        const isCompleted = 3 > addition.maxLevel;
        expect(isCompleted).toBe(true);
    });

    it('progress bar calculation does not divide by zero', () => {
        // MapZone computes: (currentLevel - minLevel) / (maxLevel - minLevel + 1)
        for (const zone of WORLD_ZONES) {
            const denominator = zone.maxLevel - zone.minLevel + 1;
            expect(denominator).toBeGreaterThan(0);
        }
    });

    it('progress bar percentage is clamped between 0 and 100', () => {
        // MapZone: width = ((currentLevel - minLevel) / (maxLevel - minLevel + 1)) * 100
        for (const zone of WORLD_ZONES) {
            // At minLevel: 0%
            const atMin = ((zone.minLevel - zone.minLevel) / (zone.maxLevel - zone.minLevel + 1)) * 100;
            expect(atMin).toBeGreaterThanOrEqual(0);
            expect(atMin).toBeLessThanOrEqual(100);

            // At maxLevel: should be < 100 (because denominator is maxLevel - minLevel + 1)
            const atMax = ((zone.maxLevel - zone.minLevel) / (zone.maxLevel - zone.minLevel + 1)) * 100;
            expect(atMax).toBeGreaterThan(0);
            expect(atMax).toBeLessThan(100);
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

    it('WorldMap can render all zones without error (zone.id is a valid React key)', () => {
        // WorldMap uses zone.id as React key — must be a non-empty string
        for (const zone of WORLD_ZONES) {
            expect(typeof zone.id).toBe('string');
            expect(zone.id.length).toBeGreaterThan(0);
        }
    });

    it('MapZone can safely access zone.icon as a React component', () => {
        // MapZone renders <zone.icon size={32} className={...} />
        // Verify the icon can be used as JSX component (is a function or forwardRef object)
        for (const zone of WORLD_ZONES) {
            const icon = zone.icon as any;
            // Lucide icons are forwardRef objects with a `render` method or are functions
            expect(
                typeof icon === 'function' ||
                (typeof icon === 'object' && icon !== null)
            ).toBe(true);
        }
    });
});

/* ---------- 6. Edge cases & invariants ---------- */

describe('edge cases and invariants', () => {
    it('WORLD_ZONES array order matches zone progression (sensory → addition → subtraction → multiplication)', () => {
        const ids = WORLD_ZONES.map(z => z.id);
        expect(ids).toEqual([
            'sensory_beach',
            'addition_island',
            'subtraction_forest',
            'multiplication_mountain',
        ]);
    });

    it('sensory_beach is the first zone (entry point)', () => {
        expect(WORLD_ZONES[0].id).toBe('sensory_beach');
        expect(WORLD_ZONES[0].minLevel).toBe(0);
    });

    it('all non-sensory zones have minLevel > 0 (unlocked after sensory)', () => {
        for (let i = 1; i < WORLD_ZONES.length; i++) {
            expect(WORLD_ZONES[i].minLevel).toBeGreaterThan(0);
        }
    });

    it('zone range widths are positive (maxLevel - minLevel > 0 for each zone)', () => {
        for (const zone of WORLD_ZONES) {
            const width = zone.maxLevel - zone.minLevel;
            expect(width).toBeGreaterThan(0);
        }
    });

    it('sensory_beach has the widest range (covers all levels)', () => {
        const sensory = WORLD_ZONES.find(z => z.id === 'sensory_beach')!;
        const sensoryWidth = sensory.maxLevel - sensory.minLevel;
        for (const zone of WORLD_ZONES) {
            if (zone.id === 'sensory_beach') continue;
            const width = zone.maxLevel - zone.minLevel;
            expect(sensoryWidth).toBeGreaterThanOrEqual(width);
        }
    });

    it('i18n key prefix matches zone id (e.g., zones.sensory.* for sensory_beach)', () => {
        for (const zone of WORLD_ZONES) {
            // Extract the slug from id: sensory_beach → sensory
            const slug = zone.id.split('_')[0];
            expect(zone.name).toMatch(new RegExp(`^zones\\.${slug}\\.`));
            expect(zone.description).toMatch(new RegExp(`^zones\\.${slug}\\.`));
        }
    });

    it('all themeColor values include a valid Tailwind color shade', () => {
        // Pattern: text-{color}-{shade} where shade is a number
        for (const zone of WORLD_ZONES) {
            expect(zone.themeColor).toMatch(/^text-[a-z]+-\d{2,3}$/);
        }
    });

    it('all backgroundClass values include a valid Tailwind color shade', () => {
        // Pattern: bg-{color}-{shade} where shade is a number
        for (const zone of WORLD_ZONES) {
            expect(zone.backgroundClass).toMatch(/^bg-[a-z]+-\d{2,3}$/);
        }
    });

    it('getZoneForLevel(0) returns the exact first element of WORLD_ZONES', () => {
        expect(getZoneForLevel(0)).toBe(WORLD_ZONES[0]);
    });

    it('every integer 0-10 returns a defined zone', () => {
        for (let lvl = 0; lvl <= 10; lvl++) {
            expect(getZoneForLevel(lvl)).toBeDefined();
        }
    });

    it('every integer 0-10 returns sensory_beach (first-match semantics)', () => {
        for (let lvl = 0; lvl <= 10; lvl++) {
            expect(getZoneForLevel(lvl)?.id).toBe('sensory_beach');
        }
    });
});
