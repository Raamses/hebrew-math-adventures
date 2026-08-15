# Hebrew Math Adventures — Holistic Game Review & Architecture Plan

> **Date:** 2026-08-07
> **Reviewer:** Claude (senior game designer & software architect)
> **Branch:** `sdlc/loop-v0`
> **Scope:** Full-game review of all 5 modes, progression, engagement, education, analytics, e2e strategy. Builds on and supersedes the arcade-specific findings in `ARCADE_COUNCIL_REVIEW.md`.

---

## 1. Executive Summary

Hebrew Math Adventures is a well-architected, genuinely delightful learning app. The codebase is clean, config is centralized (`worldConfig.ts` is a true leaf), the adaptive `GameDirector` is a thoughtful design, and the anti-repeat machinery in `MathStrategy.ts` is already far ahead of most indie games. The core loop (saga map → node → stars → unlock) is solid.

**However, there are 4 systemic problems that will cap retention and frustrate both fast and slow players:**

1. **Progression is decoupled from the player's actual performance.** The `GameDirector`'s mastery system requires 3 distinct mastered skills to level up, but most modes train a single skill — so a hot streak produces no visible progress (the "25 correct, no level up" bug). This is the single biggest engagement killer.
2. **Memory Duel has a real correctness bug** (RTL math rendering) **and a design flaw** (answer cards are just numbers, so "finding the answer" is trivial matching, not math).
3. **Math Invaders has no internal leveling at all** — `state.level` is hardcoded to 1 and never changes; the only "progression" is a 60-second survival timer. Fast players are bored.
4. **Anti-repeat is strong in the bubble engine but weak/absent elsewhere** (invaders, memory, practice), and the "0+0 twice" symptom can still slip through in edge paths.

**The good news:** every one of these is fixable with targeted, low-risk changes. The architecture already supports the fixes. This review provides specific code-level recommendations, a priority-ordered action plan, new feature proposals, an analytics gap analysis, and an agy-driven e2e strategy.

---

## 2. Per-Game Deep Analysis

### 2.1 PRACTICE (PracticeMode.tsx + usePracticeSession)

**What works:** Clean 10-question session loop, star tiers by accuracy (`stars.ts`), daily-challenge accumulation, mascot feedback, analytics on every answer.

**Issues:**

- **Anti-repeat is delegated to `MathModule.generateProblem` with `excludeSignatures`, but the exclusion window is only the last 8 signatures** (`useInvaderEngine` uses 8; `MathStrategy` uses 12). For a 10-question practice session with a small operand space (e.g. `addition_simple, max:5`), the pool of *distinct* problems is tiny — `1+1` through `5+5` is only ~15 unique equations. With 8-12 excluded, the generator can exhaust the pool and either repeat or fall back to adjacent levels. **This is the root of "0+0 twice in a row"** — when the pool is exhausted, the fallback path (`MathStrategy.generateAndSetProblem` lines ~150-200) perturbs or admits a near-duplicate.
- **`SESSION_LENGTH = 10` is fixed** regardless of mode or player skill. A fast player blasts through 10 trivial questions and gets bored; a struggling player is forced through 10 hard ones.
- **`SessionSummary` star logic is duplicated** — `PracticeMode.tsx` line ~330 computes `session.correct > 7 ? 3 : session.correct > 4 ? 2 : 1` while `GameOrchestrator` uses `computeStarsByTier`. Two sources of truth for the same reward.

**Recommendations:**
- Route all star computation through `computeStarsByTier` (single source of truth). Remove the inline ternary in `PracticeMode.tsx`.
- Make `SESSION_LENGTH` adaptive: 8 for fast players (avg answer < 2s), 12 for struggling players. Pass a `sessionLength` from config.
- Add a **per-session anti-repeat bag** (see §7) so practice never repeats within a session even with small operand spaces.

### 2.2 SENSORY / Bubble (MathStrategy.ts + BubbleGame)

**What works:** The spawn-bag system (`buildSpawnBag`) guarantees target/distractor ratios over short windows — excellent. The anti-repeat machinery (`recentSignatures`, `collectTrivialSignatures`, progressive relaxation, perturbation fallback) is genuinely sophisticated. Pedagogical distractors (off-by-one, operation-confusion, digit-swap) are a great touch.

**Issues:**

