# 🎮 Arcade Games Council Report
## Senior Game Designer Review — Hebrew Math Adventures

**Date:** 2026-07-31  
**Reviewers:** Claude (Claude Code) & Gemini (agy)  
**Synthesized by:** AmosBot Council Coordinator

---

## Executive Summary

Both reviewers identified **critical P0 issues** with progression and question duplication that are actively harming player experience. The root causes overlap but each reviewer found distinct angles. There is strong consensus on the top priorities and several creative feature ideas that complement each other.

---

## 🔴 Issue 1: Progression Too Slow (P0 — UNANIMOUS)

### Symptom
Player scored 25 correct answers in a row without leveling up. Fast players get bored.

### Root Causes (Consensus)

| # | Root Cause | File & Location | Discovered By |
|---|-----------|----------------|---------------|
| 1a | **Strict consecutive streak resets on distractor misclicks** — `consecutiveCorrectRef.current` resets to 0 on ANY wrong tap, including accidental distractor clicks. A player can pop 25 correct targets but if they tap 1 distractor every 3-4 pops, they never level up. | `BubbleGameContainer.tsx:175-215` | Both |
| 1b | **Session level always starts at 1** — `useState(1)` hardcoded, ignores `profile.estimatedLevel`. Every retry/new round resets progress. | `BubbleGameContainer.tsx:67-90` | Both |
| 1c | **Classic mode ends too fast** — win condition is `target_count: 10`, but leveling requires 5+5=10 consecutive correct just to reach level 3. The game ends before difficulty ramps. | `arcadeModes.ts:41-46` + `BubbleGameContainer.tsx:51` | Claude |
| 1d | **Level caps at 10 with no prestige** — players who reach level 10 hit a flat wall with no feedback or further progression. | `BubbleGameContainer.tsx:202` | Claude |
| 1e | **Static problem prop locking** — `BubbleGame.tsx:66-68` calls `behavior.setProblem(problem)` in useEffect, overwriting `regenerateProblem()` calls on re-renders. | `BubbleGame.tsx:66-68` | Gemini |

### Agreed Action Plan

1. **Track cumulative correct per level, not consecutive streak** — Change `handleSessionLeveling` to count total correct pops per level (with optional streak bonus), so a single distractor tap doesn't wipe progress. *(P0, `BubbleGameContainer.tsx`)*
2. **Seed `sessionLevel` from `profile.estimatedLevel`** — Pass profile into container, initialize `useState(targetLevel || profile?.estimatedLevel || 1)`. *(P0, `BubbleGame.tsx` + `BubbleGameContainer.tsx`)*
3. **Raise Classic mode `target_count` or decouple win from level** — Either increase to 20-30 targets, or let level continue climbing for score multipliers even near the end. *(P0, `arcadeModes.ts`)*
4. **Add beyond-level-10 prestige state** — Visual badge + score multiplier so maxed players feel forward motion. *(P1, `BubbleGameContainer.tsx`)*
5. **Remove `behavior.setProblem(problem)` useEffect** in `BubbleGame.tsx` so `regenerateProblem()` can freely advance problems. *(P0, `BubbleGame.tsx`)*

---

## 🔴 Issue 2: Duplicate Questions — 0+0=? Twice in a Row (P0 — UNANIMOUS)

### Symptom
Player got `0+0=?` twice in a row. Poor question diversity overall.

### Root Causes (Consensus)

| # | Root Cause | File & Location | Discovered By |
|---|-----------|----------------|---------------|
| 2a | **Fallback problem substitution bug** — `MathModule.pickProblemType` can select `comparison`/`series` types, but `MathBehaviorStrategy` only supports `arithmetic`/`sensory`. When unsupported types are generated, it silently substitutes the same `FALLBACK_PROBLEM` (`1+1=2`) every time. | `MathModule.ts:104-118` + `MathStrategy.ts:22-30, 94-96` | Claude |
| 2b | **Anti-repeat tracks wrong signature** — `pushSignature` tracks the *discarded* comparison/series problem's signature, not the fallback that's actually displayed. So "1+1=?" never registers as recently seen. | `MathStrategy.ts:74` | Claude |
| 2c | **Zero-operand boundary cases** — When level/max params evaluate near zero, operands can collapse to `0+0`. Partial patch exists for `+` but not other operators. | `ProblemFactory.ts:65-81, 162-165` | Both |
| 2d | **`MAX_REGEN_ATTEMPTS = 5` gives up and accepts duplicates** — Best-effort retry with no hard guarantee. | `MathStrategy.ts:14` | Claude |
| 2e | **`BubbleGame.tsx` useEffect bypasses signature tracking** — `behavior.setProblem(problem)` bypasses `initializeLevel`'s no-op guard and signature tracking entirely. | `BubbleGame.tsx:65-68` | Claude |
| 2f | **Anti-repeat memory clears on unmount** — `recentSignatures` is instance-bound; strategy reinstantiation loses history. | `MathStrategy.ts:12-13` | Gemini |

