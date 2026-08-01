# Next Features Review — Claude's Senior Architect Assessment

> **Date:** 2026-07-31  
> **Reviewer:** Claude (senior engineer, council counsel)  
> **Scope:** Post-Phase 3 creative feature plan for Hebrew Math Adventures  
> **Principles:** Ruthless scope discipline. Kid attention spans > feature count. Performance on a Pi serving mobile-first web. Every proposal must justify its existence.

---

## Architecture Assessment: Where We Actually Stand

After reading every key file in the codebase, here's my honest read:

**What's solid:**
- The `GameDirector → MathModule → ProblemFactory` pipeline is well-separated and extensible. Adding new problem types is straightforward.
- The bubble game engine (`useGameEngine.ts`) is a clean rAF loop with proper ref-based state syncing. Power-ups, bosses, and session-internal leveling all work.
- `MathBehaviorStrategy` now has anti-repeat guards and mid-session problem regeneration — the two critical bugs from the council review are fixed.
- Session-internal leveling in `BubbleGameContainer` (accelerating thresholds, problem rotation every 3 correct, adaptive distractor ratio) is well-tuned.
- Audio synth is clean — no asset dependencies, proper cleanup.

**What's blocking us:**
1. **`GameOrchestrator` still uses a dummy profile** (`INITIAL_CAPABILITY_PROFILE`) for problem generation in sensory mode. The real profile's capabilities never feed into the bubble game's problem generation. This means the adaptive engine is blind during arcade play.
2. **`completeNode` hardcodes 3 stars** everywhere. No performance-based star rating. Kids get max rewards for minimal effort.
3. **Only 1 lesson exists** (`lesson1_multiplication.ts`). Four `LESSON` nodes in the curriculum map to nothing.
4. **`WorldMap.tsx` / `MapZone.tsx` / `worldConfig.ts` are dead code.** They clutter the repo and confuse navigation.
5. **Word problems have 2 templates.** Two. "Dan has apples" and "candies subtraction." That's it.
6. **No haptic feedback anywhere.** Mobile-first app for kids and we're not using `navigator.vibrate()`.
7. **`currentFocus` key mismatch persists.** `INITIAL_CAPABILITY_PROFILE.currentFocus` is `'addition_sum_5'` but `SKILL_KEY_MAP` maps `'addition_simple' → 'addition'`. The skill tracking accumulates stats under a key that doesn't match what the director looks up.
7. **No haptic feedback anywhere.** Mobile-first app for kids and we're not using `navigator.vibrate()`.
8. **No daily engagement loop.** Nothing brings kids back the next day. No streaks-with-teeth, no daily challenge, no "come back tomorrow" hook.

---

## The 6 Proposals

### 1. 🔥 Daily Challenge + Streak Rewards

**What:** A special curated bubble game configuration that changes once per day. "Today's Challenge: Multiplication only, 60 seconds, target 15." Kids earn a stamp for completing it. 7 stamps = a theme unlock or mascot accessory. The streak counter that already exists in `ProfileContext` gets teeth — consecutive days multiply the stamp reward.

**Why it matters:** This is the single highest-impact feature for kid retention. The current app has no reason for a kid to come back tomorrow. The saga map is finite (50 nodes). Once done, it's done. A daily challenge creates an infinite content loop with zero new content creation — it's just configuration. The stamp/sticker album is a proven engagement mechanic in kids' apps (see: Duolingo for Kids, Khan Academy Kids).

**Scope:** M  
**Files touched:**
- `src/data/dailyChallenges.ts` (new — challenge generator config)
- `src/components/map/SagaMap.tsx` (add Daily Challenge banner button)
- `src/components/sensory/BubbleGame.tsx` (accept daily challenge config)
- `src/context/ProfileContext.tsx` (add `dailyStamps` array, `lastDailyDate`)
- `src/components/daily/DailyChallengeComplete.tsx` (new — stamp reward animation)

---

### 2. 🏆 Achievement Badge System

**What:** A lightweight badge system with 10-15 unlockable badges: "First 10-correct streak", "Beat a boss", "Perfect session (no mistakes)", "Played 3 days in a row", "Popped 100 bubbles total", "Solved a problem in under 2 seconds". Badges show on the saga map header and in the parent dashboard. No complex achievement engine — just a `BadgeChecker` that runs after each session.

**Why it matters:** Kids love collections. Badges are cheap to build (no new game modes, no new content) but give existing gameplay new meaning. A kid who's bored of the bubble game will play one more round "to get the 50-bubble badge." This is pure engagement leverage from existing mechanics.

**Scope:** S-M  
**Files touched:**
- `src/data/badges.ts` (new — badge definitions + check functions)
- `src/context/ProfileContext.tsx` (add `unlockedBadges: string[]` to profile)
- `src/components/map/SagaMap.tsx` (badge display in header)
- `src/components/parent/ParentDashboard.tsx` (badge display per child)
- `src/components/badges/BadgePopup.tsx` (new — unlock animation)

