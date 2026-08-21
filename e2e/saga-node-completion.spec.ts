import { test, expect, type Page } from '@playwright/test';
import {
  setupFreshProfile,
  setupFreshProfileWithPracticeAccess,
  enterSagaNodeById,
  solveCurrentProblem,
  submitWrongAnswer,
  waitForSagaMap,
  getSagaProgressForNode,
  getProfileId,
} from './helpers';

/**
 * Saga Node Completion — SENSORY + Star Tiers + Session Summary
 *
 * Covers §4.1 of EXPANDED_COVERAGE_PLAN.md.
 *
 * Test 1: SENSORY node (n1_1) completion → stars → n1_2 unlocks → persistence
 * Test 2: Perfect run (0-1 mistakes) → 3 stars
 * Test 3: Imperfect run (4+ mistakes) → 1 star
 * Test 4: Session summary content — accuracy, play-again, home buttons
 */

const SESSION_LENGTH = 10;
const SENSORY_TARGET_COUNT = 10; // winCondition.value for n1_1 (target_count: 10)

/**
 * Read the current instruction from the BubbleGameContainer header.
 * The instruction is in a div[dir="ltr"] element with a span.font-mono inside.
 */
async function getBubbleInstruction(page: Page): Promise<string | null> {
  const instEl = page.locator('div[dir="ltr"] span.font-mono').first();
  if (await instEl.count() === 0) return null;
  return await instEl.textContent();
}

/**
 * Extract the target number from the instruction text.
 * Handles: "Pop N", "Pop the bubble with N", "A + B = ?", "A - B = ?", "A × B = ?", "? + B = C", "A + ? = C"
 */
function parseInstructionTarget(inst: string): number | null {
  if (!inst) return null;

  // Strip Unicode directional/format marks (RLM, LRM, LRE, RLE, PDF, LRI, RLI, FSI, PDI, nbsp)
  // that the RTL Hebrew app inserts into text content. These invisible characters
  // break regex matching if not removed.
  const clean = inst.replace(/[\u200e\u200f\u200b\u202a-\u202e\u2066-\u2069\u00a0]/g, '');

  // "Pop N" or "Pop the bubble with N" — sensory mode
  const popMatch = clean.match(/Pop\s+(?:the\s+bubble\s+with\s+)?(\d+)/i);
  if (popMatch) return parseInt(popMatch[1]!);

  // Arithmetic: "A OP B = ?"
  const eqMatch = clean.match(/(\d+)\s*([+\-−×÷*])\s*(\d+)\s*=\s*\?/);
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
  const missingLeft = clean.match(/\?\s*([+\-−×÷*])\s*(\d+)\s*=\s*(\d+)/);
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
  const missingRight = clean.match(/(\d+)\s*([+\-−×÷*])\s*\?\s*=\s*(\d+)/);
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

  // Just a number
  const numMatch = clean.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1]!);

  return null;
}

/**
 * Pop a target bubble in the SENSORY game.
 * Reads the instruction, computes the target, waits for a matching bubble, and clicks it.
 * Uses aria-label selector for reliability.
 */
async function popTargetBubble(page: Page, timeoutMs = 5000): Promise<boolean> {
  const inst = await getBubbleInstruction(page);
  if (!inst) return false;

  const target = parseInstructionTarget(inst);
  if (target === null) {
    console.log(`[popTargetBubble] Could not parse target from: "${inst}"`);
    return false;
  }
  console.log(`[popTargetBubble] instruction="${inst}", target=${target}`);

  // Wait for a bubble with the target value to appear (using data-testid)
  const bubbleLocator = page.locator(`[data-testid="bubble-${target}"]`).first();

  try {
    await bubbleLocator.waitFor({ state: 'visible', timeout: timeoutMs });
  } catch {
    return false;
  }

  // Use evaluate to dispatch a click event directly on the bubble element.
  // This avoids issues with framer-motion animated elements where boundingBox
  // coordinates may be stale by the time mouse.click fires.
  await bubbleLocator.evaluate((el: HTMLElement) => el.click());
  return true;
}

/**
 * Check if the SENSORY game is still active (instruction visible, no saga map).
 */
async function isSensoryGameActive(page: Page): Promise<boolean> {
  const inst = await getBubbleInstruction(page);
  return inst !== null;
}