### Agreed Action Plan

1. **Filter problem types at generation time** — Pass `supportedTypes: ['arithmetic', 'sensory']` to `MathModule.generateProblem()` so it never generates unsupported types. Eliminates the fallback substitution entirely. *(P0, `MathModule.ts` + `MathStrategy.ts`)*
2. **Track displayed (not generated) signatures** — Push the signature of the *actual problem shown to the player*, including fallbacks. *(P0, `MathStrategy.ts:74`)*
3. **Enforce strict positive minimum bounds** — `num1 = RandomUtils.intInRange(1, ...)` and `num2 = RandomUtils.intInRange(1, ...)` for all arithmetic types, not just `+`. *(P0, `ProblemFactory.ts`)*
4. **Increase anti-repeat window and add hard guarantee** — Bump `MAX_RECENT_SIGNATURES` to 15-20. If all attempts exhausted, broaden the difficulty range rather than accepting a duplicate. *(P1, `MathStrategy.ts`)*
5. **Remove the `behavior.setProblem(problem)` useEffect** — Same fix as Issue 1e; lets the strategy own problem lifecycle. *(P0, `BubbleGame.tsx`)*

---

## 🟡 Issue 3: Memory Duel RTL — Math Renders RTL (P1 — CONSENSUS)

### Symptom
Math content (e.g., `7 + 5`) in Memory Duel renders RTL, appearing as `5 + 7` or scrambled.

### Root Causes

| # | Root Cause | File & Location | Discovered By |
|---|-----------|----------------|---------------|
| 3a | **Parent `dir="rtl"` leaks into card face** — The wrapper sets `dir="rtl"` and the card face flex container inherits it, flipping child ordering via CSS Flexbox RTL. | `MemoryDuelGame.tsx:123` | Both |
| 3b | **Incomplete inline isolation** — `dir="ltr"` is on the inner `<span>` but not the card face container. Unicode BiDI algorithm still reorders neutral operators. | `MemoryDuelGame.tsx:210, 225` | Both |

### Claude's Discovery: The Bug Has Moved
Claude found that Memory Duel's RTL was **already partially fixed** (commit `197710b`), but the **same bug is live in the Bubble Game instruction display**:

```tsx
// BubbleGameContainer.tsx:482-488 — NO dir override!
<span className="... font-mono ...">
    {instruction}  // "5 + 3 = ?" can render scrambled
</span>
```

### Agreed Action Plan

1. **Add `dir="ltr"` + `unicode-bidi: isolate` to Memory Duel card face container** — Not just the inner span. *(P1, `MemoryDuelGame.tsx:210`)*
2. **Fix Bubble Game instruction span** — Add `dir="ltr"` and `style={{ unicodeBidi: 'isolate' }}` to the instruction display. *(P0, `BubbleGameContainer.tsx:482-488`)*
3. **Create a shared `<MathText>` component** — Standardize LTR math rendering across all games. Prevents regression. *(P1, new component)*
4. **Audit all arithmetic string interpolations** — Check `LevelUpBanner`, `GameOrchestrator`, any debug screens. *(P1, codebase-wide grep)*

---

## 🟡 Issue 4: Question Variety is Poor (P1 — CONSENSUS)

### Symptom
Questions feel repetitive; not enough diversity in problem types.

### Root Causes (Consensus)

| # | Root Cause | File & Location | Discovered By |
|---|-----------|----------------|---------------|
| 4a | **Hardcoded `type: 'addition_simple'`** — GameOrchestrator forces all problems to basic addition, locking out subtraction, multiplication, division, comparisons, series, and word problems. | `GameOrchestrator.tsx:93, 111` | Both |
| 4b | **Predictable distractors** — Distractors are just `target ± random offset`, missing pedagogical misconceptions (operation confusion, off-by-one, swapped digits). | `MathStrategy.ts:122-133` | Both |
| 4c | **Distractor range floors at 10** — `Math.max(10, Math.floor(safeTarget * 0.4))` means small-number levels get a wide, samey distractor spread. | `MathStrategy.ts:125` | Claude |
| 4d | **Memory Duel only generates standard equations** — No missing-operand or comparison pairs. | `MemoryFactory.ts:68-88` | Gemini |