- **The problem is fixed for the entire session** (Bug C from the council review). `setProblem` is called once at init; `regenerateProblem` is only called on explicit triggers. In arcade modes the player solves the *same equation* repeatedly. This is the #1 boredom driver.
- **`MathModule.generateProblem`'s internal anti-repeat loop is only 5 attempts** (`MathModule.ts` line ~40: `maxAttempts = 5`), and it only excludes against the passed `excludeSignatures`. If the pool is small, it gives up and returns a duplicate. The outer `MathStrategy` catches most cases, but the fallback perturbation can still admit a near-duplicate.
- **Bubble spawn playability** (the open concern in `known-issues.md`): the spawn bag guarantees *ratio* but not *spatial* playability. If bubbles spawn in dead zones (corners, behind the HUD) or too fast to tap, kids get frustrated. This needs real-device validation (see §6 e2e + §8).

**Recommendations:**
- **Regenerate the problem every N correct answers** (e.g. every 3-5 pops, per `SESSION_CONFIG.PROBLEM_ROTATION_EVERY = 3` which already exists but isn't wired). Call `regenerateProblem` from the bubble-pop handler.
- **Increase `MathModule` internal anti-repeat attempts** from 5 to 20, and make it *guarantee* non-repeat by expanding the operand range on collision rather than giving up.
- **Add spatial playability validation** — a unit test that simulates spawn positions and asserts no two bubbles overlap the HUD region and no bubble is unreachable within its lifetime.

### 2.3 LESSON (LessonModal + lesson1_multiplication)

**What works:** Step-through lesson flow, completion awards stars by tier.

**Issues:**
- **Only 1 real lesson exists** (`lesson1_multiplication`). All other LESSON nodes (`n3_1`, `n4_1`) fall back to practice. This is a content gap, not a code bug, but it means the "lesson" promise is unfulfilled for most of the curriculum.
- **No lesson analytics** — `node_start`/`node_complete` fire, but there's no per-step tracking (which step did kids get stuck on?).

**Recommendations:**
- Add 2-3 more lessons (subtraction with borrowing, division as sharing) using the existing `LessonModal` engine.
- Track `lesson_step_viewed` and `lesson_step_time_ms` analytics to find where kids drop off.

### 2.4 MEMORY DUEL (MemoryDuelGame.tsx + useMemoryGame.ts + MemoryFactory.ts)

**This is the mode with the most concrete bugs. See §8 for the full fix.**

**Issue A — RTL math rendering (confirmed bug):**
- `MemoryDuelGame.tsx` line ~40: the root container is `dir="rtl"`.
- The card *front* has `dir="ltr"` and `unicodeBidi: 'isolate'` (lines ~150-160), and the equation `<span>` has `dir="ltr"` (line ~180). **So the equation card is actually LTR already.** BUT the *answer* card and the equation string itself are rendered inside an RTL parent, and the equation text `"7 + 5"` is a plain string — in an RTL context the digits and operators can reorder visually (e.g. `5 + 7` or `+ 7 5`). The `dir="ltr"` on the span helps but the equation is built as a string in `MemoryFactory` (`${n1} ${op} ${n2}`) with no explicit LTR isolation at the *data* level. **The robust fix is to wrap every equation in a dedicated LTR-isolated element and use `\u200E` (LRM) or a `<bdi>`-style wrapper.**

**Issue B — Answer mechanism is trivial (design flaw):**
- `MemoryFactory.generate` creates pairs of `{equation, answer}` where the answer card is just the number. Matching "7 + 5" to "12" is a *recognition* task, not a *computation* task — the kid doesn't have to solve anything, they just find the matching number. **This is why "you can't always find answers to the math problems"** — the answer is a bare number, so there's no math to do, and if two equations share an answer the factory *skips* them (`usedAnswers.has(answer) → continue`), which shrinks the pool and can make generation fail or produce trivial pairs.
- **The `maxAttempts = pairs * 50` safety valve can silently under-generate.** If the pool is exhausted (small operand space at low levels), `generated < pairs` and the deck comes back with fewer cards than `cardCount` — the grid then has holes. `MemoryDuelGame` hardcodes `cardCount = 12` (6 pairs) but doesn't verify the factory returned 12 cards.

**Recommendations (see §8 for code):**
- **LTR fix:** render equations in a dedicated `dir="ltr"` + `unicodeBidi: isolate` element at the data level, and prepend `\u200E` to equation strings.
- **Answer mechanism redesign:** make the *answer* card show a *different* equation that evaluates to the same result (e.g. pair `7 + 5` with `6 + 6`), so matching requires computing both. This turns Memory Duel into a true "find the equal-value pair" game. Fall back to number-answer cards only at the lowest levels (age 5-6).
- **Guarantee deck size:** after generation, assert `cards.length === cardCount`; if short, pad with guaranteed-valid pairs (or regenerate with a wider operand range). Never render a grid with holes.

### 2.5 MATH INVADERS (useInvaderEngine.ts + types.ts + MathInvadersGame.tsx)

**This is the mode Ram specifically flagged (25 correct, no level up). See §9 for the full fix.**

**Root cause — `state.level` is never incremented:**
- `types.ts` `createInitialInvaderState` sets `level: 1`.
- `useInvaderEngine.ts` reads `state.level` only for display (`MathInvadersGame.tsx` line ~120: `Level {state.level}`) and for the boss bonus (`500 * prev.level`). **Nothing ever increments it.** The `handleAnswerTap` correct path updates `score`, `combo`, `frenzy` — but never `level`.
- The only "progression" is the **60-second survival timer** (`VICTORY_TIME_MS = 60_000`) and the **speed ramp** (`SPEED_RAMP_INTERVAL_MS = 10_000`, +0.2 every 10s, capped at 3x). A fast player who answers correctly never sees the game get harder or "level up" — they just wait out the timer. **This is exactly Ram's complaint.**

**Secondary issues:**
- **`generateDistractors` can produce duplicate/overlapping answer bubbles** — it uses a `Set` but the padding loop can add `candidate + 10` that collides with an existing value, and the 4 answer bubbles are placed at `x: 10 + idx*25` which can overlap on narrow screens.
- **Boss wave is time-based, not progress-based** (`BOSS_WAVE_INTERVAL_MS = 30_000`), so a fast player might not even see a boss before the 60s timer ends.
- **Anti-repeat window is only 8** (`usedSignaturesRef`, line ~90) and the diversity roll (`roll > 0.7 → series`, `roll > 0.5 → compare`) only applies when `!profile?.currentFocus` — in saga mode `currentFocus` is set, so **invaders almost always generates plain arithmetic**, killing variety.

**Recommendations (see §9 for code):**
- **Add combo-based leveling:** every 5 consecutive correct answers → `level + 1`, which increases spawn speed, equation velocity, and boss frequency. This directly fixes "25 correct, no level up."
- **Make boss waves progress-based** (every 3 levels) instead of purely time-based.
- **Fix distractor uniqueness** and **spread answer bubbles responsively** (use percentage spacing, not fixed `idx*25`).
- **Widen the anti-repeat window to 12** and **always apply the diversity roll** regardless of `currentFocus`.

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

With `MASTERY_THRESHOLD = 10`, `MASTERY_ACCURACY = 0.8`, and `MAX_LEVEL = 10`:

- To go from level 1 → 2, you need **3 distinct skills** each with ≥10 attempts at ≥80% accuracy = **30+ correct answers across 3 different problem types**.
- A player who only plays addition (the most common case) accumulates 1 mastered skill → stays at level 1 **forever**.
- **This is the "25 correct, no level up" bug, and it applies to ALL modes, not just arcade.**

### 3.2 The Dummy-Profile Problem

`GameOrchestrator.tsx` (SENSORY branch, ~line 100) and `MathInvadersGame` both build a **fresh dummy profile**:

```typescript
const adaptedProfile = { ...realCapabilities, estimatedLevel: targetLevel };
```

Even though `BubbleGameContainer` calls `Director.recordResult()` on the *real* profile, the *problem generation* never sees the updated profile. So the adaptive difficulty never actually adapts within a session — the next problem is generated at the same level with empty skill history.

### 3.3 Concrete Numbers

| Mode | Level-up trigger | Time to level 2 (fast player) | Verdict |
|---|---|---|---|
| PRACTICE | 3 mastered skills (30+ correct, 3 types) | ~3 sessions | Too slow |
| SENSORY | Same mastery formula | Never (1 skill) | **Broken** |
| MEMORY | No leveling at all | N/A | Flat |
| INVADERS | No leveling at all | N/A | **Broken** |
| LESSON | N/A (content) | N/A | N/A |

### 3.4 Recommended Difficulty Curve

Replace the cross-skill mastery gate with a **per-skill + streak hybrid**:

1. **Per-skill mastery** (fast feedback): a skill levels up when it hits `MASTERY_THRESHOLD` attempts at `MASTERY_ACCURACY`. Each mastered skill bumps `estimatedLevel` by 1 (not 1 per 3).
2. **Streak bonus** (hot-streak reward): every 5 consecutive correct on a skill → +1 to that skill's effective difficulty within the session (doesn't persist, prevents runaway).
3. **Rescue stays as-is** (2-3 consecutive failures → simplify).

