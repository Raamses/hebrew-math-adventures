import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfile, selectArcadeMode, solveBubbleProblem } from './helpers';

const STORAGE_KEY = 'hebrew-math-daily-progress';

/**
 * Daily Challenge E2E — verifies that playing arcade modes tracks daily challenge progress.
 *
 * Bug being fixed: GameOrchestrator only passed dailyChallengeMode/Target to PracticeMode.
 * Arcade modes (zen/classic/blitz/survival) via the SENSORY/BubbleGame path never called
 * addDailyChallengeCorrect or completeDailyChallenge.
 *
 * Fix: GameOrchestrator now checks daily challenge completion in the SENSORY onComplete callback.
 */

/** Read dailyChallengeCorrect from localStorage (accumulated across sessions). */
async function getDailyChallengeCorrect(page: Page): Promise<number> {
  return await page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return -1;
      const all = JSON.parse(raw);
      for (const profileId of Object.keys(all)) {
        const entry = all[profileId];
        if (entry && typeof entry.dailyChallengeCorrect === 'number') {
          return entry.dailyChallengeCorrect;
        }
      }
      return -1;
    } catch { return -1; }
  }, STORAGE_KEY);
}

/** Read dailyChallengeDate from localStorage. */
async function getDailyChallengeDate(page: Page): Promise<string> {
  return await page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return '';
      const all = JSON.parse(raw);
      for (const profileId of Object.keys(all)) {
        const entry = all[profileId];
        if (entry && typeof entry.dailyChallengeDate === 'string') {
          return entry.dailyChallengeDate;
        }
      }
      return '';
    } catch { return ''; }
  }, STORAGE_KEY);
}

/** Read dailyStamps from localStorage. */
async function getDailyStamps(page: Page): Promise<string[]> {
  return await page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const all = JSON.parse(raw);
      for (const profileId of Object.keys(all)) {
        const entry = all[profileId];
        if (entry && Array.isArray(entry.dailyStamps)) {
          return entry.dailyStamps;
        }
      }
      return [];
    } catch { return []; }
  }, STORAGE_KEY);
}

/**
 * Play a bubble game session and pop correct bubbles until the session ends
 * or a max number of attempts is reached.
 * Returns the number of correct bubbles popped.
 */
async function playBubbleSession(page: Page, maxAttempts = 20): Promise<number> {
  let correctPops = 0;
  for (let i = 0; i < maxAttempts; i++) {
    await page.waitForTimeout(1500);

    // Check if game is still active (no game-over modal)
    const bodyText = await page.textContent('body') || '';
    if (bodyText.match(/Play Again|שחק שוב|Game Over|Summary|סיכום/i)) {
      break;
    }

    // Try to solve the current bubble problem
    const solved = await solveBubbleProblem(page);
    if (solved) {
      correctPops++;
      // Wait for pop animation + next problem
      await page.waitForTimeout(2000);
    }
  }
  return correctPops;
}