### Agreed Action Plan

1. **Remove hardcoded `type: 'addition_simple'`** from GameOrchestrator — Let `MathModule.pickProblemType` select from all unlocked types for the current level. *(P0, `GameOrchestrator.tsx`)*
2. **Implement smart pedagogical distractors** — Generate distractors based on common math errors:
   - Operation confusion: `3+4 → 12` (multiplication instead of addition)
   - Off-by-one: `7+5 → 11 or 13`
   - Swapped digits: `45+23 → 68 → 86`
   *(P1, `MathStrategy.ts:generateDistractor()`)*
3. **Scale distractor range to target magnitude** — Use `Math.max(5, Math.floor(safeTarget * 0.4))` instead of hard floor at 10. *(P1, `MathStrategy.ts:125`)*
4. **Expand Memory Duel formats** — Add missing-operand pairs (`? × 4 = 16 ↔ 4`) and comparison pairs. *(P2, `MemoryFactory.ts`)*

---

## 🎨 Creative Feature Suggestions (Both Reviewers)

### From Gemini

1. **⚡ Math Power-Up Combo System (Elemental Frenzy Bubbles)**
   - Rare special bubbles: Ice Freeze ❄️ (pauses bubbles 4s), Lightning Chain ⚡ (pops all matching answers), Rainbow Magnet 🌈 (pulls target bubbles to center).
   - *Why kids love it:* Arcade excitement + strategic thinking rewards.
   - *Note:* The app already has power-ups (freeze, double_points, pop_distractors, slow_motion). Gemini's suggestion extends this with new elemental types.

2. **🛡️ Interactive Math Boss Battles & Companion Pets**
   - Bosses with multi-segment health bars + shields requiring missing-number problems (`? + 4 = 10`).
   - Companion mascot (Wisdom Owl 🦉) launches star attacks on 5x combo.
   - *Why kids love it:* Heroic narrative + visual rewards.

3. **⭐ Daily Arcade Quests & Collectible Sticker Album**
   - Short daily mini-missions ("Pop 10 multiplication bubbles in Blitz", "Win Memory Duel in under 10 moves").
   - Rewards: Star Gems → unlock animated bubble skins (Galaxy, Jelly, Neon, Candy) + collectible Hebrew sticker album.
   - *Why kids love it:* Collection mechanics + daily retention incentive.

### From Claude

1. **🔗 "Combo Fusion" — Chain Bubbles Across Operators**
   - Show two related equations simultaneously (`3+4=?` and `2×5=?`), bonus for popping both correct answers within a time window.
   - Turns existing multi-bubble spawn into a mental-math juggling challenge.
   - *Why it works:* Small delta on `useGameEngine`'s existing spawn/validate loop, big gameplay depth increase.

2. **🛡️ Boss Bubbles as Knowledge Gate, Not Just HP Bars**
   - Boss asks escalating related problems (`2+2` → `2+2+2` → `2×3`) — a "final exam" for the operator just practiced.
   - Reuses existing `bossHealth`/`bossMaxHealth` rendering with zero new UI.
   - *Why it works:* Turns repetition into narrative mastery demonstration.

3. **🐾 Persistent "Math Pet" That Levels with `profile.estimatedLevel`**
   - Surface the invisible `estimatedLevel` progression as a companion creature that grows, learns tricks, unlocks arcade skins.
   - Gives long-term players something that persists across sessions (unlike `sessionLevel` which resets every time).
   - *Why it works:* Connects the already-built mastery tracking to visible player rewards.

### Council Synthesis: Top 3 Feature Recommendations

After cross-evaluation, the council recommends prioritizing these features:

| Priority | Feature | Rationale | Implementation Complexity |
|----------|---------|-----------|--------------------------|
| **F1** | Persistent Math Pet (Claude) + Daily Quests (Gemini) | Directly addresses the "nothing persists between sessions" problem. Daily quests give short-term goals; pet gives long-term progression. Both tap into `profile.estimatedLevel` which already exists but is invisible. | Medium — needs new profile display + quest system |
| **F2** | Boss Battles as Knowledge Gates (Claude) + Companion Pet Attacks (Gemini) | Both reviewers independently suggested evolving bosses. Claude's escalating-problem concept + Gemini's companion-assist creates a cohesive boss experience. Boss code already exists. | Low-Medium — extends existing `spawnBoss` + `bossHealth` |
| **F3** | Combo Fusion (Claude) + New Power-Up Types (Gemini) | Both suggested multi-equation interactions. Claude's dual-equation challenge + Gemini's elemental power-ups (Lightning Chain, Rainbow Magnet) create deeper bubble gameplay. Power-up system already exists. | Medium — new power-up types + spawn logic |