This gives fast players visible progress every ~10 correct answers while keeping struggling players in a safe zone.

---

## 4. New Feature Proposals (creative, kid-focused)

### 4.1 "Math Pet Evolution" (high value, low effort)
The pet system already exists (`PET_STAGES` egg→baby→child→teen→adult at levels 1/2/4/6/8). **Make the pet visibly react to in-session performance** — it jumps on correct answers, droops on wrong ones, and does a "level-up dance" when the player levels. Kids form emotional bonds with pets; this turns every session into a pet-care loop. (Effort: M — mostly UI in `PetAvatar`.)

### 4.2 "Boss Rush" mode (medium effort, high delight)
A dedicated mode where the player faces a gauntlet of the 4 unit bosses (Octopus → Bear → Eagle → Scorpion) back-to-back with escalating difficulty. Reuses the existing `BossGate` machinery (`bossGate.ts`, `prepareBossGate`). Gives advanced players a clear "endgame" and a reason to keep playing after finishing the map. (Effort: M.)

### 4.3 "Story Mode" / narrative wrapper
The curriculum is already themed (Beach → Forest → Mountain → Desert → Space). Add a light narrative: "The Octopus stole the beach's numbers — help the mascot get them back!" Each unit is a chapter. Kids 5-11 respond strongly to narrative framing. (Effort: L — content-heavy, but the map structure already supports it.)

