/**
 * E2E: Parent Games — Sudoku, Equation of the Day, Parent Blitz, Number Merge
 *
 * Replaces the previous 4-test smoke spec with 14 comprehensive tests:
 *
 * Navigation (2):
 *  1. Games tab shows all 4 available game cards + disabled math-crossword
 *  2. Each available game card is clickable → game view opens
 *
 * Sudoku (4):
 *  3. Difficulty selector renders with 3 buttons (easy/medium/hard)
 *  4. Selecting easy → 9×9 grid renders, timer visible, keypad visible
 *  5. Cell selection + number input → cell value changes; wrong number → mistake counter increments
 *  6. Exit from difficulty selector returns to games hub
 *
 * Equation of the Day (3):
 *  7. EOTD renders with equation grid (6 rows), puzzle number, streak, keyboard
 *  8. Type a full-length guess and submit → cells get states (correct/present/absent)
 *  9. Submit a partial guess → error appears / submit disabled
 *
 * Parent Blitz (3):
 * 10. Idle screen → start button → playing: timer, question, keypad visible
 * 11. Type answer and submit → feedback appears (correct/wrong), score updates on correct
 * 12. Exit from idle screen returns to games hub
 *
 * Number Merge (2):
 * 13. Idle screen → start → 4×4 board renders with 2 tiles
 * 14. Arrow key moves tiles → board changes (at least one tile position changes)
 *
 * Model: glm-5.2 (fallback — Claude session limit reached, Gemini IneligibleTierError)
 * Delegation attempted via ask-claude --escalate --card eb942f60-bcab-4ad1-ad36-1f070bb0e3be
 * Both Claude (session limit, resets 8pm Asia/Jerusalem) and Gemini CLI (IneligibleTierError —
 * Gemini Code Assist for individuals no longer supported) failed. Spec built from direct
 * source code analysis of all 4 game components, registry, and existing E2E patterns.
 */

import { test, expect, type Page } from '@playwright/test';
import { setupFreshProfile, openParentGate } from './helpers';

/** Available game IDs from registry.ts. */
const AVAILABLE_GAMES = [
  'equation-of-the-day',
  'parent-blitz',
  'sudoku',
  'number-merge',
] as const;

/** Coming-soon game (disabled card). */
const COMING_SOON_GAME = 'math-crossword';

/**
 * Navigate from a fresh saga map to the Parent Games Hub.
 * Flow: setupFreshProfile → logout → openParentGate → dashboard → Games tab.
 */
async function navigateToGamesHub(page: Page) {
  await setupFreshProfile(page, 'ParentGamesTest');

  // Log out from saga map to reach ProfileSelector
  const logoutBtn = page.locator('button[aria-label*="Log Out"], button[aria-label*="התנתק"]').first();
  await expect(logoutBtn).toBeVisible({ timeout: 10000 });
  await logoutBtn.click();
  await page.waitForTimeout(2000);

  // Open parent gate → dashboard
  await openParentGate(page);

  // Click Games tab (Hebrew: משחקים, English: Games)
  const gamesTab = page.locator('[data-testid="parent-dashboard"] button').filter({ hasText: /משחקים|Games/ }).first();
  await expect(gamesTab).toBeVisible({ timeout: 5000 });
  await gamesTab.click();
  await page.waitForTimeout(500);

  // Verify games list is visible
  await expect(page.locator('[data-testid="games-list"]').first()).toBeVisible({ timeout: 5000 });
}

/**
 * Click a game card and verify the game view opens.
 */
async function openGame(page: Page, gameId: string) {
  const card = page.locator(`[data-testid="game-card-${gameId}"]`).first();
  await expect(card).toBeVisible({ timeout: 5000 });
  await card.click();
  await page.waitForTimeout(500);

  // Verify game view is visible (has back button)
  await expect(page.locator('[data-testid="game-view"]').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="back-button"]').first()).toBeVisible({ timeout: 5000 });
}

/**
 * Go back from a game to the games hub list.
 */
