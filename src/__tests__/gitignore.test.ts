import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const repoRoot = process.cwd();

describe('build cache files must not be git-tracked', () => {
    it('should not track any .firebase/*.cache files', () => {
        const output = execSync('git ls-files', {
            cwd: repoRoot,
            encoding: 'utf-8',
        });
        const trackedFiles = output.split('\n').filter(Boolean);

        const firebaseCacheFiles = trackedFiles.filter(
            (f: string) => f.startsWith('.firebase/') && f.endsWith('.cache'),
        );

        expect(firebaseCacheFiles, `These .firebase cache files are tracked but should not be:\n${firebaseCacheFiles.join('\n')}`).toEqual([]);
    });

    it('should not track any .jules/cache/** files', () => {
        const output = execSync('git ls-files', {
            cwd: repoRoot,
            encoding: 'utf-8',
        });
        const trackedFiles = output.split('\n').filter(Boolean);

        const julesCacheFiles = trackedFiles.filter(
            (f: string) => f.startsWith('.jules/cache/'),
        );

        expect(julesCacheFiles, `These .jules/cache files are tracked but should not be:\n${julesCacheFiles.join('\n')}`).toEqual([]);
    });

    it('.gitignore should contain valid ASCII entries for .firebase/ and .jules/', () => {
        const gitignorePath = resolve(repoRoot, '.gitignore');
        const content = readFileSync(gitignorePath, 'utf-8');

        // Assert no null bytes (corruption check)
        expect(content).not.toContain('\0');

        // Assert entries exist
        const lines = content.split('\n');
        expect(lines).toContain('.firebase/');
        expect(lines).toContain('.jules/');
    });
});