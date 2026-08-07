# Devil's Advocate Review: E2E Coverage Expansion Plan

> **Reviewer:** reviewer-opus  
> **Date:** 2026-08-07  
> **Plan:** `e2e/EXPANDED_COVERAGE_PLAN.md`  
> **Branch:** `sdlc/loop-v0`  
> **Verdict:** ⛔ BLOCKED — 3 blockers, 5 major issues, 6 minor issues  

---

## Blockers (must fix before implementation)

### B1: LESSON node path is dead code — `lesson-node-completion.spec.ts` will fail

**File:** `src/components/GameOrchestrator.tsx:85-87, 207-216`

The `effectiveMode` computation never returns `'LESSON'`:
```ts
const effectiveMode = internalMode || (arcadeMode ? 'SENSORY' : node?.type === 'SENSORY' ? 'SENSORY' : 'PRACTICE');
```

LESSON type nodes fall through to `'PRACTICE'`. Additionally, `isLessonOpen` is initialized to `false` and **never set to `true`** — there is no `setIsLessonOpen(true)` call anywhere in the component. The entire `if (effectiveMode === 'LESSON')` block (lines 207-216) is unreachable dead code.

**Impact on plan:** `lesson-node-completion.spec.ts` (§3.2) expects to step through a `LessonModal` for n3_1. Instead, clicking n3_1 will enter PracticeMode with no `problemConfig`, showing the ModeSelectorOverlay (the free-play mode picker). The test will fail immediately.

**Fix needed:** The GameOrchestrator must be fixed to:
1. Set `effectiveMode = 'LESSON'` when `node?.type === 'LESSON'`
2. Set `isLessonOpen = true` on mount for LESSON nodes
3. Render `LessonModal` with `isOpen={true}`

The plan should either (a) add a prerequisite card to fix this bug, or (b) mark the lesson-node test as blocked-by-bug and defer it.

### B2: SENSORY/arcade game-over has no SessionSummary — plan assumes it does

**File:** `src/components/games/BubbleGameContainer.tsx:387-414`, `src/components/GameOrchestrator.tsx:183-194`

The plan's `arcade-game-over.spec.ts` (§3.4) Test 1 says:
> "Assert game-over / session summary appears"

And §3.4 Test 2 says:
> "Assert game-over appears"

But `BubbleGameContainer` does NOT render a `SessionSummary`. On game-over, it calls `onComplete(false, correct, attempts)` after a 1.5s timeout, which in `GameOrchestrator` calls `onExit()` — returning the user directly to the saga map. There is no summary screen for SENSORY/arcade modes.

Only `PracticeMode` renders `SessionSummary` (line 404). The BubbleGame path exits without one.

**Impact on plan:** The arcade game-over tests will fail when asserting for a session summary. The test will either time out waiting for text that never appears, or the assertion will fail.

**Fix needed:** Either:
- (a) Add a SessionSummary to the SENSORY/arcade game-over path in BubbleGameContainer, OR
- (b) Revise the plan to assert navigation back to the saga map instead of a session summary, and verify score persistence via localStorage only.

### B3: Unit progression test injects progress but the unlock chain may not fire via e2e

**File:** `src/context/ProgressContext.tsx:56-76`, `src/lib/progression.ts`

The `unit-progression.spec.ts` (§3.3) test injects progress to "all unit_1 nodes completed except n1_10" via `injectFullUnitProgress` (a new helper). It then expects to play n1_10 (CHALLENGE boss) to completion, which should unlock n2_1.

However:
1. **CHALLENGE nodes fall through to PracticeMode** (same as LESSON — `effectiveMode` only checks `SENSORY`). The "boss" node is just a PracticeMode session with `targetLevel: 3` and `config: { max: 10 }`. There's no special boss flow. The plan doesn't acknowledge this.
2. The `injectFullUnitProgress` helper would need to set `stars > 0` and `isLocked: false` for 9 nodes (n1_1 through n1_9), plus unlock n1_10. But `getInitialProgress` for a 5-year-old only unlocks n1_1. The injected state must be comprehensive — every node between n1_1 and n1_10 must be present in the progress map.
3. The `completeNode` function unlocks the *next* node in curriculum order by flattening all units. So completing n1_10 would unlock n2_1 (first node of unit_2). This logic is correct, but the test's reliance on a "CHALLENGE boss" flow is misleading — it's just a practice session.

