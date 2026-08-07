import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Leaf-module invariant test for worldConfig.ts.
 *
 * worldConfig.ts must remain a true leaf module: it may only import from
 * `lucide-react` (for zone icons) and from `types/game` (for shared type
 * definitions).  It must NEVER import from:
 *   - engines/   (would create lib→engines layer violation)
 *   - components/
 *   - hooks/
 *   - context/
 *   - data/
 *
 * This test reads the source file and greps for forbidden import paths,
 * failing if any are found.  This catches layer violations at CI time
 * before they can silently introduce circular dependencies.
 */

describe('worldConfig.ts leaf-module invariant', () => {
    const worldConfigPath = resolve(__dirname, '../worldConfig.ts');
    const source = readFileSync(worldConfigPath, 'utf-8');

    it('imports from lucide-react (allowed)', () => {
        expect(source).toMatch(/from ['"]lucide-react['"]/);
    });

    it('imports from types/game (allowed)', () => {
        expect(source).toMatch(/from ['"]\.\.\/types\/game['"]/);
    });

    it('does NOT import from engines/', () => {
        expect(source).not.toMatch(/from ['"].*engines\//);
    });

    it('does NOT import from components/', () => {
        expect(source).not.toMatch(/from ['"].*components\//);
    });

    it('does NOT import from hooks/', () => {
        expect(source).not.toMatch(/from ['"].*hooks\//);
    });

    it('does NOT import from context/', () => {
        expect(source).not.toMatch(/from ['"].*context\//);
    });

    it('does NOT import from data/', () => {
        expect(source).not.toMatch(/from ['"].*data\//);
    });

    it('does NOT import from lib/gameLogic, lib/firebase, lib/logger, etc.', () => {
        // worldConfig should not import from other lib modules that might
        // themselves import from engines/components.
        // Filter out allowed imports: ./worldConfig (self), ../types/game
        const forbiddenLib = source.match(
            /from ['"]\.\/(?!worldConfig)[^'"]+['"]|from ['"]\.\.\/(?!types\/game)[^'"]+['"]/g
        ) || [];
        // lucide-react is a bare import (not relative), so it won't match here.
        // We only need to check relative imports.
        expect(forbiddenLib.filter(imp => !imp.includes('lucide-react'))).toHaveLength(0);
    });

    it('has no dynamic imports from forbidden paths', () => {
        expect(source).not.toMatch(/import\(['"].*engines\//);
        expect(source).not.toMatch(/import\(['"].*components\//);
        expect(source).not.toMatch(/import\(['"].*hooks\//);
        expect(source).not.toMatch(/import\(['"].*context\//);
        expect(source).not.toMatch(/import\(['"].*data\//);
    });

    it('exports config constants (not just functions)', () => {
        // Verify the module actually exports config data, not just re-exports
        expect(source).toMatch(/export const (MAX_LEVEL|BOSS_LEVELS|DIRECTOR_CONFIG)/);
    });

    it('does not import from itself (no circular self-import)', () => {
        expect(source).not.toMatch(/from ['"].*worldConfig['"]/);
    });
});
