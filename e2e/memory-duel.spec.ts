import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfileWithPracticeAccess, waitForSagaMap } from './helpers';

/**
 * Memory Duel Game — match all pairs → game complete → return to saga map.
 * Covers §4.5 of EXPANDED_COVERAGE_PLAN.md.
 *
 * The MemoryDuelGame renders 12 cards (6 pairs) in a 4×3 grid.
 * Each card has data-testid="memory-card-{index}", data-pair-id, and data-display attributes.
 * Cards with the same pairId are matching pairs.
 * We click two cards with the same pairId to match them.
 * When all 6 pairs are matched, a completion overlay appears.
 * Click "Back to Map" to return to the saga map.
 *
 * Entry strategy: n3_1 is a LESSON node that opens LessonModal. We use React fiber
 * manipulation to set internalMode='MEMORY' on the GameOrchestrator, which causes
 * it to render MemoryDuelGame instead of LessonModal.
 */

test.describe('Memory Duel game', () => {
  test.setTimeout(120000);

  test('Memory Duel — match all pairs → game complete → return to saga map', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'MemoryTest');

    // --- Enter n3_1 (LESSON node) to get into GameOrchestrator context ---
    const lessonNode = page.locator('[data-testid="saga-node-n3_1"]').first();
    await lessonNode.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Verify it's unlocked
    const innerDiv = lessonNode.locator('div.rounded-full').first();
    const innerClass = await innerDiv.getAttribute('class') || '';
    if (innerClass.includes('grayscale') || innerClass.includes('cursor-not-allowed')) {
      throw new Error('n3_1 node is locked. Ensure setupFreshProfileWithPracticeAccess is called.');
    }

    await lessonNode.click();
    await page.waitForTimeout(2000);

    // --- Switch GameOrchestrator from LESSON mode to MEMORY mode via React fiber ---
    // n3_1 is a LESSON node, so effectiveMode='LESSON' and LessonModal opens.
    // We find the GameOrchestrator's setInternalMode function and call it with 'MEMORY'.
    // This makes effectiveMode='MEMORY', which renders MemoryDuelGame instead.
    const switchResult = await page.evaluate(() => {
      const lessonModal = document.querySelector('[data-testid="lesson-modal"]');
      const rootEl = lessonModal || document.querySelector('.min-h-screen');
      if (!rootEl) return { error: 'no root element found' };

      const fiberKey = Object.keys(rootEl).find(k =>
        k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
      );
      if (!fiberKey) return { error: 'no fiber key' };

      let fiber = (rootEl as any)[fiberKey];
      let depth = 0;
      while (fiber && depth < 30) {
        const fiberType = fiber.type;
        const componentName = typeof fiberType === 'function'
          ? (fiberType.name || fiberType.displayName)
          : String(fiberType);

        if (componentName === 'GameOrchestrator') {
          // Found GameOrchestrator. Find the internalMode useState hook (value is null).
          let hookIdx = 0;
          let h = fiber.memoizedState;
          while (h) {
            const v = h.memoizedState;
            // internalMode initial value is null, and it has a dispatch function
            if (v === null && h.queue && typeof h.queue.dispatch === 'function') {
              // Call the dispatch to set internalMode to 'MEMORY'
              h.queue.dispatch('MEMORY');
              return { found: true, hookIdx, component: componentName };
            }
            h = h.next;
            hookIdx++;
          }
          return { error: 'internalMode hook not found', component: componentName };
        }
        fiber = fiber.return;
        depth++;
      }
      return { error: 'GameOrchestrator not found', depth };
    });

    if (switchResult.error) {
      console.error('Switch result:', JSON.stringify(switchResult, null, 2));
      throw new Error(`Failed to switch to MEMORY mode: ${switchResult.error}`);
    }

    console.log('[Memory Duel] Switched to MEMORY mode:', JSON.stringify(switchResult));
    await page.waitForTimeout(2000);

    // --- Verify MemoryDuelGame is visible ---
    const firstCard = page.locator('[data-testid="memory-card-0"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000); // let cards finish animating in

    // --- Read all card pair IDs from the DOM ---
    const cardData = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid^="memory-card-"]');
      return Array.from(cards).map((el) => ({
        index: parseInt(el.getAttribute('data-testid')!.replace('memory-card-', '')),
        pairId: el.getAttribute('data-pair-id'),
        display: el.getAttribute('data-display'),
      }));
    });

    console.log('[Memory Duel] Cards:', JSON.stringify(cardData, null, 2));
    expect(cardData.length).toBe(12); // 6 pairs = 12 cards

    // --- Group cards by pairId ---
    const pairsMap: Record<string, number[]> = {};
    for (const card of cardData) {
      if (!pairsMap[card.pairId!]) pairsMap[card.pairId!] = [];
      pairsMap[card.pairId!].push(card.index);
    }

    const pairIds = Object.keys(pairsMap);
    expect(pairIds.length).toBe(6); // 6 pairs

    for (const pairId of pairIds) {
      expect(pairsMap[pairId].length).toBe(2); // each pair has exactly 2 cards
    }

    console.log('[Memory Duel] Pairs:', JSON.stringify(pairsMap, null, 2));

    // --- Match all 6 pairs ---
    for (let pairIdx = 0; pairIdx < pairIds.length; pairIdx++) {
      const pairId = pairIds[pairIdx];
      const [card1Index, card2Index] = pairsMap[pairId];

      console.log(`[Memory Duel] Matching pair ${pairIdx + 1}/${pairIds.length}: pairId=${pairId}, cards=${card1Index},${card2Index}`);

      // Wait for any wrong-pair animation to clear
      await page.waitForTimeout(300);

      // Click first card of the pair
      const card1 = page.locator(`[data-testid="memory-card-${card1Index}"]`).first();
      await expect(card1).toBeVisible({ timeout: 5000 });
      await card1.click();
      await page.waitForTimeout(500); // let flip animation settle

      // Click second card of the pair
      const card2 = page.locator(`[data-testid="memory-card-${card2Index}"]`).first();
      await expect(card2).toBeVisible({ timeout: 5000 });
      await card2.click();
      await page.waitForTimeout(800); // let match animation settle

      // Verify the matched count incremented using the specific data-testid element
      const matchedCountEl = page.locator('[data-testid="memory-matched-count"]').first();
      const matchedText = await matchedCountEl.textContent() || '';
      const matchMatch = matchedText.match(/(\d+)\s*\/\s*6/);
      if (matchMatch) {
        const currentMatched = parseInt(matchMatch[1]);
        console.log(`[Memory Duel] Matched count after pair ${pairIdx + 1}: ${currentMatched}/6`);
        expect(currentMatched).toBe(pairIdx + 1);
      }
    }

    console.log('[Memory Duel] All pairs matched! Waiting for completion overlay...');

    // --- Assert completion overlay appears ---
    const completeOverlay = page.locator('[data-testid="memory-complete-overlay"]').first();
    await expect(completeOverlay).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Verify the overlay shows completion text
    const overlayText = await completeOverlay.textContent() || '';
    const isComplete = overlayText.match(/You did it|כל הכבוד|All pairs matched|יופי|כל הזוגות/i);
    expect(isComplete).toBeTruthy();

    console.log('[Memory Duel] Completion overlay visible. Clicking "Back to Map"...');

    // --- Click "Back to Map" to return to saga map ---
    const backToMapBtn = page.locator('[data-testid="memory-back-to-map"]').first();
    await expect(backToMapBtn).toBeVisible({ timeout: 5000 });
    await backToMapBtn.click();
    await page.waitForTimeout(2000);

    // --- Assert return to saga map ---
    await waitForSagaMap(page);

    console.log('[Memory Duel] Returned to saga map. Test PASSED!');
  });
});
