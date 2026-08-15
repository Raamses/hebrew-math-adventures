# Hebrew Math Adventures — Holistic Game Review (Gemini Perspective)

> **Date:** 2026-08-07
> **Reviewer:** AmosBot (writing as Gemini game planner, since agy/gemini CLI were unavailable)
> **Branch:** `sdlc/loop-v0`
> **Note:** The `agy` Gemini agent and `gemini` CLI both failed (agy empty response, gemini CLI deprecated). This review is written by AmosBot with full codebase access, covering the same holistic planner brief.

---

## 1. Executive Summary

Hebrew Math Adventures is a well-built adaptive math game for Israeli kids 5-11. The architecture is clean (centralized config in `worldConfig.ts`, adaptive `GameDirector`, sophisticated anti-repeat in the bubble engine). But four issues are capping its potential:

1. **Math Invaders has no leveling** — `state.level` is hardcoded to 1 and never increments. The only progression is a 60-second survival timer. Kids who answer 25 correct straight see zero feedback. This is the #1 retention killer.
2. **Memory Duel's answer mechanism is trivial** — answer cards are bare numbers, so "matching" is just finding the same number, not doing math. Plus RTL rendering can reorder equations, and the factory can silently produce a short deck.
3. **Question diversity gaps** — the bubble engine has excellent anti-repeat, but other modes have weak or no anti-repeat. "0 + 0 = ?" twice in a row is possible when the operand pool is small and the fallback path kicks in.
4. **Progression is decoupled from performance** — `GameDirector` requires 3 distinct mastered skills to level up, but most modes train 1 skill. A kid who aces addition stays at level 1 forever.

The fixes are all targeted and low-risk. The architecture already supports them.

---

## 2. Per-Game Analysis

### 2.1 PRACTICE (PracticeMode.tsx)

**Strengths:** Clean 10-question loop, star tiers via `computeStarsByTier`, daily-challenge accumulation, analytics on every answer.

**Issues:**
- `SESSION_LENGTH = 10` is fixed — fast kids breeze through, struggling kids slog through 10 hard ones
- Star computation is duplicated: `PracticeMode.tsx` has an inline ternary (`correct > 7 ? 3 : correct > 4 ? 2 : 1`) instead of using `computeStarsByTier`
- Anti-repeat relies on `MathModule` which gives up after 5 attempts — small operand spaces (addition max:5) can exhaust the pool

**Recommendations:**
- Make session length adaptive: 8 for fast players (avg < 2s/answer), 12 for struggling
- Route all star computation through `computeStarsByTier` (single source of truth)
- Add a per-session diversity bag (see §7) that guarantees no repeats within a session

### 2.2 SENSORY / Bubble (MathStrategy.ts + BubbleGame)

**Strengths:** The spawn-bag system (`buildSpawnBag`) is excellent — guarantees target/distractor ratios. Anti-repeat machinery (`recentSignatures`, `collectTrivialSignatures`, progressive relaxation) is genuinely sophisticated. Pedagogical distractors (off-by-one, operation-confusion) are a great touch.

**Issues:**
- The problem is fixed for the entire session in saga mode — `setProblem` is called once, `regenerateProblem` is only called on explicit triggers. Kids solve the same equation repeatedly.
- `MathModule.generateProblem` internal loop: only 5 attempts before giving up and returning a duplicate
- Bubble spawn playability: the spawn bag guarantees *ratio* but not *spatial* playability — bubbles can spawn in dead zones (corners, behind HUD)
- `configRef` picks up adaptive changes, but the problem itself doesn't change

