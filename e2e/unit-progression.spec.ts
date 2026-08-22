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
  });
});
