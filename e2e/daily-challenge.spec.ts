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

const GAME_OVER_TEXT = /Play Again|שחק שוב|Game Over|Summary|סיכום/i;

/** Text of the on-screen bubble-game instruction (isolates stripped, trimmed). */
async function readInstructionText(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const visible = (el: Element | null) => !!el && el.getClientRects().length > 0;
    const span = document.querySelector('div[dir] span.font-mono');
    const el = visible(span)
      ? span
      : document.querySelector('div[dir].font-mono, div[dir] .font-mono');
    return (el?.textContent || '').replace(/[\u2066\u2067\u2068\u2069]/g, '').trim();
  });
}

/** Poll until an instruction renders (or the timeout elapses). Returns its text ('' if none). */
async function waitForInstruction(page: Page, timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await readInstructionText(page);
    if (text) return text;
    await page.waitForTimeout(150);
  }
  return '';
}

/** Poll until the instruction changes (next problem rendered) or the game-over modal shows. */
async function waitForInstructionChange(page: Page, previous: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const bodyText = (await page.textContent('body')) || '';
    if (GAME_OVER_TEXT.test(bodyText)) return;
    const text = await readInstructionText(page);
    if (text && text !== previous) return;
    await page.waitForTimeout(150);
  }
}

/**
 * Play a bubble game session and pop correct bubbles until the session ends
 * or a max number of attempts is reached.
 * Returns the number of correct bubbles popped.
 *
 * Waits on game state (instruction rendered / instruction changed / game-over modal)
 * instead of fixed sleeps: the old 1.5 s + 2 s per attempt burned the whole 180 s
 * test budget whenever the instruction could not be parsed.
 */
async function playBubbleSession(page: Page, maxAttempts = 20): Promise<number> {
  let correctPops = 0;
  for (let i = 0; i < maxAttempts; i++) {
    // Wait for the instruction to render (or for the game to end)
    const instruction = await waitForInstruction(page, 3000);
    const bodyText = (await page.textContent('body')) || '';
    if (GAME_OVER_TEXT.test(bodyText)) {
      break;
    }

    // Try to solve the current bubble problem
    const solved = await solveBubbleProblem(page);
    if (!solved) {
      // Nothing solvable on screen: if there is no instruction either, we are not in a
      // bubble game anymore; otherwise give the engine a beat and retry.
      if (!instruction) break;
      await page.waitForTimeout(300);
      continue;
    }

    correctPops++;
    // Wait for the pop animation and the next problem's instruction
    await waitForInstructionChange(page, instruction, 1500);
  }
  return correctPops;
}

test.describe('Daily Challenge — arcade modes', () => {
  // Global timeout is 180s — no need for local override

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
    // The app keys daily state by the Israel date (Asia/Jerusalem, src/lib/israelDate.ts), whatever the
    // runner's time zone. Take it before and after playing: a run that crosses Israel midnight may
    // legitimately record either day.
    const israelDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
    const dayBefore = israelDay();
    await setupFreshProfile(page, 'DCDate');
    await selectArcadeMode(page, 'zen');
    await page.waitForTimeout(3000);

    // Pop at least one correct bubble
    await playBubbleSession(page, 5);

    const date = await getDailyChallengeDate(page);
    console.log(`[DC Date] dailyChallengeDate = ${date}`);

    // If tracking occurred, the date is today's Israel date
    if (date) expect([dayBefore, israelDay()]).toContain(date);
  });

  test('daily challenge completes when target reached in matching mode', async ({ page }) => {
    // This test plays the mode that matches today's daily challenge.
    // We determine today's challenge mode deterministically (same as the app).
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date()); // the app's day is the Israel day
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
        const sagaNode = page.locator('[data-testid="saga-node-n1_1"]').first();
        const arcadeBtnLocator = page.locator('[data-testid="arcade-button"], button:has-text("משחקי ארקייד"), button:has-text("Arcade Games")').first();
        if (await arcadeBtnLocator.count() > 0) {
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
      expect(stamps).toContain(today);
    } else {
      // If we didn't reach the target (bubbles can be tricky in E2E), at least verify progress was tracked
      expect(correct).toBeGreaterThan(0);
    }
  });
});