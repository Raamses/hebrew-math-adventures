  29) [mobile-chrome] › e2e/story-scenes.spec.ts:82:5 › Interactive Story Scenes and Advanced MathCards › Story Scene rendering (n1_2 — Counting Seashells) › 2. Scene renders items with data-testid="lesson-item-{id}" 

    Error: expect(received).toBeGreaterThan(expected)

    Expected: > 0
    Received:   0

      90 |       const count = await items.count();
      91 |       // There should be at least 1 item in an interactive step
    > 92 |       expect(count).toBeGreaterThan(0);
         |                     ^
      93 |     });
      94 |
      95 |     test('3. Scene renders targets with data-testid="lesson-target-{id}"', async ({ page }) => {
        at /workspace/.worktrees/3940bc3b/e2e/story-scenes.spec.ts:92:21

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
--
  30) [mobile-chrome] › e2e/story-scenes.spec.ts:95:5 › Interactive Story Scenes and Advanced MathCards › Story Scene rendering (n1_2 — Counting Seashells) › 3. Scene renders targets with data-testid="lesson-target-{id}" 

    Error: expect(received).toBeGreaterThan(expected)

    Expected: > 0
    Received:   0

      101 |       const targets = page.locator('[data-testid^="lesson-target-"]');
      102 |       const count = await targets.count();
    > 103 |       expect(count).toBeGreaterThan(0);
          |                     ^
      104 |       // Verify target count element exists
      105 |       const firstTargetId = await targets.first().getAttribute('data-testid');
      106 |       const targetId = firstTargetId?.replace('lesson-target-', '');
        at /workspace/.worktrees/3940bc3b/e2e/story-scenes.spec.ts:103:21

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
  32) [mobile-chrome] › e2e/story-scenes.spec.ts:136:5 › Interactive Story Scenes and Advanced MathCards › Interactive step progression › 5. Drag step: drag an item to a target → target count increases 

    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid^="lesson-item-"]').first()
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 5000ms
      - waiting for locator('[data-testid^="lesson-item-"]').first()


      142 |       const items = page.locator('[data-testid^="lesson-item-"]');
  33) [mobile-chrome] › e2e/story-scenes.spec.ts:179:5 › Interactive Story Scenes and Advanced MathCards › Interactive step progression › 6. Complete all steps in a lesson → lesson modal closes 

    Error: expect(locator).toHaveCount(expected) failed

    Locator:  getByTestId('story-scene')
    Expected: 0
    Received: 1
    Timeout:  10000ms

    Call log:
      - Expect "toHaveCount" with timeout 10000ms
      - waiting for getByTestId('story-scene')
        22 × locator resolved to 1 element
           - unexpected value "1"

  34) [mobile-chrome] › e2e/story-scenes.spec.ts:240:5 › Interactive Story Scenes and Advanced MathCards › Interactive step progression › 7. Tap step (n2_3a SubtractionForest): tap an item → removed 

    TimeoutError: locator.click: Timeout 20000ms exceeded.
    Call log:
      - waiting for locator('[data-testid^="lesson-item-"]').first()
        - locator resolved to <div data-item-type="tree" data-testid="lesson-item-tree" class="absolute flex touch-none flex-col items-center justify-center pointer-events-none">…</div>
      - attempting click action
        - waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <rect width="160" height="90" fill="#D9F99D"></rect> from <svg aria-hidden="true" viewBox="0 0 160 90" data-testid="scene-backdrop-forest" preserveAspectRatio="xMidYMid slice" class="absolute inset-0 h-full w-full">…</svg> subtree intercepts pointer events
      - retrying click action
        - waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
