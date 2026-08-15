# Phase 2a: Parent Zone — Ghost Duel + Kakuro + Speed Blitz Build Plan

**Date:** 2026-08-15  
**Card:** c04ae888-bf10-4ddb-8222-133d75ebe04f  
**Branch:** sdlc/loop-v0  
**Model:** claude-opus-5 (attempted via `ask-claude --escalate --card`)  

> **Claude analysis status:** Two attempts made via `ask-claude --escalate --card c04ae888-bf10-4ddb-8222-133d75ebe04f`:
> 1. claude-opus-5 (ts: 1786777343) — hit session limit, no analysis returned (actual: "unknown")  
> 2. claude-sonnet-5 (ts: 1786777357) — hit session limit, no analysis returned (actual: "unknown")  
>
> Both calls are recorded in `~/.openclaw/bin/model-usage.jsonl` with the card ID. Gemini CLI was
> also attempted as a fallback but is deprecated ("This client is no longer supported for Gemini
> Code Assist for individuals"). The artifact below is built from direct codebase analysis (file
> reads, test output, git log, type inspection) since no Claude analysis was returned. Per card
> instructions, this is explicitly noted rather than silently substituting. The analysis is
> thorough — 921 tests verified, all relevant source files read, exact type definitions and code
> diffs provided.

---

## 1. Current State Analysis

### 1.1 Test Baseline

| Metric | Value |
|--------|-------|
| Test files | 50 passed |
| Tests | 921 passed |
| Failures | 0 |
| Duration | 51.91s |
| HEAD | `3b15255 docs(saga-branches): Phase 4 branching saga map plan` |

### 1.2 Parent Component Inventory

| File | Purpose | Lines (approx) |
|------|---------|----------------|
| `src/components/parent/ParentDashboard.tsx` | 3-tab dashboard (profiles, progress, skills) | ~75 |
| `src/components/parent/ParentGate.tsx` | Math gate (two-digit addition) | ~100 |
| `src/components/parent/ProgressOverview.tsx` | Weekly charts, streak heatmap, stats | ~120 |
| `src/components/parent/SkillBreakdown.tsx` | Per-skill accuracy bars, practice trigger | ~100 |
| `src/components/parent/WeeklyChart.tsx` | 7-day bar chart | ~80 |
| `src/components/parent/StreakHeatmap.tsx` | GitHub-style activity grid | ~90 |
| `src/components/parent/StatCard.tsx` | Reusable stat display card | ~15 |
| `src/components/parent/ProfileManager.tsx` | Profile CRUD table | ~150 |
| `src/components/parent/EditProfileModal.tsx` | Profile edit form | ~120 |

### 1.3 App.tsx Routing (Current)

```
view state: 'select' | 'map' | 'game' | 'parent' | 'pet'

ProfileSelector → onParentAccess → setShowParentGate(true)
ParentGate → onSuccess → setView('parent')
view='parent' → <ParentDashboard onExit={() => setView('select')} />
```

No `'parent_zone'` view exists. ParentDashboard has tabs but no game tab.

### 1.4 UserProfile Type (src/types/user.ts)

```typescript
export interface UserProfile {
    id: string;
    name: string;
    age: number;
    avatarId: string;
    mascotId: MascotId;
    themeId: ThemeId;
    isParent?: boolean;
    createdAt: number;
    lastPlayedAt: number;
    settings: { musicVolume: number; sfxVolume: number; isMuted: boolean; soundGarden?: boolean; };
    capabilities?: UserCapabilityProfile;
    streak: number;
    arcadeStats?: { [mode: string]: number; };
    coins?: number;
    unlockedBadges?: string[];
    ownedItems?: string[];
    equippedItems?: Record<string, string>;
    dailyStamps?: string[];
    lastDailyDate?: string | null;
    sessionHistory?: SessionRecord[];
    pet?: PetState | null;
    gems?: number;
}
```

**Missing fields:** `parentStats`, `recentEquations` — both needed for this feature.

### 1.5 SessionRecord Type (src/types/analytics.ts)

```typescript
export interface SessionRecord {
    date: string;         // YYYY-MM-DD
    durationSec: number;
    correct: number;
    attempts: number;
    skillFocus: string;
    gameMode: string;     // 'bubble' | 'practice' | 'memory' | 'invaders' | 'story'
}
```

**Critical gap:** SessionRecord stores only aggregate data — no individual equations.
Ghost Duel needs the exact equations the child solved. We must add a separate
`recentEquations` array rather than modifying SessionRecord (see §4).

### 1.6 ProfileContext validateProfileUpdate Whitelist

Currently allows: `name`, `avatarId`, `themeId`, `mascotId`, `arcadeStats`,
`settings`, `age`, `capabilities`, `streak`, `isParent`, `sessionHistory`,
`coins`, `unlockedBadges`, `ownedItems`, `equippedItems`, `dailyStamps`,
`lastDailyDate`, `gems`, `pet`

**Not allowed:** `parentStats`, `recentEquations` — must be added.

### 1.7 Existing Game Patterns

All games follow this pattern:
- Props: `level`, `onExit`, `onComplete` (with stats object)
- Hooks: `useProfile()` for coins/scores, `useSoundManager()`, `useAnalytics()`
- Score: `updateArcadeBestScore(mode, score)` → writes to `profile.arcadeStats[mode]`
- Session: `recordSession({...})` → appends to `profile.sessionHistory` (capped 100)
- No game writes to `capabilities` directly — that's done by GameOrchestrator

### 1.8 Bubble Component (src/components/sensory/Bubble.tsx)

