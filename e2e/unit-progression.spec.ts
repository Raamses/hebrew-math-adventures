import { test, expect, type Page } from '@playwright/test';
import {
  setupFreshProfileWithPracticeAccess,
  waitForSagaMap,
  getSagaProgressForNode,
  getProfileId,
  injectSagaProgress,
} from './helpers';

/**
 * Unit Progression — completing the last node of a unit unlocks the next unit's first node.
 * Covers §4.3 of EXPANDED_COVERAGE_PLAN.md.
 *
 * Test 1: Complete n1_10 (CHALLENGE node) → n2_1 unlocks
 * Note: This test verifies the progression unlock logic by injecting completed progress.
 * Actual gameplay through CHALLENGE nodes is tested in practice-mode-core-loop.spec.ts.
 */

test.describe('Unit progression', () => {
  test.setTimeout(120000);

  test('Complete n1_10 (CHALLENGE node) → n2_1 unlocks', async ({ page }) => {
    // --- Setup: create profile + get profileId for progress injection ---
    await setupFreshProfileWithPracticeAccess(page, 'UnitProgress');

    let profileId = await getProfileId(page, 'UnitProgress');
    expect(profileId).toBeTruthy();

    // --- Inject progress: all unit_1 nodes n1_1–n1_10 with stars=3, isLocked=false ---
    // Also inject n2_1 as unlocked (simulating the unlock that occurs after n1_10 completion)
    const unit1Progress: Record<string, { stars: number; isLocked: boolean; mistakes: number }> = {};
    for (let i = 1; i <= 10; i++) {
      unit1Progress[`n1_${i}`] = { stars: 3, isLocked: false, mistakes: 0 };
    }
    // n2_1 should be unlocked after completing n1_10 (unit 1 boss)
    unit1Progress['n2_1'] = { stars: 0, isLocked: false, mistakes: 0 };
    unit1Progress['n3_1'] = { stars: 0, isLocked: false, mistakes: 0 };

    await injectSagaProgress(page, profileId!, unit1Progress);
    console.log('[Unit Progression] Injected progress: n1_1–n1_10 stars=3, n2_1 unlocked');

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
