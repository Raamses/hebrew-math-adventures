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
 * ── Parent gifting economy — 1 runnable + 4 scaffolded ────────────────────
 * 11. Integration gap guard: ParentDashboard exposes 4 tabs and NO economy
 *     tab, and no ParentEconomyPanel content is reachable. (runnable)
 * 12-15. Gift modal / validation / gift execution / history — test.fixme().
 *     ParentEconomyPanel, GiftToChildModal and useParentEconomy have ZERO
 *     import sites in src/ as of this commit; they are unmounted dead code,
 *     so there is no UI to drive. These bodies are written against the
 *     data-testids listed in NEEDED_TESTIDS below and are UNVERIFIED — they
 *     have never executed. Un-fixme them only after wiring the panel into
 *     ParentDashboard and adding those hooks.
 *     The pure gift logic (validateGift/executeGift) is better covered by a
 *     vitest unit test than by Playwright — see the note at the bottom.
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
import { setupFreshProfile, openMenu } from './helpers';

  // Global timeout is 180s — no need for local override

const PROFILES_KEY = 'hebrew-math-profiles';
const PARENT_ECONOMY_KEY = 'hebrew-math-parent-economy';

/**
 * data-testids that would let these tests drop the structural selectors below.
 * Kept here so the follow-up patch is obvious:
 *   TreasureShop        → treasure-shop, shop-coin-balance,
 *                         shop-item-<id>, shop-buy-<id>, shop-equip-<id>,
 *                         shop-close
 *   ParentEconomyPanel  → parent-economy-panel, economy-coins, gift-to-child
 *   GiftToChildModal    → gift-modal, gift-child-select, gift-amount,
 *                         gift-error, gift-confirm
 *   ParentDashboard     → an 'economy' tab in the tabs array
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
//  Parent gifting economy
// =========================================================================

test.describe('Parent gifting economy', () => {
  /**
   * Injected parent economy state. Written before the app boots so it is in
   * place for whatever eventually reads PARENT_ECONOMY_KEY.
   */
  function parentEconomyState(overrides: Record<string, unknown> = {}) {
    return {
      coins: 120,
      totalCoinsEarned: 300,
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
   * Mirrors openParentGateFromMap in parent-dashboard.spec.ts — avoids a
   * logout round-trip, so seeded localStorage survives (no navigation).
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

    const gateText = (await gate.textContent()) || '';
    const problemMatch = gateText.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
    if (!problemMatch) {
      throw new Error(`Could not parse parent gate problem from text: "${gateText}"`);
    }
    const sum = parseInt(problemMatch[1]) + parseInt(problemMatch[2]);

    await page.locator('[data-testid="parent-gate-input"]').first().fill(String(sum));
    await page.waitForTimeout(300);
    await gate.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-testid="parent-dashboard"]').first()).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * 11. Documents the integration gap. ParentEconomyPanel / GiftToChildModal /
   * useParentEconomy are never imported outside their own files, so injected
   * economy state is inert and no economy UI is reachable.
   *
   * When the panel is wired into ParentDashboard this test SHOULD fail —
   * that failure is the signal to un-fixme tests 12-15 and delete this one.
   */
  test('11. parent dashboard has no economy tab yet (integration gap)', async ({ page }) => {
    await setupFreshProfile(page, 'EconomyChild');

    // Seed AFTER setup: setupFreshProfile clears localStorage and reloads.
    await seedParentEconomy(page, parentEconomyState());

    // Reach the gate from the map — no navigation, so the seed survives.
    await openParentGateFromMap(page);

    const dashboard = page.locator('[data-testid="parent-dashboard"]').first();
    await expect(dashboard).toBeVisible();

    // Exactly the four existing tabs — no economy tab.
    const tabs = dashboard.locator('nav button[role="tab"]');
    await expect(tabs).toHaveCount(4);

    // No ParentEconomyPanel content is rendered anywhere.
    await expect(dashboard).not.toContainText('Parent Coins');
    await expect(dashboard).not.toContainText('מטבעות הורים');
    await expect(dashboard).not.toContainText('Gift to Child');
    await expect(dashboard).not.toContainText('תרום לילד');
    await expect(page.getByRole('button', { name: /^Send Gift$|^שלחו מתנה$/ })).toHaveCount(0);

    // The injected state is untouched: nothing reads or writes it.
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      PARENT_ECONOMY_KEY,
    );
    expect(stored, 'seeded economy state should still be present').not.toBeNull();
    expect(JSON.parse(stored!).coins, 'no code path spends parent coins').toBe(120);
  });

  // ── Scaffolds — UNVERIFIED, never executed. See header note. ────────────
  // Un-fixme these only after ParentEconomyPanel + GiftToChildModal are
  // mounted in ParentDashboard behind an 'economy' tab and the testids in
  // NEEDED_TESTIDS are added. Until then there is no UI for them to drive.

  test.fixme('12. gift modal opens with child selector and amount input', async ({ page }) => {
    await setupFreshProfile(page, 'GiftKid');
    await seedParentEconomy(page, parentEconomyState());
    await openParentGateFromMap(page);

    await page.locator('[aria-label*="economy"], button[role="tab"]').last().click();
    await expect(page.locator('[data-testid="parent-economy-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="economy-coins"]')).toHaveText('120');

    await page.locator('[data-testid="gift-to-child"]').click();
    const modal = page.locator('[data-testid="gift-modal"]');
    await expect(modal).toBeVisible();

    // Child selector is populated from the real profile list.
    const select = modal.locator('[data-testid="gift-child-select"]');
    await expect(select.locator('option')).toHaveCount(2); // placeholder + GiftKid
    await expect(modal.locator('[data-testid="gift-amount"]')).toHaveValue('10');

    // Send is gated until a child is chosen.
    await expect(modal.locator('[data-testid="gift-confirm"]')).toBeDisabled();
  });

  test.fixme('13. gift validation surfaces each error case', async ({ page }) => {
    // MAX_DAILY_GIFT_PER_CHILD = 50, MAX_DAILY_GIFT_TOTAL = 100.
    // Note: GiftToChildModal computes `today` with new Date(), so seeded
    // giftHistory dates must match the machine's local date at run time.
    await setupFreshProfile(page, 'GiftKid');
    await seedParentEconomy(page, parentEconomyState({ coins: 30 }));
    await openParentGateFromMap(page);

    await page.locator('[data-testid="gift-to-child"]').click();
    const modal = page.locator('[data-testid="gift-modal"]');
    const amount = modal.locator('[data-testid="gift-amount"]');
    const error = modal.locator('[data-testid="gift-error"]');

    await modal.locator('[data-testid="gift-child-select"]').selectOption({ index: 1 });

    await amount.fill('0');
    await expect(error).toHaveText('סכום לא תקין'); // invalid_amount

    await amount.fill('40'); // > 30 coins held
    await expect(error).toHaveText('אין מספיק מטבעות'); // insufficient_coins
    await expect(modal.locator('[data-testid="gift-confirm"]')).toBeDisabled();
  });

  test.fixme('14. a successful gift moves coins from parent to child', async ({ page }) => {
    await setupFreshProfile(page, 'GiftKid');
    await seedParentEconomy(page, parentEconomyState());
    await openParentGateFromMap(page);

    await page.locator('[data-testid="gift-to-child"]').click();
    const modal = page.locator('[data-testid="gift-modal"]');
    await modal.locator('[data-testid="gift-child-select"]').selectOption({ index: 1 });
    await modal.locator('[data-testid="gift-amount"]').fill('20');
    await modal.locator('[data-testid="gift-confirm"]').click();

    await expect(modal).toBeHidden();
    await expect(page.locator('[data-testid="economy-coins"]')).toHaveText('100');
    expect((await readProfile(page, 'GiftKid'))?.coins).toBe(20);
  });

  test.fixme('15. gift transactions persist to history', async ({ page }) => {
    await setupFreshProfile(page, 'GiftKid');
    await seedParentEconomy(page, parentEconomyState());
    await openParentGateFromMap(page);

    await page.locator('[data-testid="gift-to-child"]').click();
    const modal = page.locator('[data-testid="gift-modal"]');
    await modal.locator('[data-testid="gift-child-select"]').selectOption({ index: 1 });
    await modal.locator('[data-testid="gift-amount"]').fill('15');
    await modal.locator('[data-testid="gift-confirm"]').click();

    const state = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || '{}'),
      PARENT_ECONOMY_KEY,
    );
    expect(state.giftHistory).toHaveLength(1);
    expect(state.giftHistory[0]).toMatchObject({ amount: 15, childName: 'GiftKid' });
    expect(state.totalGiftedCoins).toBe(15);
    expect(state.coins).toBe(105);
  });
});

/**
 * Follow-up: validateGift / executeGift / calculateCoinsEarned in
 * src/components/parent/games/parentEconomyEngine.ts are pure functions with
 * no DOM dependency. The daily/per-child limit matrix (tests 13-15) belongs in
 * src/components/parent/games/__tests__/parentEconomyEngine.test.ts under
 * vitest, where it runs today without any UI integration. Playwright should
 * only cover the wiring once the panel is actually mounted.
 */
