import { test, expect, type Page, type Locator } from '@playwright/test';
import {
  setupFreshProfileWithPracticeAccess,
  setupWithUnlockedNodes,
  enterSagaNodeById,
  submitWrongAnswer,
  solveCurrentProblem,
} from './helpers';

/**
 * Learning Hints System — E2E
 *
 * Covers HintVisualizer + AdditionHint / SubtractionHint / MultiplicationHint /
 * DivisionHint / BorrowingHint components.
 *
 * The app defaults to Hebrew (lng: 'he'), but headless Chrome may fall back to
 * English.  Text assertions therefore accept BOTH Hebrew and English fragments;
 * the regexes match whichever locale is active.
 *
 * Hebrew text is matched with regexes on punctuation-free interior fragments
 * rather than whole strings.  Two reasons:
 *   1. Punctuation position in RTL source ("...זה?" vs "?...זה") is a frequent
 *      source of false failures, and tells us nothing about behaviour.
 *   2. Explainer strings are interpolated templates ("יש לנו {a}, נוסיף {b},
 *      וביחד הם {c}"), so only the literal segments are stable.
 *
 * Text assertions use toContainText() against the modal container instead of
 * getByText(), so a phrase split across several elements still matches.
 *
 * Model: claude-opus-5 (delegated via ask-claude --escalate --card e5463637)
 */

const T = {
  // Hebrew | English — button labels
  howTo: /איך עושים את זה|Show Hint/,
  hintHeader: /תנו לי לעזור|Let me help/,
  hintClose: /הבנתי.*תודה|Got it/,
  letsSee: /בואו נראה איך זה עובד|Let's see how it works/,
  // Hebrew | English — explainer fragments
  additionExplainer: /יש לנו[\s\S]*נוסיף[\s\S]*וביחד הם|We have[\s\S]*we add[\s\S]*together they make/,
  subtractionExplainer: /היו לנו[\s\S]*פחות[\s\S]*נשארו לנו|We had[\s\S]*we took away[\s\S]*left/,
  groups: /קבוצות של[\s\S]*שוות|groups of/,
  sharing: /תפוחים שמחולקים[\s\S]*סלסלות|apples shared by/,
  stepByStepSub: /שלב אחר שלב[\s\S]*חיסור|Step by Step.*Subtraction with Borrowing/,
  stepByStepAdd: /שלב אחר שלב[\s\S]*חיבור|Step by Step.*Vertical Addition/,
};

const NODES = {
  additionSimple: 'n1_3',   // addition_simple, max 5
  subSimple: 'n2_4',        // sub_simple, max 10
  multiplication: 'n3_8',   // multiplication, max 10
  subBorrow: 'n5_5',        // sub_borrow
  comparison: 'n1_5',       // comparison_simple, max 10 (non-arithmetic)
};

/**
 * framer-motion exit animations keep a node mounted after the close click, so
 * disappearance assertions need more than the default 5s expect timeout in CI.
 * Appearance needs no such allowance: Playwright's actionability check already
 * waits for a stable bounding box before clicking, so a mid-flight enter
 * animation cannot produce a missed click.
 */
const EXIT = { timeout: 10_000 };

// --- Locators -------------------------------------------------------------

function hintButton(page: Page): Locator {
  return page.getByTestId('hint-button').first();
}

function hintVisualizer(page: Page): Locator {
  return page.getByTestId('hint-visualizer').first();
}

function closeXButton(viz: Locator): Locator {
  return viz.getByTestId('hint-close-x').first();
}

function footerCloseButton(viz: Locator): Locator {
  return viz.getByTestId('hint-close-footer')
    .or(viz.getByRole('button', { name: T.hintClose }))
    .first();
}

/** Enter a practice node, answer wrong once, and open the hint modal. */
async function openHint(page: Page, nodeId: string): Promise<Locator> {
  await enterSagaNodeById(page, nodeId);
  await submitWrongAnswer(page);

  const button = hintButton(page);
  await expect(button).toBeVisible();
  await button.click();

  const viz = hintVisualizer(page);
  await expect(viz).toBeVisible();
  await expect(viz).toContainText(T.hintHeader);
  return viz;
}

