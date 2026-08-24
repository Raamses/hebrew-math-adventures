/**
 * badge-unlocks.spec.ts
 *
 * E2E coverage for the badge collection screen and badge unlock popups.
 *
 * ── Badge Collection (from saga map menu) — 8 tests ──────────────────────
 *  1. Fresh profile: open collection from menu → 12 badges render
 *  2. All badges locked on fresh profile (grayscale + progress fraction)
 *  3. Locked badge shows progress fraction (e.g. "0/10", "0/500")
 *  4. Inject 1 unlocked badge → reopen → exactly 1 badge unlocked (no grayscale)
 *  5. Inject multiple unlocked badges → verify multiple unlocked
 *  6. Close collection → reopen → unlocked state persists from localStorage
 *  7. Unlocked badge shows localized name (not just emoji)
 *  8. Badge popup appears when a badge is newly unlocked (scaffolded)
 *
 * Selector strategy: BadgeCollection has data-testid="badge-collection".
 * Individual badges have data-testid="badge-{id}". The collection nav button
 * has data-testid="badge-collection-nav". BadgePopup has data-testid="badge-popup".
 *
 * Model: ask-claude --escalate --card 5b58c1f6-f8bb-41b5-a283-93b27d2d3186
 */

import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfile, openMenu } from './helpers';

// ─── Badge catalogue (mirrors src/data/badges.ts) ─────────────────────────

interface BadgeFixture {
  id: string;
  emoji: string;
  nameKey: string;
  descriptionKey: string;
  target: number;
}

const BADGES: BadgeFixture[] = [
  { id: 'first_steps',     emoji: '🌟', nameKey: 'badges.first_steps.name',     descriptionKey: 'badges.first_steps.desc',     target: 10 },
  { id: 'sharp_shooter',   emoji: '🎯', nameKey: 'badges.sharp_shooter.name',  descriptionKey: 'badges.sharp_shooter.desc',  target: 50 },
  { id: 'century',         emoji: '💯', nameKey: 'badges.century.name',         descriptionKey: 'badges.century.desc',        target: 100 },
  { id: 'on_fire',         emoji: '🔥', nameKey: 'badges.on_fire.name',         descriptionKey: 'badges.on_fire.desc',        target: 10 },
  { id: 'lightning',       emoji: '⚡', nameKey: 'badges.lightning.name',       descriptionKey: 'badges.lightning.desc',      target: 0 },
  { id: 'boss_slayer',     emoji: '👑', nameKey: 'badges.boss_slayer.name',    descriptionKey: 'badges.boss_slayer.desc',    target: 3 },
  { id: 'perfectionist',   emoji: '💎', nameKey: 'badges.perfectionist.name',  descriptionKey: 'badges.perfectionist.desc',  target: 3 },
  { id: 'dedicated',       emoji: '📅', nameKey: 'badges.dedicated.name',      descriptionKey: 'badges.dedicated.desc',      target: 3 },
  { id: 'weekly_warrior',  emoji: '🗓️', nameKey: 'badges.weekly_warrior.name',  descriptionKey: 'badges.weekly_warrior.desc', target: 7 },
  { id: 'bubble_master',   emoji: '🫧', nameKey: 'badges.bubble_master.name',  descriptionKey: 'badges.bubble_master.desc',  target: 500 },
  { id: 'streak_star',     emoji: '🏆', nameKey: 'badges.streak_star.name',    descriptionKey: 'badges.streak_star.desc',    target: 7 },
  { id: 'superstar',       emoji: '⭐', nameKey: 'badges.superstar.name',      descriptionKey: 'badges.superstar.desc',      target: 500 },
];

const PROFILES_KEY = 'hebrew-math-profiles';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Inject unlockedBadges into localStorage for the first profile. */
async function injectUnlockedBadges(page: Page, badgeIds: string[]): Promise<void> {
  await page.evaluate(({ key, ids }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const profiles = JSON.parse(raw);
    // Profiles may be stored as array or object
    const profileList = Array.isArray(profiles) ? profiles : Object.values(profiles);
    if (!profileList.length) return;
    const p = profileList[0] as Record<string, unknown>;
    p.unlockedBadges = ids;
    localStorage.setItem(key, JSON.stringify(profiles));
  }, { key: PROFILES_KEY, ids: badgeIds });
}

