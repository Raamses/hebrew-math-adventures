import { test, expect, type Page } from '@playwright/test';
import {
  setupFreshProfile,
  enterSagaNodeById,
  waitForSagaMap,
  getSagaProgressForNode,
  getProfileId,
} from './helpers';

/**
 * Profile Switching — multi-profile isolation
 *
 * Covers §4.7 of EXPANDED_COVERAGE_PLAN.md.
 *
 * Test 1: Create two profiles → switch between them → progress isolated
 *   - Create profile "Alpha" → play n1_1 → earn stars (complete sensory node)
 *   - Navigate back to profile selection (logout from saga map)
 *   - Create profile "Beta" → verify Beta has fresh progress: n1_1 stars === 0
 *   - Switch back to Alpha → verify Alpha's progress preserved: n1_1.stars > 0
 */

/**
 * Read the current instruction from the BubbleGameContainer header.
 * The instruction is in a div[dir="ltr"] element with a span.font-mono inside.
 */
async function getBubbleInstruction(page: Page): Promise<string | null> {
  const instEl = page.locator('div[dir="ltr"] span.font-mono').first();
  if (await instEl.count() === 0) return null;
  // Strip Unicode bidi isolation characters (U+2068 ⁨, U+2069 ⁩)
  const raw = await instEl.textContent();
  return raw ? raw.replace(/[\u2066\u2067\u2068\u2069]/g, '') : null;
}

/**
 * Extract the target number from the instruction text.
 * Handles: "Pop N", "A + B = ?", "A - B = ?", "A × B = ?", "? + B = C", "A + ? = C"
 */
function parseInstructionTarget(inst: string): number | null {
  if (!inst) return null;

  // "Pop N" or "Pop the bubble with N" — sensory mode
  const popMatch = inst.match(/Pop\s+(?:the\s+bubble\s+with\s+)?(\d+)/i);
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

  // Just a number
  const numMatch = inst.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1]!);

  return null;
}

/**
 * Pop a target bubble in the SENSORY game.
 * Reads the instruction, computes the target, waits for a matching bubble, and clicks it.
 */
async function popTargetBubble(page: Page, timeoutMs = 5000): Promise<boolean> {
  const inst = await getBubbleInstruction(page);
  if (!inst) return false;

  const target = parseInstructionTarget(inst);
  if (target === null) {
    console.log(`[popTargetBubble] Could not parse target from: "${inst}"`);
    return false;
  }

  const bubbleLocator = page.locator(`[data-testid="bubble-${target}"]`).first();

  try {
    await bubbleLocator.waitFor({ state: 'visible', timeout: timeoutMs });
  } catch {
    return false;
  }

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

/**
 * Complete the n1_1 SENSORY node by popping target bubbles until the game ends.
 * Returns the number of bubbles popped.
 */
async function completeSensoryNode(page: Page): Promise<number> {
  let popped = 0;
  const maxAttempts = 80;

  for (let i = 0; i < maxAttempts; i++) {
    // Check if we're back on the saga map (game complete)
    const arcadeVisible = await page.locator('[data-testid="saga-node-n1_1"]').first().isVisible().catch(() => false);
    if (arcadeVisible) {
      console.log(`[completeSensoryNode] saga map visible after ${popped} pops`);
      break;
    }

    // Check if game is still active
    if (!(await isSensoryGameActive(page))) {
      console.log(`[completeSensoryNode] game no longer active after ${popped} pops`);
      await page.waitForTimeout(2000);
      break;
    }

    const poppedNow = await popTargetBubble(page, 8000);
    if (poppedNow) {
      popped++;
      console.log(`[completeSensoryNode] popped bubble #${popped}`);
      await page.waitForTimeout(2000);
    } else {
      await page.waitForTimeout(1300);
    }
  }

  return popped;
}

/**
 * Logout from the saga map by clicking the logout button.
 * The button has title/aria-label matching the i18n key for "logout".
 * After clicking, the ProfileSelector screen should appear.
 */
async function logoutToProfileSelector(page: Page): Promise<void> {
  // The logout button has a LogOut icon (svg.lucide-log-out) in the saga map header.
  // Use has: selector to find the button containing the logout icon.
  const logoutBtn = page.locator('button:has(svg.lucide-log-out)').first();
  await expect(logoutBtn).toBeVisible({ timeout: 5000 });
  await logoutBtn.click();
  await page.waitForTimeout(2000);

  // Verify we're on the ProfileSelector — look for the "New Player" button
  const newPlayerBtn = page.locator('button:has(svg.lucide-plus)').first();
  await expect(newPlayerBtn).toBeVisible({ timeout: 10000 });
}

/**
 * Create a new profile from the ProfileSelector screen.
 * Clicks "New Player", fills the name, submits, and waits for the saga map.
 */
async function createNewProfile(page: Page, name: string): Promise<void> {
  // Click "New Player" / "שחקן חדש" — has Plus icon
  const newPlayerBtn = page.locator('button:has(svg.lucide-plus)').first();
  await expect(newPlayerBtn).toBeVisible({ timeout: 5000 });
  await newPlayerBtn.click();
  await page.waitForTimeout(800);

  // Fill name — input has id="setup-name"
  await page.locator('input#setup-name').fill(name);
  await page.waitForTimeout(300);

  // Submit — button[type="submit"] with text "בוא נתחיל!" / "Let's Start!"
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);

  // Wait for mascot greeting to auto-dismiss (4s + 300ms exit animation)
  await page.waitForTimeout(5000);

  // Verify we're on the saga map
  await waitForSagaMap(page);
}