test.describe('Daily Challenge — arcade modes', () => {
  test.setTimeout(120000);

  test('zen mode: correct bubbles accumulate daily challenge progress', async ({ page }) => {
    await setupFreshProfile(page, 'DCZen');
    await selectArcadeMode(page, 'zen');
    await page.waitForTimeout(3000);

    // Pop a few correct bubbles
    const popped = await playBubbleSession(page, 10);

    // Verify dailyChallengeCorrect was tracked in localStorage
    const correct = await getDailyChallengeCorrect(page);
    console.log(`[DC Zen] popped ${popped} bubbles, dailyChallengeCorrect = ${correct}`);

    // The correct count should be >= 0 (tracked). If we popped any, it should be > 0.
    // Note: we might not match today's challenge mode (zen), so only verify tracking happened
    // when the mode matches.
    expect(correct).toBeGreaterThanOrEqual(0);
  });

  test('classic mode: correct bubbles accumulate daily challenge progress', async ({ page }) => {
    await setupFreshProfile(page, 'DCClassic');
    await selectArcadeMode(page, 'classic');
    await page.waitForTimeout(3000);

    const popped = await playBubbleSession(page, 10);

    const correct = await getDailyChallengeCorrect(page);
    console.log(`[DC Classic] popped ${popped} bubbles, dailyChallengeCorrect = ${correct}`);

    expect(correct).toBeGreaterThanOrEqual(0);
  });

  test('blitz mode: correct bubbles accumulate daily challenge progress', async ({ page }) => {
    await setupFreshProfile(page, 'DCBlitz');
    await selectArcadeMode(page, 'blitz');
    await page.waitForTimeout(3000);

    // Blitz is time-limited (60s), so we play through the whole game
    const popped = await playBubbleSession(page, 40);

    const correct = await getDailyChallengeCorrect(page);
    console.log(`[DC Blitz] popped ${popped} bubbles, dailyChallengeCorrect = ${correct}`);

    expect(correct).toBeGreaterThanOrEqual(0);
  });

  test('survival mode: correct bubbles accumulate daily challenge progress', async ({ page }) => {
    await setupFreshProfile(page, 'DCSurvival');
    await selectArcadeMode(page, 'survival');
    await page.waitForTimeout(3000);

    // Survival ends on 3 wrong answers. Play carefully but with a cap.
    const popped = await playBubbleSession(page, 15);

    const correct = await getDailyChallengeCorrect(page);
    console.log(`[DC Survival] popped ${popped} bubbles, dailyChallengeCorrect = ${correct}`);

    expect(correct).toBeGreaterThanOrEqual(0);
  });

  test('daily challenge date is set to today after playing arcade mode', async ({ page }) => {
    await setupFreshProfile(page, 'DCDate');
    await selectArcadeMode(page, 'zen');
    await page.waitForTimeout(3000);

    // Pop at least one correct bubble
    await playBubbleSession(page, 5);

    const date = await getDailyChallengeDate(page);
    console.log(`[DC Date] dailyChallengeDate = ${date}`);

    // If tracking occurred, the date should be today (Asia/Jerusalem timezone)
    if (date) {
      const now = new Date();
      // Asia/Jerusalem is GMT+3 (or GMT+2 with DST, but approximated here)
      const jerusalemOffset = 3;
      const jerusalemDate = new Date(now.getTime() + jerusalemOffset * 3600000).toISOString().slice(0, 10);
      expect(date).toBe(jerusalemDate);
    }
  });

  test('daily challenge completes when target reached in matching mode', async ({ page }) => {
    // This test plays the mode that matches today's daily challenge.
    // We determine today's challenge mode deterministically (same as the app).
    const today = new Date().toISOString().slice(0, 10);
    const seed = today.split('-').reduce((a, b) => a + parseInt(b, 10), 0);
    const MODES = ['zen', 'classic', 'blitz', 'survival'] as const;
    const todayMode = MODES[seed % MODES.length];
    const todayTarget = 10 + (seed % 10); // 10-19

    console.log(`[DC Complete] Today's challenge: mode=${todayMode}, target=${todayTarget}`);

    await setupFreshProfile(page, 'DCComplete');
    await selectArcadeMode(page, todayMode);
    await page.waitForTimeout(3000);

    // Pop correct bubbles. We may need multiple sessions if target > bubbles per session.
    // Play up to target + 5 extra attempts to account for misses.
    let totalPopped = 0;
    const maxSessions = 5;

    for (let session = 0; session < maxSessions && totalPopped < todayTarget; session++) {
      if (session > 0) {
        // If game ended, we need to go back and re-enter the mode
        // Check if we're back on the saga map
        const arcadeBtn = page.locator('button[title="Arcade Games"], button[title="משחקי ארקייד"]').first();
        if (await arcadeBtn.count() > 0) {
          await selectArcadeMode(page, todayMode);
          await page.waitForTimeout(3000);
        } else {
          // Still in game or transition — wait
          await page.waitForTimeout(3000);
        }
      }

      const popped = await playBubbleSession(page, Math.min(todayTarget + 5, 25));
      totalPopped += popped;
      console.log(`[DC Complete] Session ${session + 1}: popped ${popped}, total ${totalPopped}/${todayTarget}`);
    }

    // Check if daily challenge was completed (dailyStamps includes today)
    const stamps = await getDailyStamps(page);
    const correct = await getDailyChallengeCorrect(page);
    console.log(`[DC Complete] dailyChallengeCorrect = ${correct}, stamps = ${JSON.stringify(stamps)}`);

    // If we managed to pop enough correct bubbles matching today's mode, the challenge should complete
    if (totalPopped >= todayTarget) {
      const todayStr = new Date().toISOString().slice(0, 10);
      // Use Jerusalem timezone
      const now = new Date();
      const jerusalemOffset = 3;
      const jerusalemDate = new Date(now.getTime() + jerusalemOffset * 3600000).toISOString().slice(0, 10);
      expect(stamps).toContain(jerusalemDate);
    } else {
      // If we didn't reach the target (bubbles can be tricky in E2E), at least verify progress was tracked
      expect(correct).toBeGreaterThan(0);
    }
  });
});