/** After page.reload(), re-select the first profile to get back to the saga map. */
async function reselectProfile(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(1500);
  // Check if we're on the saga map already
  const sagaNode = page.locator('[data-testid="saga-node-n1_1"]').first();
  const onMap = await sagaNode.isVisible().catch(() => false);
  if (onMap) return;
  // We're on the profile selector — click the first profile button
  const profileBtn = page.locator('button', { hasText: name }).first();
  if (await profileBtn.isVisible().catch(() => false)) {
    await profileBtn.click();
    await page.waitForTimeout(1500);
  }
  // Wait for saga map
  await expect(page.locator('[data-testid="saga-node-n1_1"]').first()).toBeVisible({ timeout: 15000 });
}

/** Open the badge collection modal from the saga map menu. */
async function openBadgeCollection(page: Page): Promise<void> {
  await openMenu(page);
  const badgeBtn = page.locator('[data-testid="badge-collection-nav"]').first();
  await expect(badgeBtn).toBeVisible({ timeout: 5000 });
  await badgeBtn.click();
  // Wait for collection modal to appear
  const modal = page.locator('[data-testid="badge-collection"]').first();
  await expect(modal).toBeVisible({ timeout: 10000 });
}

/** Close the badge collection modal. */
async function closeBadgeCollection(page: Page): Promise<void> {
  const closeBtn = page.locator('[data-testid="badge-collection-close"]').first();
  await expect(closeBtn).toBeVisible({ timeout: 5000 });
  await closeBtn.click();
  await page.waitForTimeout(500);
}

// ─── Tests ────────────────────────────────────────────────────────────────

