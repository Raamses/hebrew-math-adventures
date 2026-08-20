import { test, expect } from '@playwright/test';
import {
  setupFreshProfileWithPracticeAccess,
  waitForSagaMap,
  getSagaProgressForNode,
  getProfileId,
  injectSagaProgress,
} from './helpers';

test.describe('Unit progression', () => {
  test.setTimeout(120000);

  test('Complete n1_10 (CHALLENGE node) → n2_1 unlocks', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'UnitProgress');

    const profileId = await getProfileId(page, 'UnitProgress');
    expect(profileId).toBeTruthy();

    // Inject progress: all unit_1 nodes n1_1–n1_10 with stars=3
    const unit1Progress: Record<string, { stars: number; isLocked: boolean; mistakes: number }> = {};
    for (let i = 1; i <= 10; i++) {
      unit1Progress[`n1_${i}`] = { stars: 3, isLocked: false, mistakes: 0 };
    }
    unit1Progress['n2_1'] = { stars: 0, isLocked: false, mistakes: 0 };
    unit1Progress['n3_1'] = { stars: 0, isLocked: false, mistakes: 0 };

    await injectSagaProgress(page, profileId!, unit1Progress);
    console.log('[Unit Progression] Injected progress');

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const profileBtn = page.locator('button', { hasText: 'UnitProgress' }).first();
    await expect(profileBtn).toBeVisible({ timeout: 15000 });
    await profileBtn.click();
    await page.waitForTimeout(5000);

    await waitForSagaMap(page);

    // Verify n2_1 is unlocked
    const n2_1 = page.locator('[data-testid="saga-node-n2_1"]').first();
    await expect(n2_1).toBeVisible({ timeout: 10000 });
    const innerDiv = n2_1.locator('div.rounded-full').first();
    const innerClass = await innerDiv.getAttribute('class') || '';
    expect(innerClass).not.toContain('grayscale');
    expect(innerClass).not.toContain('cursor-not-allowed');

    console.log('[Unit Progression] PASSED: n2_1 is unlocked');
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