let profileSeq = 0;

// --- Hint button visibility ----------------------------------------------

test.describe('hint button visibility', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupFreshProfileWithPracticeAccess(page, `hint vis ${testInfo.workerIndex} ${profileSeq++}`);
  });

  test('is hidden before the first wrong attempt', async ({ page }) => {
    await enterSagaNodeById(page, NODES.additionSimple);
    await expect(hintButton(page)).toBeHidden();
  });

  test('appears after one wrong attempt', async ({ page }) => {
    await enterSagaNodeById(page, NODES.additionSimple);
    await submitWrongAnswer(page);
    await expect(hintButton(page)).toBeVisible();
  });

  test('is styled as the yellow lightbulb affordance', async ({ page }) => {
    await enterSagaNodeById(page, NODES.additionSimple);
    await submitWrongAnswer(page);

    const button = hintButton(page);
    await expect(button).toBeVisible();
    await expect(button).toHaveClass(/bg-yellow-400/);
    await expect(button).toContainText(T.howTo);
    // Lightbulb icon renders as an inline SVG next to the label.
    await expect(button.locator('svg')).toBeVisible();
  });

  test('stays available after a second wrong attempt', async ({ page }) => {
    await enterSagaNodeById(page, NODES.additionSimple);
    await submitWrongAnswer(page);
    await submitWrongAnswer(page);
    await expect(hintButton(page)).toBeVisible();
  });
});

// --- Modal chrome ---------------------------------------------------------

test.describe('hint modal chrome', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupFreshProfileWithPracticeAccess(page, `hint chrome ${testInfo.workerIndex} ${profileSeq++}`);
  });

  test('opens with header, intro line and footer action', async ({ page }) => {
    const viz = await openHint(page, NODES.additionSimple);
    await expect(viz).toContainText(T.hintHeader);
    await expect(viz).toContainText(T.letsSee);
    await expect(footerCloseButton(viz)).toBeVisible();
  });

  test('dismisses via the footer button', async ({ page }) => {
    const viz = await openHint(page, NODES.additionSimple);
    await footerCloseButton(viz).click();
    await expect(viz).toBeHidden(EXIT);
  });

  test('dismisses via the X button', async ({ page }) => {
    const viz = await openHint(page, NODES.additionSimple);
    await closeXButton(viz).click();
    await expect(viz).toBeHidden(EXIT);
  });

  test('can be reopened after dismissal', async ({ page }) => {
    const viz = await openHint(page, NODES.additionSimple);
    await footerCloseButton(viz).click();
    await expect(viz).toBeHidden(EXIT);

    await hintButton(page).click();
    await expect(hintVisualizer(page)).toBeVisible();
    await expect(hintVisualizer(page)).toContainText(T.hintHeader);
  });
});

// --- Per-operation hint content ------------------------------------------

test.describe('hint content by operation', () => {
  test('addition shows two circle groups and the addition explainer', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, `hint add ${profileSeq++}`);
    const viz = await openHint(page, NODES.additionSimple);
    await expect(viz).toContainText(T.additionExplainer);

    const circles = viz.locator('svg circle');
    await expect(circles.first()).toBeVisible();
    expect(await circles.count()).toBeGreaterThan(1);
  });

  test('subtraction shows the subtraction explainer', async ({ page }) => {
    await setupWithUnlockedNodes(page, `hint sub ${profileSeq++}`, ['n2_4']);
    const viz = await openHint(page, NODES.subSimple);
    await expect(viz).toContainText(T.subtractionExplainer);
    await expect(viz.locator('svg circle').first()).toBeVisible();
  });

  test('multiplication shows a grid of stars and the groups explainer', async ({ page }) => {
    await setupWithUnlockedNodes(page, `hint mult ${profileSeq++}`, ['n3_8']);
    const viz = await openHint(page, NODES.multiplication);
    await expect(viz).toContainText(T.groups);
    await expect(viz.locator('svg')).toBeVisible();
  });

  test.fixme('division shows baskets, apples and the sharing explainer', async ({ page }) => {
    // No dedicated division practice node exists in learningPath.ts.
    // Division problems are only generated adaptively at level 5+ via
    // LEVEL_PROGRESSION, making a deterministic E2E test impossible
    // without adding a new practice node with config: { type: 'division' }.
    // If such a node is added, fill in its ID here and drop the .fixme.
    await setupWithUnlockedNodes(page, `hint div ${profileSeq++}`, ['TODO_DIV_NODE']);
    const viz = await openHint(page, 'TODO_DIV_NODE');
    await expect(viz).toContainText(T.sharing);
    await expect(viz.locator('svg')).toBeVisible();
  });
});

