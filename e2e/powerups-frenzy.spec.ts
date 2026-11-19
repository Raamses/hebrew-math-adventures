/**
 * powerups-frenzy.spec.ts
 *
 * E2E coverage for Powerups, Frenzy Mode, and Level Up Banners in the
 * bubble game.
 *
 * ── Frenzy Mode — 4 tests ─────────────────────────────────────────────────
 *  1. Build combo to 5 → frenzy overlay appears (role="status")
 *  2. Combo 10 → frenzy escalates to super tier
 *  3. Combo 15 → mega frenzy tier (5x)
 *  4. Frenzy ends when combo breaks
 *
 * ── Power-ups — 1 test ────────────────────────────────────────────────────
 *  5. Power-up bubble appears and can be popped
 *
 * ── Level Up Banner — 2 tests ─────────────────────────────────────────────
 *  6. Level up banner appears when level increases
 *  7. Level up banner shows correct level number
 *
 * Selector strategy (current app truth):
 *  - FrenzyOverlay: no data-testid; role="status" + aria-live="polite", tier
 *    shown as a "{multiplier}x" span.
 *  - LevelUpBanner: no data-testid; text t('game.levelUp') = "רמה {{level}}!"
 *    (he) / "Level {{level}}!" (en). LEVEL_UP_RE keeps the trailing "!" so the
 *    permanent "Lv {n}" HUD badge never matches.
 *  - Value bubbles: data-testid="bubble-{value}".
 *  - Power-up bubble (Frenzy Star): accessible name "Pop power-up bubble: {value}"
 *    (sensory/Bubble.tsx), found with getByRole.
 *  - Arcade modes: data-testid="arcade-button" → data-testid="arcade-mode-classic".
 *
 * Model: ask-claude --escalate --card e751ea10-535a-4909-9974-45c02f35e1d0
 *   — FAILED: "You've hit your session limit · resets 1:40am (Asia/Jerusalem)"
 *   Both claude-opus-5 (--escalate) and claude-sonnet-5 (default) were
 *   rate-limited. Gemini CLI also unavailable (IneligibleTierError).
 *   Specs written by glm-5.2 with full source context. Delegation failure
 *   documented per card instructions.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { setupFreshProfile, selectArcadeMode, readAnswer } from './helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────

// The equation banner — the same element `readAnswer` in helpers.ts parses.
const INSTRUCTION_SELECTOR = 'div[dir] span.font-mono';

// `game.levelUp` renders as "Level {{level}}!" (en) / "רמה {{level}}!" (he).
// The trailing "!" matters: the HUD permanently shows a compact "Lv 2", which
// must not be able to satisfy a level-up assertion.
const LEVEL_UP_RE = /(?:Level|רמה)\s*(\d+)\s*!/;

// Classic mode prints "Question 4 of 20" — a monotonic count of correct pops.
const QUESTION_COUNTER_RE = /Question\s*(\d+)\s*of\s*\d+/;

/**
 * Frenzy overlay: role="status" + aria-live="polite" and — unlike the other
 * live regions — it always carries the persistent multiplier badge
 * ("2x"/"3x"/"5x"), which keeps the locator immune to toast/aria noise.
 */
function frenzyOverlay(page: Page): Locator {
  return page
    .locator('[role="status"][aria-live="polite"]')
    .filter({ has: page.locator('span').filter({ hasText: /^\d+x$/ }) });
}

/** The bubble (value or fusion) that carries `value`. */
function bubbleFor(page: Page, value: number): Locator {
  return page
    .locator(`[data-testid="bubble-${value}"], [data-testid="fusion-bubble-${value}"]`)
    .first();
}

/** Start a classic arcade game from the saga map. */
async function startClassicArcade(page: Page): Promise<void> {
  await selectArcadeMode(page, 'classic');
  // selectArcadeMode settles the mode selector; make sure the board actually
  // spawned before any round starts.
  await expect(page.locator('[data-testid^="bubble-"]').first()).toBeVisible({ timeout: 20_000 });
}

async function visibleQuestionNumber(page: Page): Promise<number | null> {
  const body = (await page.textContent('body').catch(() => '')) ?? '';
  const match = body.match(QUESTION_COUNTER_RE);
  return match ? parseInt(match[1]!, 10) : null;
}

interface AnswerResult {
  /** The game moved on: the question counter advanced or the equation rotated. */
  advanced: boolean;
  /** Value that was answered (null when the equation could not be parsed). */
  answer: number | null;
  /** Level announced by a level-up banner during the answer, if any. */
  levelUp: number | null;
}

