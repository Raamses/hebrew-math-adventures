/**
 * treasure-shop-parent-economy.spec.ts
 *
 * E2E coverage for the child-facing Treasure Shop and the parent gifting economy.
 *
 * ── Treasure Shop (child flow) — 10 runnable tests ────────────────────────
 *  1. Shop opens from the saga map hamburger menu (title + coin balance)
 *  2. All 11 items render across the 3 categories (emoji, name, price)
 *  3. Fresh profile (0 coins) → every buy button is disabled
 *  4. Purchase with sufficient coins → coins drop, item flips to "equip"
 *  5. Purchase with insufficient funds → buy button disabled
 *  6. Equip an owned item → green border + "equipped" label, button gone
 *  7. Buy two items → both show an equip button, both persisted
 *  8. Equip two mascots in turn → only the latest stays equipped
 *  9. Close + reopen the shop → owned/equipped/coins survive
 * 10. Coin badge reflects the exact balance before and after a purchase
 *
 * ── Parent games economy wiring — 5 runnable tests ───────────────────────
 * 11. Child flow invisibility guard: parent mechanics stay 100% invisible to
 *     the child flow; no toast on saga map, child lesson does not write parent
 *     economy storage, child coins unchanged.
 * 12. Coin toast: completing Parent Blitz renders parent-games-coin-toast with
 *     parent-games-coin-toast-amount matching /^\+\d+$/.
 * 13. Idempotent replay: playing Blitz twice accumulates games and coins
 *     matching the calculation without double counting.
 * 14. Fresh mount: reopening games list and game does not create phantom records
 *     or toasts.
 * 15. Child visibility guard: coin toast is never present in the saga map subtree.
 *
 * Selector strategy: TreasureShop has no data-testid attributes, so the shop
 * is located by its heading and item cards are located by their (unique)
 * emoji. Language is English (headless Chrome navigator) after localStorage
 * clear; selectors match both en and he where the app may switch. See
 * NEEDED_TESTIDS for the data-testid follow-up.
 *
 * Model: claude-opus-5
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { setupFreshProfile, openMenu, solveParentGate, selectArcadeMode } from './helpers';
import { evalBlitzExpression } from '../src/components/parent/games/blitzEval';
import { calculateCoinsEarned } from '../src/components/parent/games/parentEconomyEngine';

  // Global timeout is 180s — no need for local override

const PROFILES_KEY = 'hebrew-math-profiles';
const PARENT_ECONOMY_KEY = 'hebrew-math-parent-economy';

/**
 * data-testids that would let these tests drop the structural selectors below.
 * Kept here so the follow-up patch is obvious:
 *   TreasureShop        → treasure-shop, shop-coin-balance,
 *                         shop-item-<id>, shop-buy-<id>, shop-equip-<id>,
 *                         shop-close
 *   Parent economy      → parent-games-coin-toast, parent-games-coin-toast-amount
 */

// ─── Shop item catalogue (mirrors src/data/shopItems.ts) ──────────────────

interface ShopItemFixture {
  id: string;
  emoji: string;
  price: number;
  he: string;
  category: 'mascot' | 'bubble_skin' | 'particle_effect';
}

const SHOP_ITEMS: ShopItemFixture[] = [
  { id: 'mascot_fox', emoji: '🦊', price: 50, he: 'Fox', category: 'mascot' },
  { id: 'mascot_penguin', emoji: '🐧', price: 50, he: 'Penguin', category: 'mascot' },
  { id: 'mascot_unicorn', emoji: '🦄', price: 80, he: 'Unicorn', category: 'mascot' },
  { id: 'mascot_dragon', emoji: '🐉', price: 120, he: 'Dragon', category: 'mascot' },
  { id: 'skin_star', emoji: '⭐', price: 30, he: 'Star', category: 'bubble_skin' },
  { id: 'skin_apple', emoji: '🍎', price: 30, he: 'Apple', category: 'bubble_skin' },
  { id: 'skin_rainbow', emoji: '🌈', price: 60, he: 'Rainbow', category: 'bubble_skin' },
  { id: 'skin_crystal', emoji: '🔮', price: 40, he: 'Crystal', category: 'bubble_skin' },
  { id: 'fx_confetti', emoji: '🎉', price: 25, he: 'Confetti', category: 'particle_effect' },
  { id: 'fx_fireworks', emoji: '🎆', price: 40, he: 'Fireworks', category: 'particle_effect' },
  { id: 'fx_sparkle', emoji: '✨', price: 20, he: 'Sparkle', category: 'particle_effect' },
];

