import { test, expect } from '@playwright/test';
import { toggleLanguage, waitForSagaMap, openMenu } from './helpers';

const APP_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

/**
 * Language Toggle — Phase 2e (§4.8 of EXPANDED_COVERAGE_PLAN.md)
 *
 * Test 1: Toggle language Hebrew → English → UI text changes → toggle back → Hebrew restored
 *
 * Flow:
 *   Set up profile with i18nextLng='he' in localStorage →
 *   assert arcade button title === 'משחקי ארקייד' (Hebrew) →
 *   click language-toggle →
 *   assert i18nextLng === 'en' and arcade button title === 'Arcade Games' →
 *   assert language-toggle aria-label === 'Switch Language' →
 *   click language-toggle again →
 *   assert i18nextLng === 'he' and arcade button title === 'משחקי ארקייד' (restored)
 *
 * localStorage key: i18nextLng ('he' or 'en')
 *
 * Note: The app uses i18next-browser-languagedetector with order ['localStorage', 'navigator']
 * and fallbackLng 'en'. In Playwright headless Chrome, navigator language is 'en-US', so
 * after clearing localStorage the default would be English. To test the Hebrew→English
 * toggle flow as specified, we pre-set i18nextLng='he' in localStorage before app load.
 */

test.describe('Language Toggle', () => {
  // Global timeout is 180s — no need for local override

  test('Toggle language Hebrew → English → UI text changes', async ({ page }) => {
    // --- Pre-set Hebrew as the language before app loads ---
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('i18nextLng', 'he');
    });

    // --- Set up fresh profile (reload with Hebrew language) ---
    await page.reload({ waitUntil: 'domcontentloaded' });
    // Wait for profile selector to appear
    const newPlayerBtn = page.locator('button:has(svg.lucide-plus)').first();
    await expect(newPlayerBtn).toBeVisible({ timeout: 15000 });
    await newPlayerBtn.click();
    // Wait for name input to appear
    await expect(page.locator('input#setup-name')).toBeVisible({ timeout: 5000 });

    // Fill name — input has id="setup-name"
    await page.locator('input#setup-name').fill('LangTest');

    // Submit — button[type="submit"]
    await page.locator('button[type="submit"]').click();

    // Wait for saga map to render (mascot greeting auto-dismisses)
    await expect(page.locator('[data-testid="saga-node-n1_1"]').first()).toBeVisible({ timeout: 30000 });

    // Verify we're on the saga map
    await waitForSagaMap(page);

    // --- Verify default language is Hebrew ---
    const lngBefore = await page.evaluate(() => localStorage.getItem('i18nextLng'));
    console.log('[Language Toggle] i18nextLng before toggle:', lngBefore);
    expect(lngBefore).toBe('he');

    // Ensure we're on the map
    const sagaNode = page.locator('[data-testid="saga-node-n1_1"]').first();
    await expect(sagaNode).toBeVisible({ timeout: 30000 });

    // Open menu to access the arcade button
    await openMenu(page);
    const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();
    await expect(arcadeBtn).toBeVisible({ timeout: 10000 });

    // Assert arcade button title is in Hebrew
    const arcadeTitleBefore = await arcadeBtn.getAttribute('title') || '';
    console.log('[Language Toggle] Arcade button title before toggle:', arcadeTitleBefore);
    expect(arcadeTitleBefore).toBe('משחקי ארקייד');

    // Close the menu
    await openMenu(page);

    // Assert language-toggle aria-label is in Hebrew
    const toggleBtn = page.locator('[data-testid="language-toggle"]').first();
    const toggleAriaBefore = await toggleBtn.getAttribute('aria-label') || '';
    console.log('[Language Toggle] Language toggle aria-label before:', toggleAriaBefore);
    expect(toggleAriaBefore).toBe('החלף שפה');

    // Close menu before toggling language (toggleLanguage opens it itself)
    // Use Escape to close the modal menu (backdrop intercepts pointer events)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // --- Toggle to English ---
    await toggleLanguage(page);

    // --- Assert language changed to English ---
    const lngAfter = await page.evaluate(() => localStorage.getItem('i18nextLng'));
    console.log('[Language Toggle] i18nextLng after toggle:', lngAfter);
    expect(lngAfter).toBe('en');

    // Assert arcade button title is now in English (re-open menu)
    await openMenu(page);
    const arcadeTitleAfter = await arcadeBtn.getAttribute('title') || '';
    console.log('[Language Toggle] Arcade button title after toggle:', arcadeTitleAfter);
    expect(arcadeTitleAfter).toBe('Arcade Games');

    // Close the menu
    await openMenu(page);

    // Assert language-toggle aria-label is now in English
    const toggleAriaAfter = await toggleBtn.getAttribute('aria-label') || '';
    console.log('[Language Toggle] Language toggle aria-label after:', toggleAriaAfter);
    expect(toggleAriaAfter).toBe('Switch Language');

    // Close menu before toggling back
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // --- Toggle back to Hebrew ---
    await toggleLanguage(page);

    // --- Assert Hebrew text restored ---
    const lngRestored = await page.evaluate(() => localStorage.getItem('i18nextLng'));
    console.log('[Language Toggle] i18nextLng after toggle back:', lngRestored);
    expect(lngRestored).toBe('he');

    // Re-open menu to check arcade button title restored
    await openMenu(page);
    const arcadeTitleRestored = await arcadeBtn.getAttribute('title') || '';
    console.log('[Language Toggle] Arcade button title restored:', arcadeTitleRestored);
    expect(arcadeTitleRestored).toBe('משחקי ארקייד');

    // Close the menu
    await openMenu(page);

    // Verify we're still on the saga map
    await waitForSagaMap(page);

    console.log('[Language Toggle] Test 1 PASSED: Hebrew → English → Hebrew toggle verified');
  });
});
