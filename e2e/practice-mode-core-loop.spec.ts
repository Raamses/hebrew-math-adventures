import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfileWithPracticeAccess, enterSagaNode, solveCurrentProblem } from './helpers';

/**
 * Practice Mode — Core Loop
 *
 * Covers the fundamental saga-map learning loop that every other feature sits on top of:
 * unlock a PRACTICE node -> answer questions -> session completes -> stars are awarded ->
 * progress persists in localStorage so the node stays unlocked/starred on reload.
 *
 * This flow was previously only exercised indirectly (via LESSON node + ModeSelectorOverlay
 * in helpers.ts), never asserted as a standalone PRACTICE-node completion path.
 */

const SESSION_LENGTH = 10;

interface StoredProfile {
  id: string;
  name: string;
  age?: number;
}

async function getProfileId(page: Page, name: string): Promise<string | null> {
  return await page.evaluate((profileName) => {
    const raw = localStorage.getItem('hebrew-math-profiles');
    if (!raw) return null;
    try {
      const profiles = Object.values(JSON.parse(raw)) as StoredProfile[];
      const profile = profiles.find(p => p.name === profileName);
      return profile ? profile.id : null;
    } catch {
      return null;
    }
  }, name);
}

async function getSagaProgress(page: Page, profileId: string): Promise<Record<string, { stars: number; isLocked: boolean }>> {
  return await page.evaluate((id) => {
    const raw = localStorage.getItem(`hebrew_game_saga_progress_v1_${id}`);
    return raw ? JSON.parse(raw) : {};
  }, profileId);
}

test.describe('Practice Mode — core loop', () => {
  // Global timeout is 180s — no need for local override

  test('completing a PRACTICE node awards stars and persists progress', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'PracticeCore');

    // n1_3 is the 3rd node (index 2) — PRACTICE type, addition_simple config (max 5).
    // Chosen over n1_2 (series_simple) because solveCurrentProblem's series-answer
    // heuristic doesn't reliably handle a missing digit at the start of the sequence,
    // while its arithmetic-parsing path (used here) is well exercised elsewhere.
    await enterSagaNode(page, 2);
    await page.waitForTimeout(1500);

    // Answer questions until the session completes (SessionSummary appears) or we
    // exhaust a generous attempt budget (some answers may be wrong/unparseable).
    let solvedCount = 0;
    for (let i = 0; i < SESSION_LENGTH + 10; i++) {
      const bodyText = await page.textContent('body') || '';
      if (await page.locator('[data-testid="session-summary"]').first().isVisible().catch(() => false)) {
        break;
      }
      const solved = await solveCurrentProblem(page);
      if (solved) {
        solvedCount++;
        await page.waitForTimeout(2500); // correctDelay (2000ms) + buffer for next problem render
      } else {
        await page.waitForTimeout(500);
      }
    }

    console.log(`[Practice Core] solved ${solvedCount} problems`);

    // Session summary should appear once 10 correct answers are recorded.
    const summaryVisible = await page.locator('[data-testid="session-summary"]').first().isVisible().catch(() => false);
    expect(summaryVisible).toBe(true);

    // completeNode() fires as soon as the session hits SESSION_LENGTH correct answers
    // (see PracticeMode's onCorrectComplete), so progress should already be persisted.
    const profileId = await getProfileId(page, 'PracticeCore');
    expect(profileId).toBeTruthy();

    const progress = await getSagaProgress(page, profileId!);
    console.log('[Practice Core] saga progress:', JSON.stringify(progress));

    // n1_3 should now have stars > 0 and be unlocked.
    expect(progress.n1_3).toBeTruthy();
    expect(progress.n1_3.stars).toBeGreaterThan(0);
    expect(progress.n1_3.isLocked).toBe(false);
  });
});
