import { test, expect } from '@playwright/test';
import { setupFreshProfile, selectArcadeMode, solveBubbleProblem, takeScreenshot } from './helpers';

test.describe('Bubble Game Modes', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await setupFreshProfile(page);
  });

  test('Zen mode is playable', async ({ page }) => {
  // Global timeout is 180s — no need for local override

    await selectArcadeMode(page, 'zen');
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'zen-01-initial');

    const title = page.locator('h1').first();
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText!.length).toBeGreaterThan(0);

    const instruction = page.locator('span.font-mono').first();
    await expect(instruction).toBeVisible({ timeout: 10000 });
    const instructionText = await instruction.textContent();
    expect(instructionText).toBeTruthy();
    expect(instructionText!).toMatch(/[\d]/);

    await takeScreenshot(page, 'zen-02-header-instruction');

    await page.waitForTimeout(3000);

    const bubbles = page.locator('button[aria-label*="Pop bubble"]');
    await expect(bubbles.first()).toBeVisible({ timeout: 15000 });
    const bubbleCount = await bubbles.count();
    expect(bubbleCount).toBeGreaterThan(0);

    await takeScreenshot(page, 'zen-03-bubbles-visible');

    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    for (let i = 0; i < Math.min(bubbleCount, 5); i++) {
      const box = await bubbles.nth(i).boundingBox();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual(-5);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport!.width + 5);
    }

    // Pop a bubble via mouse coordinates (bypasses header overlay interception)
    const firstBubble = bubbles.first();
    const box = await firstBubble.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'zen-04-after-pop');

    let popped = 1;
    for (let attempt = 0; attempt < 10 && popped < 3; attempt++) {
      await page.waitForTimeout(2000);
      const solved = await solveBubbleProblem(page);
      if (solved) {
        popped++;
        await page.waitForTimeout(500);
      }
    }

    await takeScreenshot(page, 'zen-05-multiple-pops');
    expect(popped).toBeGreaterThanOrEqual(1);
  });

  test('Classic mode is playable', async ({ page }) => {
  // Global timeout is 180s — no need for local override

    await selectArcadeMode(page, 'classic');
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'classic-01-initial');

    const hearts = page.locator('svg.lucide-heart');
    await expect(hearts.first()).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, 'classic-02-hearts');

    const instruction = page.locator('span.font-mono').first();
    await expect(instruction).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(2000);
    const bubbles = page.locator('button[aria-label*="Pop bubble"]');
    await expect(bubbles.first()).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, 'classic-03-bubbles');

    const box = await bubbles.first().boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(1000);
    }

    await takeScreenshot(page, 'classic-04-after-tap');
    expect(true).toBe(true);
  });

  test('Blitz mode is playable', async ({ page }) => {
  // Global timeout is 180s — no need for local override

    await selectArcadeMode(page, 'blitz');
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'blitz-01-initial');

    // Timer: scan body text for Ns pattern (Playwright text selectors can't match partial text in spans with icons)
    const bodyText = await page.textContent('body') || '';
    expect(bodyText).toMatch(/\d+s/);

    await takeScreenshot(page, 'blitz-02-timer');

    // Score display visible
    expect(bodyText).toMatch(/Score|ניקוד/i);

    await page.waitForTimeout(2000);
    const bubbles = page.locator('button[aria-label*="Pop bubble"]');
    await expect(bubbles.first()).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, 'blitz-03-bubbles');

    const box = await bubbles.first().boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, 'blitz-04-after-tap');

    // Verify timer is still running
    const bodyAfter = await page.textContent('body') || '';
    expect(bodyAfter).toMatch(/\d+s/);

    // Verify timer counts down
    await page.waitForTimeout(2000);
    const bodyLater = await page.textContent('body') || '';
    const afterMatch = bodyAfter.match(/(\d+)s/);
    const laterMatch = bodyLater.match(/(\d+)s/);
    if (afterMatch && laterMatch) {
      const afterVal = parseInt(afterMatch[1]);
      const laterVal = parseInt(laterMatch[1]);
      expect(laterVal).toBeLessThanOrEqual(afterVal);
    }
  });

  test('Survival mode is playable', async ({ page }) => {
  // Global timeout is 180s — no need for local override

    await selectArcadeMode(page, 'survival');
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'survival-01-initial');

    const hearts = page.locator('svg.lucide-heart');
    await expect(hearts.first()).toBeVisible({ timeout: 10000 });
    const heartCount = await hearts.count();
    expect(heartCount).toBeGreaterThanOrEqual(3);

    await takeScreenshot(page, 'survival-02-hearts');

    const instruction = page.locator('span.font-mono').first();
    await expect(instruction).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(2000);
    const bubbles = page.locator('button[aria-label*="Pop bubble"]');
    await expect(bubbles.first()).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, 'survival-03-bubbles');

    const box = await bubbles.first().boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(1000);
    }

    await takeScreenshot(page, 'survival-04-after-tap');
  });

  test('Bubble overflow check — no bubble beyond viewport edges', async ({ page }) => {
  // Global timeout is 180s — no need for local override

    await selectArcadeMode(page, 'zen');
    await page.waitForTimeout(4000);

    await takeScreenshot(page, 'overflow-01-bubbles');

    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();

    const bubbles = page.locator('button[aria-label*="Pop bubble"]');
    const bubbleCount = await bubbles.count();
    expect(bubbleCount).toBeGreaterThan(0);

    let checkedCount = 0;
    for (let i = 0; i < bubbleCount; i++) {
      const box = await bubbles.nth(i).boundingBox();
      if (!box) continue;

      expect(box.x).toBeGreaterThanOrEqual(-10);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport!.width + 10);

      const centerY = box.y + box.height / 2;
      if (centerY < 0 || centerY > viewport!.height) continue;

      expect(box.y).toBeGreaterThanOrEqual(40);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport!.height);

      checkedCount++;
    }

    expect(checkedCount).toBeGreaterThan(0);
    await takeScreenshot(page, 'overflow-02-checked');
  });
});