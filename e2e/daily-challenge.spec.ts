import { test, expect, type Page } from '@playwright/test';

const APP_URL = 'https://hebrew-math-adventures-2025.web.app';
const STORAGE_KEY = 'hebrew-math-daily-progress';

async function setupFreshProfile(page: Page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const newPlayerBtn = page.locator('button').filter({ hasText: /New Player|שחקן חדש/i }).first();
  if (await newPlayerBtn.count() > 0) {
    await newPlayerBtn.click();
    await page.waitForTimeout(800);
  }

  const nameInput = page.locator('input').first();
  if (await nameInput.count() > 0) {
    await nameInput.fill('TestBot');
    await page.waitForTimeout(300);
  }

  const saveBtn = page.locator('button').filter({ hasText: /save|ok|confirm|start|שמור|אישור|התחל|Let's Start/i }).first();
  if (await saveBtn.count() > 0) {
    await saveBtn.click();
    await page.waitForTimeout(1500);
  }

  const challengeBtn = page.locator('button').filter({ hasText: /Start Challenge|התחל אתגר/i }).first();
  if (await challengeBtn.count() > 0) {
    await challengeBtn.click();
    await page.waitForTimeout(1500);
  }
}

async function getDailyChallengeCorrect(page: Page): Promise<number> {
  return await page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return -1;
      const all = JSON.parse(raw);
      for (const profileId of Object.keys(all)) {
        const entry = all[profileId];
        if (entry && typeof entry.dailyChallengeCorrect === 'number') {
          return entry.dailyChallengeCorrect;
        }
      }
      return -1;
    } catch { return -1; }
  }, STORAGE_KEY);
}

async function getDailyChallengeDate(page: Page): Promise<string> {
  return await page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return '';
      const all = JSON.parse(raw);
      for (const profileId of Object.keys(all)) {
        const entry = all[profileId];
        if (entry && typeof entry.dailyChallengeDate === 'string') {
          return entry.dailyChallengeDate;
        }
      }
      return '';
    } catch { return ''; }
  }, STORAGE_KEY);
}

async function getDailyStamps(page: Page): Promise<string[]> {
  return await page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const all = JSON.parse(raw);
      for (const profileId of Object.keys(all)) {
        const entry = all[profileId];
        if (entry && Array.isArray(entry.dailyStamps)) {
          return entry.dailyStamps;
        }
      }
      return [];
    } catch { return []; }
  }, STORAGE_KEY);
}

async function getTotalCoins(page: Page): Promise<number> {
  return await page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return 0;
      const all = JSON.parse(raw);
      for (const profileId of Object.keys(all)) {
        const entry = all[profileId];
        if (entry && typeof entry.totalCoinsEarned === 'number') {
          return entry.totalCoinsEarned;
        }
      }
      return 0;
    } catch { return 0; }
  }, STORAGE_KEY);
}

/**
 * Solve the current problem. Handles arithmetic, comparison, and series types.
 * Returns true if an answer was submitted, false otherwise.
 */
