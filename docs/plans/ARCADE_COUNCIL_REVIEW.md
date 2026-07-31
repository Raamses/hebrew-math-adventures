# Arcade Game Council Review

> **Date:** 2026-07-30  
> **Reviewers:** AmosBot (lead), Claude (counsel), Gemini (counsel)  
> **Trigger:** Ram played the arcade game and reported: (1) 25 correct answers with no progression, (2) "0+0=?" appeared twice in a row  

---

## Root Cause Analysis

### Issue 1: Progression Too Slow (25 correct, no level up)

**Three compounding bugs:**

**Bug A — Mastery system requires 3 distinct skills to level up, but arcade mode only trains 1.**  
`GameDirector.recordResult()` levels you up by `1 + floor(masteredSkills / 3)`. A "mastered skill" needs ≥10 attempts at ≥80% accuracy. In the bubble game, all answers are recorded under a single `currentFocus` key. 25 correct addition answers = 1 mastered skill = still level 1. You'd need 30+ correct across 3 different skill types to advance.

**Bug B — The bubble game uses a dummy profile, not the real one.**  
`GameOrchestrator.tsx` creates `{ ...INITIAL_CAPABILITY_PROFILE, estimatedLevel: targetLevel }` — a fresh empty profile every time. Even though `BubbleGameContainer` calls `Director.recordResult()` on the real profile, the problem generation never sees that updated profile. The next problem is always generated at the same level with the same empty skill history.

**Bug C — The problem never changes within a session.**  
`MathBehaviorStrategy.setProblem()` is called once at init. The equation (e.g. "2 + 2 = ?") stays fixed for the entire session. Only the bubble values change (target vs distractors). So "progression" in the arcade sense means... the equation never changes at all. The player is literally solving the same equation repeatedly until the win condition (target_count) is met.

**Bug D — `streak` is disconnected from progression.**  
`profile.streak` triggers Challenge Mode in `tuneConfig()` (multiplies `max` by 1.2), but does NOT increase `estimatedLevel`. A 25-streak player gets slightly bigger numbers but never actually levels up.

**Bug E — `currentFocus` key mismatch.**  
`INITIAL_CAPABILITY_PROFILE.currentFocus` is `'addition_sum_5'`, but `SKILL_KEY_MAP` maps `'addition_simple'` → `'addition'`. Mastery stats accumulate under a key that doesn't match the problem type system. Even if progression worked, the skill tracking would be wrong.

### Issue 2: Poor Problem Diversity ("0+0" twice in a row)

**No anti-repeat logic exists anywhere in the codebase.** Zero. No `lastProblem` ref, no history array, no "don't repeat last N problems" guard. `MathModule.generateProblem()` → `pickProblemType()` (uniform random) → factory.generate() (pure random). Two consecutive calls can produce the exact same problem.

Additionally, the bubble game generates ONE problem per session and repeats it infinitely. So "twice in a row" might actually be "the same equation for the entire session" — which is worse than we thought.

---

## The Fix Plan

### Tier 1: Critical Fixes (do first)

#### Fix 1: Anti-repeat guard in MathModule
Track the last problem signature and reject duplicates.

```typescript
// In MathModule
private lastSignature: string = '';

generateProblem(...): Problem {
    let problem: Problem;
    let attempts = 0;
    do {
        problem = this.factory.generate(level, type, config);
        attempts++;
    } while (this.signature(problem) === this.lastSignature && attempts < 5);
    this.lastSignature = this.signature(problem);
    return problem;
}

private signature(p: Problem): string {
    if (p.type === 'arithmetic') return `${p.num1}${p.operator}${p.num2}`;
    if (p.type === 'series') return `${p.sequence.join(',')}`;
    if (p.type === 'compare') return `${p.num1}vs${p.num2}`;
    return p.id;
}
```

#### Fix 2: Generate new problems mid-session in arcade mode
The bubble game must cycle through different equations, not lock onto one. Add a `generateNewProblem()` call every N correct answers (e.g. every 3-5 pops).

#### Fix 3: Streak-based progression in arcade mode
Add to `GameDirector.recordResult()`:
```typescript
// Every 5 consecutive correct, bump difficulty within session
if (skill.consecutiveCorrect > 0 && skill.consecutiveCorrect % 5 === 0) {
    newProfile.estimatedLevel = Math.min(10, newProfile.estimatedLevel + 1);
    onLevelUp?.(newProfile.estimatedLevel);
}
```