**Recommendations:**
- **Regenerate the problem every 3-5 correct answers** — wire `SESSION_CONFIG.PROBLEM_ROTATION_EVERY` (already exists in config but isn't used)
- **Increase `MathModule` internal anti-repeat attempts** from 5 to 20; expand operand range on collision instead of giving up
- **Add spatial playability validation** — a unit/e2e test that simulates spawn positions and asserts no dead zones

### 2.3 LESSON (LessonModal + lesson1_multiplication)

**Strengths:** Step-through lesson flow, completion awards stars by tier.

**Issues:**
- Only 1 real lesson exists (`lesson1_multiplication`). Other LESSON nodes fall back to practice mode. This is a content gap.
- No per-step analytics — `node_start`/`node_complete` fire, but there's no tracking of which step kids get stuck on

**Recommendations:**
- Add 2-3 more lessons (subtraction with borrowing, division as sharing) using the existing `LessonModal` engine
- Track `lesson_step_viewed` and `lesson_step_time_ms` analytics events
- Consider interactive manipulatives (drag-and-drop counters) for younger kids

### 2.4 MEMORY DUEL (MemoryDuelGame.tsx + useMemoryGame.ts + MemoryFactory.ts)

**This mode has the most concrete bugs.**

**Issue A — RTL math rendering:**
- Root container is `dir="rtl"` (line ~40 of MemoryDuelGame.tsx)
- The equation span has `dir="ltr"` (line ~180), but the equation *string* is built in `MemoryFactory` as `${n1} ${op} ${n2}` with no bidi isolation at the data level
- In an RTL context, `"7 + 5"` can render as `"5 + 7"` or with the operator misplaced
- **Fix:** Wrap equation strings in LRM (`\u200E`) at the data level: `displayValue: \`\u200E${n1} ${op} ${n2}\``

**Issue B — Answer mechanism is trivial (design flaw):**
- Answer cards are bare numbers (`String(answer)`) — matching "7 + 5" to "12" is recognition, not computation
- `usedAnswers.has(answer) → continue` shrinks the pool; at low levels with small operand spaces, the factory can fail to generate enough pairs
- `maxAttempts = pairs * 50` safety valve can silently under-generate → grid has holes
- `MemoryDuelGame` hardcodes `cardCount = 12` but doesn't verify the factory returned 12 cards

**Recommendations:**
- **Redesign answer cards as "equal-value pairs"** — pair `7 + 5` with `6 + 6` (both evaluate to 12). The kid must compute both to match. Fall back to bare-number answers only at level 1-2 (age 5-6).
- **Guarantee deck integrity:** after generation, assert `cards.length === cardCount`. If short, widen operand range and retry. Never render a grid with holes.
- **Add `\u200E` (LRM) to equation strings** at the data level in `MemoryFactory`

### 2.5 MATH INVADERS (useInvaderEngine.ts + types.ts)

**The mode Ram specifically flagged (25 correct, no level up).**

**Root cause — `state.level` is never incremented:**
- `types.ts` `createInitialInvaderState` sets `level: 1`
- `useInvaderEngine.ts` reads `state.level` only for display (`Level {state.level}`) and boss bonus calculation
- **Nothing ever increments it.** The only "progression" is a 60-second survival timer (`VICTORY_TIME_MS = 60_000`) and speed ramp (+0.2 every 10s, capped at 3x)
- A fast player who answers correctly never sees the game get harder or level up

**Secondary issues:**
- `generateDistractors` padding can produce duplicate/overlapping values
- Answer bubbles at `x: 10 + idx*25` — fixed positions can overlap on narrow screens
- Boss wave is time-based (`BOSS_WAVE_INTERVAL_MS = 30_000`), not progress-based
- Anti-repeat window is only 8 (vs 12 in MathStrategy), and diversity roll is suppressed when `currentFocus` is set

**Recommendations:**
- **Add combo-based leveling:** every 5 consecutive correct → `level + 1`, which increases spawn speed, equation velocity, and boss frequency
- **Make boss waves progress-based** (every 3 levels) in addition to the time-based fallback
- **Fix distractor uniqueness** with a simple incrementing generator
- **Spread answer bubbles responsively** using percentage-based spacing
- **Widen anti-repeat window to 12** and **always apply diversity roll** (remove `!profile?.currentFocus` guard)

---

## 3. Progression & Difficulty Curve Analysis

### 3.1 The Mastery Leveling Formula (the core problem)

`GameDirector.recordResult()` (lines ~90-110):
```typescript
const masteredCount = Object.values(newProfile.skills)
    .filter(s => s.attempts >= MASTERY_THRESHOLD && (s.correct / s.attempts) >= MASTERY_ACCURACY)
    .length;
const newLevel = Math.min(MAX_LEVEL, 1 + Math.floor(masteredCount / 3));
```

With `MASTERY_THRESHOLD = 10`, `MASTERY_ACCURACY = 0.8`:
- To go from level 1 → 2, you need **3 distinct skills** each with ≥10 attempts at ≥80% accuracy = **30+ correct answers across 3 different problem types**
- A player who only plays addition accumulates 1 mastered skill → stays at level 1 **forever**
- **This is the "25 correct, no level up" bug, and it applies to ALL modes**

### 3.2 The Dummy-Profile Problem

`GameOrchestrator.tsx` (SENSORY branch) builds a **fresh dummy profile**:
```typescript
const adaptedProfile = { ...realCapabilities, estimatedLevel: targetLevel };
```
Even though `BubbleGameContainer` calls `Director.recordResult()` on the real profile, problem generation never sees the updated profile. Adaptive difficulty never actually adapts within a session.

### 3.3 Recommended Fix

Replace the cross-skill mastery gate with a **per-skill + streak hybrid**:
1. **Per-skill mastery** (fast feedback): a skill levels up when it hits `MASTERY_THRESHOLD` attempts at `MASTERY_ACCURACY`. Each mastered skill bumps `estimatedLevel` by 1.
2. **Streak bonus** (hot-streak reward): every 5 consecutive correct on a skill → +1 to that skill's effective difficulty within the session (doesn't persist).
3. **Rescue stays as-is** (2-3 consecutive failures → simplify).