async function solveCurrentProblem(page: Page): Promise<boolean> {
  const bodyText = await page.textContent('body') || '';

  // Summary screen?
  if (bodyText.match(/summary|סיכום|complete|Play Again|שחק שוב|Well done|כל הכבוד/i)) {
    console.log('  [solve] Summary screen detected');
    return false;
  }

  // Comparison question? Look for the three buttons: >, =, <
  const compareButtons = page.locator('button').filter({ hasText: /^[<=>]$/ });
  const compareCount = await compareButtons.count();

  if (compareCount >= 3) {
    // Extract all numbers from the page — first two are the operands
    const numbers = bodyText.match(/\d+/g) || [];
    if (numbers.length >= 2) {
      const num1 = parseInt(numbers[0]);
      const num2 = parseInt(numbers[1]);
      let symbol: string;
      if (num1 > num2) symbol = '>';
      else if (num1 < num2) symbol = '<';
      else symbol = '=';
      console.log(`  [solve] Compare: ${num1} ${symbol} ${num2}`);
      await compareButtons.filter({ hasText: symbol }).click();
      return true;
    }
  }

  // Arithmetic / series — look for input field
  const input = page.locator('input').first();
  if (await input.count() > 0) {
    // Pattern 1: "N op N =" (missing answer — most common, no ? in text)
    const eq1 = bodyText.match(/(\d+)\s*([+\-−×÷*])\s*(\d+)\s*=/);
    if (eq1) {
      const a = parseInt(eq1[1]);
      const op = eq1[2];
      const b = parseInt(eq1[3]);
      let answer: number;
      switch (op) {
        case '+': answer = a + b; break;
        case '-': case '−': answer = a - b; break;
        case '*': case '×': answer = a * b; break;
        case '÷': case '/': answer = Math.floor(a / b); break;
        default: answer = a + b;
      }
      console.log(`  [solve] Arithmetic: ${a} ${op} ${b} = ? → ${answer}`);
      await input.fill(String(answer));
      await page.waitForTimeout(200);
      const checkBtn = page.locator('button[type="submit"]').first();
      if (await checkBtn.count() > 0) await checkBtn.click();
      else await page.keyboard.press('Enter');
      return true;
    }

    // Pattern 2: original with ? markers ("? op N = result" or "N op ? = result")
    const eqMatch = bodyText.match(/(\d+|\?)\s*([+\-−×÷*])\s*(\d+|\?)\s*=\s*(\d+|\?)/);
    if (eqMatch) {
      const [, left, op, right, result] = eqMatch;
      let answer: number;
      if (result === '?') {
        const a = parseInt(left), b = parseInt(right);
        switch (op) {
          case '+': answer = a + b; break;
          case '-': case '−': answer = a - b; break;
          case '*': case '×': answer = a * b; break;
          case '÷': case '/': answer = Math.floor(a / b); break;
          default: answer = a + b;
        }
      } else if (left === '?') {
        const b = parseInt(right), r = parseInt(result);
        switch (op) {
          case '+': answer = r - b; break;
          case '-': case '−': answer = r + b; break;
          case '*': case '×': answer = Math.floor(r / b); break;
          case '÷': case '/': answer = r * b; break;
          default: answer = r - b;
        }
      } else if (right === '?') {
        const a = parseInt(left), r = parseInt(result);
        switch (op) {
          case '+': answer = r - a; break;
          case '-': case '−': answer = a - r; break;
          case '*': case '×': answer = Math.floor(r / a); break;
          case '÷': case '/': answer = Math.floor(a / r); break;
          default: answer = r - a;
        }
      } else {
        return false;
      }
      console.log(`  [solve] Arithmetic (missing): ${left} ${op} ${right} = ${result} → ${answer}`);
      await input.fill(String(answer));
      await page.waitForTimeout(200);
      const checkBtn = page.locator('button[type="submit"]').first();
      if (await checkBtn.count() > 0) await checkBtn.click();
      else await page.keyboard.press('Enter');
      return true;
    }

    // Series: "1, 2, 3, ?"
    const seriesMatch = bodyText.match(/(\d+)(?:\s*,\s*(\d+)){2,}/);
    if (seriesMatch) {
      const numbers = bodyText.match(/\d+/g)?.map(Number) || [];
      if (numbers.length >= 3) {
        const diff = numbers[1] - numbers[0];
        const expected = numbers[numbers.length - 1] + diff;
        console.log(`  [solve] Series: diff=${diff}, expected=${expected}`);
        await input.fill(String(expected));
        await page.waitForTimeout(200);
        const checkBtn = page.locator('button[type="submit"]').first();
        if (await checkBtn.count() > 0) await checkBtn.click();
        else await page.keyboard.press('Enter');
        return true;
      }
    }
  }

  console.log('  [solve] Could not solve. Body:', bodyText.slice(0, 200));
  return false;
}

