# E2E Test Coverage Expansion Plan (v2 — Finalized)

> **Branch:** `sdlc/loop-v0` (never main, never push)
> **Date:** 2026-08-08 (supersedes v1 from 2026-08-07)
> **Author:** planner agent
> **Status:** Ready for implementation

---

## 0. Change Log (v1 → v2)

This revision incorporates all findings from the devil's advocate review
(`vault/reviews/e2e-coverage-review.md`, 2026-08-07) and a fresh source audit
performed on 2026-08-08.

| # | Change | Reason |
|---|---|---|
| C1 | LESSON node test deferred to Phase 0 prerequisite card | B1: `effectiveMode` never returns `'LESSON'`; `isLessonOpen` never set to `true`. Dead code in GameOrchestrator. |
| C2 | Arcade game-over tests assert saga-map return + localStorage, NOT SessionSummary | B2: BubbleGameContainer calls `onComplete` → `onExit()` directly. No SessionSummary for SENSORY/arcade. |
| C3 | Unit progression test reframed as PracticeMode completion (not "boss" flow) | B3: CHALLENGE nodes fall through to PracticeMode. No special boss game mode exists. |
| C4 | Added `submitWrongAnswer(page)` helper to helper additions | M1: Star tier tests need explicit wrong-answer submission. |
| C5 | Added `enterSagaNodeById(page, nodeId)` helper | M2: Positional indexing fragile. ID-based selection is resilient. |
| C6 | Added `data-testid` prerequisite card | M4: All selectors are incidental CSS classes. Need semantic anchors. |
| C7 | Blitz test revised — active play + 70s cap, no passive 60s wait | M5: Wastes CI time. |
| C8 | G17 (badge popup), G23 (theme selection), G14 (daily quests) explicitly deferred | m1, m2, m3: Listed in v1 gap analysis with no specs. |
| C9 | `openParentGate` helper detailed — parse DOM, compute sum, submit | m5: v1 didn't describe the solution algorithm. |
| C10 | Language toggle test has concrete before/after text pairs | m6: v1 had no specific assertions. |
| C11 | Unit test count corrected: 40 files (v1 said 34) | Fresh audit 2026-08-08. |
| C12 | `getSagaProgressForNode` helper explicit about localStorage key format | m4. |

---

## 1. Current Coverage Audit

### 1.1 Existing E2E Specs (5 files, 13 tests)

| Spec File | Tests | What It Covers |
|---|---|---|
| `profile-creation-smoke.spec.ts` | 2 | Profile creation → saga map landing; profile persistence across reload |
| `practice-mode-core-loop.spec.ts` | 1 | PRACTICE node (n1_3) → answer 10 questions → session summary → stars persisted |
| `practice-mute-toggle.spec.ts` | 1 | Settings menu → toggle mute → localStorage `isMuted` flips → toggle back |
| `daily-challenge.spec.ts` | 6 | Arcade modes (zen/classic/blitz/survival) → daily challenge tracking in localStorage; date stamp; completion when target reached |
| `spawn-overhaul-smoke.spec.ts` | 3 | Zen/Classic/Blitz bubble spawn consistency, target visibility, no crashes over 30s |

### 1.2 Existing Helpers (`e2e/helpers.ts`)

| Helper | Purpose |
|---|---|
| `setupFreshProfile(page, name)` | Create profile, land on saga map |
| `setupFreshProfileWithPracticeAccess(page, name)` | Create profile + inject saga progress to unlock n1_1–n1_3, n3_1 |
| `gotoSagaMap(page)` | Navigate back to map |
| `selectArcadeMode(page, mode)` | Open arcade modal, pick mode (zen/classic/blitz/survival) |
| `clickBubble(page, selector)` | Coordinate-based bubble click |
| `solveBubbleProblem(page)` | Parse + solve arithmetic/series bubble problems |
| `solveCurrentProblem(page)` | Parse + solve input-based practice problems (arithmetic, series, comparison) |
| `enterSagaNode(page, nodeIndex)` | Click saga map node by positional index |
| `selectPracticeMode(page, mode)` | Click n3_1 (LESSON) → ModeSelectorOverlay → select mode (STANDARD/TIME_ATTACK/SURVIVAL/MEMORY/INVADERS) |
| `takeScreenshot(page, name)` | Screenshot utility |