---

## 4. New Feature Proposals (creative, kid-focused)

### 4.1 "Math Pet Evolution" 🐾
The pet system already exists (`PET_STAGES` egg→baby→child→teen→adult). **Make the pet visibly react to in-session performance** — jumps on correct, droops on wrong, "level-up dance" when the player levels. Kids form emotional bonds; this turns every session into pet-care. **Effort: M**

### 4.2 "Boss Rush" Mode 🐙🐻🦅🦂
A dedicated mode facing all 4 unit bosses back-to-back with escalating difficulty. Reuses existing `BossGate` machinery. Gives advanced players an endgame. **Effort: M**

### 4.3 "Story Mode" / Narrative Wrapper 📖
The curriculum is already themed (Beach → Forest → Mountain → Desert). Add a light narrative: "The Octopus stole the beach's numbers — help the mascot get them back!" Each unit is a chapter. Kids 5-11 respond strongly to story framing. **Effort: L**

### 4.4 "Speed Round" Daily Challenge ⚡
Solve 10 problems as fast as possible, track personal best. Taps into existing `updateArcadeBestScore` persistence. **Effort: S**

### 4.5 "Golden Bubble" Rare Reward 🌟
In SENSORY mode, a rare golden bubble worth 3x points appears occasionally (reuses `POWER_UP_CONFIG`). Creates a "hunt for the golden bubble" moment kids love. **Effort: S**

### 4.6 "Multiplayer / Sibling Mode" 👧👦
Two profiles on the same device, alternating turns, shared "family scoreboard." Parents with 2+ kids (very common in Israel) would love this. **Effort: L**

### 4.7 "Adaptive Combo Audio" 🎵
Extend `soundGarden`: correct answers play a rising musical scale, combo melody gets more complex as combo grows. Musical reinforcement for engaged kids. **Effort: S**

### 4.8 "Parent Weekly Report" 📊
The parent dashboard exists. Add a weekly summary: "Your child mastered 3 new skills this week, practiced 45 minutes." #1 thing that makes parents keep kids on an app. **Effort: M**

