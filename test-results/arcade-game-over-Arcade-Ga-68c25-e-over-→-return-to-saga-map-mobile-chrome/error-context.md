# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: arcade-game-over.spec.ts >> Arcade Game-Over flows >> Math Invaders — play → game over → return to saga map
- Location: e2e/arcade-game-over.spec.ts:346:3

# Error details

```
Error: Failed to switch to INVADERS mode: GameOrchestrator not found
```

# Page snapshot

```yaml
- generic [ref=f2e3]:
  - button "lessons.controls.close" [ref=f2e5]
  - generic [ref=f2e9]:
    - generic:
      - heading "lessons.multiplicationMountain.title" [level=1]
  - button "Let's Start!" [ref=f2e28]
  - generic:
    - generic:
      - generic:
        - generic:
          - paragraph: lessons.multiplicationMountain.intro
```

# Test source

```ts
  305 |           const el = document.querySelector(`[data-testid="bubble-${target}"]`);
  306 |           if (!el) return false;
  307 |           const wrapper = el.parentElement;
  308 |           if (wrapper && wrapper.style.pointerEvents === 'none') return false;
  309 |           const style = window.getComputedStyle(el);
  310 |           const opacity = parseFloat(style.opacity);
  311 |           if (opacity < 0.5) return false;
  312 |           const rect = el.getBoundingClientRect();
  313 |           return rect.top > 0 && rect.top < window.innerHeight;
  314 |         }, target, { timeout: 5000, polling: 200 });
  315 | 
  316 |         if (found) {
  317 |           // Get the bubble's coordinates and click via mouse
  318 |           const box = await page.locator(`[data-testid="bubble-${target}"]`).first().boundingBox();
  319 |           if (box) {
  320 |             await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  321 |             correctPops++;
  322 |             console.log(`[Blitz] Popped correct #${correctPops} (target: ${target})`);
  323 |             await page.waitForTimeout(1200); // wait for pop + next problem
  324 |           }
  325 |         }
  326 |       } catch {
  327 |         // Correct bubble not visible in time — wait for next spawn
  328 |         await page.waitForTimeout(500);
  329 |       }
  330 |     }
  331 | 
  332 |     console.log(`[Blitz] Total correct pops: ${correctPops}`);
  333 | 
  334 |     // Assert saga map visible (timer expired → onExit → saga map)
  335 |     await waitForSagaMap(page);
  336 | 
  337 |     // Assert localStorage: arcade best score for BLITZ recorded
  338 |     const blitzScore = await getArcadeBestScore(page, 'blitz');
  339 |     console.log(`[Blitz] Arcade best score: ${blitzScore}`);
  340 |     expect(blitzScore).toBeGreaterThanOrEqual(0);
  341 | 
  342 |     console.log('[Blitz] Test PASSED!');
  343 |   });
  344 | 
  345 |   // ─── Test 3: Math Invaders — play → game over → return to saga map ───
  346 |   test('Math Invaders — play → game over → return to saga map', async ({ page }) => {
  347 |     await setupFreshProfileWithPracticeAccess(page, 'InvadersBot');
  348 | 
  349 |     // Enter n3_1 and switch to INVADERS mode via React fiber manipulation
  350 |     // (same technique as memory-duel.spec.ts)
  351 |     const lessonNode = page.locator('[data-testid="saga-node-n3_1"]').first();
  352 |     await lessonNode.scrollIntoViewIfNeeded();
  353 |     await page.waitForTimeout(500);
  354 | 
  355 |     // Verify it's unlocked
  356 |     const innerDiv = lessonNode.locator('div.rounded-full').first();
  357 |     const innerClass = await innerDiv.getAttribute('class') || '';
  358 |     if (innerClass.includes('grayscale') || innerClass.includes('cursor-not-allowed')) {
  359 |       throw new Error('n3_1 node is locked. Ensure setupFreshProfileWithPracticeAccess is called.');
  360 |     }
  361 | 
  362 |     await lessonNode.click();
  363 |     await page.waitForTimeout(2000);
  364 | 
  365 |     // Switch GameOrchestrator from LESSON mode to INVADERS mode via React fiber
  366 |     const switchResult = await page.evaluate(() => {
  367 |       const lessonModal = document.querySelector('[data-testid="lesson-modal"]');
  368 |       const rootEl = lessonModal || document.querySelector('.min-h-screen');
  369 |       if (!rootEl) return { error: 'no root element found' };
  370 | 
  371 |       const fiberKey = Object.keys(rootEl).find(k =>
  372 |         k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  373 |       );
  374 |       if (!fiberKey) return { error: 'no fiber key' };
  375 | 
  376 |       let fiber = (rootEl as any)[fiberKey];
  377 |       let depth = 0;
  378 |       while (fiber && depth < 30) {
  379 |         const fiberType = fiber.type;
  380 |         const componentName = typeof fiberType === 'function'
  381 |           ? (fiberType.name || fiberType.displayName)
  382 |           : String(fiberType);
  383 | 
  384 |         if (componentName === 'GameOrchestrator') {
  385 |           // Find the internalMode useState hook (value is null)
  386 |           let h = fiber.memoizedState;
  387 |           while (h) {
  388 |             const v = h.memoizedState;
  389 |             if (v === null && h.queue && typeof h.queue.dispatch === 'function') {
  390 |               h.queue.dispatch('INVADERS');
  391 |               return { found: true, component: componentName };
  392 |             }
  393 |             h = h.next;
  394 |           }
  395 |           return { error: 'internalMode hook not found', component: componentName };
  396 |         }
  397 |         fiber = fiber.return;
  398 |         depth++;
  399 |       }
  400 |       return { error: 'GameOrchestrator not found', depth };
  401 |     });
  402 | 
  403 |     if (switchResult.error) {
  404 |       console.error('Switch result:', JSON.stringify(switchResult, null, 2));
> 405 |       throw new Error(`Failed to switch to INVADERS mode: ${switchResult.error}`);
      |             ^ Error: Failed to switch to INVADERS mode: GameOrchestrator not found
  406 |     }
  407 | 
  408 |     console.log('[Invaders] Switched to INVADERS mode:', JSON.stringify(switchResult));
  409 |     await page.waitForTimeout(2000);
  410 | 
  411 |     // Verify MathInvadersGame is visible
  412 |     const invadersTitle = page.locator('h2').filter({ hasText: /Math Invaders|פלישת המתמטיקה/i }).first();
  413 |     await expect(invadersTitle).toBeVisible({ timeout: 10000 });
  414 | 
  415 |     console.log('[Invaders] Game is visible. Playing until game over...');
  416 | 
  417 |     // Play the game — click answer buttons to shoot invaders
  418 |     const maxPlayMs = 120000; // 2 minutes max
  419 |     const playStart = Date.now();
  420 | 
  421 |     while (Date.now() - playStart < maxPlayMs) {
  422 |       await page.waitForTimeout(1000);
  423 | 
  424 |       // Check if game over screen appeared
  425 |       const bodyText = await page.textContent('body') || '';
  426 |       if (bodyText.match(/Play Again|שחק שוב|Nice try|You did it|Game Over/i)) {
  427 |         console.log(`[Invaders] End screen detected after ${Math.round((Date.now() - playStart) / 1000)}s`);
  428 |         break;
  429 |       }
  430 | 
  431 |       // Check if back on saga map
  432 |       if (await isOnSagaMap(page)) {
  433 |         console.log(`[Invaders] Saga map detected after ${Math.round((Date.now() - playStart) / 1000)}s`);
  434 |         break;
  435 |       }
  436 | 
  437 |       // Click an answer button
  438 |       const answerButtons = page.locator('button.absolute.rounded-full').filter({
  439 |         has: page.locator('span[dir="ltr"]'),
  440 |       });
  441 | 
  442 |       const btnCount = await answerButtons.count();
  443 |       if (btnCount > 0) {
  444 |         const btn = answerButtons.first();
  445 |         const box = await btn.boundingBox();
  446 |         if (box) {
  447 |           await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  448 |           await page.waitForTimeout(500);
  449 |         }
  450 |       }
  451 |     }
  452 | 
  453 |     // If we see the end screen, click "Back to Map" to exit.
  454 |     const endScreenModal = page.locator('div.fixed.inset-0.z-50').last();
  455 |     if (await endScreenModal.count() > 0) {
  456 |       let backBtn = endScreenModal.locator('button').filter({ hasText: /חזרה|Back to Map/i }).first();
  457 |       if (await backBtn.count() === 0) {
  458 |         const allBtns = endScreenModal.locator('button');
  459 |         const btnCount = await allBtns.count();
  460 |         if (btnCount >= 2) {
  461 |           backBtn = allBtns.nth(btnCount - 1);
  462 |         }
  463 |       }
  464 |       if (await backBtn.count() > 0) {
  465 |         console.log('[Invaders] Clicking "Back to Map" button');
  466 |         await backBtn.click();
  467 |         await page.waitForTimeout(2000);
  468 |       } else {
  469 |         console.log('[Invaders] Could not find Back button, trying page-wide search');
  470 |         const anyBackBtn = page.locator('button').filter({ hasText: /חזרה/i }).first();
  471 |         if (await anyBackBtn.count() > 0) {
  472 |           await anyBackBtn.click();
  473 |           await page.waitForTimeout(2000);
  474 |         }
  475 |       }
  476 |     }
  477 | 
  478 |     // Assert saga map visible
  479 |     await waitForSagaMap(page);
  480 | 
  481 |     console.log('[Invaders] Test PASSED!');
  482 |   });
  483 | });
  484 | 
```