---

### 3. 🎯 Fix the Dummy Profile + Star Rating (Technical Debt that BLOCKS everything)

**What:** Two critical fixes rolled into one:  
(a) Pass the real `profile.capabilities` into `GameOrchestrator`'s problem generation for sensory mode, so the adaptive engine actually sees the kid's skill history.  
(b) Replace hardcoded `completeNode(node.id, 3)` with performance-based star calculation: 3 stars = ≤1 mistake, 2 stars = 2-3 mistakes, 1 star = completed with 4+ mistakes. Both `GameOrchestrator` and `PracticeMode` need to pass accuracy data up.

**Why it matters:** The dummy profile bug means the adaptive difficulty engine is completely blind during arcade/sensory play. A kid who's mastered addition to 100 still gets "2 + 2" in the bubble game because the profile is always reset. This is not a "nice to have" — it's a fundamental broken pipe in the adaptive system. The star rating fix is the foundation for any future progression gating (e.g., "need 2 stars to unlock the next unit"). Without it, stars are meaningless.

**Scope:** S  
**Files touched:**
- `src/components/GameOrchestrator.tsx` (use real profile, compute stars)
- `src/components/PracticeMode.tsx` (pass accuracy to onComplete)
- `src/components/sensory/BubbleGame.tsx` (pass accuracy to onComplete)
- `src/engines/GameDirector.ts` (fix `currentFocus` default to `'addition'`)

---

### 4. 🧮 Number Bond Puzzle Mode (New Game Mode)

**What:** A new sensory-style mini-game where kids see a number (e.g., 10) and must pop pairs of bubbles that add up to it. One bubble has "6", another has "4" — pop both in sequence to score. This teaches number bonds (the foundation of mental math) in a way that's visually satisfying and distinct from the current "solve equation, find answer" loop.

**Why it matters:** The current bubble game has one mechanic: see equation, pop correct number. Number bonds are a fundamentally different cognitive task — recognizing that numbers can be decomposed into pairs. It's a core curriculum skill for ages 5-7 that the app currently doesn't address. And it reuses the entire bubble engine infrastructure — new behavior strategy, same rendering, same physics, same power-ups.

**Scope:** M  
**Files touched:**
- `src/engines/bubble/strategies/NumberBondStrategy.ts` (new — implements `IGameBehavior`)
- `src/engines/bubble/types.ts` (add `'number_bond'` to ArcadeMode)
- `src/lib/arcadeModes.ts` (add number bond config)
- `src/components/sensory/BubbleGame.tsx` (accept bond strategy)
- `src/components/map/SagaMap.tsx` (add to arcade mode selector)

---

### 5. 📊 Parent Analytics Dashboard (Real Data, Not Just Stats)

**What:** Transform the parent dashboard from a simple profile list into a meaningful analytics view. Show: accuracy per operation type (addition: 92%, subtraction: 64%), total time played this week, weakest skill (with a "practice this" button that launches a targeted session), and a simple weekly bar chart of correct answers. Data is all already in `profile.capabilities.skills` — it's just not being displayed.

**Why it matters:** Parents are the gatekeepers. If a parent can see that their kid is struggling with subtraction, they'll direct the kid to practice it. Currently, the parent dashboard shows name/age/mascot/streak — zero actionable insight. This is the feature that makes parents tell other parents about the app. And the data already exists — it's pure presentation work.

**Scope:** M  
**Files touched:**
- `src/components/parent/ParentDashboard.tsx` (major rewrite of display section)
- `src/components/parent/SkillBreakdown.tsx` (new — per-skill accuracy bars)
- `src/components/parent/WeeklyChart.tsx` (new — simple SVG bar chart, no library)
- `src/types/progress.ts` (add `weeklyHistory` to skill stats or separate tracking)

---

### 6. 🪐 End-of-Unit Boss Battle Cinematic

**What:** When a kid completes the final node of a unit (the boss node), instead of just showing the session summary, play a 5-second cinematic: the unit's mascot charges the boss, the boss shatters into stars, and the next unit's map "rises" into view. This is a one-time-per-unit animation that makes progression feel epic.

