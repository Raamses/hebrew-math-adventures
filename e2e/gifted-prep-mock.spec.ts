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
        // Wait for the transition the previous fastForward triggered (or, for part 0, mock start):
        // either this part's section is mounted, or the mock already ended at prep-summary. An
        // instant isVisible() snapshot can land between the old section unmounting and the new one
        // mounting and wrongly break the loop early, so poll for the real outcome instead. Every
        // part renders data-testid="prep-mock-section", so the outgoing part's section can still be
        // mounted when this part's poll starts - scope the match to this part's own header
        // ("{sectionName} · {part+1}/{count} · {question}") rather than a bare "{part+1}/" prefix:
        // the middle "· n/m ·" part-counter segment is the per-part discriminator, since the
        // question counter ("question n/total" / "n of total") has no slash form to collide with.
        let ended = false;
        await expect.poll(async () => {
            if (await page.getByTestId('prep-summary').isVisible().catch(() => false)) {
                ended = true;
                return true;
            }
            return page
                .getByTestId('prep-mock-section')
                .filter({ hasText: new RegExp(`·\\s*${part + 1}/\\d+\\s*·`) })
                .isVisible()
                .catch(() => false);
        }, {
            message: 'expected either this part\'s prep-mock-section or prep-summary to become visible',
            timeout: 10_000,
            intervals: [100, 100, 100],
        }).toBe(true);
        if (ended) break;

        for (let i = 0; i < 2; i++) {
            await page.getByTestId('prep-option-1').click();
            await page.getByTestId('prep-next').click();
        }
        // A part's time depends on how many questions it drew (whole passages), so read the timer
        // instead of assuming a fixed length. The clock runs at 1x real time, so a slow poll can
        // legitimately see the 1 Hz countdown tick down by 1s between reads - require two
        // consecutive running (seconds > 0) reads where the second is no more than 1s behind the
        // first (equal is fine), so a transient/stale read (part not yet mounted, or mid-reset right
        // after the previous fastForward) is never used to compute the jump, and short polling
        // intervals keep this from livelocking against the countdown.
        let stable: RegExpMatchArray | null = null;
        let previousSeconds: number | null = null;
        await expect.poll(async () => {
            const text = (
                (await page.getByTestId('prep-timer').textContent({ timeout: 500 }).catch(() => '')) ?? ''
            ).trim();
            const match = text.match(/^(\d+):(\d{2})$/);
            const seconds = match ? Number(match[1]) * 60 + Number(match[2]) : 0;
            const isRunning = !!match && seconds > 0;
            if (
                isRunning &&
                previousSeconds !== null &&
                previousSeconds >= seconds &&
                previousSeconds - seconds <= 1
            ) {
                stable = match;
                return true;
            }
            previousSeconds = isRunning ? seconds : null;
            return false;
        }, {
            message: 'prep-timer should settle on two consecutive running m:ss reads a 1 Hz tick apart',
            timeout: 10_000,
            intervals: [100, 100, 100],
        }).toBe(true);
        await page.clock.fastForward((Number(stable![1]) * 60 + Number(stable![2]) + 5) * 1000);
    }

    await expect(page.getByTestId('prep-summary')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('prep-mock-results')).toBeVisible();
    await expect(page.getByTestId('prep-mock-blanks')).toBeVisible();
});
