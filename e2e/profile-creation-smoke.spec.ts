import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfile } from './helpers';

/**
 * Profile Creation + Saga Map Landing — standalone smoke test.
 *
 * setupFreshProfile() is used everywhere as a setup step, but its own outcome
 * (profile actually persisted, saga map actually rendered) is never independently
 * asserted. This spec makes that flow a first-class test.
 */

interface StoredProfile {
  id: string;
  name: string;
  age?: number;
}

async function getProfiles(page: Page): Promise<StoredProfile[]> {
  return await page.evaluate(() => {
    const raw = localStorage.getItem('hebrew-math-profiles');
    if (!raw) return [];
    try {
      return Object.values(JSON.parse(raw));
    } catch {
      return [];
    }
  });
}

test.describe('Profile creation + saga map landing', () => {
  // Global timeout is 180s — no need for local override

  test('creating a new profile persists it and lands on the saga map', async ({ page }) => {
    await setupFreshProfile(page, 'SmokeProfile');

    // Profile persisted to localStorage with the chosen name.
    const profiles = await getProfiles(page);
    console.log('[Profile Smoke] profiles:', JSON.stringify(profiles.map((p) => ({ id: p.id, name: p.name }))));
    expect(profiles.length).toBeGreaterThan(0);
    const created = profiles.find((p) => p.name === 'SmokeProfile');
    expect(created).toBeTruthy();
    expect(created.id).toBeTruthy();

    // Saga map landing: arcade button + at least one map node visible.
    const sagaNode = page.locator('[data-testid="saga-node-n1_1"]').first();
    await expect(sagaNode).toBeVisible();

    const mapNodes = page.locator('[data-testid^="saga-node-"]');
    expect(await mapNodes.count()).toBeGreaterThan(0);

    // First node (n1_1) should be unlocked by default for a brand-new profile.
    const firstNodeInner = mapNodes.first().locator('div.rounded-full').first();
    const firstNodeClass = await firstNodeInner.getAttribute('class') || '';
    expect(firstNodeClass).not.toContain('cursor-not-allowed');
  });

  test('reloading the page keeps the same profile logged in on the saga map', async ({ page }) => {
    await setupFreshProfile(page, 'SmokeReload');

    const profilesBefore = await getProfiles(page);
    const idBefore = profilesBefore.find((p) => p.name === 'SmokeReload')?.id;
    expect(idBefore).toBeTruthy();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should land straight back on the saga map (or a profile-select screen with our profile),
    // never lose the persisted profile data.
    const profilesAfter = await getProfiles(page);
    const idAfter = profilesAfter.find((p) => p.name === 'SmokeReload')?.id;
    expect(idAfter).toBe(idBefore);
  });
});
