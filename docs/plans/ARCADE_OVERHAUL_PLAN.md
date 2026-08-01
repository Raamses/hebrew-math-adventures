# Arcade Overhaul Plan — Hebrew Math Adventures

## Goal
Fix the two critical bugs (progression + diversity) and implement creative new features to make the arcade mode genuinely fun for kids.

---

## Phase 1: Critical Bug Fixes (Quick Wins)

### 1.1 Fix Progression — Session-Internal Leveling
**Problem:** `GameDirector.recordResult()` requires 3 mastered skills to level up. Arcade mode only tracks 1 skill. 25 correct answers = no level change.

**Fix:** Add session-internal difficulty scaling to the BubbleGame path.
- `BubbleGameContainer` tracks a `sessionLevel` state (starts at 1, max 10)
- Every 5 correct answers → `sessionLevel++` (configurable threshold)
- `sessionLevel` feeds into `MathBehaviorStrategy.initializeLevel()` to regenerate the problem with harder params
- When session levels up: play 'levelUp' sound, show brief level-up banner, regenerate problem
- `estimatedLevel` in the real profile still gets updated via `recordResult()` for cross-session persistence

**Files touched:**
- `src/components/games/BubbleGameContainer.tsx` — add sessionLevel state, level-up effect
- `src/engines/bubble/strategies/MathStrategy.ts` — add `regenerateProblem(level)` method
- `src/engines/GameDirector.ts` — add streak-based level bump to `recordResult()` (every 10 consecutive correct → +1 estimatedLevel)

### 1.2 Fix Problem Diversity — Anti-Repeat + Problem Rotation
**Problem:** No anti-repeat logic. Same problem can appear twice in a row. Single problem type per session.

**Fix:**
- `MathBehaviorStrategy` keeps a `recentSignatures: string[]` (last 5 problem signatures)
- `generateNext()` already generates distractors — but the *target problem itself* never changes in a session
- Add `regenerateProblem(level, config)` that creates a NEW problem (different type if available, different numbers)
- Signature = `${type}:${num1}:${operator}:${num2}:${answer}`
- Reject new problem if signature matches any in recentSignatures
- Also rotate problem types within a session: at each level-up, pick from available types for that level (not just `addition_simple`)

**Files touched:**
- `src/engines/bubble/strategies/MathStrategy.ts` — add anti-repeat, regenerateProblem
- `src/engines/MathModule.ts` — add anti-repeat in `generateProblem()` (lastProblemSignature ref)
- `src/engines/ProblemFactory.ts` — ensure `ArithmeticFactory` avoids `num1=0, num2=0` combos

### 1.3 Fix "0 + 0 = ?" Specifically
**Problem:** Council correction: `intInRange(1, 6)` returns 1-5, not 0. The actual zero comes from subtraction `num2 = intInRange(0, num1)` where `num2 === num1` gives answer=0, or from addition at level 4+ where `num2 = intInRange(0, max-num1)` can be 0.

**Fix (Council-approved):**
- In `ArithmeticFactory`, for subtraction: change `num2 = intInRange(0, num1)` to `intInRange(1, num1)` when `num1 > 1` — ensures non-zero answers
- For addition at level 4+: ensure `num2 >= 1` by using `intInRange(1, max - num1)`
- The anti-repeat guard (1.2) prevents any remaining edge case from repeating

---

## Phase 2: Gameplay Improvements

### 2.1 Adaptive Difficulty Within Session
- Track `consecutiveCorrect` and `consecutiveWrong` within the session (not just profile)
- After 3 consecutive wrong → rescue mode (simpler problems, fewer distractors)
- After 5 consecutive correct → challenge mode (harder problems, more distractors, faster spawn)
- This already exists in `GameDirector.tuneConfig()` for PracticeMode — wire it into BubbleGame too

### 2.2 Problem Rotation Mid-Session
- At each session level-up, rotate problem type from the available pool
- Level 1-2: addition_simple, sub_simple, comparison
- Level 3+: add multiplication, division, carry, borrow
- This naturally diversifies the bubbles and keeps kids engaged

### 2.3 Reduced correctDelay
- `useAnswerFlow.ts` has `correctDelay = 2000ms` — too slow for arcade
- Reduce to 1000ms for a snappier feel
- In BubbleGame, correct answers are instant (bubble pop) so this mainly affects PracticeMode

---

## Phase 3: Creative New Features

### 3.1 Power-Up Bubbles (NEW)
- Special golden bubbles appear randomly (every ~15s)
- Types:
  - **Freeze** (❄️): freezes all bubbles for 3 seconds
  - **Double Points** (✨): 2x score for 5 seconds
  - **Pop All Distractors** (💥): instantly pops all wrong bubbles
  - **Slow Motion** (🐌): all bubbles move at 0.3x speed for 4 seconds
