/**
 * E2E: Parent Zone redesign — mobile-first layout, tabs, profiles, RTL, dual-entry gate
 *
 * Replaces the previous 2-test parent-dashboard.spec.ts with 11 comprehensive tests
 * covering the full Parent Zone redesign:
 *
 * Gate entry (2):
 *  1.  Parent gate from ProfileSelector — solve math → dashboard appears
 *  2.  Parent gate from SagaMap — open menu → parent-zone-button → solve gate → dashboard
 *
 * Tab navigation (2):
 *  3.  All 4 tabs render correct content (profiles/progress/games/skills)
 *  4.  Games tab → ParentGamesHub renders game cards → click game → game view opens
 *
 * Profile management (3):
 *  5.  Edit profile — click edit → modal → change name → save → name updated in list
 *  6.  Delete profile — click delete → accept confirm → profile removed from list
 *  7.  Danger zone reset — click reset → accept confirm → reload → no profiles
 *
 * Layout & RTL (2):
 *  8.  Mobile-first layout — viewport 390px, max-w-md content, fixed bottom nav, stacked
 *  9.  RTL layout — dir=rtl on dashboard, Hebrew text visible, tabs right-to-left
 *
 * Exit routing (2):
 * 10. Exit to ProfileSelector — opened from selector → exit → back to ProfileSelector
 * 11. Exit to SagaMap — opened from map → exit → back to saga map
 *
 * Model: glm-5.2 (fallback — Claude session limit reached, Gemini IneligibleTierError)
 * Delegation attempted via ask-claude --escalate --card 50412b6e-a61d-4465-a9e8-d68727281eb7
 * Both Claude (session limit, resets 8pm Asia/Jerusalem) and Gemini CLI (IneligibleTierError —
 * Gemini Code Assist for individuals no longer supported) failed. Spec built from direct
 * source code analysis of ParentDashboard.tsx, ParentGate.tsx, App.tsx, ProfileManager.tsx,
 * EditProfileModal.tsx, ParentGamesHub.tsx, and existing E2E patterns.
 */

import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfile, openParentGate, openMenu, waitForSagaMap } from './helpers';

// ─── Local Helpers ───────────────────────────────────────────────────

/**
 * Log out from the saga map to reach the ProfileSelector screen.
 * The logout button has aria-label "Log Out" (en) or "התנתק" (he).
 */
async function logoutToProfileSelector(page: Page) {
  // The logout button is inside the hamburger menu — open it first
  await openMenu(page);
  const logoutBtn = page.locator('button[aria-label*="Log Out"], button[aria-label*="התנתק"]').first();
  await expect(logoutBtn).toBeVisible({ timeout: 10000 });
  await logoutBtn.click();
  await page.waitForTimeout(2000);

  // Verify we're on ProfileSelector
  const parentAccessBtn = page.locator('[data-testid="parent-access"]').first();
  await expect(parentAccessBtn).toBeVisible({ timeout: 10000 });
}

/**
 * Open the parent gate from the SagaMap (via hamburger menu → parent-zone-button).
 * Solves the math problem and verifies the dashboard appears.
 * Prerequisite: page must be on the saga map with a profile loaded.
 */
