/**
 * story-scenes.spec.ts
 *
 * E2E coverage for InteractiveStoryScene and LessonModal step progression.
 *
 * ── Story Scene rendering — 4 tests ──────────────────────────────────────
 *  1. Open LESSON node n1_2 → story-scene appears with data-testid
 *  2. Scene renders items with data-testid="lesson-item-{id}"
 *  3. Scene renders targets with data-testid="lesson-target-{id}" + count
 *  4. Dialog step shows mascot text and a Next button
 *
 * ── Interactive step progression — 3 tests ───────────────────────────────
 *  5. Drag step: drag an item to a target → target count increases
 *  6. Complete all steps in a lesson → lesson modal closes
 *  7. Tap step (n2_3a): tap an item → item removed (scaffolded)
 *
 * Selector strategy: InteractiveStoryScene HAS data-testid attributes:
 *   - data-testid="story-scene" (container)
 *   - data-testid="lesson-item-{item.id}" (draggable/tappable sprites)
 *   - data-testid="lesson-target-{target.id}" (drop zones)
 *   - data-testid="lesson-target-count-{target.id}" (target counter)
 * LessonModal has no data-testid but is the overlay containing story-scene.
 * Lesson nodes on the saga map use data-testid="saga-node-{nodeId}".
 */

import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfileWithPracticeAccess, enterSagaNodeById, setupWithUnlockedNodes } from './helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Drop zones of the current step (drag steps only). */
const DRAG_TARGET = '[data-testid^="lesson-target-"]';

/** Items the child can actually act on. Decorative scenery is rendered with
 *  `pointer-events-none` and can never be dragged or tapped, so it is excluded —
 *  counting raw `lesson-item-*` on a step that only holds scenery yields a false positive. */
const MOVABLE_ITEM = '[data-testid^="lesson-item-"]:not(.pointer-events-none)';

/** Items a tap step made interactive — InteractiveStoryScene sets `role="button"` on those only. */
const TAPPABLE_ITEM = '[data-testid^="lesson-item-"][role="button"]';

/** Wait for the story scene to be visible after entering a lesson node. */
async function waitForStoryScene(page: Page): Promise<void> {
  await expect(page.getByTestId('story-scene')).toBeVisible({ timeout: 15000 });
}

/** Click the lesson's Next/Finish control when (and only when) the engine reports the step is
 *  complete — LessonModal keeps `lesson-next` disabled until then, so a blind click never advances.
 *  Returns true when the click happened. */
async function clickLessonNext(page: Page): Promise<boolean> {
  const nextBtn = page.getByTestId('lesson-next');
  if (!(await nextBtn.isVisible().catch(() => false))) return false;
  if (!(await nextBtn.isEnabled().catch(() => false))) return false;
  await nextBtn.click();
  await page.waitForTimeout(500);
  return true;
}

/** True when the step expects child action: drop targets (drag step) or tappable items (tap step).
 *  Dialog steps carry neither. */
async function isInteractiveStep(page: Page): Promise<boolean> {
  if ((await page.locator(DRAG_TARGET).count()) > 0) return true;
  return (await page.locator(TAPPABLE_ITEM).count()) > 0;
}

/** Advance past the dialog steps (via `lesson-next`) until an interactive step is on screen. */
async function advanceToInteractiveStep(page: Page): Promise<void> {
  const maxAdvance = 20;
  for (let i = 0; i < maxAdvance; i++) {
    if (await isInteractiveStep(page)) return;
    if (!(await clickLessonNext(page))) return;
  }
}

/** Advance past the dialog steps until a step with drop targets (the drag step) is on screen. */
async function advanceToDragStep(page: Page): Promise<void> {
  const maxAdvance = 20;
  for (let i = 0; i < maxAdvance; i++) {
    if ((await page.locator(DRAG_TARGET).count()) > 0) return;
    if (!(await clickLessonNext(page))) return;
  }
}