// --- Borrowing (step-by-step) hint ---------------------------------------

test.describe('borrowing hint', () => {
  function nextStep(viz: Locator): Locator {
    return viz.getByTestId('hint-step-next').first();
  }
  function prevStep(viz: Locator): Locator {
    return viz.getByTestId('hint-step-prev').first();
  }
  function dots(viz: Locator): Locator {
    return viz.getByTestId('hint-step-dot');
  }

  test('opens on the step-by-step subtraction view', async ({ page }) => {
    await setupWithUnlockedNodes(page, `hint borrow ${profileSeq++}`, ['n5_5']);
    const viz = await openHint(page, NODES.subBorrow);
    await expect(viz).toContainText(T.stepByStepSub);
  });

  test('shows four progress dots', async ({ page }) => {
    await setupWithUnlockedNodes(page, `hint borrow dots ${profileSeq++}`, ['n5_5']);
    const viz = await openHint(page, NODES.subBorrow);
    await expect(dots(viz)).toHaveCount(4);
  });

  test('walks forward through all four steps and back again', async ({ page }) => {
    await setupWithUnlockedNodes(page, `hint borrow walk ${profileSeq++}`, ['n5_5']);
    const viz = await openHint(page, NODES.subBorrow);
    const next = nextStep(viz);
    const prev = prevStep(viz);

    // Forward to the last step.
    for (let step = 1; step < 4; step++) {
      await expect(next).toBeEnabled();
      await next.click();
      await page.waitForTimeout(300);
    }
    await expect(next).toBeDisabled();

    // Backward to the first step.
    for (let step = 4; step > 1; step--) {
      await expect(prev).toBeEnabled();
      await prev.click();
      await page.waitForTimeout(300);
    }
    await expect(prev).toBeDisabled();
  });
});

// --- Scope: arithmetic only ----------------------------------------------

test.describe('hint scope', () => {
  test('no hint button on a non-arithmetic (comparison) problem', async ({ page }) => {
    // n1_5 is a PRACTICE node with config: { type: 'comparison_simple', max: 10 }
    // Comparison problems have type 'compare', not 'arithmetic', so the hint
    // button (which only appears for arithmetic problems) should never show.
    // Comparison problems use buttons (<, >, =) not text input, so we
    // submit a wrong answer by clicking an incorrect comparison button.
    await setupWithUnlockedNodes(page, `hint scope ${profileSeq++}`, ['n1_5']);
    await enterSagaNodeById(page, NODES.comparison);

    // Wait for the problem to render — comparison problems show buttons.
    const compareButtons = page.locator('button').filter({ hasText: /^[<=>]$/ });
    await expect(compareButtons.first()).toBeVisible({ timeout: 10_000 });

    // Click any button (doesn't matter which — we just need a wrong attempt).
    await compareButtons.first().click();
    await page.waitForTimeout(1000);

    // The hint button should NOT appear for non-arithmetic problems.
    await expect(hintButton(page)).toBeHidden();
  });
});

// --- Continuing after a hint ---------------------------------------------

test.describe('after the hint', () => {
  test('the problem is still solvable once the hint is dismissed', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, `hint cont ${profileSeq++}`);
    const viz = await openHint(page, NODES.additionSimple);
    await footerCloseButton(viz).click();
    await expect(viz).toBeHidden(EXIT);

    // The real regression risk: a lingering modal or backdrop eating pointer
    // events. solveCurrentProblem() has to actually reach the input.
    await solveCurrentProblem(page);
    await expect(hintVisualizer(page)).toBeHidden();
  });
});
