import { test, expect } from '@playwright/test';

const APP_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

/**
 * Gifted-prep Stage-A mock (nightly; uses the Playwright clock API, no real waits):
 * intro shows the guessing tip -> answer some items -> the part's time runs out -> the rest count as blank
 * -> results show the blank nudge.
 */
test('mock: timer expiry moves on and blanks are counted', async ({ page }) => {
    await page.clock.install();
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        const now = Date.now();
        localStorage.clear();
        localStorage.setItem('i18nextLng', 'he');
        localStorage.setItem('hebrew-math-profiles', JSON.stringify([{
            id: 'mock-kid', name: 'MockKid', age: 7, avatarId: '🦊', mascotId: 'owl', themeId: 'default',
            createdAt: now, lastPlayedAt: now, settings: { musicVolume: 0.5, sfxVolume: 0.5, isMuted: true },
            streak: 0, giftedPrepEnabled: true,
        }]));
    });
    await page.reload();
    await page.getByText('MockKid').first().click();
    await page.getByTestId('prep-tile').click();
    await page.getByTestId('prep-mock').click();

    await expect(page.getByTestId('prep-guess-tip')).toBeVisible();
    await page.getByTestId('prep-mock-start').click();

    // Every part: answer two items, then let the part's time run out.
    for (let part = 0; part < 2; part++) {
        const section = page.getByTestId('prep-mock-section');
        if (!(await section.isVisible().catch(() => false))) break;
        for (let i = 0; i < 2; i++) {
            await page.getByTestId('prep-option-1').click();
            await page.getByTestId('prep-next').click();
        }
        // A part's time depends on how many questions it drew (whole passages), so read the timer instead of
        // assuming a fixed length, then jump just past it.
        const left = (await page.getByTestId('prep-timer').textContent()) ?? '';
        const m = left.match(/(\d+):(\d{2})/);
        expect(m, `prep-timer should show m:ss, got "${left}"`).not.toBeNull();
        await page.clock.fastForward((Number(m![1]) * 60 + Number(m![2]) + 5) * 1000);
    }

    await expect(page.getByTestId('prep-summary')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('prep-mock-results')).toBeVisible();
    await expect(page.getByTestId('prep-mock-blanks')).toBeVisible();
});