**Fix needed:** 
- The plan should acknowledge that CHALLENGE nodes are just PracticeMode sessions with mixed problems, not a distinct game flow.
- The `injectFullUnitProgress` helper must be specified in detail: exactly which nodes get which state.
- Remove language about "boss" and "challenge" implying a special game mode.

---

## Major Issues (significant risk of test failure or flakiness)

### M1: Star tier e2e tests are extremely flaky-prone

**Plan §3.1 Tests 2-3** aim to verify exact star counts (3 stars for perfect, 1 star for 4+ mistakes) by controlling the number of wrong answers. This requires:

1. **Submitting a known-wrong answer:** The plan suggests submitting "0" for any problem. But `solveCurrentProblem` doesn't have a "submit wrong answer" mode — it tries to solve correctly and returns `false` if it can't parse the problem. A new helper is needed.
2. **Counting mistakes precisely:** The star tier is `mistakes = attempts - correct`. If `solveCurrentProblem` fails to parse a problem (returns `false`), that's NOT counted as an attempt by the app — it just means the test didn't interact. The test must actually submit wrong answers through the UI to increment the attempt counter.
3. **Series problems:** The `solveCurrentProblem` helper's series detection is a heuristic that can fail. If it submits a wrong answer for a series problem, that counts as a mistake but the test may not realize it.

**Recommendation:** Add an explicit `submitWrongAnswer(page)` helper that fills "0" and clicks submit. Don't rely on `solveCurrentProblem` returning `false` as a substitute for a wrong answer. Document the exact mistake count needed for each tier (≤1 for 3★, ≤3 for 2★, ≥4 for 1★).

### M2: `enterSagaNode` uses positional indexing — fragile if curriculum changes

**File:** `e2e/helpers.ts:104-126`

The helper clicks nodes by index: `allNodes.nth(nodeIndex)`. The plan uses hardcoded indices (0 for n1_1, 1 for n1_2, 2 for n1_3, 20 for n3_1). If the curriculum is restructured (nodes added/removed/reordered), all indices break silently.

**Recommendation:** Add a `enterSagaNodeById(page, nodeId)` helper that finds the node by its title text (via i18n key `saga.{nodeId}_title`) and clicks it. This is more resilient. Keep `enterSagaNode` as a fallback but prefer ID-based selection in new specs.

### M3: Selector strategy relies heavily on `page.textContent('body')` — brittle and slow

**File:** `e2e/helpers.ts:140, 168`

Both `solveBubbleProblem` and `solveCurrentProblem` call `page.textContent('body')` to parse the current problem from the entire page text. This is:
1. **Slow** — reading all body text on every iteration
2. **Brittle** — any UI text containing numbers (coins, streaks, star counts, level numbers) can interfere with regex matching
3. **Fragile across languages** — Hebrew text may have different number formatting or ordering

**Recommendation:** Target specific elements instead of `body`. The MathCard component has class `.max-w-md.bg-white.rounded-3xl` (already used for series detection). Problem text should be scoped to the card container, not the full body.

### M4: No `data-testid` attributes — all selectors are incidental CSS classes

The plan and existing tests rely on:
- `div.cursor-pointer.group` for saga map nodes
- `button[aria-label*="bubble"]` for bubbles
- `button[title="Arcade Games"]` for arcade button
- `div.rounded-full` for node inner state
- `.max-w-md.bg-white.rounded-3xl` for math card

These are styling decisions, not semantic contracts. Any Tailwind class change breaks tests. The plan's 12 new helpers all build on this fragile foundation.

**Recommendation:** Before implementing the 11 new spec files, add `data-testid` attributes to key components: saga nodes, arcade button, bubble buttons, session summary, lesson modal, parent gate, pet screen, mode selector cards. This is a one-time investment that pays off across all 28-30 tests.