### 1.3 Unit Test Coverage (for context — not e2e)

40 unit test files covering: stars/tiers, worldConfig, GameDirector, LessonEngine,
ProblemFactory, MathStrategy (incl. bossGate, zenAntiRepeat), spawnOverhaul,
useGameEngine.powerups, zenStateReset, MemoryFactory, useAnswerFlow (incl. zenRace),
useMusicalSound, usePracticeSession (incl. statePersist), useSound, useMemoryGame,
MathCard, PracticeMode, ProfileContext (incl. pet), ProgressContext, QuestContext,
dailyQuests, validation, bossGate, pet, MathInvadersGame, MemoryDuelGame,
FrenzyOverlay, MathText, gitignore, ThemeContext, ArithmeticView, SeriesView.

---

## 2. Gap Analysis — Uncovered Core Game Flows

### 2.1 Critical Gaps (P0 — core user journey)

| # | Flow | Why It Matters | Current Status | Blocker? |
|---|---|---|---|---|
| G1 | **SENSORY node completion** (BubbleGame on saga map) | n1_1 "Blast Off" is the first node every new user encounters. No e2e test verifies that popping the target number completes the node and awards stars. | ❌ Not covered | No |
| G2 | **LESSON node completion** (LessonModal) | n3_1 "Groups of 2" is the entry to multiplication. LessonEngine step-through → onComplete → stars → node unlock is untested end-to-end. | ❌ Not covered | **YES — B1:** `effectiveMode` never returns `'LESSON'`; `isLessonOpen` never set to `true`. The LESSON branch in GameOrchestrator is dead code. Must fix GameOrchestrator before this test can pass. |
| G3 | **Node unlock chain** (completing a node unlocks the next) | ProgressContext.completeNode() unlocks the next node in the curriculum. Never verified in e2e — only unit-tested. | ❌ Not covered | No |
| G4 | **Level/Unit progression** (unlocking a new unit) | Completing the last node of a unit should unlock the first node of the next unit. Never e2e tested. | ❌ Not covered | No (but CHALLENGE nodes are just PracticeMode sessions — no special boss flow) |
| G5 | **Star reward tiers** (1 vs 2 vs 3 stars based on accuracy) | The star-tier system (Perfect ≤1 mistake → 3★, Good ≤3 → 2★, Pass → 1★) is unit-tested but never verified through the actual UI flow. | ❌ Not covered | No (but requires `submitWrongAnswer` helper — M1) |
| G6 | **Session summary screen** (stars display, accuracy, play again) | SessionSummary component renders stars gained, accuracy %, and "Play Again" / "Home" buttons. Never e2e asserted. Practice-core-loop checks for its *presence* but not *content*. | ❌ Partially covered | No |

### 2.2 Important Gaps (P1 — secondary flows)

| # | Flow | Why It Matters | Current Status |
|---|---|---|---|
| G7 | **CHALLENGE node** (mixed-review node) | n1_9 "Beach Master" / n1_10 "Boss: Octopus" — CHALLENGE type nodes are PracticeMode sessions with mixed problems (no special game flow). Never e2e tested. | ❌ Not covered |
| G8 | **Memory Duel game** (MemoryDuelGame component) | Memory match game accessible via ModeSelectorOverlay. Complete game flow (match pairs → game over → stats) untested. | ❌ Not covered |
| G9 | **Math Invaders game** (MathInvadersGame component) | Space invader style game accessible via ModeSelectorOverlay. Complete game flow (shoot → score → game over) untested. | ❌ Not covered |
| G10 | **Parent Dashboard access** (ParentGate → ParentDashboard) | Parent gate (math problem to verify adult) → dashboard tabs (profiles, progress, skills). Never e2e tested. | ❌ Not covered |
| G11 | **Pet screen** (PetAvatar → PetScreen) | Pet display, feeding, happiness decay. Core engagement loop for kids. Never e2e tested. | ❌ Not covered |
| G12 | **Profile switch** (multiple profiles) | Creating a second profile, switching between profiles, verifying progress isolation. Never e2e tested. | ❌ Not covered |
| G13 | **Language toggle** (Hebrew ↔ English) | App supports i18n. Toggling language and verifying UI text changes. Never e2e tested. | ❌ Not covered |
| G15 | **Arcade best score persistence** | updateArcadeBestScore() saves high scores per arcade mode per profile. Never verified in e2e. | ❌ Not covered |
| G20 | **Multiple consecutive sessions** (play again loop) | After session summary, clicking "Play Again" starts a fresh session. Never e2e tested. | ❌ Not covered |
| G21 | **Wrong answer handling** | Submitting wrong answers decrements lives (survival), breaks combo, shows wrong feedback. Never e2e verified. | ❌ Not covered |

