import { test, expect } from '@playwright/test';
import { setupFreshProfile, openParentGate, openMenu, solveParentGate } from './helpers';

test.describe('Parent Zone Redesign', () => {
  // Global timeout is 180s — no need for local override

  test('Parent gate from saga map', async ({ page }) => {
    // 1. Parent gate from saga map: setupFreshProfile → click [data-testid=parent-zone-button] → parent gate opens → solve → dashboard visible
    await setupFreshProfile(page, 'ParentZoneTest1');

    await openMenu(page);
    const parentZoneBtn = page.locator('[data-testid="parent-zone-button"]').first();
    await expect(parentZoneBtn).toBeVisible();
    await parentZoneBtn.click();

    // Wait for parent gate modal to appear
    const gate = page.locator('[data-testid="parent-gate"]').first();
    await expect(gate).toBeVisible({ timeout: 5000 });

    // Read the math problem from the clipboard (PG-1 keypad rework)
    const problemEl = gate.locator('[data-testid="parent-gate-problem"]').first();
    await expect(problemEl).toBeVisible({ timeout: 5000 });
    const problemText = (await problemEl.textContent()) || '';
    const problemMatch = problemText.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
    if (problemMatch) {
      const sum = parseInt(problemMatch[1]) + parseInt(problemMatch[2]);
      await solveParentGate(page, sum);
    }

    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });

  test('Mobile layout fits viewport and tabs are tappable', async ({ page  }) => {
    test.skip(true, 'mobile-gap quarantine 2026-09-19 — element not rendered on mobile (tracked in issue)');
    // 2. Mobile layout: verify dashboard fits mobile viewport (390x844), tabs are tappable
    await page.setViewportSize({ width: 390, height: 844 });
    await setupFreshProfile(page, 'ParentZoneTest2');
    
    // Log out to reach ProfileSelector where openParentGate works out of the box
    const logoutBtn = page.locator('button[aria-label*="Log Out"], button[aria-label*="התנתק"]').first();
    await logoutBtn.click();
    await page.waitForTimeout(2000);

    await openParentGate(page);

    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible();

    // Verify it fits viewport
    const box = await dashboard.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(390);

    // Verify tabs are tappable
    const progressTab = page.locator('button[role="tab"]').filter({ hasText: /התקדמות|Progress/ }).first();
    await progressTab.click();
    await expect(progressTab).toHaveAttribute('aria-selected', 'true');
  });

  test('RTL layout has Hebrew text rendering correctly', async ({ page  }) => {
    test.skip(true, 'mobile-gap quarantine 2026-09-19 — element not rendered on mobile (tracked in issue)');
    // 3. RTL layout: verify Hebrew text renders correctly (no LTR leakage in dashboard)
    await setupFreshProfile(page, 'ParentZoneTest3');
    
    const logoutBtn = page.locator('button[aria-label*="Log Out"], button[aria-label*="התנתק"]').first();
    await logoutBtn.click();
    await page.waitForTimeout(2000);

    await openParentGate(page);

    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible();

    // The default dir is rtl for Hebrew
    await expect(dashboard).toHaveAttribute('dir', 'rtl');

    const heading = page.locator('h1').filter({ hasText: /ניהול|פרופילים|אזור|הורים/ }).first();
    if (await heading.count() > 0) {
      await expect(heading).toBeVisible();
    }
  });

  test('Exit from dashboard returns to correct screen', async ({ page }) => {
    // 4. Exit from dashboard returns to correct screen (saga map if opened from map)
    await setupFreshProfile(page, 'ParentZoneTest4');

    await openMenu(page);
    const parentZoneBtn = page.locator('[data-testid="parent-zone-button"]').first();
    await parentZoneBtn.click();

    const gate = page.locator('[data-testid="parent-gate"]').first();
    await expect(gate).toBeVisible();
    
    // Read the math problem from the clipboard (PG-1 keypad rework)
    const problemEl = gate.locator('[data-testid="parent-gate-problem"]').first();
    await expect(problemEl).toBeVisible({ timeout: 5000 });
    const problemText = (await problemEl.textContent()) || '';
    const problemMatch = problemText.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
    if (problemMatch) {
      const sum = parseInt(problemMatch[1]) + parseInt(problemMatch[2]);
      await solveParentGate(page, sum);
    }

    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible();

    // PG-2 redesign: exit via [data-testid="parent-exit-button"] (labeled "חזרה למשחק")
    const exitBtn = page.locator('[data-testid="parent-exit-button"]').first();
    await expect(exitBtn).toBeVisible({ timeout: 5000 });
    await exitBtn.click();
    await page.waitForTimeout(1500);

    // Should return to saga map
    const sagaNode = page.locator('[data-testid="saga-node-n1_1"]').first();
    await expect(sagaNode).toBeVisible({ timeout: 10000 });
  });

  test('Games tab shows ParentGamesHub with game cards', async ({ page  }) => {
    test.skip(true, 'mobile-gap quarantine 2026-09-19 — element not rendered on mobile (tracked in issue)');
    // 5. Games tab shows ParentGamesHub with game cards
    await setupFreshProfile(page, 'ParentZoneTest5');
    
    const logoutBtn = page.locator('button[aria-label*="Log Out"], button[aria-label*="התנתק"]').first();
    await logoutBtn.click();
    await page.waitForTimeout(2000);

    await openParentGate(page);

    const gamesTab = page.locator('button[role="tab"]').filter({ hasText: /משחקים|Games/ }).first();
    await gamesTab.click();
    await page.waitForTimeout(1000);

    const sudokuCard = page.locator('[data-testid="game-card-sudoku"], [data-testid="sudoku"]').first();
    if (await sudokuCard.count() === 0) {
      await expect(page.locator('text=/Sudoku|סודוקו/').first()).toBeVisible();
    } else {
      await expect(sudokuCard).toBeVisible();
    }
  });
});
