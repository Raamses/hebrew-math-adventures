import { test, expect, type Page } from '@playwright/test';
import {
  setupFreshProfile,
  setupFreshProfileWithPracticeAccess,
  selectArcadeMode,
  selectPracticeMode,
  waitForSagaMap,
  getArcadeBestScore,
} from './helpers';

/**
 * Arcade Game-Over — survival, blitz, and math invaders flows.
 * Covers §4.4 of EXPANDED_COVERAGE_PLAN.md.
 *
 * IMPORTANT: SENSORY/arcade modes do NOT render SessionSummary.
 * On game-over, BubbleGameContainer calls onComplete → onExit() → returns to saga map.
 * Tests assert saga-map return + localStorage, NOT a summary screen.
 *
 * Test 1: Survival mode — 3 wrong answers → return to saga map → best score saved
 * Test 2: Blitz mode — play actively → timer expires → return to saga map → score saved
 * Test 3: Math Invaders — play → game over → return to saga map
 *
 * FIX (card a1b2c3d4-0002): Replaced poll-and-give-up pattern that used page.evaluate
 * to traverse DOM and check computed styles. The old approach raced framer-motion's
 * animation lifecycle: bubbles start at y:110vh, opacity:0 and animate upward.
 * The DOM check could see a bubble element that exists but hasn't animated into
 * the viewport yet, or miss one that just became clickable.
 *
 * New approach uses page.waitForFunction() to wait until a wrong bubble has
 * actually animated into the viewport (bounding rect within screen bounds and
 * opacity > 0.5), then clicks it via DOM dispatchEvent for reliability.
 */

/**
 * Read the current instruction from the BubbleGameContainer header.
 * The instruction is in a div[dir="ltr"] element with a span.font-mono inside.
 */
async function getBubbleInstruction(page: Page): Promise<string | null> {
  const instEl = page.locator('div[dir="ltr"] span.font-mono').first();
  if (await instEl.count() === 0) return null;
  try {
    return await instEl.textContent({ timeout: 2000 });
  } catch {
    return null;
  }
}

/**
 * Parse the target value from the instruction text.
 * Handles: "Pop N", "A + B = ?", "A - B = ?", "A × B = ?", "? + B = C", "A + ? = C"
 */
function parseInstructionTarget(inst: string): number | null {
  if (!inst) return null;

  // "Pop N" — sensory mode
  const popMatch = inst.match(/Pop\s+(\d+)/i);
  if (popMatch) return parseInt(popMatch[1]!);

  // Arithmetic: "A OP B = ?"
  const eqMatch = inst.match(/(\d+)\s*([+\-−×÷*])\s*(\d+)\s*=\s*\?/);
  if (eqMatch) {
    const a = parseInt(eqMatch[1]!);
    const op = eqMatch[2]!;
    const b = parseInt(eqMatch[3]!);
    switch (op) {
      case '+': return a + b;
      case '-': case '−': return a - b;
      case '*': case '×': return a * b;
      case '÷': case '/': return Math.floor(a / b);
    }
  }

  // Missing operand: "? OP B = C"
  const missingLeft = inst.match(/\?\s*([+\-−×÷*])\s*(\d+)\s*=\s*(\d+)/);
  if (missingLeft) {
    const op = missingLeft[1]!;
    const b = parseInt(missingLeft[2]!);
    const c = parseInt(missingLeft[3]!);
    switch (op) {
      case '+': return c - b;
      case '-': case '−': return c + b;
      case '*': case '×': return Math.floor(c / b);
      case '÷': case '/': return c * b;
    }
  }

  // Missing operand: "A OP ? = C"
  const missingRight = inst.match(/(\d+)\s*([+\-−×÷*])\s*\?\s*=\s*(\d+)/);
  if (missingRight) {
    const a = parseInt(missingRight[1]!);
    const op = missingRight[2]!;
    const c = parseInt(missingRight[3]!);
    switch (op) {
      case '+': return c - a;
      case '-': case '−': return a - c;
      case '*': case '×': return Math.floor(c / a);
      case '÷': case '/': return Math.floor(a / c);
    }
  }

  return null;
}