---

## 📋 Implementation Plan

### Phase 1: Critical Fixes (P0) — Do First

| # | Task | File(s) | Agent | Est. Effort |
|---|------|---------|-------|-------------|
| 1 | Remove `behavior.setProblem(problem)` useEffect in `BubbleGame.tsx` | `BubbleGame.tsx:65-68` | Any | 10 min |
| 2 | Change level-up to track cumulative correct per level (not consecutive streak) | `BubbleGameContainer.tsx:175-215` | Claude/aider | 30 min |
| 3 | Seed `sessionLevel` from `profile.estimatedLevel` | `BubbleGame.tsx` + `BubbleGameContainer.tsx` | Any | 15 min |
| 4 | Raise Classic mode `target_count` to 20+ | `arcadeModes.ts` | Any | 5 min |
| 5 | Pass `supportedTypes` filter to `MathModule.generateProblem()` | `MathModule.ts` + `MathStrategy.ts` | Claude | 20 min |
| 6 | Fix anti-repeat to track displayed signatures | `MathStrategy.ts:74` | Any | 10 min |
| 7 | Enforce strict positive minimum bounds for all arithmetic operands | `ProblemFactory.ts` | aider | 15 min |
| 8 | Remove hardcoded `type: 'addition_simple'` from GameOrchestrator | `GameOrchestrator.tsx` | Any | 10 min |
| 9 | Fix Bubble Game instruction `dir="ltr"` | `BubbleGameContainer.tsx:482-488` | Any | 5 min |

### Phase 2: High Priority (P1)

| # | Task | File(s) | Agent | Est. Effort |
|---|------|---------|-------|-------------|
| 10 | Add beyond-level-10 prestige state | `BubbleGameContainer.tsx` | Claude | 30 min |
| 11 | Increase anti-repeat window to 15-20, broaden difficulty on exhaustion | `MathStrategy.ts` | Any | 10 min |
| 12 | Scale distractor range to target magnitude | `MathStrategy.ts:125` | Any | 5 min |
| 13 | Implement smart pedagogical distractors | `MathStrategy.ts:generateDistractor()` | Claude | 45 min |
| 14 | Fix Memory Duel card face container `dir="ltr"` + `unicode-bidi: isolate` | `MemoryDuelGame.tsx:210` | Any | 10 min |
| 15 | Create shared `<MathText>` component | New component | Any | 20 min |
| 16 | Audit all arithmetic string interpolations for RTL safety | Codebase-wide | grep + manual | 15 min |

### Phase 3: Creative Features

| # | Task | Description | Agent | Est. Effort |
|---|------|-------------|-------|-------------|
| 17 | Persistent Math Pet | Companion creature that grows with `profile.estimatedLevel` | Multi-agent | 2-3 hours |
| 18 | Daily Arcade Quests | Short daily missions + Star Gem rewards | Multi-agent | 3-4 hours |
| 19 | Boss Knowledge Gates | Escalating problems in boss fights | Claude/aider | 1-2 hours |
| 20 | New Power-Up Types | Lightning Chain, Rainbow Magnet | Any | 2-3 hours |
| 21 | Combo Fusion Mode | Dual-equation simultaneous challenge | Claude | 2-3 hours |
| 22 | Collectible Sticker Album | Hebrew sticker collection from quest rewards | Multi-agent | 3-4 hours |

---

## 🏁 Priority Summary

| Priority | Count | Description |
|----------|-------|-------------|
| **P0** | 9 tasks | Game-breaking: progression, duplicates, hardcoded types, RTL in bubble instructions |
| **P1** | 7 tasks | High-impact: prestige, distractors, Memory Duel RTL, shared component |
| **Phase 3** | 6 features | Creative new features for engagement |

### Immediate Next Steps
1. Execute Phase 1 (P0 fixes) — can be parallelized across agents
2. Write tests for progression and anti-repeat after Phase 1
3. Execute Phase 2 (P1 fixes)
4. Plan and implement Phase 3 features in priority order

---

*Report generated by AmosBot Council Coordinator. Based on independent reviews by Claude (Claude Code) and Gemini (agy).*