### 2.3 Deferred Gaps (out of scope for this plan)

| # | Flow | Reason for Deferral |
|---|---|---|
| G14 | Daily quest completion + claim | QuestContext flow is complex; needs its own dedicated plan. Deferred to future card. |
| G16 | Treasure shop (viewing/purchasing items) | Shop economy not fully wired. Deferred. |
| G17 | Badge collection popup | BadgePopup triggers on badge unlock — requires complex state setup. Deferred. |
| G18 | Profile deletion (from ParentDashboard) | Edge case. Deferred. |
| G19 | Corrupt localStorage recovery | Edge case. Deferred. |
| G22 | Bubble game game-over (lives depleted in survival) | Covered indirectly by arcade-game-over spec (survival wrong answers → exit to saga map). |
| G23 | Theme selection | ThemeSelector exists but theme unlock economy not fully wired. Deferred. |

---

## 3. Prerequisites (Phase 0 — must complete before Phase 1)

### 3.0a: Add `data-testid` attributes to key components (builder card)

Before writing 10+ new spec files on fragile CSS selectors, add semantic `data-testid`
attributes to the components below. This is a one-time investment that pays off across
every test.

| Component | `data-testid` value | Location |
|---|---|---|
| SagaMap node buttons | `saga-node-{nodeId}` (e.g. `saga-node-n1_1`) | `src/components/map/SagaMap.tsx` |
| Arcade button | `arcade-button` | `src/components/map/SagaMap.tsx` |
| Bubble buttons | `bubble-{number}` (e.g. `bubble-7`) | `src/components/sensory/Bubble.tsx` |
| Session summary | `session-summary` | `src/components/SessionSummary.tsx` |
| Session summary: stars | `summary-stars` | `src/components/SessionSummary.tsx` |
| Session summary: accuracy | `summary-accuracy` | `src/components/SessionSummary.tsx` |
| Session summary: Play Again | `summary-play-again` | `src/components/SessionSummary.tsx` |
| Session summary: Home | `summary-home` | `src/components/SessionSummary.tsx` |
| Lesson modal | `lesson-modal` | `src/components/lessons/LessonModal.tsx` |
| Lesson modal: next button | `lesson-next` | `src/components/lessons/LessonModal.tsx` |
| Parent gate | `parent-gate` | `src/components/parent/ParentGate.tsx` |
| Parent gate: input | `parent-gate-input` | `src/components/parent/ParentGate.tsx` |
| Parent dashboard | `parent-dashboard` | `src/components/parent/ParentDashboard.tsx` |
| Pet screen | `pet-screen` | `src/components/pet/PetScreen.tsx` |
| Pet: feed button | `pet-feed` | `src/components/pet/PetScreen.tsx` |
| Mode selector overlay | `mode-selector` | `src/components/games/ModeSelectorOverlay.tsx` |
| Mode selector: each card | `mode-card-{mode}` (e.g. `mode-card-MEMORY`) | `src/components/games/ModeSelectorOverlay.tsx` |
| Language toggle button | `language-toggle` | `src/components/SettingsMenu.tsx`, `src/components/onboarding/ProfileSelector.tsx` |
| Math input | `math-input` | `src/components/math-card/NumberInput.tsx` |
| Math submit | `math-submit` | `src/components/math-card/NumberInput.tsx` or `MathCard.tsx` |

**Existing tests must be updated** to use the new `data-testid` selectors where applicable
(replacing fragile CSS/aria selectors). This is part of the same card.

### 3.0b: Fix LESSON node dead code in GameOrchestrator (builder card)

**File:** `src/components/GameOrchestrator.tsx`

