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

  test('Mobile layout fits viewport and tabs are tappable', async ({ page }) => {
    // 2. Mobile layout: verify dashboard fits mobile viewport (390x844), tabs are tappable
    await page.setViewportSize({ width: 390, height: 844 });
    await setupFreshProfile(page, 'ParentZoneTest2');
    
    // The logout control lives inside the saga-map hamburger menu on mobile —
    // it is not rendered as a top-level button. Open the hardened menu first so
    // the logout button is reachable, then continue from the ProfileSelector.
    await openMenu(page);
    const logoutBtn = page.locator('button[aria-label*="Log Out"], button[aria-label*="התנתק"]').first();
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click();
    await page.waitForTimeout(2000);

    await openParentGate(page);

    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible();

    // Verify it fits viewport
    const box = await dashboard.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(390);

    // Verify tabs are tappable — real tab ids from ParentDashboard.tsx PARENT_TABS
    for (const tabId of ['postcard', 'goals', 'games', 'settings']) {
      const tab = page.locator(`[data-testid="tab-${tabId}"]`).first();
      await expect(tab).toBeVisible({ timeout: 5000 });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('RTL layout has Hebrew text rendering correctly', async ({ page }) => {
    // 3. RTL layout: verify Hebrew text renders correctly (no LTR leakage in dashboard)
    // ParentDashboard derives dir from the active i18n language
    // (src/components/parent/ParentDashboard.tsx) and the E2E browser boots with
    // an English navigator locale, so pin the app to Hebrew before boot.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('i18nextLng', 'he');
      } catch {
        // storage unavailable on this document — the navigator override still applies
      }
      Object.defineProperty(navigator, 'language', { get: () => 'he-IL', configurable: true });
      Object.defineProperty(navigator, 'languages', { get: () => ['he-IL', 'he', 'en-US'], configurable: true });
    });
    await setupFreshProfile(page, 'ParentZoneTest3');
    
    // The logout control lives inside the saga-map hamburger menu on mobile —
    // open the hardened menu first so the logout button is reachable.
    await openMenu(page);
    const logoutBtn = page.locator('button[aria-label*="Log Out"], button[aria-label*="התנתק"]').first();
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click();
    await page.waitForTimeout(2000);

    await openParentGate(page);

    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible();

    // Hebrew is an RTL language — the dashboard must not render LTR
    await expect(dashboard).toHaveAttribute('dir', 'rtl');

    // Hebrew copy renders in the dashboard chrome: every tab label is Hebrew
    const hebrewText = /[\u0590-\u05FF]/;
    for (const tabId of ['postcard', 'goals', 'games', 'settings']) {
      const tab = page.locator(`[data-testid="tab-${tabId}"]`).first();
      await expect(tab).toBeVisible({ timeout: 5000 });
      await expect(tab).toHaveAttribute('aria-label', hebrewText);
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

  test('Games tab shows ParentGamesHub with game cards', async ({ page }) => {
    // 5. Games tab shows ParentGamesHub with game cards
    await setupFreshProfile(page, 'ParentZoneTest5');
    
    // The logout control lives inside the saga-map hamburger menu on mobile —
    // open the hardened menu first so the logout button is reachable.
    await openMenu(page);
    const logoutBtn = page.locator('button[aria-label*="Log Out"], button[aria-label*="התנתק"]').first();
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
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
