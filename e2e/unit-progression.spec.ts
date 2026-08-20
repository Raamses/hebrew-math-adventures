import { test, expect, type Page } from '@playwright/test';
import {
  setupFreshProfileWithPracticeAccess,
  solveCurrentProblem,
  waitForSagaMap,
  getSagaProgressForNode,
  getProfileId,
  injectSagaProgress,
} from './helpers';

/**
 * Unit Progression — completing the last node of a unit unlocks the next unit's first node.
 * Covers §4.3 of EXPANDED_COVERAGE_PLAN.md.
 *
 * Test 1: Complete n1_10 (CHALLENGE → PracticeMode session) → n2_1 unlocks
 * CHALLENGE nodes have mixed problems: arithmetic, series, comparison, word problems.
 */

const SESSION_LENGTH = 10;

/**
 * Extract the correct answer from React's internal fiber tree.
 * The MathCard component receives a `problem` prop; we traverse the fiber tree
 * to find it and return the expected answer.
 */
async function getAnswerFromReact(page: Page): Promise<number | null> {
  return await page.evaluate(() => {
    // Find the MathCard container
    const card = document.querySelector('.max-w-md.bg-white.rounded-3xl') as HTMLElement;
    if (!card) return null;

    // Get the React fiber key (varies by React version)
    const fiberKey = Object.keys(card).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    if (!fiberKey) return null;

    // Walk up the fiber tree to find the component that has the `problem` prop
    let fiber = (card as any)[fiberKey];
    let depth = 0;
    while (fiber && depth < 30) {
      const props = fiber.memoizedProps;
      if (props && props.problem && props.problem.answer !== undefined) {
        const answer = props.problem.answer;
        // For comparison problems, answer is a string like ">", "<", "="
        // For arithmetic/series/word problems, answer is a number
        if (typeof answer === 'number') return answer;
        if (typeof answer === 'string') return answer as any; // comparison symbol
      }
      fiber = fiber.return;
      depth++;
    }
    return null;
  });
}

/**
 * Check if the current problem is a comparison problem (has <, =, > buttons).
 */
async function isComparisonProblem(page: Page): Promise<boolean> {
  const compareButtons = page.locator('button').filter({ hasText: /^[<=>]$/ });
  const count = await compareButtons.count();
  return count >= 3;
}

/**
 * Solve the current practice problem by extracting the answer from React state.
 * Falls back to text-based parsing if React fiber extraction fails.
 */
async function solveProblem(page: Page): Promise<boolean> {
  // Check if session is over
  const bodyText = await page.textContent('body') || '';
  if (bodyText.match(/session complete|Play Again|שחק שוב|Well done|כל הכבוד|סיכום/i)) {
    return false;
  }

  // Check if card is visible
  const mathCard = page.locator('.max-w-md.bg-white.rounded-3xl').first();
  const cardVisible = await mathCard.isVisible().catch(() => false);
  if (!cardVisible) return false;

  // --- Comparison problem? ---
  if (await isComparisonProblem(page)) {
    const answer = await getAnswerFromReact(page);
    if (answer !== null) {
      const symbol = String(answer);
      const compareButtons = page.locator('button').filter({ hasText: symbol });
      if (await compareButtons.count() > 0) {
        await compareButtons.first().click({ force: true });
        return true;
      }
    }
    // Fallback: parse from card text
    const cardText = await mathCard.textContent() || '';
    const numbers = cardText.match(/\d+/g) || [];
    if (numbers.length >= 2) {
      const num1 = parseInt(numbers[0]!);
      const num2 = parseInt(numbers[1]!);
      let symbol: string;
      if (num1 > num2) symbol = '>';
      else if (num1 < num2) symbol = '<';
      else symbol = '=';
      const compareButtons = page.locator('button').filter({ hasText: symbol });
      if (await compareButtons.count() > 0) {
        await compareButtons.first().click({ force: true });
        return true;
      }
    }
    return false;
  }

  // --- Numeric answer problem (arithmetic, series, word) ---
  const input = page.locator('[data-testid="math-input"]').first();
  if (await input.count() === 0) return false;

  const answer = await getAnswerFromReact(page);
  if (answer !== null && typeof answer === 'number') {
    await input.click();
    await input.fill(String(answer));
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    return true;
  }

  // Fallback: try the shared solveCurrentProblem helper
  const solved = await solveCurrentProblem(page);
  return solved;
}

