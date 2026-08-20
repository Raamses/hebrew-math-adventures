# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: daily-challenge.spec.ts >> Daily Challenge — arcade modes >> blitz mode: correct bubbles accumulate daily challenge progress
- Location: e2e/daily-challenge.spec.ts:131:3

# Error details

```
Error: page.waitForTimeout: Target page, context or browser has been closed
```

# Test source

```ts
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
  113 |   const menuToggle = page.locator('[data-testid="menu-toggle"]').first();
  114 |   await expect(menuToggle).toBeVisible({ timeout: 15000 });
  115 |   await page.waitForTimeout(500);
  116 | }
  117 | 
  118 | export async function gotoSagaMap(page: Page) {
  119 |   const menuToggle = page.locator('[data-testid="menu-toggle"]').first();
  120 |   if (await menuToggle.count() > 0) return;
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
  134 |   const menuToggle = page.locator('[data-testid="menu-toggle"]').first();
  135 |   await expect(menuToggle).toBeVisible({ timeout: 5000 });
  136 |   await menuToggle.click();
  137 |   await page.waitForTimeout(500);
  138 | 
  139 |   const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();
  140 |   await expect(arcadeBtn).toBeVisible({ timeout: 5000 });
  141 |   await arcadeBtn.click();
  142 |   await page.waitForTimeout(800);
  143 | 
  144 |   const btn = page.locator(`[data-testid="arcade-mode-${mode}"]`).first();
  145 |   await expect(btn).toBeVisible({ timeout: 5000 });
  146 |   await btn.click();
> 147 |   await page.waitForTimeout(3000);
      |              ^ Error: page.waitForTimeout: Target page, context or browser has been closed
  148 | }
  149 | 
  150 | /**
  151 |  * Click a bubble by coordinate. The header overlay (z-20) intercepts
  152 |  * pointer events, so we use force: true or dispatch a click via coordinates.
  153 |  */
  154 | export async function clickBubble(page: Page, bubbleSelector: string) {
  155 |   const bubble = page.locator(bubbleSelector).first();
  156 |   const box = await bubble.boundingBox();
  157 |   if (!box) return false;
  158 |   // Click at the center of the bubble using coordinates (bypasses overlay interception)
  159 |   await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  160 |   return true;
  161 | }
  162 | 
  163 | /**
  164 |  * Solve a bubble-game problem by reading the instruction and clicking the correct bubble.
  165 |  * Uses page.mouse.click for coordinate-based clicking to bypass the header overlay.
  166 |  */
  167 | export async function solveBubbleProblem(page: Page): Promise<boolean> {
  168 |   const bodyText = await page.textContent('body') || '';
  169 | 
  170 |   // Look for arithmetic instruction like "N + N = ?"
  171 |   const eqMatch = bodyText.match(/(\d+)\s*([+\-−×÷*])\s*(\d+)\s*=\s*\?/);
  172 |   if (eqMatch) {
  173 |     const a = parseInt(eqMatch[1]);
  174 |     const op = eqMatch[2];
  175 |     const b = parseInt(eqMatch[3]);
  176 |     let answer: number;
  177 |     switch (op) {
  178 |       case '+': answer = a + b; break;
  179 |       case '-': case '−': answer = a - b; break;
  180 |       case '*': case '×': answer = a * b; break;
  181 |       case '÷': case '/': answer = Math.floor(a / b); break;
  182 |       default: answer = a + b;
  183 |     }
  184 | 
  185 |     // Find a bubble containing the answer number via aria-label
  186 |     const bubble = page.locator(`[data-testid="bubble-${answer}"]`).first();
  187 |     if (await bubble.count() > 0) {
  188 |       const box = await bubble.boundingBox();
  189 |       if (box) {
  190 |         await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  191 |         return true;
  192 |       }
  193 |     }
  194 | 
  195 |     // Fallback: look for any element with the answer as its text
  196 |     const allBtns = page.locator('button, [role="button"]');
  197 |     const btnCount = await allBtns.count();
  198 |     for (let i = 0; i < btnCount; i++) {
  199 |       const text = await allBtns.nth(i).textContent();
  200 |       if (text && text.trim() === String(answer)) {
  201 |         const box = await allBtns.nth(i).boundingBox();
  202 |         if (box) {
  203 |           await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  204 |           return true;
  205 |         }
  206 |       }
  207 |     }
  208 |   }
  209 | 
  210 |   // Sensory: "Pop N" — find bubble with N
  211 |   const popMatch = bodyText.match(/Pop\s+(\d+)/i);
  212 |   if (popMatch) {
  213 |     const target = popMatch[1];
  214 |     const bubble = page.locator(`[data-testid="bubble-${target}"]`).first();
  215 |     if (await bubble.count() > 0) {
  216 |       const box = await bubble.boundingBox();
  217 |       if (box) {
  218 |         await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  219 |         return true;
  220 |       }
  221 |     }
  222 |   }
  223 | 
  224 |   return false;
  225 | }
  226 | 
  227 | /**
  228 |  * Click a saga map node by its flattened index (0-indexed across all units in order).
  229 |  * Verifies the node is unlocked before clicking. Use with setupFreshProfileWithPracticeAccess
  230 |  * (which unlocks n1_1, n1_2, n1_3, n3_1) to reach a specific node type directly.
  231 |  */
  232 | export async function enterSagaNode(page: Page, nodeIndex: number) {
  233 |   const allNodes = page.locator('[data-testid^="saga-node-"]');
  234 |   const totalNodes = await allNodes.count();
  235 | 
  236 |   if (nodeIndex >= totalNodes) {
  237 |     throw new Error(`Node index ${nodeIndex} out of range (found ${totalNodes} nodes)`);
  238 |   }
  239 | 
  240 |   const node = allNodes.nth(nodeIndex);
  241 |   await node.scrollIntoViewIfNeeded();
  242 |   await page.waitForTimeout(500);
  243 | 
  244 |   const innerDiv = node.locator('div.rounded-full').first();
  245 |   const innerClass = await innerDiv.getAttribute('class') || '';
  246 |   if (innerClass.includes('grayscale') || innerClass.includes('cursor-not-allowed')) {
  247 |     throw new Error(`Node at index ${nodeIndex} is locked`);
```