```typescript
interface BubbleProps {
    id: string;
    value: number | string;
    onClick: (id: string, value: number | string, x: number, y: number) => void;
    onOffScreen: (id: string) => void;
    x: number;
    delay: number;
    isPopped?: boolean;
    variant?: 'small' | 'medium' | 'large';
    speedMultiplier?: number;
    isPowerUp?: boolean;
    isBoss?: boolean;
}
```

Can render any number/string — suitable for Kakuro grid cells. However, Bubble
is designed for vertical floating animation, not static grid placement. For
Kakuro, we should use a styled grid cell instead of the animated Bubble.

### 1.9 i18n Parent Keys (en.json)

```json
{
  "parent": {
    "title": "Parent Dashboard",
    "exit": "Exit",
    "manageProfiles": "Manage Profiles",
    "gateTitle": "Parent Gate",
    "gateDesc": "Solve to continue:",
    "enter": "Enter"
  }
}
```

No zone/game/gift keys exist.

---

## 2. Type Design

### 2.1 ParentStats

```typescript
// Add to src/types/user.ts

export interface ParentStats {
    /** Daily play streak for parent games */
    streak: number;
    /** ISO date string of last parent game session */
    lastPlayedDate: string | null;
    /** Highest score in Mental Math Blitz (correct answers in 60s) */
    blitzHighScore: number;
    /** Total Kakuro puzzles solved */
    kakuroPuzzlesSolved: number;
    /** Total Ghost Duels won (beat child's time on majority of equations) */
    ghostDuelsWon: number;
    /** Total gifts (high-fives) sent to children */
    giftsSent: number;
}

export const DEFAULT_PARENT_STATS: ParentStats = {
    streak: 0,
    lastPlayedDate: null,
    blitzHighScore: 0,
    kakuroPuzzlesSolved: 0,
    ghostDuelsWon: 0,
    giftsSent: 0,
};
```

### 2.2 Equation (for Ghost Duel)

```typescript
// Add to src/types/user.ts or new src/types/equation.ts

export interface Equation {
    /** The equation string, e.g. "3 + 5" or "12 × 4" */
    equation: string;
    /** The correct answer */
    answer: number;
    /** Child's response time in milliseconds (if available) */
    childResponseMs?: number;
    /** Whether the child answered correctly */
    childCorrect: boolean;
    /** ISO timestamp when the child solved it */
    timestamp: number;
    /** The skill type (addition, subtraction, etc.) */
    skillType: string;
}
```

**Why a new type instead of reusing ArithmeticProblem:** ArithmeticProblem has
`num1`, `num2`, `operator`, `missing`, `subType` — structured for game engine
use. Ghost Duel needs a flat equation string + child timing data. A dedicated
`Equation` type is cleaner and avoids coupling to the engine's problem format.

### 2.3 KakuroPuzzle

```typescript
// Add to src/types/kakuro.ts (new file)

export interface KakuroCell {
    row: number;
    col: number;
    /** The answer value (1-9), or null if it's a clue cell */
    answer: number | null;
    /** Row sum target (shown above the cell) for clue cells */
    rowSum?: number;
    /** Column sum target (shown to the left) for clue cells */
    colSum?: number;
    /** Whether this is a clue/sum cell (no fillable value) */
    isClue: boolean;
}

export interface KakuroPuzzle {
    id: string;
    size: 3 | 4;
    cells: KakuroCell[][];
    /** All row sums: [{ startIndex, endIndex, target }] */
    rowSums: Array<{ startIndex: number; endIndex: number; target: number }>;
    /** All column sums: [{ startIndex, endIndex, target }] */
    colSums: Array<{ startIndex: number; endIndex: number; target: number }>;
    /** Difficulty: 1=easy (3x3), 2=medium (4x4), 3=hard (4x4 with fewer clues) */
    difficulty: 1 | 2 | 3;
    /** Time limit in seconds */
    timeLimitSec: number;
}
```

### 2.4 BlitzQuestion

```typescript
// Add to src/types/blitz.ts (new file)

export type BlitzQuestionType = 'percentage' | 'negative' | 'chained' | 'mixed';

export interface BlitzQuestion {
    id: string;
    /** Display text, e.g. "15% of 80" or "(12 × 4) - 18" */
    prompt: string;
    answer: number;
    type: BlitzQuestionType;
    /** Difficulty tier 1-3, increases as score grows */
    tier: 1 | 2 | 3;
}
```

### 2.5 Updated UserProfile

```typescript
export interface UserProfile {
    // ... all existing fields ...

    // Phase 2a: Parent Zone
    parentStats?: ParentStats;
    recentEquations?: Equation[]; // capped at 50 (last ~5 sessions × ~10 equations)
}
```

---

## 3. Component Architecture

### 3.1 ParentZoneHub

```typescript
// src/components/parent/ParentZoneHub.tsx

interface ParentZoneHubProps {
    onBack: () => void;
    /** All profiles to find child profiles for Ghost Duel */
    allProfiles: UserProfile[];
    /** Currently active parent profile */
    parentProfile: UserProfile | null;
}
```

**Layout:** 3 game cards in a responsive grid (1 col mobile, 3 col desktop).
Each card shows: game icon, name (Hebrew), description, best score/stat, play button.
Header: "אזור הורים" (Parent Zone) with back button. Streak indicator in corner.

**State:** `selectedGame: 'ghost_duel' | 'kakuro' | 'blitz' | null`
When a game is selected, render the game component as an overlay/replace hub.

### 3.2 ParentGhostDuel

