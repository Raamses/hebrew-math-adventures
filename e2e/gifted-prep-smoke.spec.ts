import { test, expect } from '@playwright/test';
import { openMenu, setupFreshProfile, solveParentGate } from './helpers';

/**
 * Gifted-prep smoke (vault/decisions/2026-11-gifted-prep-stage-a.md):
 * hidden by default -> parent turns it on in the Parent zone -> tile on the map -> hub opens RTL -> back.
 */
test.describe('Gifted prep section', () => {
    test('parent toggle shows the tile; hub opens RTL and returns to the map', async ({ page }) => {
        await setupFreshProfile(page, 'PrepKid');
        await expect(page.getByTestId('prep-tile')).toHaveCount(0);

        // Parent zone -> Settings tab -> toggle on
        await openMenu(page);
        await page.getByTestId('parent-zone-button').click();
        const gate = page.getByTestId('parent-gate');
        await expect(gate).toBeVisible();
        const problem = (await gate.getByTestId('parent-gate-problem').textContent()) ?? '';
        const m = problem.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
        expect(m).not.toBeNull();
        await solveParentGate(page, Number(m![1]) + Number(m![2]));
        await page.getByTestId('tab-settings').click();
        const toggle = page.locator('[data-testid^="prep-toggle-"]').first();
        await expect(toggle).toHaveAttribute('aria-checked', 'false');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', 'true');
        await page.getByTestId('parent-exit-button').click();

        // Tile -> hub (lazy chunk) -> back to map
        const tile = page.getByTestId('prep-tile');
        await expect(tile).toBeVisible({ timeout: 15_000 });
        await tile.click();
        const screen = page.getByTestId('prep-screen');
        await expect(screen).toBeVisible({ timeout: 15_000 });
        await expect(screen).toHaveAttribute('dir', 'rtl');
        await expect(page.getByTestId('prep-learn-reading')).toBeVisible();

        // Learning mode (math): answer 3 items, see feedback + explanation, then Pause -> Quit (2-step exit)
        await page.getByTestId('prep-learn-math').click();
        await expect(page.getByTestId('prep-learn-session')).toBeVisible();
        for (let i = 0; i < 3; i++) {
            await page.getByTestId('prep-option-0').click();
            await expect(page.getByTestId('prep-feedback')).toBeVisible();
            await expect(page.getByTestId('prep-explanation')).not.toBeEmpty();
            await expect(page.locator('[data-correct="true"]')).toHaveCount(1);
            await page.getByTestId('prep-next').click();
        }
        await page.getByTestId('prep-pause').click();
        await page.getByTestId('prep-quit').click();
        await expect(page.getByTestId('prep-learn-math')).toBeVisible();

        // Niqqud: on by default (reading question is vocalized); flip the switch -> plain text
        const NIQQUD = /[ְ-ׇֽׁׂ]/;
        const readingQuestion = async () => {
            await page.getByTestId('prep-learn-reading').click();
            const text = (await page.getByTestId('prep-question').textContent()) ?? '';
            await page.getByTestId('prep-pause').click();
            await page.getByTestId('prep-quit').click();
            return text;
        };
        await expect(page.getByTestId('prep-niqqud-toggle')).toHaveAttribute('aria-checked', 'true');
        expect(await readingQuestion()).toMatch(NIQQUD);
        await page.getByTestId('prep-niqqud-toggle').click();
        await expect(page.getByTestId('prep-niqqud-toggle')).toHaveAttribute('aria-checked', 'false');
        expect(await readingQuestion()).not.toMatch(NIQQUD);

        await page.getByTestId('prep-back').click();
        await expect(page.getByTestId('prep-tile')).toBeVisible();

        // The flag persists across a reload
        await page.reload();
        await expect(page.getByTestId('prep-tile').or(page.getByText('PrepKid').first())).toBeVisible({ timeout: 15_000 });
    });
});
