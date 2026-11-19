/**
 * dashboard-visualization.spec.ts
 *
 * E2E coverage for the Parent Dashboard data visualization components:
 * ProgressOverview, WeeklyChart (SVG bars), and StreakHeatmap (7×5 grid).
 *
 * ── Parent Dashboard access — 2 tests ────────────────────────────────────
 *  1. Navigate to parent dashboard via the saga-map parent zone → visible
 *  2. Four tabs render with correct icons (💌 🎯 🎮 ⚙️)
 *
 * ── Progress Overview widgets — 6 tests (QUARANTINED, see below) ─────────
 *  3. ProgressOverview renders
 *  4. Stat cards render (stars, badges, coins, streak, time)
 *  5. WeeklyChart renders SVG with 7 bar <rect> elements
 *  6. StreakHeatmap renders a grid of 35 cells (7×5)
 *  7. Accuracy bar shows a percentage
 *  8. Fresh profile shows zero/empty stats across all cards
 *
 * Selector strategy (current app truth):
 *  - Dashboard:    data-testid="parent-dashboard" (ParentDashboard.tsx).
 *  - Parent entry: saga-map hamburger menu → data-testid="parent-zone-button"
 *                  → data-testid="parent-gate" → keypad → dashboard.
 *                  ([data-testid="parent-access"] only exists on the
 *                  profile-select screen, not on the saga map.)
 *  - Tabs:         data-testid="tab-{postcard|goals|games|settings}" + role="tab"
 *                  (ParentDashboard.tsx: PARENT_TABS).
 *
 * Tests 3–8 stay quarantined (test.fixme): ProgressOverview, WeeklyChart and
 * StreakHeatmap are orphaned components. Nothing in src/ renders
 * ProgressOverview (only a unit test imports it), and PARENT_TABS has no
 * progress tab, so the DOM these tests assert on is never rendered. They are
 * not mobile gaps and must not be switched on until the component is wired
 * into a tab (or deleted, together with these tests). Follow-up: see
 * board card 35fed897 (PROGRESS_OVERVIEW_ORPHANED below).
 *
 *  - ProgressOverview widgets have NO data-testid and are located structurally:
 *                  WeeklyChart = svg[viewBox="0 0 100 120"] with one <rect> per day,
 *                  StreakHeatmap = 35 cells carrying an inline aspect-ratio,
 *                  accuracy = "<n>%" text next to the progress bar.
 *
 * Model: ask-claude --escalate --card e751ea10-535a-4909-9974-45c02f35e1d0
 *   — FAILED: "You've hit your session limit · resets 1:40am (Asia/Jerusalem)"
 *   Both claude-opus-5 (--escalate) and claude-sonnet-5 (default) were
 *   rate-limited. Gemini CLI also unavailable (IneligibleTierError).
 *   Specs written by glm-5.2 with full source context. Delegation failure
 *   documented per card instructions.
 */

import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfile, openMenu, solveParentGate } from './helpers';

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

/**
 * Open the parent dashboard from the saga map.
 * The map exposes the parent zone through the hamburger menu
 * ([data-testid="parent-zone-button"]); [data-testid="parent-access"] only
 * exists on the profile-select screen, so we drive the map flow and solve the
 * clipboard problem on the real keypad.
 */
async function openParentDashboard(page: Page): Promise<void> {
  await openMenu(page);

  const parentZoneBtn = page.locator('[data-testid="parent-zone-button"]').first();
  await expect(parentZoneBtn).toBeVisible({ timeout: 15000 });
  await parentZoneBtn.click();

  const gate = page.locator('[data-testid="parent-gate"]').first();
  await expect(gate).toBeVisible({ timeout: 5000 });

  const problemEl = gate.locator('[data-testid="parent-gate-problem"]').first();
  await expect(problemEl).toBeVisible({ timeout: 5000 });
  const problemText = (await problemEl.textContent()) || '';
  const problemMatch = problemText.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
  if (!problemMatch) {
    throw new Error(`Unexpected parent gate problem: "${problemText}"`);
  }
  const n1 = parseInt(problemMatch[1] as string, 10);
  const n2 = parseInt(problemMatch[2] as string, 10);
  await solveParentGate(page, n1 + n2);

  await expect(page.getByTestId('parent-dashboard')).toBeVisible({ timeout: 15000 });
}

/** Quarantine reason for tests 3–8 (see the file header). */
const PROGRESS_OVERVIEW_ORPHANED =
  'ProgressOverview/WeeklyChart/StreakHeatmap are orphaned: no component in src/ renders ' +
  'ProgressOverview and PARENT_TABS (postcard/goals/games/settings) has no progress tab, so this ' +
  'DOM never exists. Not a mobile gap. Follow-up: board card 35fed897 ' +
  '(wire it into a parent tab, or delete it and these tests).';

/**
 * Land on the dashboard tab that renders ProgressOverview (stat cards +
 * WeeklyChart + StreakHeatmap + accuracy bar) by probing the real tabs for the
 * WeeklyChart SVG. Throws when no tab renders it, so a test can never fall
 * through to assertions against DOM that does not exist.
 */