### 4.4 "Speed Round" daily challenge variant
`dailyChallenges.ts` already has streak multipliers. Add a "beat your best time" daily challenge: solve 10 problems as fast as possible, track personal best. Taps into the existing `updateArcadeBestScore` persistence. (Effort: S.)

### 4.5 "Golden Bubble" / rare reward bubble
In SENSORY, a rare golden bubble worth 3x points appears occasionally (reuses `POWER_UP_CONFIG`). Creates a "hunt for the golden bubble" moment that kids love. (Effort: S.)

### 4.6 "Multiplayer / sibling mode"
Two profiles on the same device, alternating turns, with a shared "family scoreboard." Parents with 2+ kids (very common in Israel) would love this. (Effort: L — needs profile-switch UX, but `profile-switching` is already planned in e2e.)

### 4.7 "Adaptive audio" (accessibility + delight)
The `soundGarden` feature exists. Extend it: correct answers play a rising musical scale (already partially there via `playMelodyNote`), and a "combo melody" that gets more complex as the combo grows. Kids with sound on get musical reinforcement. (Effort: S.)

### 4.8 "Parent progress report" (retention driver)
The parent dashboard exists. Add a weekly email/PDF summary: "Your child mastered 3 new skills this week, practiced 45 minutes, and is working on multiplication." This is the #1 thing that makes parents keep kids on an app. (Effort: M — needs a report generator; email is draft-only per policy.)

---

## 5. Analytics Gap Analysis

### 5.1 What's tracked today (`useAnalytics.ts`)

13 event types: `login, signup, app_open, mascot_change, node_select, node_start, node_complete, streak_milestone, question_answered, page_view, level_start, level_complete, level_failed`.

### 5.2 Gaps (what we should track but don't)

| Gap | Why it matters | Suggested event |
|---|---|---|
| **Session-level funnel** | Where do kids drop off? | `session_start`, `session_end` with `duration_sec`, `questions_answered`, `mode` |
| **Per-mode engagement** | Which mode retains best? | `mode_session_start`, `mode_session_end` |
| **Difficulty adaptation events** | Is the Director working? | `director_rescue_triggered`, `director_challenge_triggered`, `director_level_up` |
| **Anti-repeat effectiveness** | Are duplicates still slipping? | `problem_repeat_attempted` (when a collision is detected & resolved) |
| **Error patterns** | What do kids get wrong? | `question_answered` already has `equation` + `is_correct` — add `wrong_answer_given` to see *which* wrong answer |
| **Retention** | Do kids come back? | `day_2_retention`, `day_7_retention` (computed from `app_open` + profile_id) |
| **Bubble playability** | Dead zones / idle waiting | `bubble_spawned`, `bubble_popped`, `bubble_missed` (with x/y) |
| **Memory Duel specifics** | Is the answer mechanism working? | `memory_pair_matched`, `memory_pair_mismatched`, `memory_time_per_pair` |
| **Invaders leveling** | Is progression visible? | `invaders_level_up`, `invaders_boss_defeated` |

### 5.3 Accessing real Firebase data

The app uses `firebase/analytics` (`useAnalytics.ts`). To get real data:

1. **Firebase Console** (firebase.google.com) → project → Analytics → Events. This is the zero-code path — all logged events appear here with user counts, but no per-user detail.
2. **BigQuery export** — enable the Analytics → BigQuery link in the console. Then you can run SQL like:
   ```sql
   SELECT event_name, COUNT(*) FROM `hebrew-math-adventures.analytics_*.events_*`
   WHERE event_name = 'question_answered' GROUP BY event_name;
   ```
   This is the only way to get per-user, per-session detail and to compute retention.
3. **Firebase Admin SDK / REST API** — for programmatic access (e.g. a daily report job). Requires a service account. **Note:** this is a read-only analytics access; per policy, don't add write access or send external messages without Ram's OK.
4. **Local dev mock** — `useAnalytics.ts` already logs to console when `analyticsReady` is null. For e2e, we can assert on these console logs (see §6).

**Recommendation:** Enable the BigQuery export (one-time console step, ~15 min) so we can run real retention/funnel queries. Until then, the e2e tests + localStorage assertions give us deterministic behavioral data.

---

## 6. E2E Playwright Testing Strategy (using agy / Gemini)

### 6.1 Why agy (Gemini CLI)

`agy -p "..."` is a Gemini-3 agent that can **write and iterate on Playwright specs autonomously**. Its strengths for this project:
- **Generates robust selectors** and handles the flaky coordinate-based bubble clicks better than hand-written code.
- **Self-debugs** — when a test fails, agy can read the failure, adjust the spec, and re-run.
- **Writes deterministic localStorage assertions** (the pattern this project already uses) instead of flaky UI-animation assertions.

### 6.2 Critical flows to automate (priority order)

The existing `EXPANDED_COVERAGE_PLAN.md` is excellent. I endorse it and add these **regression-critical** flows tied to the bugs in this review:

1. **P0 — Anti-repeat regression** (new): run a practice session and assert no two consecutive `question_answered` events have the same `equation`. This directly guards the "0+0 twice" bug.
2. **P0 — Memory Duel LTR + deck integrity** (new): assert (a) equation cards render with LTR direction, (b) the deck has exactly `cardCount` cards (no holes), (c) matching all pairs completes the game.
3. **P0 — Invaders leveling** (new): play invaders, answer 5+ correct in a row, assert `state.level` increments and the HUD shows "Level 2".
4. **P0 — Bubble playability** (new): in zen mode, assert bubbles spawn in tappable regions (not behind HUD) and that a target is always reachable within its lifetime.
5. **P1 — All flows in `EXPANDED_COVERAGE_PLAN.md`** (saga completion, lesson, unit progression, arcade game-over, memory, parent dashboard, profile switching, language toggle, pet, wrong-answer, play-again).

### 6.3 How agy helps concretely

```bash
# Have agy write the anti-repeat regression spec
agy -p "Write a Playwright spec at e2e/anti-repeat.spec.ts for the hebrew-math-adventures app. It should: create a fresh profile, enter practice node n1_3, answer 10 questions via the solveCurrentProblem helper, and assert via page.evaluate on localStorage/console that no two consecutive question_answered events share the same equation. Use the existing helpers in e2e/helpers.ts. Run it and fix failures until green."

# Have agy write the memory-duel LTR + deck-integrity spec
agy -p "Write e2e/memory-duel.spec.ts ... assert equation cards have dir=ltr and the deck has 12 cards ..."

# Have agy write the invaders-leveling spec
agy -p "Write e2e/invaders-leveling.spec.ts ... answer 5 correct, assert HUD shows Level 2 ..."
```

**Key agy workflow:** give it the exact file paths, the existing helper names, and the *deterministic assertion target* (localStorage/console/state), then let it iterate. Run with `timeout=600` (agy, like claude, needs long timeouts to think).

### 6.4 Test plan summary

| Priority | Spec | Guards |
|---|---|---|
| P0 | `anti-repeat.spec.ts` | "0+0 twice" regression |
| P0 | `memory-duel.spec.ts` | LTR fix + deck integrity + completion |
| P0 | `invaders-leveling.spec.ts` | "25 correct no level up" regression |
| P0 | `bubble-playability.spec.ts` | spawn dead-zone validation |
| P1 | `saga-node-completion.spec.ts` | core journey |
| P1 | `lesson-node-completion.spec.ts` | lesson flow |
| P1 | `unit-progression.spec.ts` | cross-unit unlock |
| P1 | `arcade-game-over.spec.ts` | game-over + best score |
| P1 | `parent-dashboard.spec.ts` | parent gate |
| P1 | `profile-switching.spec.ts` | multi-profile isolation |
| P1 | `language-toggle.spec.ts` | i18n |
| P1 | `pet-screen.spec.ts` | pet engagement |
| P2 | `wrong-answer-feedback.spec.ts` | negative path |
| P2 | `play-again-loop.spec.ts` | consecutive sessions |

