# Phase 3 — Hardening, Performance & Polish Plan

> **Author:** AmosBot (plan owner and sole verifier)  
> **Counsel:** Claude (codebase review), agy/Gemini Pro (codebase review)  
> **Devil's advocate screening:** agy/Gemini Pro (independent ruthless review)  
> **Date:** 2026-07-29  
> **Status:** Approved pending Ram's sign-off

---

## Devil's Advocate Screening (conducted before plan was finalized)

The devil's advocate reviewed all 8 proposed items with one mandate: kill waste, downgrade scope creep, keep only what earns its place on a kids' math game running on a Raspberry Pi.

### Verdicts

| # | Proposed Item | Verdict | Rationale |
|---|---|---|---|
| 1 | Fix 5 TS + 41 ESLint errors | **DOWNGRADE** | 2 real bugs (ref-during-render, missing switch break) — fix those. 30 `any` types and cosmetic lint = linter vanity. Skip until Phase 4. |
| 2 | Tests for GameDirector + ProblemFactory | **KEEP** | 391 lines of pure logic with zero coverage. If ProblemFactory generates wrong answers, the game fails its core purpose. Millisecond tests. |
| 3 | Tests for bubble engine + useAnswerFlow | **MERGE & CUT** | Merge useAnswerFlow state/mastery logic into Item 2 as pure unit tests. CUT bubble physics/canvas tests — can't reliably test visual spawning in JSDOM. Verify visually on hardware. |
| 4 | Fix missing Hebrew translation key | **KEEP** | 30-second fix. Raw key strings visible to kids in a Hebrew-first app = looks broken. |
| 5 | Audio polish — expand useSound | **DOWNGRADE** | Combo/streak/frenzy synth engine = scope creep. Down-scope to 2-3 simple additional sound triggers. Skip synth complexity. |
| 6 | ARIA live regions + focus management | **DOWNGRADE** | Screen readers can't track 60fps floating bubbles — aria-live on arcade mode is spam. Keep keyboard nav for menus/static screens only. Cut real-time bubble ARIA. |
| 7 | Pi perf: backdrop-filter blur cost | **KEEP & PRIORITY UPGRADE** | `backdrop-filter: blur(6px)` on 12 moving elements is a guaranteed frame-rate killer on Pi GPU. Don't profile — rip it out and replace with flat `rgba()`. |
| 8 | Spaced-repetition / daily challenge | **CUT** | Classic feature creep. Core engine has zero tests, broken switch statement, and CSS blur killing target hardware. Push to Phase 4 backlog. |

### Items killed or downgraded

- **CUT:** #8 (daily challenge) — Phase 4 backlog
- **CUT:** #3 bubble physics tests — verify visually on hardware
- **DOWNGRADE:** #1 to 2 bug fixes only (skip lint cosmetics)
- **DOWNGRADE:** #5 to 2-3 simple triggers (skip synth engine)
- **DOWNGRADE:** #6 to menu/keyboard nav only (skip arcade ARIA)
- **MERGE:** #3's useAnswerFlow logic tests into #2

---

## Final Plan — 6 Items

### P0-1: Remove backdrop-filter blur (perf fix)

**Problem:** Every bubble renders `backdropFilter: 'blur(6px)'` + radial gradient + box-shadow, animated via Framer Motion. Up to 12 concurrent bubbles (16 in frenzy). `backdrop-filter` on moving composited layers is a guaranteed frame-rate killer on Raspberry Pi-class GPUs.

**Solution:** Replace `backdrop-filter: blur(6px)` with flat semi-transparent `rgba()` background colors on bubbles. Keep the radial gradient and box-shadow (those are cheap). Optionally add a subtle `opacity` pulse for depth instead of blur.

**Files:**
- `src/components/sensory/Bubble.tsx`

**Success criteria:**
- [ ] No `backdrop-filter` or `blur(` in Bubble.tsx
- [ ] Bubbles still visually distinct (gradient + shadow retained)
- [ ] `npm run build` passes (same pre-existing test TS errors OK)
- [ ] 46/46 tests pass
- [ ] Visual check: bubbles readable on mobile viewport

