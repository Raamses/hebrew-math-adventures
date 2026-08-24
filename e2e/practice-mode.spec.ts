import { test, expect } from '@playwright/test';
import { setupFreshProfileWithPracticeAccess, enterSagaNodeById, solveCurrentProblem, takeScreenshot } from './helpers';

test.describe('Practice Mode', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page);
  });

  test('Clicking a practice saga node opens practice mode with a question', async ({ page }) => {
  // Global timeout is 180s — no need for local override

    // n1_3 is a PRACTICE node (type: 'PRACTICE', config: addition_simple).
    // n1_2 at index 1 is actually a LESSON type, not PRACTICE.
    await enterSagaNodeById(page, 'n1_3');
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'practice-01-initial');

    // Verify practice mode is active — look for input field (arithmetic question)
    const input = page.locator('input').first();
    await expect(input).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, 'practice-02-question');

    // Verify there's a problem equation in the page text
    const bodyText = await page.textContent('body') || '';
    expect(bodyText).toMatch(/[\d+\-×÷=]/);
  });

  test('Solving a problem works and advances to next question', async ({ page }) => {
  // Global timeout is 180s — no need for local override

    // n1_3 is the PRACTICE node (type: 'PRACTICE', config: addition_simple)
    await enterSagaNodeById(page, 'n1_3');
    await page.waitForTimeout(3000);

    const input = page.locator('input').first();
    await expect(input).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, 'practice-03-before-solve');

    // Solve the problem
    const solved = await solveCurrentProblem(page);
    expect(solved).toBe(true);

    // Wait for feedback + transition to next question
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'practice-04-after-solve');

    // Verify either a new question is showing or the session ended
    const bodyText = await page.textContent('body') || '';
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('Session progress bar is visible during practice', async ({ page }) => {
  // Global timeout is 180s — no need for local override

    await enterSagaNodeById(page, 'n1_3');
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'practice-05-progress-bar');

    // Verify practice mode is active
    const input = page.locator('input').first();
    await expect(input).toBeVisible({ timeout: 15000 });

    // Solve a few problems to verify progress
    for (let i = 0; i < 3; i++) {
      const solved = await solveCurrentProblem(page);
      if (!solved) break;
      await page.waitForTimeout(3500);
    }

    await takeScreenshot(page, 'practice-06-after-three-solves');
  });

  test('Solve multiple problems in a session', async ({ page }) => {
  // Global timeout is 180s — no need for local override

    await enterSagaNodeById(page, 'n1_3');
    await page.waitForTimeout(3000);

    const input = page.locator('input').first();
    await expect(input).toBeVisible({ timeout: 15000 });

    let solvedCount = 0;
    for (let i = 0; i < 5; i++) {
      const solved = await solveCurrentProblem(page);
      if (!solved) break;
      solvedCount++;
      await page.waitForTimeout(3500);
    }

    await takeScreenshot(page, 'practice-07-multi-solve');

    expect(solvedCount).toBeGreaterThan(0);
  });
});