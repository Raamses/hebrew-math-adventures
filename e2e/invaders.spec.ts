import { test, expect } from '@playwright/test';
import { setupFreshProfileWithPracticeAccess, selectPracticeMode, takeScreenshot } from './helpers';

test.describe('Math Invaders', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page);
  });

  test('Invaders loads with ship, lives, and score', async ({ page }) => {
    test.setTimeout(90000);

    // Navigate to practice mode and select Math Invaders
    await selectPracticeMode(page, 'INVADERS');
    await page.waitForTimeout(3000);

    // Verify the ship emoji 🚀 is visible at the bottom
    const ship = page.locator('text=🚀');
    await expect(ship.first()).toBeVisible({ timeout: 10000 });

    // Verify lives — 3 Heart icons from lucide-react
    const hearts = page.locator('svg.lucide-heart');
    await expect(hearts.first()).toBeVisible({ timeout: 10000 });
    const heartCount = await hearts.count();
    expect(heartCount).toBeGreaterThanOrEqual(3);

    // Verify score — span with class "tabular-nums" inside a div with Trophy icon
    const scoreNum = page.locator('.tabular-nums');
    await expect(scoreNum.first()).toBeVisible({ timeout: 5000 });

    // Verify title — h2 with 🚀 emoji
    const title = page.locator('h2').filter({ hasText: /🚀/ });
    await expect(title.first()).toBeVisible({ timeout: 5000 });

    // Verify level indicator — Star icon is used for level display
    const levelIcon = page.locator('svg.lucide-star');
    await expect(levelIcon.first()).toBeVisible({ timeout: 5000 });
  });

  test('Answer bubbles appear and can be tapped', async ({ page }) => {
    test.setTimeout(90000);

    await selectPracticeMode(page, 'INVADERS');
    await page.waitForTimeout(3000);

    // Wait for equation bubbles to spawn — they have class containing "from-cyan-500" or "from-purple-600"
    const equationBubbles = page.locator('[class*="from-cyan-500"], [class*="from-purple-600"]');
    await expect(equationBubbles.first()).toBeVisible({ timeout: 15000 });

    // Wait for answer bubbles — they are <button> elements with class containing "from-emerald-500"
    const answerBubbles = page.locator('button[class*="from-emerald-500"]');
    await expect(answerBubbles.first()).toBeVisible({ timeout: 15000 });

    const ansCount = await answerBubbles.count();
    expect(ansCount).toBeGreaterThan(0);

    // Click the first answer bubble
    const firstAnswer = answerBubbles.first();
    const box = await firstAnswer.boundingBox();
    expect(box).toBeTruthy();

    // Use mouse.click with coordinates to avoid header overlay intercepting pointer events
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1000);

    // After tapping, the game should still be running (ship still visible)
    const shipStillVisible = page.locator('text=🚀');
    await expect(shipStillVisible.first()).toBeVisible({ timeout: 5000 });
  });

  test('Invaders equation text is LTR even in Hebrew RTL mode', async ({ page }) => {
    test.setTimeout(90000);

    await selectPracticeMode(page, 'INVADERS');
    await page.waitForTimeout(3000);

    // Wait for equations to appear — they have <span dir="ltr"> inside
    const equations = page.locator('[dir="ltr"]');
    await expect(equations.first()).toBeVisible({ timeout: 15000 });

    const eqCount = await equations.count();
    expect(eqCount).toBeGreaterThan(0);

    // Verify the equation text contains math operators
    const firstEq = equations.first();
    const eqText = await firstEq.textContent();
    expect(eqText).toBeTruthy();
    // Should contain digits and possibly math operators
    expect(eqText!).toMatch(/[\d+\-×÷=]/);
  });
});