**Bug:** Line 86 — `effectiveMode` computation:
```ts
const effectiveMode: GameMode = internalMode || (arcadeMode ? 'SENSORY' : node?.type === 'SENSORY' ? 'SENSORY' : 'PRACTICE');
```
This never returns `'LESSON'`. LESSON-type nodes (n3_1, n4_1) fall through to `'PRACTICE'`.

Additionally, `isLessonOpen` (line 88) is initialized to `false` and never set to `true`.

**Fix:**
1. Change `effectiveMode` to: `internalMode || (arcadeMode ? 'SENSORY' : node?.type === 'SENSORY' ? 'SENSORY' : node?.type === 'LESSON' ? 'LESSON' : 'PRACTICE')`
2. Add `useEffect` to set `isLessonOpen(true)` when `effectiveMode === 'LESSON'` and `internalMode === null`.

**Verification:** Unit test that renders GameOrchestrator with a LESSON node and asserts LessonModal is rendered.

---

## 4. Test Plan — New E2E Specs

### 4.1 `saga-node-completion.spec.ts` (P0 — covers G1, G3, G5, G6)

**Goal:** Verify the core saga map progression loop: complete a SENSORY node → stars awarded → next node unlocked → session summary content correct.

```
Test 1: SENSORY node (n1_1) — pop target bubbles → node completes → stars awarded → n1_2 unlocks
  - setupFreshProfile → enterSagaNodeById(page, 'n1_1')
  - Pop correct bubbles until session completes (10 correct for target=10)
  - Assert return to saga map (arcade button visible)
  - Assert localStorage saga progress: n1_1.stars > 0, n1_1.isLocked === false
  - Assert localStorage saga progress: n1_2.isLocked === false
  - Reload page → progress persists, n1_2 still unlocked

Test 2: Star tier — perfect run (0-1 mistakes) → 3 stars
  - setupFreshProfileWithPracticeAccess → enterSagaNodeById(page, 'n1_3')
  - Answer all 10 correctly with 0 mistakes using solveCurrentProblem
  - Assert SessionSummary visible with data-testid="session-summary"
  - Assert summary-stars shows 3
  - Assert localStorage saga progress: n1_3.stars === 3

Test 3: Star tier — imperfect run (4+ mistakes) → 1 star
  - setupFreshProfileWithPracticeAccess → enterSagaNodeById(page, 'n1_3')
  - Interleave 4+ submitWrongAnswer calls among 10 correct answers
  - Assert SessionSummary visible
  - Assert summary-stars shows 1
  - Assert localStorage saga progress: n1_3.stars === 1

Test 4: Session summary content — accuracy and buttons
  - From Test 2 or a fresh run: verify summary-accuracy text, summary-play-again and
    summary-home buttons are visible and clickable
  - Click summary-play-again → new session starts (math-input visible)
```

### 4.2 `lesson-node-completion.spec.ts` (P0 — covers G2, G3) **⚠️ Depends on Phase 0b**

**Goal:** Verify LESSON node flow: LessonModal steps through content → onComplete fires → stars awarded → next node unlocks.

```
Test 1: LESSON node (n3_1) — step through lesson → complete → stars → unlock n3_2
  - setupFreshProfileWithPracticeAccess → inject progress to unlock n3_1
  - enterSagaNodeById(page, 'n3_1')
  - Assert data-testid="lesson-modal" is visible
  - Click data-testid="lesson-next" repeatedly until lesson completes
  - Assert SessionSummary or return to saga map (depending on GameOrchestrator flow)
  - Assert localStorage saga progress: n3_1.stars > 0, n3_2.isLocked === false
```

### 4.3 `unit-progression.spec.ts` (P0 — covers G4)

**Goal:** Verify that completing the last node of a unit unlocks the first node of the next unit.

```
Test 1: Complete n1_10 (PracticeMode session) → n2_1 unlocks
  - setupFreshProfileWithPracticeAccess
  - Inject progress: all unit_1 nodes n1_1–n1_9 with stars=3, isLocked=false;
    n1_10 with stars=0, isLocked=false (unlocked but not completed)
  - enterSagaNodeById(page, 'n1_10')
  - Complete the PracticeMode session (10 correct answers — CHALLENGE nodes are
    just PracticeMode with mixed problems, no special boss flow)
  - Assert localStorage saga progress: n2_1.isLocked === false
  - Verify on saga map: n2_1 node is visible and clickable (not grayscale)
```

