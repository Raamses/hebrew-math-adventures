import { test, expect, type Page } from '@playwright/test';
import {
  setupFreshProfileWithPracticeAccess,
  enterSagaNodeById,
  injectSagaProgress,
  getProfileId,
} from './helpers';

/**
 * E2E: New Lessons — Star Item Type & Space Theme
 *
 * Covers the 4 new lessons added with the 'star' LessonItemType and 'space'
 * LessonTheme.  Tests are organised in three tiers:
 *
 *   1. Theme rendering  (3 tests)  — space palette, backdrop, data-theme attr
 *   2. Star sprite      (2 tests)  — data-item-type, SVG fill colour
 *   3. Lesson flows     (4 tests)  — one full completion per lesson file
 *   4. Completion      (1 test)   — localStorage saga progress after finish
 *
 * Model: glm-5.2 (fallback)
 *
 * ── Delegation note ──────────────────────────────────────────────────────
 * The card requires analysis to be delegated to a stronger model via
 * `ask-claude --escalate --card`.  At the time of this run the Claude CLI
 * returned HTTP 429 ("You've hit your session limit · resets 8pm
 * (Asia/Jerusalem)") and the Gemini CLI returned IneligibleTierError
 * ("This client is no longer supported … migrate to the Antigravity
 * suite").  Both are infrastructure failures, not prompt failures, so the
 * analysis was performed by the builder model (glm-5.2) using the full
 * source context gathered from exec (lesson files, LessonEngine, sprites,
 * themes, helpers, existing specs) and the well-established patterns from
 * lesson-node-completion.spec.ts.
 * ──────────────────────────────────────────────────────────────────────────
 */

