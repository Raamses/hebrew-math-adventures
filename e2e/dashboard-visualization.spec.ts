/**
 * dashboard-visualization.spec.ts
 *
 * E2E coverage for the Parent Dashboard data visualization components.
 *
 * ── Parent Dashboard access — 2 tests ────────────────────────────────────
 *  1. Navigate to parent dashboard via the saga-map parent zone → visible
 *  2. Four tabs render with correct icons (💌 🎯 🎮 ⚙️)
 *
 * Selector strategy (current app truth):
 *  - Dashboard:    data-testid="parent-dashboard" (ParentDashboard.tsx).
 *  - Parent entry: saga-map hamburger menu → data-testid="parent-zone-button"
 *                  → data-testid="parent-gate" → keypad → dashboard.
 *                  ([data-testid="parent-access"] only exists on the
 *                  profile-select screen, not on the saga map.)
 *  - Tabs:         data-testid="tab-{postcard|goals|games|settings}" + role="tab"
 *                  (ParentDashboard.tsx: PARENT_TABS).
 */

import { test, expect } from '@playwright/test';
import { setupFreshProfile, openParentDashboardFromMap } from './helpers';

// ─── Dashboard tabs & helpers ─────────────────────────────────────────────

/** Real tab ids — ParentDashboard.tsx: PARENT_TABS. */
const DASHBOARD_TABS = ['postcard', 'goals', 'games', 'settings'] as const;

/** Real tab icons — ParentDashboard.tsx: PARENT_TABS. */
const TAB_ICONS: Record<(typeof DASHBOARD_TABS)[number], string> = {
  postcard: '💌',
  goals: '🎯',
  games: '🎮',
  settings: '⚙️',
};

// ─── Tests ────────────────────────────────────────────────────────────────

test.describe('Parent Dashboard Data Visualization', () => {

  test.describe('Dashboard access', () => {

    test('1. Navigate to parent dashboard via the saga-map parent zone', async ({ page  }) => {
      await setupFreshProfile(page, 'DashTester');
      await openParentDashboardFromMap(page);
      // Parent dashboard should be visible
      await expect(page.getByTestId('parent-dashboard')).toBeVisible({ timeout: 10000 });
    });

    test('2. Four tabs render with correct icons', async ({ page  }) => {
      await setupFreshProfile(page, 'DashTester');
      await openParentDashboardFromMap(page);

      // Verify all 4 tab buttons exist (ParentDashboard.tsx: PARENT_TABS)
      const tabs = page.getByTestId('parent-dashboard').locator('[role="tab"]');
      await expect(tabs).toHaveCount(4);

      // Verify each tab renders with its configured icon
      for (const tabId of DASHBOARD_TABS) {
        const tab = page.getByTestId(`tab-${tabId}`).first();
        await expect(tab).toBeVisible();
        await expect(tab).toContainText(TAB_ICONS[tabId]);
      }
    });

  });

});