### 4.4 `arcade-game-over.spec.ts` (P1 — covers G9, G15, G21)

**Goal:** Verify arcade game-over flows and best-score persistence.

> **Note (B2 fix):** SENSORY/arcade modes do NOT render SessionSummary. On game-over,
> BubbleGameContainer calls `onComplete` → `onExit()` → returns to saga map.
> Tests assert saga-map return + localStorage, not a summary screen.

```
Test 1: Survival mode — 3 wrong answers → return to saga map → best score saved
  - setupFreshProfile → selectArcadeMode('survival')
  - Intentionally pop wrong bubbles 3 times (use submitWrongAnswer for bubble game:
    find a bubble NOT matching the target, click it)
  - Assert saga map visible (arcade-button visible)
  - Assert localStorage: arcade best score for 'SURVIVAL' mode is recorded
    (key: hebrew-math-profiles → profile.arcadeBestScores.SURVIVAL)

Test 2: Blitz mode — play actively → timer expires → return to saga map → score saved
  - setupFreshProfile → selectArcadeMode('blitz')
  - Play actively (pop correct bubbles) until game ends
  - Max wait: 70 seconds (blitz timer is 60s + buffer)
  - Assert saga map visible
  - Assert localStorage: arcade best score for 'BLITZ' is recorded

Test 3: Math Invaders — play → game over → return to saga map
  - setupFreshProfileWithPracticeAccess → selectPracticeMode(page, 'INVADERS')
  - Play until game over (lose all lives or complete)
  - Assert saga map visible
  - (Score recording is internal to the game session — verify no crash)
```

### 4.5 `memory-duel.spec.ts` (P1 — covers G8)

**Goal:** Verify Memory Duel game completion.

```
Test 1: Memory Duel — match all pairs → game complete → return to saga map
  - setupFreshProfileWithPracticeAccess → selectPracticeMode(page, 'MEMORY')
  - Play memory match game: click cards to reveal, match pairs
    (MemoryDuelGame renders a grid of cards — click each card to reveal,
     then click its match. Use data-testid if added, else coordinate-based clicks)
  - Assert all pairs matched → game complete
  - Assert return to saga map or mode selector (depending on flow)
```

### 4.6 `parent-dashboard.spec.ts` (P1 — covers G10)

**Goal:** Verify parent gate + dashboard access.

```
Test 1: Parent gate — solve math problem → dashboard appears
  - setupFreshProfile → navigate to saga map
  - Click parent access button (settings/gear icon in saga map header)
  - Assert data-testid="parent-gate" visible
  - Read problem from DOM: parse "{n1} + {n2} = ?" from parent-gate text
  - Compute sum = n1 + n2
  - Fill data-testid="parent-gate-input" with sum
  - Submit (Enter key or submit button)
  - Assert data-testid="parent-dashboard" visible

Test 2: Parent dashboard — switch tabs → content renders → exit
  - From test 1, click each tab (profiles, progress, skills)
  - Assert tab content visible for each (at least one new element appears)
  - Click exit/close → return to saga map
```

### 4.7 `profile-switching.spec.ts` (P1 — covers G12)

**Goal:** Verify multi-profile isolation.

```
Test 1: Create two profiles → switch between them → progress isolated
  - Create profile "Alpha" → play n1_1 → earn stars (complete sensory node)
  - Navigate back to profile selection (clear session / reload)
  - Create profile "Beta" → verify Beta has fresh progress:
    n1_1 may be unlocked but stars === 0
  - Switch back to Alpha → verify Alpha's progress preserved:
    n1_1.stars > 0 in localStorage
```

### 4.8 `language-toggle.spec.ts` (P1 — covers G13)

**Goal:** Verify i18n language toggle.

```
Test 1: Toggle language Hebrew → English → UI text changes
  - setupFreshProfile → verify default language is Hebrew
    (assert text matching /שחקן חדש|משחקי ארקייד|הגדרות/ OR check i18n localStorage key)
  - Click data-testid="language-toggle"
  - Assert key UI text changed to English:
    - Arcade button title === "Arcade Games" (was "משחקי ארקייד")
    - Settings button aria-label contains "Settings" (was "הגדרות")
  - Toggle back → assert Hebrew text restored
    - Arcade button title === "משחקי ארקייד"
```

