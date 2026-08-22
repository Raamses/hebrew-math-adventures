# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bubble-game.spec.ts >> Bubble Game Modes >> Zen mode is playable
- Location: e2e/bubble-game.spec.ts:11:3

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 398
Received:    406.6875
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - generic [ref=f1e4]:
    - generic [ref=f1e5]:
      - generic [ref=f1e6]:
        - generic [ref=f1e7]: "0"
        - generic [ref=f1e11]:
          - generic [ref=f1e12]: 🌀
          - generic [ref=f1e13]: "0"
        - generic [ref=f1e14]: Lv 1
      - button "Settings" [ref=f1e19]
    - generic [ref=f1e23]:
      - heading "Zen Mode" [level=1] [ref=f1e24]
      - generic [ref=f1e25]: Pop 2
    - generic [ref=f1e27]:
      - generic [ref=f1e28]: "🎯 Targets: 0"
      - generic [ref=f1e29]: "⭐ Score: 0"
  - generic [ref=f1e30]:
    - button "Pop bubble with value 2" [ref=f1e32] [cursor=pointer]:
      - generic [ref=f1e33]: "2"
    - button "Pop bubble with value 1" [ref=f1e35] [cursor=pointer]:
      - generic [ref=f1e36]: "1"
    - button "Pop bubble with value 3" [ref=f1e38] [cursor=pointer]:
      - generic [ref=f1e39]: "3"
    - button "Pop bubble with value 2" [ref=f1e41] [cursor=pointer]:
      - generic [ref=f1e42]: "2"
    - button "Pop bubble with value 3" [ref=f1e44] [cursor=pointer]:
      - generic [ref=f1e45]: "3"
    - button "Pop bubble with value 2" [ref=f1e47] [cursor=pointer]:
      - generic [ref=f1e48]: "2"
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
  20  |     await expect(title).toBeVisible();
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
> 48  |       expect(box.x + box.width).toBeLessThanOrEqual(viewport!.width + 5);
      |                                 ^ Error: expect(received).toBeLessThanOrEqual(expected)
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
  121 |     expect(bodyText).toMatch(/Score|ניקוד/i);
  122 | 
  123 |     await page.waitForTimeout(2000);
  124 |     const bubbles = page.locator('button[aria-label*="Pop bubble"]');
  125 |     await expect(bubbles.first()).toBeVisible({ timeout: 15000 });
  126 | 
  127 |     await takeScreenshot(page, 'blitz-03-bubbles');
  128 | 
  129 |     const box = await bubbles.first().boundingBox();
  130 |     if (box) {
  131 |       await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  132 |       await page.waitForTimeout(500);
  133 |     }
  134 | 
  135 |     await takeScreenshot(page, 'blitz-04-after-tap');
  136 | 
  137 |     // Verify timer is still running
  138 |     const bodyAfter = await page.textContent('body') || '';
  139 |     expect(bodyAfter).toMatch(/\d+s/);
  140 | 
  141 |     // Verify timer counts down
  142 |     await page.waitForTimeout(2000);
  143 |     const bodyLater = await page.textContent('body') || '';
  144 |     const afterMatch = bodyAfter.match(/(\d+)s/);
  145 |     const laterMatch = bodyLater.match(/(\d+)s/);
  146 |     if (afterMatch && laterMatch) {
  147 |       const afterVal = parseInt(afterMatch[1]);
  148 |       const laterVal = parseInt(laterMatch[1]);
```