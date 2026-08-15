# Claude Brief — Fix 3 Bugs in Hebrew Math Adventures

## ⚠️ READ THIS FIRST — Vault is the source of truth
- Load `vault/.vault-loader.md` then `vault/INDEX.md` and ALL `vault/rules/*.md` before doing anything.
- If a vault rule conflicts with code → **the vault wins**, fix the code.
- CRITICAL: `vault/rules/rtl-hebrew.md` — breaking RTL/Hebrew compliance is a release blocker.

## Project
- Path: `/home/ramamos/.openclaw/workspace/hebrew-math-adventures`
- React + TypeScript + Vite + Tailwind CSS
- Hebrew RTL app (children's math game)
- Tests: vitest + @testing-library/react
- All tests must pass before deploy

## Bug 1: UI Overflow on SagaMap (Home Screen)

### Problem
On mobile (360-390px wide), the header has 5 right-side buttons + language toggle + title = ~530px needed, overflowing by 140-170px. The Arcade button text is cut off. Daily Challenge card tags wrap awkwardly. Bottom level icon is cut off by phone nav bar.

### Files to Fix
- `src/components/map/SagaMap.tsx` — header (lines 68-127), bottom padding (line 67)
- `src/components/quests/QuestPanel.tsx` — stamp row alignment, tag wrapping
- `index.html` — viewport meta tag (add `viewport-fit=cover`)

### Required Changes
1. **Header (SagaMap.tsx):**
   - Change `px-4` to `px-2` on header
   - Change title from `text-2xl` to `text-lg md:text-2xl`
   - Remove language code text from language button (keep Globe icon only)
   - Remove text from Arcade button (keep icon only)
   - Change right cluster `gap-2` to `gap-1`
   - Reduce coin pill padding from `px-2 py-1` to `px-1.5 py-0.5`

2. **QuestPanel stamps (QuestPanel.tsx):**
   - Add `justify-between` to the stamp row container (line ~48)
   - Reduce `mx-4` to `mx-2` and `p-4` to `p-3` on the card
   - Make tag row `flex-nowrap` and reduce gaps

3. **Bottom safe area (SagaMap.tsx):**
   - Change `pb-20` to `pb-[calc(5rem+env(safe-area-inset-bottom))]`
   - In `index.html`, change viewport meta to include `viewport-fit=cover`

## Bug 2: Duplicate "0+0=?" Problems

### Root Causes
1. **ArithmeticFactory has no default case** — if the `type` doesn't match any case, `num1` and `num2` stay 0, producing `0+0=0`
2. **AlgebraicFactory type mapping bug** — `type.replace('_missing', '')` turns `'addition_missing'` into `'addition'` which doesn't match `'addition_simple'`
3. **No deduplication** in `usePracticeSession` — same problem can appear twice in a row

### Files to Fix
- `src/engines/ProblemFactory.ts` — add default case, fix type mapping
- `src/hooks/usePracticeSession.ts` — add deduplication

### Required Changes
1. **ProblemFactory.ts — Add default case to ArithmeticFactory switch (after DIVISION case, before closing brace):**
```typescript
default:
    // Fallback: generate simple addition instead of degenerate 0+0
    operator = '+';
    subType = 'simple';
    num1 = RandomUtils.intInRange(1, 10);
    num2 = RandomUtils.intInRange(1, 10);
    break;
```

2. **ProblemFactory.ts — Fix AlgebraicFactory type mapping (line ~180):**
Replace:
```typescript
const baseType = type.replace(ProblemTypes.ALGEBRAIC_MISSING, '');
```
With:
```typescript
// Map '_missing' suffix back to valid base types
let baseType = type;
if (type.endsWith('_missing')) {
    const base = type.replace('_missing', '');
    // Map 'addition' → 'addition_simple', 'sub' → 'sub_simple', etc.
    baseType = base === 'addition' ? 'addition_simple'
        : base === 'sub' ? 'sub_simple'
        : base;
}
```

3. **ProblemFactory.ts — Add post-generation validation at end of ArithmeticFactory.generate():**
Before `return {`, add:
```typescript
// Validate: never produce 0+0
if (num1 === 0 && num2 === 0 && operator === '+') {
    num1 = RandomUtils.intInRange(1, 5);
    num2 = RandomUtils.intInRange(1, 5);
    answer = num1 + num2;
}
```

4. **usePracticeSession.ts — Add deduplication:**
Add a ref to track recent problem signatures:
```typescript
const recentSignaturesRef = useRef<string[]>([]);
```
In `generateNext`, after generating a problem, compute a signature and track it:
```typescript
// After generating the problem
if (problem) {
    const sig = `${problem.type}:${'num1' in problem ? problem.num1 : ''}:${'num2' in problem ? problem.num2 : ''}:${'operator' in problem ? problem.operator : ''}`;
    recentSignaturesRef.current = [...recentSignaturesRef.current.slice(-4), sig];
}
```
Before returning, if the generated problem's signature matches the last one, regenerate once:
```typescript
// Check for duplicate
const lastSig = recentSignaturesRef.current[recentSignaturesRef.current.length - 1];
if (lastSig && problem) {
    const currentSig = `${problem.type}:${'num1' in problem ? problem.num1 : ''}:${'num2' in problem ? problem.num2 : ''}:${'operator' in problem ? problem.operator : ''}`;
    if (currentSig === lastSig) {
        // Try one more time
        const retry = mathModule.generateProblem(userCapabilities, {
            difficulty: targetLevel,
            ...diversityParams
        });
        if (retry) return retry;
    }
}
```

## Bug 3: Daily Challenge Never Completes (0/7 Stuck)

### Root Cause
`completeDailyChallenge()` is defined in `QuestContext.tsx` but **never called anywhere** in the entire codebase. The "Start Challenge" button calls `onArcadeMode()` with no arguments, which opens the generic mode selector — not the daily challenge mode. Even if the user plays and meets the target, nothing checks for completion.

### Files to Fix
- `src/components/map/SagaMap.tsx` — pass daily challenge mode to onArcadeMode
- `src/App.tsx` — pass daily challenge info to GameOrchestrator
- `src/components/GameOrchestrator.tsx` — accept and pass through daily challenge config
- `src/components/PracticeMode.tsx` — call completeDailyChallenge on session end

### Required Changes

1. **SagaMap.tsx — Import useQuest, pass daily challenge mode:**
```typescript
import { useQuest } from '../../context/QuestContext';
// In component:
const { todayChallenge } = useQuest();
// Change QuestPanel prop:
<QuestPanel onStartChallenge={() => onArcadeMode(todayChallenge.mode)} />
```

2. **App.tsx — Track daily challenge mode and pass to GameOrchestrator:**
When `handleArcadeMode` is called with a specific mode (from "Start Challenge"), store it. Pass `dailyChallengeMode` and `dailyChallengeTarget` to GameOrchestrator.

3. **GameOrchestrator.tsx — Accept dailyChallenge props and pass to PracticeMode:**
```typescript
interface GameOrchestratorProps {
    // ... existing
    dailyChallengeMode?: string;
    dailyChallengeTarget?: number;
}
```
Pass these through to PracticeMode.

4. **PracticeMode.tsx — Call completeDailyChallenge on session end:**
Import `useQuest`:
```typescript
import { useQuest } from '../context/QuestContext';
```
In the component:
```typescript
const { completeDailyChallenge, todayChallenge } = useQuest();
```

After session ends (both Standard completion and Game Over), check if this was a daily challenge session:
```typescript
// After recordSession, before/after setShowSummary:
if (dailyChallengeMode && session.correct >= (dailyChallengeTarget || todayChallenge.target)) {
    const result = completeDailyChallenge();
    if (result) {
        // Could show a special celebration
        console.log(`Daily challenge complete! +${result.total} coins, streak: ${result.newStreak}`);
    }
}
```

**Simpler alternative:** Since the daily challenge just needs `completeDailyChallenge()` called when the user plays the right mode and gets enough correct answers, we can add this check in the `useEffect` that handles session end (where `showSummary` is set):

In the effect at line ~139 that triggers on `session.isGameOver && !showSummary && !isProcessing`:
```typescript
// Check daily challenge completion
const { completeDailyChallenge, todayChallenge: dc } = useQuestRef.current;
if (dc && session.mode.toLowerCase() === dc.mode.toUpperCase() && session.correct >= dc.target) {
    completeDailyChallenge();
}
```

And in the Standard mode completion block (line ~108):
```typescript
// Check daily challenge completion
if (dailyChallengeTarget && currentSession.correct >= dailyChallengeTarget) {
    completeDailyChallenge();
}
```

## Testing Requirements
After all fixes:
1. Run `npx vitest run` — all existing tests (158) must still pass
2. Add tests for:
   - ProblemFactory: verify no 0+0 is ever generated
   - usePracticeSession: verify dedup prevents consecutive duplicates
   - Daily challenge: verify completeDailyChallenge is called when target is met

## Build & Deploy
After tests pass:
```bash
npm run build && firebase deploy
```

## Commit
```
fix: UI overflow, duplicate 0+0 problems, daily challenge completion

- Fix header overflow on mobile (icon-only buttons, tighter spacing)
- Add safe-area-inset for bottom nav
- Add default case to ArithmeticFactory to prevent 0+0
- Fix AlgebraicFactory type mapping
- Add problem deduplication in usePracticeSession
- Wire completeDailyChallenge to session end
- Pass daily challenge mode through SagaMap → App → GameOrchestrator → PracticeMode
```