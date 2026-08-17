# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bubble-game.spec.ts >> Bubble Game Modes >> Zen mode is playable
- Location: e2e/bubble-game.spec.ts:11:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h1').first()

```

```yaml
- heading "Oops! Something went wrong" [level=2]
- paragraph: We encountered an unexpected error. Please try reloading the game.
- button "Reload Game"
- paragraph: "ReferenceError: Cannot access 'profile' before initialization"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { setupFreshProfile, selectArcadeMode, solveBubbleProblem, takeScreenshot } from './helpers';
  3   | 
  4   | test.describe('Bubble Game Modes', () => {
  5   |   test.describe.configure({ mode: 'serial' });
  6   | 
  7   |   test.beforeEach(async ({ page }) => {
  8   |     await setupFreshProfile(page);
  9   |   });
  10  | 
  11  |   test('Zen mode is playable', async ({ page }) => {
  12  |     test.setTimeout(120000);
  13  | 
  14  |     await selectArcadeMode(page, 'zen');
  15  |     await page.waitForTimeout(3000);
  16  | 
  17  |     await takeScreenshot(page, 'zen-01-initial');
  18  | 
  19  |     const title = page.locator('h1').first();
> 20  |     await expect(title).toBeVisible();
      |                         ^ Error: expect(locator).toBeVisible() failed
  21  |     const titleText = await title.textContent();
  22  |     expect(titleText).toBeTruthy();
  23  |     expect(titleText!.length).toBeGreaterThan(0);
  24  | 
  25  |     const instruction = page.locator('span.font-mono').first();
  26  |     await expect(instruction).toBeVisible({ timeout: 10000 });
  27  |     const instructionText = await instruction.textContent();
  28  |     expect(instructionText).toBeTruthy();
  29  |     expect(instructionText!).toMatch(/[\d]/);
  30  | 
  31  |     await takeScreenshot(page, 'zen-02-header-instruction');
  32  | 
  33  |     await page.waitForTimeout(3000);
  34  | 
  35  |     const bubbles = page.locator('button[aria-label*="Pop bubble"]');
  36  |     await expect(bubbles.first()).toBeVisible({ timeout: 15000 });
  37  |     const bubbleCount = await bubbles.count();
  38  |     expect(bubbleCount).toBeGreaterThan(0);
  39  | 
  40  |     await takeScreenshot(page, 'zen-03-bubbles-visible');
  41  | 
  42  |     const viewport = page.viewportSize();
  43  |     expect(viewport).toBeTruthy();
  44  |     for (let i = 0; i < Math.min(bubbleCount, 5); i++) {
  45  |       const box = await bubbles.nth(i).boundingBox();
  46  |       if (!box) continue;
  47  |       expect(box.x).toBeGreaterThanOrEqual(-5);
  48  |       expect(box.x + box.width).toBeLessThanOrEqual(viewport!.width + 5);
  49  |     }
  50  | 
  51  |     // Pop a bubble via mouse coordinates (bypasses header overlay interception)
  52  |     const firstBubble = bubbles.first();
  53  |     const box = await firstBubble.boundingBox();
  54  |     expect(box).toBeTruthy();
  55  |     await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  56  |     await page.waitForTimeout(1000);
  57  | 
  58  |     await takeScreenshot(page, 'zen-04-after-pop');
  59  | 
  60  |     let popped = 1;
  61  |     for (let attempt = 0; attempt < 10 && popped < 3; attempt++) {
  62  |       await page.waitForTimeout(2000);
  63  |       const solved = await solveBubbleProblem(page);
  64  |       if (solved) {
  65  |         popped++;
  66  |         await page.waitForTimeout(500);
  67  |       }
  68  |     }
  69  | 
  70  |     await takeScreenshot(page, 'zen-05-multiple-pops');
  71  |     expect(popped).toBeGreaterThanOrEqual(1);
  72  |   });
  73  | 
  74  |   test('Classic mode is playable', async ({ page }) => {
  75  |     test.setTimeout(120000);
  76  | 
  77  |     await selectArcadeMode(page, 'classic');
  78  |     await page.waitForTimeout(3000);
  79  | 
  80  |     await takeScreenshot(page, 'classic-01-initial');
  81  | 
  82  |     const hearts = page.locator('svg.lucide-heart');
  83  |     await expect(hearts.first()).toBeVisible({ timeout: 10000 });
  84  | 
  85  |     await takeScreenshot(page, 'classic-02-hearts');
  86  | 
  87  |     const instruction = page.locator('span.font-mono').first();
  88  |     await expect(instruction).toBeVisible({ timeout: 10000 });
  89  | 
  90  |     await page.waitForTimeout(2000);
  91  |     const bubbles = page.locator('button[aria-label*="Pop bubble"]');
  92  |     await expect(bubbles.first()).toBeVisible({ timeout: 15000 });
  93  | 
  94  |     await takeScreenshot(page, 'classic-03-bubbles');
  95  | 
  96  |     const box = await bubbles.first().boundingBox();
  97  |     if (box) {
  98  |       await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  99  |       await page.waitForTimeout(1000);
  100 |     }
  101 | 
  102 |     await takeScreenshot(page, 'classic-04-after-tap');
  103 |     expect(true).toBe(true);
  104 |   });
  105 | 
  106 |   test('Blitz mode is playable', async ({ page }) => {
  107 |     test.setTimeout(120000);
  108 | 
  109 |     await selectArcadeMode(page, 'blitz');
  110 |     await page.waitForTimeout(3000);
  111 | 
  112 |     await takeScreenshot(page, 'blitz-01-initial');
  113 | 
  114 |     // Timer: scan body text for Ns pattern (Playwright text selectors can't match partial text in spans with icons)
  115 |     const bodyText = await page.textContent('body') || '';
  116 |     expect(bodyText).toMatch(/\d+s/);
  117 | 
  118 |     await takeScreenshot(page, 'blitz-02-timer');
  119 | 
  120 |     // Score display visible
```