#### Fix 4: Use the real profile, not a dummy
`GameOrchestrator.tsx` should pass the actual user profile to `MathModule.generateProblem()`, not a fresh `INITIAL_CAPABILITY_PROFILE`.

#### Fix 5: Fix `currentFocus` key mapping
Either change `INITIAL_CAPABILITY_PROFILE.currentFocus` to `'addition'` (matching `SKILL_KEY_MAP`), or update the skill tracking to use the mapped key consistently.

### Tier 2: Engagement Improvements

#### 6. Session-internal difficulty scaling
The arcade mode should have its own internal difficulty that scales within a session, independent of the persistent profile level:

```
Session starts at difficulty 1
Every 5 correct → difficulty +1 (bigger numbers, new problem types)
Every 3 wrong → difficulty -1 (but not below 1)
Difficulty affects: max number, problem type variety, spawn speed, distractor ratio
```

#### 7. Problem variety within sessions
Instead of forcing `type: 'addition_simple'` for the whole session, rotate through available types based on the session difficulty level. At difficulty 1-2: addition + subtraction. At 3+: include series and comparison. At 5+: include multiplication.

#### 8. Visual progression feedback
- Level-up flash animation when difficulty increases
- Progress bar color shifts (green → yellow → orange → red as difficulty rises)
- "Level Up!" banner with the new difficulty tier
- Background/theme shift at milestones

#### 9. Adaptive difficulty (detect fast vs slow players)
Track answer time. If avg answer time < 2s, accelerate difficulty. If > 8s, slow down. This naturally adapts to both fast and struggling players.

#### 10. Combo rewards beyond just sound
- 5 combo → Frenzy mode (already exists, keep it)
- 10 combo → "Double Score" for 5 seconds
- 15 combo → "Golden Bubble" (special bubble worth 3x points)
- 20 combo → "Bubble Storm" (screen fills with targets for 3 seconds)

### Tier 3: Creative New Features

#### 11. Time Attack Mode
- 60-second timer
- Score as many correct as possible
- Difficulty scales every 10 correct
- Leaderboard tracking

#### 12. Streak Multiplier System
- 1-4 streak: 1x score
- 5-9 streak: 2x score
- 10-14 streak: 3x score
- 15+ streak: 5x score
- Visual flame effect intensifies with multiplier tier

#### 13. Problem Type Roulette
Every 5 problems, the game randomly switches problem type (addition → subtraction → comparison → series). Keeps players on their toes and prevents the monotony of a single equation type.

#### 14. "Boss Bubble" every 10 correct
A large bubble appears that requires 3 correct answers to pop. Gets progressively harder. Adds a mini-boss rhythm to the flow.

#### 15. Daily Challenge
One special bubble configuration per day (e.g. "multiplication only", "speed round", "no distractors"). Tracks best score per day. Phase 4 item, but worth designing now.

---

## Priority Order

```
IMMEDIATE (this session):
  Fix 1: Anti-repeat guard          → 30 min
  Fix 2: New problems mid-session   → 1 hour  
  Fix 3: Streak-based progression   → 30 min
  Fix 4: Use real profile           → 15 min
  Fix 5: Fix currentFocus key       → 10 min

NEXT SESSION:
  6: Session-internal difficulty    → 1 hour
  7: Problem variety in sessions    → 1 hour
  8: Visual progression feedback    → 30 min
  9: Adaptive difficulty            → 45 min

BACKLOG (Phase 4):
  10: Combo rewards
  11: Time Attack mode
  12: Streak multiplier
  13: Problem type roulette
  14: Boss bubbles
  15: Daily challenge
```

---

## Counsel Agreement

Both Claude and Gemini independently identified the same root causes:
- Mastery system locked behind cross-skill accumulation (need 3 skills, arcade trains 1)
- Dummy profile in GameOrchestrator throws away progression
- Problem never regenerates within a session
- Zero anti-repeat logic anywhere
- `currentFocus` key mismatch

Both agreed the quick wins are: anti-repeat guard, streak-based progression, real profile usage, and mid-session problem regeneration.