### 4.9 `pet-screen.spec.ts` (P1 — covers G11)

**Goal:** Verify pet screen rendering and feeding.

```
Test 1: Open pet screen → pet visible → feed pet → happiness increases
  - setupFreshProfile → navigate to pet screen
    (find pet button on saga map — look for pet avatar icon/button)
  - Assert data-testid="pet-screen" visible
  - Assert pet avatar visible
  - Read localStorage pet state (happiness, lastFedDate)
  - If feed button is enabled (not on cooldown):
    - Click data-testid="pet-feed"
    - Assert localStorage: happiness increased OR lastFedDate === today
  - Exit pet screen → return to saga map
```

### 4.10 `wrong-answer-feedback.spec.ts` (P2 — covers G21)

**Goal:** Verify wrong answer handling in practice mode.

```
Test 1: Submit wrong answer → wrong feedback shown → session continues
  - setupFreshProfileWithPracticeAccess → enterSagaNodeById(page, 'n1_3')
  - Use submitWrongAnswer(page) — fills "0" and submits
  - Assert wrong feedback visual appears (PracticeFeedback component:
    red background / shake animation / "Try again" text)
  - Assert session continues (math-input still visible, not session summary)
  - Assert localStorage or UI: mistake count incremented (if visible)
```

### 4.11 `play-again-loop.spec.ts` (P2 — covers G20)

**Goal:** Verify consecutive sessions via "Play Again".

```
Test 1: Complete session → Play Again → complete second session → stars persist
  - setupFreshProfileWithPracticeAccess → enterSagaNodeById(page, 'n1_3')
  - Answer 10 correct → SessionSummary appears
  - Click data-testid="summary-play-again" → new session starts
  - Answer 10 correct again → SessionSummary appears
  - Assert localStorage: n1_3.stars === 3 (best-of, not overwritten by worse)
  - Click data-testid="summary-home" → return to saga map
```

---

## 5. Helper Additions

All new helpers go in the existing `e2e/helpers.ts` file.

### 5.1 New Helpers (required)

| Helper | Signature | Purpose |
|---|---|---|
| `enterSagaNodeById` | `(page: Page, nodeId: string) => Promise<void>` | Find saga node by `data-testid="saga-node-{nodeId}"` and click it. Throws if not found or locked (has `grayscale`/`cursor-not-allowed` in class). |
| `submitWrongAnswer` | `(page: Page) => Promise<void>` | Fill `data-testid="math-input"` with `"0"`, click `data-testid="math-submit"` (or press Enter). For bubble games, find a bubble NOT matching the target and click it. |
| `openParentGate` | `(page: Page) => Promise<void>` | Navigate to parent access, wait for `data-testid="parent-gate"`, read problem text, parse `{n1} + {n2}`, compute sum, fill `data-testid="parent-gate-input"`, submit. |
| `toggleLanguage` | `(page: Page) => Promise<void>` | Click `data-testid="language-toggle"`, wait 500ms for re-render. |
| `openPetScreen` | `(page: Page) => Promise<void>` | From saga map, find and click the pet button. Wait for `data-testid="pet-screen"`. |
| `getArcadeBestScore` | `(page: Page, mode: string) => Promise<number>` | Read from localStorage `hebrew-math-profiles` → `profile.arcadeBestScores[mode]`. Returns 0 if not set. |
| `getSagaProgressForNode` | `(page: Page, profileId: string, nodeId: string) => Promise<{ stars: number; isLocked: boolean; mistakes: number } \| null>` | Read from localStorage key `hebrew_game_saga_progress_v1_${profileId}`, return entry for `nodeId`. |
| `injectSagaProgress` | `(page: Page, profileId: string, progress: Record<string, { stars: number; isLocked: boolean; mistakes: number }>) => Promise<void>` | Write progress map to localStorage key `hebrew_game_saga_progress_v1_${profileId}`. Used for unit-progression test. |
| `getProfileId` | `(page: Page, name: string) => Promise<string \| null>` | Read `hebrew-math-profiles` from localStorage, find profile by name, return its `id`. |
| `waitForSagaMap` | `(page: Page) => Promise<void>` | Wait until `data-testid="arcade-button"` is visible. Reusable assertion that we're back on the saga map. |