- Visual: golden glow, special icon inside, distinct from normal bubbles
- Pop with the correct answer value OR just pop directly (power-up bubbles don't need answer validation)

### 3.2 Boss Bubbles (NEW)
- Every 3rd level (session levels 3, 6, 9), a giant boss bubble appears
- Boss bubble requires 3 correct pops (has health bar)
- Boss bubble moves slower but takes up more screen space
- Defeating boss = guaranteed level-up + bonus points
- Visual: oversized bubble with health indicator

### 3.3 Visual Progression — Theme Changes (NEW)
- As session level increases, the background theme changes:
  - Level 1-2: Beach (blue) — current
  - Level 3-4: Forest (green)
  - Level 5-6: Mountain (purple)
  - Level 7-8: Space (dark blue with stars)
  - Level 9-10: Volcano (red/orange)
- Uses CSS class swap on the container div
- Smooth transition animation between themes

### 3.4 Speed Modes (NEW)
- Add mode selector on the SagaMap arcade entry:
  - **Zen** — no timer, no strikes, just pop bubbles at your own pace
  - **Classic** — current behavior (target count win, strikes fail)
  - **Blitz** — 60 second timer, pop as many correct as possible
  - **Survival** — 3 strikes, endless mode, difficulty ramps faster
- Config-driven: `GameConfig` already supports `time_limit` and `endless` win conditions

### 3.5 Combo Milestone Effects (NEW)
- At combo 5: "Frenzy" mode (already exists!) — keep it
- At combo 10: "Super Frenzy" — golden particles, 3x score
- At combo 15: "Mega Frenzy" — screen shake, 5x score, all bubbles slow down
- Visual feedback for combo count milestone (flash, sound, text)

### 3.6 Daily Challenge (NEW)
- Fixed seed for each day (based on date)
- Same problems for everyone that day
- Leaderboard in Parent Dashboard (future)
- Shows "Daily Challenge" badge on the map

---

## Phase 4: Polish

### 4.1 Sound Improvements
- Distinct sound for level-up, boss appear, power-up, combo milestone
- Currently only 'correct', 'wrong', 'levelUp', 'streak', 'frenzy', 'milestone' exist

### 4.2 Visual Juice
- Screen shake on wrong answer
- Confetti burst on level-up
- Bubble pop animation already exists — enhance with particle effects on correct
- Combo counter animation (already in ArcadeHUD for PracticeMode, add to BubbleGame)

### 4.3 Level-Up Banner
- Brief overlay: "Level 3! 🎉" with animated entrance/exit (2 seconds)
- Shows what new problem types are unlocked

---

## Implementation Strategy

### Agent Assignments
| Task | Agent | Why |
|------|-------|-----|
| 1.1 Progression fix | AmosBot (me) | Core engine, needs careful state management |
| 1.2 Anti-repeat + diversity | Claude (claude -p) | Algorithmic, good at logic |
| 1.3 Zero-answer guard | AmosBot (me) | Small fix, bundled with 1.2 |
| 2.1-2.3 Gameplay wiring | Aider | Mechanical wiring of existing logic |
| 3.1 Power-up bubbles | Gemini (agy -p) | New component, creative work |
| 3.2 Boss bubbles | Claude (claude -p) | Game logic + entity system |
| 3.3 Theme changes | AmosBot (me) | CSS + container work |
| 3.4 Speed modes | Aider | Config-driven, mechanical |
| 3.5 Combo milestones | Gemini (agy -p) | Extends existing frenzy system |
| 3.6 Daily challenge | Claude (claude -p) | Seeding + game state |
| 4.1-4.3 Polish | AmosBot (me) | Iterative, visual tuning |

### Verification Loop
After each phase:
1. Run `npm test` — all 90 tests must pass (update tests as needed)
2. Run `npm run build` — must succeed
3. Deploy to Firebase staging if available
4. Manual check on phone

### Failure Protocol
- If an agent's implementation fails tests: fix once, retry once
- If it fails twice: stop, report to Ram, ask how to proceed
- No step retried more than 2 times without asking Ram

### Execution Order
1. Phase 1 (all of 1.1, 1.2, 1.3) — in parallel where possible
2. Verify: tests + build
3. Phase 2 (2.1, 2.2, 2.3) — sequential
4. Verify: tests + build
5. Phase 3 features — parallel agents
6. Verify: tests + build
7. Phase 4 polish — me, iterative
8. Final deploy to Firebase