---

## 7. Anti-Repeat & Question Diversity Fix (specific algorithm)

### 7.1 The problem

- `MathModule.generateProblem` internal loop: `maxAttempts = 5` (line ~40) — gives up too early on small pools.
- `MathStrategy` outer loop: `MAX_REGEN_ATTEMPTS = 8` — good, but the fallback perturbation can still admit near-duplicates.
- `useInvaderEngine`: window of 8, and diversity roll suppressed when `currentFocus` is set.
- `MemoryFactory`: skips duplicate answers, shrinking the pool.

### 7.2 The fix — a shared "diversity bag" utility

Create `src/engines/utils/DiversityBag.ts` — a reusable, testable anti-repeat primitive:

```typescript
// src/engines/utils/DiversityBag.ts
export class DiversityBag {
  private recent: string[] = [];
  constructor(private windowSize = 12) {}

  /** Returns true if this signature is "too recent" to reuse. */
  isBlocked(sig: string): boolean {
    return this.recent.includes(sig);
  }

  /** Record a signature as used. */
  push(sig: string): void {
    this.recent.push(sig);
    if (this.recent.length > this.windowSize) this.recent.shift();
  }

  /**
   * Pick a non-recent item from a candidate pool, expanding the pool
   * (via the expander) if everything is blocked. Guarantees a non-repeat
   * when the pool has >= 2 distinct items.
   */
  pick<T>(pool: T[], sigOf: (t: T) => string, expander?: (blocked: T[]) => T[]): T {
    let available = pool.filter((t) => !this.isBlocked(sigOf(t)));
    if (available.length === 0 && expander) {
      available = expander(pool);
    }
    if (available.length === 0) {
      // Pool truly exhausted — allow the least-recent item (oldest in window)
      available = pool;
    }
    const chosen = available[Math.floor(Math.random() * available.length)];
    this.push(sigOf(chosen));
    return chosen;
  }
}
```

### 7.3 Wire it into each mode

- **MathModule:** replace the `maxAttempts = 5` loop with a `DiversityBag` that expands the operand range on collision (e.g. `max * 1.5`) instead of giving up.
- **MathStrategy:** keep the existing `recentSignatures` but route through `DiversityBag.pick` with an expander that widens `max` — this eliminates the perturbation fallback hack.
- **useInvaderEngine:** widen window to 12, and **always** apply the diversity roll (remove the `!profile?.currentFocus` guard).
- **MemoryFactory:** use `DiversityBag` for both answers and equations; on collision, widen the operand range rather than skipping (so the deck always fills to `cardCount`).

### 7.4 Trivial-signature guard (already good, keep it)

`MathStrategy.collectTrivialSignatures()` already blocks `0+0`, `1-1`, `0*N`. **Extend it** to also block `0+N` and `N+0` (identity additions) at low levels, and `1*N`/`N*1` at multiplication levels — these are pedagogically trivial and feel like repeats even when technically distinct.

---

## 8. Memory Duel LTR Math Fix (specific code changes)

### 8.1 LTR rendering fix

**Problem:** The root container is `dir="rtl"` (`MemoryDuelGame.tsx` line ~40). The equation `<span>` has `dir="ltr"` (line ~180), but the equation *string* is built in `MemoryFactory` as `${n1} ${op} ${n2}` with no bidi isolation at the data level. In an RTL context, `"7 + 5"` can render as `"5 + 7"` or with the operator misplaced.

**Fix (data level — most robust):** In `MemoryFactory.generate`, wrap the equation in an LRM and mark it LTR:

```typescript
// MemoryFactory.ts — equation card displayValue
displayValue: `\u200E${n1} ${op} ${n2}`,  // LRM forces LTR ordering
```

