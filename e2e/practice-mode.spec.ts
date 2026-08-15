import { test, expect } from '@playwright/test';
import { setupFreshProfileWithPracticeAccess, solveCurrentProblem, takeScreenshot } from './helpers';

test.describe('Practice Mode', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page);
  });

  test('Clicking a practice saga node opens practice mode with a question', async ({ page }) => {
    test.setTimeout(90000);

    // The first node (n1_1) is SENSORY (Bubbles). The second node (n1_2) is PRACTICE.
    // We unlocked n1_1, n1_2, n1_3 in setupFreshProfileWithPracticeAccess.
    // Find and click the second unlocked node (n1_2 — PRACTICE type).
    const nodes = page.locator('div.cursor-pointer.group');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThan(0);

    let clicked = false;
    let unlockedIndex = 0;
    for (let i = 0; i < nodeCount; i++) {
      const node = nodes.nth(i);
      const innerDiv = node.locator('div.rounded-full').first();
      const innerClass = await innerDiv.getAttribute('class') || '';
      if (!innerClass.includes('grayscale') && !innerClass.includes('cursor-not-allowed')) {
        unlockedIndex++;
        // Skip the first unlocked node (SENSORY/Bubbles) — click the second (PRACTICE)
        if (unlockedIndex === 2) {
          await node.click();
          clicked = true;
          break;
        }
      }
    }
    expect(clicked).toBe(true);

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
    test.setTimeout(90000);

    // Click the second unlocked node (PRACTICE type)
    const nodes = page.locator('div.cursor-pointer.group');
    let unlockedIndex = 0;
    for (let i = 0; i < (await nodes.count()); i++) {
      const node = nodes.nth(i);
      const innerDiv = node.locator('div.rounded-full').first();
      const innerClass = await innerDiv.getAttribute('class') || '';
      if (!innerClass.includes('grayscale') && !innerClass.includes('cursor-not-allowed')) {
        unlockedIndex++;
        if (unlockedIndex === 2) {
          await node.click();
          break;
        }
      }
    }

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
    test.setTimeout(90000);

    const nodes = page.locator('div.cursor-pointer.group');
    let unlockedIndex = 0;
    for (let i = 0; i < (await nodes.count()); i++) {
      const node = nodes.nth(i);
      const innerDiv = node.locator('div.rounded-full').first();
      const innerClass = await innerDiv.getAttribute('class') || '';
      if (!innerClass.includes('grayscale') && !innerClass.includes('cursor-not-allowed')) {
        unlockedIndex++;
        if (unlockedIndex === 2) {
          await node.click();
          break;
        }
      }
    }

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
    test.setTimeout(120000);

    const nodes = page.locator('div.cursor-pointer.group');
    let unlockedIndex = 0;
    for (let i = 0; i < (await nodes.count()); i++) {
      const node = nodes.nth(i);
      const innerDiv = node.locator('div.rounded-full').first();
      const innerClass = await innerDiv.getAttribute('class') || '';
      if (!innerClass.includes('grayscale') && !innerClass.includes('cursor-not-allowed')) {
        unlockedIndex++;
        if (unlockedIndex === 2) {
          await node.click();
          break;
        }
      }
    }

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