/**
 * Select an existing profile from the ProfileSelector screen by clicking its button.
 */
async function selectProfile(page: Page, name: string): Promise<void> {
  const profileBtn = page.locator('button', { hasText: name }).first();
  await expect(profileBtn).toBeVisible({ timeout: 10000 });
  await profileBtn.click();
  await page.waitForTimeout(5000); // Wait for mascot greeting to dismiss

  // Verify we're on the saga map
  await waitForSagaMap(page);
}

test.describe('Profile switching', () => {
  // Global timeout is 180s — no need for local override

  test('Create two profiles → switch between them → progress isolated', async ({ page }) => {
    // ── Step 1: Create profile "Alpha" and complete n1_1 to earn stars ──

    await setupFreshProfile(page, 'Alpha');
    console.log('[Step 1] Created profile Alpha, on saga map');

    // Enter n1_1 (Blast Off — first SENSORY node, unlocked by default)
    await enterSagaNodeById(page, 'n1_1');
    await page.waitForTimeout(3000); // Wait for initial bubbles to spawn

    // Pop target bubbles until the game completes
    const popped = await completeSensoryNode(page);
    console.log(`[Step 1] Popped ${popped} target bubbles, back on saga map`);

    // Verify we're back on the saga map
    await waitForSagaMap(page);

    // Assert Alpha has earned stars on n1_1
    const alphaId = await getProfileId(page, 'Alpha');
    expect(alphaId).toBeTruthy();
    console.log(`[Step 1] Alpha profile ID: ${alphaId}`);

    const alphaN1_1 = await getSagaProgressForNode(page, alphaId!, 'n1_1');
    console.log('[Step 1] Alpha n1_1 progress:', JSON.stringify(alphaN1_1));
    expect(alphaN1_1).toBeTruthy();
    expect(alphaN1_1!.stars).toBeGreaterThan(0);
    expect(alphaN1_1!.isLocked).toBe(false);

    // ── Step 2: Logout to profile selection screen ──

    await logoutToProfileSelector(page);
    console.log('[Step 2] Logged out, on ProfileSelector screen');

    // ── Step 3: Create profile "Beta" and verify fresh progress ──

    await createNewProfile(page, 'Beta');
    console.log('[Step 3] Created profile Beta, on saga map');

    // Get Beta's profile ID
    const betaId = await getProfileId(page, 'Beta');
    expect(betaId).toBeTruthy();
    console.log(`[Step 3] Beta profile ID: ${betaId}`);

    // Verify Beta has fresh progress — n1_1 should have stars === 0
    // (n1_1 is unlocked by default for new profiles, but no stars earned yet)
    const betaN1_1 = await getSagaProgressForNode(page, betaId!, 'n1_1');
    console.log('[Step 3] Beta n1_1 progress:', JSON.stringify(betaN1_1));

    // Beta's n1_1 should either be null (no progress entry) or have stars === 0
    if (betaN1_1) {
      expect(betaN1_1.stars).toBe(0);
    }
    // If null, that's also fine — no progress recorded yet, which means fresh

    // ── Step 4: Switch back to Alpha and verify progress preserved ──

    await logoutToProfileSelector(page);
    console.log('[Step 4] Logged out from Beta, on ProfileSelector screen');

    // Select Alpha's existing profile
    await selectProfile(page, 'Alpha');
    console.log('[Step 4] Selected Alpha profile, on saga map');

    // Verify Alpha's progress is preserved
    const alphaIdAfter = await getProfileId(page, 'Alpha');
    expect(alphaIdAfter).toBe(alphaId);

    const alphaN1_1After = await getSagaProgressForNode(page, alphaIdAfter!, 'n1_1');
    console.log('[Step 4] Alpha n1_1 progress after switch:', JSON.stringify(alphaN1_1After));
    expect(alphaN1_1After).toBeTruthy();
    expect(alphaN1_1After!.stars).toBeGreaterThan(0);
    expect(alphaN1_1After!.isLocked).toBe(false);

    // Verify the stars match what we earned earlier
    expect(alphaN1_1After!.stars).toBe(alphaN1_1!.stars);

    console.log('[Done] Profile isolation verified successfully');
  });
});