### 4.9 "Treasure Hunt" Mini-Events 🗺️
Random pop-up events: "A treasure chest appeared on the saga map! Solve 5 problems to open it." Creates surprise and breaks routine. Uses existing quest infrastructure. **Effort: M**

### 4.10 "Avatar Customization" 🎨
Let kids customize their mascot with accessories (hat, glasses, cape) unlocked by achievements. Self-expression drives engagement. Extends the existing shop system. **Effort: M**

---

## 5. Analytics Recommendations

### 5.1 What's tracked today (13 events)
`login, signup, app_open, mascot_change, node_select, node_start, node_complete, streak_milestone, question_answered, page_view, level_start, level_complete, level_failed`

Plus mode-specific: `arcade_mode_select, boss_defeated, session_level_up, session_level_down, powerup_activated`

### 5.2 Critical gaps

| Gap | Why it matters | Suggested event |
|---|---|---|
| **Session funnel** | Where do kids drop off? | `session_start`, `session_end` with `duration_sec`, `mode` |
| **Per-mode engagement** | Which mode retains best? | `mode_session_start`, `mode_session_end` |
| **Director adaptation** | Is adaptive difficulty working? | `director_rescue_triggered`, `director_challenge_triggered`, `director_level_up` |
| **Anti-repeat effectiveness** | Are duplicates still slipping? | `problem_repeat_detected` (when a collision is caught & resolved) |
| **Error patterns** | What do kids get wrong? | Add `wrong_answer_given` to `question_answered` params |
| **Retention** | Do kids come back? | `day_2_retention`, `day_7_retention` (computed from `app_open` + `profile_id`) |
| **Bubble playability** | Dead zones / idle waiting | `bubble_spawned`, `bubble_popped`, `bubble_missed` (with x/y) |
| **Memory Duel specifics** | Is the answer mechanism working? | `memory_pair_matched`, `memory_pair_mismatched`, `memory_time_per_pair` |
| **Invaders leveling** | Is progression visible? | `invaders_level_up`, `invaders_boss_defeated` |

### 5.3 Accessing real Firebase data

The app uses `firebase/analytics` with project `hebrew-math-adventures-2025` (measurement ID `G-17ZV4RGH0L`). Firebase CLI is available on the Pi (`npx firebase`). Options:

1. **Firebase Console** (firebase.google.com) → project → Analytics → Events. Zero-code, all logged events appear with user counts. **This is the fastest path — Ram should check this manually.**
2. **BigQuery export** — enable Analytics → BigQuery link in the console. Then SQL queries for per-user/session detail and retention. One-time setup (~15 min).
3. **Local dev mock** — `useAnalytics.ts` already logs to console when `analyticsReady` is null. For e2e, assert on console logs.

**Note:** I tried pulling real GA4 data via the API from the Pi, but the Firebase CLI token lacks `analytics.readonly` scope. To enable programmatic access, Ram would need to run `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/analytics.readonly` — but `gcloud` isn't installed on the Pi yet.

**Recommendation:** Check the Firebase Console manually first. Enable BigQuery export for long-term analysis. Add the missing analytics events as part of the fix work.

---

## 6. E2E Testing Strategy (critical flows to automate)

### 6.1 Existing coverage (5 specs, 12 tests)
- `profile-creation-smoke.spec.ts` — profile creation → saga map
- `practice-mode-core-loop.spec.ts` — practice node → 10 questions → session summary
- `practice-mute-toggle.spec.ts` — settings → mute toggle
- `daily-challenge.spec.ts` — arcade modes → daily challenge tracking
- `spawn-overhaul-smoke.spec.ts` — bubble spawn consistency

### 6.2 Critical gaps (priority order)