### 5.2 Existing Helpers to Update

| Helper | Change |
|---|---|
| `enterSagaNode` | Deprecate in favor of `enterSagaNodeById`. Keep for backward compat with existing specs. |
| `solveCurrentProblem` | Scope text reading to MathCard container (`data-testid="math-input"` parent) instead of `page.textContent('body')`. |
| `solveBubbleProblem` | Use `data-testid="bubble-{number}"` selector instead of `button[aria-label*="{answer}"]`. |
| `setupFreshProfileWithPracticeAccess` | Add a `progress` parameter allowing callers to specify which nodes to unlock (default: n1_1, n1_2, n1_3, n3_1). |

---

## 6. Implementation Priority & Phasing

### Phase 0 — Prerequisites (must complete first)

| Card | Agent | Description |
|---|---|---|
| 0a | builder | Add `data-testid` attributes to 15+ components (§3.0a). Update existing 5 spec files to use new selectors. |
| 0b | builder | Fix LESSON node dead code in GameOrchestrator (§3.0b). Add unit test verifying LessonModal renders for LESSON nodes. |
| 0c | tester-unit | Add unit test guard: assert `effectiveMode` returns `'LESSON'` for LESSON-type nodes. |

### Phase 1 — P0 Critical (must-have for release confidence)

| Card | Agent | Description |
|---|---|---|
| 1a | builder | Implement `saga-node-completion.spec.ts` (4 tests) + new helpers in `helpers.ts` |
| 1b | builder | Implement `lesson-node-completion.spec.ts` (1 test) — **blocked by 0b** |
| 1c | builder | Implement `unit-progression.spec.ts` (1 test) |

### Phase 2 — P1 Important (secondary game modes & navigation)

| Card | Agent | Description |
|---|---|---|
| 2a | builder | Implement `arcade-game-over.spec.ts` (3 tests) |
| 2b | builder | Implement `memory-duel.spec.ts` (1 test) |
| 2c | builder | Implement `parent-dashboard.spec.ts` (2 tests) |
| 2d | builder | Implement `profile-switching.spec.ts` (1 test) |
| 2e | builder | Implement `language-toggle.spec.ts` (1 test) |
| 2f | builder | Implement `pet-screen.spec.ts` (1 test) |

### Phase 3 — P2 Nice-to-have (edge cases)

| Card | Agent | Description |
|---|---|---|
| 3a | builder | Implement `wrong-answer-feedback.spec.ts` (1 test) |
| 3b | builder | Implement `play-again-loop.spec.ts` (1 test) |

### Phase 4 — Verification

| Card | Agent | Description |
|---|---|---|
| 4 | tester-e2e | Run full e2e suite (`npx playwright test`). Triage failures (flaky vs real bugs). Report results. |

---

## 7. Test Count Summary

| Phase | New Specs | New Tests | Existing Tests | Total After |
|---|---|---|---|---|
| Phase 1 | 3 files | 6 tests | 13 | 19 |
| Phase 2 | 6 files | 9 tests | 13 | 22 |
| Phase 3 | 2 files | 2 tests | 13 | 15 (additive: 13+2=15 new total from these) |
| **Total new** | **11 files** | **17 tests** | **13 existing** | **30 total** |

---

## 8. Notes & Constraints

### Branch discipline
All work on `sdlc/loop-v0` — never main, never push.

### Playwright config
Already configured for mobile-chrome (Pixel 5 viewport), headless, single worker,
no parallelism. New specs inherit these settings.

### Timeout budgets
- SENSORY/arcade tests with real gameplay: `test.setTimeout(120000)` (2 min)
- Lesson/parent/navigate tests: default 60s
- Blitz mode test: `test.setTimeout(90000)` (90s — 60s game + 30s setup/buffer)

### Flakiness mitigation
1. Use generous `waitForTimeout` between actions
2. Poll for element visibility rather than assuming presence
3. Count attempts and break early if session ends
4. **Assert localStorage state (deterministic) rather than UI animations (flaky)**
5. Use `data-testid` selectors (Phase 0a) — robust against CSS changes
6. For bubble clicking: use coordinate-based `page.mouse.click` to bypass overlay interception