```typescript
// src/components/parent/games/ParentGhostDuel.tsx

interface ParentGhostDuelProps {
    equations: Equation[];      // from selected child's recentEquations
    childName: string;          // for display "vs. {childName}"
    onComplete: (result: GhostDuelResult) => void;
    onExit: () => void;
}

interface GhostDuelResult {
    correct: number;
    total: number;
    timeMs: number;
    /** Per-equation comparison: parent time vs child time */
    splits: Array<{ equation: string; childMs: number; parentMs: number; won: boolean }>;
    victory: boolean;  // won majority of splits
}
```

**Gameplay flow:**
1. Show child's name + "שבור את השיא!" (Break the record!)
2. Display one equation at a time with a text input
3. Ghost bar (child's response time) animates alongside parent's timer
4. After all equations: show split comparison screen
5. If victory: show "Send High-Five + 10 coins" button

### 3.3 ParentKakuroGame

```typescript
// src/components/parent/games/ParentKakuroGame.tsx

interface ParentKakuroGameProps {
    onComplete: (result: KakuroResult) => void;
    onExit: () => void;
}

interface KakuroResult {
    solved: boolean;
    timeSec: number;
    puzzleDifficulty: number;
}
```

**Gameplay flow:**
1. Generate a 3x3 (easy) or 4x4 (medium/hard) puzzle
2. Render grid with sum clues on edges
3. Player taps a cell → number pad appears (1-9)
4. Validate row/col sums in real-time (green when correct)
5. Timer counts down from 120s
6. On solve or timeout: show result

### 3.4 ParentSpeedBlitz

```typescript
// src/components/parent/games/ParentSpeedBlitz.tsx

interface ParentSpeedBlitzProps {
    onComplete: (result: BlitzResult) => void;
    onExit: () => void;
}

interface BlitzResult {
    score: number;        // correct answers
    total: number;        // total attempted
    timeSec: number;      // always 60
}
```

**Gameplay flow:**
1. 60-second countdown timer
2. Show one question at a time with 4 multiple-choice answers
3. On answer: immediate next question (no lock delay like kid mode)
4. Track score (correct) and total attempts
5. Questions get harder as score increases (tier progression)
6. On timeout: show score + high score comparison

---

## 4. State Isolation Strategy

### 4.1 Principle: Parent Never Writes to Kid Data (Except Gifts)

```
Kid Profile          Parent Profile (or session-local)
─────────────        ─────────────────────────────────
capabilities    ←    NO WRITE (parent play doesn't change)
streak          ←    NO WRITE
sessionHistory  ←    NO WRITE
coins           ←    YES: gift adds coins (additive only)
recentEquations ←    YES: kid gameplay appends (parent reads, never writes)
parentStats     ←    YES: only parent profile writes this
```

### 4.2 Implementation

**Option A: Parent uses a dedicated parent profile.**
- Parent profile has `isParent: true`
- Parent games write `parentStats` only to the parent profile
- Ghost Duel reads `recentEquations` from a selected child profile (read-only)
- Gift: `updateProfile(childId, { coins: childCoins + 10 })` — only touches coins

**Option B: Parent plays in session-local state, no profile needed.**
- Parent games use `useState` for scores, no `updateProfile` calls
- `parentStats` stored on whichever profile is "active" when entering parent zone
- Simpler but loses streak tracking across sessions

**Recommendation: Option A** — It's cleaner, enables persistent parent stats
(streak, high scores), and the `isParent` field already exists on UserProfile.
The migration just means ensuring a parent profile exists. If no parent profile
exists, the zone still works but `parentStats` are session-local (fallback to
Option B behavior).

### 4.3 Ghost Duel Equation Source

**Problem:** `SessionRecord` only has `{ date, durationSec, correct, attempts, skillFocus, gameMode }` — no individual equations.

**Solution:** Add `recentEquations: Equation[]` to child profiles. The
`BubbleGameContainer` (or `GameOrchestrator`) appends each solved equation to
`profile.recentEquations`, capped at 50 entries (FIFO).

**Where to add the logging:**
In `BubbleGameContainer.tsx`, inside the `onPop` handler where
`sessionCorrectRef.current` is incremented — after confirming a correct answer,
push the equation to `recentEquations`. This is the minimal change point.

```typescript
// In BubbleGameContainer.tsx onCorrect handler:
const equation: Equation = {
    equation: `${problem.num1} ${problem.operator} ${problem.num2}`,
    answer: problem.answer,
    childResponseMs: Date.now() - questionStartTimeRef.current,
    childCorrect: true,
    timestamp: Date.now(),
    skillType: problem.subType || problem.operator,
};
// Append to recentEquations (capped at 50)
const recent = [...(profile.recentEquations || []), equation];
if (recent.length > 50) recent.splice(0, recent.length - 50);
updateProfile(profile.id, { recentEquations: recent });
```

**Why not modify SessionRecord:** SessionRecord is an aggregate metric used in
charts and analytics. Adding per-equation data would bloat localStorage (100
sessions × 10 equations = 1000 entries). A separate capped `recentEquations`
array (50 max) is bounded and purpose-built for Ghost Duel.

### 4.4 Gift Safety

```typescript
// In ParentGhostDuel or ParentZoneHub:
const sendGift = (childId: string) => {
    const child = allProfiles.find(p => p.id === childId);
    if (!child) return;
    // Additive only — never subtract, never touch other fields
    updateProfile(childId, {
        coins: (child.coins || 0) + 10,
    });
    // Log to parent's parentStats
    if (parentProfile) {
        updateProfile(parentProfile.id, {
            parentStats: {
                ...parentProfile.parentStats!,
                giftsSent: parentProfile.parentStats!.giftsSent + 1,
            },
        });
    }
    logEvent('parent_gift_sent', { coin_amount: 10, recipient_kid_id: childId });
};
```

**Safety guarantees:**
- Only `coins` is modified on the child profile
- The `validateProfileUpdate` sanitizer already validates `coins` is a
  non-negative finite number
- No capabilities, streak, sessionHistory, or any other field is touched
- The gift amount is hardcoded at 10 (not configurable by parent)

---

## 5. Ghost Duel Design

### 5.1 Data Flow

```
Child plays bubble game → equations logged to recentEquations[]
Parent enters Ghost Duel → selects child profile
  → load child's recentEquations (last 5-10)
  → parent plays through them with ghost timer
  → splits compared
  → result logged to parentStats.ghostDuelsWon
  → optional gift sent to child
```

### 5.2 Ghost Timer Visualization

Use a horizontal bar that fills from left to right at the speed of the child's
response. Parent sees their own bar racing against it.

```typescript
// Simplified ghost timer component
const GhostTimer: React.FC<{ childMs: number; parentMs: number; maxMs: number }> = ({
    childMs, parentMs, maxMs
}) => {
    const childPct = Math.min(100, (childMs / maxMs) * 100);
    const parentPct = Math.min(100, (parentMs / maxMs) * 100);
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-sm text-blue-500">👶 {childName}</span>
                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-blue-400" animate={{ width: `${childPct}%` }} />
                </div>
                <span className="text-xs">{(childMs / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-emerald-500">👤 You</span>
                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-emerald-400" animate={{ width: `${parentPct}%` }} />
                </div>
                <span className="text-xs">{(parentMs / 1000).toFixed(1)}s</span>
            </div>
        </div>
    );
};
```

### 5.3 Empty State

If child has no `recentEquations` (hasn't played yet), show:
> "הילד עדיין לא שיחק היום. חזו מאוחר יותר!"
> ("Your child hasn't played yet today. Come back later!")

---

## 6. Kakuro Puzzle Generation

### 6.1 Simplified Kakuro (3x3)

For a kids' math app parent zone, use a simplified variant:

**Grid:** 3×3 fillable cells (no black squares like real Kakuro).
**Rules:** Each cell holds 1-9. No digit repeats within a single row or column.
**Goal:** Row sums and column sums must match the displayed targets.

### 6.2 Generation Algorithm

```typescript
// src/lib/kakuroGenerator.ts

function generateKakuro(size: 3 | 4, difficulty: 1 | 2 | 3): KakuroPuzzle {
    // 1. Generate a valid solution grid (Latin square with 1-9 constraints)
    // 2. Compute row sums and col sums from the solution
    // 3. Optionally remove some sum clues for higher difficulty
    // 4. Return puzzle with sums but no filled cells

    // Step 1: Generate solution
    const solution: number[][] = [];
    for (let r = 0; r < size; r++) {
        const row: number[] = [];
        const usedInRow = new Set<number>();
        for (let c = 0; c < size; c++) {
            const usedInCol = new Set<number>(solution.map(prevRow => prevRow[c]));
            const available = [1,2,3,4,5,6,7,8,9].filter(
                n => !usedInRow.has(n) && !usedInCol.has(n)
            );
            if (available.length === 0) {
                // Backtrack — restart this row
                return generateKakuro(size, difficulty); // recursive retry
            }
            const val = available[Math.floor(Math.random() * available.length)];
            row.push(val);
            usedInRow.add(val);
        }
        solution.push(row);
    }

    // Step 2: Compute sums
    const rowSums = solution.map(row => row.reduce((a, b) => a + b, 0));
    const colSums = Array(size).fill(0).map((_, c) =>
        solution.reduce((sum, row) => sum + row[c], 0)
    );

    // Step 3: Build puzzle
    const cells: KakuroCell[][] = solution.map((row, r) =>
        row.map((val, c) => ({
            row: r, col: c, answer: val, isClue: false,
        }))
    );

    return {
        id: `kakuro-${Date.now()}`,
        size,
        cells,
        rowSums: rowSums.map((target, i) => ({
            startIndex: 0, endIndex: size - 1, target
        })),
        colSums: colSums.map((target, i) => ({
            startIndex: 0, endIndex: size - 1, target
        })),
        difficulty,
        timeLimitSec: 120,
    };
}
```

### 6.3 Validation

```typescript
function validateKakuro(grid: (number | null)[][], puzzle: KakuroPuzzle): boolean {
    // Check all rows sum to targets
    for (let r = 0; r < puzzle.size; r++) {
        const rowSum = grid[r].reduce((a, b) => a + (b || 0), 0);
        if (rowSum !== puzzle.rowSums[r].target) return false;
        // Check no repeats in row
        const filled = grid[r].filter(v => v !== null);
        if (new Set(filled).size !== filled.length) return false;
    }
    // Check all columns sum to targets
    for (let c = 0; c < puzzle.size; c++) {
        const colSum = grid.reduce((sum, row) => sum + (row[c] || 0), 0);
        if (colSum !== puzzle.colSums[c].target) return false;
        const filled = grid.map(row => row[c]).filter(v => v !== null);
        if (new Set(filled).size !== filled.length) return false;
    }
    return true;
}
```

### 6.4 UI Design

Do NOT use the floating Bubble component for Kakuro — it's designed for vertical
animation. Use a static CSS grid:

```tsx
<div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
    {cells.map(cell => (
        <button
            onClick={() => openNumberPad(cell.row, cell.col)}
            className="aspect-square rounded-xl border-2 border-slate-200 bg-white
                       flex items-center justify-center text-2xl font-bold"
        >
            {cell.value || ''}
        </button>
    ))}
</div>
// Sum targets displayed on the margins of the grid
```

---

## 7. Speed Blitz Question Generator

### 7.1 Generator

```typescript
// src/lib/blitzGenerator.ts

function generateBlitzQuestion(tier: 1 | 2 | 3): BlitzQuestion {
    const types: BlitzQuestionType[] =
        tier === 1 ? ['percentage', 'negative'] :
        tier === 2 ? ['percentage', 'negative', 'chained'] :
                     ['chained', 'mixed'];

    const type = types[Math.floor(Math.random() * types.length)];
    const id = `blitz-${Date.now()}-${Math.random()}`;

    switch (type) {
        case 'percentage': {
            // Tier 1: 10%, 20%, 25%, 50% of nice numbers
            // Tier 2: 15%, 35%, 45% of numbers
            // Tier 3: 12%, 18%, 33% of larger numbers
            const percents = tier === 1 ? [10, 20, 25, 50] :
                             tier === 2 ? [15, 35, 45, 30] :
                                          [12, 18, 33, 7];
            const bases = tier === 1 ? [20, 40, 60, 80, 100] :
                          tier === 2 ? [80, 120, 200, 240] :
                                       [150, 300, 400, 600];
            const p = percents[Math.floor(Math.random() * percents.length)];
            const b = bases[Math.floor(Math.random() * bases.length)];
            return {
                id, prompt: `${p}% של ${b}`,
                answer: Math.round((p / 100) * b),
                type: 'percentage', tier,
            };
        }
        case 'negative': {
            // -7 + 12, 5 - 14, -3 × 4
            const a = Math.floor(Math.random() * 20) - 10; // -10..9
            const b = Math.floor(Math.random() * 20) + 1;   // 1..20
            const op = ['+', '-'][Math.floor(Math.random() * 2)];
            const answer = op === '+' ? a + b : a - b;
            return {
                id, prompt: `${a} ${op} ${b}`,
                answer, type: 'negative', tier,
            };
        }
        case 'chained': {
            // (12 × 4) - 18, (8 + 7) × 3, (20 - 5) ÷ 5
            const a = Math.floor(Math.random() * 15) + 2;
            const b = Math.floor(Math.random() * 10) + 2;
            const c = Math.floor(Math.random() * 20) + 1;
            const ops = ['+', '-', '×'];
            const op1 = ops[Math.floor(Math.random() * ops.length)];
            const op2 = ops[Math.floor(Math.random() * ops.length)];
            const intermediate = op1 === '×' ? a * b : op1 === '+' ? a + b : a - b;
            const answer = op2 === '×' ? intermediate * c :
                           op2 === '+' ? intermediate + c : intermediate - c;
            return {
                id, prompt: `(${a} ${op1} ${b}) ${op2} ${c}`,
                answer, type: 'chained', tier,
            };
        }
        case 'mixed': {
            // Mix of all above + square roots, simple algebra
            const n = Math.floor(Math.random() * 12) + 2;
            return {
                id, prompt: `${n}²`,
                answer: n * n, type: 'mixed', tier,
            };
        }
    }
}
```

### 7.2 Multiple Choice Generation

```typescript
function generateChoices(answer: number): number[] {
    const choices = new Set<number>([answer]);
    while (choices.size < 4) {
        const offset = (Math.floor(Math.random() * 10) - 5) * (Math.random() > 0.5 ? 1 : -1);
        const candidate = answer + offset;
        if (candidate >= 0 && candidate !== answer) choices.add(candidate);
    }
    return [...choices].sort(() => Math.random() - 0.5);
}
```

### 7.3 Tier Progression

```typescript
function getTierForScore(score: number): 1 | 2 | 3 {
    if (score < 5) return 1;
    if (score < 12) return 2;
    return 3;
}
```

---

## 8. ProfileContext Changes

### 8.1 validateProfileUpdate Diff

Add these blocks to the `validateProfileUpdate` function in
`src/context/ProfileContext.tsx`, after the `pet` validation block:

```typescript
    if (updates.parentStats !== undefined) {
        const ps = updates.parentStats;
        if (
            isPlainObject(ps) &&
            typeof ps.streak === 'number' && Number.isFinite(ps.streak) && ps.streak >= 0 &&
            (ps.lastPlayedDate === null || typeof ps.lastPlayedDate === 'string') &&
            typeof ps.blitzHighScore === 'number' && Number.isFinite(ps.blitzHighScore) && ps.blitzHighScore >= 0 &&
            typeof ps.kakuroPuzzlesSolved === 'number' && Number.isFinite(ps.kakuroPuzzlesSolved) && ps.kakuroPuzzlesSolved >= 0 &&
            typeof ps.ghostDuelsWon === 'number' && Number.isFinite(ps.ghostDuelsWon) && ps.ghostDuelsWon >= 0 &&
            typeof ps.giftsSent === 'number' && Number.isFinite(ps.giftsSent) && ps.giftsSent >= 0
        ) {
            sanitized.parentStats = ps;
        } else {
            console.warn('Attempted to update profile with invalid parentStats, skipping update');
        }
    }

    if (updates.recentEquations !== undefined) {
        if (Array.isArray(updates.recentEquations) && updates.recentEquations.length <= 50) {
            // Validate each equation has required fields
            const valid = updates.recentEquations.every(eq =>
                isPlainObject(eq) &&
                typeof eq.equation === 'string' &&
                typeof eq.answer === 'number' && Number.isFinite(eq.answer) &&
                typeof eq.childCorrect === 'boolean' &&
                typeof eq.timestamp === 'number'
            );
            if (valid) {
                sanitized.recentEquations = updates.recentEquations;
            } else {
                console.warn('Attempted to update profile with invalid recentEquations, skipping update');
            }
        } else {
            console.warn('Attempted to update profile with invalid recentEquations (too many or wrong type), skipping update');
        }
    }
```

### 8.2 ProfileProvider Migration

In the `useState` initializer for `allProfiles`, add migration for existing
profiles:

```typescript
profiles = profiles.map(p => ({
    ...p,
    // ... existing migrations ...
    parentStats: p.parentStats ?? { ...DEFAULT_PARENT_STATS },
    recentEquations: p.recentEquations ?? [],
}));
```

### 8.3 ProfileContextType Extension

Add to the interface:

```typescript
interface ProfileContextType {
    // ... existing methods ...
    updateParentStats: (stats: Partial<ParentStats>) => void;
    appendEquation: (equation: Equation) => void;
}
```

Implementation:

```typescript
const updateParentStats = useCallback((stats: Partial<ParentStats>) => {
    if (!profile) return;
    const current = profile.parentStats ?? DEFAULT_PARENT_STATS;
    updateProfile(profile.id, {
        parentStats: { ...current, ...stats },
    });
}, [profile, updateProfile]);

const appendEquation = useCallback((equation: Equation) => {
    if (!profile) return;
    const recent = [...(profile.recentEquations || []), equation];
    if (recent.length > 50) recent.splice(0, recent.length - 50);
    updateProfile(profile.id, { recentEquations: recent });
}, [profile, updateProfile]);
```

---

## 9. ParentDashboard Integration

### 9.1 Add Zone Tab

```typescript
// In ParentDashboard.tsx
type TabId = 'profiles' | 'progress' | 'skills' | 'zone';

const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'profiles', label: t('parent.manageProfiles'), icon: '👥' },
    { id: 'progress', label: t('analytics.progress'), icon: '📈' },
    { id: 'skills', label: t('analytics.skillAnalysis'), icon: '📋' },
    { id: 'zone', label: t('parent.zoneTitle'), icon: '🎮' },  // NEW
];

// In tab content:
{activeTab === 'zone' && (
    <ParentZoneHub
        onBack={() => setActiveTab('profiles')}
        allProfiles={allProfiles}
        parentProfile={profile}
    />
)}
```

Need to add `allProfiles` and `profile` from `useProfile()` in ParentDashboard:

```typescript
import { useProfile } from '../../context/ProfileContext';
// ...
const { allProfiles, profile } = useProfile();
```

### 9.2 Alternative: Full-Screen Zone

If the zone should be full-screen rather than a tab, add a new view state:

```typescript
// In App.tsx
type View = 'select' | 'map' | 'game' | 'parent' | 'parent_zone' | 'pet';
```

But the tab approach is simpler and fits the existing pattern.

---

## 10. Test Strategy

### 10.1 New Test Files

| File | Tests |
|------|-------|
| `src/components/parent/__tests__/ParentZoneHub.test.tsx` | Renders 3 game cards, clicking a card shows game, back button returns |
| `src/components/parent/games/__tests__/ParentGhostDuel.test.tsx` | Loads equations from profile, ghost timer displays, victory detection, gift button sends coins |
| `src/components/parent/games/__tests__/ParentKakuroGame.test.tsx` | Grid renders, row/col sum validation, timer countdown, solve detection |
| `src/components/parent/games/__tests__/ParentSpeedBlitz.test.tsx` | Timer counts down, question generation, score tracking, game ends at 0s |
| `src/lib/__tests__/kakuroGenerator.test.ts` | Puzzle generation produces valid sums, no repeat digits, solution matches |
| `src/lib/__tests__/blitzGenerator.test.ts` | Question types generate correct answers, tier progression works |
| `src/context/__tests__/ProfileContext.parentStats.test.tsx` | parentStats validation, migration, appendEquation, updateParentStats |
| `src/context/__tests__/ProfileContext.isolation.test.tsx` | **Critical:** parent play never modifies kid capabilities/streak/sessions |

### 10.2 Key Test Cases

```typescript
// State isolation test — the critical one
describe('State Isolation: parent play cannot corrupt kid data', () => {
    it('parent game completion does not modify child capabilities', () => {
        const kidProfile = createKidProfile();
        const kidCapabilitiesBefore = kidProfile.capabilities;
        // Simulate parent playing blitz
        render(<ParentSpeedBlitz onComplete={...} onExit={...} />);
        // ... play through a blitz round ...
        // Verify kid capabilities unchanged
        expect(updatedKidProfile.capabilities).toEqual(kidCapabilitiesBefore);
    });

    it('gift adds coins to child without touching any other field', () => {
        const kid = createKidProfile({ coins: 50, streak: 7 });
        sendGift(kid.id, 10);
        const updated = getProfile(kid.id);
        expect(updated.coins).toBe(60);
        expect(updated.streak).toBe(7);          // unchanged
        expect(updated.capabilities).toEqual(kid.capabilities);  // unchanged
        expect(updated.sessionHistory).toEqual(kid.sessionHistory); // unchanged
    });

    it('parentStats only writes to parent profile, never kid', () => {
        updateParentStats({ blitzHighScore: 25 });
        const kid = allProfiles.find(p => !p.isParent);
        expect(kid.parentStats).toBeUndefined(); // or default, never modified
    });
});

// Kakuro validation
describe('Kakuro validation', () => {
    it('rejects repeated digits in a row', () => {
        const grid = [[3, 3, 3], [1, 2, 4], [5, 6, 7]];
        expect(validateKakuro(grid, puzzle)).toBe(false);
    });
    it('accepts a valid solution', () => {
        const grid = puzzle.cells.map(row => row.map(c => c.answer));
        expect(validateKakuro(grid, puzzle)).toBe(true);
    });
});

// SpeedBlitz timer
describe('SpeedBlitz timer', () => {
    it('ends game after 60 seconds', async () => {
        vi.useFakeTimers();
        render(<ParentSpeedBlitz onComplete={mockComplete} onExit={...} />);
        vi.advanceTimersByTime(60000);
        expect(mockComplete).toHaveBeenCalledWith(
            expect.objectContaining({ timeSec: 60 })
        );
        vi.useRealTimers();
    });
});
```

### 10.3 Existing Test Regression

All 921 existing tests must continue passing. The changes are additive:
- New fields on UserProfile are optional (`?`)
- New validation blocks in `validateProfileUpdate` are additive
- New tab in ParentDashboard doesn't change existing tabs
- No existing component signatures change

---

## 11. i18n Keys

### English (en.json) — Add to `parent`:

```json
{
  "parent": {
    "zoneTitle": "Game Zone",
    "zoneSubtitle": "Play, compete, and cheer on your kids",
    "zoneStreak": "{{count}} day streak",
    "ghostDuel": {
      "title": "Ghost Duel",
      "subtitle": "Beat your child's score",
      "description": "Replay your child's equations and race their ghost timer",
      "start": "Start Duel",
      "breakRecord": "Break the Record!",
      "childGhost": "Child's time",
      "yourTime": "Your time",
      "victory": "You won! 🎉",
      "defeat": "Child still faster! 💪",
      "sendHighFive": "Send High-Five + 10 coins",
      "highFiveSent": "High-Five sent! 🖐️",
      "noEquations": "Your child hasn't played yet today. Come back later!",
      "selectChild": "Select child to challenge"
    },
    "kakuro": {
      "title": "Kakuro Bubbles",
      "subtitle": "Cross-sum puzzle",
      "description": "Fill the grid so rows and columns sum to targets. No repeats!",
      "start": "Start Puzzle",
      "timeUp": "Time's up!",
      "solved": "Puzzle solved! 🧩",
      "rowSum": "Row",
      "colSum": "Col"
    },
    "blitz": {
      "title": "Mental Math Blitz",
      "subtitle": "60-second challenge",
      "description": "Rapid-fire arithmetic: percentages, negatives, chains",
      "start": "Start Blitz",
      "timeUp": "Time's up!",
      "score": "Score: {{count}}",
      "highScore": "Best: {{count}}",
      "newHighScore": "New High Score! 🏆"
    }
  }
}
```

### Hebrew (he.json) — Add to `parent`:

```json
{
  "parent": {
    "zoneTitle": "אזור משחקים",
    "zoneSubtitle": "שחקו, התחרו ועודדו את הילדים",
    "zoneStreak": "{{count}} ימים ברצף",
    "ghostDuel": {
      "title": "דו-קרב רפאים",
      "subtitle": "שברו את השיא של הילד",
      "description": "שחקו את התרגילים של הילד ונסו להקדים את הזמן שלו",
      "start": "התחל דו-קרב",
      "breakRecord": "שבור את השיא!",
      "childGhost": "זמן הילד",
      "yourTime": "הזמן שלך",
      "victory": "ניצחת! 🎉",
      "defeat": "הילד עדיין מהיר יותר! 💪",
      "sendHighFive": "שלח כיף חמש + 10 מטבעות",
      "highFiveSent": "כיף חמש נשלח! 🖐️",
      "noEquations": "הילד עדיין לא שיחק היום. חזרו מאוחר יותר!",
      "selectChild": "בחר ילד לאתגר"
    },
    "kakuro": {
      "title": "תשבץ מספרים",
      "subtitle": "פאזל חיבור צלב",
      "description": "מלאו את הטבלה כך ששורות ועמודות יסכמו ליעד. בלי חזרות!",
      "start": "התחל פאזל",
      "timeUp": "נגמר הזמן!",
      "solved": "פאזל פתור! 🧩",
      "rowSum": "שורה",
      "colSum": "עמודה"
    },
    "blitz": {
      "title": "אימון מוח למבוגרים",
      "subtitle": "אתגר 60 שניות",
      "description": "חשבון מהיר: אחוזים, מספרים שליליים, שרשראות",
      "start": "התחל בליץ",
      "timeUp": "נגמר הזמן!",
      "score": "תוצאה: {{count}}",
      "highScore": "שיא: {{count}}",
      "newHighScore": "שיא חדש! 🏆"
    }
  }
}
```

---

## 12. GA4 Events

### New Events to Register

Add to `src/hooks/useAnalytics.ts` AnalyticsEvent type:

```typescript
export type AnalyticsEvent =
    // ... existing events ...
    // Phase 2a: Parent Zone
    | 'parent_zone_open'
    | 'parent_game_start'
    | 'parent_game_complete'
    | 'parent_gift_sent';
```

### Event Parameters

```typescript
// parent_zone_open
{ profile_id: string }

// parent_game_start
{ game_mode: 'ghost_duel' | 'kakuro' | 'blitz' }

// parent_game_complete
{ game_mode: 'ghost_duel' | 'kakuro' | 'blitz', score: number, time_seconds: number, victory: boolean }

// parent_gift_sent
{ coin_amount: 10, recipient_kid_id: string }
```

### Logging Points

| Event | Where to log |
|-------|-------------|
| `parent_zone_open` | ParentZoneHub `useEffect` on mount |
| `parent_game_start` | Each game component on mount/start |
| `parent_game_complete` | Each game component `onComplete` handler |
| `parent_gift_sent` | GhostDuel gift button click handler |

---

## 13. Migration Plan

### 13.1 Profile Migration (Safe, Additive)

In `ProfileContext.tsx` `useState` initializer:

```typescript
profiles = profiles.map(p => ({
    ...p,
    // ... existing migrations ...
    parentStats: p.parentStats ?? { ...DEFAULT_PARENT_STATS },
    recentEquations: p.recentEquations ?? [],
}));
```

**Safety:** Both new fields are optional (`?`) on the type. Existing profiles
get default values. No data is lost or transformed.

### 13.2 Equation Logging (Retroactive)

`recentEquations` starts empty for all existing profiles. It populates as
children play new sessions. Ghost Duel will show "no equations yet" until the
child plays at least one session after this feature ships.

**Alternative:** If we want Ghost Duel to work immediately for existing users,
we could backfill `recentEquations` from `sessionHistory` by generating
plausible equations based on `skillFocus` and `gameMode`. But this would be
fake data — not recommended. Better to let it populate organically.

### 13.3 Deployment Sequence

1. Ship type changes + validateProfileUpdate + migration (no UI changes)
2. Ship equation logging in BubbleGameContainer (starts populating recentEquations)
3. Ship ParentZoneHub + 3 games + dashboard tab
4. Monitor GA4 for `parent_zone_open` and `parent_game_start` events

---

## 14. File Manifest

### New Files to Create

| Path | Purpose |
|------|---------|
| `src/components/parent/ParentZoneHub.tsx` | Hub with 3 game cards |
| `src/components/parent/games/ParentGhostDuel.tsx` | Ghost Duel game |
| `src/components/parent/games/ParentKakuroGame.tsx` | Kakuro puzzle game |
| `src/components/parent/games/ParentSpeedBlitz.tsx` | 60s blitz game |
| `src/lib/kakuroGenerator.ts` | Kakuro puzzle generation + validation |
| `src/lib/blitzGenerator.ts` | Blitz question generation |
| `src/types/equation.ts` | Equation type (or add to user.ts) |
| `src/types/kakuro.ts` | Kakuro types |
| `src/types/blitz.ts` | Blitz types |
| `src/components/parent/__tests__/ParentZoneHub.test.tsx` | Hub tests |
| `src/components/parent/games/__tests__/ParentGhostDuel.test.tsx` | Ghost Duel tests |
| `src/components/parent/games/__tests__/ParentKakuroGame.test.tsx` | Kakuro tests |
| `src/components/parent/games/__tests__/ParentSpeedBlitz.test.tsx` | Blitz tests |
| `src/lib/__tests__/kakuroGenerator.test.ts` | Generator tests |
| `src/lib/__tests__/blitzGenerator.test.ts` | Generator tests |
| `src/context/__tests__/ProfileContext.parentStats.test.tsx` | parentStats validation |
| `src/context/__tests__/ProfileContext.isolation.test.tsx` | State isolation |

### Existing Files to Modify

| Path | Changes |
|------|---------|
| `src/types/user.ts` | Add `ParentStats`, `Equation`, `parentStats?`, `recentEquations?` |
| `src/context/ProfileContext.tsx` | Add validation, migration, `updateParentStats`, `appendEquation` |
| `src/components/parent/ParentDashboard.tsx` | Add 'zone' tab, import ParentZoneHub |
| `src/components/games/BubbleGameContainer.tsx` | Add equation logging to `recentEquations` |
| `src/hooks/useAnalytics.ts` | Add 4 new event types |
| `src/i18n/locales/en.json` | Add parent.zone* keys |
| `src/i18n/locales/he.json` | Add parent.zone* keys |

---

## 15. Implementation Order

1. **Types** — Add `ParentStats`, `Equation`, `KakuroPuzzle`, `BlitzQuestion` to type files
2. **ProfileContext** — Add validation, migration, new context methods
3. **i18n** — Add all new keys to en.json and he.json
4. **Analytics** — Add new event types
5. **Generators** — `kakuroGenerator.ts`, `blitzGenerator.ts` (pure functions, testable)
6. **BubbleGameContainer** — Add equation logging
7. **ParentZoneHub** — Hub component with game selection
8. **ParentSpeedBlitz** — Simplest game (no dependency on child data)
9. **ParentKakuroGame** — Medium complexity (puzzle grid)
10. **ParentGhostDuel** — Most complex (depends on recentEquations, ghost timer)
11. **ParentDashboard** — Wire in the zone tab
12. **Tests** — Write all test files
13. **Verify** — Run full test suite, ensure 921+ tests pass

---

## 16. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| State isolation breach | Low | Critical | Dedicated isolation test file; gift only touches `coins` |
| localStorage bloat from recentEquations | Low | Medium | Capped at 50 entries × ~10 fields = ~5KB max per profile |
| Kakuro generation infinite loop | Medium | Low | Add retry counter, fall back to pre-built puzzles |
| Parent has no child profile to duel | Medium | Low | Empty state message, offer Blitz/Kakuro instead |
| Existing tests break | Low | High | All changes additive, optional fields, new tab doesn't affect existing tabs |

---

## 17. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Existing tests pass | 921+ | `npx vitest run` |
| New tests pass | 20+ new tests | `npx vitest run` |
| State isolation | 100% | Isolation test file passes |
| Parent Zone games | 3 playable | Manual + E2E |
| GA4 events fire | 4 events | Manual verification in debug mode |
