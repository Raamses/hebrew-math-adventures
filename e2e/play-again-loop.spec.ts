import { test, expect } from '@playwright/test';
import {
  setupFreshProfileWithPracticeAccess,
  enterSagaNodeById,
  solveCurrentProblem,
  getProfileId,
  getSagaProgressForNode,
  waitForSagaMap,
} from './helpers';

/**
 * Play Again Loop — Phase 3b (§4.11 of EXPANDED_COVERAGE_PLAN.md)
 *
 * Covers G20: Multiple consecutive sessions via "Play Again".
 *
 * Test 1: Complete session → Play Again → complete second session → stars persist
 *
 * Flow:
 *   setupFreshProfileWithPracticeAccess → enterSagaNodeById(page, 'n1_3') →
 *   Answer 10 correct → SessionSummary appears →
 *   Click data-testid="summary-play-again" → new session starts →
 *   Answer 10 correct again → SessionSummary appears →
 *   Assert localStorage: n1_3.stars === 3 (best-of, not overwritten by worse) →
 *   Click data-testid="summary-home" → return to saga map
 *
 * The "Play Again" button restarts the session immediately without returning
 * to the saga map. Stars from the first session (3★ for a perfect run) should
 * persist after the second session — the star system is best-of, so a second
 * perfect run should NOT reduce stars.
 */

const SESSION_LENGTH = 10;
const MAX_ATTEMPTS = SESSION_LENGTH + 10; // generous buffer for parse failures

test.describe('Play Again Loop', () => {
  test.setTimeout(120000);

  test('Complete session → Play Again → complete second session → stars persist', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'PlayAgain');

    // Enter n1_3 (PRACTICE type, addition_simple config).
    await enterSagaNodeById(page, 'n1_3');
    await page.waitForTimeout(1500);

    // ─── First session: answer 10 correct ───
    let solvedCount = 0;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const summaryVisible = await page
        .locator('[data-testid="session-summary"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (summaryVisible) break;

      const solved = await solveCurrentProblem(page);
      if (solved) {
        solvedCount++;
        await page.waitForTimeout(2500); // correctDelay (2000ms) + buffer
      } else {
        await page.waitForTimeout(500);
      }
    }

    console.log(`[Play Again] First session: solved ${solvedCount} problems`);

    // Assert SessionSummary is visible
    const summary = page.locator('[data-testid="session-summary"]').first();
    await expect(summary).toBeVisible({ timeout: 5000 });

    // Verify stars show 3 (perfect run — 0 mistakes)
    const starsContainer = page.locator('[data-testid="summary-stars"]').first();
    await expect(starsContainer).toBeVisible({ timeout: 5000 });
    const starsText = await starsContainer.textContent();
    console.log('[Play Again] First session stars text:', starsText);
    expect(starsText).toContain('3');

    // ─── Click "Play Again" → new session starts ───
    const playAgainBtn = page.locator('[data-testid="summary-play-again"]').first();
    await expect(playAgainBtn).toBeVisible({ timeout: 5000 });
    await playAgainBtn.click();
    await page.waitForTimeout(2000);

    // Verify new session started — math-input should be visible, summary should NOT
    const mathInput = page.locator('[data-testid="math-input"]').first();
    await expect(mathInput).toBeVisible({ timeout: 10000 });

    const summaryStillVisible = await page
      .locator('[data-testid="session-summary"]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(summaryStillVisible).toBe(false);

    // ─── Second session: answer 10 correct again ───
    let solvedCount2 = 0;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const summaryVisible = await page
        .locator('[data-testid="session-summary"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (summaryVisible) break;

      const solved = await solveCurrentProblem(page);
      if (solved) {
        solvedCount2++;
        await page.waitForTimeout(2500);
      } else {
        await page.waitForTimeout(500);
      }
    }

    console.log(`[Play Again] Second session: solved ${solvedCount2} problems`);

    // Assert SessionSummary is visible again
    const summary2 = page.locator('[data-testid="session-summary"]').first();
    await expect(summary2).toBeVisible({ timeout: 5000 });

    // ─── Assert localStorage: n1_3.stars === 3 (best-of, not overwritten) ───
    const profileId = await getProfileId(page, 'PlayAgain');
    expect(profileId).toBeTruthy();

    const progress = await getSagaProgressForNode(page, profileId!, 'n1_3');
    console.log('[Play Again] Saga progress for n1_3:', JSON.stringify(progress));
    expect(progress).toBeTruthy();
    expect(progress!.stars).toBe(3);
    expect(progress!.isLocked).toBe(false);

    // ─── Click "Home" → return to saga map ───
    const homeBtn = page.locator('[data-testid="summary-home"]').first();
    await expect(homeBtn).toBeVisible({ timeout: 5000 });
    await homeBtn.click();
    await page.waitForTimeout(2000);

    // Verify we're back on the saga map
    await waitForSagaMap(page);

    console.log('[Play Again] Test 1 PASSED: Play Again loop works, stars persist at 3');
  });
});