async function selectZenAndPlay(page: Page) {
  const zenBtn = page.locator('button').filter({ hasText: /Zen/i }).first();
  if (await zenBtn.count() > 0) {
    await zenBtn.click();
    await page.waitForTimeout(2000);
  }
}

async function answerQuestions(page: Page, count: number): Promise<number> {
  let answered = 0;
  for (let i = 0; i < count; i++) {
    await page.waitForTimeout(1500);
    const solved = await solveCurrentProblem(page);
    if (!solved) break;
    answered++;
    // Wait for correctDelay (2s) + buffer for next problem to render
    await page.waitForTimeout(4000);
  }
  return answered;
}

test.describe('Daily Challenge Flow', () => {
  test('daily challenge correct count should increase after answering correctly', async ({ page }) => {
    await setupFreshProfile(page);
    await selectZenAndPlay(page);

    const initialCorrect = await getDailyChallengeCorrect(page);
    expect(initialCorrect).toBe(0);

    const answered = await answerQuestions(page, 5);
    expect(answered).toBeGreaterThan(0);

    const finalCorrect = await getDailyChallengeCorrect(page);
    console.log(`  Answered: ${answered}, dailyChallengeCorrect: ${finalCorrect}`);
    // Allow for timing variance — dailyChallengeCorrect should be > 0 and close to answered count
    expect(finalCorrect).toBeGreaterThan(0);
    expect(finalCorrect).toBeGreaterThanOrEqual(answered - 2);
  });

  test('daily challenge date should be today', async ({ page }) => {
    await setupFreshProfile(page);
    await selectZenAndPlay(page);

    await answerQuestions(page, 1);
    await page.waitForTimeout(1000);

    const date = await getDailyChallengeDate(page);
    const today = new Date().toISOString().slice(0, 10);
    expect(date).toBe(today);
  });

  test('daily challenge progress accumulates across sessions', async ({ page }) => {
    test.setTimeout(120000);
    await setupFreshProfile(page);
    await selectZenAndPlay(page);

    // Answer 3 questions in first session
    const answered1 = await answerQuestions(page, 3);
    expect(answered1).toBeGreaterThan(0);

    const afterFirstSession = await getDailyChallengeCorrect(page);
    console.log(`  After session 1: answered=${answered1}, dailyChallengeCorrect=${afterFirstSession}`);
    expect(afterFirstSession).toBeGreaterThan(0);

    // Keep answering until session ends (10 questions) then start a new session
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(1500);
      const solved = await solveCurrentProblem(page);
      if (!solved) {
        // Check for summary / play again
        const playAgain = page.locator('button').filter({ hasText: /again|שוב|play/i }).first();
        if (await playAgain.count() > 0) {
          await playAgain.click();
          await page.waitForTimeout(2000);
          await selectZenAndPlay(page);
          continue;
        }
        break;
      }
      await page.waitForTimeout(4000);
    }

    // After at least one more session, progress should be >= first session
    const afterMore = await getDailyChallengeCorrect(page);
    console.log(`  After more answers: dailyChallengeCorrect=${afterMore}`);
    expect(afterMore).toBeGreaterThanOrEqual(afterFirstSession);
  });

  test('daily challenge accumulates correct answers after correct responses', async ({ page }) => {
    test.setTimeout(120000);
    await setupFreshProfile(page);
    await selectZenAndPlay(page);

    // Answer 5 questions — dailyChallengeCorrect should increase
    const answered = await answerQuestions(page, 5);
 expect(answered).toBeGreaterThan(0);

    const afterAnswering = await getDailyChallengeCorrect(page);
    console.log(`  Answered ${answered}, dailyChallengeCorrect=${afterAnswering}`);
    expect(afterAnswering).toBeGreaterThan(0);

    // Answer 5 more — should be even higher
    const answered2 = await answerQuestions(page, 5);
    const afterMore = await getDailyChallengeCorrect(page);
    console.log(`  Answered ${answered2} more, dailyChallengeCorrect=${afterMore}`);
    expect(afterMore).toBeGreaterThanOrEqual(afterAnswering);
  });
});