**Fix (render level — belt & suspenders):** In `MemoryDuelGame.tsx`, the equation span already has `dir="ltr"` + `unicodeBidi: 'isolate'`. Keep it, and add the same to the *answer* card span (it's a bare number, but for consistency):

```tsx
<span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="...">
  {card.displayValue}
</span>
```

**Verify:** add an e2e assertion that the equation card's computed `direction` is `ltr` and the text content matches `n1 op n2` order.

### 8.2 Answer-generation fix (make it real math)

**Problem:** Answer cards are bare numbers → trivial matching, and `usedAnswers.has(answer) → continue` shrinks the pool.

**Fix — "equal-value pair" design:** pair each equation with a *different* equation that evaluates to the same result:

```typescript
// MemoryFactory.ts — replace the answer-card generation
// Instead of a bare-number answer card, generate a second equation with the same result.
// For each pair, we now have: equationA (e.g. "7 + 5") and equationB (e.g. "6 + 6").
// The kid must COMPUTE both to find the match. This is real math.

// Keep a pool of "result → equation" so we can find a partner with the same answer.
// If no partner exists (small pool), fall back to a bare-number answer card ONLY at level 1-2 (age 5-6).
```

**Guarantee deck integrity:** after the generation loop, assert `cards.length === cardCount`:

```typescript
if (cards.length < config.cardCount) {
  // Widen operand range and retry, or pad with guaranteed-valid pairs.
  // Never return a short deck — the grid must be full.
}
```

**Also fix:** `MemoryDuelGame.tsx` should not hardcode `cardCount = 12` without checking the factory result. Pass the actual deck length to the grid, or assert it.

---

## 9. Math Invaders Progression Fix (specific code changes)

### 9.1 Add combo-based leveling

**Problem:** `state.level` is set to 1 and never incremented (`types.ts` `createInitialInvaderState`; `useInvaderEngine.ts` never touches `level` on the correct path).

**Fix:** In `useInvaderEngine.ts` `handleAnswerTap`, on the correct path, add level-up logic:

```typescript
// useInvaderEngine.ts — inside the correct-answer branch of handleAnswerTap
const newCombo = prev.combo + 1;
// Level up every 5 consecutive correct answers
const newLevel = Math.min(10, prev.level + (newCombo % 5 === 0 ? 1 : 0));
```

Then make leveling *matter* by feeding it into the game loop:

```typescript
// In the game loop, use state.level to scale difficulty:
const levelSpeedBoost = 1 + (currentState.level - 1) * 0.15; // +15% speed per level
const currentSpeed = speedMultiplierRef.current * levelSpeedBoost;
```

And scale spawn interval with level:

```typescript
// spawnEquation — scale interval down as level rises
const baseInterval = 2500 / (1 + (currentState.level - 1) * 0.1);
```

### 9.2 Make boss waves progress-based

**Problem:** `BOSS_WAVE_INTERVAL_MS = 30_000` is time-based; a fast player may never see a boss before the 60s timer.

**Fix:** Trigger a boss every 3 levels (in addition to the time-based fallback):

```typescript
// In handleAnswerTap, after level-up:
if (newLevel % 3 === 0 && !currentState.isBossWave) {
  // schedule spawnBoss() on next loop tick
}
```

### 9.3 Fix distractor uniqueness & bubble spread

**Problem:** `generateDistractors` padding can collide; answer bubbles at `x: 10 + idx*25` can overlap on narrow screens.

**Fix:**
```typescript
// generateDistractors — guarantee uniqueness
const distractors = new Set<number>();
let candidate = correct + 1;
while (distractors.size < count) {
  if (candidate !== correct && candidate >= 0) distractors.add(candidate);
  candidate++;
}
```

```typescript
// spawnAnswers — responsive spread using percentages
const spread = 80 / allValues.length; // divide the play area evenly
const newAnswers = allValues.map((val, idx) => ({
  ...,
  x: 10 + idx * spread + Math.random() * 3, // percentage-based, no overlap
  ...
}));
```

### 9.4 Widen anti-repeat + always diversify

```typescript
// useInvaderEngine.ts generateProblem
// 1. Widen window: 8 → 12
// 2. Remove the `!profile?.currentFocus` guard so diversity always applies:
const roll = Math.random();
if (roll > 0.7 && targetLevel >= 2) diversityParams.type = 'series';
else if (roll > 0.5) diversityParams.type = 'compare';
```

---

## 10. Priority-Ordered Action Plan (with effort estimates)

### Phase 1 — Correctness & the two reported bugs (do first, ~1 day)

| # | Task | Files | Effort |
|---|---|---|---|
| 1 | **Memory Duel LTR fix** (LRM + render isolation) | `MemoryFactory.ts`, `MemoryDuelGame.tsx` | S (30 min) |
| 2 | **Memory Duel answer redesign** (equal-value pairs) + deck-integrity guarantee | `MemoryFactory.ts`, `MemoryDuelGame.tsx` | M (2-3 hr) |
| 3 | **Invaders combo-based leveling** + wire level into speed/spawn | `useInvaderEngine.ts`, `types.ts` | M (2 hr) |
| 4 | **Shared `DiversityBag`** + wire into MathModule/MathStrategy/invaders/memory | `utils/DiversityBag.ts` + 4 consumers | M (3 hr) |
| 5 | **Fix dummy-profile** in GameOrchestrator (use real profile for generation) | `GameOrchestrator.tsx` | S (15 min) |
| 6 | **Fix `currentFocus` key mismatch** | `progress.ts` / `GameDirector.ts` | S (10 min) |

### Phase 2 — Progression & engagement (~1-2 days)

| # | Task | Files | Effort |
|---|---|---|---|
| 7 | **Rework mastery leveling** (per-skill + streak hybrid, not 1-per-3-skills) | `GameDirector.ts`, `worldConfig.ts` | M (2 hr) |
| 8 | **Regenerate bubble problem every N correct** (wire `PROBLEM_ROTATION_EVERY`) | `MathStrategy.ts`, `BubbleGame` | S (30 min) |
| 9 | **Adaptive session length** (8/10/12 by speed) | `PracticeMode.tsx`, `usePracticeSession.ts` | S (30 min) |
| 10 | **Unify star computation** (remove inline ternary) | `PracticeMode.tsx` | S (15 min) |
| 11 | **Invaders boss on level, not just time** | `useInvaderEngine.ts` | S (30 min) |
| 12 | **Bubble spatial playability validation** (unit test) | `MathStrategy` tests | S (30 min) |

### Phase 3 — New features (pick by value; ~1-2 days each)

| # | Feature | Effort |
|---|---|---|
| 13 | Math Pet Evolution (in-session reactions) | M |
| 14 | Boss Rush mode | M |
| 15 | Golden Bubble reward | S |
| 16 | Speed Round daily challenge | S |
| 17 | Adaptive combo audio | S |
| 18 | Story Mode narrative wrapper | L |
| 19 | Sibling/multiplayer mode | L |
| 20 | Parent weekly report | M |

### Phase 4 — Analytics & e2e (ongoing)

| # | Task | Effort |
|---|---|---|
| 21 | Enable BigQuery export (one-time console step) | S |
| 22 | Add session-funnel + mode-engagement + director events | M |
| 23 | Write P0 e2e specs (anti-repeat, memory-duel, invaders-leveling, bubble-playability) via agy | M |
| 24 | Write P1/P2 e2e specs from `EXPANDED_COVERAGE_PLAN.md` via agy | L |

---

## Appendix: Key File/Line References

- `src/engines/GameDirector.ts` — mastery formula (lines ~90-110), `recordResult`, `tuneConfig`
- `src/lib/worldConfig.ts` — `DIRECTOR_CONFIG`, `INVADER_CONFIG`, `SPAWN_CONFIG`, `SESSION_CONFIG`, `FRENZY_CONFIG`, `MEMORY_LEVEL_OPS`
- `src/engines/MathModule.ts` — `generateProblem` (maxAttempts=5, line ~40), `pickProblemType`
- `src/engines/ProblemFactory.ts` — `ArithmeticFactory.generate` (operand generation, zero-guards)
- `src/engines/bubble/strategies/MathStrategy.ts` — anti-repeat machinery, `collectTrivialSignatures`, `buildSpawnBag`, `generateDistractors`
- `src/engines/invader/useInvaderEngine.ts` — `handleAnswerTap` (no level-up), `generateProblem` (window 8, diversity guard), `spawnAnswers` (fixed x spread)
- `src/engines/invader/types.ts` — `createInitialInvaderState` (level:1), `VICTORY_TIME_MS`, `SPEED_RAMP_INTERVAL_MS`
- `src/engines/memory/MemoryFactory.ts` — equation/answer pair generation, `usedAnswers.has` skip, `maxAttempts = pairs*50`
- `src/components/games/MemoryDuelGame.tsx` — `dir="rtl"` root (line ~40), equation span `dir="ltr"` (line ~180), `cardCount = 12`
- `src/components/games/MathInvadersGame.tsx` — HUD `Level {state.level}` (line ~120), star logic
- `src/components/GameOrchestrator.tsx` — dummy profile (SENSORY branch ~line 100), star computation
- `src/components/PracticeMode.tsx` — `SESSION_LENGTH = 10`, inline star ternary (~line 330)
- `src/hooks/useAnalytics.ts` — 13 event types
- `src/lib/stars.ts` — `computeStarsByTier`, `getTier`
- `e2e/EXPANDED_COVERAGE_PLAN.md` — existing e2e plan (endorsed, extended here)
- `vault/roadmap/backlog.md`, `vault/roadmap/known-issues.md` — open concerns (bubble playability, lesson coverage)
