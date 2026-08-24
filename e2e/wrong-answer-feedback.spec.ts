import { test, expect } from '@playwright/test';
import {
  setupFreshProfileWithPracticeAccess,
  enterSagaNodeById,
  submitWrongAnswer,
} from './helpers';

/**
 * Wrong Answer Feedback — Phase 3a (§4.10 of EXPANDED_COVERAGE_PLAN.md)
 *
 * Covers G21: Wrong answer handling in practice mode.
 *
 * Test 1: Submit wrong answer → wrong feedback shown → session continues
 *
 * Flow:
 *   setupFreshProfileWithPracticeAccess → enterSagaNodeById(page, 'n1_3') →
 *   submitWrongAnswer(page) (fills '0', submits) →
 *   assert wrong feedback overlay appears (❌ icon + error text) →
 *   assert mascot speech bubble appears with encouraging phrase →
 *   wait for feedback to clear (wrongDelay = 1000ms) →
 *   assert session continues (math-input still visible, not session-summary) →
 *   assert math-input is interactive (isProcessing cleared)
 *
 * The feedback overlay is rendered inside MathCard as an absolute-positioned div
 * with a ❌ emoji and an <h3> containing the feedback text. The app's language
 * depends on i18nextLng in localStorage; after clearing localStorage the app
 * falls back to the browser's navigator language (English in headless Chrome).
 * So the feedback text may be "Try again" (en) or "נסה שוב" (he).
 *
 * The mascot speech bubble appears at bottom-right with a gentle phrase from
 * t('feedback.gentle') array, e.g. "Let's try again" / "בוא ננסה שוב", etc.
 */

test.describe('Wrong Answer Feedback', () => {
  // Global timeout is 180s — no need for local override

  test('Submit wrong answer → wrong feedback shown → session continues', async ({ page }) => {
    await setupFreshProfileWithPracticeAccess(page, 'WrongFeedback');

    // Enter n1_3 (PRACTICE type, addition_simple config).
    await enterSagaNodeById(page, 'n1_3');
    await page.waitForTimeout(1500);

    // Verify math-input is visible before submitting.
    const mathInput = page.locator('[data-testid="math-input"]').first();
    await expect(mathInput).toBeVisible({ timeout: 10000 });

    // Submit a wrong answer ('0' is wrong for all problem types).
    await submitWrongAnswer(page);

    // --- Assert wrong feedback overlay appears ---
    // The MathCard renders a feedback overlay with ❌ icon and <h3> text.
    // The overlay is absolute-positioned inside the MathCard and appears
    // immediately after the wrong answer is submitted.
    const feedbackHeading = page.locator('h3.text-4xl.font-bold.text-primary').first();
    await expect(feedbackHeading).toBeVisible({ timeout: 3000 });
    const feedbackText = await feedbackHeading.textContent();
    console.log('[Wrong Feedback] Feedback text:', feedbackText);
    expect(feedbackText).toBeTruthy();
    // The default error message is "Try again" (en) or "נסה שוב" (he)
    expect(
      feedbackText!.includes('Try again') || feedbackText!.includes('נסה שוב')
    ).toBe(true);

    // Assert the ❌ emoji is visible in the feedback overlay
    const feedbackIcon = page.locator('div.text-6xl.mb-4').first();
    await expect(feedbackIcon).toBeVisible({ timeout: 2000 });
    const iconText = await feedbackIcon.textContent();
    console.log('[Wrong Feedback] Feedback icon:', iconText);
    expect(iconText).toContain('❌');

    // --- Assert mascot speech bubble appears with encouraging phrase ---
    // The mascot peeks from the right edge and shows a speech bubble with
    // a gentle phrase from t('feedback.gentle') array.
    // The speech bubble is in a div with class containing "rounded-2xl" inside
    // the PracticeFeedback component's fixed-position container.
    const speechBubble = page.locator('div.bg-white.rounded-2xl.p-3.shadow-lg').first();
    await expect(speechBubble).toBeVisible({ timeout: 3000 });
    const bubbleText = await speechBubble.textContent();
    console.log('[Wrong Feedback] Mascot speech bubble:', bubbleText);
    // Gentle phrases (en): "Let's try again", "Almost...", "Don't worry, try again", "One more try"
    // Gentle phrases (he): "בוא ננסה שוב", "כמעט...", "לא נורא, נסה שוב", "עוד ניסיון אחד"
    const gentlePhrases = [
      "Let's try again", 'Almost', "Don't worry", 'One more try',
      'בוא ננסה שוב', 'כמעט', 'לא נורא', 'עוד ניסיון',
    ];
    const isGentle = gentlePhrases.some(phrase => bubbleText?.includes(phrase));
    expect(isGentle).toBe(true);

    // --- Wait for feedback to clear (wrongDelay = 1000ms + buffer) ---
    await page.waitForTimeout(2000);

    // --- Assert session continues ---
    // The math-input should still be visible (not session-summary).
    const mathInputAfter = page.locator('[data-testid="math-input"]').first();
    await expect(mathInputAfter).toBeVisible({ timeout: 5000 });

    // Session summary should NOT be visible.
    const sessionSummary = page.locator('[data-testid="session-summary"]').first();
    const summaryVisible = await sessionSummary.isVisible().catch(() => false);
    expect(summaryVisible).toBe(false);

    // --- Assert math-input is interactive (isProcessing cleared) ---
    // After wrongDelay (1000ms), isProcessing should be false and the input
    // should accept new input. Verify by filling a value.
    await mathInputAfter.fill('5');
    await page.waitForTimeout(200);
    const inputValue = await mathInputAfter.inputValue();
    expect(inputValue).toBe('5');

    console.log('[Wrong Feedback] Test 1 PASSED: Wrong feedback shown, session continues');
  });
});