test.describe('Unit progression', () => {
  // Global timeout is 180s — no need for local override

  test('Complete n1_10 (PracticeMode session) → n2_1 unlocks', async ({ page }) => {
    // --- Setup: create profile + get profileId for progress injection ---
    await setupFreshProfileWithPracticeAccess(page, 'UnitProgress');

    let profileId = await getProfileId(page, 'UnitProgress');
    expect(profileId).toBeTruthy();

    // --- Inject progress: all unit_1 nodes n1_1–n1_9 with stars=3, isLocked=false ---
    // n1_10 with stars=0, isLocked=false (unlocked but not yet completed)
    const unit1Progress: Record<string, { stars: number; isLocked: boolean; mistakes: number }> = {};
    for (let i = 1; i <= 9; i++) {
      unit1Progress[`n1_${i}`] = { stars: 3, isLocked: false, mistakes: 0 };
    }
    unit1Progress['n1_10'] = { stars: 0, isLocked: false, mistakes: 0 };
    unit1Progress['n3_1'] = { stars: 0, isLocked: false, mistakes: 0 };

    await injectSagaProgress(page, profileId!, unit1Progress);
    console.log('[Unit Progression] Injected progress: n1_1–n1_9 stars=3, n1_10 stars=0 unlocked');

    // Reload to pick up the injected progress
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // After reload, click the profile to get back to the saga map
    const profileBtn = page.locator('button', { hasText: 'UnitProgress' }).first();
    await expect(profileBtn).toBeVisible({ timeout: 10000 });
    await profileBtn.click();

    // Wait for mascot greeting to auto-dismiss
    await page.waitForTimeout(5000);

    await waitForSagaMap(page);

    // --- Enter n1_10 (CHALLENGE node — routes to PracticeMode with mixed problems) ---
    const n1_10Selector = '[data-testid="saga-node-n1_10"]';
    const n1_10Node = page.locator(n1_10Selector).first();
    await expect(n1_10Node).toBeVisible({ timeout: 10000 });
    await n1_10Node.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Verify it's not locked
    const innerDiv = n1_10Node.locator('div.rounded-full').first();
    const innerClass = await innerDiv.getAttribute('class') || '';
    if (innerClass.includes('grayscale') || innerClass.includes('cursor-not-allowed')) {
      throw new Error('Saga node n1_10 is locked');
    }

    // Click via DOM to bypass framer-motion animation
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement;
      if (!el) throw new Error(`Element not found: ${sel}`);
      el.click();
    }, n1_10Selector);
    await page.waitForTimeout(3000);

    // --- Complete the PracticeMode session (10 correct answers) ---
    let solvedCount = 0;
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      // Check if session summary appeared (session complete)
      const summaryVisible = await page.locator('[data-testid="session-summary"]').first()
        .isVisible().catch(() => false);
      if (summaryVisible) {
        console.log(`[Unit Progression] Session summary appeared after ${solvedCount} correct answers`);
        break;
      }

      // Check if we're back on saga map
      const arcadeVisible = await page.locator('[data-testid="saga-node-n1_1"]').first()
        .isVisible().catch(() => false);
      if (arcadeVisible) {
        console.log(`[Unit Progression] Returned to saga map after ${solvedCount} correct answers`);
        break;
      }

      // Wait for processing to complete (submit button is disabled during isProcessing)
      const submitBtn = page.locator('[data-testid="math-submit"]').first();
      const submitExists = await submitBtn.count() > 0;
      if (submitExists) {
        const submitDisabled = await submitBtn.isDisabled().catch(() => true);
        if (submitDisabled) {
          await page.waitForTimeout(500);
          continue;
        }
      }

      const solved = await solveProblem(page);
      if (solved) {
        solvedCount++;
        console.log(`[Unit Progression] Solved problem #${solvedCount}`);
        // Wait for correctDelay (2000ms) + buffer for next problem to render
        await page.waitForTimeout(3000);
      } else {
        await page.waitForTimeout(1000);
      }
    }

    console.log(`[Unit Progression] Total solved: ${solvedCount}`);

    // --- If session summary is showing, click "Home" to return to saga map ---
    const summaryVisible = await page.locator('[data-testid="session-summary"]').first()
      .isVisible().catch(() => false);
    if (summaryVisible) {
      const homeBtn = page.locator('[data-testid="summary-home"]').first();
      if (await homeBtn.isVisible().catch(() => false)) {
        await homeBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    await waitForSagaMap(page);

    // --- Assert localStorage: n2_1.isLocked === false ---
    profileId = await getProfileId(page, 'UnitProgress');
    expect(profileId).toBeTruthy();

    const n1_10Progress = await getSagaProgressForNode(page, profileId!, 'n1_10');
    console.log('[Unit Progression] n1_10 progress:', JSON.stringify(n1_10Progress));
    expect(n1_10Progress).toBeTruthy();
    expect(n1_10Progress!.stars).toBeGreaterThan(0);
    expect(n1_10Progress!.isLocked).toBe(false);

    const n2_1Progress = await getSagaProgressForNode(page, profileId!, 'n2_1');
    console.log('[Unit Progression] n2_1 progress:', JSON.stringify(n2_1Progress));
    expect(n2_1Progress).toBeTruthy();
    expect(n2_1Progress!.isLocked).toBe(false);

    // --- Verify on saga map: n2_1 node is visible and not locked ---
    const n2_1Node = page.locator('[data-testid="saga-node-n2_1"]').first();
    await expect(n2_1Node).toBeVisible({ timeout: 10000 });

    await n2_1Node.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const n2_1InnerDiv = n2_1Node.locator('div.rounded-full').first();
    const n2_1InnerClass = await n2_1InnerDiv.getAttribute('class') || '';
    console.log('[Unit Progression] n2_1 inner class:', n2_1InnerClass);
    expect(n2_1InnerClass).not.toContain('grayscale');
    expect(n2_1InnerClass).not.toContain('cursor-not-allowed');

    await expect(n2_1Node).toBeEnabled();
  });
});
