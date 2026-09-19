import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfileWithPracticeAccess } from './helpers';

/**
 * All-lessons open coverage — parametrized over every LESSON node in the saga map.
 *
 * For each LESSON node: seed full progression (all nodes unlocked), open the node,
 * assert the LessonModal renders, extract the LessonEngine via the React fiber tree,
 * then drive engine.nextStep() through the dialog prefix. Lessons finish if they
 * advance the dialog prefix. Note: engine.nextStep() bypasses isStepComplete() gating
 * (only the UI Next button gates), so interactive steps are stepped through unsolved —
 * this is an open/initialize/driver smoke, not a full playthrough. Full playthroughs
 * remain in lesson-node-completion.spec.ts (n3_1).
 */

const LESSON_NODES = ['n1_2', 'n1_3a', 'n1_3b', 'n1_7', 'n2_3', 'n2_3a', 'n2_3b', 'n2_6', 'unit_3', 'n3_3', 'n3_5', 'unit_4', 'n4_2', 'n4_3a', 'n4_5', 'n5_1a', 'n5_2', 'n5_5a', 'n5_8'];

const ALL_NODE_IDS = ['n1_1', 'n1_10', 'n1_2', 'n1_3', 'n1_3a', 'n1_3b', 'n1_4', 'n1_5', 'n1_6', 'n1_7', 'n1_8', 'n1_9', 'n2_1', 'n2_10', 'n2_2', 'n2_3', 'n2_3a', 'n2_3b', 'n2_4', 'n2_5', 'n2_6', 'n2_7', 'n2_8', 'n2_9', 'n3_1', 'n3_10', 'n3_2', 'n3_3', 'n3_4', 'n3_5', 'n3_6', 'n3_7', 'n3_8', 'n3_9', 'n4_1', 'n4_10', 'n4_2', 'n4_3', 'n4_3a', 'n4_4', 'n4_5', 'n4_6', 'n4_7', 'n4_8', 'n4_9', 'n5_1', 'n5_10', 'n5_1a', 'n5_2', 'n5_3', 'n5_4', 'n5_5', 'n5_5a', 'n5_6', 'n5_7', 'n5_8', 'n5_9', 'unit_1', 'unit_2', 'unit_3', 'unit_4', 'unit_5'];

test.describe('All lessons open and initialize', () => {
  for (const nodeId of LESSON_NODES) {
    test(`LESSON node (${nodeId}) — opens, engine initializes, advances`, async ({ page }) => {
      await setupFreshProfileWithPracticeAccess(page, 'LessonOpen-' + nodeId);

      // Seed full progression so the target node is unlocked (stars=3 for all, then reload)
      await page.evaluate(({ nodeIds }) => {
        const profilesRaw = localStorage.getItem('hebrew-math-profiles');
        const profiles = profilesRaw ? JSON.parse(profilesRaw) : {};
        const profile = Object.values(profiles).find((p: any) => p.name && p.id);
        if (!profile) throw new Error('profile not found after setup');
        const progressKey = `hebrew_game_saga_progress_v1_${(profile as any).id}`;
        const progress: Record<string, { stars: number; isLocked: boolean }> = {};
        for (const id of nodeIds) progress[id] = { stars: 3, isLocked: false };
        localStorage.setItem(progressKey, JSON.stringify(progress));
      }, { nodeIds: ALL_NODE_IDS });

      await page.reload({ waitUntil: 'domcontentloaded' });
      // Reload resets the active profile (no persisted active-profile key) — re-select by name
      await page.locator(`button:has-text('LessonOpen-${nodeId}')`).first().click({ timeout: 15000 });
      const node = page.locator(`[data-testid="saga-node-${nodeId}"]`).first();
      await expect(node).toBeVisible({ timeout: 30000 });

      await node.scrollIntoViewIfNeeded();
      await node.click();
      await page.waitForTimeout(2000);

      // Modal renders
      const lessonModal = page.locator('[data-testid="lesson-modal"]').first();
      await expect(lessonModal).toBeVisible({ timeout: 10000 });

      // LessonEngine reachable via fiber tree
      const engineResult = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="lesson-modal"]');
        if (!modal) return { error: 'modal not found' };
        const fiberKey = Object.keys(modal).find(k => k.startsWith('__reactFiber$'));
        if (!fiberKey) return { error: 'no fiber key' };
        const visited = new Set();
        const queue = [(modal as any)[fiberKey]];
        while (queue.length > 0) {
          const fiber = queue.shift();
          if (!fiber || visited.has(fiber)) continue;
          visited.add(fiber);
          let hook = fiber.memoizedState;
          while (hook) {
            const value = hook.memoizedState;
            if (value && (value?.constructor?.name === 'LessonEngine' ||
                (typeof value.onItemDropped === 'function' && typeof value.isStepComplete === 'function'))) {
              (window as any).__lessonEngine = value;
              return { found: true, steps: typeof value.getCurrentState === 'function' };
            }
            hook = hook.next;
          }
          if (fiber.child) queue.push(fiber.child);
          if (fiber.sibling) queue.push(fiber.sibling);
          if (fiber.return) queue.push(fiber.return);
        }
        return { error: 'LessonEngine not found' };
      });

      expect(engineResult.error).toBeUndefined();

      // Drive the dialog prefix: up to 40 nextStep calls; stop when stuck (interactive step)
      const driven = await page.evaluate(() => {
        const engine = (window as any).__lessonEngine;
        let advanced = 0;
        for (let i = 0; i < 40; i++) {
          const before = JSON.stringify(engine.getCurrentState());
          engine.nextStep();
          const after = JSON.stringify(engine.getCurrentState());
          if (before === after) break;
          advanced++;
        }
        return { advanced };
      });
      expect(driven.advanced).toBeGreaterThanOrEqual(1);

      // End state: modal still open (mid-lesson) OR returned to saga map (completed)
      const modalOpen = await lessonModal.isVisible();
      if (!modalOpen) {
        await expect(page.locator(`[data-testid="saga-node-${nodeId}"]`).first()).toBeVisible({ timeout: 15000 });
      }
    });
  }
});
