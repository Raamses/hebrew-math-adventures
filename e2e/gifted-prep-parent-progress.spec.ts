import { test, expect, type Page } from '@playwright/test';
import { openMenu, setupFreshProfile, solveParentGate } from './helpers';

/**
 * G7.2 parent progress view: empty state before any practice -> the kid practices (at least one wrong
 * answer) -> the parent sees per-type rows, the weakest types and the mistake with its correct answer.
 * Every locator is a data-testid (no styling classes: #291).
 */
async function openParentSettings(page: Page) {
    await openMenu(page);
    await page.getByTestId('parent-zone-button').click();
    const gate = page.getByTestId('parent-gate');
    await expect(gate).toBeVisible();
    const problem = (await gate.getByTestId('parent-gate-problem').textContent()) ?? '';
    const m = problem.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
    expect(m).not.toBeNull();
    await solveParentGate(page, Number(m![1]) + Number(m![2]));
    await page.getByTestId('tab-settings').click();
}

test.describe('Gifted prep parent progress', () => {
    test('empty state, then accuracy, weakest types and mistakes after practice', async ({ page }) => {
        // Hebrew UI regardless of the runner's locale (the app follows navigator.language otherwise);
        // an init script survives the localStorage.clear() + reload inside setupFreshProfile
        await page.addInitScript(() => localStorage.setItem('i18nextLng', 'he'));
        await setupFreshProfile(page, 'ProgressKid');

        // Parent turns the section on; the progress view appears next to the toggle, empty
        await openParentSettings(page);
        const card = page.getByTestId('profile-card').first();
        const toggle = card.locator('[data-testid^="prep-toggle-"]');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', 'true');
        const progressButton = card.locator('[data-testid^="prep-progress-button-"]');
        await progressButton.click();
        await expect(progressButton).toHaveAttribute('aria-expanded', 'true');
        await expect(card.getByTestId('prep-progress-empty')).toBeVisible();
        await page.getByTestId('parent-exit-button').click();

        // Kid practices math until at least one answer is wrong (option 0 is the key 1 time in 4)
        await page.getByTestId('prep-tile').click();
        await expect(page.getByTestId('prep-screen')).toBeVisible({ timeout: 15_000 });
        await page.getByTestId('prep-learn-math').click();
        await expect(page.getByTestId('prep-learn-session')).toBeVisible();
        let wrong = 0;
        for (let i = 0; i < 12 && wrong === 0; i++) {
            await page.getByTestId('prep-option-0').click();
            await expect(page.getByTestId('prep-feedback')).toBeVisible();
            if ((await page.getByTestId('prep-option-0').getAttribute('data-correct')) === 'false') wrong++;
            await page.getByTestId('prep-next').click();
        }
        expect(wrong).toBe(1);
        await page.getByTestId('prep-pause').click();
        await page.getByTestId('prep-quit').click();
        await page.getByTestId('prep-back').click();
        await expect(page.getByTestId('prep-tile')).toBeVisible();

        // Parent view now shows the practice
        await openParentSettings(page);
        await card.locator('[data-testid^="prep-progress-button-"]').click();
        const panel = card.getByTestId('prep-progress-panel');
        await expect(panel).toBeVisible();
        await expect(panel.getByTestId('prep-progress-empty')).toHaveCount(0);
        expect(await panel.getByTestId('prep-progress-type').count()).toBeGreaterThan(0);
        await expect(panel.getByTestId('prep-progress-weak-type').first()).toBeVisible();
        const mistake = panel.getByTestId('prep-progress-mistake');
        await expect(mistake).toHaveCount(1);
        await expect(mistake.getByTestId('prep-mistake-question')).not.toBeEmpty();
        await expect(mistake.getByTestId('prep-mistake-answer')).not.toBeEmpty();
        // RTL: the parent zone and the panel lay out right-to-left in Hebrew
        await expect(page.getByTestId('parent-dashboard')).toHaveAttribute('dir', 'rtl');
        expect(await panel.evaluate(el => getComputedStyle(el).direction)).toBe('rtl');
    });
});