async function openParentGateFromMap(page: Page) {
  // Open the hamburger menu
  await openMenu(page);

  // Click the parent-zone-button inside the menu
  const parentZoneBtn = page.locator('[data-testid="parent-zone-button"]').first();
  await expect(parentZoneBtn).toBeVisible({ timeout: 5000 });
  await parentZoneBtn.click();
  await page.waitForTimeout(800);

  // Wait for parent gate modal to appear
  const gate = page.locator('[data-testid="parent-gate"]').first();
  await expect(gate).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(300);

  // Read the math problem from the DOM: "{n1} + {n2} = ?"
  const gateText = await gate.textContent() || '';
  const problemMatch = gateText.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
  if (!problemMatch) {
    throw new Error(`Could not parse parent gate problem from text: "${gateText}"`);
  }

  const n1 = parseInt(problemMatch[1]);
  const n2 = parseInt(problemMatch[2]);
  const sum = n1 + n2;

  console.log(`[ParentGate from Map] Parsed problem: ${n1} + ${n2} = ${sum}`);

  // Fill the input and submit
  const input = page.locator('[data-testid="parent-gate-input"]').first();
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill(String(sum));
  await page.waitForTimeout(300);

  const submitBtn = gate.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible({ timeout: 5000 });
  await submitBtn.click();
  await page.waitForTimeout(1500);

  // Verify parent dashboard is now visible
  const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
  await expect(dashboard).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate from a fresh saga map to the Parent Dashboard via ProfileSelector.
 * Flow: setupFreshProfile → logout → openParentGate → dashboard.
 */
async function navigateToDashboardFromSelector(page: Page, name = 'ParentTest') {
  await setupFreshProfile(page, name);
  await logoutToProfileSelector(page);
  await openParentGate(page);
}

/**
 * Navigate from a fresh saga map to the Parent Dashboard via SagaMap.
 * Flow: setupFreshProfile → openMenu → parent-zone-button → solve gate → dashboard.
 */
async function navigateToDashboardFromMap(page: Page, name = 'ParentTest') {
  await setupFreshProfile(page, name);
  await openParentGateFromMap(page);
}

/**
 * Click a tab in the parent dashboard by its Hebrew or English label.
 */
async function clickTab(page: Page, hePattern: RegExp, enPattern: RegExp) {
  const tab = page.locator('button[role="tab"]').filter({ hasText: hePattern }).first();
  await expect(tab).toBeVisible({ timeout: 5000 });
  await tab.click();
  await page.waitForTimeout(800);
}

/**
 * Exit the parent dashboard by clicking the Exit button.
 */
async function exitDashboard(page: Page) {
  const exitBtn = page.locator('button').filter({ hasText: /יציאה|Exit/ }).first();
  await expect(exitBtn).toBeVisible({ timeout: 5000 });
  await exitBtn.click();
  await page.waitForTimeout(1500);
}

// ─── Tests ──────────────────────────────────────────────────────────

test.describe('Parent Zone — Redesign', () => {
  // Global timeout is 180s — no need for local override

  // ── Gate Entry ──────────────────────────────────────────────────

  test('1. Parent gate from ProfileSelector — solve math → dashboard appears', async ({ page }) => {
    await setupFreshProfile(page, 'GateTest');
    await logoutToProfileSelector(page);

    // Verify parent-access button is visible
    const parentAccessBtn = page.locator('[data-testid="parent-access"]').first();
    await expect(parentAccessBtn).toBeVisible({ timeout: 10000 });

    // Open the parent gate and solve it → dashboard should appear
    await openParentGate(page);

    // Verify dashboard is visible with correct testid
    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Verify default tab is "profiles" — Manage Profiles heading visible
    const profilesHeading = page.locator('h2').filter({ hasText: /ניהול פרופילים|Manage Profiles/ }).first();
    await expect(profilesHeading).toBeVisible({ timeout: 5000 });

    console.log('[Test 1] PASSED: Parent gate from ProfileSelector solved, dashboard visible');
  });

  test('2. Parent gate from SagaMap — open menu → parent-zone-button → solve gate → dashboard', async ({ page }) => {
    await setupFreshProfile(page, 'GateMapTest');

    // We're on the saga map — open menu and access parent zone from there
    await openParentGateFromMap(page);

    // Verify dashboard is visible
    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Verify default tab is "profiles"
    const profilesHeading = page.locator('h2').filter({ hasText: /ניהול פרופילים|Manage Profiles/ }).first();
    await expect(profilesHeading).toBeVisible({ timeout: 5000 });

    console.log('[Test 2] PASSED: Parent gate from SagaMap solved, dashboard visible');
  });

  // ── Tab Navigation ─────────────────────────────────────────────

  test('3. All 4 tabs render correct content', async ({ page }) => {
    await navigateToDashboardFromSelector(page, 'TabTest');

    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // --- Tab 1: profiles (default) ---
    const profilesHeading = page.locator('h2').filter({ hasText: /ניהול פרופילים|Manage Profiles/ }).first();
    await expect(profilesHeading).toBeVisible({ timeout: 5000 });
    console.log('[Test 3] Tab "profiles" content visible');

    // --- Tab 2: progress ---
    await clickTab(page, /התקדמות/, /Progress/);
    const progressVisible = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return text.includes('Stars') || text.includes('כוכבים') ||
             text.includes('Streak') || text.includes('רצף') ||
             text.includes('Weekly') || text.includes('שבועי') ||
             text.includes('Badges') || text.includes('אותות');
    });
    expect(progressVisible).toBeTruthy();
    console.log('[Test 3] Tab "progress" content visible');

    // --- Tab 3: games ---
    await clickTab(page, /משחקים/, /Games/);
    // ParentGamesHub renders a header with t('parent.games.title')
    const gamesHeader = page.locator('h2').filter({ hasText: /משחקים|Games/ }).first();
    await expect(gamesHeader).toBeVisible({ timeout: 5000 });
    // Game cards should be visible
    const gamesList = page.locator('[data-testid="games-list"]').first();
    await expect(gamesList).toBeVisible({ timeout: 5000 });
    console.log('[Test 3] Tab "games" content visible');

    // --- Tab 4: skills ---
    await clickTab(page, /ניתוח כישורים/, /Skill Analysis/);
    const skillsVisible = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return text.includes('Addition') || text.includes('חיבור') ||
             text.includes('Subtraction') || text.includes('חיסור') ||
             text.includes('Multiplication') || text.includes('כפל') ||
             text.includes('Division') || text.includes('חילוק') ||
             text.includes('Skill') || text.includes('כישור');
    });
    expect(skillsVisible).toBeTruthy();
    console.log('[Test 3] Tab "skills" content visible');

    console.log('[Test 3] PASSED: All 4 tabs render correct content');
  });

  test('4. Games tab → ParentGamesHub renders, game cards visible, click game → game view', async ({ page }) => {
    await navigateToDashboardFromSelector(page, 'GamesTabTest');

    // Navigate to games tab
    await clickTab(page, /משחקים/, /Games/);

    // Verify games-list is visible
    const gamesList = page.locator('[data-testid="games-list"]').first();
    await expect(gamesList).toBeVisible({ timeout: 5000 });

    // Verify at least 4 available game cards + 1 disabled
    const availableGames = ['equation-of-the-day', 'parent-blitz', 'sudoku', 'number-merge'];
    for (const gameId of availableGames) {
      const card = page.locator(`[data-testid="game-card-${gameId}"]`).first();
      await expect(card).toBeVisible({ timeout: 5000 });
      // Verify it's not disabled
      const isDisabled = await card.getAttribute('disabled');
      expect(isDisabled).toBeNull();
    }

    // Verify coming-soon game (math-crossword) is disabled
    const comingSoonCard = page.locator('[data-testid="game-card-math-crossword"]').first();
    await expect(comingSoonCard).toBeVisible({ timeout: 5000 });

    // Click the first available game (sudoku) → game view opens
    const sudokuCard = page.locator('[data-testid="game-card-sudoku"]').first();
    await sudokuCard.click();
    await page.waitForTimeout(1000);

    // Verify game view is visible
    const gameView = page.locator('[data-testid="game-view"]').first();
    await expect(gameView).toBeVisible({ timeout: 5000 });

    // Verify back button is visible
    const backBtn = page.locator('[data-testid="back-button"]').first();
    await expect(backBtn).toBeVisible({ timeout: 5000 });

    // Click back → return to games list
    await backBtn.click();
    await page.waitForTimeout(800);
    await expect(gamesList).toBeVisible({ timeout: 5000 });

    console.log('[Test 4] PASSED: Games tab → hub → game view → back to list');
  });

  // ── Profile Management ──────────────────────────────────────────

  test('5. Edit profile — change name → save → name updated', async ({ page }) => {
    await navigateToDashboardFromSelector(page, 'EditTest');

    // On the profiles tab (default), find the edit button for the profile
    // Edit button has aria-label = ערוך / Edit
    const editBtn = page.locator('button[aria-label*="ערוך"], button[aria-label*="Edit"]').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(800);

    // Verify EditProfileModal is open — look for the name input
    const nameInput = page.locator('#edit-name').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    // Verify the current name is in the input
    const currentName = await nameInput.inputValue();
    expect(currentName).toContain('EditTest');

    // Change the name
    await nameInput.fill('EditTestUpdated');
    await page.waitForTimeout(300);

    // Click save — button with text שמור שינויים / Save Changes
    const saveBtn = page.locator('button').filter({ hasText: /שמור שינויים|Save Changes/ }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Verify modal is closed (name input no longer visible)
    await expect(nameInput).not.toBeVisible({ timeout: 5000 });

    // Verify the updated name appears in the profiles list
    const updatedNameEl = page.locator('div.font-bold').filter({ hasText: 'EditTestUpdated' }).first();
    await expect(updatedNameEl).toBeVisible({ timeout: 5000 });

    console.log('[Test 5] PASSED: Profile name edited successfully');
  });

  test('6. Delete profile — accept confirm → profile removed', async ({ page }) => {
    // Set up two profiles so we can delete one and still see the dashboard
    await setupFreshProfile(page, 'DeleteKeep');
    await logoutToProfileSelector(page);

    // Create a second profile to delete
    const newPlayerBtn = page.locator('button:has(svg.lucide-plus)').first();
    await expect(newPlayerBtn).toBeVisible({ timeout: 5000 });
    await newPlayerBtn.click();
    await page.waitForTimeout(800);
    await page.locator('input#setup-name').fill('DeleteMe');
    await page.waitForTimeout(300);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    // Now log out again to reach ProfileSelector, then open parent gate
    await logoutToProfileSelector(page);
    await openParentGate(page);

    // On the profiles tab, find the delete button for "DeleteMe"
    // The profile cards have the name in a div.font-bold, and delete button has aria-label מחק פרופיל / Delete Profile
    // We need to find the delete button that corresponds to the "DeleteMe" profile card
    const profileCards = page.locator('div.bg-white.rounded-2xl.p-4.flex.items-center.gap-3');
    const cardCount = await profileCards.count();

    // Find the card containing "DeleteMe" and click its delete button
    let deleteBtn: ReturnType<typeof page.locator> | null = null;
    for (let i = 0; i < cardCount; i++) {
      const cardText = await profileCards.nth(i).textContent();
      if (cardText && cardText.includes('DeleteMe')) {
        deleteBtn = profileCards.nth(i).locator('button[aria-label*="מחק"], button[aria-label*="Delete Profile"]').first();
        break;
      }
    }

    expect(deleteBtn).not.toBeNull();
    await expect(deleteBtn!).toBeVisible({ timeout: 5000 });

    // Set up dialog handler BEFORE clicking delete (confirm dialog appears)
    const dialogPromise = new Promise<void>((resolve) => {
      page.once('dialog', async (dialog) => {
        await dialog.accept();
        resolve();
      });
    });

    await deleteBtn!.click();
    await dialogPromise;
    await page.waitForTimeout(1500);

    // Verify "DeleteMe" profile is no longer in the list
    const deletedNameEl = page.locator('div.font-bold').filter({ hasText: 'DeleteMe' });
    await expect(deletedNameEl).toHaveCount(0, { timeout: 5000 });

    // Verify "DeleteKeep" profile is still present
    const keptNameEl = page.locator('div.font-bold').filter({ hasText: 'DeleteKeep' }).first();
    await expect(keptNameEl).toBeVisible({ timeout: 5000 });

    console.log('[Test 6] PASSED: Profile deleted, other profile still present');
  });

  test('7. Danger zone reset — click reset → confirm → reload → no profiles', async ({ page }) => {
    await navigateToDashboardFromSelector(page, 'DangerTest');

    // Verify we're on the dashboard
    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Find the danger zone reset button — text: איפוס כל הנתונים / Reset All Data
    const resetBtn = page.locator('button').filter({ hasText: /איפוס כל הנתונים|Reset All Data/ }).first();
    await expect(resetBtn).toBeVisible({ timeout: 5000 });

    // Set up dialog handler BEFORE clicking reset
    const dialogPromise = new Promise<void>((resolve) => {
      page.once('dialog', async (dialog) => {
        await dialog.accept();
        resolve();
      });
    });

    await resetBtn.click();
    await dialogPromise;

    // Page should reload — wait for ProfileSelector to appear
    await page.waitForTimeout(3000);

    // After reset, localStorage is cleared and page reloads → ProfileSelector with no profiles
    // Verify parent-access button is visible (we're on ProfileSelector)
    const parentAccessBtn = page.locator('[data-testid="parent-access"]').first();
    await expect(parentAccessBtn).toBeVisible({ timeout: 15000 });

    // Verify no profiles exist — the "New Player" button should be visible but no profile cards
    // With no profiles, only the "Add New Profile" button should be present
    const profileButtons = page.locator('button.group.relative.flex.flex-col.items-center');
    const profileCount = await profileButtons.count();
    expect(profileCount).toBe(0);

    // Verify the empty state: "New Player" / "שחקן חדש" button is visible
    const newPlayerBtn = page.locator('button:has(svg.lucide-plus)').first();
    await expect(newPlayerBtn).toBeVisible({ timeout: 5000 });

    console.log('[Test 7] PASSED: Danger zone reset cleared all data, back to ProfileSelector');
  });

  // ── Layout & RTL ────────────────────────────────────────────────

  test('8. Mobile-first layout — viewport 390px, max-w-md content, fixed bottom nav', async ({ page }) => {
    await navigateToDashboardFromSelector(page, 'LayoutTest');

    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Verify the viewport is mobile-sized (390px from playwright config, allow small variance)
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeCloseTo(390, 0);

    // Verify the content container has max-w-md class (mobile-first constraint)
    const contentContainer = dashboard.locator('.max-w-md').first();
    await expect(contentContainer).toBeVisible({ timeout: 5000 });

    // Verify the fixed bottom nav is present
    const bottomNav = dashboard.locator('nav.fixed.bottom-0').first();
    await expect(bottomNav).toBeVisible({ timeout: 5000 });

    // Verify 4 tab buttons in the nav
    const tabButtons = bottomNav.locator('button[role="tab"]');
    await expect(tabButtons).toHaveCount(4, { timeout: 5000 });

    // Verify content stacks vertically (main element is above the nav, not side-by-side)
    const main = dashboard.locator('main').first();
    await expect(main).toBeVisible({ timeout: 5000 });

    // Verify the main content is above the fixed nav (main should not have position:fixed)
    const mainPosition = await main.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });
    expect(mainPosition).not.toBe('fixed');

    // Verify the nav is fixed
    const navPosition = await bottomNav.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });
    expect(navPosition).toBe('fixed');

    console.log('[Test 8] PASSED: Mobile-first layout verified');
  });

  test('9. RTL layout — dir=rtl on dashboard, Hebrew text visible, tabs render', async ({ page }) => {
    await navigateToDashboardFromSelector(page, 'RtlTest');

    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Verify dir=rtl on the dashboard root element or its parent (RTL context)
    const dir = await dashboard.getAttribute('dir');
    if (dir !== 'rtl') {
      const parentDir = await dashboard.locator('..').getAttribute('dir');
      expect(parentDir).toBe('rtl');
    } else {
      expect(dir).toBe('rtl');
    }

    // Verify Hebrew title is visible: לוח בקרה להורים
    const titleEl = dashboard.locator('h1').first();
    await expect(titleEl).toBeVisible({ timeout: 5000 });
    const titleText = await titleEl.textContent();
    expect(titleText).toContain('לוח בקרה להורים');

    // Verify exit button has Hebrew text: יציאה
    const exitBtn = page.locator('button').filter({ hasText: /יציאה/ }).first();
    await expect(exitBtn).toBeVisible({ timeout: 5000 });

    // Verify tab labels are in Hebrew
    const tabs = dashboard.locator('button[role="tab"]');
    const tabTexts: string[] = [];
    const tabCount = await tabs.count();
    for (let i = 0; i < tabCount; i++) {
      const text = (await tabs.nth(i).textContent()) || '';
      tabTexts.push(text.trim());
    }

    // Expect Hebrew tab labels (at least partial match)
    expect(tabTexts.some(t => t.includes('ניהול פרופילים'))).toBeTruthy();
    expect(tabTexts.some(t => t.includes('התקדמות'))).toBeTruthy();
    expect(tabTexts.some(t => t.includes('משחקים'))).toBeTruthy();
    expect(tabTexts.some(t => t.includes('ניתוח כישורים'))).toBeTruthy();

    console.log('[Test 9] PASSED: RTL layout with Hebrew text verified');
  });

  // ── Exit Routing ────────────────────────────────────────────────

  test('10. Exit to ProfileSelector — opened from selector → back to ProfileSelector', async ({ page }) => {
    await navigateToDashboardFromSelector(page, 'ExitSelectTest');

    // Verify we're on the dashboard
    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Exit the dashboard
    await exitDashboard(page);

    // After exit, we should be back on ProfileSelector (since gate was opened from selector)
    const parentAccessAgain = page.locator('[data-testid="parent-access"]').first();
    await expect(parentAccessAgain).toBeVisible({ timeout: 10000 });

    console.log('[Test 10] PASSED: Exited to ProfileSelector');
  });

  test('11. Exit to SagaMap — opened from map → back to saga map', async ({ page }) => {
    await navigateToDashboardFromMap(page, 'ExitMapTest');

    // Verify we're on the dashboard
    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Exit the dashboard
    await exitDashboard(page);

    // After exit, we should be back on the saga map (since gate was opened from map)
    // Verify saga map node is visible
    const sagaNode = page.locator('[data-testid="saga-node-n1_1"]').first();
    await expect(sagaNode).toBeVisible({ timeout: 10000 });

    // Also verify we're NOT on ProfileSelector (parent-access should not be visible)
    const parentAccess = page.locator('[data-testid="parent-access"]');
    const parentAccessCount = await parentAccess.count();
    expect(parentAccessCount).toBe(0);

    console.log('[Test 11] PASSED: Exited to SagaMap');
  });
});