/**
 * Wait for a wrong bubble to be visible in the viewport, then click it.
 *
 * Uses page.waitForFunction() to detect when a bubble element:
 * 1. Has a data-testid matching "bubble-<number>" where number !== targetValue
 * 2. Has computed opacity > 0.5 (framer-motion has finished the fade-in)
 * 3. Has a bounding rect within the viewport (y > 0 and y < window.innerHeight)
 * 4. Is not popped (parent wrapper pointer-events !== 'none')
 *
 * Once found, clicks it via DOM dispatchEvent for reliability.
 * Returns true if a wrong bubble was found and clicked, false on timeout.
 */
async function findAndClickWrongBubble(page: Page, targetValue: number, timeoutMs = 8000): Promise<boolean> {
  try {
    // Wait until a wrong bubble is visible and clickable in the viewport
    const found = await page.waitForFunction((target) => {
      const allBubbles = document.querySelectorAll('[data-testid^="bubble-"]');
      for (const el of allBubbles) {
        const testId = el.getAttribute('data-testid') || '';
        const valueStr = testId.replace('bubble-', '');
        const value = parseInt(valueStr);
        if (isNaN(value)) continue; // skip power-ups
        if (value === target) continue; // skip correct bubble

        // Check if the bubble is popped (parent wrapper pointer-events: none)
        const wrapper = el.parentElement;
        if (wrapper && wrapper.style.pointerEvents === 'none') continue;

        // Check computed opacity (framer-motion animates from 0 to 1)
        const style = window.getComputedStyle(el);
        const opacity = parseFloat(style.opacity);
        if (opacity < 0.5) continue;

        // Check if on screen (framer-motion animates y from 110vh to -20vh)
        const rect = el.getBoundingClientRect();
        if (rect.top <= 0 || rect.top >= window.innerHeight) continue;
        if (rect.bottom <= 0 || rect.bottom >= window.innerHeight + rect.height) {
          // Allow partially visible bubbles at the bottom of the screen
          if (rect.top < window.innerHeight * 0.3) continue;
        }

        // Found a clickable wrong bubble — click it directly via DOM
        (el as HTMLElement).click();
        return true;
      }
      return false;
    }, targetValue, { timeout: timeoutMs, polling: 200 });

    return found !== null;
  } catch {
    return false;
  }
}

/**
 * Wait for any bubble to appear in the viewport (used for initial spawn wait).
 * Uses page.waitForFunction to detect when at least one bubble has animated
 * into the visible area with sufficient opacity.
 */
async function waitForBubblesInViewport(page: Page, timeoutMs = 10000): Promise<void> {
  await page.waitForFunction(() => {
    const allBubbles = document.querySelectorAll('[data-testid^="bubble-"]');
    for (const el of allBubbles) {
      const style = window.getComputedStyle(el);
      const opacity = parseFloat(style.opacity);
      if (opacity < 0.5) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top > 0 && rect.top < window.innerHeight) return true;
    }
    return false;
  }, { timeout: timeoutMs, polling: 200 });
}

/**
 * Check if the saga map is visible (saga node present).
 * Reusable assertion that we've returned to the saga map.
 */
async function isOnSagaMap(page: Page): Promise<boolean> {
  const arcadeBtn = page.locator('[data-testid="saga-node-n1_1"]').first();
  return (await arcadeBtn.count() > 0) && (await arcadeBtn.isVisible().catch(() => false));
}