### Star tier e2e verification
- Perfect (3★): 0-1 mistakes. Answer all 10 correctly with `solveCurrentProblem`.
- Good (2★): 2-3 mistakes. Interleave 2-3 `submitWrongAnswer` calls.
- Pass (1★): 4+ mistakes. Interleave 4+ `submitWrongAnswer` calls.
- `submitWrongAnswer` fills `"0"` and submits. `"0"` is wrong for all problem types
  (arithmetic, series, comparison) in the curriculum.
- Star tiers: `PERFECT_MAX_MISTAKES = 1`, `GOOD_MAX_MISTAKES = 3` (from `worldConfig.ts`).

### SENSORY/arcade game-over (B2 fix)
- BubbleGameContainer does NOT render SessionSummary.
- On game-over: `onComplete(success, correct, attempts)` → `onExit()` → saga map.
- Tests assert: saga map visible + localStorage state (best score, progress).
- Do NOT assert for SessionSummary text in arcade/SENSORY tests.

### LESSON node flow (B1 fix)
- Currently dead code — `effectiveMode` never returns `'LESSON'`.
- Phase 0b fixes GameOrchestrator to route LESSON nodes correctly.
- Lesson test (§4.2) is blocked until 0b is complete.
- If 0b is deferred, lesson test can be skipped — all other tests are independent.

### CHALLENGE nodes (B3 fix)
- CHALLENGE nodes (n1_9, n1_10, n2_9, n2_10, etc.) are PracticeMode sessions
  with mixed problems. There is no special "boss" game flow.
- The unit progression test treats n1_10 as a regular PracticeMode session.
- `injectSagaProgress` helper must set all prerequisite nodes (n1_1 through n1_9)
  with `stars > 0, isLocked: false` and n1_10 with `isLocked: false`.

### localStorage key formats (C12)
- Profiles: `hebrew-math-profiles` (JSON object: `{ id: { id, name, age, ... } }`)
- Saga progress: `hebrew_game_saga_progress_v1_${profileId}` (JSON: `{ nodeId: { stars, isLocked, mistakes } }`)
- Daily challenge: `hebrew-math-daily-progress` (JSON: `{ profileId: { dailyChallengeCorrect, dailyChallengeDate, dailyStamps } }`)
- Mute state: `isMuted` (JSON boolean)
- Language: `i18nextLng` (string: `"he"` or `"en"`)
- Arcade best scores: inside `hebrew-math-profiles` → `profile.arcadeBestScores[mode]`

---

## 9. Child Card Decomposition Summary

| Card # | Phase | Agent | Scope | Blocked By |
|---|---|---|---|---|
| 0a | 0 | builder | Add data-testid attributes + update existing specs | — |
| 0b | 0 | builder | Fix LESSON dead code in GameOrchestrator | — |
| 0c | 0 | tester-unit | Unit test guard for LESSON effectiveMode | 0b |
| 1a | 1 | builder | saga-node-completion.spec.ts (4 tests) + new helpers | 0a |
| 1b | 1 | builder | lesson-node-completion.spec.ts (1 test) | 0a, 0b |
| 1c | 1 | builder | unit-progression.spec.ts (1 test) | 0a |
| 2a | 2 | builder | arcade-game-over.spec.ts (3 tests) | 0a |
| 2b | 2 | builder | memory-duel.spec.ts (1 test) | 0a |
| 2c | 2 | builder | parent-dashboard.spec.ts (2 tests) | 0a |
| 2d | 2 | builder | profile-switching.spec.ts (1 test) | 0a |
| 2e | 2 | builder | language-toggle.spec.ts (1 test) | 0a |
| 2f | 2 | builder | pet-screen.spec.ts (1 test) | 0a |
| 3a | 3 | builder | wrong-answer-feedback.spec.ts (1 test) | 0a |
| 3b | 3 | builder | play-again-loop.spec.ts (1 test) | 0a |
| 4 | 4 | tester-e2e | Full suite run + triage | All above |

**Total: 15 child cards** (3 prerequisite + 3 P0 + 6 P1 + 2 P2 + 1 verification)