**Agent:** Claude (single-file edit)

---

### P0-2: Fix missing Hebrew translation key

**Problem:** `en.json` has 225 keys, `he.json` has 224. `practice.chooseModeDesc` exists only in English. Hebrew-locale users see a raw key string or English fallback in the mode-select screen.

**Solution:** Add the missing key to `he.json` with a proper Hebrew translation. Add a simple locale-parity check script to prevent regression.

**Files:**
- `src/i18n/locales/he.json`
- `scripts/verify_locales.ts` (new, optional)

**Success criteria:**
- [ ] `he.json` key count ≥ `en.json` key count
- [ ] No raw key strings visible in Hebrew UI
- [ ] 46/46 tests pass

**Agent:** AmosBot (direct edit, 2 minutes)

---

### P1-1: Fix 2 real bugs (ref-during-render + missing switch break)

**Problem:** Two actual runtime bugs hiding in the ESLint noise:
1. **Ref-during-render** in `BubbleGame.tsx:62` — reading `.current` during render violates React rules, can cause stale reads
2. **Missing `break` in ProblemFactory switch** (lines 109-136) — fall-through risk could silently produce wrong problem types

**Solution:** Fix the ref-during-render by moving the read into a `useEffect` or callback. Add the missing `break` statements. Do NOT touch the ~30 `any` types or cosmetic lint warnings — those are Phase 4.

**Files:**
- `src/components/sensory/BubbleGame.tsx`
- `src/engines/ProblemFactory.ts`

**Success criteria:**
- [ ] No ref `.current` read during render phase in BubbleGame.tsx
- [ ] All `case` blocks in ProblemFactory switch have explicit `break` or `return`
- [ ] `npm run build` passes (same pre-existing test TS errors OK)
- [ ] 46/46 tests pass

**Agent:** Claude (logic fixes)

---

### P1-2: Engine unit tests — GameDirector + ProblemFactory + useAnswerFlow

**Problem:** 391 lines of pure logic with zero test coverage:
- `GameDirector.ts` (135 lines): rescue mode, challenge mode, mastery-based leveling, age-based rescue threshold, distractor scaling
- `ProblemFactory.ts` (256 lines): generates every problem type, builds answers, creates distractors
- `useAnswerFlow` hook: answer state machine transitions, mastery recordResult path