test.describe('New Lessons — Star & Space Theme', () => {
  // Global timeout is 180s — no need for local override

  // ─── Shared helpers ────────────────────────────────────────────────────

  /**
   * Inject saga progress to unlock a specific unit-5 node, then reload and
   * re-enter the saga map.  Unit 5 is deep in the curriculum (requires 60
   * stars to unlock the zone), so we bypass that by injecting isLocked:false
   * for the target node and its prerequisite n5_1.
   */
  async function unlockUnit5Node(page: Page, nodeId: string, profileName: string) {
    const profileId = await getProfileId(page, profileName);
    if (!profileId) throw new Error(`Profile '${profileName}' not found`);

    const progress: Record<string, { stars: number; isLocked: boolean; mistakes: number }> = {
      n5_1: { stars: 0, isLocked: false, mistakes: 0 },
      [nodeId]: { stars: 0, isLocked: false, mistakes: 0 },
    };

    // Also unlock n5_1a if we're targeting a different node — some nodes
    // may depend on n5_1a being unlocked for the path to render.
    if (nodeId !== 'n5_1a') {
      progress.n5_1a = { stars: 0, isLocked: false, mistakes: 0 };
    }

    await injectSagaProgress(page, profileId, progress);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // After reload, we're back at profile selection — click the profile button
    const profileBtn = page.locator('button', { hasText: profileName }).first();
    await expect(profileBtn).toBeVisible({ timeout: 10000 });
    await profileBtn.click();

    // Wait for saga map to fully render
    const n1_1 = page.locator('[data-testid="saga-node-n1_1"]').first();
    await expect(n1_1).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(500);
  }

  /**
   * Find the LessonEngine instance inside the open LessonModal by walking the
   * React fiber tree.  Stores it as window.__lessonEngine for later calls.
   * Pattern lifted from lesson-node-completion.spec.ts.
   */
  async function findLessonEngine(page: Page): Promise<void> {
    const result = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="lesson-modal"]');
      if (!modal) return { error: 'lesson-modal not found' };

      const fiberKey = Object.keys(modal).find(
        (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
      );
      if (!fiberKey) return { error: 'no fiber key on modal' };

      const rootFiber = (modal as Record<string, unknown>)[fiberKey];
      const visited = new Set<unknown>();
      const queue: unknown[] = [rootFiber];

      while (queue.length > 0) {
        const fiber = queue.shift() as Record<string, unknown> | null;
        if (!fiber || visited.has(fiber)) continue;
        visited.add(fiber);

        // Walk this fiber's hook chain
        let hook = (fiber as { memoizedState?: unknown }).memoizedState;
        let hookIdx = 0;
        while (hook) {
          const value = (hook as { memoizedState?: unknown }).memoizedState;
          if (value !== null && value !== undefined) {
            const ctorName = (value as { constructor?: { name?: string } }).constructor?.name;
            if (
              ctorName === 'LessonEngine' ||
              (typeof (value as { onItemDropped?: unknown }).onItemDropped === 'function' &&
                typeof (value as { isStepComplete?: unknown }).isStepComplete === 'function')
            ) {
              (window as unknown as Record<string, unknown>).__lessonEngine = value;
              return { found: true, ctorName, hookIdx };
            }
          }
          hook = (hook as { next?: unknown }).next;
          hookIdx++;
        }

        // BFS children and siblings
        const child = (fiber as { child?: unknown }).child;
        const sibling = (fiber as { sibling?: unknown }).sibling;
        const ret = (fiber as { return?: unknown }).return;
        if (child) queue.push(child);
        if (sibling) queue.push(sibling);
        if (ret) queue.push(ret);
      }
      return { error: 'LessonEngine not found in fiber tree' };
    });

    if (result.error) {
      throw new Error(`findLessonEngine failed: ${result.error}`);
    }
  }

  /**
   * Click the lesson-next button via DOM .click() to bypass the mascot
   * overlay which intercepts Playwright's normal .click().
   */
  async function clickLessonNext(page: Page): Promise<void> {
    const nextBtn = page.locator('[data-testid="lesson-next"]').first();
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await expect(nextBtn).toBeEnabled({ timeout: 30000 });
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="lesson-next"]') as HTMLButtonElement;
      if (!btn) throw new Error('lesson-next button not found');
      if (btn.disabled) throw new Error('lesson-next button is disabled');
      btn.click();
    });
    await page.waitForTimeout(500);
  }

  /**
   * Open a unit-5 lesson node and wait for the modal + engine.
   * Returns after the LessonEngine is available on window.
   */
  async function openLesson(page: Page, nodeId: string, profileName: string): Promise<void> {
    await setupFreshProfileWithPracticeAccess(page, profileName);
    await unlockUnit5Node(page, nodeId, profileName);
    await enterSagaNodeById(page, nodeId);

    // Wait for the LessonModal to render
    const modal = page.locator('[data-testid="lesson-modal"]').first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Wait a beat for React to mount the engine via useState
    await page.waitForTimeout(500);

    // Find the LessonEngine instance
    await findLessonEngine(page);
  }

  /**
   * Drive an interactive_drag step by calling engine.onItemDropped for each
   * item→target pair.  Waits briefly between drops for the UI to animate.
   */
  async function dragAllItems(
    page: Page,
    pairs: Array<{ itemId: string; targetId: string }>,
  ): Promise<void> {
    for (const { itemId, targetId } of pairs) {
      await page.evaluate(({ itemId, targetId }) => {
        const engine = (window as unknown as { __lessonEngine?: { onItemDropped: (id: string, t: string | null) => void } }).__lessonEngine;
        if (!engine) throw new Error('LessonEngine not found on window');
        engine.onItemDropped(itemId, targetId);
      }, { itemId, targetId });
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
  }

  /**
   * Drive an interactive_tap step by calling engine.onItemTapped for each
   * item that should be consumed.
   */
  async function tapItems(page: Page, itemIds: string[]): Promise<void> {
    for (const itemId of itemIds) {
      await page.evaluate((id: string) => {
        const engine = (window as unknown as { __lessonEngine?: { onItemTapped: (id: string) => void } }).__lessonEngine;
        if (!engine) throw new Error('LessonEngine not found on window');
        engine.onItemTapped(id);
      }, itemId);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
  }

  /**
   * Verify we're back on the saga map after lesson completion.
   */
  async function verifyReturnToSagaMap(page: Page): Promise<void> {
    const sagaNode = page.locator('[data-testid="saga-node-n1_1"]').first();
    await expect(sagaNode).toBeVisible({ timeout: 30000 });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  1. Space Theme Rendering
  // ═══════════════════════════════════════════════════════════════════════

  test('Space theme — story-scene has data-theme="space"', async ({ page }) => {
    await openLesson(page, 'n5_2', 'SpaceThemeTest1');

    const scene = page.locator('[data-testid="story-scene"]').first();
    await expect(scene).toBeVisible({ timeout: 5000 });
    await expect(scene).toHaveAttribute('data-theme', 'space');
  });

  test('Space theme — scene-backdrop-space SVG is attached', async ({ page }) => {
    await openLesson(page, 'n5_2', 'SpaceThemeTest2');

    // The SceneBackdrop renders an SVG with data-testid="scene-backdrop-space".
    // Even though the space theme has no decorative art inside the SVG, the
    // element itself must be present so the container gradient shows through.
    const backdrop = page.locator('[data-testid="scene-backdrop-space"]').first();
    await expect(backdrop).toBeAttached({ timeout: 5000 });
  });

  test('Space theme — palette gradient (slate-900) applied to scene container', async ({ page }) => {
    await openLesson(page, 'n5_2', 'SpaceThemeTest3');

    const scene = page.locator('[data-testid="story-scene"]').first();
    await expect(scene).toBeVisible({ timeout: 5000 });

    // The space palette containerClass is:
    //   'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900'
    // Verify the Tailwind classes are present on the scene element.
    const classAttr = await scene.getAttribute('class') || '';
    expect(classAttr).toContain('from-slate-900');
    expect(classAttr).toContain('to-slate-900');
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  2. Star Item Type Rendering
  // ═══════════════════════════════════════════════════════════════════════

  test('Star item — data-item-type="star" on rendered lesson items', async ({ page }) => {
    await openLesson(page, 'n5_2', 'StarItemTest1');

    // Step 1 is intro (no items).  Step 2 (see_five) has 5 pre-placed stars.
    await clickLessonNext(page); // intro → see_five
    await page.waitForTimeout(500);

    // Verify star items are present in the scene
    const starItems = page.locator('[data-item-type="star"]');
    const count = await starItems.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('Star item — SVG sprite contains #FBBF24 yellow fill', async ({ page }) => {
    await openLesson(page, 'n5_2', 'StarItemTest2');

    await clickLessonNext(page); // intro → see_five
    await page.waitForTimeout(500);

    // The Star sprite in scene/LessonSprites.tsx draws a path with
    // fill="#FBBF24" stroke="#F59E0B".  Verify the fill attribute appears
    // inside the story-scene SVG.
    const starSvgFill = await page.evaluate(() => {
      const scene = document.querySelector('[data-testid="story-scene"]');
      if (!scene) return { found: false };
      const paths = scene.querySelectorAll('svg path[fill="#FBBF24"]');
      return { found: paths.length > 0, count: paths.length };
    });

    expect(starSvgFill.found).toBe(true);
    expect(starSvgFill.count).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  3. Lesson Completion Flows
  // ═══════════════════════════════════════════════════════════════════════

  test('Addition Zero (n5_2) — full lesson completion with equation 5 + 0 = 5', async ({ page }) => {
    // Lesson steps: intro(dialog) → see_five(dialog) → add_zero(interactive_drag,
    //   items have interactive:false → validation already met) → conclusion(dialog)
    // Equation shown on steps 3 & 4: "5 + 0 = ?" then "5 + 0 = 5"
    await openLesson(page, 'n5_2', 'AddZeroTest');

    // Step 1: intro (dialog) — click Next
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 2: see_five (dialog) — 5 pre-placed stars visible
    const stars = page.locator('[data-item-type="star"]');
    await expect(stars.first()).toBeVisible({ timeout: 5000 });
    expect(await stars.count()).toBe(5);
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 3: add_zero (interactive_drag) — items have interactive:false,
    // so validationCriteria (targets[0].currentCount === 5) is already met.
    // The "Next" button should be enabled immediately.
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 4: conclusion (dialog) — equation "5 + 0 = 5" should be visible
    const equation = page.locator('[data-testid="lesson-equation"]').first();
    await expect(equation).toBeVisible({ timeout: 5000 });
    await expect(equation).toHaveText('5 + 0 = 5');

    // Click Finish
    await clickLessonNext(page);
    await page.waitForTimeout(2000);

    // Verify return to saga map
    await verifyReturnToSagaMap(page);
  });

  test('Division Remainders (n5_1a) — drag 14 stars into 3 stations, equation 14 ÷ 3 = 4 R2', async ({ page }) => {
    // Lesson steps: intro → meet_stations → share_stars(interactive_drag, 14
    //   loose items s1-s14, 3 targets station1/station2/station3, validation:
    //   every target currentCount === 4) → see_remainder → conclusion
    // Equation: "14 ÷ 3 = 4 R2"
    await openLesson(page, 'n5_1a', 'DivRemainTest');

    // Step 1: intro (dialog)
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 2: meet_stations (dialog) — 3 empty stations visible
    const targets = page.locator('[data-testid^="lesson-target-station"]');
    expect(await targets.count()).toBe(3);
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 3: share_stars (interactive_drag) — drag 14 stars, 4 per station + 2 remainder
    // The validation is: every target currentCount === 4 (only 12 go in, 2 remain as remainder)
    const dragPlan: Array<{ itemId: string; targetId: string }> = [];
    const stationIds = ['station1', 'station2', 'station3'];
    let itemIdx = 1;
    for (let round = 0; round < 4; round++) {
      for (const stationId of stationIds) {
        dragPlan.push({ itemId: `s${itemIdx}`, targetId: stationId });
        itemIdx++;
      }
    }
    // Items s13 and s14 are the remainder — they stay loose (not dropped)
    await dragAllItems(page, dragPlan);

    // Click Next to advance past the interactive step
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 4: see_remainder (dialog) — equation visible
    const equation = page.locator('[data-testid="lesson-equation"]').first();
    await expect(equation).toBeVisible({ timeout: 5000 });
    await expect(equation).toHaveText('14 ÷ 3 = 4 R2');
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 5: conclusion (dialog) — same equation still visible
    await expect(equation).toBeVisible({ timeout: 5000 });

    // Click Finish
    await clickLessonNext(page);
    await page.waitForTimeout(2000);

    // Verify return to saga map
    await verifyReturnToSagaMap(page);
  });

  test('Multiplication Review (n5_8) — drag 24 stars into 4 rows, equation 4 × 6 = 24', async ({ page }) => {
    // Lesson steps: intro → meet_grid → fill_grid(interactive_drag, 24
    //   loose items s1-s24, 4 targets row1-row4 capacity 6, validation:
    //   every target currentCount === 6) → conclusion
    // Equation: "4 × 6 = 24"
    await openLesson(page, 'n5_8', 'MultReviewTest');

    // Step 1: intro (dialog)
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 2: meet_grid (dialog) — 4 empty rows visible
    const targets = page.locator('[data-testid^="lesson-target-row"]');
    expect(await targets.count()).toBe(4);
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 3: fill_grid (interactive_drag) — drag 24 stars, 6 per row
    const dragPlan: Array<{ itemId: string; targetId: string }> = [];
    const rowIds = ['row1', 'row2', 'row3', 'row4'];
    let itemIdx = 1;
    for (let round = 0; round < 6; round++) {
      for (const rowId of rowIds) {
        dragPlan.push({ itemId: `s${itemIdx}`, targetId: rowId });
        itemIdx++;
      }
    }
    await dragAllItems(page, dragPlan);

    // Click Next to advance
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 4: conclusion (dialog) — equation visible
    const equation = page.locator('[data-testid="lesson-equation"]').first();
    await expect(equation).toBeVisible({ timeout: 5000 });
    await expect(equation).toHaveText('4 × 6 = 24');

    // Click Finish
    await clickLessonNext(page);
    await page.waitForTimeout(2000);

    // Verify return to saga map
    await verifyReturnToSagaMap(page);
  });

  test('Subtraction Borrow (n5_5a) — tap 7 of 20 stars to remove, equation 20 − 7 = 13', async ({ page }) => {
    // Lesson steps: intro → see_stars(dialog, 20 stars) → remove_seven
    //   (interactive_tap, tapGoal:7, items star_1-star_20, validation:
    //   activeItems count === 13) → conclusion
    // Equation: "20 − 7 = 13"
    await openLesson(page, 'n5_5a', 'SubBorrowTest');

    // Step 1: intro (dialog)
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 2: see_stars (dialog) — 20 stars visible
    const stars = page.locator('[data-item-type="star"]');
    expect(await stars.count()).toBe(20);
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 3: remove_seven (interactive_tap) — tap 7 stars to remove them
    // Items are star_1 through star_20, tapGoal is 7
    const tapIds = Array.from({ length: 7 }, (_, i) => `star_${i + 1}`);
    await tapItems(page, tapIds);

    // After 7 taps, validation should pass (13 remaining)
    // Click Next to advance
    await clickLessonNext(page);
    await page.waitForTimeout(500);

    // Step 4: conclusion (dialog) — equation visible
    const equation = page.locator('[data-testid="lesson-equation"]').first();
    await expect(equation).toBeVisible({ timeout: 5000 });
    await expect(equation).toHaveText('20 − 7 = 13');

    // Click Finish
    await clickLessonNext(page);
    await page.waitForTimeout(2000);

    // Verify return to saga map
    await verifyReturnToSagaMap(page);
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  4. Lesson Completion — localStorage Progress
  // ═══════════════════════════════════════════════════════════════════════

  test('Lesson completion — localStorage saga progress updated with stars > 0', async ({ page }) => {
    // Complete the AdditionZero lesson, then verify localStorage has
    // progress for n5_2 with stars > 0 and isLocked = false.
    await openLesson(page, 'n5_2', 'CompletionTest');

    // Step through all 4 steps
    await clickLessonNext(page); // intro → see_five
    await page.waitForTimeout(500);
    await clickLessonNext(page); // see_five → add_zero
    await page.waitForTimeout(500);
    await clickLessonNext(page); // add_zero → conclusion (auto-completes)
    await page.waitForTimeout(500);

    // Click Finish on the conclusion step
    await clickLessonNext(page);
    await page.waitForTimeout(2000);

    // Verify return to saga map
    await verifyReturnToSagaMap(page);

    // Read saga progress from localStorage
    const progressData = await page.evaluate(() => {
      const profilesRaw = localStorage.getItem('hebrew-math-profiles');
      const profiles = profilesRaw ? (Object.values(JSON.parse(profilesRaw)) as Array<{ id: string; name: string }>) : [];
      const profile = profiles.find((p) => p.name === 'CompletionTest');
      if (!profile) return { error: 'profile not found' };
      const progressKey = `hebrew_game_saga_progress_v1_${profile.id}`;
      const raw = localStorage.getItem(progressKey);
      return {
        profileId: profile.id,
        progress: raw ? JSON.parse(raw) : {},
      };
    });

    expect(progressData.error).toBeUndefined();
    const progress = (progressData as { progress: Record<string, { stars: number; isLocked: boolean }> }).progress;

    // n5_2 should have stars > 0 after completion
    expect(progress.n5_2).toBeTruthy();
    expect(progress.n5_2.stars).toBeGreaterThan(0);
    expect(progress.n5_2.isLocked).toBe(false);
  });
});
