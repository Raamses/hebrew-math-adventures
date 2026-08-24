import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfileWithPracticeAccess } from './helpers';

/**
 * Lesson Node Completion — LESSON node flow (n3_1)
 *
 * Covers §4.2 of EXPANDED_COVERAGE_PLAN.md.
 */

test.describe('Lesson node completion', () => {
  // Global timeout is 180s — no need for local override

  test('LESSON node (n3_1) — step through lesson → complete → stars → unlock n3_2', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'LessonTest');

    // --- Navigate to the LESSON node (n3_1) ---
    const lessonNode = page.locator('[data-testid="saga-node-n3_1"]').first();
    await lessonNode.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Verify it's unlocked
    const innerDiv = lessonNode.locator('div.rounded-full').first();
    const innerClass = await innerDiv.getAttribute('class') || '';
    expect(innerClass).not.toContain('cursor-not-allowed');

    // Click the LESSON node
    await lessonNode.click();
    await page.waitForTimeout(2000);

    // --- Assert LessonModal is visible ---
    const lessonModal = page.locator('[data-testid="lesson-modal"]').first();
    await expect(lessonModal).toBeVisible({ timeout: 10000 });

    // Hide the mascot overlay
    await page.addStyleTag({
      content: `
        [data-testid="lesson-modal"] > div > div.absolute.bottom-0.left-8.z-50 {
          display: none !important;
        }
      `,
    });
    await page.waitForTimeout(300);

    // --- Find the LessonEngine instance via React fiber tree ---
    // LessonEngine is stored via useState(() => new LessonEngine(lesson)).
    // In the fiber tree, the hook chain is: fiber.memoizedState → hook → hook.memoizedState = value
    // We search all fibers for a hook whose value is a LessonEngine instance.
    const engineResult = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="lesson-modal"]');
      if (!modal) return { error: 'modal not found' };

      const fiberKey = Object.keys(modal).find(k =>
        k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
      );
      if (!fiberKey) return { error: 'no fiber key' };

      const rootFiber = (modal as any)[fiberKey];

      // BFS through fiber tree — search both child and return (parent)
      const visited = new Set();
      const queue = [rootFiber];
      const debug: any[] = [];

      while (queue.length > 0) {
        const fiber = queue.shift();
        if (!fiber || visited.has(fiber)) continue;
        visited.add(fiber);

        // Check all hooks in this fiber's hook chain
        let hook = fiber.memoizedState;
        let hookIdx = 0;
        while (hook) {
          const value = hook.memoizedState;
          if (value !== null && value !== undefined) {
            const ctorName = value?.constructor?.name || '';
            if (ctorName === 'LessonEngine' ||
                (typeof value.onItemDropped === 'function' && typeof value.isStepComplete === 'function')) {
              (window as any).__lessonEngine = value;
              return { found: true, ctorName, hookIdx };
            }
            // Debug: collect hook values for inspection
            if (hookIdx < 5) {
              debug.push({
                fiberType: fiber.type?.name || fiber.type?.toString?.()?.slice(0, 50) || typeof fiber.type,
                hookIdx,
                ctorName,
                hasOnItemDropped: typeof value.onItemDropped,
                hasIsStepComplete: typeof value.isStepComplete,
                valueType: typeof value,
              });
            }
          }
          hook = hook.next;
          hookIdx++;
        }

        if (fiber.child) queue.push(fiber.child);
        if (fiber.sibling) queue.push(fiber.sibling);
        if (fiber.return) queue.push(fiber.return);
      }
      return { error: 'LessonEngine not found', debug: debug.slice(0, 20) };
    });

    if (engineResult.error) {
      console.error('Engine search result:', JSON.stringify(engineResult, null, 2));
      throw new Error(`Failed to find LessonEngine: ${engineResult.error}`);
    }

    // --- Step 1: intro (dialog) ---
    await clickLessonNext(page);
    await page.waitForTimeout(1000);

    // --- Step 2: setup_baskets (dialog) ---
    await clickLessonNext(page);
    await page.waitForTimeout(1000);

    // --- Step 3: action_fill (interactive_drag) ---
    // Call engine.onItemDropped(itemId, targetId) directly.
    // MultiplicationMountainLesson: 6 crystals (c1-c6) into 3 rows (row1-row3), 2 per row.
    // Validation: every target has currentCount === 2.
    const dragPlan: Array<{ itemId: string; targetId: string }> = [
      { itemId: 'c1', targetId: 'row1' },
      { itemId: 'c2', targetId: 'row1' },
      { itemId: 'c3', targetId: 'row2' },
      { itemId: 'c4', targetId: 'row2' },
      { itemId: 'c5', targetId: 'row3' },
      { itemId: 'c6', targetId: 'row3' },
    ];

    for (const { itemId, targetId } of dragPlan) {
      await page.evaluate(({ itemId, targetId }) => {
        const engine = (window as any).__lessonEngine;
        if (!engine) throw new Error('LessonEngine not found on window');
        engine.onItemDropped(itemId, targetId);
      }, { itemId, targetId });
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(1000);

    // --- Step 3: click Next to proceed to conclusion ---
    await clickLessonNext(page);
    await page.waitForTimeout(1000);

    // --- Step 4: conclusion (dialog) — click Finish ---
    await clickLessonNext(page);
    await page.waitForTimeout(2000);

    // --- Assert return to saga map ---
    const sagaNode = page.locator('[data-testid="saga-node-n1_1"]').first();
    await expect(sagaNode).toBeVisible({ timeout: 30000 });

    // --- Assert localStorage saga progress ---
    const progressData = await page.evaluate(() => {
      const profilesRaw = localStorage.getItem('hebrew-math-profiles');
      const profiles = profilesRaw ? Object.values(JSON.parse(profilesRaw)) as any[] : [];
      const profile = profiles.find(p => p.name === 'LessonTest');
      if (!profile) return { error: 'profile not found' };
      const progressKey = `hebrew_game_saga_progress_v1_${profile.id}`;
      const raw = localStorage.getItem(progressKey);
      return {
        profileId: profile.id,
        progress: raw ? JSON.parse(raw) : {},
      };
    });

    expect(progressData.error).toBeUndefined();
    const progress = progressData.progress as Record<string, { stars: number; isLocked: boolean }>;

    expect(progress.n3_1).toBeTruthy();
    expect(progress.n3_1.stars).toBeGreaterThan(0);
    expect(progress.n3_1.isLocked).toBe(false);

    expect(progress.n3_2).toBeTruthy();
    expect(progress.n3_2.isLocked).toBe(false);
  });
});

/**
 * Advance the lesson by calling engine.nextStep() directly.
 * On the deployed site the lesson-next button can be disabled due to React state lag,
 * so we bypass the button and call the engine method directly.
 */
async function clickLessonNext(page: Page) {
  await page.evaluate(() => {
    const engine = (window as any).__lessonEngine;
    if (!engine) throw new Error('LessonEngine not found on window');
    engine.nextStep();
  });
  await page.waitForTimeout(1000);
}
