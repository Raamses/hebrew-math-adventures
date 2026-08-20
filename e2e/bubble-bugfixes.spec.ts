import { test, expect } from '@playwright/test';
import { setupFreshProfile, selectArcadeMode, solveBubbleProblem } from './helpers';

test.describe('Bubble Game Bugfixes', () => {
  test.setTimeout(120000);

  test('Pop N instruction i18n is in Hebrew', async ({ page }) => {
    // 1. Pop N i18n: setupFreshProfile → select classic mode → wait for 'Pop N' or 'פוצץ N' instruction → verify it's in Hebrew, not English. Read body text for the instruction.
    await setupFreshProfile(page, 'BugfixTest1');
    await selectArcadeMode(page, 'classic');

    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body') || '';
    
    // Check for Hebrew "פוצץ" and absence of English "Pop"
    expect(bodyText).toMatch(/פוצץ/);
    expect(bodyText).not.toMatch(/Pop \d+/i);
  });

  test('Boss bubble is killable in survival mode', async ({ page }) => {
    // 2. Boss bubble killable: setupFreshProfile → select survival mode → play until boss appears (use solveBubbleProblem helper) → verify boss bubble equation renders → solve correctly → verify boss is destroyed (no stuck equation)
    await setupFreshProfile(page, 'BugfixTest2');
    await selectArcadeMode(page, 'survival');
    await page.waitForTimeout(3000);

    let bossAppeared = false;
    let iterations = 0;
    while (!bossAppeared && iterations < 15) {
      const bodyText = await page.textContent('body') || '';
      // Wait for boss bubble. Usually boss bubbles might have shield icons or text like "🛡️"
      if (bodyText.includes('🛡️')) {
        bossAppeared = true;
        break;
      }
      const solved = await solveBubbleProblem(page);
      if (!solved) {
        await page.waitForTimeout(2000);
      }
      iterations++;
    }

    expect(bossAppeared).toBe(true);

    // Solve correctly
    await solveBubbleProblem(page);
    await page.waitForTimeout(2000);

    // Verify boss is destroyed (no stuck equation/shield)
    const newBodyText = await page.textContent('body') || '';
    expect(newBodyText).not.includes('🛡️');
  });

  test('Memoized SensoryProblem prevents crashes over time in Zen mode', async ({ page }) => {
    // 3. Memoized SensoryProblem: play a zen game for 30s → verify no crash, equations render correctly throughout
    await setupFreshProfile(page, 'BugfixTest3');
    await selectArcadeMode(page, 'zen');
    
    await page.waitForTimeout(3000);

    for (let i = 0; i < 6; i++) {
      const bubbles = page.locator('button[aria-label*="Pop bubble"]');
      await expect(bubbles.first()).toBeVisible({ timeout: 15000 });
      
      const bodyText = await page.textContent('body') || '';
      expect(bodyText.length).toBeGreaterThan(0);
      
      // Let it play / idle for 5s intervals (total ~30s)
      await page.waitForTimeout(5000);
      await solveBubbleProblem(page); // Try to pop one to keep it active
    }

    // If it hasn't crashed, this will still be visible
    const bubbles = page.locator('button[aria-label*="Pop bubble"]');
    await expect(bubbles.first()).toBeVisible({ timeout: 10000 });
  });
});