| Priority | Spec | Guards | Status |
|---|---|---|---|
| **P0** | `anti-repeat.spec.ts` | "0+0 twice" regression | New |
| **P0** | `memory-duel.spec.ts` | LTR fix + deck integrity + completion | New |
| **P0** | `invaders-leveling.spec.ts` | "25 correct no level up" regression | New |
| **P0** | `bubble-playability.spec.ts` | spawn dead-zone validation | New |
| P1 | `saga-node-completion.spec.ts` | SENSORY node → stars → unlock | From EXPANDED_COVERAGE_PLAN |
| P1 | `lesson-node-completion.spec.ts` | Lesson step-through → stars | From plan |
| P1 | `unit-progression.spec.ts` | Cross-unit unlock | From plan |
| P1 | `parent-dashboard.spec.ts` | Parent gate → dashboard | From plan |
| P1 | `profile-switching.spec.ts` | Multi-profile isolation | From plan |
| P2 | `wrong-answer-feedback.spec.ts` | Negative path | From plan |
| P2 | `play-again-loop.spec.ts` | Consecutive sessions | From plan |

### 6.3 How agy (Gemini) helps

`agy -p "..."` can write and iterate on Playwright specs autonomously. Workflow:

```bash
# Anti-repeat regression spec
agy -p "Write e2e/anti-repeat.spec.ts for hebrew-math-adventures. Create a fresh profile, enter practice node n1_3, answer 10 questions via solveCurrentProblem helper from e2e/helpers.ts. Assert via console log interception that no two consecutive question_answered events share the same equation. Run and fix until green."

# Memory Duel LTR + deck integrity
agy -p "Write e2e/memory-duel.spec.ts. Enter memory duel game, assert equation cards have dir=ltr, deck has 12 cards, matching all pairs completes the game."

# Invaders leveling
agy -p "Write e2e/invaders-leveling.spec.ts. Play invaders, answer 5 correct in a row, assert HUD shows Level 2."
```

Give agy exact file paths, existing helper names, and deterministic assertion targets (localStorage/console). Run with `timeout=600`.

---

## 7. Priority-Ordered Action Plan

### Phase 1 — Correctness & reported bugs (~1 day)

| # | Task | Effort |
|---|---|---|
| 1 | Memory Duel LTR fix (LRM + render isolation) | S (30 min) |
| 2 | Memory Duel answer redesign (equal-value pairs) + deck integrity | M (2-3 hr) |
| 3 | Invaders combo-based leveling + wire into speed/spawn | M (2 hr) |
| 4 | Shared `DiversityBag` utility + wire into all modes | M (3 hr) |
| 5 | Fix dummy-profile in GameOrchestrator (use real profile) | S (15 min) |
| 6 | Unify star computation (remove inline ternary in PracticeMode) | S (15 min) |

### Phase 2 — Progression & engagement (~1-2 days)

| # | Task | Effort |
|---|---|---|
| 7 | Rework mastery leveling (per-skill + streak hybrid) | M (2 hr) |
| 8 | Wire `PROBLEM_ROTATION_EVERY` (regenerate bubble problem every 3-5 correct) | S (30 min) |
| 9 | Adaptive session length (8/10/12 by speed) | S (30 min) |
| 10 | Invaders boss on level, not just time | S (30 min) |
| 11 | Bubble spatial playability validation (test) | S (30 min) |

### Phase 3 — New features (pick by value)

| # | Feature | Effort |
|---|---|---|
| 12 | Math Pet Evolution (in-session reactions) | M |
| 13 | Boss Rush mode | M |
| 14 | Golden Bubble reward | S |
| 15 | Speed Round daily challenge | S |
| 16 | Adaptive combo audio | S |
| 17 | Treasure Hunt mini-events | M |
| 18 | Avatar customization | M |
| 19 | Story Mode narrative | L |
| 20 | Sibling/multiplayer mode | L |
| 21 | Parent weekly report | M |

### Phase 4 — Analytics & e2e (ongoing)

| # | Task | Effort |
|---|---|---|
| 22 | Check Firebase Console for real analytics data | S (manual) |
| 23 | Enable BigQuery export | S (one-time) |
| 24 | Add missing analytics events (9 new event types) | M |
| 25 | Write P0 e2e specs via agy | M |
| 26 | Write P1/P2 e2e specs from EXPANDED_COVERAGE_PLAN | L |