test.describe('Badge Unlocks and Collection Screen', () => {

  test('1. Fresh profile: collection opens from menu with 12 badges', async ({ page }) => {
    await setupFreshProfile(page, 'BadgeTester');
    await openBadgeCollection(page);

    const modal = page.locator('[data-testid="badge-collection"]').first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify all 12 badges are rendered
    for (const badge of BADGES) {
      const badgeEl = modal.locator(`[data-testid="badge-${badge.id}"]`);
      await expect(badgeEl).toBeVisible({ timeout: 5000 });
    }
  });

  test('2. All badges locked on fresh profile (grayscale)', async ({ page }) => {
    await setupFreshProfile(page, 'BadgeTester');
    await openBadgeCollection(page);

    const modal = page.locator('[data-testid="badge-collection"]').first();
    // All badges should have grayscale class on the emoji span
    for (const badge of BADGES) {
      const badgeEl = modal.locator(`[data-testid="badge-${badge.id}"]`);
      const emojiSpan = badgeEl.locator('span.text-3xl');
      const classAttr = await emojiSpan.getAttribute('class') || '';
      expect(classAttr).toContain('grayscale');
    }
  });

  test('3. Locked badge shows progress fraction', async ({ page }) => {
    await setupFreshProfile(page, 'BadgeTester');
    await openBadgeCollection(page);

    const modal = page.locator('[data-testid="badge-collection"]').first();
    // Look for fraction text like "0/10", "0/50", "0/500"
    const progressTexts = modal.locator('text=/\\d+\\/\\d+/');
    const count = await progressTexts.count();
    // Badges with progress functions should show fractions; badges without progress show "locked" text
    // 10 out of 12 badges have progress functions (all except 'lightning' which has no progress fn)
    expect(count).toBeGreaterThanOrEqual(10);

    // At least one should show 0/N for a fresh profile
    const firstText = await progressTexts.first().textContent();
    expect(firstText).toMatch(/^0\/\d+$/);
  });

  test('4. Inject 1 unlocked badge → exactly 1 badge unlocked', async ({ page }) => {
    await setupFreshProfile(page, 'BadgeTester');
    // Inject first_steps as unlocked
    await injectUnlockedBadges(page, ['first_steps']);
    await page.reload();
    await page.waitForTimeout(2000);
    await reselectProfile(page, 'BadgeTester');
    await openBadgeCollection(page);

    const modal = page.locator('[data-testid="badge-collection"]').first();

    // The first_steps badge (🌟) should NOT have grayscale
    const firstStepsBadge = modal.locator('[data-testid="badge-first_steps"]');
    const firstStepsEmoji = firstStepsBadge.locator('span.text-3xl');
    const firstStepsClass = await firstStepsEmoji.getAttribute('class') || '';
    expect(firstStepsClass).not.toContain('grayscale');

    // All other badges should still have grayscale
    let unlockedCount = 0;
    for (const badge of BADGES) {
      const badgeEl = modal.locator(`[data-testid="badge-${badge.id}"]`);
      const emojiSpan = badgeEl.locator('span.text-3xl');
      const classAttr = await emojiSpan.getAttribute('class') || '';
      if (!classAttr.includes('grayscale')) {
        unlockedCount++;
      }
    }
    expect(unlockedCount).toBe(1);
  });

  test('5. Inject multiple unlocked badges → multiple unlocked', async ({ page }) => {
    await setupFreshProfile(page, 'BadgeTester');
    // Inject 3 badges: first_steps, on_fire, boss_slayer
    await injectUnlockedBadges(page, ['first_steps', 'on_fire', 'boss_slayer']);
    await page.reload();
    await page.waitForTimeout(2000);
    await reselectProfile(page, 'BadgeTester');
    await openBadgeCollection(page);

    const modal = page.locator('[data-testid="badge-collection"]').first();

    // Count unlocked (non-grayscale) badges
    let unlockedCount = 0;
    for (const badge of BADGES) {
      const badgeEl = modal.locator(`[data-testid="badge-${badge.id}"]`);
      const emojiSpan = badgeEl.locator('span.text-3xl');
      const classAttr = await emojiSpan.getAttribute('class') || '';
      if (!classAttr.includes('grayscale')) {
        unlockedCount++;
      }
    }
    expect(unlockedCount).toBe(3);

    // Verify specific badges are unlocked
    for (const id of ['first_steps', 'on_fire', 'boss_slayer']) {
      const badgeEl = modal.locator(`[data-testid="badge-${id}"]`);
      const emojiSpan = badgeEl.locator('span.text-3xl');
      const classAttr = await emojiSpan.getAttribute('class') || '';
      expect(classAttr).not.toContain('grayscale');
    }
  });

  test('6. Close collection → reopen → unlocked state persists', async ({ page }) => {
    await setupFreshProfile(page, 'BadgeTester');
    await injectUnlockedBadges(page, ['first_steps', 'century']);
    await page.reload();
    await page.waitForTimeout(2000);
    await reselectProfile(page, 'BadgeTester');
    await openBadgeCollection(page);

    const modal = page.locator('[data-testid="badge-collection"]').first();

    // Count unlocked before close
    let unlockedBefore = 0;
    for (const badge of BADGES) {
      const badgeEl = modal.locator(`[data-testid="badge-${badge.id}"]`);
      const emojiSpan = badgeEl.locator('span.text-3xl');
      const classAttr = await emojiSpan.getAttribute('class') || '';
      if (!classAttr.includes('grayscale')) unlockedBefore++;
    }
    expect(unlockedBefore).toBe(2);

    // Close collection
    await closeBadgeCollection(page);

    // Reopen
    await openBadgeCollection(page);
    const modal2 = page.locator('[data-testid="badge-collection"]').first();

    // Count unlocked after reopen
    let unlockedAfter = 0;
    for (const badge of BADGES) {
      const badgeEl = modal2.locator(`[data-testid="badge-${badge.id}"]`);
      const emojiSpan = badgeEl.locator('span.text-3xl');
      const classAttr = await emojiSpan.getAttribute('class') || '';
      if (!classAttr.includes('grayscale')) unlockedAfter++;
    }
    expect(unlockedAfter).toBe(unlockedBefore);
  });

  test('7. Unlocked badge shows localized name', async ({ page }) => {
    await setupFreshProfile(page, 'BadgeTester');
    await injectUnlockedBadges(page, ['first_steps']);
    await page.reload();
    await page.waitForTimeout(2000);
    await reselectProfile(page, 'BadgeTester');
    await openBadgeCollection(page);

    const modal = page.locator('[data-testid="badge-collection"]').first();

    // The first_steps badge should show its name (localized via i18n)
    const firstStepsBadge = modal.locator('[data-testid="badge-first_steps"]');
    await expect(firstStepsBadge).toBeVisible({ timeout: 5000 });

    // The badge name is in a span with class "text-xs font-bold" and uses t(nameKey)
    // In Hebrew (default), it should show the Hebrew translation
    // Verify the name span has non-empty text
    const nameSpan = firstStepsBadge.locator('span.text-xs.font-bold');
    const nameText = await nameSpan.textContent();
    expect(nameText).toBeTruthy();
    expect(nameText!.trim().length).toBeGreaterThan(0);

    // The unlocked badge name should have text-slate-700 (not text-slate-400)
    const nameClass = await nameSpan.getAttribute('class') || '';
    expect(nameClass).toContain('text-slate-700');
  });

  test('8. Badge popup appears on new badge unlock (scaffolded)', async ({ page }) => {
    test.fixme(true,
      'BadgePopup component exists with data-testid="badge-popup" but is not yet wired ' +
      'into the app. When a badge is newly unlocked during gameplay (e.g. first correct ' +
      'answer triggers first_steps badge), the BadgePopup should render with the badge ' +
      'emoji, localized name, and a dismiss button (data-testid="badge-popup-dismiss"). ' +
      'This test will be enabled once BadgePopup is integrated into the game flow.'
    );
  });

});