test.describe('Saga node completion', () => {
  // Global timeout is 180s — no need for local override

  // ─── Test 1: SENSORY node (n1_1) completion ─────────────────────────

  test('SENSORY node (n1_1) — pop target bubbles → completes → stars awarded → n1_2 unlocks', async ({ page }) => {
    await setupFreshProfile(page, 'SensoryComplete');

    // Enter n1_1 (Blast Off — first SENSORY node, unlocked by default)
    await enterSagaNodeById(page, 'n1_1');
    await page.waitForTimeout(3000); // Wait for initial bubbles to spawn

    // Pop target bubbles until the game completes.
    // The SENSORY game generates math problems; after every 3 correct pops,
    // the problem rotates and the target changes.
    let popped = 0;
    const maxAttempts = 40; // Reduced from 80 to avoid timeout
    for (let i = 0; i < maxAttempts; i++) {
      // Check if we're back on the saga map (game complete)
      const arcadeVisible = await page.locator('[data-testid="saga-node-n1_1"]').first().isVisible().catch(() => false);
      if (arcadeVisible) {
        console.log(`[Test 1] saga map visible after ${popped} pops`);
        break;
      }

      // Check if game is still active
      if (!(await isSensoryGameActive(page))) {
        console.log(`[Test 1] game no longer active after ${popped} pops`);
        await page.waitForTimeout(2000);
        break;
      }

      const poppedNow = await popTargetBubble(page, 5000);
      if (poppedNow) {
        popped++;
        console.log(`[Test 1] popped bubble #${popped}`);
        // Wait for: pop animation (300ms) + answer lock (120ms) + spawn (1200ms) + buffer
        await page.waitForTimeout(1500);
      } else {
        // No matching bubble on screen — wait for one to spawn
        await page.waitForTimeout(1000);
      }
    }

    console.log(`[Test 1] popped ${popped} target bubbles total`);

    // After SENSORY victory, GameOrchestrator calls onExit() → returns to saga map.
    await waitForSagaMap(page);

    // Assert localStorage saga progress
    const profileId = await getProfileId(page, 'SensoryComplete');
    expect(profileId).toBeTruthy();

    const n1_1Progress = await getSagaProgressForNode(page, profileId!, 'n1_1');
    console.log('[Test 1] n1_1 progress:', JSON.stringify(n1_1Progress));
    expect(n1_1Progress).toBeTruthy();
    expect(n1_1Progress!.stars).toBeGreaterThan(0);
    expect(n1_1Progress!.isLocked).toBe(false);

    // n1_2 should be unlocked after completing n1_1
    const n1_2Progress = await getSagaProgressForNode(page, profileId!, 'n1_2');
    console.log('[Test 1] n1_2 progress:', JSON.stringify(n1_2Progress));
    expect(n1_2Progress).toBeTruthy();
    expect(n1_2Progress!.isLocked).toBe(false);

    // Reload → progress persists
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // After reload, click the profile to get back to the saga map
    const profileBtn = page.locator('button', { hasText: 'SensoryComplete' }).first();
    if (await profileBtn.count() > 0) {
      await profileBtn.click();
      await page.waitForTimeout(5000); // Wait for mascot greeting to dismiss
    }

    await waitForSagaMap(page);

    const n1_1AfterReload = await getSagaProgressForNode(page, profileId!, 'n1_1');
    console.log('[Test 1] n1_1 after reload:', JSON.stringify(n1_1AfterReload));
    expect(n1_1AfterReload).toBeTruthy();
    expect(n1_1AfterReload!.stars).toBeGreaterThan(0);
    expect(n1_1AfterReload!.isLocked).toBe(false);

    const n1_2AfterReload = await getSagaProgressForNode(page, profileId!, 'n1_2');
    expect(n1_2AfterReload).toBeTruthy();
    expect(n1_2AfterReload!.isLocked).toBe(false);
  });

  // ─── Test 2: Perfect run → 3 stars ──────────────────────────────────

  test('Star tier — perfect run (0 mistakes) → 3 stars', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'PerfectRun');

    // n1_3 is a PRACTICE node (addition_simple, max 5) — unlocked by setup helper
    await enterSagaNodeById(page, 'n1_3');
    await page.waitForTimeout(1500);

    // Answer all 10 questions correctly with 0 mistakes
    let solvedCount = 0;
    for (let i = 0; i < SESSION_LENGTH + 5; i++) {
      const summaryVisible = await page.locator('[data-testid="session-summary"]').first().isVisible().catch(() => false);
      if (summaryVisible) break;

      const solved = await solveCurrentProblem(page);
      if (solved) {
        solvedCount++;
        await page.waitForTimeout(2500); // correctDelay + buffer for next problem
      } else {
        await page.waitForTimeout(500);
      }
    }

    console.log(`[Test 2] solved ${solvedCount} problems correctly`);

    // SessionSummary should be visible
    const summary = page.locator('[data-testid="session-summary"]').first();
    await expect(summary).toBeVisible({ timeout: 10000 });

    // Assert summary-stars shows 3
    const starsEl = page.locator('[data-testid="summary-stars"]').first();
    await expect(starsEl).toBeVisible();
    const starsText = await starsEl.textContent();
    console.log('[Test 2] summary-stars text:', starsText);
    expect(starsText).toContain('3');

    // Assert localStorage: n1_3.stars === 3
    const profileId = await getProfileId(page, 'PerfectRun');
    expect(profileId).toBeTruthy();

    const n1_3Progress = await getSagaProgressForNode(page, profileId!, 'n1_3');
    console.log('[Test 2] n1_3 progress:', JSON.stringify(n1_3Progress));
    expect(n1_3Progress).toBeTruthy();
    expect(n1_3Progress!.stars).toBe(3);
  });

  // ─── Test 3: Imperfect run (4+ mistakes) → 1 star ───────────────────

  test('Star tier — imperfect run (4+ mistakes) → 1 star', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'ImperfectRun');

    // n1_3 is a PRACTICE node (addition_simple, max 5) — unlocked by setup helper
    await enterSagaNodeById(page, 'n1_3');
    await page.waitForTimeout(1500);

    // Interleave 4 wrong answers among 10 correct answers.
    // Strategy: submit 4 wrong answers first (to accumulate mistakes),
    // then answer 10 correctly to complete the session.
    // With 4+ mistakes, tier = PASS → 1 star.
    // (PERFECT_MAX_MISTAKES = 1, GOOD_MAX_MISTAKES = 3, so 4 mistakes → PASS → 1 star)
    const wrongCount = 4;
    for (let i = 0; i < wrongCount; i++) {
      const inputVisible = await page.locator('[data-testid="math-input"]').first().isVisible().catch(() => false);
      if (!inputVisible) break;
      await submitWrongAnswer(page);
      await page.waitForTimeout(2000); // Wait for wrong-answer feedback + next problem
    }

    console.log(`[Test 3] submitted ${wrongCount} wrong answers`);

    // Now answer 10 correctly to complete the session
    let solvedCount = 0;
    for (let i = 0; i < SESSION_LENGTH + 5; i++) {
      const summaryVisible = await page.locator('[data-testid="session-summary"]').first().isVisible().catch(() => false);
      if (summaryVisible) break;

      const solved = await solveCurrentProblem(page);
      if (solved) {
        solvedCount++;
        await page.waitForTimeout(2500);
      } else {
        await page.waitForTimeout(500);
      }
    }

    console.log(`[Test 3] solved ${solvedCount} correctly after ${wrongCount} mistakes`);

    // SessionSummary should be visible
    const summary = page.locator('[data-testid="session-summary"]').first();
    await expect(summary).toBeVisible({ timeout: 10000 });

    // Assert summary-stars shows 1
    const starsEl = page.locator('[data-testid="summary-stars"]').first();
    await expect(starsEl).toBeVisible();
    const starsText = await starsEl.textContent();
    console.log('[Test 3] summary-stars text:', starsText);
    expect(starsText).toContain('1');

    // Assert localStorage: n1_3.stars === 1
    const profileId = await getProfileId(page, 'ImperfectRun');
    expect(profileId).toBeTruthy();

    const n1_3Progress = await getSagaProgressForNode(page, profileId!, 'n1_3');
    console.log('[Test 3] n1_3 progress:', JSON.stringify(n1_3Progress));
    expect(n1_3Progress).toBeTruthy();
    expect(n1_3Progress!.stars).toBe(1);
  });

  // ─── Test 4: Session summary content ────────────────────────────────

  test('Session summary — accuracy, play-again, and home buttons', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'SummaryContent');

    // Complete a session on n1_3 to reach SessionSummary
    await enterSagaNodeById(page, 'n1_3');
    await page.waitForTimeout(1500);

    // Answer all 10 correctly (perfect run for reliable summary)
    for (let i = 0; i < SESSION_LENGTH + 5; i++) {
      const summaryVisible = await page.locator('[data-testid="session-summary"]').first().isVisible().catch(() => false);
      if (summaryVisible) break;

      const solved = await solveCurrentProblem(page);
      if (solved) {
        await page.waitForTimeout(2500);
      } else {
        await page.waitForTimeout(500);
      }
    }

    // Assert SessionSummary is visible
    const summary = page.locator('[data-testid="session-summary"]').first();
    await expect(summary).toBeVisible({ timeout: 10000 });

    // Assert summary-accuracy is visible and has a percentage
    const accuracyEl = page.locator('[data-testid="summary-accuracy"]').first();
    await expect(accuracyEl).toBeVisible();
    const accuracyText = await accuracyEl.textContent();
    console.log('[Test 4] accuracy text:', accuracyText);
    expect(accuracyText).toMatch(/\d+%/);

    // Assert summary-play-again button is visible
    const playAgainBtn = page.locator('[data-testid="summary-play-again"]').first();
    await expect(playAgainBtn).toBeVisible();
    await expect(playAgainBtn).toBeEnabled();

    // Assert summary-home button is visible
    const homeBtn = page.locator('[data-testid="summary-home"]').first();
    await expect(homeBtn).toBeVisible();
    await expect(homeBtn).toBeEnabled();

    // Click play-again → new session starts (math-input should appear)
    await playAgainBtn.click();
    await page.waitForTimeout(2000);

    // Verify a new session started — math-input should be visible
    const mathInput = page.locator('[data-testid="math-input"]').first();
    await expect(mathInput).toBeVisible({ timeout: 10000 });

    // Verify we're NOT on the saga map (still in a session)
    const arcadeVisible = await page.locator('[data-testid="saga-node-n1_1"]').first().isVisible().catch(() => false);
    expect(arcadeVisible).toBe(false);
  });
});
