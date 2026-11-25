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
  readInstructionText,
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
 * Reads the instruction via the shared probe (handles both the PracticeMode and
 * BubbleGameContainer DOM shapes), computes the target, waits for a matching bubble,
 * clicks it, then verifies from state that the pop actually registered — a React
 * remount between the waitFor and the click can otherwise leave the click as a
 * silent no-op on a detached node. Callers retry on a `false` return.
 *
 * Every wait is clamped to `deadlineTs` so a despawned/rotated bubble retries
 * immediately instead of stalling on the 20s default actionTimeout. Popped bubbles
 * stay mounted with opacity: 0 (still Playwright-"visible") and pointerEvents: 'none'
 * for ~1s after popping, so already-popped bubbles are skipped up front and pop
 * registration is detected via pointerEvents flipping to 'none' (or the instruction
 * advancing) rather than solely via `!isConnected`.
 */
async function popTargetBubble(page: Page, deadlineTs: number): Promise<boolean> {
  const inst = await readInstructionText(page);
  if (!inst) return false;

  const target = parseInstructionTarget(inst);
  if (target === null) return false;

  let remaining = deadlineTs - Date.now();
  if (remaining <= 0) return false;

  const selector = `[data-testid="bubble-${target}"]`;
  const liveIndex = await page.evaluate((sel) => {
    const els = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
    return els.findIndex((el) => el.isConnected && getComputedStyle(el).pointerEvents !== 'none');
  }, selector);
  if (liveIndex === -1) return false;

  const bubble = page.locator(selector).nth(liveIndex);
  let handle: Awaited<ReturnType<typeof bubble.elementHandle>> | null = null;
  try {
    await bubble.waitFor({ state: 'visible', timeout: Math.min(500, remaining) });
    remaining = deadlineTs - Date.now();
    if (remaining <= 0) return false;
    handle = await bubble.elementHandle({ timeout: Math.min(500, remaining) });
  } catch {
    return false;
  }
  if (!handle) return false;

  try {
    const clicked = await handle
      .evaluate((el: HTMLElement) => {
        if (!el.isConnected || getComputedStyle(el).pointerEvents === 'none') return false;
        try {
          el.click();
          return true;
        } catch {
          return false;
        }
      })
      .catch(() => false);
    if (!clicked) return false;

    // Poll for a real state change instead of trusting the click: the bubble
    // detaching, its pointerEvents flipping to 'none' (pre-removal pop state), or
    // the instruction advancing to the next problem.
    const registerDeadline = Math.min(Date.now() + 2000, deadlineTs);
    while (Date.now() < registerDeadline) {
      const registered = await handle
        .evaluate(
          (el: HTMLElement) =>
            !el.isConnected ||
            el.getClientRects().length === 0 ||
            getComputedStyle(el).pointerEvents === 'none'
        )
        .catch(() => true);
      if (registered) {
        // Clear BubbleGameContainer's 120ms ANSWER_LOCK_MS window before the caller retries.
        await page.waitForTimeout(150);
        return true;
      }
      const instNow = await readInstructionText(page);
      if (instNow && instNow !== inst) {
        await page.waitForTimeout(150);
        return true;
      }
      await page.waitForTimeout(100);
    }
    return false;
  } finally {
    await handle.dispose().catch(() => {});
  }
}

test.describe('Saga node completion', () => {
  // Global timeout is 180s — no need for local override

  // ─── Test 1: SENSORY node (n1_1) completion ─────────────────────────

  test('SENSORY node (n1_1) — pop target bubbles → completes → stars awarded → n1_2 unlocks', async ({ page }) => {
    await setupFreshProfile(page, 'SensoryComplete');

    // Enter n1_1 (Blast Off — first SENSORY node, unlocked by default)
    await enterSagaNodeById(page, 'n1_1');
    // State-based wait for the first bubble-game instruction to appear, instead of a fixed sleep.
    await expect
      .poll(async () => await readInstructionText(page), {
        message: 'waiting for initial bubble-game instruction to appear',
        timeout: 10_000,
      })
      .not.toBe('');

    // Pop target bubbles until the game completes, driven by a global deadline
    // rather than an attempt count. The instruction probe can go transiently null
    // between problems or during the victory animation — that's not "game over",
    // so the loop keeps polling through it until the saga map reappears or the
    // deadline is hit; waitForSagaMap below is the final backstop assertion.
    let popped = 0;
    const deadlineTs = Date.now() + 90_000;
    while (Date.now() < deadlineTs) {
      const arcadeVisible = await page.locator('[data-testid="saga-node-n1_1"]').first().isVisible().catch(() => false);
      if (arcadeVisible) {
        console.log(`[Test 1] saga map visible after ${popped} pops`);
        break;
      }

      const poppedNow = await popTargetBubble(page, deadlineTs);
      if (poppedNow) {
        popped++;
        console.log(`[Test 1] popped bubble #${popped}`);
      } else {
        // Instruction/bubble transiently missing, or the click didn't register — retry.
        await page.waitForTimeout(150);
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