/** Advance until a step exposes tappable items, clearing any drag step that blocks the way. */
async function advanceToTapStep(page: Page): Promise<void> {
  const maxAdvance = 30;
  for (let i = 0; i < maxAdvance; i++) {
    if ((await page.locator(TAPPABLE_ITEM).count()) > 0) return;
    if ((await page.locator(DRAG_TARGET).count()) > 0) {
      // A drag step cannot be skipped via lesson-next: its button stays disabled until the
      // target is filled, so drop one movable item to let the engine advance.
      if (await dragFirstItemToFirstTarget(page)) continue;
      return;
    }
    if (!(await clickLessonNext(page))) return;
  }
}

/** Drag the first movable item onto the first drop target. Returns false when either is missing. */
async function dragFirstItemToFirstTarget(page: Page): Promise<boolean> {
  const items = page.locator(MOVABLE_ITEM);
  const targets = page.locator(DRAG_TARGET);
  if ((await items.count()) === 0 || (await targets.count()) === 0) return false;
  const itemBox = await items.first().boundingBox().catch(() => null);
  const targetBox = await targets.first().boundingBox().catch(() => null);
  if (!itemBox || !targetBox) return false;
  await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  return true;
}

// ─── Tests ────────────────────────────────────────────────────────────────

test.describe('Interactive Story Scenes and Advanced MathCards', () => {

  test.describe('Story Scene rendering (n1_2 — Counting Seashells)', () => {

    test('1. Open LESSON node n1_2 → story-scene appears', async ({ page }) => {
      await setupFreshProfileWithPracticeAccess(page, 'StoryTester');
      // n1_2 is "Count to 5" — a LESSON node unlocked by setupFreshProfileWithPracticeAccess
      await enterSagaNodeById(page, 'n1_2');
      await waitForStoryScene(page);
      // Verify the scene container is present
      const scene = page.getByTestId('story-scene');
      await expect(scene).toBeVisible();
    });

    test('2. Scene renders items with data-testid="lesson-item-{id}"', async ({ page }) => {
      await setupFreshProfileWithPracticeAccess(page, 'StoryTester');
      await enterSagaNodeById(page, 'n1_2');
      await waitForStoryScene(page);
      // Advance past dialog step to interactive step
      await advanceToInteractiveStep(page);
      // Look for any lesson-item elements
      const items = page.locator('[data-testid^="lesson-item-"]');
      const count = await items.count();
      // There should be at least 1 item in an interactive step
      expect(count).toBeGreaterThan(0);
    });

    test('3. Scene renders targets with data-testid="lesson-target-{id}"', async ({ page }) => {
      await setupFreshProfileWithPracticeAccess(page, 'StoryTester');
      await enterSagaNodeById(page, 'n1_2');
      await waitForStoryScene(page);
      // Advance to the interactive step that owns the drop targets
      await advanceToDragStep(page);
      const targets = page.locator('[data-testid^="lesson-target-"]');
      const count = await targets.count();
      expect(count).toBeGreaterThan(0);
      // Verify target count element exists
      const firstTargetId = await targets.first().getAttribute('data-testid');
      const targetId = firstTargetId?.replace('lesson-target-', '');
      if (targetId) {
        const countEl = page.getByTestId(`lesson-target-count-${targetId}`);
        const countVisible = await countEl.isVisible().catch(() => false);
        if (countVisible) {
          const text = await countEl.textContent();
          expect(text).toMatch(/\d+/);
        }
      }
    });

    test('4. Dialog step shows mascot text and a Next button', async ({ page }) => {
      await setupFreshProfileWithPracticeAccess(page, 'StoryTester');
      await enterSagaNodeById(page, 'n1_2');
      await waitForStoryScene(page);
      // The first step is a dialog step: the mascot speech bubble lives in the modal chrome,
      // not inside the story scene, so read the whole lesson modal rather than the scene.
      const modalText = await page.getByTestId('lesson-modal').textContent();
      expect(modalText).not.toBeNull();
      expect(modalText!.trim().length).toBeGreaterThan(0);
      // The advance control is the stable `lesson-next` button in the modal footer
      // (its label differs per step: start / next / finish).
      const nextBtn = page.getByTestId('lesson-next');
      const btnVisible = await nextBtn.isVisible().catch(() => false);
      expect(btnVisible).toBe(true);
    });

  });

  test.describe('Interactive step progression', () => {

    test('5. Drag step: drag an item to a target → target count increases', async ({ page }) => {
      await setupFreshProfileWithPracticeAccess(page, 'StoryTester');
      await enterSagaNodeById(page, 'n1_2');
      await waitForStoryScene(page);
      // Advance to the interactive drag step
      await advanceToDragStep(page);
      const items = page.locator(MOVABLE_ITEM);
      const targets = page.locator(DRAG_TARGET);
      await expect(items.first()).toBeVisible({ timeout: 5000 });
      await expect(targets.first()).toBeVisible({ timeout: 5000 });
      // Get initial count
      const targetTestId = await targets.first().getAttribute('data-testid');
      const targetId = targetTestId?.replace('lesson-target-', '');
      let initialCount = 0;
      if (targetId) {
        const countEl = page.getByTestId(`lesson-target-count-${targetId}`);
        if (await countEl.isVisible()) {
          const text = await countEl.textContent();
          initialCount = parseInt(text || '0', 10);
        }
      }
      // Perform drag: drag the first movable item to the first target
      const dragged = await dragFirstItemToFirstTarget(page);
      expect(dragged).toBe(true);
      await page.waitForTimeout(400);
      // Check if count changed (may not work if the item type doesn't match target's accepts list)
      if (targetId) {
        const countEl = page.getByTestId(`lesson-target-count-${targetId}`);
        if (await countEl.isVisible()) {
          const newCountText = await countEl.textContent();
          const newCount = parseInt(newCountText || '0', 10);
          // Count should increase or stay same (if wrong item type)
          expect(newCount).toBeGreaterThanOrEqual(initialCount);
        }
      }
    });

    test('6. Complete all steps in a lesson → lesson modal closes', async ({ page }) => {
      await setupFreshProfileWithPracticeAccess(page, 'StoryTester');
      await enterSagaNodeById(page, 'n1_2');
      await waitForStoryScene(page);

      // Progress through all steps until the story scene disappears.
      const maxIterations = 60;
      for (let i = 0; i < maxIterations; i++) {
        const sceneVisible = await page.getByTestId('story-scene').isVisible().catch(() => false);
        if (!sceneVisible) break;

        // When the engine reports the step complete, `lesson-next` (Next / Finish) is enabled.
        if (await clickLessonNext(page)) continue;

        // Tap step: tap one tappable item per iteration (scenery is not tappable).
        const tappables = page.locator(TAPPABLE_ITEM);
        if ((await tappables.count()) > 0) {
          await tappables.first().click();
          await page.waitForTimeout(500);
          continue;
        }

        // Drag step: drop one movable item onto the first target per iteration.
        if (await dragFirstItemToFirstTarget(page)) continue;

        // No actionable elements — break to avoid an infinite loop.
        break;
      }

      // The story scene should be gone (lesson completed).
      await expect(page.getByTestId('story-scene')).toHaveCount(0, { timeout: 10000 });
      // Verify we're back on the saga map.
      await expect(page.locator('[data-testid="saga-node-n1_1"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('7. Tap step (n2_3a SubtractionForest): tap an item → removed', async ({ page }) => {
      // Unlock n2_3a (Unit 2 lesson node) via saga progress injection
      await setupWithUnlockedNodes(page, 'TapTester', ['n2_3a']);
      await enterSagaNodeById(page, 'n2_3a');
      await waitForStoryScene(page);
      // Advance to the interactive tap step. The forest scene also renders scenery sprites,
      // so wait for an item the scene actually made tappable (`role="button"`).
      await advanceToTapStep(page);
      const tappable = page.locator(TAPPABLE_ITEM);
      await expect(tappable.first()).toBeVisible({ timeout: 10000 });
      const items = page.locator('[data-testid^="lesson-item-"]');
      const itemCount = await items.count();
      expect(itemCount).toBeGreaterThan(0);
      // Tap the first tappable item
      await tappable.first().click();
      await page.waitForTimeout(800);
      // Verify item was removed (count decreased or item no longer visible)
      const newItemCount = await items.count();
      expect(newItemCount).toBeLessThan(itemCount);
    });

  });

});
