# 🛠️ Implementation Plan — Hebrew Math Adventures Arcade Overhaul

**Author:** Claude Opus (Senior Architect)
**Date:** 2026-07-31
**Source:** `COUNCIL_REPORT.md` + direct source audit
**Scope:** All P0 + P1 fixes, plus top-3 creative features (Math Pet, Boss Knowledge Gates, Combo Fusion + Power-Ups)

---

## 0. Grounding Notes (read before starting)

These are **corrections/clarifications** discovered by reading the actual source. They change how some council items should be implemented:

1. **The `problem` prop is largely dead in the bubble game.** `GameOrchestrator` computes an `equation` string and a `SensoryProblem`, but `BubbleGameContainer` renders `behavior.getInstruction()` (line 375), NOT the passed `instruction`. And `MathBehaviorStrategy` generates its **own** arithmetic problem via `MathModule.generateProblem()` inside `generateAndSetProblem` — it ignores the passed problem except through the `setProblem` effect. **Consequence:** once we remove the `setProblem` useEffect (P0-1), the strategy fully owns the problem lifecycle, and `GameOrchestrator`'s hardcoded `type: 'addition_simple'` (Issue 4a) becomes **moot for the bubble game** (it still matters for the initial instruction flash and for `SensoryFactory`, and for any node-based sensory play, so we still fix it).

2. **The duplicate-question fallback bug is real and lives in the strategy path.** `MathBehaviorStrategy.generateAndSetProblem` calls `mathModule.generateProblem(profile, { difficulty, excludeSignatures })` with **no `type`**, so `MathModule.pickProblemType` can return `comparison`/`series`/`word`. Those are not `arithmetic|sensory`, so `isSupportedProblem` fails and it substitutes `FALLBACK_PROBLEM` (`1+1=2`) — every single time an unsupported type is rolled. That is the "0+0 / 1+1 twice in a row" root cause (2a).

3. **`initializeLevel` is called with a hardcoded `1`** in `BubbleGameContainer.tsx:88-90`, and `sessionLevel` is `useState(1)`. Both must be seeded from the profile together (P0-3 depends on this).

4. **`generateDistractor` has no operand context today.** It only sees `this.targetValue`. But `this.currentProblem` **is** stored (`ArithmeticProblem | SensoryProblem`), so pedagogical distractors (P1) can read `num1/num2/operator` from it. Feasible without signature changes.

5. **Anti-repeat is double-layered** (both `MathModule` and `MathStrategy` keep their own window). The displayed-signature bug (2b) is specifically in `MathStrategy.pushSignature(signature)` where `signature` is the signature of the last **generated** problem in the do-while, which diverges from what's displayed only when the fallback substitution fires. Fixing #2 (filter types) mostly eliminates the divergence; we still make the push explicit for safety.

6. **Testing reality:** `npm test` = `vitest run` (unit). Playwright e2e (`e2e/`) runs against the **deployed** URL `https://hebrew-math-adventures-2025.web.app` (see `e2e/helpers.ts`), so **e2e cannot validate local changes until deploy**. Therefore: put logic guarantees in **vitest** (fast, local), and treat e2e as post-deploy regression. There are currently **no tests** for `MathModule`, `MathBehaviorStrategy`, `useGameEngine`, or `BubbleGameContainer` — we add them.

7. **Profile persistence is allow-listed.** `ProfileContext.validateProfileUpdate` **strips any field it doesn't explicitly recognize**. Every new profile field for creative features (pet, gems, quests, combo unlocks) **must** be added to `validateProfileUpdate` AND the migration `map()` in the `useState` initializer (lines 203-218) or it will silently never persist. This is the #1 footgun for Phases 3-5.

---

## Dependency Graph (top-level)

```
P0-1 (remove setProblem effect) ──┬─> P0-3 (seed session level) ──> P1-10 (prestige)
                                  └─> P0-5 (supportedTypes filter) ──> P0-6 (displayed signature)
P0-5 ──> P1-11 (anti-repeat window/broaden)
P0-2 (cumulative leveling) ───────> P1-10 (prestige)
P1-13 (pedagogical distractors) depends on P0-1 (strategy owns currentProblem cleanly)
Phase 3 (Pet) depends on: profile-field plumbing (new shared step 3.0)
Phase 4 (Boss gates) depends on: P0-1, P0-5 (clean problem ownership)
Phase 5 (Fusion/Power-ups) depends on: P0-1, P0-5, and Phase 4 patterns for multi-entity spawn
```

---

# PHASE 1 — P0 Critical Fixes

> Do these strictly in the order below. 1 → 3 → 5 → 6 form one chain (problem ownership); 2 is independent; 4, 8, 9 are trivial and independent.

## P0-1 — Remove the `setProblem` useEffect so the strategy owns problem lifecycle

