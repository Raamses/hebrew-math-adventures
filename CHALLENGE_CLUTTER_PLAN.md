# Challenge Mode + Visual Clutter Fix Plan

## Issue 1: Visual Clutter (FrenzyOverlay stacking)
**Problem:** When frenzy activates (combo ≥ 5), the FrenzyOverlay renders at z-30 with huge "SUPER FRENZY!" text + "3x Score" — directly on top of the header (mode title "Survival Mode" + instruction "Pop 8"). Result: unreadable mess.

**Root Cause:** `FrenzyOverlay` is `position: absolute inset-0 z-30` — covers the entire screen including the header area. The "FRENZY" text is positioned at `top-20` (5rem from top), which is exactly where the instruction banner sits.

**Fix:**
- Move frenzy text to `top-1/3` or lower (below the header, in the play area)
- Add `pointer-events-none` (already has it, good)
- Make the frenzy text smaller on mobile (text-4xl instead of text-6xl)
- Add a semi-transparent dark backdrop behind the frenzy text for readability
- Ensure the instruction banner gets a higher z-index (z-40) so it stays readable above frenzy

**Files:** `src/components/games/FrenzyOverlay.tsx`, `src/components/games/BubbleGameContainer.tsx`

## Issue 2: Daily Challenge not completing at 15 correct
**Problem:** User reached 15 correct answers in challenge mode but the challenge didn't complete.

**Root Cause:** `GameOrchestrator` receives `dailyChallengeMode` and `dailyChallengeTarget` props, but only passes them to `PracticeMode` (line 223-224). When playing arcade modes (SENSORY path), it renders `BubbleGame` → `BubbleGameContainer` WITHOUT passing `dailyChallengeMode`/`dailyChallengeTarget`. The challenge tracking logic (`checkDailyChallenge`) only exists in `PracticeMode`, so arcade mode sessions never count toward daily challenges.

**Fix:**
- Pass `dailyChallengeMode` and `dailyChallengeTarget` through `BubbleGame` → `BubbleGameContainer`
- Add challenge tracking logic to `BubbleGameContainer` (mirror what `PracticeMode` does):
  - Track correct answers via `gameState.targetsPopped` (already tracked)
  - On each correct pop OR on game complete, call `checkDailyChallenge`
  - Use `QuestContext`'s `addDailyChallengeCorrect` + `completeDailyChallenge`
  - Match mode: zen→zen, classic→classic, blitz→blitz, survival→survival
- On `onComplete` from `BubbleGameContainer`, also check challenge completion

**Alternative (simpler):** Move challenge tracking to `GameOrchestrator` level — after `onComplete` fires from any game mode, check if the session matches today's challenge and accumulate. This avoids duplicating challenge logic.

**Files:** `src/components/GameOrchestrator.tsx`, `src/components/sensory/BubbleGame.tsx`, `src/components/games/BubbleGameContainer.tsx`

## Issue 3: Playwright tests for daily challenges
**Need:** Create Playwright tests that verify:
1. Daily challenge starts correctly in each mode (zen, classic, blitz, survival)
2. Daily challenge completes when target correct answers reached
3. Daily challenge progress persists across sessions
4. Challenge reward (coins) is awarded on completion

**Files:** `e2e/daily-challenge.spec.ts` (new)

## Implementation Order
1. Fix visual clutter (FrenzyOverlay repositioning) — quick, low-risk
2. Fix challenge mode completion (GameOrchestrator wiring) — medium, needs QuestContext
3. Write Playwright tests for challenges — medium
4. Verify: tsc + vitest + playwright
5. Commit + push + deploy