**Solution:** Pure unit tests — no JSDOM rendering, no canvas, no fake timers needed for most. Test the math and state transitions directly. Merge useAnswerFlow state/mastery logic tests in here (per devil's advocate MERGE verdict). Do NOT test bubble physics/canvas spawning in unit tests — that's visual hardware verification only.

**Files (new):**
- `src/engines/__tests__/GameDirector.test.ts`
- `src/engines/__tests__/ProblemFactory.test.ts`
- `src/hooks/__tests__/useAnswerFlow.test.ts`

**Success criteria:**
- [ ] GameDirector: ≥10 tests covering rescue/challenge/mastery/age-threshold/distractor paths
- [ ] ProblemFactory: ≥10 tests covering each problem type generation, answer correctness, distractor rules
- [ ] useAnswerFlow: ≥5 tests covering state transitions and recordResult integration
- [ ] All new tests pass
- [ ] Total test count ≥71 (46 existing + ≥25 new)
- [ ] `npm run build` passes (same pre-existing test TS errors OK)

**Agent:** Claude (test logic), agy (test logic, parallel)

---

### P2-1: Keyboard navigation for menus + static screens

**Problem:** Zero `onKeyDown`/keyboard handlers in the app. Menus, settings, and problem input screens should be keyboard-navigable (essential on Pi without touchscreen). The arcade bubble game is NOT expected to be keyboard-playable (per devil's advocate — screen readers and Tab+Enter can't track 60fps floating bubbles).

**Solution:** Add `onKeyDown` handlers and focus management to:
- Menu/mode selector screens
- Settings screens
- MathCard answer input (already uses `<input>`, just needs Enter handling)
- Parent gate PIN entry

Add a visible "prefer typing? switch to Practice Mode" affordance in the bubble game mode selector.

Do NOT add aria-live to animated bubble game elements.

**Files:**
- `src/components/games/ModeSelectorOverlay.tsx`
- `src/components/PracticeMode.tsx`
- `src/components/parent/ParentGate.tsx`
- `src/components/MathCard.tsx`

**Success criteria:**
- [ ] All menu screens navigable via Tab + Enter
- [ ] Mode selector shows "prefer typing?" hint
- [ ] Parent gate PIN entry works with keyboard
- [ ] No aria-live on animated bubble elements
- [ ] 46/46+ tests pass (no regressions)

**Agent:** agy (well-scoped UI additions)

---

### P2-2: Basic audio triggers — 2-3 new sounds

**Problem:** `useSound.ts` has 4 sounds (correct, wrong, levelUp, click). Missing feedback for combo milestones and frenzy mode entry. The existing synth approach is clean and Pi-appropriate (no asset loading).

**Solution:** Add 2-3 simple additional `case` branches to the existing synth hook:
- `streak` — short ascending arpeggio on 5+ combo
- `frenzy` — brief buzz/pulse on frenzy mode activation
- `milestone` — quick chime on level up via mastery (different from existing levelUp)

Wire into BubbleGameContainer and FrenzyOverlay. Do NOT build a synth engine or dynamic audio system — just new `case` branches in the existing pattern.

**Files:**
- `src/hooks/useSound.ts`
- `src/components/games/BubbleGameContainer.tsx`
- `src/components/games/FrenzyOverlay.tsx`

**Success criteria:**
- [ ] 2-3 new sound cases added to useSound
- [ ] Streak sound triggers on 5+ combo
- [ ] Frenzy sound triggers on frenzy activation
- [ ] No audio asset files added (synth only)
- [ ] `npm run build` passes
- [ ] 46/46+ tests pass

**Agent:** agy (additive, well-specified)

---

## Execution Order

```
P0-1 (blur removal)     ──┐
P0-2 (i18n fix)          ──┼──> commit 1 (quick fixes)
P1-1 (2 bug fixes)       ──┘
P1-2 (engine tests)      ─────> commit 2 (test suite)
P2-1 (keyboard nav)      ─────> commit 3 (accessibility)
P2-2 (audio triggers)    ─────> commit 4 (polish)
```

## Agent Assignment

| Item | Agent | Why |
|---|---|---|
| P0-1 (blur) | Claude | Single file, CSS + style logic |
| P0-2 (i18n) | AmosBot | 2-minute direct edit |
| P1-1 (bugs) | Claude | Logic fixes, needs understanding of React render rules |
| P1-2 (tests) | Claude + agy | Split: Claude does GameDirector, agy does ProblemFactory |
| P2-1 (keyboard) | agy | Well-scoped UI additions, agy proved reliable for this |
| P2-2 (audio) | agy | Additive synth cases, well-specified |

## Verification Protocol (AmosBot is sole verifier)

1. Agent completes work → agent runs `tsc --noEmit` + `npm test`
2. AmosBot independently verifies:
   - Success criteria checkboxes for that item
   - `npm run build` passes (pre-existing test TS errors OK)
   - All tests pass (46+ existing, plus any new)
   - No regressions in unrelated files
3. AmosBot commits with structured message
4. Only AmosBot decides PASS or FAIL — agents do not self-verify

## Out of Scope (Phase 4 backlog)

- ~30 `any` type cleanups and cosmetic ESLint warnings
- Bubble physics/canvas unit tests (visual hardware verification only)
- Spaced-repetition / daily challenge mode
- Full ARIA live regions for arcade bubble game
- Synth engine with dynamic audio
- Profile backdrop-filter on Pi (we're removing it outright)