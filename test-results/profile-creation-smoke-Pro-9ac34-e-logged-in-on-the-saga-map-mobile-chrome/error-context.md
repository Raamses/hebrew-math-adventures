# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-creation-smoke.spec.ts >> Profile creation + saga map landing >> reloading the page keeps the same profile logged in on the saga map
- Location: e2e/profile-creation-smoke.spec.ts:57:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="arcade-button"]').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('[data-testid="arcade-button"]').first()

```

```yaml
- banner:
  - text: 🗺️
  - heading "My Journey" [level=1]
  - text: 🪙 0 💎 0
  - button "Menu"
- text: ⚡
- heading "Daily Challenge" [level=2]
- text: Blitz
- paragraph: Play today's challenge and earn coins!
- text: 🎯 14 correct answers ⏱️ 60s 🪙 +18 coins 📅 Streak 0/7 1 2 3 4 5 6 7
- button "🚀 Start Challenge!"
- text: Beginner Beach
- img
- text: "Bubbles Counting 1-5 saga.n1_3a_title Simple Addition saga.n1_3b_title Beach Boss Big & Small Sum to 10 Missing Link Pop the 9s Beach Master Boss: Octopus Forest of Numbers"
- img
- text: "Pop the 12s Teen Numbers Addition 20 saga.n2_3a_title saga.n2_3b_title Take Away Story Time Missing Number Comparison Sub Master Forest Challenge Boss: Bear Multiplication Mountain"
- img
- text: "Groups of 2 Double Trouble Times Two Skip Counting Times Five Big Addition Pop the 50s Times Ten Climb Higher Boss: Eagle Division Desert"
- img
- text: "Sharing is Caring Divide by 2 Subtraction 20 saga.n4_3a_title Missing Part Divide by 5 Logic Pattern Word Problems Sub Master Oasis Challenge Boss: Scorpion Space Station"
- img
- text: "Blast Off saga.n5_1a_title Zero Gravity Binary Star Velocity Black Hole saga.n5_5a_title Galaxy Brain Nebula Supernova The Void Boss: Alien King"
```

# Test source

```ts
  1   | import { type Page, expect } from '@playwright/test';
  2   | 
  3   | const APP_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
  4   | 
  5   | /**
  6   |  * Set up a fresh profile and navigate to the saga map.
  7   |  * Uses icon/ID-based selectors since app defaults to Hebrew (lng: 'he').
  8   |  */
  9   | export async function setupFreshProfile(page: Page, name = 'TestBot') {
  10  |   await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  11  |   await page.waitForTimeout(1500);
  12  |   await page.evaluate(() => localStorage.clear());
  13  |   await page.reload({ waitUntil: 'domcontentloaded' });
  14  |   await page.waitForTimeout(1500);
  15  | 
  16  |   // Click "New Player" / "שחקן חדש" — has Plus icon
  17  |   const newPlayerBtn = page.locator('button:has(svg.lucide-plus)').first();
  18  |   await expect(newPlayerBtn).toBeVisible({ timeout: 5000 });
  19  |   await newPlayerBtn.click();
  20  |   await page.waitForTimeout(800);
  21  | 
  22  |   // Fill name — input has id="setup-name"
  23  |   await page.locator('input#setup-name').fill(name);
  24  |   await page.waitForTimeout(300);
  25  | 
  26  |   // Submit — button[type="submit"] with text "בוא נתחיל!" / "Let's Start!"
  27  |   await page.locator('button[type="submit"]').click();
  28  |   await page.waitForTimeout(1500);
  29  | 
  30  |   // Wait for mascot greeting to auto-dismiss (4s + 300ms exit animation)
  31  |   await page.waitForTimeout(5000);
  32  | 
  33  |   // Verify we're on the saga map — arcade button has title attr
  34  |   const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();
> 35  |   await expect(arcadeBtn).toBeVisible({ timeout: 15000 });
      |                           ^ Error: expect(locator).toBeVisible() failed
  36  |   await page.waitForTimeout(500);
  37  | }
  38  | 
  39  | /**
  40  |  * Set up a fresh profile AND unlock a PRACTICE-type saga node.
  41  |  * This injects progress into localStorage so we can test PracticeMode (input-based questions).
  42  |  */
  43  | export async function setupFreshProfileWithPracticeAccess(page: Page, name = 'TestBot') {
  44  |   await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  45  |   await page.waitForTimeout(1500);
  46  |   await page.evaluate(() => localStorage.clear());
  47  |   await page.reload({ waitUntil: 'domcontentloaded' });
  48  |   await page.waitForTimeout(1500);
  49  | 
  50  |   // Create profile
  51  |   const newPlayerBtn = page.locator('button:has(svg.lucide-plus)').first();
  52  |   await expect(newPlayerBtn).toBeVisible({ timeout: 5000 });
  53  |   await newPlayerBtn.click();
  54  |   await page.waitForTimeout(800);
  55  | 
  56  |   await page.locator('input#setup-name').fill(name);
  57  |   await page.waitForTimeout(300);
  58  |   await page.locator('button[type="submit"]').click();
  59  |   await page.waitForTimeout(1500);
  60  | 
  61  |   // Wait for mascot greeting
  62  |   await page.waitForTimeout(5000);
  63  | 
  64  |   // Now inject progress to unlock n1_1 (SENSORY - already unlocked) and n1_2 (PRACTICE)
  65  |   const progressInjected = await page.evaluate((profileName) => {
  66  |     const results: string[] = [];
  67  |     const profileRaw = localStorage.getItem('hebrew-math-profiles');
  68  |     results.push(`profiles: ${profileRaw ? 'found' : 'not found'}`);
  69  |     if (profileRaw) {
  70  |       try {
  71  |         const profiles = JSON.parse(profileRaw);
  72  |         // Profiles stored as array-like object. Each profile has an `id` field.
  73  |         const profileList = Object.values(profiles) as any[];
  74  |         results.push(`profile count: ${profileList.length}`);
  75  |         const profile = profileList.find(p => p.name === profileName);
  76  |         if (profile) {
  77  |           results.push(`found profile: ${profile.id}, name: ${profile.name}, age: ${profile.age}`);
  78  |           const progressKey = `hebrew_game_saga_progress_v1_${profile.id}`;
  79  |           const progress: Record<string, { stars: number; isLocked: boolean; mistakes: number }> = {
  80  |             n1_1: { stars: 3, isLocked: false, mistakes: 0 },
  81  |             n1_2: { stars: 0, isLocked: false, mistakes: 0 },
  82  |             n1_3: { stars: 0, isLocked: false, mistakes: 0 },
  83  |             // Unlock n3_1 (LESSON type) so PracticeMode opens with ModeSelectorOverlay
  84  |             n3_1: { stars: 0, isLocked: false, mistakes: 0 },
  85  |           };
  86  |           localStorage.setItem(progressKey, JSON.stringify(progress));
  87  |           results.push(`injected progress for ${profile.id}`);
  88  |         } else {
  89  |           results.push(`profile '${profileName}' not found`);
  90  |         }
  91  |       } catch (e) {
  92  |         results.push(`error: ${e}`);
  93  |       }
  94  |     }
  95  |     return results.join('\n');
  96  |   }, name);
  97  | 
  98  |   console.log('Progress injection:', progressInjected);
  99  | 
  100 |   // Reload to pick up the progress
  101 |   await page.reload({ waitUntil: 'domcontentloaded' });
  102 |   await page.waitForTimeout(2000);
  103 | 
  104 |   // After reload, we're back at profile selection — click the profile button
  105 |   const profileBtn = page.locator('button', { hasText: name }).first();
  106 |   await expect(profileBtn).toBeVisible({ timeout: 10000 });
  107 |   await profileBtn.click();
  108 |   
  109 |   // Wait for mascot greeting to auto-dismiss
  110 |   await page.waitForTimeout(5000);
  111 | 
  112 |   // Verify we're on the saga map
  113 |   const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();
  114 |   await expect(arcadeBtn).toBeVisible({ timeout: 15000 });
  115 |   await page.waitForTimeout(500);
  116 | }
  117 | 
  118 | export async function gotoSagaMap(page: Page) {
  119 |   const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();
  120 |   if (await arcadeBtn.count() > 0) return;
  121 |   const mapBtn = page.locator('button').filter({ hasText: /map|home|מפה|בית|Back to Map|חזרה/i }).first();
  122 |   if (await mapBtn.count() > 0) {
  123 |     await mapBtn.click();
  124 |     await page.waitForTimeout(1500);
  125 |   }
  126 | }
  127 | 
  128 | /**
  129 |  * Open the arcade mode selector and click the desired mode.
  130 |  * Clicks the Globe button (title="Arcade Games") to open the modal,
  131 |  * then clicks Zen/Classic/Blitz/Survival.
  132 |  */
  133 | export async function selectArcadeMode(page: Page, mode: 'zen' | 'classic' | 'blitz' | 'survival') {
  134 |   const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();
  135 |   await expect(arcadeBtn).toBeVisible({ timeout: 5000 });
```