### M5: Blitz mode 60s wait is a test time sink

**Plan §3.4 Test 2** says "Wait for 60s timer to expire (or play partially)". Waiting 60s for the blitz timer is a waste of CI time. 

**Recommendation:** Either:
- (a) Inject a shortened timer via localStorage/config override for test mode, OR
- (b) Play the blitz session actively (pop bubbles) until the timer expires naturally, with a max wait of 70s, OR
- (c) Skip the natural timer expiry and instead test that blitz mode *starts* with a visible countdown, then verify game-over by intentionally failing (if blitz has a fail condition), OR
- (d) Use `page.evaluate` to fast-forward the timer by manipulating the game state directly.

---

## Minor Issues

### m1: Gap G17 (badge popup) is listed but has no spec

The gap analysis (§2.2 G17) mentions "Badge collection popup" as untested, but no spec file in §3 covers it. It's dropped silently.

**Fix:** Either add a test or explicitly note it as out-of-scope.

### m2: Gap G23 (theme selection) is listed but has no spec

Same as m1 — G23 (theme selection) is in the gap analysis but not in the test plan.

**Fix:** Add a `theme-selection.spec.ts` or mark as out-of-scope.

### m3: Gap G14 (daily quest completion + claim) is listed but has no spec

The daily quest system (separate from daily challenge) is mentioned in G14 but no spec covers the quest claim flow. `QuestPanel` is visible on the saga map, and `DailyQuestList` is on the pet screen, but neither flow is tested.

**Fix:** Add a test or mark as deferred.

### m4: Helper `getSagaProgressForNode` is listed but not detailed

The plan (§4) lists `getSagaProgressForNode(page, profileId, nodeId)` but doesn't specify the localStorage key format. The existing tests use `hebrew_game_saga_progress_v1_${profileId}` as the key. The helper should be explicit about this.

### m5: `openParentGate` helper doesn't account for the randomized math problem

The `ParentGate` component generates a random addition problem (n1 + n2, each 10-49) using `crypto.getRandomValues`. The helper `openParentGate(page)` must parse and solve this problem. The plan doesn't describe how — it just says "solve parent gate problem."

**Fix:** The helper should read the problem from the DOM, parse the two numbers, compute the sum, and submit it.

### m6: `language-toggle.spec.ts` — no specific assertion targets defined

The plan says "Assert key UI text changed to English" but doesn't specify which text to check. The app has i18n keys but the actual rendered text depends on the locale files. The test needs concrete before/after text pairs.

---

## Things the plan got right

1. **Gap analysis is thorough** — 23 gaps across P0/P1/P2 is a solid enumeration. The priority ordering is correct.
2. **Phase ordering is sound** — P0 (core saga loop) before P1 (secondary modes) before P2 (edge cases) is the right sequence.
3. **Flakiness mitigation section (§7)** shows awareness of the coordinate-based bubble clicking problem. The advice to "assert localStorage state (deterministic) rather than UI animations (flaky)" is correct.
4. **Child card decomposition** is practical — 3 builder cards + 1 tester card is a reasonable split.
5. **Timeout budgets** (120s for gameplay, 60s for navigation) are appropriate.
6. **Reusing existing helpers** rather than reinventing them is the right call.
7. **localStorage assertions** as the primary verification mechanism is the correct strategy for this app.

---

## Recommended actions before implementation

1. **Fix B1 (LESSON dead code)** — file a bug card or fix in GameOrchestrator before the lesson test can be written.
2. **Fix B2 (SENSORY game-over)** — decide whether to add SessionSummary to arcade modes, or revise the plan's assertions.
3. **Revise B3 (unit progression)** — acknowledge CHALLENGE = PracticeMode, detail the injection helper.
4. **Add `data-testid` attributes** to key components (M4) — do this as a prerequisite PR.
5. **Add `submitWrongAnswer(page)` helper** (M1) — needed before star tier tests.
6. **Add `enterSagaNodeById(page, nodeId)` helper** (M2) — needed before any new saga specs.
7. **Scope-gap: add or defer G17, G23, G14** (m1, m2, m3).