/**
 * Answer the problem currently on screen.
 *
 * The engine rotates the target on every correct pop (`handleSessionLeveling`
 * → `regenerateProblem`) and target bubbles are spawned by the game loop. The
 * old `solveBubbleProblem` loop clicked "the bubble with the answer" even when
 * that bubble had not spawned yet, so roughly half of the rounds were no-ops
 * and combos stalled below the frenzy thresholds. This helper re-reads the
 * equation every round, waits for the matching bubble to exist, pops it, and
 * samples the post-pop DOM for the transient level-up banner.
 */
async function answerOnce(page: Page, settleMs = 1_300): Promise<AnswerResult> {
  const instruction = page.locator(INSTRUCTION_SELECTOR).first();
  await expect(instruction).not.toBeEmpty({ timeout: 20_000 });

  const beforeText = ((await instruction.textContent()) ?? '').trim();
  const beforeQuestion = await visibleQuestionNumber(page);

  const answer = await readAnswer(page).catch(() => null);
  if (answer === null) return { advanced: false, answer: null, levelUp: null };

  const bubble = bubbleFor(page, answer);
  try {
    await bubble.waitFor({ state: 'attached', timeout: 20_000 });
  } catch {
    // The engine force-spawns targets on a drought timer; let the caller retry.
    return { advanced: false, answer, levelUp: null };
  }
  await bubble.dispatchEvent('click');

  let levelUp: number | null = null;
  let advanced = false;
  const startedAt = Date.now();

  // LevelUpBanner lives ~2s, so sample the DOM while the pop propagates
  // instead of reading the body once after the fact (how it was missed).
  while (Date.now() - startedAt < 6_000) {
    const body = (await page.textContent('body').catch(() => '')) ?? '';
    const levelMatch = body.match(LEVEL_UP_RE);
    if (levelMatch) levelUp = parseInt(levelMatch[1]!, 10);

    if (!advanced) {
      const nowText = ((await instruction.textContent().catch(() => '')) ?? '').trim();
      const nowQuestion = await visibleQuestionNumber(page);
      advanced =
        nowText !== beforeText ||
        (beforeQuestion !== null && nowQuestion !== null && nowQuestion > beforeQuestion);
    }

    if (advanced && (levelUp !== null || Date.now() - startedAt > settleMs)) break;
    await page.waitForTimeout(100);
  }

  return { advanced, answer, levelUp };
}

/**
 * Answer until `isDone()` reports the state we are after (frenzy tier, star
 * spawn, …). Returns the values answered so callers can avoid re-clicking one
 * of them when they need a genuinely wrong answer.
 */
async function answerUntil(
  page: Page,
  isDone: () => Promise<boolean>,
  maxAnswers = 40,
  maxMs = 150_000,
): Promise<{ done: boolean; answered: number[] }> {
  const answered: number[] = [];
  const deadline = Date.now() + maxMs;
  for (let i = 0; i < maxAnswers && Date.now() < deadline; i++) {
    const result = await answerOnce(page);
    if (result.answer !== null) answered.push(result.answer);
    if (await isDone()) return { done: true, answered };
  }
  return { done: await isDone(), answered };
}

/**
 * Answer until a level-up banner is seen. The banner is transient, so it is
 * captured from inside `answerOnce`'s post-pop watcher.
 */
async function answerUntilLevelUp(page: Page, maxAnswers = 20): Promise<number | null> {
  for (let i = 0; i < maxAnswers; i++) {
    const { levelUp } = await answerOnce(page);
    if (levelUp !== null) return levelUp;
  }
  const body = (await page.textContent('body').catch(() => '')) ?? '';
  const match = body.match(LEVEL_UP_RE);
  return match ? parseInt(match[1]!, 10) : null;
}

/** Poll the frenzy overlay until it is gone (combo broken / game over). */
async function waitForFrenzyToEnd(page: Page, overlay: Locator, timeoutMs = 4_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let visible = await overlay.first().isVisible().catch(() => false);
  while (visible && Date.now() < deadline) {
    await page.waitForTimeout(100);
    visible = await overlay.first().isVisible().catch(() => false);
  }
  return !visible;
}

/**
 * The Frenzy Star power-up bubble. sensory/Bubble.tsx gives power-ups the exact
 * accessible name "Pop power-up bubble: {value}" (value bubbles use "Pop bubble
 * with value …", bosses "Pop boss bubble …"), so match on the role + name.
 */