- **File:** `src/components/sensory/BubbleGame.tsx`
- **Function/component:** `BubbleGame` (the `useEffect` at lines 66-68)
- **Change:**
  ```diff
  - const [behavior] = useState(() => new MathBehaviorStrategy());
  - useEffect(() => {
  -     behavior.setProblem(problem);
  - }, [problem, behavior]);
  + const [behavior] = useState(() => new MathBehaviorStrategy());
  + // Strategy owns problem generation via initializeLevel/regenerateProblem.
  + // We intentionally do NOT push the passed `problem` in — that would overwrite
  + // adaptive regeneration and re-introduce the sensory "Pop N" instruction.
  ```
  - Remove the now-unused `useEffect`/`problem` import churn (keep `problem` — still used by `baseConfig.winCondition.value` and `useMemo` deps). Remove `useEffect` from the React import if no longer used elsewhere (it isn't in this file after removal).
  - **Companion change (required, same PR):** in `BubbleGameContainer.tsx:88-90`, `initializeLevel` is called with hardcoded `1`. Leave that call but change the literal to the seeded level from **P0-3** (they land together). For P0-1 alone, keep `initializeLevel(sessionLevel, config)`.
- **Dependencies:** none (but must ship together with P0-3 to avoid a window where level is hardcoded to 1).
- **Testing:**
  - New vitest `src/engines/bubble/__tests__/MathStrategy.test.ts`: assert that after `initializeLevel(3, cfg)`, `getInstruction()` returns an arithmetic string (`/\d+ [+\-*/] \d+ = \?/`) and NOT `"Pop N"`.
  - Assert `regenerateProblem` changes the instruction (loop 20×, expect ≥ 2 distinct instructions).
- **Risk:** If `initializeLevel`'s `if (this.currentProblem) return;` guard fires because a previous instance persisted, the first problem could be stale. Mitigation: `behavior` is created per-`BubbleGame` mount via `useState(() => new ...)`, so it's fresh. The `key={gameId}` restart also remounts container but **reuses** the same `behavior` instance (it lives in `BubbleGame`, parent of the keyed container) — verify restart still regenerates. If not, add a `behavior.reset()` on restart (low risk, note for QA).
- **Effort:** 15 min

## P0-2 — Cumulative-correct leveling (stop resetting streak on distractor misclicks)

- **File:** `src/components/games/BubbleGameContainer.tsx`
- **Function:** `handleSessionLeveling` (lines 175-239), plus refs at 70-73
- **Change:** Track **cumulative correct within the current level** instead of a strict consecutive streak for the level-up trigger. Keep a separate consecutive counter only for the "hot streak → harder problem" adaptive nudge.
  ```diff
  - const consecutiveCorrectRef = useRef(0);
  + const consecutiveCorrectRef = useRef(0);   // still used for hot-streak difficulty bump
  + const levelProgressRef = useRef(0);        // NEW: cumulative correct toward next level
  ```
  In the `isCorrect` branch:
  ```diff
    consecutiveCorrectRef.current++;
  + levelProgressRef.current++;
    consecutiveWrongRef.current = 0;
    ...
  - const needed = LEVEL_UP_THRESHOLDS[thresholdIndex];
  - if (consecutiveCorrectRef.current >= needed) {
  -     consecutiveCorrectRef.current = 0;
  + const needed = LEVEL_UP_THRESHOLDS[thresholdIndex];
  + if (levelProgressRef.current >= needed) {
  +     levelProgressRef.current = 0;
  +     consecutiveCorrectRef.current = 0;
        ...level up...
    }
  ```
  In the wrong branch: **do NOT zero `levelProgressRef`** (that's the whole point). Optionally decay it by 1 on wrong to keep some pressure: `levelProgressRef.current = Math.max(0, levelProgressRef.current - 1);`. Keep zeroing `consecutiveCorrectRef` so the hot-streak nudge still resets.
  - On level up **and** level down, reset `levelProgressRef.current = 0`.
- **Dependencies:** none.
- **Testing:**
  - New vitest `src/components/games/__tests__/leveling.test.ts` — extract the threshold logic into a pure helper `computeLevelUp(levelProgress, sessionLevel)` (small refactor: move the `LEVEL_UP_THRESHOLDS` decision into `src/engines/bubble/leveling.ts`) and unit-test: 10 correct with 3 interspersed wrong still reaches level 3+; a pure consecutive-reset model would not.
  - **Refactor recommendation:** pull `LEVEL_UP_THRESHOLDS`, `LEVEL_DOWN_THRESHOLD`, and the up/down decision into `src/engines/bubble/leveling.ts` as pure functions so they're testable without React. Low risk, high test value.
- **Risk:** Faster leveling means players hit boss levels (3/6/9) and level 10 sooner → surfaces the prestige gap (mitigated by P1-10). Also interacts with `PROBLEM_ROTATION_EVERY` and hot-streak configs — verify difficulty still feels fair. Medium.
- **Effort:** 30 min

## P0-3 — Seed `sessionLevel` from `profile.estimatedLevel`

- **Files:** `src/components/games/BubbleGameContainer.tsx`, `src/components/sensory/BubbleGame.tsx`
- **Functions/props:** `BubbleGameContainer` (`useState(1)` at 67, `sessionLevelRef` at 73, `initializeLevel(1,...)` at 89), `BubbleGame` (already receives `profile?: UserCapabilityProfile`)
- **Change:**
  - `BubbleGame` passes an `initialLevel` prop to the container:
    ```tsx
    const initialLevel = Math.min(10, Math.max(1, profile?.estimatedLevel ?? 1));
    <BubbleGameContainer ... initialLevel={initialLevel} />
    ```
  - `BubbleGameContainer` adds `initialLevel?: number` prop (default 1); replace hardcoded initializers:
    ```diff
    - const [sessionLevel, setSessionLevel] = useState(1);
    + const [sessionLevel, setSessionLevel] = useState(initialLevel ?? 1);
    ...
    - const sessionLevelRef = useRef(1);
    + const sessionLevelRef = useRef(initialLevel ?? 1);
    ...
    - behavior.initializeLevel(1, config);
    + behavior.initializeLevel(sessionLevelRef.current, config);
    ```
- **Dependencies:** P0-1 (so `initializeLevel` actually drives the shown problem).
- **Testing:** vitest: render `BubbleGameContainer` with `initialLevel={4}` (mock `useProfile`, `useGameEngine` or use a lightweight behavior stub) and assert the `Lv` badge shows `Lv 4`. Simpler: unit-test that `initializeLevel(4, cfg)` produces level-4-appropriate operands (num1 ≥ 10 for addition per `ProblemFactory` level>3 branch).
- **Risk:** A high-`estimatedLevel` player now starts hard immediately (no ramp). Cap at 10; consider starting at `max(1, estimatedLevel - 1)` for a gentle warm-up (design choice — flag to product). Low-Medium.
- **Effort:** 15 min

## P0-4 — Raise Classic mode `target_count`

- **File:** `src/lib/arcadeModes.ts`
- **Function:** `getArcadeModeConfig` — `classic` case (lines 38-46)
- **Change:** `winCondition: { type: 'target_count', value: 20 }` (from 10). Update `ARCADE_MODE_LABELS.classic.desc` → `"Hit 20 targets — but watch your strikes!"`.
- **Dependencies:** none. (Pairs well with P0-2/P0-3 so the longer game actually ramps difficulty.)
- **Testing:** vitest `src/lib/__tests__/arcadeModes.test.ts`: assert `getArcadeModeConfig('classic').winCondition.value === 20`. Post-deploy e2e (`bubble-game.spec.ts`): progress bar total reflects 20.
- **Risk:** Longer sessions could bore slow players; but strikes still bound it. Low.
- **Effort:** 5 min

## P0-5 — Constrain generated problem types to what the strategy supports

- **Files:** `src/engines/MathModule.ts`, `src/engines/bubble/strategies/MathStrategy.ts`
- **Functions:** `MathModule.generateProblem` / `pickProblemType`; `MathBehaviorStrategy.generateAndSetProblem`
- **Change (preferred):** Add an optional `supportedTypes?: string[]` param honored by `pickProblemType`, so unsupported types are never rolled:
  ```diff
  // MathModule.generateProblem
  - const initialType = params?.type || this.pickProblemType(level);
  + const initialType = params?.type || this.pickProblemType(level, params?.supportedTypes);
  ```
  ```diff
  - private pickProblemType(level: number): string {
  -     const availableTypes: string[] = ['addition_simple'];
  + private pickProblemType(level: number, supportedTypes?: string[]): string {
  +     let availableTypes: string[] = ['addition_simple'];
        for (let l = 1; l <= level; l++) { ...accumulate... }
  +     if (supportedTypes && supportedTypes.length) {
  +         const isArith = (t: string) =>
  +             !t.startsWith('series') && !t.startsWith('word') &&
  +             !t.startsWith('compare') && t !== 'comparison';
  +         // supportedTypes for bubble = ['arithmetic'] → keep only arithmetic-family types
  +         availableTypes = availableTypes.filter(isArith);
  +         if (availableTypes.length === 0) availableTypes = ['addition_simple'];
  +     }
        return availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }
  ```
  Also guard the Director override: after `finalType = effectiveConfig.type || initialType`, if `supportedTypes` is set and `finalType` maps to an unsupported factory, fall back to `initialType`. (Director could re-inject a `type`.)
  ```diff
  // MathStrategy.generateAndSetProblem
    problem = this.mathModule.generateProblem(profile, {
        difficulty: level,
        excludeSignatures: this.recentSignatures,
  +     supportedTypes: ['arithmetic'],
    });
  ```
  Keep `isSupportedProblem`/`FALLBACK_PROBLEM` as a defensive net but they should now essentially never trigger.
- **Dependencies:** P0-1 (so the strategy path is the sole driver). Enables P0-6 and P1-11.
- **Testing:** vitest `src/engines/__tests__/MathModule.test.ts`: call `pickProblemType(5, ['arithmetic'])` 200× and assert it **never** returns `comparison`/`series`/`word`. Strategy test: 100× `regenerateProblem`, assert `getInstruction()` always matches `/\d+ [+\-*/] \d+ = \?/` (never the fallback pattern more than once consecutively).
- **Risk:** Reduces variety **within** the bubble game to arithmetic only (by design — comparisons/series can't render as poppable numeric bubbles). That's correct for this surface. Ensure multiplication/division still appear at higher levels (they're arithmetic-family and pass the filter). Low.
- **Effort:** 25 min

## P0-6 — Track the *displayed* signature in anti-repeat

- **File:** `src/engines/bubble/strategies/MathStrategy.ts`
- **Function:** `generateAndSetProblem` (line 67-74)
- **Change:** Compute the signature from the problem **actually set**, not the last generated candidate:
  ```diff
  - if (this.isSupportedProblem(problem)) {
  -     this.setProblem(problem);
  - } else {
  -     this.setProblem(MathBehaviorStrategy.FALLBACK_PROBLEM);
  - }
  - this.pushSignature(signature);
  + const displayed = this.isSupportedProblem(problem)
  +     ? problem
  +     : MathBehaviorStrategy.FALLBACK_PROBLEM;
  + this.setProblem(displayed);
  + this.pushSignature(this.problemSignature(displayed));
  ```
- **Dependencies:** P0-5 (largely removes the fallback path; this makes the remaining path correct).
- **Testing:** vitest: force fallback by stubbing `mathModule.generateProblem` to return a `comparison` problem; assert the pushed signature equals the fallback's signature (`arithmetic:1:+:1:2`), so a subsequent identical fallback is excluded.
- **Risk:** Minimal. Low.
- **Effort:** 10 min

## P0-7 — Strict positive minimum operands (kill degenerate `0` operands for all operators)

- **File:** `src/engines/ProblemFactory.ts`
- **Function:** `ArithmeticFactory.generate` (lines 56-187)
- **Change:** The `+` path already floors at 1 and there's a post-hoc `0+0` guard (162-165). Generalize the guard to all operators and tighten `sub_zero`/subtraction so answers/operands don't collapse to 0 unintentionally:
  ```diff
  // after the switch, replace the +-only guard:
  - if (num1 === 0 && num2 === 0 && operator === '+') {
  -     num1 = RandomUtils.intInRange(1, 5);
  -     num2 = RandomUtils.intInRange(1, 5);
  - }
  + // Never present a degenerate operand for any operator
  + if (operator !== '/' ) {
  +     if (num1 <= 0) num1 = RandomUtils.intInRange(1, 5);
  +     if (num2 <= 0) num2 = RandomUtils.intInRange(1, 5);
  + }
  ```
  Note `sub_zero` intentionally uses `ones = intInRange(0,10)` to create numbers like `503`; that's a full 3-digit number, not a `0` operand — leave the intent but ensure `num2 >= 1`. For `division`, operands are derived (`num1 = answer*num2`), already ≥ 1 since `answer≥1, num2≥2`.
- **Dependencies:** none (independent). Complements P0-5 for the "0+0 twice" symptom.
- **Testing:** Extend `src/engines/__tests__/ProblemFactory.test.ts`: for each type in `{addition_simple, sub_simple, multiplication, division}`, generate 500× at levels 1..5 and assert `num1>=1 && num2>=1` (except division's inherent structure) and `answer >= 0`.
- **Risk:** Slightly changes distribution at level 1 (no more `2+0`). Pedagogically fine. Low.
- **Effort:** 15 min

## P0-8 — Remove hardcoded `type: 'addition_simple'` in GameOrchestrator

- **File:** `src/components/GameOrchestrator.tsx`
- **Function:** `GameOrchestrator` — the two `mathModule.generateProblem(...)` calls (arcade branch line 91-94, node branch 109-113)
- **Change:** Drop the hardcoded `type` so `pickProblemType` chooses per level. In the arcade branch, also pass `supportedTypes: ['arithmetic']` for consistency with the bubble strategy and set `difficulty`/`estimatedLevel` from the real profile instead of the hardcoded `1`:
  ```diff
  // arcade branch
  - const adaptedProfile = { ...realCapabilities, estimatedLevel: 1 };
  - const mathProblem = mathModule.generateProblem(adaptedProfile, {
  -     difficulty: 1,
  -     type: 'addition_simple',
  - });
  + const level = Math.min(10, Math.max(1, realCapabilities.estimatedLevel ?? 1));
  + const adaptedProfile = { ...realCapabilities, estimatedLevel: level };
  + const mathProblem = mathModule.generateProblem(adaptedProfile, {
  +     difficulty: level,
  +     supportedTypes: ['arithmetic'],
  + });
  ```
  ```diff
  // node (isMathSensory) branch — keep targetLevel, drop hardcoded type
  - type: 'addition_simple',
  - ...config
  + supportedTypes: ['arithmetic'],
  + ...config
  ```
  Note: per Grounding #1, this initial problem/equation is only the **first flash** before the strategy regenerates; still correct to fix.
- **Dependencies:** P0-5 (uses the new `supportedTypes` param).
- **Testing:** vitest: mount `GameOrchestrator` in arcade mode (mock providers) and assert it renders without forcing addition; more practically, unit-covered by MathModule tests. Post-deploy e2e: over several rounds, instruction varies across operators at higher levels.
- **Risk:** At `estimatedLevel ≥ 4`, first problem may be multiplication — ensure the bubble numeric range stays poppable (products can be large; distractor scaling P1-12 helps). Low-Medium.
- **Effort:** 10 min

## P0-9 — Fix RTL scrambling of the Bubble Game instruction

- **File:** `src/components/games/BubbleGameContainer.tsx`
- **Location:** instruction `<span>` (lines 482-488)
- **Change:**
  ```diff
  - <span className={`text-lg font-bold ${theme.accent} tracking-wide font-mono leading-tight`}>
  -     {instruction}
  - </span>
  + <span
  +     dir="ltr"
  +     style={{ unicodeBidi: 'isolate' }}
  +     className={`text-lg font-bold ${theme.accent} tracking-wide font-mono leading-tight`}
  + >
  +     {instruction}
  + </span>
  ```
- **Dependencies:** none. (Will be superseded by the shared `<MathText>` component in P1-15, but ship this now — it's 5 min and P0.)
- **Testing:** vitest render assert the span has `dir="ltr"`. Post-deploy e2e visual snapshot (`e2e/screenshots/`) of instruction reading left-to-right.
- **Risk:** None. Low.
- **Effort:** 5 min

---

# PHASE 2 — P1 High-Priority Fixes

## P1-10 — Beyond-level-10 prestige state

- **File:** `src/components/games/BubbleGameContainer.tsx`
- **Functions:** `handleSessionLeveling` (level-up cap at `< 10`, lines 202, 255), header Level badge (440-443), boss defeat force-level (255-263)
- **Change:** Introduce a `prestige` concept: once `sessionLevel` would exceed 10, increment a `prestigeRef`/state instead, apply a score multiplier, and show a distinct badge (⭐→🌟×N).
  - Add `const [prestige, setPrestige] = useState(0); const prestigeRef = useRef(0);`
  - In level-up: `if (sessionLevelRef.current < 10) {...existing...} else { setPrestige(p => p+1); prestigeRef.current++; play('levelUp'); setShowLevelUp(true); logEvent('prestige_up', { prestige: prestigeRef.current }); }`
  - Apply multiplier: expose `prestige` to score by passing a `scoreMultiplier` into config/engine, OR simplest: multiply the boss bonus & show a "Prestige ⭐×N" chip. MVP = **visual + boss-bonus multiplier** (score-loop change is optional/full-vision).
  - Header: when `prestige > 0`, render `🌟 P{prestige}` next to `Lv 10`.
  - Boss force-level (255): same cap change — beyond 10 grants prestige.
- **Dependencies:** P0-2, P0-3 (players now actually reach 10).
- **Testing:** vitest on the extracted `leveling.ts` (from P0-2): `computeLevelUp` at level 10 returns `{ prestige: true }` rather than `level: 11`. Assert prestige increments and level stays 10.
- **Risk:** Score-multiplier path could unbalance high scores / arcade best-score records (`updateArcadeBestScore`). Keep MVP visual-only + boss bonus to limit blast radius. Medium.
- **Effort:** 30 min

## P1-11 — Widen anti-repeat window + broaden difficulty on exhaustion (no silent dupes)

- **File:** `src/engines/bubble/strategies/MathStrategy.ts` (and mirror in `MathModule` if desired)
- **Functions:** constants (13-14), `generateAndSetProblem` (48-75)
- **Change:**
  - `MAX_RECENT_SIGNATURES = 18;` `MAX_REGEN_ATTEMPTS = 8;`
  - On exhaustion (loop ends still colliding), **broaden** rather than accept: regenerate once at `level+1` and `level-1` ranges before giving up:
    ```diff
    do { ...generate at `level`... } while (collision && attempts < MAX);
    + if (this.recentSignatures.includes(this.problemSignature(problem))) {
    +     for (const alt of [level + 1, Math.max(1, level - 1), level + 2]) {
    +         const candidate = this.mathModule.generateProblem(
    +             { ...profile, estimatedLevel: alt },
    +             { difficulty: alt, excludeSignatures: this.recentSignatures, supportedTypes: ['arithmetic'] });
    +         if (!this.recentSignatures.includes(this.problemSignature(candidate))) { problem = candidate; break; }
    +     }
    + }
    ```
- **Dependencies:** P0-5, P0-6.
- **Testing:** vitest: generate 40 consecutive problems at a small level (e.g. level 1, where the space is tiny) and assert **no two consecutive** are identical, and duplicates within any window of 18 are rare/absent until the space is provably exhausted.
- **Risk:** Broadening at tiny levels may pull in slightly harder problems; acceptable and rare. Low.
- **Effort:** 15 min

## P1-12 — Scale distractor range to target magnitude

- **File:** `src/engines/bubble/strategies/MathStrategy.ts`
- **Function:** `generateDistractor` (122-132)
- **Change:** `const range = Math.max(5, Math.floor(safeTarget * 0.4));` (from `Math.max(10, ...)`). Keep the `value < 0` and `value === target` rejection.
- **Dependencies:** none (but pairs with P1-13).
- **Testing:** vitest: for target=3, generated distractors should cluster near 3 (all within ±~ range/2), never the wide 0-10 spread. For target=200, range scales up.
- **Risk:** Small-number levels get *tighter* (harder) distractors. That's the intent; verify not too hard for level 1. Low.
- **Effort:** 5 min

## P1-13 — Pedagogical (misconception-based) distractors

- **File:** `src/engines/bubble/strategies/MathStrategy.ts`
- **Function:** `generateDistractor` (122-132), using `this.currentProblem`
- **Change:** When `currentProblem` is arithmetic, with some probability generate a "trap" distractor derived from a common error, else fall back to the magnitude-scaled random:
  ```ts
  private generateDistractor(): number {
    const p = this.currentProblem;
    if (p && p.type === 'arithmetic' && Math.random() < 0.5) {
      const cands: number[] = [];
      const { num1, num2, operator, answer } = p as ArithmeticProblem;
      const a = Number(answer);
      cands.push(a + 1, a - 1);                          // off-by-one
      if (operator === '+') cands.push(num1 * num2);      // operation confusion
      if (operator === '*') cands.push(num1 + num2);
      if (operator === '-') cands.push(num1 + num2);
      // swapped-digit trap for 2-digit answers
      if (a >= 10 && a < 100) cands.push((a % 10) * 10 + Math.floor(a / 10));
      const pick = cands.filter(v => v !== a && v >= 0 && v <= 999);
      if (pick.length) return pick[Math.floor(Math.random() * pick.length)];
    }
    // fallback: magnitude-scaled random (P1-12)
    ...
  }
  ```
  Guard against returning duplicates of the target and de-dupe against currently-spawned distractor values is out-of-scope (engine handles collisions visually).
- **Dependencies:** P0-1 (clean `currentProblem`), P1-12 (fallback path).
- **Testing:** vitest: set an arithmetic problem `7+5=12`, call `generateDistractor` 500×, assert the set includes traps `{11,13,35}` at meaningful frequency and never equals `12`.
- **Risk:** Traps too tempting → frustration; tune the 0.5 probability. Some traps equal the answer for edge cases (e.g. `2*2` vs `2+2`) — the `v !== a` filter handles it. Low-Medium.
- **Effort:** 45 min

## P1-14 — Memory Duel card-face container RTL isolation

- **File:** `src/components/games/MemoryDuelGame.tsx`
- **Location:** card-front container (lines 209-217) + inner span already has `dir="ltr"` (225)
- **Change:** Add `dir="ltr"` and `unicode-bidi: isolate` to the **flex container** (line 209 `<div>`), not only the inner span, so Flexbox child ordering can't flip:
  ```diff
  <div
  +   dir="ltr"
  +   style={{ unicodeBidi: 'isolate' }}
      className={cn("absolute inset-0 ... flex items-center justify-center ...", ...)}
  >
  ```
  (Once `<MathText>` exists in P1-15, the inner span becomes `<MathText>{card.displayValue}</MathText>`.)
- **Dependencies:** none.
- **Testing:** `src/components/games/__tests__/MemoryDuelGame.test.tsx` (exists): add assertion that a face-up equation card renders `7 + 5` in DOM order (query text content equals `"7 + 5"` not `"5 + 7"`). Post-deploy e2e `memory-duel.spec.ts` snapshot.
- **Risk:** None functional. Low.
- **Effort:** 10 min

## P1-15 — Shared `<MathText>` component (regression guard)

- **File (new):** `src/components/common/MathText.tsx`
- **Change:**
  ```tsx
  export const MathText: React.FC<{ children: React.ReactNode; className?: string }> =
    ({ children, className }) => (
      <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className={className}>{children}</span>
    );
  ```
  Refactor consumers to use it: `BubbleGameContainer` instruction (P0-9 site), `MemoryDuelGame` inner span (P1-14 site), `LevelUpBanner`, and any arithmetic interpolation found in P1-16.
- **Dependencies:** P0-9, P1-14 (replace their inline fixes).
- **Testing:** vitest `src/components/common/__tests__/MathText.test.tsx`: renders children with `dir="ltr"` and `unicodeBidi: isolate`.
- **Risk:** Import churn only. Low.
- **Effort:** 20 min

## P1-16 — Audit all arithmetic string interpolations for RTL safety

- **Files:** codebase-wide (grep-driven)
- **Change:** Run and triage:
  ```
  grep -rnE "\{[^}]*(num1|num2|operator|answer|equation|target)[^}]*\}" src/components
  grep -rn "= \?\|=\s*\?\|+ .*=" src/components
  ```
  For each math string rendered inside a `dir="rtl"` subtree (Memory Duel, any Hebrew page), wrap in `<MathText>`. Known suspects from the report: `LevelUpBanner`, `GameOrchestrator` (its `equation` is currently unused in render — verify), practice/lesson result screens.
- **Dependencies:** P1-15 (`<MathText>` must exist).
- **Testing:** Manual grep checklist + one vitest per newly-wrapped component asserting `dir="ltr"`. Post-deploy visual e2e across screens.
- **Risk:** Missing an interpolation → latent RTL bug. Mitigate with the grep checklist committed to the PR description. Low-Medium.
- **Effort:** 15 min

---

# PHASE 3 — Creative Feature 1: Persistent Math Pet 🐾

**Concept:** Surface the invisible `capabilities.estimatedLevel` as a companion creature that grows across sessions, learns "tricks" (unlocked at level thresholds), and can be customized. This is the anchor feature — it makes long-term mastery **visible and persistent**, unlike `sessionLevel` which resets.

### 3.0 — Shared profile-field plumbing (PREREQUISITE for Phases 3-5)

- **File:** `src/types/user.ts`, `src/context/ProfileContext.tsx`
- **Change:**
  - `user.ts` add to `UserProfile`:
    ```ts
    pet?: { species: 'owl' | 'cat' | 'dragon' | 'robot'; name: string; level: number; xp: number; happiness: number; unlockedTricks: string[]; lastFedDate?: string | null; };
    gems?: number; // "Star Gems" soft currency (distinct from coins)
    ```
  - `ProfileContext.validateProfileUpdate` — add validators (mirror the `coins`/`equippedItems` patterns):
    ```ts
    if (updates.pet !== undefined) { if (isPlainObject(updates.pet)) sanitized.pet = updates.pet; else warn(); }
    if (updates.gems !== undefined) { if (typeof updates.gems==='number' && Number.isFinite(updates.gems) && updates.gems>=0) sanitized.gems = updates.gems; else warn(); }
    ```
  - Migration `map()` (lines 203-218): add `pet: p.pet ?? null, gems: p.gems ?? 0,`.
  - Add context helpers: `addGems(n)`, `updatePet(partial)` mirroring `addCoins`/`updateProfile`, wired into the `value` useMemo.
- **Dependencies:** none — **must be first** in Phase 3.
- **Testing:** extend `src/__tests__/ProfileContext.test.tsx`: `updatePet` persists and survives a reload (re-parse localStorage); unknown pet keys are still stored (pet is a blob) but `gems` rejects negatives/NaN.
- **Risk:** Forgetting the allow-list = silent data loss (Grounding #7). Test explicitly. Low if tested.
- **Effort:** 40 min

### 3.1 — Pet data model + growth engine

- **File (new):** `src/engines/pet/petEngine.ts`
- **Change:** Pure functions:
  ```ts
  export const PET_SPECIES = { owl:{emoji:'🦉',evolves:['🐣','🦉','🦅']}, cat:{...}, dragon:{...}, robot:{...} };
  export const TRICKS = [{ id:'streak_boost', unlockLevel:3, ... }, { id:'hint', unlockLevel:5 }, ...];
  export function petXpForCorrect(isCorrect: boolean, combo: number): number
  export function applySessionToPet(pet, session): { pet, leveledUp: boolean, newTricks: string[] }
  export function petStageEmoji(pet): string   // evolves by level band
  ```
  Pet `level` mirrors/derives from `capabilities.estimatedLevel` OR accumulates its own xp from sessions — **MVP: derive stage from `estimatedLevel`** (no new xp economy), so it's always in sync and needs no extra writes.
- **Dependencies:** 3.0.
- **Testing:** vitest `src/engines/pet/__tests__/petEngine.test.ts`: level thresholds unlock the right tricks; `petStageEmoji` evolves at the correct bands; XP is monotonic.
- **Risk:** Two sources of truth (estimatedLevel vs pet.level) can desync. MVP derives from estimatedLevel to avoid this. Low.
- **Effort:** 45 min

### 3.2 — Pet UI components

- **Files (new):** `src/components/pet/PetCompanion.tsx` (small on-map avatar + speech bubble), `src/components/pet/PetScreen.tsx` (full pet page: stage, tricks, feed with gems, rename)
- **Integration points:**
  - Saga map / home screen: mount `<PetCompanion />` (reads `useProfile().profile.capabilities.estimatedLevel`).
  - Add a nav entry to open `<PetScreen />` (wherever badges/shop are reached — find the home hub component).
  - On session complete (`recordSession` sites in `BubbleGameContainer` line 349-356 and `MemoryDuelGame` line 62-69), award gems and, if `estimatedLevel` crossed a band, trigger a pet "evolve" celebration.
- **State management:** Read via `useProfile()`. Writes via new `addGems`/`updatePet`. Ephemeral animation state local to components. No new context needed (ProfileContext is the store).
- **Dependencies:** 3.0, 3.1.
- **Testing:** vitest render `PetScreen` with a mocked profile at `estimatedLevel: 5` → asserts owl shows evolved stage + `hint` trick unlocked. Post-deploy e2e: new `e2e/pet.spec.ts` opens pet screen, asserts stage renders.
- **Risk:** Finding the right home-hub mount point (not in the files read) — small discovery task. Low-Medium.
- **Effort:** 60 min

### 3.3 — Gems reward hook

- **Files:** `BubbleGameContainer.tsx` (victory effect ~345-373), `MemoryDuelGame.tsx` (complete effect ~60-72)
- **Change:** On victory, `addGems(Math.round(correct * multiplier))`; feed action in `PetScreen` calls `spendGems`/`updatePet({ happiness })`.
- **Dependencies:** 3.0.
- **Testing:** vitest: simulate a victory → `addGems` called with expected amount.
- **Risk:** Double-award on re-render — guard with a `hasAwardedRef`. Low.
- **Effort:** 20 min

**MVP scope:** derive pet stage from `estimatedLevel`, 1 species (owl, reuse `MASCOT_EMOJI`), on-map companion + simple pet screen, gems earned on victory, evolution celebration.
**Full vision:** 4 species with independent XP, feedable happiness decay (`lastFedDate`), tricks that actually affect gameplay (streak_boost, hint), pet skins bought with gems, pet reacts during play (owl attacks on 5× combo — ties into Phase 4/5).

---

# PHASE 4 — Creative Feature 2: Boss Knowledge Gates 🛡️

**Concept:** Replace the boss's "pop the same answer 3×" (dumb HP bar) with **escalating related problems** — a mini final-exam for the operator just practiced (`2+2` → `2+2+2` → `2×3`). Reuses existing `bossHealth`/`bossMaxHealth` rendering with near-zero new UI.

### 4.1 — Boss problem sequence model

- **File (new):** `src/engines/bubble/bossGates.ts`
- **Change:** Given the current problem/operator and level, produce an ordered list of `bossMaxHealth` sub-problems whose difficulty escalates but stays thematically linked:
  ```ts
  export interface BossStage { instruction: string; answer: number; }
  export function buildBossGate(baseProblem: ArithmeticProblem, level: number): BossStage[]
  // e.g. base 2+2 → [{'2 + 2 = ?',4},{'2 + 2 + 2 = ?',6},{'2 × 3 = ?',6}]
  ```
- **Dependencies:** P0-1, P0-5 (clean arithmetic problem ownership).
- **Testing:** vitest `src/engines/bubble/__tests__/bossGates.test.ts`: stages escalate, all answers are positive integers, count === maxHealth, thematically linked to the base operator.
- **Risk:** Generating a coherent sequence for every operator (esp. division) is fiddly. MVP: support `+`/`-`/`×`; for others fall back to "same answer 3×" (current behavior). Medium.
- **Effort:** 45 min

### 4.2 — Wire boss stages into the engine

- **Files:** `src/engines/bubble/useGameEngine.ts` (`spawnBoss` 92-122, boss handling in `handlePop` 429-510), `src/engines/bubble/types.ts` (`BubbleEntity`)
- **Change:**
  - Extend `BubbleEntity` with `bossStages?: BossStage[]; bossStageIndex?: number;`.
  - `spawnBoss`: build stages via `buildBossGate`, set `bossHealth = stages.length`, `bossMaxHealth = stages.length`, `bossStageIndex = 0`, and set the boss's **current expected answer** from `stages[0].answer` (the boss's `internalValue`), and expose the current instruction.
  - Boss `handlePop`: on correct pop, advance `bossStageIndex`, update `internalValue` to next stage's answer, decrement health. The **displayed boss instruction** must update — surface via a new returned value / ref (`bossInstructionRef`) that `BubbleGameContainer` renders in the BOSS banner.
  - The normal spawn must produce distractors that include the **current stage's answer among decoys** so there's something to pop. Today normal bubbles use `behavior.generateNext` (target = main problem answer). For the boss we need bubbles whose values include `stages[idx].answer`. MVP approach: while boss active, spawn a mix where the correct bubble carries `internalValue === stages[idx].answer` (validated against the boss, not the main problem).
- **Dependencies:** 4.1.
- **State management:** Boss stage index lives in the boss entity + a ref for the displayed instruction. `BubbleGameContainer` reads it to render the current gate question in the existing BOSS banner (395-397 "Pop the correct answer 3 times!" → dynamic instruction).
- **Testing:** vitest on `useGameEngine` (renderHook): spawn boss, simulate correct pops through all stages, assert health decrements per stage, instruction advances, and `bossDefeated` fires only after the last stage. Assert wrong answer strikes without advancing.
- **Risk:** This is the most invasive engine change — `handlePop`'s boss branch and the spawn/validate loop are tightly coupled to the single-target model. Must ensure distractor spawns actually surface the stage answer or the gate is unwinnable. Test thoroughly. **High.**
- **Effort:** 90 min

### 4.3 — Boss banner shows the live gate question

- **File:** `src/components/games/BubbleGameContainer.tsx` (BOSS banner 383-398)
- **Change:** Replace static "Pop the correct answer 3 times!" with the current stage instruction (via `<MathText>`), plus a "Stage 2/3" indicator from `bossStageIndex`.
- **Dependencies:** 4.2, P1-15 (`<MathText>`).
- **Testing:** vitest render with a mocked boss-on-screen state asserts the gate instruction shows LTR.
- **Risk:** Low (UI only).
- **Effort:** 20 min

**MVP scope:** `+`/`-`/`×` gates, 3 escalating stages reusing existing HP bar + banner, dynamic instruction, `boss_gate_completed` analytics.
**Full vision:** division gates, per-stage timer pressure, pet "assist attack" that clears one distractor wave on a 5× combo (Phase 3 tie-in), boss-specific reward gems.

---

# PHASE 5 — Creative Feature 3: Combo Fusion + New Power-Ups ⚡

**Concept:** Two complementary additions. (A) **Combo Fusion** — occasionally present two related equations at once and reward popping both answers within a time window. (B) **New elemental power-ups** — Lightning Chain ⚡ (pop all bubbles matching the target answer) and Rainbow Magnet 🌈 (pull target bubbles toward center). Both extend systems that already exist (`useGameEngine` spawn/validate; the `PowerUpType` union + `activatePowerUp`).

### 5.1 — New power-up types (lower risk, do first)

- **Files:** `src/engines/bubble/types.ts` (`PowerUpType`), `src/engines/bubble/useGameEngine.ts` (`POWER_UP_TYPES`, `POWER_UP_EMOJI`, `POWER_UP_DURATIONS`, `activatePowerUp` 316-358), `src/components/games/BubbleGameContainer.tsx` (`POWER_UP_LABELS` 31-36)
- **Change:**
  - Extend union: `'lightning_chain' | 'rainbow_magnet'`.
  - Emoji/labels/durations entries (both instant: duration 0, like `pop_distractors`).
  - `activatePowerUp`:
    - `lightning_chain`: instant — mark **all non-popped target bubbles** (`behavior.validate(e) === true`) as popped and award score per bubble (reuse the pop-scoring path or grant flat bonus + `targetsPopped += n`). Careful: awarding `targetsPopped` can trigger win — that's fine/fun.
    - `rainbow_magnet`: timed (~3s) — set a flag that the render/motion layer uses to ease target bubbles' `x` toward 50. MVP simpler: instantly set target bubbles' `x = 50 ± small` and slow them, so they're trivially poppable. (Full motion is a `Bubble` component change.)
  - Add both to `POWER_UP_LABELS` for the toast.
- **Dependencies:** none (extends existing power-up plumbing).
- **Testing:** vitest (renderHook on `useGameEngine`): seed entities with 3 targets + 4 distractors; activate `lightning_chain` → all targets become `isPopped`, distractors untouched, score/targetsPopped increased by 3. `rainbow_magnet` → targets' `x` clustered near 50.
- **Risk:** `lightning_chain` triggering victory mid-frame is fine but verify no double-scoring vs the normal pop path. `rainbow_magnet` full-motion needs `Bubble.tsx` changes (out of MVP). Low-Medium.
- **Effort:** 60 min

### 5.2 — Combo Fusion mode (dual-equation challenge)

- **Files:** `src/engines/bubble/strategies/MathStrategy.ts` (dual-target support), `src/engines/bubble/useGameEngine.ts` (validate/scoring for two live targets + fusion window), `src/components/games/BubbleGameContainer.tsx` (render two instructions + fusion timer), `src/lib/arcadeModes.ts` (new `'fusion'` mode) + `types.ts` `ArcadeMode` union
- **Change (data + strategy):**
  - `MathStrategy` gains a **secondary problem**: `currentProblemB`, `targetValueB`. `generateNext` alternates producing target-A, target-B, and distractors. `validate` returns which target (or use a richer return). `getInstruction` returns both (`getInstructions(): [string, string]`).
  - Engine tracks a **fusion window**: popping target-A starts a ~4s timer; popping target-B within it grants a big fusion bonus + VFX. Missing the window = normal scoring.
  - `BubbleGameContainer` renders two `<MathText>` instruction chips and a fusion progress indicator; on fusion success, show a "FUSION!" banner (reuse `FrenzyOverlay` pattern).
  - `arcadeModes.ts`: add `case 'fusion'` config; add `'fusion'` to `ArcadeMode` and `ARCADE_MODE_LABELS`.
- **State management:** Two targets live in the strategy instance; fusion timing state in `useGameEngine` refs (like the power-up expiry pattern). Container reads via new engine return fields.
- **Dependencies:** P0-1, P0-5 (single-target ownership must be clean first), 5.1 optional (shares VFX). This is the **largest** new-surface change.
- **Testing:** vitest: strategy produces both targets over N spawns; engine grants fusion bonus only when B popped within window of A; expired window falls back to normal scoring. Renderhook timing test using fake timers.
- **Risk:** The engine's `handlePop`/`validate` and `generateNext` assume a **single** `targetValue`. Adding a second target touches the hottest paths (spawn, validate, boss, power-ups all read the single target). High regression risk — gate behind the `'fusion'` mode so default modes are untouched. **High.**
- **Effort:** 120 min

### 5.3 — Mode selection + entry

- **Files:** wherever arcade modes are listed (grep `ARCADE_MODE_LABELS` consumers / mode picker), `GameOrchestrator` routing
- **Change:** Add Fusion (and surface new power-ups automatically since they spawn in all modes). Add a Fusion tile to the mode picker.
- **Dependencies:** 5.2.
- **Testing:** Post-deploy e2e: select Fusion, assert two instruction chips render.
- **Risk:** Low (wiring).
- **Effort:** 20 min

**MVP scope:** 5.1 both power-ups (rainbow_magnet as instant-cluster, not full motion) + 5.2 Fusion as a dedicated opt-in mode with 2 targets and a fusion bonus window.
**Full vision:** rainbow_magnet real magnetic motion in `Bubble.tsx`; lightning_chain visual chain arc VFX; Fusion with 3-equation chains and pet-assisted fusions; fusion streak multipliers feeding prestige (P1-10).

---

# Consolidated Schedule & Effort

| Phase | Items | Est. |
|---|---|---|
| **P0** | 1–9 | ~2h 10m |
| **P1** | 10–16 | ~2h 30m |
| **Phase 3 (Pet)** | 3.0–3.3 | ~2h 45m |
| **Phase 4 (Boss Gates)** | 4.1–4.3 | ~2h 35m |
| **Phase 5 (Fusion+Power-ups)** | 5.1–5.3 | ~3h 20m |

**Recommended execution order:** All P0 (chain 1→3→5→6, then 2, 4, 8, 9) → write vitest suites for engine/strategy/leveling (new coverage, catches regressions for everything after) → P1 → Phase 3 (isolated, low engine risk, high UX payoff) → Phase 4 → Phase 5.

# Cross-Cutting Testing Strategy

- **New vitest files to create** (none exist today for these):
  - `src/engines/__tests__/MathModule.test.ts` (P0-5)
  - `src/engines/bubble/__tests__/MathStrategy.test.ts` (P0-1, P0-6, P1-11/12/13)
  - `src/engines/bubble/__tests__/leveling.test.ts` (P0-2, P1-10)
  - `src/engines/bubble/__tests__/bossGates.test.ts` (Phase 4)
  - `src/engines/pet/__tests__/petEngine.test.ts` (Phase 3)
  - `src/components/common/__tests__/MathText.test.tsx` (P1-15)
  - Extend: `src/engines/__tests__/ProblemFactory.test.ts` (P0-7), `src/__tests__/ProfileContext.test.ts` (3.0), `src/components/games/__tests__/MemoryDuelGame.test.tsx` (P1-14).
- **Refactor-for-testability:** extract `leveling.ts` (thresholds/decisions) and keep engine changes behind pure helpers (`bossGates.ts`, `petEngine.ts`) so hot-path logic is unit-testable without React/rAF.
- **Playwright:** runs against the **deployed** site — schedule an e2e regression pass **after each deploy**, not as a local gate. Add `e2e/pet.spec.ts` and a Fusion spec; update `bubble-game.spec.ts` for the new target_count=20 and LTR instruction snapshot.
- **Global risk watch:** `useGameEngine.handlePop` and the spawn/validate loop are shared by normal/boss/power-up/fusion paths — every Phase 4/5 change must re-run the full engine vitest suite. Gate Fusion behind its own mode so default arcade play is never destabilized.
