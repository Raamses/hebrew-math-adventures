import { test, expect } from '@playwright/test';
import { setupFreshProfile, openParentGate, waitForSagaMap } from './helpers';

/**
 * Parent Dashboard — Phase 2c (§4.6 of EXPANDED_COVERAGE_PLAN.md)
 *
 * Test 1: Parent gate — solve math problem → dashboard appears
 * Test 2: Parent dashboard — switch tabs → content renders → exit
 *
 * Flow:
 *   ProfileSelector → parent-access button → ParentGate modal → solve math →
 *   ParentDashboard → tab switching → exit → back to ProfileSelector
 *
 * Note: The parent-access button lives on the ProfileSelector screen, not the
 * saga map. To reach ProfileSelector from the saga map, we log out. After
 * exiting the dashboard, we return to ProfileSelector (not the saga map).
 */

test.describe('Parent Dashboard', () => {
  test.setTimeout(120000);

  test('Parent gate — solve math problem → dashboard appears', async ({ page }) => {
    // Set up a fresh profile (lands on saga map), then log out to reach ProfileSelector
    await setupFreshProfile(page, 'ParentTest');

    // Log out from saga map to return to ProfileSelector
    // The logout button has aria-label "Log Out" (en) or "התנתק" (he)
    // It's the last button in the header with a LogOut icon
    const logoutBtn = page.locator('button[aria-label*="Log Out"], button[aria-label*="התנתק"]').first();
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click();
    await page.waitForTimeout(2000);

    // Verify we're on ProfileSelector — parent-access button should be visible
    const parentAccessBtn = page.locator('[data-testid="parent-access"]').first();
    await expect(parentAccessBtn).toBeVisible({ timeout: 10000 });

    // Open the parent gate and solve it → dashboard should appear
    await openParentGate(page);

    console.log('[Parent Dashboard] Test 1 PASSED: Parent gate solved, dashboard visible');
  });

  test('Parent dashboard — switch tabs → content renders → exit', async ({ page }) => {
    // Set up fresh profile and log out to reach ProfileSelector
    await setupFreshProfile(page, 'ParentTest2');

    // Log out to reach ProfileSelector
    const logoutBtn = page.locator('button[aria-label*="Log Out"], button[aria-label*="התנתק"]').first();
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click();
    await page.waitForTimeout(2000);

    // Open parent gate → dashboard appears
    await openParentGate(page);

    // --- Verify dashboard is visible ---
    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // The default tab is 'profiles' — verify its content is visible
    // ProfileManager renders a section with heading "Manage Profiles" / "ניהול פרופילים"
    const profilesHeading = page.locator('h2').filter({ hasText: /Manage Profiles|ניהול פרופילים/ }).first();
    await expect(profilesHeading).toBeVisible({ timeout: 5000 });
    console.log('[Parent Dashboard] Tab "profiles" content visible');

    // --- Switch to "progress" tab ---
    // Tab buttons are inside the dashboard nav. They have text labels.
    // Hebrew: "התקדמות" / English: "Progress"
    const progressTab = page.locator('button').filter({ hasText: /התקדמות|Progress/ }).first();
    await expect(progressTab).toBeVisible({ timeout: 5000 });
    await progressTab.click();
    await page.waitForTimeout(1000);

    // ProgressOverview renders a section with a profile selector dropdown or stat cards
    // Look for the StatCard components or the weekly chart — they have distinct text
    // ProgressOverview heading or content should appear
    const progressContent = page.locator('[data-testid="parent-dashboard"]').first();
    // Verify some new content appeared — check for StatCard text or chart elements
    // The ProgressOverview has a profile selector and "Total Stars" / "כוכבים" text
    const progressVisible = await page.evaluate(() => {
      const text = document.body.textContent || '';
      // Look for progress-related content that wouldn't be on the profiles tab
      return text.includes('Stars') || text.includes('כוכבים') ||
             text.includes('Streak') || text.includes('רצף') ||
             text.includes('Weekly') || text.includes('שבועי') ||
             text.includes('Badges') || text.includes('אותות');
    });
    expect(progressVisible).toBeTruthy();
    console.log('[Parent Dashboard] Tab "progress" content visible');

    // --- Switch to "skills" tab ---
    // Hebrew: "ניתוח כישורים" / English: "Skill Analysis"
    const skillsTab = page.locator('button').filter({ hasText: /ניתוח כישורים|Skill Analysis/ }).first();
    await expect(skillsTab).toBeVisible({ timeout: 5000 });
    await skillsTab.click();
    await page.waitForTimeout(1000);

    // SkillBreakdown renders skill cards with skill names
    // Look for skill-related content: addition, subtraction, multiplication, etc.
    // Hebrew: "חיבור" / English: "Addition"
    const skillsVisible = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return text.includes('Addition') || text.includes('חיבור') ||
             text.includes('Subtraction') || text.includes('חיסור') ||
             text.includes('Multiplication') || text.includes('כפל') ||
             text.includes('Division') || text.includes('חילוק') ||
             text.includes('Skill') || text.includes('כישור');
    });
    expect(skillsVisible).toBeTruthy();
    console.log('[Parent Dashboard] Tab "skills" content visible');

    // --- Exit the dashboard ---
    // Exit button has text "יציאה" (Hebrew) or "Exit" (English)
    const exitBtn = page.locator('button').filter({ hasText: /יציאה|Exit/ }).first();
    await expect(exitBtn).toBeVisible({ timeout: 5000 });
    await exitBtn.click();
    await page.waitForTimeout(1500);

    // After exit, we should be back on ProfileSelector
    // Verify parent-access button is visible again
    const parentAccessAgain = page.locator('[data-testid="parent-access"]').first();
    await expect(parentAccessAgain).toBeVisible({ timeout: 10000 });

    console.log('[Parent Dashboard] Test 2 PASSED: All tabs rendered, exited to ProfileSelector');
  });
});