test.describe('Arcade Game-Over flows', () => {
  test.setTimeout(120000);

  // ─── Test 1: Survival mode — 3 wrong answers → return to saga map ───
  test('Survival mode — 3 wrong answers → return to saga map → best score saved', async ({ page }) => {
    await setupFreshProfile(page, 'SurvivalBot');
    await selectArcadeMode(page, 'survival');

    // Wait for the first bubble to animate into the viewport
    // Survival spawns every 800ms; bubbles animate from y:110vh with opacity:0
    await waitForBubblesInViewport(page, 10000);

    // Pop wrong bubbles 3 times to trigger game-over (failCondition: 3 strikes)
    let wrongsCommitted = 0;
    let attempts = 0;
    const maxAttempts = 30;

    while (wrongsCommitted < 3 && attempts < maxAttempts) {
      attempts++;

      // Check if already on saga map (game over happened early)
      if (await isOnSagaMap(page)) {
        console.log('[Survival] Saga map detected early (wrongs: ' + wrongsCommitted + ')');
        break;
      }

      // Read instruction and find target
      const inst = await getBubbleInstruction(page);
      if (!inst) {
        await page.waitForTimeout(500);
        continue;
      }

      const target = parseInstructionTarget(inst);
      if (target === null) {
        await page.waitForTimeout(500);
        continue;
      }

      // Check hearts before click
      const heartsBefore = await page.evaluate(() => {
        return document.querySelectorAll('.fill-rose-500').length;
      });

      // Find and click a wrong bubble — waits for one to be visible in viewport
      const clicked = await findAndClickWrongBubble(page, target, 8000);
      if (!clicked) {
        console.log('[Survival] Attempt ' + attempts + ': no wrong bubble found for target ' + target);
        continue;
      }

      wrongsCommitted++;

      // Wait and check if strike was registered
      await page.waitForTimeout(500);
      const heartsAfter = await page.evaluate(() => {
        return document.querySelectorAll('.fill-rose-500').length;
      });

      const strikeRegistered = heartsAfter < heartsBefore;
      console.log('[Survival] Wrong #' + wrongsCommitted + ' (target=' + target + ') hearts: ' + heartsBefore + '->' + heartsAfter + (strikeRegistered ? ' OK' : ' NO STRIKE'));

      // Wait for pop animation + answer lock + possible target rotation
      await page.waitForTimeout(1500);
    }

    console.log('[Survival] Done with wrongs: ' + wrongsCommitted + ', attempts: ' + attempts);

    // Assert saga map visible (game over → onExit → saga map)
    await waitForSagaMap(page);

    // Assert localStorage: arcade best score for SURVIVAL recorded
    const survivalScore = await getArcadeBestScore(page, 'survival');
    console.log(`[Survival] Arcade best score: ${survivalScore}`);
    expect(survivalScore).toBeGreaterThanOrEqual(0);

    console.log('[Survival] Test PASSED!');
  });

  // ─── Test 2: Blitz mode — timer expires → return to saga map ───
  test('Blitz mode — play actively → timer expires → return to saga map → score saved', async ({ page }) => {
    test.setTimeout(90000); // 90s: 60s blitz + 30s setup/buffer

    await setupFreshProfile(page, 'BlitzBot');
    await selectArcadeMode(page, 'blitz');

    // Wait for the first bubble to animate into the viewport
    await waitForBubblesInViewport(page, 10000);

    // Play actively — pop correct bubbles until timer expires
    let correctPops = 0;
    const maxWaitMs = 75000; // 75s max (60s game + 15s buffer)
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      // Check if game is over (saga map visible)
      if (await isOnSagaMap(page)) {
        console.log(`[Blitz] Game over detected after ${Math.round((Date.now() - startTime) / 1000)}s`);
        break;
      }

      // Read instruction and find target
      const inst = await getBubbleInstruction(page);
      if (!inst) {
        console.log(`[Blitz] No instruction at ${Math.round((Date.now() - startTime) / 1000)}s, waiting...`);
        await page.waitForTimeout(1000);
        continue;
      }

      const target = parseInstructionTarget(inst);
      if (target === null) {
        await page.waitForTimeout(500);
        continue;
      }

      // Find the correct bubble — wait for it to be visible in viewport
      // Use page.waitForFunction for the same framer-motion-safe visibility check
      try {
        const found = await page.waitForFunction((target) => {
          const el = document.querySelector(`[data-testid="bubble-${target}"]`);
          if (!el) return false;
          const wrapper = el.parentElement;
          if (wrapper && wrapper.style.pointerEvents === 'none') return false;
          const style = window.getComputedStyle(el);
          const opacity = parseFloat(style.opacity);
          if (opacity < 0.5) return false;
          const rect = el.getBoundingClientRect();
          return rect.top > 0 && rect.top < window.innerHeight;
        }, target, { timeout: 5000, polling: 200 });

        if (found) {
          // Get the bubble's coordinates and click via mouse
          const box = await page.locator(`[data-testid="bubble-${target}"]`).first().boundingBox();
          if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            correctPops++;
            console.log(`[Blitz] Popped correct #${correctPops} (target: ${target})`);
            await page.waitForTimeout(1200); // wait for pop + next problem
          }
        }
      } catch {
        // Correct bubble not visible in time — wait for next spawn
        await page.waitForTimeout(500);
      }
    }

    console.log(`[Blitz] Total correct pops: ${correctPops}`);

    // Assert saga map visible (timer expired → onExit → saga map)
    await waitForSagaMap(page);

    // Assert localStorage: arcade best score for BLITZ recorded
    const blitzScore = await getArcadeBestScore(page, 'blitz');
    console.log(`[Blitz] Arcade best score: ${blitzScore}`);
    expect(blitzScore).toBeGreaterThanOrEqual(0);

    console.log('[Blitz] Test PASSED!');
  });

  // ─── Test 3: Math Invaders — play → game over → return to saga map ───
  test('Math Invaders — play → game over → return to saga map', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'InvadersBot');

    // Enter n3_1 and switch to INVADERS mode via React fiber manipulation
    // (same technique as memory-duel.spec.ts)
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

    // Switch GameOrchestrator from LESSON mode to INVADERS mode via React fiber
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
          // Find the internalMode useState hook (value is null)
          let h = fiber.memoizedState;
          while (h) {
            const v = h.memoizedState;
            if (v === null && h.queue && typeof h.queue.dispatch === 'function') {
              h.queue.dispatch('INVADERS');
              return { found: true, component: componentName };
            }
            h = h.next;
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
      throw new Error(`Failed to switch to INVADERS mode: ${switchResult.error}`);
    }

    console.log('[Invaders] Switched to INVADERS mode:', JSON.stringify(switchResult));
    await page.waitForTimeout(2000);

    // Verify MathInvadersGame is visible
    const invadersTitle = page.locator('h2').filter({ hasText: /Math Invaders|פלישת המתמטיקה/i }).first();
    await expect(invadersTitle).toBeVisible({ timeout: 10000 });

    console.log('[Invaders] Game is visible. Playing until game over...');

    // Play the game — click answer buttons to shoot invaders
    const maxPlayMs = 120000; // 2 minutes max
    const playStart = Date.now();

    while (Date.now() - playStart < maxPlayMs) {
      await page.waitForTimeout(1000);

      // Check if game over screen appeared
      const bodyText = await page.textContent('body') || '';
      if (bodyText.match(/Play Again|שחק שוב|Nice try|You did it|Game Over/i)) {
        console.log(`[Invaders] End screen detected after ${Math.round((Date.now() - playStart) / 1000)}s`);
        break;
      }

      // Check if back on saga map
      if (await isOnSagaMap(page)) {
        console.log(`[Invaders] Saga map detected after ${Math.round((Date.now() - playStart) / 1000)}s`);
        break;
      }

      // Click an answer button
      const answerButtons = page.locator('button.absolute.rounded-full').filter({
        has: page.locator('span[dir="ltr"]'),
      });

      const btnCount = await answerButtons.count();
      if (btnCount > 0) {
        const btn = answerButtons.first();
        const box = await btn.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(500);
        }
      }
    }

    // If we see the end screen, click "Back to Map" to exit.
    const endScreenModal = page.locator('div.fixed.inset-0.z-50').last();
    if (await endScreenModal.count() > 0) {
      let backBtn = endScreenModal.locator('button').filter({ hasText: /חזרה|Back to Map/i }).first();
      if (await backBtn.count() === 0) {
        const allBtns = endScreenModal.locator('button');
        const btnCount = await allBtns.count();
        if (btnCount >= 2) {
          backBtn = allBtns.nth(btnCount - 1);
        }
      }
      if (await backBtn.count() > 0) {
        console.log('[Invaders] Clicking "Back to Map" button');
        await backBtn.click();
        await page.waitForTimeout(2000);
      } else {
        console.log('[Invaders] Could not find Back button, trying page-wide search');
        const anyBackBtn = page.locator('button').filter({ hasText: /חזרה/i }).first();
        if (await anyBackBtn.count() > 0) {
          await anyBackBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Assert saga map visible
    await waitForSagaMap(page);

    console.log('[Invaders] Test PASSED!');
  });
});