async function findPowerUpBubble(page: Page): Promise<Locator | null> {
  const powerUp = page.getByRole('button', { name: /^Pop power-up bubble/ }).first();
  return (await powerUp.count()) > 0 ? powerUp : null;
}

async function waitForPowerUpBubble(page: Page, timeoutMs = 10_000): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await findPowerUpBubble(page);
    if (found) return found;
    await page.waitForTimeout(200);
  }
  return findPowerUpBubble(page);
}

// ─── Tests ────────────────────────────────────────────────────────────────

test.describe('Powerups, Frenzy Mode, and Level Up Banners', () => {

  test.describe('Frenzy Mode', () => {

    test('1. Build combo to 5 → frenzy overlay appears', async ({ page }) => {
      test.setTimeout(180_000);
      await setupFreshProfile(page, 'FrenzyTester');
      await startClassicArcade(page);

      const overlay = frenzyOverlay(page);
      // Frenzy activates at combo 5 (FRENZY_CONFIG.FRENZY_THRESHOLD) and the
      // overlay stays mounted while the combo holds, so answer until it shows
      // up instead of guessing a fixed number of rounds.
      const { done } = await answerUntil(page, () => overlay.first().isVisible().catch(() => false));
      expect(done, 'frenzy overlay should appear once the combo reaches 5').toBe(true);

      await expect(overlay.first()).toBeVisible({ timeout: 5_000 });
      // The tier-1 frenzy badge advertises the 2x combo multiplier.
      await expect(overlay.first()).toContainText(/2x|2×/);
    });

    test('2. Combo 10 → frenzy escalates to super tier', async ({ page }) => {
      test.setTimeout(300_000);
      await setupFreshProfile(page, 'FrenzyTester');
      await startClassicArcade(page);

      const overlay = frenzyOverlay(page);
      // Super tier (3x) starts at combo 10 and holds until mega (combo 15), so
      // stop as soon as the overlay text carries the 3x badge.
      const { done } = await answerUntil(page, async () => {
        if (!(await overlay.first().isVisible().catch(() => false))) return false;
        const text = (await overlay.first().textContent().catch(() => '')) ?? '';
        return /3x|3×/.test(text);
      });
      expect(done, 'frenzy should escalate to the 3x super tier at combo 10').toBe(true);

      await expect(overlay.first()).toContainText(/3x|3×/);
    });

    test('3. Combo 15 → mega frenzy tier', async ({ page }) => {
      // Fifteen consecutive correct answers push the frenzy into the mega tier
      // (5×). The per-test timeout is raised so 15 bubble rounds fit comfortably.
      test.setTimeout(300_000);
      await setupFreshProfile(page, 'FrenzyTester');
      await startClassicArcade(page);

      const overlay = frenzyOverlay(page);
      // Mega tier (5x) starts at combo 15; the badge keeps showing 5x while the
      // combo holds, so stop as soon as the overlay advertises it.
      const { done } = await answerUntil(page, async () => {
        if (!(await overlay.first().isVisible().catch(() => false))) return false;
        const text = (await overlay.first().textContent().catch(() => '')) ?? '';
        return /5x|5×/.test(text);
      });
      expect(done, 'frenzy should reach the 5x mega tier at combo 15').toBe(true);

      await expect(overlay.first()).toContainText(/5x|5×/);
    });

    test('4. Frenzy ends when combo breaks (wrong answer)', async ({ page }) => {
      test.setTimeout(180_000);
      await setupFreshProfile(page, 'FrenzyTester');
      await startClassicArcade(page);

      const overlay = frenzyOverlay(page);
      // Build combo to 5 to trigger frenzy and confirm it is really active.
      const { done, answered } = await answerUntil(page, () => overlay.first().isVisible().catch(() => false));
      expect(done, 'frenzy should be active before breaking the combo').toBe(true);
      await expect(overlay.first()).toBeVisible({ timeout: 5_000 });

      // Pop a bubble that is neither the current target nor the previous target.
      // The engine's validateAgainst() (MathStrategy.ts) classifies a pop that
      // matches the previous target snapshot as "stale" and ignores it instead of
      // breaking the combo; any other non-target value is a genuine wrong answer.
      const current = await readAnswer(page).catch(() => null);
      const excluded = new Set<number>();
      const previous = answered[answered.length - 1];
      if (previous !== undefined) excluded.add(previous);
      if (current !== null) excluded.add(current);

      const bubbles = page.locator('[data-testid^="bubble-"]');
      let clickedWrong = false;
      let ended = false;

      // Re-scan the board each attempt: a bubble may already be popped (no-op)
      // or leave the screen, so keep trying until the overlay actually drops.
      for (let attempt = 0; attempt < 12 && !ended; attempt++) {
        const count = await bubbles.count();
        let clickedThisRound = false;
        for (let i = 0; i < count && !clickedThisRound; i++) {
          const bubble = bubbles.nth(i);
          const testId = (await bubble.getAttribute('data-testid').catch(() => null)) ?? '';
          const raw = testId.replace(/^(fusion-)?bubble-/, '');
          if (!/^-?\d+$/.test(raw)) continue; // power-up bubble
          const value = parseInt(raw, 10);
          if (excluded.has(value)) continue;
          await bubble.dispatchEvent('click');
          clickedThisRound = true;
          clickedWrong = true;
        }
        if (!clickedThisRound) {
          await page.waitForTimeout(500);
          continue;
        }
        ended = await waitForFrenzyToEnd(page, overlay);
      }

      expect(clickedWrong, 'a genuine distractor bubble should be on screen').toBe(true);
      expect(ended, 'frenzy overlay should disappear once the combo breaks').toBe(true);
    });

  });

  test.describe('Power-ups', () => {

    test('5. Power-up bubble appears and can be popped', async ({ page }) => {
      // Power-ups are not timer-based any more: crossing FRENZY_THRESHOLD spawns
      // a one-shot "Frenzy Star" bubble (useGameEngine.spawnFrenzyStar). Reach
      // the frenzy tier, then locate the star among the value bubbles.
      test.setTimeout(180_000);
      await setupFreshProfile(page, 'FrenzyTester');
      await startClassicArcade(page);

      const overlay = frenzyOverlay(page);
      const { done } = await answerUntil(page, () => overlay.first().isVisible().catch(() => false));
      expect(done, 'combo 5 should trigger the frenzy tier that awards a power-up').toBe(true);

      const powerup = await waitForPowerUpBubble(page);
      expect(powerup, 'Frenzy Star power-up bubble should spawn at the combo-5 crossing').not.toBeNull();

      // Popping the power-up consumes it: the engine marks it popped and removes it ~1 s later.
      // The star spawns inside the pop that lifted the combo to 5, and that pop holds the
      // container's answer lock for SESSION_CONFIG.ANSWER_LOCK_MS (120 ms). A click that lands in
      // that window is dropped without effect (BubbleGameContainer onPopWrapper), and nothing
      // else removes a power-up for 30 s, so one early click left the star on the board
      // (CI run 44532138252). Re-pop until it is gone; a click on an already-popped bubble is a
      // no-op (Bubble handleClick), so a retry can't double-pop. Only one star spawns per combo
      // crossing and the test stops answering here, so a second ✨ cannot replace it.
      const powerupBubble = page.getByRole('button', { name: /^Pop power-up bubble/ });
      await expect(async () => {
        if ((await powerupBubble.count()) > 0) await powerupBubble.first().dispatchEvent('click');
        await expect(powerupBubble).toHaveCount(0, { timeout: 2_500 });
      }).toPass({ timeout: 15_000 });
    });

  });

  test.describe('Level Up Banner', () => {

    test('6. Level up banner appears when level increases', async ({ page }) => {
      test.setTimeout(180_000);
      await setupFreshProfile(page, 'FrenzyTester');
      await startClassicArcade(page);

      // Level up occurs after a threshold of correct answers (LEVEL_UP_THRESHOLDS).
      // The banner is transient (~2s), so it is captured from the post-pop DOM
      // watcher inside answerOnce rather than from a single body read.
      const level = await answerUntilLevelUp(page);
      // Un-quarantined: a missing level-up banner is a hard failure rather than
      // a fixme, so drift in the level-up flow is caught.
      expect(level, 'level-up banner ("Level N!" / "רמה N!") should appear').not.toBeNull();
    });

    test('7. Level up banner shows correct level number', async ({ page }) => {
      test.setTimeout(180_000);
      await setupFreshProfile(page, 'FrenzyTester');
      await startClassicArcade(page);

      // The banner shows "Level 2!" / "רמה 2!" (level increases from 1 to 2) and
      // is transient, so it is captured during the post-pop watch.
      const level = await answerUntilLevelUp(page);
      // Un-quarantined: a missing banner is a hard failure rather than a fixme.
      if (level === null) {
        throw new Error('Level up banner text was not found in the page body');
      }
      expect(level).toBeGreaterThanOrEqual(2);
    });

  });

});