const byId = (id: string): ShopItemFixture => {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown shop item fixture: ${id}`);
  return item;
};

// Hebrew i18n strings (app defaults to lng: 'he').
const HE = {
  // App uses i18next LanguageDetector; after localStorage.clear() the
  // navigator language kicks in (en in headless Chrome), so the UI
  // renders in English. Use English selectors and match Hebrew where
  // the app does render it (item names come from he.json via t() when
  // the detected language is he — but here it's en).
  shopTitle: 'Treasure Shop',
  equip: 'Equip',
  equipped: 'Equipped',
  close: 'Close',
  categoryMascot: 'Mascots',
  categorySkin: 'Bubble Skins',
  categoryEffect: 'Particle Effects',
  parentEconomyCoins: 'Parent Coins',
  giftToChild: 'Gift to Child',
  sendGift: 'Send Gift',
} as const;

// Hebrew item names (used in the test fixtures) — these match the en.json
// translations when the browser language is English.
const HE_ITEMS: Record<string, string> = {
  mascot_fox: 'Fox',
  mascot_penguin: 'Penguin',
  mascot_unicorn: 'Unicorn',
  mascot_dragon: 'Dragon',
  skin_star: 'Star',
  skin_apple: 'Apple',
  skin_rainbow: 'Rainbow',
  skin_crystal: 'Crystal',
  fx_confetti: 'Confetti',
  fx_fireworks: 'Fireworks',
  fx_sparkle: 'Sparkle',
};

// ─── Shop locators ───────────────────────────────────────────────────────

/**
 * The shop modal card. Matched on the class set from TreasureShop.tsx
 * ("bg-white rounded-3xl p-5 m-4 max-w-md w-full shadow-2xl") because the
 * component exposes no data-testid. Order-independent, but styling churn
 * will break it — add data-testid="treasure-shop" and simplify.
 */
function shopCard(page: Page): Locator {
  return page.locator('div.bg-white.rounded-3xl.max-w-md.w-full.shadow-2xl').first();
}

/** The `<span>` holding the numeric coin balance in the shop header. */
function shopCoinBalance(page: Page): Locator {
  return shopCard(page).locator('span.text-yellow-700').first();
}

/**
 * An item card, located by its emoji (unique across all 11 items).
 * The items grid is `max-h-[60vh] overflow-y-auto`, and on the 390x844
 * test viewport the third category sits below the fold — always scroll
 * before asserting visibility or clicking.
 */
function itemCard(page: Page, itemId: string): Locator {
  return shopCard(page)
    .locator('div.rounded-2xl.border-2')
    .filter({ hasText: byId(itemId).emoji })
    .first();
}

/**
 * The single action button inside an item card. Renders as the buy button
 * (`🪙 <price>`) when unowned, the equip button when owned, and is absent
 * entirely when the item is equipped (a plain span replaces it).
 */
function itemButton(page: Page, itemId: string): Locator {
  return itemCard(page, itemId).locator('button').first();
}

async function revealItem(page: Page, itemId: string): Promise<Locator> {
  const card = itemCard(page, itemId);
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  return card;
}

/** Open the shop from the saga map hamburger menu (button has aria-label only). */
async function openShop(page: Page): Promise<void> {
  await openMenu(page);
  // Shop button aria-label is t('shop.title') — "Treasure Shop" (en) or "חנות האוצרות" (he).
  const shopBtn = page.locator('button[aria-label="Treasure Shop"], button[aria-label="חנות האוצרות"]').first();
  await expect(shopBtn).toBeVisible({ timeout: 10000 });
  await shopBtn.click();
  await page.waitForTimeout(800);
  await expect(shopCard(page)).toBeVisible({ timeout: 10000 });
  await expect(
    shopCard(page).getByRole('heading', { name: /^Treasure Shop$|^חנות האוצרות$/ }),
  ).toBeVisible({ timeout: 5000 });
}

async function closeShop(page: Page): Promise<void> {
  await shopCard(page).getByRole('button', { name: /^Close$|^סגור$/ }).click();
  await page.waitForTimeout(800);
  await expect(shopCard(page)).toBeHidden({ timeout: 5000 });
}

/** Buy an item by clicking its buy button, then wait out the 1s flash animation. */
async function buyItem(page: Page, itemId: string): Promise<void> {
  await revealItem(page, itemId);
  const btn = itemButton(page, itemId);
  await expect(btn).toBeEnabled({ timeout: 5000 });
  await expect(btn).toContainText(String(byId(itemId).price));
  await btn.click();
  await page.waitForTimeout(1200);
}

async function equipItem(page: Page, itemId: string): Promise<void> {
  await revealItem(page, itemId);
  const btn = itemButton(page, itemId);
  await expect(btn).toHaveText(/^Equip$|^הצג$/, { timeout: 5000 });
  await btn.click();
  await page.waitForTimeout(1200);
}

// ─── State assertions ────────────────────────────────────────────────────

async function expectBuyState(page: Page, itemId: string, opts: { affordable: boolean }) {
  const item = byId(itemId);
  await revealItem(page, itemId);
  const btn = itemButton(page, itemId);
  await expect(btn, `${itemId} should show its price`).toContainText(String(item.price));
  if (opts.affordable) {
    await expect(btn, `${itemId} should be buyable`).toBeEnabled();
  } else {
    await expect(btn, `${itemId} should be unaffordable`).toBeDisabled();
  }
}

async function expectOwnedState(page: Page, itemId: string) {
  const card = await revealItem(page, itemId);
  await expect(card, `${itemId} should have the owned border`).toHaveClass(/border-blue-200/);
  await expect(itemButton(page, itemId), `${itemId} should offer equip`).toHaveText(/^Equip$|^הצג$/);
}

async function expectEquippedState(page: Page, itemId: string) {
  const card = await revealItem(page, itemId);
  await expect(card, `${itemId} should have the equipped border`).toHaveClass(/border-green-400/);
  await expect(card, `${itemId} should read as equipped`).toContainText(/Equipped|מוצג/);
  await expect(
    card.locator('button'),
    `${itemId} should expose no action button while equipped`,
  ).toHaveCount(0);
}

// ─── localStorage helpers ────────────────────────────────────────────────

interface StoredProfile {
  id: string;
  name: string;
  coins?: number;
  ownedItems?: string[];
  equippedItems?: Record<string, string>;
}

async function readProfile(page: Page, name: string): Promise<StoredProfile | null> {
  return await page.evaluate(
    ({ key, name }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        const list = (Array.isArray(parsed) ? parsed : Object.values(parsed)) as StoredProfile[];
        return list.find((p) => p.name === name) ?? null;
      } catch {
        return null;
      }
    },
    { key: PROFILES_KEY, name },
  );
}

/**
 * Create a fresh profile, then give it `coins` via localStorage and reload so
 * ProfileProvider re-hydrates the balance into React state (writing
 * localStorage alone would not update the live context). Mirrors the
 * inject-then-reload pattern in setupFreshProfileWithPracticeAccess.
 */
async function setupProfileWithCoins(page: Page, name: string, coins: number): Promise<void> {
  await setupFreshProfile(page, name);

  const injected = await page.evaluate(
    ({ key, name, coins }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return `no ${key} in localStorage`;
      const parsed = JSON.parse(raw);
      // Profiles persist as an array; tolerate an object map just in case.
      const list = (Array.isArray(parsed) ? parsed : Object.values(parsed)) as Array<{
        name: string;
        coins?: number;
      }>;
      const profile = list.find((p) => p.name === name);
      if (!profile) return `profile '${name}' not found`;
      profile.coins = coins;
      // `list` holds live references, so re-serialising `parsed` keeps the shape.
      localStorage.setItem(key, JSON.stringify(parsed));
      return `set coins=${coins} for '${name}'`;
    },
    { key: PROFILES_KEY, name, coins },
  );
  console.log('[coin injection]', injected);
  expect(injected, 'coin injection should succeed').toContain(`set coins=${coins}`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Reload drops us back on the ProfileSelector — re-enter the profile.
  const profileBtn = page.locator('button', { hasText: name }).first();
  await expect(profileBtn).toBeVisible({ timeout: 10000 });
  await profileBtn.click();
  await expect(page.locator('[data-testid="saga-node-n1_1"]').first()).toBeVisible({
    timeout: 30000,
  });
  await page.waitForTimeout(500);

  // Sanity-check the saga map header picked up the balance.
  // aria-label is `${coins} ${t('shop.coins', 'מטבעות')}` — renders as
  // "N Coins" in English or "N מטבעות" in Hebrew depending on detected lng.
  const headerCoins = page.locator(`[aria-label="${coins} Coins"], [aria-label="${coins} מטבעות"]`).first();
  await expect(headerCoins, 'saga map header should show injected coins').toBeVisible({
    timeout: 10000,
  });
}

// =========================================================================
//  Treasure Shop — child flow
// =========================================================================

test.describe('Treasure Shop (child flow)', () => {
  test('1. opens from the saga map menu with title and coin balance', async ({ page }) => {
    await setupFreshProfile(page, 'ShopOpen');
    await openShop(page);

    await expect(shopCard(page).getByRole('heading', { name: HE.shopTitle })).toBeVisible();
    await expect(shopCoinBalance(page)).toHaveText('0');
    await expect(shopCard(page)).toContainText('🪙');
  });

  test('2. renders all 11 items across the 3 categories', async ({ page }) => {
    await setupFreshProfile(page, 'ShopCatalog');
    await openShop(page);

    const card = shopCard(page);
    await expect(card).toContainText(HE.categoryMascot);
    await expect(card).toContainText(HE.categorySkin);
    await expect(card).toContainText(HE.categoryEffect);

    // One card per item, no duplicates or drops.
    await expect(card.locator('div.rounded-2xl.border-2')).toHaveCount(SHOP_ITEMS.length);

    for (const item of SHOP_ITEMS) {
      const itemLoc = await revealItem(page, item.id);
      await expect(itemLoc, `${item.id} card visible`).toBeVisible();
      await expect(itemLoc, `${item.id} shows emoji`).toContainText(item.emoji);
      await expect(itemLoc, `${item.id} shows Hebrew name`).toContainText(item.he);
      await expect(itemLoc, `${item.id} shows price`).toContainText(String(item.price));
    }
  });

  test('3. fresh profile with 0 coins cannot afford anything', async ({ page }) => {
    await setupFreshProfile(page, 'ShopBroke');
    await openShop(page);

    await expect(shopCoinBalance(page)).toHaveText('0');
    for (const item of SHOP_ITEMS) {
      await expectBuyState(page, item.id, { affordable: false });
    }

    // Nothing owned or equipped yet.
    const stored = await readProfile(page, 'ShopBroke');
    expect(stored?.ownedItems ?? []).toEqual([]);
    expect(stored?.equippedItems ?? {}).toEqual({});
  });

  test('4. buying with sufficient coins debits the balance and unlocks equip', async ({ page }) => {
    const sparkle = byId('fx_sparkle'); // cheapest item, 20 coins
    await setupProfileWithCoins(page, 'ShopBuyer', 20);
    await openShop(page);

    await expect(shopCoinBalance(page)).toHaveText('20');
    await buyItem(page, sparkle.id);

    await expect(shopCoinBalance(page)).toHaveText('0');
    await expectOwnedState(page, sparkle.id);

    const stored = await readProfile(page, 'ShopBuyer');
    expect(stored?.coins).toBe(0);
    expect(stored?.ownedItems).toContain(sparkle.id);
  });

  test('5. buy button is disabled when coins are insufficient', async ({ page }) => {
    await setupProfileWithCoins(page, 'ShopShort', 10);
    await openShop(page);

    await expect(shopCoinBalance(page)).toHaveText('10');

    // 10 coins is below every price in the catalogue (cheapest is 20).
    await expectBuyState(page, 'mascot_fox', { affordable: false }); // 50
    await expectBuyState(page, 'fx_sparkle', { affordable: false }); // 20

    // Clicking the disabled button must not spend or grant anything.
    await itemButton(page, 'mascot_fox').click({ force: true });
    await page.waitForTimeout(600);
    await expect(shopCoinBalance(page)).toHaveText('10');

    const stored = await readProfile(page, 'ShopShort');
    expect(stored?.coins).toBe(10);
    expect(stored?.ownedItems ?? []).not.toContain('mascot_fox');
  });

  test('6. equipping an owned item shows the equipped state', async ({ page }) => {
    await setupProfileWithCoins(page, 'ShopEquip', 60);
    await openShop(page);

    await buyItem(page, 'mascot_fox'); // 50
    await expectOwnedState(page, 'mascot_fox');

    await equipItem(page, 'mascot_fox');
    await expectEquippedState(page, 'mascot_fox');

    const stored = await readProfile(page, 'ShopEquip');
    expect(stored?.equippedItems?.mascot).toBe('mascot_fox');
    expect(stored?.coins).toBe(10);
  });

  test('7. buying two items leaves both owned', async ({ page }) => {
    await setupProfileWithCoins(page, 'ShopMulti', 100);
    await openShop(page);

    await buyItem(page, 'fx_sparkle'); // 20 → 80 left
    await expect(shopCoinBalance(page)).toHaveText('80');

    await buyItem(page, 'fx_confetti'); // 25 → 55 left
    await expect(shopCoinBalance(page)).toHaveText('55');

    await expectOwnedState(page, 'fx_sparkle');
    await expectOwnedState(page, 'fx_confetti');

    const stored = await readProfile(page, 'ShopMulti');
    expect(stored?.coins).toBe(55);
    expect(stored?.ownedItems).toEqual(
      expect.arrayContaining(['fx_sparkle', 'fx_confetti']),
    );
  });

  test('8. equipping a second item in a category replaces the first', async ({ page }) => {
    await setupProfileWithCoins(page, 'ShopSwap', 100);
    await openShop(page);

    await buyItem(page, 'mascot_fox'); // 50
    await buyItem(page, 'mascot_penguin'); // 50 → 0 left
    await expect(shopCoinBalance(page)).toHaveText('0');

    await equipItem(page, 'mascot_fox');
    await expectEquippedState(page, 'mascot_fox');
    await expectOwnedState(page, 'mascot_penguin');

    await equipItem(page, 'mascot_penguin');
    await expectEquippedState(page, 'mascot_penguin');
    // Fox falls back to owned-but-not-equipped — only one per category.
    await expectOwnedState(page, 'mascot_fox');

    const stored = await readProfile(page, 'ShopSwap');
    expect(stored?.equippedItems?.mascot).toBe('mascot_penguin');
    expect(Object.keys(stored?.equippedItems ?? {})).toEqual(['mascot']);
  });

  test('9. state survives closing and reopening the shop', async ({ page }) => {
    await setupProfileWithCoins(page, 'ShopPersist', 100);
    await openShop(page);

    await buyItem(page, 'skin_star'); // 30 → 70 left
    await equipItem(page, 'skin_star');
    await buyItem(page, 'fx_sparkle'); // 20 → 50 left
    await expectEquippedState(page, 'skin_star');

    await closeShop(page);
    await openShop(page);

    await expect(shopCoinBalance(page)).toHaveText('50');
    await expectEquippedState(page, 'skin_star');
    await expectOwnedState(page, 'fx_sparkle');
    await expectBuyState(page, 'mascot_dragon', { affordable: false }); // 120 > 50

    const stored = await readProfile(page, 'ShopPersist');
    expect(stored?.coins).toBe(50);
    expect(stored?.ownedItems).toEqual(expect.arrayContaining(['skin_star', 'fx_sparkle']));
    expect(stored?.equippedItems?.bubble_skin).toBe('skin_star');
  });

  test('10. coin badge tracks the exact balance through a purchase', async ({ page }) => {
    await setupProfileWithCoins(page, 'ShopCoins', 65);
    await openShop(page);

    await expect(shopCoinBalance(page)).toHaveText('65');

    // 65 coins: crystal (40) is affordable, rainbow (60) is affordable,
    // unicorn (80) is not — verifies the affordability boundary too.
    await expectBuyState(page, 'skin_crystal', { affordable: true });
    await expectBuyState(page, 'skin_rainbow', { affordable: true });
    await expectBuyState(page, 'mascot_unicorn', { affordable: false });

    await buyItem(page, 'skin_crystal'); // 65 - 40 = 25
    await expect(shopCoinBalance(page)).toHaveText('25');

    // Rainbow (60) is no longer affordable after the debit.
    await expectBuyState(page, 'skin_rainbow', { affordable: false });
    await expectBuyState(page, 'fx_sparkle', { affordable: true }); // 20 ≤ 25

    expect((await readProfile(page, 'ShopCoins'))?.coins).toBe(25);
  });
});

// =========================================================================
//  Parent games economy wiring
// =========================================================================

test.describe('Parent games economy wiring', () => {
  /**
   * Injected parent economy state. Written before the app boots so it is in
   * place for whatever eventually reads PARENT_ECONOMY_KEY.
   */
  function parentEconomyState(overrides: Record<string, unknown> = {}) {
    return {
      coins: 120,
      totalCoinsEarned: 300,
      totalGamesPlayed: 0,
      streak: 5,
      bestStreak: 9,
      lastPlayedDate: '2026-08-20',
      unlockedBadges: ['first-game', 'streak-7'],
      giftHistory: [],
      totalGiftedCoins: 0,
      gameHighScores: {},
      gameWinCounts: {},
      streakFreezeHistory: [],
      ...overrides,
    };
  }

  /**
   * Seed economy state directly (not via addInitScript). An init script would
   * re-seed on every navigation, which would silently mask any real write and
   * make the "state is untouched" assertion vacuous.
   * Must be called when a page is already loaded.
   */
  async function seedParentEconomy(page: Page, state: Record<string, unknown>) {
    await page.evaluate(
      ({ key, state }) => {
        localStorage.setItem(key, JSON.stringify(state));
      },
      { key: PARENT_ECONOMY_KEY, state },
    );
  }

  /**
   * Open the parent gate from the saga map hamburger menu and solve it.
   */
  async function openParentGateFromMap(page: Page) {
    await openMenu(page);
    const parentZoneBtn = page.locator('[data-testid="parent-zone-button"]').first();
    await expect(parentZoneBtn).toBeVisible({ timeout: 5000 });
    await parentZoneBtn.click();
    await page.waitForTimeout(800);

    const gate = page.locator('[data-testid="parent-gate"]').first();
    await expect(gate).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);

    const problemEl = gate.locator('[data-testid="parent-gate-problem"]').first();
    await expect(problemEl).toBeVisible({ timeout: 5000 });
    const problemText = (await problemEl.textContent()) || '';
    const problemMatch = problemText.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
    if (!problemMatch) {
      throw new Error(`Could not parse parent gate problem from text: "${problemText}"`);
    }
    const sum = parseInt(problemMatch[1]) + parseInt(problemMatch[2]);

    await solveParentGate(page, sum);

    await expect(page.locator('[data-testid="parent-dashboard"]').first()).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * Play blitz until finished (results screen visible) and return final score.
   */
  async function playBlitzSession(page: Page): Promise<number> {
    const startBtn = page.locator('[data-testid="parent-blitz-start"], [data-testid="parent-blitz-replay"]').first();
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();
    await page.waitForTimeout(500);

    const maxWaitMs = 120_000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const results = page.locator('[data-testid="parent-blitz-results"]').first();
      if (await results.isVisible().catch(() => false)) {
        break;
      }

      const questionEl = page.locator('[data-testid="parent-blitz-question"]').first();
      if (await questionEl.isVisible().catch(() => false)) {
        const qText = (await questionEl.textContent()) || '';
        const ans = evalBlitzExpression(qText);
        if (ans !== null && ans >= 0) {
          const digits = String(ans);
          for (const d of digits) {
            const keyBtn = page.locator(`[data-testid="parent-blitz-key-${d}"]`).first();
            if (await keyBtn.isVisible().catch(() => false)) {
              await keyBtn.click().catch(() => {});
            }
          }
          const submitBtn = page.locator('[data-testid="parent-blitz-key-submit"]').first();
          if (await submitBtn.isVisible().catch(() => false)) {
            await submitBtn.click().catch(() => {});
          }
        } else {
          const skipBtn = page.locator('[data-testid="parent-blitz-skip"]').first();
          if (await skipBtn.isVisible().catch(() => false)) {
            await skipBtn.click().catch(() => {});
          }
        }
      }
      await page.waitForTimeout(600);
    }

    const results = page.locator('[data-testid="parent-blitz-results"]').first();
    await expect(results).toBeVisible({ timeout: 15000 });

    const finalScoreEl = page.locator('[data-testid="parent-blitz-final-score"]').first();
    const scoreText = (await finalScoreEl.textContent())?.trim() || '0';
    return parseInt(scoreText, 10);
  }

  test('11. child-invisibility guard: parent mechanics stay 100% invisible to child flow', async ({ page }) => {
    await setupFreshProfile(page, 'ChildFlowGuard');

    // Fresh profile on saga map: assert NO element with data-testid="parent-games-coin-toast" anywhere
    await expect(page.locator('[data-testid="parent-games-coin-toast"]')).toHaveCount(0);

    const profileBefore = await readProfile(page, 'ChildFlowGuard');
    const childCoinsBefore = profileBefore?.coins ?? 0;

    // Play ONE real child lesson through saga map (openMenu / arcade)
    await selectArcadeMode(page, 'zen');
    await page.waitForTimeout(1000);

    // Exit back to map via settings -> pause -> exit to map
    const settingsBtn = page.locator('button[aria-label*="Settings"], button[aria-label*="הגדרות"]').first();
    if (await settingsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(300);
      const pauseBtn = page.locator('button[aria-label*="Pause"], button[aria-label*="השהה"]').first();
      if (await pauseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pauseBtn.click();
        await page.waitForTimeout(500);
        const exitBtn = page.locator('button[aria-label*="Exit to Map"], button[aria-label*="חזרה למפה"]').first();
        if (await exitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await exitBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Back on saga map
    await expect(page.locator('[data-testid="saga-node-n1_1"]').first()).toBeVisible({ timeout: 15000 });

    // Assert localStorage hebrew-math-parent-economy is STILL absent
    const parentEconomy = await page.evaluate(
      (key) => localStorage.getItem(key),
      PARENT_ECONOMY_KEY,
    );
    expect(parentEconomy, 'parent economy storage should be absent in child flow').toBeNull();

    // Child coin balance unchanged by parent economy code
    const profileAfter = await readProfile(page, 'ChildFlowGuard');
    expect(profileAfter?.coins ?? 0).toBe(childCoinsBefore);

    // Toast still absent
    await expect(page.locator('[data-testid="parent-games-coin-toast"]')).toHaveCount(0);
  });

  test('12. coin toast appears with earned amount after completing parent blitz', async ({ page }) => {
    await setupFreshProfile(page, 'ParentToast');
    await openParentGateFromMap(page);

    // Click Games tab
    const gamesTab = page.locator('[data-testid="parent-dashboard"] button').filter({ hasText: /משחקים|Games/ }).first();
    await expect(gamesTab).toBeVisible({ timeout: 5000 });
    await gamesTab.click();
    await page.waitForTimeout(500);

    // Open Blitz
    const blitzCard = page.locator('[data-testid="game-card-parent-blitz"]').first();
    await expect(blitzCard).toBeVisible({ timeout: 5000 });
    await blitzCard.click();
    await page.waitForTimeout(500);

    // Start blitz & play
    await playBlitzSession(page);

    // Toast becomes visible
    const toast = page.locator('[data-testid="parent-games-coin-toast"]');
    await expect(toast).toBeVisible({ timeout: 10000 });

    const toastAmount = page.locator('[data-testid="parent-games-coin-toast-amount"]');
    await expect(toastAmount).toBeVisible({ timeout: 5000 });
    const amountText = (await toastAmount.textContent())?.trim() || '';
    expect(amountText).toMatch(/^\+\d+$/);
  });

  test('13. idempotent replay: playing Blitz twice accumulates games and coins matching calculation without double counting', async ({ page }) => {
    await setupFreshProfile(page, 'IdempotentReplay');
    const initialSeed = parentEconomyState({ coins: 50, totalGamesPlayed: 0 });
    await seedParentEconomy(page, initialSeed);

    await openParentGateFromMap(page);

    const gamesTab = page.locator('[data-testid="parent-dashboard"] button').filter({ hasText: /משחקים|Games/ }).first();
    await expect(gamesTab).toBeVisible({ timeout: 5000 });
    await gamesTab.click();
    await page.waitForTimeout(500);

    const blitzCard = page.locator('[data-testid="game-card-parent-blitz"]').first();
    await expect(blitzCard).toBeVisible({ timeout: 5000 });
    await blitzCard.click();
    await page.waitForTimeout(500);

    // First session
    const score1 = await playBlitzSession(page);
    await expect(page.locator('[data-testid="parent-games-coin-toast"]')).toBeVisible({ timeout: 10000 });

    // Replay session
    const score2 = await playBlitzSession(page);
    await expect(page.locator('[data-testid="parent-games-coin-toast"]')).toBeVisible({ timeout: 10000 });

    const earned1 = calculateCoinsEarned({ gameId: 'parent-blitz', score: score1, won: score1 > 0 }).coins;
    const earned2 = calculateCoinsEarned({ gameId: 'parent-blitz', score: score2, won: score2 > 0 }).coins;
    const expectedCoins = initialSeed.coins + earned1 + earned2;

    const state = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || '{}'),
      PARENT_ECONOMY_KEY,
    );
    expect(state.totalGamesPlayed).toBe(2);
    expect(state.coins).toBe(expectedCoins);
  });

  test('14. re-entering the games list and reopening the same game (fresh mount, no replay click) does NOT add a phantom record', async ({ page }) => {
    await setupFreshProfile(page, 'NoPhantomRecord');
    const seeded = parentEconomyState({ coins: 40, totalGamesPlayed: 3 });
    await seedParentEconomy(page, seeded);

    await openParentGateFromMap(page);

    const gamesTab = page.locator('[data-testid="parent-dashboard"] button').filter({ hasText: /משחקים|Games/ }).first();
    await expect(gamesTab).toBeVisible({ timeout: 5000 });
    await gamesTab.click();
    await page.waitForTimeout(500);

    // Toast is absent on games list
    await expect(page.locator('[data-testid="parent-games-coin-toast"]')).toHaveCount(0);

    // Open Blitz (fresh mount)
    const blitzCard = page.locator('[data-testid="game-card-parent-blitz"]').first();
    await expect(blitzCard).toBeVisible({ timeout: 5000 });
    await blitzCard.click();
    await page.waitForTimeout(500);

    // Toast is absent on game mount (no play click)
    await expect(page.locator('[data-testid="parent-games-coin-toast"]')).toHaveCount(0);

    // Go back to hub
    const backBtn = page.locator('[data-testid="back-button"]').first();
    await expect(backBtn).toBeVisible({ timeout: 5000 });
    await backBtn.click();
    await page.waitForTimeout(500);

    // Reopen Blitz (fresh remount)
    await blitzCard.click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="parent-blitz-start"]')).toBeVisible({ timeout: 5000 });

    // Toast still absent
    await expect(page.locator('[data-testid="parent-games-coin-toast"]')).toHaveCount(0);

    // totalGamesPlayed and coins unchanged
    const state = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || '{}'),
      PARENT_ECONOMY_KEY,
    );
    expect(state.totalGamesPlayed).toBe(3);
    expect(state.coins).toBe(40);
  });

  test('15. child-visibility guard: coin toast is absent on saga map after child lesson', async ({ page }) => {
    await setupFreshProfile(page, 'ChildVisibilityGuard');

    // Toast absent on initial saga map
    await expect(page.locator('[data-testid="parent-games-coin-toast"]')).toHaveCount(0);

    // Play child lesson / game via arcade
    await selectArcadeMode(page, 'zen');
    await page.waitForTimeout(1000);

    // Exit back to map
    const settingsBtn = page.locator('button[aria-label*="Settings"], button[aria-label*="הגדרות"]').first();
    if (await settingsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(300);
      const pauseBtn = page.locator('button[aria-label*="Pause"], button[aria-label*="השהה"]').first();
      if (await pauseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pauseBtn.click();
        await page.waitForTimeout(500);
        const exitBtn = page.locator('button[aria-label*="Exit to Map"], button[aria-label*="חזרה למפה"]').first();
        if (await exitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await exitBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Wait for saga map
    await expect(page.locator('[data-testid="saga-node-n1_1"]').first()).toBeVisible({ timeout: 15000 });

    // Toast element is NOT inside the saga map subtree
    expect(await page.locator('[data-testid="parent-games-coin-toast"]').count()).toBe(0);
  });
});
