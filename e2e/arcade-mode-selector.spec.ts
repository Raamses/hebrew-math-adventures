import { test, expect } from '@playwright/test';
import { setupFreshProfile } from './helpers';

test.describe('Arcade Mode Selector', () => {
  test.setTimeout(120000);

  test('Arcade button on saga map opens mode selector', async ({ page }) => {
    await setupFreshProfile(page, 'ArcadeTest1');

    const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();
    await expect(arcadeBtn).toBeVisible();
    await arcadeBtn.click();

    await expect(page.locator('[data-testid="arcade-mode-zen"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="arcade-mode-classic"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="arcade-mode-blitz"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="arcade-mode-survival"]').first()).toBeVisible();
  });

  test('Selecting zen mode launches bubble game', async ({ page }) => {
    await setupFreshProfile(page, 'ArcadeTest2');

    const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();
    await expect(arcadeBtn).toBeVisible();
    await arcadeBtn.click();

    const zenBtn = page.locator('[data-testid="arcade-mode-zen"]').first();
    await expect(zenBtn).toBeVisible();
    await zenBtn.click();

    const bubbles = page.locator('button[aria-label*="Pop bubble"]');
    await expect(bubbles.first()).toBeVisible({ timeout: 15000 });
  });

  test('Back/close button returns to saga map', async ({ page }) => {
    await setupFreshProfile(page, 'ArcadeTest3');

    const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();
    await expect(arcadeBtn).toBeVisible();
    await arcadeBtn.click();

    await expect(page.locator('[data-testid="arcade-mode-zen"]').first()).toBeVisible();

    // Try backdrop click or back button
    const backBtn = page.locator('button[aria-label="Back"], button[aria-label="חזרה"], button:has(svg.lucide-arrow-left)').first();
    if (await backBtn.count() > 0) {
        await backBtn.click();
    } else {
        await page.mouse.click(10, 10); // click backdrop
    }

    await expect(arcadeBtn).toBeVisible();
  });

  test('Each mode card shows Hebrew label', async ({ page }) => {
    await setupFreshProfile(page, 'ArcadeTest4');

    const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();
    await expect(arcadeBtn).toBeVisible();
    await arcadeBtn.click();

    const zenBtn = page.locator('[data-testid="arcade-mode-zen"]').first();
    await expect(zenBtn).toBeVisible();
    
    const bodyText = await page.textContent('body') || '';
    expect(bodyText).toMatch(/(מטרה|זן)/);
    expect(bodyText).toMatch(/(קלאסי)/);
    expect(bodyText).toMatch(/(בזק)/);
    expect(bodyText).toMatch(/(הישרדות)/);
  });
});