async function backToHub(page: Page) {
  const backBtn = page.locator('[data-testid="back-button"]').first();
  await expect(backBtn).toBeVisible({ timeout: 5000 });
  await backBtn.click();
  await page.waitForTimeout(500);

  // Verify we're back at the games list
  await expect(page.locator('[data-testid="games-list"]').first()).toBeVisible({ timeout: 5000 });
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('Parent Games', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await navigateToGamesHub(page);
  });

  // ─── Navigation ─────────────────────────────────────────────────

  test('Games tab shows all 4 available game cards + disabled math-crossword', async ({ page }) => {
    // All 4 available games should have visible, enabled cards
    for (const gameId of AVAILABLE_GAMES) {
      const card = page.locator(`[data-testid="game-card-${gameId}"]`).first();
      await expect(card).toBeVisible({ timeout: 5000 });
      await expect(card).toBeEnabled({ timeout: 5000 });
    }

    // math-crossword should be visible but disabled (coming soon)
    const crosswordCard = page.locator(`[data-testid="game-card-${COMING_SOON_GAME}"]`).first();
    await expect(crosswordCard).toBeVisible({ timeout: 5000 });
    await expect(crosswordCard).toBeDisabled({ timeout: 5000 });
  });

  test('Each available game card opens the game view', async ({ page }) => {
    for (const gameId of AVAILABLE_GAMES) {
      await openGame(page, gameId);
      await backToHub(page);
    }
  });

  // ─── Sudoku ──────────────────────────────────────────────────────

  test('Sudoku difficulty selector renders with 3 buttons (easy/medium/hard)', async ({ page }) => {
    await openGame(page, 'sudoku');

    // Verify difficulty selector is visible
    await expect(page.locator('[data-testid="sudoku-difficulty-selector"]').first()).toBeVisible({ timeout: 5000 });

    // Verify all 3 difficulty buttons
    for (const diff of ['easy', 'medium', 'hard'] as const) {
      const btn = page.locator(`[data-testid="sudoku-difficulty-${diff}"]`).first();
      await expect(btn).toBeVisible({ timeout: 5000 });
      await expect(btn).toBeEnabled({ timeout: 5000 });
    }

    // Verify exit button on difficulty selector
    await expect(page.locator('[data-testid="sudoku-exit"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('Selecting easy difficulty → 9×9 grid renders with timer and keypad', async ({ page }) => {
    await openGame(page, 'sudoku');

    // Click easy difficulty
    await page.locator('[data-testid="sudoku-difficulty-easy"]').first().click();
    await page.waitForTimeout(500);

    // Verify sudoku root and grid
    await expect(page.locator('[data-testid="sudoku-root"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="sudoku-grid"]').first()).toBeVisible({ timeout: 5000 });

    // Verify 81 cells (9×9)
    const cells = page.locator('[data-testid^="sudoku-cell-"]');
    await expect(cells).toHaveCount(81, { timeout: 5000 });

    // Verify timer visible
    await expect(page.locator('[data-testid="sudoku-timer"]').first()).toBeVisible({ timeout: 5000 });

    // Verify keypad visible
    await expect(page.locator('[data-testid="sudoku-keypad"]').first()).toBeVisible({ timeout: 5000 });

    // Verify number keys 1-9
    for (let n = 1; n <= 9; n++) {
      await expect(page.locator(`[data-testid="sudoku-key-${n}"]`).first()).toBeVisible({ timeout: 5000 });
    }

    // Verify erase button
    await expect(page.locator('[data-testid="sudoku-erase"]').first()).toBeVisible({ timeout: 5000 });

    // Verify puzzle number display
    await expect(page.locator('[data-testid="sudoku-puzzle-number"]').first()).toBeVisible({ timeout: 5000 });

    // Verify mistakes counter
    await expect(page.locator('[data-testid="sudoku-mistakes"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('Sudoku: cell selection + number input → cell updates, wrong input increments mistakes', async ({ page }) => {
    await openGame(page, 'sudoku');

    // Select easy difficulty
    await page.locator('[data-testid="sudoku-difficulty-easy"]').first().click();
    await page.waitForTimeout(500);

    // Read initial mistakes count
    const mistakesEl = page.locator('[data-testid="sudoku-mistakes"]').first();
    const initialMistakes = parseInt(await mistakesEl.getAttribute('data-mistakes') || '0');

    // Find an empty cell (data-state="empty")
    const emptyCell = page.locator('[data-testid^="sudoku-cell-"][data-state="empty"]').first();
    await expect(emptyCell).toBeVisible({ timeout: 5000 });

    // Click the empty cell to select it
    await emptyCell.click();
    await page.waitForTimeout(200);

    // Verify it's selected (data-state="selected")
    await expect(emptyCell).toHaveAttribute('data-state', 'selected');

    // Type a number using the keypad
    await page.locator('[data-testid="sudoku-key-5"]').first().click();
    await page.waitForTimeout(200);

    // The cell should now have value 5
    await expect(emptyCell).toHaveAttribute('data-value', '5');

    // Check if the number was wrong (data-state="wrong") — if so, mistakes should increment
    const newState = await emptyCell.getAttribute('data-state');
    if (newState === 'wrong') {
      const updatedMistakes = parseInt(await mistakesEl.getAttribute('data-mistakes') || '0');
      expect(updatedMistakes).toBeGreaterThan(initialMistakes);
    }

    // Test erase: click the cell again, then erase
    await emptyCell.click();
    await page.waitForTimeout(100);
    await page.locator('[data-testid="sudoku-erase"]').first().click();
    await page.waitForTimeout(200);

    // Cell should be empty again (value 0 or no value)
    const valueAfterErase = await emptyCell.getAttribute('data-value');
    expect(valueAfterErase === '0' || valueAfterErase === null || valueAfterErase === '').toBeTruthy();
  });

  test('Sudoku: exit from difficulty selector returns to games hub', async ({ page }) => {
    await openGame(page, 'sudoku');

    // Click exit on difficulty selector (before selecting a difficulty)
    await page.locator('[data-testid="sudoku-exit"]').first().click();
    await page.waitForTimeout(500);

    // Should be back at games list
    await expect(page.locator('[data-testid="games-list"]').first()).toBeVisible({ timeout: 5000 });
  });

  // ─── Equation of the Day ────────────────────────────────────────

  test('EOTD renders with equation grid, puzzle number, streak, and keyboard', async ({ page }) => {
    await openGame(page, 'equation-of-the-day');

    // Verify game container
    await expect(page.locator('[data-testid="game-equation-of-the-day"]').first()).toBeVisible({ timeout: 5000 });

    // Verify puzzle number
    await expect(page.locator('[data-testid="eq-puzzle-number"]').first()).toBeVisible({ timeout: 5000 });

    // Verify streak indicator
    await expect(page.locator('[data-testid="eq-streak"]').first()).toBeVisible({ timeout: 5000 });

    // Verify equation grid with 6 rows (MAX_GUESSES)
    for (let row = 0; row < 6; row++) {
      await expect(page.locator(`[data-testid="eq-row-${row}"]`).first()).toBeVisible({ timeout: 5000 });
    }

    // Verify on-screen keyboard
    await expect(page.locator('[data-testid="eq-keyboard"]').first()).toBeVisible({ timeout: 5000 });

    // Verify number keys 0-9
    for (let n = 0; n <= 9; n++) {
      await expect(page.locator(`[data-testid="eq-key-${n}"]`).first()).toBeVisible({ timeout: 5000 });
    }

    // Verify operator keys
    for (const op of ['+', '-', '*', '/', '=']) {
      await expect(page.locator(`[data-testid="eq-key-${op}"]`).first()).toBeVisible({ timeout: 5000 });
    }

    // Verify backspace and submit
    await expect(page.locator('[data-testid="eq-backspace"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="eq-submit"]').first()).toBeVisible({ timeout: 5000 });

    // Verify guesses-left indicator
    await expect(page.locator('[data-testid="eq-guesses-left"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('EOTD: type a full-length guess and submit → cells get scored states', async ({ page }) => {
    await openGame(page, 'equation-of-the-day');

    // Wait for keyboard
    await expect(page.locator('[data-testid="eq-keyboard"]').first()).toBeVisible({ timeout: 5000 });

    // The solution format is like "6+7=13" (length varies).
    // We need to fill the first row with a valid-length guess.
    // Strategy: type a few chars and check if submit becomes enabled.
    // If the guess is wrong length, submit stays disabled.
    // Type a plausible equation: try different lengths.

    // First, check the first row cell count to determine solution length
    const row0Cells = page.locator('[data-testid="eq-cell-0-0"], [data-testid="eq-cell-0-1"], [data-testid="eq-cell-0-2"], [data-testid="eq-cell-0-3"], [data-testid="eq-cell-0-4"], [data-testid="eq-cell-0-5"], [data-testid="eq-cell-0-6"], [data-testid="eq-cell-0-7"]');
    const cellCount = await row0Cells.count();

    // Type a guess of the correct length.
    // Common solutions: "6+7=13" (6 chars), "3+4=7" (5 chars but unlikely with 2-digit results),
    // "12+34=46" (9 chars). We'll try a generic approach: type "1+1=2" and pad if needed.
    // Actually, the engine generates equations like "leftSide=rightSide" where leftSide is
    // "a+b" format. Let's try common patterns based on length.

    // Try: type some digits and operators to fill the row
    const guessChars = ['1', '+', '1', '=', '2'];

    // If the solution is longer, we need more chars. Let's try a 6-char guess first.
    // Solutions seen in engine: "6+7=13" (6 chars). Let's try that pattern.
    const sixCharGuess = ['6', '+', '7', '=', '1', '3'];

    let charsToType: string[];
    if (cellCount >= 6) {
      // Pad the 6-char guess if solution is longer
      charsToType = sixCharGuess;
      // If more cells needed, try extending with more digits
      if (cellCount > 6) {
        charsToType = [...sixCharGuess];
        for (let i = 6; i < cellCount; i++) {
          charsToType.push('1');
        }
      }
    } else {
      charsToType = guessChars.slice(0, cellCount);
    }

    // Type each character using the on-screen keyboard
    for (const char of charsToType) {
      const key = page.locator(`[data-testid="eq-key-${char}"]`).first();
      await key.click();
      await page.waitForTimeout(100);
    }

    // Verify submit is now enabled (not disabled)
    const submitBtn = page.locator('[data-testid="eq-submit"]').first();
    await expect(submitBtn).toBeEnabled({ timeout: 2000 });

    // Submit the guess
    await submitBtn.click();
    await page.waitForTimeout(500);

    // After submit, the row cells should have data-state attributes (correct/present/absent)
    // Check at least one cell in row 0 has a scored state
    const scoredCell = page.locator('[data-testid="eq-cell-0-0"]').first();
    const cellState = await scoredCell.getAttribute('data-state');
    expect(['correct', 'present', 'absent']).toContain(cellState);

    // If the guess was correct, we should see the result panel
    // If wrong, we should see guesses-left decreased or next row active
    // Either way, the first row should now be "locked" (has scored states)
    for (let col = 0; col < charsToType.length; col++) {
      const cell = page.locator(`[data-testid="eq-cell-0-${col}"]`).first();
      const state = await cell.getAttribute('data-state');
      expect(['correct', 'present', 'absent']).toContain(state);
    }
  });

  test('EOTD: submit button is disabled when guess is incomplete', async ({ page }) => {
    await openGame(page, 'equation-of-the-day');

    await expect(page.locator('[data-testid="eq-keyboard"]').first()).toBeVisible({ timeout: 5000 });

    // Type only 2 chars (incomplete guess)
    await page.locator('[data-testid="eq-key-1"]').first().click();
    await page.waitForTimeout(100);
    await page.locator('[data-testid="eq-key-+"]').first().click();
    await page.waitForTimeout(100);

    // Submit should be disabled
    const submitBtn = page.locator('[data-testid="eq-submit"]').first();
    await expect(submitBtn).toBeDisabled({ timeout: 2000 });

    // Type backspace to clear
    await page.locator('[data-testid="eq-backspace"]').first().click();
    await page.waitForTimeout(100);
    await page.locator('[data-testid="eq-backspace"]').first().click();
    await page.waitForTimeout(100);
  });

  // ─── Parent Blitz ───────────────────────────────────────────────

  test('Blitz idle screen → start → playing: timer, question, keypad visible', async ({ page }) => {
    await openGame(page, 'parent-blitz');

    // Verify idle screen
    await expect(page.locator('[data-testid="game-parent-blitz"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="parent-blitz-start"]').first()).toBeVisible({ timeout: 5000 });

    // Click start
    await page.locator('[data-testid="parent-blitz-start"]').first().click();
    await page.waitForTimeout(500);

    // Verify playing phase elements
    await expect(page.locator('[data-testid="parent-blitz-timer-bar"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="parent-blitz-time-remaining"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="parent-blitz-score"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="parent-blitz-question"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="parent-blitz-input"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="parent-blitz-keypad"]').first()).toBeVisible({ timeout: 5000 });

    // Verify keypad keys 0-9
    for (let n = 0; n <= 9; n++) {
      await expect(page.locator(`[data-testid="parent-blitz-key-${n}"]`).first()).toBeVisible({ timeout: 5000 });
    }

    // Verify backspace and submit on keypad
    await expect(page.locator('[data-testid="parent-blitz-key-backspace"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="parent-blitz-key-submit"]').first()).toBeVisible({ timeout: 5000 });

    // Verify skip button
    await expect(page.locator('[data-testid="parent-blitz-skip"]').first()).toBeVisible({ timeout: 5000 });

    // Verify streak indicator
    await expect(page.locator('[data-testid="parent-blitz-streak"]').first()).toBeVisible({ timeout: 5000 });

    // Read the timer value — should be counting down
    const timerText = await page.locator('[data-testid="parent-blitz-time-remaining"]').first().textContent();
    expect(timerText).toBeTruthy();
    const secondsLeft = parseInt(timerText!.trim());
    expect(secondsLeft).toBeGreaterThan(0);
    expect(secondsLeft).toBeLessThanOrEqual(60);
  });

  test('Blitz: type answer and submit → feedback appears, score may update', async ({ page }) => {
    await openGame(page, 'parent-blitz');

    // Start the game
    await page.locator('[data-testid="parent-blitz-start"]').first().click();
    await page.waitForTimeout(500);

    // Read the question
    const questionEl = page.locator('[data-testid="parent-blitz-question"]').first();
    const questionText = await questionEl.textContent();
    expect(questionText).toBeTruthy();

    // Parse the arithmetic question (e.g., "7 + 5")
    const match = questionText!.match(/(\d+)\s*([+\-×÷*])\s*(\d+)/);
    expect(match).toBeTruthy();

    const a = parseInt(match![1]);
    const op = match![2];
    const b = parseInt(match![3]);
    let answer: number;
    switch (op) {
      case '+': answer = a + b; break;
      case '-': answer = a - b; break;
      case '×': case '*': answer = a * b; break;
      case '÷': answer = Math.floor(a / b); break;
      default: answer = a + b;
    }

    // Read initial score
    const scoreEl = page.locator('[data-testid="parent-blitz-score"]').first();
    const initialScore = parseInt((await scoreEl.textContent())?.trim() || '0');

    // Type the answer using the on-screen keypad
    const answerStr = String(answer);
    for (const digit of answerStr) {
      await page.locator(`[data-testid="parent-blitz-key-${digit}"]`).first().click();
      await page.waitForTimeout(100);
    }

    // Submit
    await page.locator('[data-testid="parent-blitz-key-submit"]').first().click();
    await page.waitForTimeout(500);

    // Feedback should appear (correct or wrong)
    const feedback = page.locator('[data-testid="parent-blitz-feedback"]').first();
    // Wait for feedback to be visible (it appears after each answer)
    await expect(feedback).toBeVisible({ timeout: 3000 });

    const feedbackResult = await feedback.getAttribute('data-result');
    expect(['correct', 'wrong']).toContain(feedbackResult);

    // If correct, score should have increased
    if (feedbackResult === 'correct') {
      const newScore = parseInt((await scoreEl.textContent())?.trim() || '0');
      expect(newScore).toBeGreaterThan(initialScore);
    }
  });

  test('Blitz: exit from idle screen returns to games hub', async ({ page }) => {
    await openGame(page, 'parent-blitz');

    // We're on idle screen (no start clicked yet)
    // There's no exit button on the idle screen — use the hub back button
    await backToHub(page);
  });

  // ─── Number Merge ──────────────────────────────────────────────

  test('Merge: idle screen → start → 4×4 board renders with 2 tiles', async ({ page }) => {
    await openGame(page, 'number-merge');

    // Verify idle screen
    await expect(page.locator('[data-testid="game-number-merge"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="number-merge-start"]').first()).toBeVisible({ timeout: 5000 });

    // Click start
    await page.locator('[data-testid="number-merge-start"]').first().click();
    await page.waitForTimeout(500);

    // Verify score display
    await expect(page.locator('[data-testid="number-merge-score"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="number-merge-best-score"]').first()).toBeVisible({ timeout: 5000 });

    // Verify board
    await expect(page.locator('[data-testid="number-merge-board"]').first()).toBeVisible({ timeout: 5000 });

    // Verify 16 cells (4×4 grid)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        await expect(page.locator(`[data-testid="number-merge-cell-${row}-${col}"]`).first()).toBeVisible({ timeout: 5000 });
      }
    }

    // Verify at least 2 tiles are present (initial spawn)
    const tiles = page.locator('[data-testid^="number-merge-tile-"]');
    const tileCount = await tiles.count();
    expect(tileCount).toBeGreaterThanOrEqual(2);

    // Verify hint text
    await expect(page.locator('[data-testid="number-merge-hint"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('Merge: arrow key moves tiles → board state changes', async ({ page }) => {
    await openGame(page, 'number-merge');

    // Start the game
    await page.locator('[data-testid="number-merge-start"]').first().click();
    await page.waitForTimeout(500);

    // Read initial board state: capture all tile values and positions
    const getBoardState = async () => {
      const state: Record<string, string> = {};
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const cell = page.locator(`[data-testid="number-merge-cell-${row}-${col}"]`).first();
          const tile = cell.locator('[data-testid^="number-merge-tile-"]');
          if (await tile.count() > 0) {
            const testId = await tile.first().getAttribute('data-testid');
            state[`${row}-${col}`] = testId || '';
          } else {
            state[`${row}-${col}`] = '';
          }
        }
      }
      return state;
    };

    const initialState = await getBoardState();
    const initialTiles = Object.values(initialState).filter(v => v !== '');
    expect(initialTiles.length).toBeGreaterThanOrEqual(2);

    // Press arrow keys multiple times to ensure movement
    const directions = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    let boardChanged = false;

    for (const dir of directions) {
      await page.keyboard.press(dir);
      await page.waitForTimeout(300);

      const newState = await getBoardState();

      // Check if any tile position changed
      for (const key of Object.keys(newState)) {
        if (newState[key] !== initialState[key]) {
          boardChanged = true;
          break;
        }
      }

      if (boardChanged) break;
    }

    // At least one arrow key should have moved a tile
    expect(boardChanged).toBe(true);

    // Verify score is still visible and non-negative
    const scoreText = await page.locator('[data-testid="number-merge-score"]').first().textContent();
    const score = parseInt(scoreText?.trim() || '0');
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
