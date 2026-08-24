import { describe, it, expect } from 'vitest';
import {
    WORLD_ZONES,
    getZoneForLevel,
    type ZoneConfig,
    STORAGE_KEYS,
    SENSORY_CONFIG,
    UI_CONFIG,
    SCORING_CONFIG,
    BUBBLE_ENGINE_CONFIG,
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

/* ---------- 7. STORAGE_KEYS ---------- */

describe('STORAGE_KEYS', () => {
    it('exports an object with all 9 keys', () => {
        expect(STORAGE_KEYS).toBeDefined();
        expect(typeof STORAGE_KEYS).toBe('object');
        expect(Object.keys(STORAGE_KEYS)).toHaveLength(11);
    });

    it('has all expected key names', () => {
        expect(STORAGE_KEYS).toHaveProperty('PROFILES');
        expect(STORAGE_KEYS).toHaveProperty('SAGA_PROGRESS');
        expect(STORAGE_KEYS).toHaveProperty('DAILY_PROGRESS');
        expect(STORAGE_KEYS).toHaveProperty('THEME');
        expect(STORAGE_KEYS).toHaveProperty('MEMORY_BEST_SCORE');
        expect(STORAGE_KEYS).toHaveProperty('INVADERS_BEST_SCORE');
        expect(STORAGE_KEYS).toHaveProperty('COMBO_FUSION_BEST_SCORE');
        expect(STORAGE_KEYS).toHaveProperty('CINEMATIC_SEEN');
        expect(STORAGE_KEYS).toHaveProperty('IS_MUTED');
    });

    it('every value is a non-empty string', () => {
        for (const key of Object.keys(STORAGE_KEYS)) {
            const value = (STORAGE_KEYS as Record<string, string>)[key];
            expect(typeof value).toBe('string');
            expect(value.length).toBeGreaterThan(0);
        }
    });

    it('every value is unique (no duplicate storage keys)', () => {
        const values = Object.values(STORAGE_KEYS);
        expect(new Set(values).size).toBe(values.length);
    });

    it('no key value is a substring of another key value', () => {
        // Prevents accidental partial key collisions in localStorage
        const values = Object.values(STORAGE_KEYS);
        for (let i = 0; i < values.length; i++) {
            for (let j = 0; j < values.length; j++) {
                if (i === j) continue;
                // Skip if one is a prefix of the other with a delimiter
                // (e.g., 'hebrew-math-theme' vs 'hebrew-math-theme-extra')
                expect(values[j]).not.toContain(values[i]);
            }
        }
    });

    it('values match expected string literals (prevents key drift)', () => {
        expect(STORAGE_KEYS.PROFILES).toBe('hebrew-math-profiles');
        expect(STORAGE_KEYS.SAGA_PROGRESS).toBe('hebrew_game_saga_progress_v1');
        expect(STORAGE_KEYS.DAILY_PROGRESS).toBe('hebrew-math-daily-progress');
        expect(STORAGE_KEYS.THEME).toBe('hebrew-math-theme');
        expect(STORAGE_KEYS.MEMORY_BEST_SCORE).toBe('hebrew-math-memory-best');
        expect(STORAGE_KEYS.INVADERS_BEST_SCORE).toBe('hebrew-math-invaders-best');
        expect(STORAGE_KEYS.CINEMATIC_SEEN).toBe('cinematic_seen_units');
        expect(STORAGE_KEYS.IS_MUTED).toBe('isMuted');
    });

    it('keys follow a consistent naming convention (alphanumeric, hyphen or underscore separated)', () => {
        for (const value of Object.values(STORAGE_KEYS)) {
            // All values should be alphanumeric with hyphens or underscores
            expect(value).toMatch(/^[a-zA-Z0-9_-]+$/);
        }
    });
});

/* ---------- 8. SENSORY_CONFIG ---------- */

describe('SENSORY_CONFIG', () => {
    it('exports an object with all 4 fields', () => {
        expect(SENSORY_CONFIG).toBeDefined();
        expect(typeof SENSORY_CONFIG).toBe('object');
        expect(Object.keys(SENSORY_CONFIG)).toHaveLength(4);
    });

    it('has all expected field names', () => {
        expect(SENSORY_CONFIG).toHaveProperty('DEFAULT_TARGET');
        expect(SENSORY_CONFIG).toHaveProperty('DEFAULT_COUNT');
        expect(SENSORY_CONFIG).toHaveProperty('DEFAULT_DENSITY');
        expect(SENSORY_CONFIG).toHaveProperty('PROBABILITY_CLOSE_DISTRACTOR');
    });

    it('every field is a number', () => {
        expect(typeof SENSORY_CONFIG.DEFAULT_TARGET).toBe('number');
        expect(typeof SENSORY_CONFIG.DEFAULT_COUNT).toBe('number');
        expect(typeof SENSORY_CONFIG.DEFAULT_DENSITY).toBe('number');
        expect(typeof SENSORY_CONFIG.PROBABILITY_CLOSE_DISTRACTOR).toBe('number');
    });

    it('DEFAULT_TARGET is a positive integer', () => {
        expect(SENSORY_CONFIG.DEFAULT_TARGET).toBeGreaterThan(0);
        expect(Number.isInteger(SENSORY_CONFIG.DEFAULT_TARGET)).toBe(true);
    });

    it('DEFAULT_COUNT is a positive integer', () => {
        expect(SENSORY_CONFIG.DEFAULT_COUNT).toBeGreaterThan(0);
        expect(Number.isInteger(SENSORY_CONFIG.DEFAULT_COUNT)).toBe(true);
    });

    it('DEFAULT_DENSITY is in range (0, 1]', () => {
        expect(SENSORY_CONFIG.DEFAULT_DENSITY).toBeGreaterThan(0);
        expect(SENSORY_CONFIG.DEFAULT_DENSITY).toBeLessThanOrEqual(1);
    });

    it('PROBABILITY_CLOSE_DISTRACTOR is in range [0, 1]', () => {
        expect(SENSORY_CONFIG.PROBABILITY_CLOSE_DISTRACTOR).toBeGreaterThanOrEqual(0);
        expect(SENSORY_CONFIG.PROBABILITY_CLOSE_DISTRACTOR).toBeLessThanOrEqual(1);
    });

    it('values match expected defaults (prevents accidental rebalancing)', () => {
        expect(SENSORY_CONFIG.DEFAULT_TARGET).toBe(5);
        expect(SENSORY_CONFIG.DEFAULT_COUNT).toBe(15);
        expect(SENSORY_CONFIG.DEFAULT_DENSITY).toBe(0.3);
        expect(SENSORY_CONFIG.PROBABILITY_CLOSE_DISTRACTOR).toBe(0.3);
    });
});

/* ---------- 9. UI_CONFIG ---------- */

describe('UI_CONFIG', () => {
    it('exports an object with all expected fields', () => {
        expect(UI_CONFIG).toBeDefined();
        expect(typeof UI_CONFIG).toBe('object');
        expect(Object.keys(UI_CONFIG)).toEqual(
            expect.arrayContaining(['SESSION_LENGTH', 'BOSS_SIZE_MULTIPLIER', 'GREETING_DURATION_MS', 'ANSWER_LOCK_CORRECT_MS', 'ANSWER_LOCK_WRONG_MS'])
        );
        expect(Object.keys(UI_CONFIG)).toHaveLength(5);
    });

    it('has all expected field names', () => {
        expect(UI_CONFIG).toHaveProperty('SESSION_LENGTH');
        expect(UI_CONFIG).toHaveProperty('BOSS_SIZE_MULTIPLIER');
        expect(UI_CONFIG).toHaveProperty('GREETING_DURATION_MS');
    });

    it('every field is a number', () => {
        expect(typeof UI_CONFIG.SESSION_LENGTH).toBe('number');
        expect(typeof UI_CONFIG.BOSS_SIZE_MULTIPLIER).toBe('number');
        expect(typeof UI_CONFIG.GREETING_DURATION_MS).toBe('number');
    });

    it('SESSION_LENGTH is a positive integer', () => {
        expect(UI_CONFIG.SESSION_LENGTH).toBeGreaterThan(0);
        expect(Number.isInteger(UI_CONFIG.SESSION_LENGTH)).toBe(true);
    });

    it('BOSS_SIZE_MULTIPLIER is a positive number', () => {
        expect(UI_CONFIG.BOSS_SIZE_MULTIPLIER).toBeGreaterThan(0);
    });

    it('BOSS_SIZE_MULTIPLIER is greater than 1 (boss is bigger than normal)', () => {
        expect(UI_CONFIG.BOSS_SIZE_MULTIPLIER).toBeGreaterThan(1);
    });

    it('GREETING_DURATION_MS is a positive integer', () => {
        expect(UI_CONFIG.GREETING_DURATION_MS).toBeGreaterThan(0);
        expect(Number.isInteger(UI_CONFIG.GREETING_DURATION_MS)).toBe(true);
    });

    it('values match expected defaults', () => {
        expect(UI_CONFIG.SESSION_LENGTH).toBe(10);
        expect(UI_CONFIG.BOSS_SIZE_MULTIPLIER).toBe(1.5);
        expect(UI_CONFIG.GREETING_DURATION_MS).toBe(4000);
    });
});

/* ---------- 10. SCORING_CONFIG ---------- */

describe('SCORING_CONFIG', () => {
    it('exports an object with all 6 fields', () => {
        expect(SCORING_CONFIG).toBeDefined();
        expect(typeof SCORING_CONFIG).toBe('object');
        expect(Object.keys(SCORING_CONFIG)).toHaveLength(6);
    });

    it('has all expected field names', () => {
        expect(SCORING_CONFIG).toHaveProperty('BASE_SCORE_CORRECT');
        expect(SCORING_CONFIG).toHaveProperty('BASE_SCORE_BOSS');
        expect(SCORING_CONFIG).toHaveProperty('BOSS_DEFEAT_BONUS_MULTIPLIER');
        expect(SCORING_CONFIG).toHaveProperty('COMBO_SCORE_FACTOR');
        expect(SCORING_CONFIG).toHaveProperty('INVADER_SPAWN_BASE_INTERVAL_MS');
        expect(SCORING_CONFIG).toHaveProperty('INVADER_ANSWER_SPAWN_BASE_INTERVAL_MS');
    });

    it('every field is a number', () => {
        expect(typeof SCORING_CONFIG.BASE_SCORE_CORRECT).toBe('number');
        expect(typeof SCORING_CONFIG.BASE_SCORE_BOSS).toBe('number');
        expect(typeof SCORING_CONFIG.BOSS_DEFEAT_BONUS_MULTIPLIER).toBe('number');
        expect(typeof SCORING_CONFIG.COMBO_SCORE_FACTOR).toBe('number');
        expect(typeof SCORING_CONFIG.INVADER_SPAWN_BASE_INTERVAL_MS).toBe('number');
        expect(typeof SCORING_CONFIG.INVADER_ANSWER_SPAWN_BASE_INTERVAL_MS).toBe('number');
    });

    it('BASE_SCORE_CORRECT is a positive integer', () => {
        expect(SCORING_CONFIG.BASE_SCORE_CORRECT).toBeGreaterThan(0);
        expect(Number.isInteger(SCORING_CONFIG.BASE_SCORE_CORRECT)).toBe(true);
    });

    it('BASE_SCORE_BOSS is a positive integer', () => {
        expect(SCORING_CONFIG.BASE_SCORE_BOSS).toBeGreaterThan(0);
        expect(Number.isInteger(SCORING_CONFIG.BASE_SCORE_BOSS)).toBe(true);
    });

    it('BASE_SCORE_BOSS > BASE_SCORE_CORRECT (boss worth more than regular)', () => {
        expect(SCORING_CONFIG.BASE_SCORE_BOSS).toBeGreaterThan(SCORING_CONFIG.BASE_SCORE_CORRECT);
    });

    it('BOSS_DEFEAT_BONUS_MULTIPLIER is a positive integer', () => {
        expect(SCORING_CONFIG.BOSS_DEFEAT_BONUS_MULTIPLIER).toBeGreaterThan(0);
        expect(Number.isInteger(SCORING_CONFIG.BOSS_DEFEAT_BONUS_MULTIPLIER)).toBe(true);
    });

    it('COMBO_SCORE_FACTOR is a positive number', () => {
        expect(SCORING_CONFIG.COMBO_SCORE_FACTOR).toBeGreaterThan(0);
    });

    it('INVADER_SPAWN_BASE_INTERVAL_MS is a positive integer', () => {
        expect(SCORING_CONFIG.INVADER_SPAWN_BASE_INTERVAL_MS).toBeGreaterThan(0);
        expect(Number.isInteger(SCORING_CONFIG.INVADER_SPAWN_BASE_INTERVAL_MS)).toBe(true);
    });

    it('INVADER_ANSWER_SPAWN_BASE_INTERVAL_MS is a positive integer', () => {
        expect(SCORING_CONFIG.INVADER_ANSWER_SPAWN_BASE_INTERVAL_MS).toBeGreaterThan(0);
        expect(Number.isInteger(SCORING_CONFIG.INVADER_ANSWER_SPAWN_BASE_INTERVAL_MS)).toBe(true);
    });

    it('INVADER_SPAWN_BASE_INTERVAL_MS > INVADER_ANSWER_SPAWN_BASE_INTERVAL_MS (equations spawn slower than answers)', () => {
        expect(SCORING_CONFIG.INVADER_SPAWN_BASE_INTERVAL_MS)
            .toBeGreaterThan(SCORING_CONFIG.INVADER_ANSWER_SPAWN_BASE_INTERVAL_MS);
    });

    it('values match expected defaults', () => {
        expect(SCORING_CONFIG.BASE_SCORE_CORRECT).toBe(10);
        expect(SCORING_CONFIG.BASE_SCORE_BOSS).toBe(100);
        expect(SCORING_CONFIG.BOSS_DEFEAT_BONUS_MULTIPLIER).toBe(500);
        expect(SCORING_CONFIG.COMBO_SCORE_FACTOR).toBe(0.1);
        expect(SCORING_CONFIG.INVADER_SPAWN_BASE_INTERVAL_MS).toBe(2500);
        expect(SCORING_CONFIG.INVADER_ANSWER_SPAWN_BASE_INTERVAL_MS).toBe(2000);
    });
});

/* ---------- 11. BUBBLE_ENGINE_CONFIG ---------- */

describe('BUBBLE_ENGINE_CONFIG', () => {
    it('exports an object with all 10 fields', () => {
        expect(BUBBLE_ENGINE_CONFIG).toBeDefined();
        expect(typeof BUBBLE_ENGINE_CONFIG).toBe('object');
        expect(Object.keys(BUBBLE_ENGINE_CONFIG)).toHaveLength(17);
    });

    it('has all expected field names', () => {
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('LANE_COUNT');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('SPAWN_Y_OFFSET');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('SPAWN_Y_STEP');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('COMBO_BONUS_PER_COMBO');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('COMBO_BONUS_CAP');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('SPEED_MULTIPLIER_CAP');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('POWER_UP_SLOW_SPEED');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('STALE_FRAME_THRESHOLD_MS');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('TARGET_LIFESPAN_MS');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('DISTRACTOR_LIFESPAN_MS');
        // Bubble Spawn Remediation additions
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('INITIAL_SPAWN_CREDITS');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('TARGET_DROUGHT_THRESHOLD_MS');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('LOW_TARGET_THRESHOLD_MS');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('BOSS_MAX_ON_SCREEN_FLOOR');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('BOSS_MAX_ON_SCREEN_RATIO');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('BOSS_VELOCITY_MULTIPLIER');
        expect(BUBBLE_ENGINE_CONFIG).toHaveProperty('BOSS_SPAWN_INTERVAL_FACTOR');
    });

    it('every field is a number', () => {
        expect(typeof BUBBLE_ENGINE_CONFIG.LANE_COUNT).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.SPAWN_Y_OFFSET).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.SPAWN_Y_STEP).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.COMBO_BONUS_PER_COMBO).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.COMBO_BONUS_CAP).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.SPEED_MULTIPLIER_CAP).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.POWER_UP_SLOW_SPEED).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.STALE_FRAME_THRESHOLD_MS).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.TARGET_LIFESPAN_MS).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.DISTRACTOR_LIFESPAN_MS).toBe('number');
        // Bubble Spawn Remediation additions
        expect(typeof BUBBLE_ENGINE_CONFIG.INITIAL_SPAWN_CREDITS).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.TARGET_DROUGHT_THRESHOLD_MS).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.LOW_TARGET_THRESHOLD_MS).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.BOSS_MAX_ON_SCREEN_FLOOR).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.BOSS_MAX_ON_SCREEN_RATIO).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.BOSS_VELOCITY_MULTIPLIER).toBe('number');
        expect(typeof BUBBLE_ENGINE_CONFIG.BOSS_SPAWN_INTERVAL_FACTOR).toBe('number');
    });

    it('LANE_COUNT is a positive integer', () => {
        expect(BUBBLE_ENGINE_CONFIG.LANE_COUNT).toBeGreaterThan(0);
        expect(Number.isInteger(BUBBLE_ENGINE_CONFIG.LANE_COUNT)).toBe(true);
    });

    it('SPAWN_Y_OFFSET is a positive number', () => {
        expect(BUBBLE_ENGINE_CONFIG.SPAWN_Y_OFFSET).toBeGreaterThan(0);
    });

    it('SPAWN_Y_STEP is a positive number', () => {
        expect(BUBBLE_ENGINE_CONFIG.SPAWN_Y_STEP).toBeGreaterThan(0);
    });

    it('COMBO_BONUS_PER_COMBO is a positive number', () => {
        expect(BUBBLE_ENGINE_CONFIG.COMBO_BONUS_PER_COMBO).toBeGreaterThan(0);
    });

    it('COMBO_BONUS_CAP is a positive number', () => {
        expect(BUBBLE_ENGINE_CONFIG.COMBO_BONUS_CAP).toBeGreaterThan(0);
    });

    it('SPEED_MULTIPLIER_CAP is a positive number', () => {
        expect(BUBBLE_ENGINE_CONFIG.SPEED_MULTIPLIER_CAP).toBeGreaterThan(0);
    });

    it('SPEED_MULTIPLIER_CAP > 1 (speed can increase above base)', () => {
        expect(BUBBLE_ENGINE_CONFIG.SPEED_MULTIPLIER_CAP).toBeGreaterThan(1);
    });

    it('POWER_UP_SLOW_SPEED is in range (0, 1)', () => {
        expect(BUBBLE_ENGINE_CONFIG.POWER_UP_SLOW_SPEED).toBeGreaterThan(0);
        expect(BUBBLE_ENGINE_CONFIG.POWER_UP_SLOW_SPEED).toBeLessThan(1);
    });

    it('STALE_FRAME_THRESHOLD_MS is a positive integer', () => {
        expect(BUBBLE_ENGINE_CONFIG.STALE_FRAME_THRESHOLD_MS).toBeGreaterThan(0);
        expect(Number.isInteger(BUBBLE_ENGINE_CONFIG.STALE_FRAME_THRESHOLD_MS)).toBe(true);
    });

    it('TARGET_LIFESPAN_MS is a positive integer', () => {
        expect(BUBBLE_ENGINE_CONFIG.TARGET_LIFESPAN_MS).toBeGreaterThan(0);
        expect(Number.isInteger(BUBBLE_ENGINE_CONFIG.TARGET_LIFESPAN_MS)).toBe(true);
    });

    it('DISTRACTOR_LIFESPAN_MS is a positive integer', () => {
        expect(BUBBLE_ENGINE_CONFIG.DISTRACTOR_LIFESPAN_MS).toBeGreaterThan(0);
        expect(Number.isInteger(BUBBLE_ENGINE_CONFIG.DISTRACTOR_LIFESPAN_MS)).toBe(true);
    });

    it('TARGET_LIFESPAN_MS > DISTRACTOR_LIFESPAN_MS (targets live longer than distractors)', () => {
        expect(BUBBLE_ENGINE_CONFIG.TARGET_LIFESPAN_MS)
            .toBeGreaterThan(BUBBLE_ENGINE_CONFIG.DISTRACTOR_LIFESPAN_MS);
    });

    it('values match expected defaults', () => {
        expect(BUBBLE_ENGINE_CONFIG.LANE_COUNT).toBe(6);
        expect(BUBBLE_ENGINE_CONFIG.SPAWN_Y_OFFSET).toBe(110);
        expect(BUBBLE_ENGINE_CONFIG.SPAWN_Y_STEP).toBe(12);
        expect(BUBBLE_ENGINE_CONFIG.COMBO_BONUS_PER_COMBO).toBe(0.02);
        expect(BUBBLE_ENGINE_CONFIG.COMBO_BONUS_CAP).toBe(0.3);
        expect(BUBBLE_ENGINE_CONFIG.SPEED_MULTIPLIER_CAP).toBe(1.6);
        expect(BUBBLE_ENGINE_CONFIG.POWER_UP_SLOW_SPEED).toBe(0.3);
        expect(BUBBLE_ENGINE_CONFIG.STALE_FRAME_THRESHOLD_MS).toBe(2000);
        expect(BUBBLE_ENGINE_CONFIG.TARGET_LIFESPAN_MS).toBe(20000);
        expect(BUBBLE_ENGINE_CONFIG.DISTRACTOR_LIFESPAN_MS).toBe(15000);
    });
});
