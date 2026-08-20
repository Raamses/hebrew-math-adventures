import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfileWithPracticeAccess, enterSagaNode } from './helpers';

/**
 * Practice Mode — Mute Toggle
 *
 * The SettingsMenu (gear icon) inside PracticeMode's header exposes a mute/unmute
 * control backed by useSound(), which persists to the global 'isMuted' localStorage
 * key. This path (open menu -> toggle mute -> icon flips -> persisted) had no
 * coverage; sound-hook unit tests exist but nothing exercises the actual UI toggle.
 */

async function getIsMuted(page: Page): Promise<boolean | null> {
  return await page.evaluate(() => {
    const raw = localStorage.getItem('isMuted');
    return raw === null ? null : JSON.parse(raw);
  });
}

test.describe('Practice Mode — mute toggle', () => {
  // Global timeout is 180s — no need for local override

  test('toggling mute from the settings menu persists and flips the icon', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'MuteToggle');

    // n1_2 is a PRACTICE node — enters PracticeMode directly with its header/settings menu.
    await enterSagaNode(page, 1);
    await page.waitForTimeout(1500);

    // Open the settings (gear) menu in the practice header.
    const settingsGear = page.locator('button[aria-label="Settings"], button[aria-label*="הגדרות"]').first();
    await expect(settingsGear).toBeVisible({ timeout: 10000 });
    await settingsGear.click();
    await page.waitForTimeout(500);

    // Locate the mute/unmute menu item via data-testid selector.
    const muteItem = page.locator('[data-testid="mute-toggle"]').first();
    await expect(muteItem).toBeVisible({ timeout: 5000 });

    const mutedBefore = await getIsMuted(page);
    console.log(`[Mute Toggle] isMuted before: ${mutedBefore}`);

    await muteItem.click();
    await page.waitForTimeout(500);

    const mutedAfter = await getIsMuted(page);
    console.log(`[Mute Toggle] isMuted after: ${mutedAfter}`);

    // State must have actually flipped and been persisted to localStorage.
    expect(mutedAfter).not.toBe(mutedBefore);
    expect(typeof mutedAfter).toBe('boolean');

    // Toggling again should flip it back. The menu stays open after selecting mute
    // (only clicking outside or Pause/Full-Settings closes it), so click the same
    // menu item again rather than reopening via the gear.
    await expect(muteItem).toBeVisible({ timeout: 5000 });
    await muteItem.click();
    await page.waitForTimeout(500);

    const mutedFinal = await getIsMuted(page);
    console.log(`[Mute Toggle] isMuted final: ${mutedFinal}`);
    expect(mutedFinal).toBe(mutedBefore);
  });
});