**Why it matters:** The current progression is: complete node → session summary → back to map → next node. There's zero emotional payoff for finishing a unit. Kids' apps live on emotional peaks. A 5-second Framer Motion animation costs nothing in runtime (it's CSS transforms + opacity) but creates a "did you SEE that?!" moment that kids will replay for their friends. This is the cheapest delight-per-dollar feature in this list.

**Scope:** S  
**Files touched:**
- `src/components/cinematic/UnitCompleteCinematic.tsx` (new — animation overlay)
- `src/components/GameOrchestrator.tsx` (trigger cinematic on boss node completion)
- `src/components/map/SagaMap.tsx` (auto-scroll to next unit after cinematic)

---

## Ranking: Impact-to-Effort Ratio

| Rank | Feature | Impact | Effort | Ratio |
|:---:|:---|:---:|:---:|:---:|
| **1** | Fix Dummy Profile + Star Rating | 🔴 Critical | S | **10/10** |
| **2** | Daily Challenge + Stamps | 🟠 High | M | **8/10** |
| **3** | End-of-Unit Boss Cinematic | 🟡 Medium | S | **7/10** |
| **4** | Achievement Badges | 🟠 High | S-M | **7/10** |
| **5** | Parent Analytics Dashboard | 🟡 Medium | M | **6/10** |
| **6** | Number Bond Puzzle Mode | 🟢 Low-Med | M | **5/10** |

---

## Recommended Execution Order

### Sprint 1: "Fix the pipes, then make it shine"
1. **Fix Dummy Profile + Star Rating** — 2-3 hours. This is a prerequisite for everything else. Badges need real stars. Daily challenges need real difficulty adaptation. The adaptive engine needs real data.
2. **End-of-Unit Boss Cinematic** — 2-3 hours. Quick, high delight. Immediately makes the existing 50-node saga map feel more rewarding.

### Sprint 2: "Bring them back tomorrow"
3. **Daily Challenge + Stamps** — 1 day. The retention loop. Depends on the star rating fix for difficulty calibration.
4. **Achievement Badges** — 0.5 day. Layer on top of existing sessions. Depends on the star rating fix for "perfect session" badges.

### Sprint 3: "Make parents the advocates"
5. **Parent Analytics Dashboard** — 1 day. The data exists. This is pure UI work. Ship it and parents will care.
6. **Number Bond Puzzle Mode** — 1 day. New game mode that reuses infrastructure. Lower priority because the existing modes are solid — this is variety, not gap-filling.

---

## What I'm explicitly NOT recommending (and why)

- **Leaderboards / multiplayer:** localStorage-only app. No backend. Leaderboards require a server. Skip until cloud sync exists.
- **Cloud sync / backup:** Important but it's infrastructure, not a feature. It's a separate sprint. Don't mix it with feature work.
- **More lessons (division, subtraction):** Important pedagogically but it's content authoring, not engineering. Each lesson is 1-2 hours of content design + 1 hour of code. Do it, but not in this plan.
- **New problem types (fractions, geometry, money, time):** The `ProblemFactory` architecture supports adding these, but each is a separate factory + UI view + hint system. Too much scope for now. The existing 5 problem types cover ages 5-11 adequately.
- **Haptic feedback:** Easy to add (`navigator.vibrate(50)` on correct, `navigator.vibrate([30,50,30])` on wrong) but iOS Safari doesn't support it. Worth a 15-minute addition during Sprint 1, but not a standalone feature.
- **Printable worksheets:** Offline concern. Different medium. Skip.
- **Split-screen 2-player mode:** UI complexity on mobile. Skip.

---

## Technical Notes for Implementation

### Fix Dummy Profile — the actual fix
```typescript
// In GameOrchestrator.tsx, sensory mode block:
// BEFORE:
const dummyProfile = { ...INITIAL_CAPABILITY_PROFILE, estimatedLevel: targetLevel };

// AFTER:
const realProfile = profile?.capabilities || INITIAL_CAPABILITY_PROFILE;
const adaptedProfile = { ...realProfile, estimatedLevel: targetLevel };
```
And import `useProfile` in `GameOrchestrator`. One-line fix, massive impact.

### Star Rating — the actual formula
```typescript
function computeStars(correct: number, attempts: number): number {
    if (attempts === 0) return 0;
    const mistakes = attempts - correct;
    if (mistakes <= 1) return 3;
    if (mistakes <= 3) return 2;
    return 1;
}
```

### Daily Challenge — the seed trick
```typescript
// Deterministic daily config from date seed — no backend needed
const today = new Date().toISOString().slice(0, 10); // "2026-07-31"
const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
const modes = ['zen', 'classic', 'blitz', 'survival'] as const;
const problemTypes = ['addition_simple', 'sub_simple', 'multiplication', 'series', 'compare'];
const dailyMode = modes[seed % modes.length];
const dailyType = problemTypes[seed % problemTypes.length];
const dailyTarget = 10 + (seed % 10); // 10-19
```
This gives a unique-but-deterministic challenge per day. Every kid in Israel gets the same challenge. Future leaderboard-ready.

---

## Council Sign-off

This plan is opinionated and scoped for a Raspberry Pi serving a mobile-first PWA. No bloat. No features that require a backend. Every proposal either fixes a broken pipe, adds a retention loop, or creates an emotional peak. 

**The #1 priority is fixing the dummy profile.** Everything else is built on that foundation. Do it first. Do it today.

— Claude, Senior Architect