async function openProgressOverviewTab(page: Page): Promise<void> {
  await openParentDashboard(page);

  const weeklyChart = page
    .getByTestId('parent-dashboard')
    .locator('svg[viewBox="0 0 100 120"]');

  for (const tabId of DASHBOARD_TABS) {
    const tab = page.getByTestId(`tab-${tabId}`).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
    if ((await tab.getAttribute('aria-selected')) !== 'true') {
      await tab.click();
      await page.waitForTimeout(500);
    }
    if ((await weeklyChart.count()) > 0) {
      return;
    }
  }
  throw new Error(
    `No parent dashboard tab (${DASHBOARD_TABS.join(', ')}) renders ProgressOverview ` +
      '(svg[viewBox="0 0 100 120"] not found).',
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

test.describe('Parent Dashboard Data Visualization', () => {

  test.describe('Dashboard access', () => {

    test('1. Navigate to parent dashboard via the saga-map parent zone', async ({ page  }) => {
      await setupFreshProfile(page, 'DashTester');
      await openParentDashboard(page);
      // Parent dashboard should be visible
      await expect(page.getByTestId('parent-dashboard')).toBeVisible({ timeout: 10000 });
    });

    test('2. Four tabs render with correct icons', async ({ page  }) => {
      await setupFreshProfile(page, 'DashTester');
      await openParentDashboard(page);

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

  test.describe('Progress Overview tab', () => {
    // Every test in this group is quarantined: see PROGRESS_OVERVIEW_ORPHANED.

    test('3. ProgressOverview renders on the dashboard', async ({ page  }) => {
      test.fixme(true, PROGRESS_OVERVIEW_ORPHANED);
      await setupFreshProfile(page, 'DashTester');
      await openProgressOverviewTab(page);

      const dashboard = page.getByTestId('parent-dashboard');
      // WeeklyChart SVG renders its frame + one <rect> bar per weekday
      const weeklyChart = dashboard.locator('svg[viewBox="0 0 100 120"]').first();
      await expect(weeklyChart).toBeVisible({ timeout: 10000 });
      expect(await weeklyChart.locator('rect').count()).toBeGreaterThanOrEqual(7);
      // StreakHeatmap renders 5 weeks × 7 days = 35 day cells
      await expect(dashboard.locator('div[style*="aspect-ratio"]')).toHaveCount(35);
    });

    test('4. Stat cards render with expected labels', async ({ page  }) => {
      test.fixme(true, PROGRESS_OVERVIEW_ORPHANED);
      await setupFreshProfile(page, 'DashTester');
      await openProgressOverviewTab(page);

      const dashboard = page.getByTestId('parent-dashboard');
      // ProgressOverview stat cards: stars, badges, coins, streak, time played
      for (const icon of ['⭐', '🏅', '🪙', '⚡', '⏱️']) {
        await expect(dashboard.getByText(icon).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('5. WeeklyChart renders SVG with 7 bar <rect> elements', async ({ page  }) => {
      test.fixme(true, PROGRESS_OVERVIEW_ORPHANED);
      await setupFreshProfile(page, 'DashTester');
      await openProgressOverviewTab(page);

      const dashboard = page.getByTestId('parent-dashboard');
      // WeeklyChart is the 100×120 SVG holding one <rect> bar per weekday
      const weeklyChart = dashboard.locator('svg[viewBox="0 0 100 120"]').first();
      await expect(weeklyChart).toBeVisible({ timeout: 10000 });
      const rectCount = await weeklyChart.locator('rect').count();
      // Should have at least 7 bars (one per day)
      expect(rectCount).toBeGreaterThanOrEqual(7);
    });

    test('6. StreakHeatmap renders a grid of 35 cells (7×5)', async ({ page  }) => {
      test.fixme(true, PROGRESS_OVERVIEW_ORPHANED);
      await setupFreshProfile(page, 'DashTester');
      await openProgressOverviewTab(page);

      const dashboard = page.getByTestId('parent-dashboard');
      // StreakHeatmap: 5 weeks × 7 days, each cell carries an inline aspect-ratio
      const heatmapCells = dashboard.locator('div[style*="aspect-ratio"]');
      await expect(heatmapCells).toHaveCount(35);
      await expect(heatmapCells.first()).toBeVisible();
    });

    test('7. Accuracy bar shows a percentage', async ({ page  }) => {
      test.fixme(true, PROGRESS_OVERVIEW_ORPHANED);
      await setupFreshProfile(page, 'DashTester');
      await openProgressOverviewTab(page);

      const dashboard = page.getByTestId('parent-dashboard');
      // Overall accuracy renders as "<n>%" beside the progress bar
      const accuracyValue = dashboard.getByText(/^\d+%$/).first();
      await expect(accuracyValue).toBeVisible({ timeout: 5000 });
      await expect(accuracyValue).toHaveText(/^\d+%$/);
    });

    test('8. Fresh profile shows zero/empty stats across all cards', async ({ page  }) => {
      test.fixme(true, PROGRESS_OVERVIEW_ORPHANED);
      await setupFreshProfile(page, 'DashTester');
      await openProgressOverviewTab(page);

      const dashboard = page.getByTestId('parent-dashboard');
      // Brand-new profile: the accuracy bar sits at 0%
      await expect(dashboard.getByText(/^0%$/).first()).toBeVisible({ timeout: 5000 });
      // Stat values fall back to zero (coins, streak, stars)
      await expect(dashboard.getByText('0', { exact: true }).first()).toBeVisible();
      const zeroValues = dashboard.getByText(/\b0\b/);
      expect(await zeroValues.count()).toBeGreaterThan(0);
    });

  });

});
