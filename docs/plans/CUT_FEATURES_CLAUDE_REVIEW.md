# Cut Features Review — Senior Game Architect Assessment

> **Date:** 2026-07-31
> **Reviewer:** Claude (senior game architect, council counsel)
> **Scope:** Post-Phase 4 deferred features — Story Mode, Parent Analytics, Number Bond Puzzle, + new creative proposals
> **Codebase:** Hebrew Math Adventures, PWA on Raspberry Pi, localStorage-only (no backend, hard constraint)
> **Target audience:** Israeli kids ages 5–11, Hebrew-first, mobile-first

---

## Architecture State Assessment

Phase 4 shipped solid arcade infrastructure. Here's what exists:

**Built and working:**
- 5-unit saga map (50 nodes) with star-gated progression
- Bubble game with 4 arcade modes (zen, classic, blitz, survival) + adaptive difficulty via `GameDirector`
- Math Memory Duel card-matching game with equation/answer pairs
- Math Invaders (Space Invaders style with descending equations, boss waves, frenzy)
- Daily challenges (date-seeded, deterministic, no backend) + 12 achievement badges
- Treasure shop with coins, cosmetics (mascots, bubble skins, particle effects)
- End-of-unit boss cinematic (5-second Framer Motion animation, one-time per unit)
- 20+ word problem templates in `ProblemFactory`
- Star rating, haptics (`navigator.vibrate`), real profile integration
- Firebase Analytics for event logging (no cloud sync)
- i18n with Hebrew + English (457 lines each)

**Key architecture patterns:**
- `GameDirector → MathModule → ProblemFactory` pipeline generates all problems
- `ProfileContext` is the single source of truth for user data (coins, badges, streaks, capabilities, inventory)
- `ProgressContext` tracks per-node star completion, keyed by profile ID in localStorage
- `QuestContext` manages daily challenges and stamp albums
- All game modes consume `MathModule.generateProblem()` — shared math engine
- `GameOrchestrator` routes node types to the correct game component
- `NodeType` enum includes `'STORY'` but no story component exists yet

**What's NOT built (the cut features):**
1. Story Mode — `NodeType.STORY` exists in the type system but zero story components
2. Parent Analytics Dashboard — current `ParentDashboard.tsx` is profile management only
3. Number Bond Puzzle — no `NumberBondStrategy` in `src/engines/bubble/strategies/`

---

## Feature 1: Story Mode

### Assessment

| Dimension | Rating |
|-----------|--------|
| Kid value | 🔴 High — narrative transforms "math practice" into "adventure" |
| Pedagogical value | 🟡 Medium — contextualized math is more memorable |
| Feasibility | 🟢 Good — existing `NodeType.STORY` + `GameOrchestrator` routing |
| Effort | M-L (right-sized version: M) |
| Risk | Medium — scope creep is the #1 enemy of story modes |

The original Gemini proposal envisioned a full branching comic with 8–12 panels per story, branch selection based on performance, and unique illustrations. That's a CMS disguised as a feature. **We don't need that.**

### Right-Sized Design: "Story Beats"

Instead of a full story engine, we add **story interludes** — short 3–4 panel comic sequences that play *before* a boss node and *after* completing a unit. Think of them as cutscenes, not interactive adventures.

**What stays:**
- Short character arcs per unit (mascot meets a character, faces a problem, solves it with math)
- Math problems embedded in the story context
- Hebrew-first narrative with emoji illustrations
- One story per unit (5 total)

**What gets cut:**
- Branching paths (too complex, too much content)
- Performance-based route selection (premature optimization)
- Unique illustrated panels (use emoji + Framer Motion instead)
- A full story engine state machine

### Proposed Architecture

**Data structure:**

```typescript
// src/types/story.ts
export interface StoryPanel {
  id: string;
  character: string;      // emoji
  background: string;     // tailwind gradient class
  textKey: string;        // i18n key for narration/dialogue
  speaker?: string;       // 'mascot' | 'character' | 'narrator'
  mathProblem?: {         // embedded math challenge
    type: string;
    level: number;
    config?: Record<string, unknown>;
  };
}

export interface StoryBeat {
  id: string;
  unitId: string;
  triggerNode: string;   // node ID that triggers this story
  panels: StoryPanel[];
  rewardCoins: number;
}
```

**Files to create:**

| File | Purpose | Effort |
|------|---------|--------|
| `src/types/story.ts` | Type definitions | 30 min |
| `src/data/stories/unit1_beach.ts` | Beach unit story (4 panels) | 1 hr |
| `src/data/stories/unit2_forest.ts` | Forest unit story | 1 hr |
| `src/data/stories/unit3_mountain.ts` | Mountain unit story | 1 hr |
| `src/data/stories/unit4_desert.ts` | Desert unit story | 1 hr |
| `src/data/stories/unit5_space.ts` | Space unit story | 1 hr |
| `src/data/stories/index.ts` | Story registry + lookup | 15 min |
| `src/components/story/StoryReader.tsx` | Panel renderer with Framer Motion transitions | 2 hrs |
| `src/components/story/StoryPanelView.tsx` | Single panel component (character + text + math) | 1 hr |

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/GameOrchestrator.tsx` | Route `STORY` nodes to `StoryReader` |
| `src/data/learningPath.ts` | Add STORY nodes before each boss node (5 nodes) |
| `src/i18n/locales/he.json` | Story text keys (~20 per story × 5 = 100 keys) |
| `src/i18n/locales/en.json` | English translations |
| `src/hooks/useAnalytics.ts` | Log `story_start`, `story_complete` events |

**UX Flow:**
1. Kid completes the penultimate node of a unit (e.g., `n1_9` Beach Master)
2. The next node is a STORY node ("The Octopus's Riddle")
3. StoryReader plays 3–4 panels: mascot meets octopus → octopus asks a math riddle → kid solves it → octopus opens the path to the boss
4. After the story, the boss node is unlocked
5. Story rewards 10 coins, can be replayed but not re-rewarded

**Key design decision:** The embedded math problem in the story panel uses the *same* `MathModule.generateProblem()` — no new math engine. The story is a thin narrative wrapper around existing problem generation.

**Story panel component sketch:**

```tsx
// src/components/story/StoryPanelView.tsx
interface StoryPanelViewProps {
  panel: StoryPanel;
  mascotEmoji: string;
  onMathAnswer?: (correct: boolean) => void;
}

// Renders: background gradient, character emoji (animated entrance),
// speech bubble with text, optional MathCard for embedded problems.
// Framer Motion slide transition between panels.
```

**Effort estimate:** 1.5–2 days total
- 5 hours: story content authoring (Hebrew text, panel design)
- 4 hours: StoryReader + StoryPanelView components
- 2 hours: GameOrchestrator routing + learning path integration
- 2 hours: i18n keys + testing

---

## Feature 2: Parent Analytics Dashboard

### Assessment

| Dimension | Rating |
|-----------|--------|
| Parent value | 🔴 High — turns the app from "game" to "learning tool" in parent eyes |
| Kid value | 🟢 Low (indirect — keeps app installed) |
| Feasibility | 🟢 Excellent — all data already exists in `profile.capabilities.skills` |
| Effort | M |
| Risk | Low — pure presentation, no data model changes |

The current `ParentDashboard.tsx` shows name, age, mascot, streak, and delete/edit buttons. Zero actionable insight. But the data for a rich analytics view is already being collected:

- `profile.capabilities.skills` — per-skill `attempts`, `correct`, `consecutiveCorrect`, `avgSpeedMs`
- `profile.arcadeStats` — best scores per arcade mode
- `profile.unlockedBadges` — badge collection
- `profile.streak` — daily streak
- `profile.coins` — economy balance
- `profile.dailyStamps` — daily challenge completion dates
- ProgressContext — per-node star ratings across 50 nodes

### Proposed Design

Transform the parent dashboard into a tabbed view with three sections:

**Tab 1: סקירה כללית (Overview)**
- Total stars earned / total possible (50 nodes × 3 = 150)
- Days active this week (from `dailyStamps`)
- Total time played (requires new lightweight session tracking — see below)
- Current streak
- Coins balance
- Badges earned count / 12

**Tab 2: ניתוח מיומנויות (Skill Analysis)**
- Per-skill accuracy bars: Addition 92%, Subtraction 64%, Multiplication 78%, etc.
- Per-skill avg response time
- Weakest skill highlighted with a "תרגל את זה" (Practice this) button that launches a targeted session
- Skill mastery progress (attempts vs. accuracy threshold)

**Tab 3: היסטוריית אימון (Practice History)**
- Simple weekly bar chart: correct answers per day (last 7 days)
- Daily challenge completion stamps calendar (GitHub-style heatmap)
- Recent badges unlocked

**Lightweight session tracking (new):**

```typescript
// src/types/user.ts — add to UserProfile
export interface SessionRecord {
  date: string;         // YYYY-MM-DD
  durationSec: number;
  correct: number;
  attempts: number;
  skillFocus: string;
}

// Add to UserProfile:
sessionHistory?: SessionRecord[];  // capped at 100 entries (7-day rolling window kept in full)
```

**Files to create:**

| File | Purpose | Effort |
|------|---------|--------|
| `src/components/parent/AnalyticsOverview.tsx` | Overview tab with stat cards | 1.5 hrs |
| `src/components/parent/SkillBreakdown.tsx` | Per-skill accuracy bars + response time | 2 hrs |
| `src/components/parent/WeeklyChart.tsx` | SVG bar chart (no library, pure React) | 2 hrs |
| `src/components/parent/PracticeHistory.tsx` | History tab + stamp calendar | 1.5 hrs |
| `src/components/parent/StatCard.tsx` | Reusable stat card (icon, label, value) | 30 min |
| `src/lib/skillAnalysis.ts` | Derive insights from `capabilities.skills` | 1 hr |

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/parent/ParentDashboard.tsx` | Add tab navigation, render 3 tab components |
| `src/types/user.ts` | Add `SessionRecord` type, `sessionHistory` field |
| `src/context/ProfileContext.tsx` | Add `recordSession()` method, cap history at 100 |
| `src/components/PracticeMode.tsx` | Call `recordSession()` on session end |
| `src/components/games/BubbleGameContainer.tsx` | Call `recordSession()` on game over |
| `src/components/games/MemoryDuelGame.tsx` | Call `recordSession()` on completion |
| `src/components/games/MathInvadersGame.tsx` | Call `recordSession()` on completion |
| `src/i18n/locales/he.json` | ~30 new keys for analytics labels |
| `src/i18n/locales/en.json` | English translations |

**Skill accuracy calculation:**

```typescript
// src/lib/skillAnalysis.ts
export interface SkillInsight {
  skillKey: string;
  labelKey: string;
  attempts: number;
  correct: number;
  accuracy: number;       // 0-1
  avgSpeedMs: number;
  isWeakest: boolean;
  isStrongest: boolean;
}

export function deriveSkillInsights(
  skills: Record<string, SkillStats>
): SkillInsight[] {
  const SKILL_LABELS: Record<string, string> = {
    addition: 'skills.addition',
    addition_carry: 'skills.addition_carry',
    subtraction: 'skills.subtraction',
    subtraction_borrow: 'skills.subtraction_borrow',
    multiplication: 'skills.multiplication',
    division: 'skills.division',
    series: 'skills.series',
    comparison: 'skills.comparison',
    word_problems: 'skills.word_problems',
  };

  const insights = Object.entries(skills)
    .filter(([_, stats]) => stats.attempts >= 3) // need minimum data
    .map(([key, stats]) => ({
      skillKey: key,
      labelKey: SKILL_LABELS[key] || `skills.${key}`,
      attempts: stats.attempts,
      correct: stats.correct,
      accuracy: stats.attempts > 0 ? stats.correct / stats.attempts : 0,
      avgSpeedMs: stats.avgSpeedMs,
      isWeakest: false,
      isStrongest: false,
    }));

  if (insights.length === 0) return [];

  // Mark weakest and strongest by accuracy
  const sorted = [...insights].sort((a, b) => a.accuracy - b.accuracy);
  if (sorted[0]) sorted[0].isWeakest = true;
  if (sorted[sorted.length - 1]) sorted[sorted.length - 1].isStrongest = true;

  return sorted;
}
```

**Weekly chart (pure SVG, no library):**

```tsx
// src/components/parent/WeeklyChart.tsx
// Renders a 7-bar SVG chart of correct answers per day.
// Width: 100% container, height: 120px.
// Each bar: day label (א ב ג ד ה ו ש) + bar height proportional to correct count.
// Colors: gradient from blue-400 to blue-600.
// If no data for a day, bar height = 0 with faded label.
```

**"Practice this" button flow:**
1. Parent clicks "תרגל את זה" next to weakest skill
2. Parent gate confirms "Start practice for [child name]?"
3. App launches `PracticeMode` with `problemConfig` targeting that skill type
4. This uses the existing `problemConfig` prop — no new code in PracticeMode

**Effort estimate:** 1.5 days total
- 4 hours: SkillBreakdown + WeeklyChart + PracticeHistory components
- 2 hours: AnalyticsOverview + StatCard
- 2 hours: Session tracking plumbing (recordSession in 4 game modes)
- 2 hours: skillAnalysis lib + ParentDashboard tab navigation
- 2 hours: i18n + testing

---

## Feature 3: Number Bond Puzzle

### Assessment

| Dimension | Rating |
|-----------|--------|
| Kid value | 🟡 Medium — new game mode adds variety |
| Pedagogical value | 🔴 High — number bonds are core curriculum for ages 5–7 |
| Feasibility | 🟢 Good — reuses bubble engine infrastructure |
| Effort | M |
| Risk | Low — new strategy class, no changes to existing code |

Number bonds (השלמת לעשר, חיבור עד 10) are a foundational skill in Israeli math curriculum for 1st–2nd grade. The current app has no mode that teaches number decomposition — the bubble game is "see equation, pop answer." Number bonds are a fundamentally different cognitive task: "which two numbers combine to make this target?"

### Proposed Design

**Gameplay:**
- A target number appears at the top (e.g., 🎯 10)
- Bubbles float up with various numbers (3, 7, 4, 6, 2, 8, 5, 5)
- Kid must tap two bubbles that sum to the target
- Correct pair: both pop with a satisfying chain animation + "חיבור מושלם!" feedback
- Wrong pair: gentle "נסה שוב" + the bubbles bounce apart
- After 5 correct pairs, the target changes
- Progressive difficulty: targets start at 5, increase to 10, then 20

**Architecture:**

This reuses the bubble game's visual layer but needs a **new interaction model** (tap-two instead of tap-one). Two approaches:

**Option A: New BubbleStrategy** (preferred — less code, more reuse)

```typescript
// src/engines/bubble/strategies/NumberBondStrategy.ts
import type { IGameBehavior } from '../types';

export class NumberBondStrategy implements IGameBehavior {
  private target: number;
  private selectedBubbleId: number | null = null;

  constructor(config: { initialTarget: number }) {
    this.target = config.initialTarget;
  }

  generateProblem(level: number): BubbleContent[] {
    // Generate 6-8 bubbles where at least 3 pairs sum to target
    // plus distractors that don't pair with anything
  }

  onBubbleTap(bubbleId: number, bubbles: BubbleContent[]): TapResult {
    if (this.selectedBubbleId === null) {
      this.selectedBubbleId = bubbleId;
      return { type: 'SELECT', bubbleId };
    }

    const first = bubbles.find(b => b.id === this.selectedBubbleId);
    const second = bubbles.find(b => b.id === bubbleId);

    if (first && second && first.value + second.value === this.target) {
      this.selectedBubbleId = null;
      return { type: 'PAIR_CORRECT', bubbleIds: [this.selectedBubbleId!, bubbleId] };
    }

    // Wrong pair — deselect first
    this.selectedBubbleId = null;
    return { type: 'PAIR_WRONG', bubbleId };
  }

  getProgress(): number { /* pairs completed */ }
  getWinCondition(): boolean { /* 5 pairs completed */ }
}
```

**Option B: Standalone component** (if the bubble engine's tap model is too rigid)

A simpler standalone component that renders its own bubbles with CSS animations. Less reuse but more control. This is the fallback if the bubble engine's `onBubbleTap` doesn't support multi-select.

**Files to create:**

| File | Purpose | Effort |
|------|---------|--------|
| `src/engines/bubble/strategies/NumberBondStrategy.ts` | Game logic for pair-matching | 2 hrs |
| `src/components/games/NumberBondGame.tsx` | Game UI (or wrapper around BubbleGame) | 2 hrs |
| `src/lib/numberBonds.ts` | Pair generation logic | 1 hr |

**Files to modify:**

| File | Change |
|------|--------|
| `src/engines/bubble/types.ts` | Add `'number_bond'` to game mode types if needed |
| `src/lib/arcadeModes.ts` | Add `number_bond` mode label + config |
| `src/components/games/ModeSelectorOverlay.tsx` | Add Number Bond card |
| `src/components/map/SagaMap.tsx` | Add to arcade mode selector |
| `src/components/GameOrchestrator.tsx` | Route `NUMBER_BOND` mode |
| `src/data/learningPath.ts` | Add number bond nodes to units 1–2 |
| `src/i18n/locales/he.json` | ~15 new keys |
| `src/i18n/locales/en.json` | English translations |

**Pair generation logic:**

```typescript
// src/lib/numberBonds.ts
export interface BondPair {
  a: number;
  b: number;
  sum: number;
}

export function generateBondSet(
  target: number,
  pairCount: number,
  distractorCount: number
): number[] {
  const numbers: number[] = [];
  const used = new Set<string>();

  // Generate valid pairs
  for (let i = 0; i < pairCount; i++) {
    const a = Math.floor(Math.random() * (target - 1)) + 1;
    const b = target - a;
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (!used.has(key)) {
      used.add(key);
      numbers.push(a, b);
    }
  }

  // Generate distractors (numbers that don't pair to target)
  while (numbers.length < pairCount * 2 + distractorCount) {
    const d = Math.floor(Math.random() * (target + 5)) + 1;
    if (!numbers.includes(d) && d !== target) {
      numbers.push(d);
    }
  }

  // Shuffle
  return numbers.sort(() => Math.random() - 0.5);
}
```

**Effort estimate:** 1 day total
- 3 hours: NumberBondStrategy + pair generation
- 2 hours: NumberBondGame component (or BubbleGame integration)
- 1 hour: Arcade mode integration + learning path nodes
- 2 hours: i18n + testing

---

## Feature 4: New Creative Proposals

### 4A. 🎉 Holiday Mode — Israeli/Hebrew Calendar Seasonal Content

**What:** The app detects the current Hebrew date and themes itself accordingly. During Rosh Hashanah, bubbles become apples and honey pots. During Hanukkah, the saga map gets a candle theme and daily challenges give double coins. During Pesach, word problems feature matzah and frogs. During Tu BiShvat, the treasure shop gets a tree-planting item. This is **not** a new game mode — it's a theming layer that overlays existing modes.

**Why it's high value:**
- Israeli kids' lives are structured around the Hebrew calendar. An app that "knows" it's Rosh Hashanah creates an instant emotional connection.
- Seasonal content is the #1 engagement driver in kids' apps (see: Khan Academy Kids seasonal themes, PBS Kids holiday episodes).
- It's cheap to build — mostly CSS class swaps, emoji swaps, and a few i18n keys. No new game logic.

**Architecture:**

```typescript
// src/lib/hebrewCalendar.ts
export interface HebrewHoliday {
  name: string;
  emoji: string;
  themeClass: string;        // tailwind class for background
  bubbleEmoji?: string;      // override bubble visual
  coinMultiplier?: number;   // holiday bonus
  shopItems?: string[];      // seasonal shop items
}

export function getCurrentHoliday(): HebrewHoliday | null {
  // Use a lightweight Hebrew date conversion (hardcode major dates for 2025-2027,
  // or use the `hebcal` npm package if bundle size allows)
  // Returns null if no holiday is active
}
```

**Files to create:**

| File | Purpose | Effort |
|------|---------|--------|
| `src/lib/hebrewCalendar.ts` | Hebrew date → holiday detection | 2 hrs |
| `src/components/seasonal/HolidayBanner.tsx` | Top-of-map holiday notice | 30 min |
| `src/data/seasonalShopItems.ts` | Seasonal cosmetic items | 1 hr |

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/map/SagaMap.tsx` | Render holiday banner, apply theme class |
| `src/components/sensory/Bubble.tsx` | Accept `bubbleEmoji` override |
| `src/context/QuestContext.tsx` | Apply `coinMultiplier` to daily rewards |
| `src/data/shopItems.ts` | Merge seasonal items during holidays |
| `src/i18n/locales/he.json` | Holiday greeting strings |

**Effort:** 0.5 days (for first holiday — Rosh Hashanah only)
**Ongoing:** 1 hr per holiday added to the calendar (6 major holidays = 6 hrs total)

**Holidays to support (Year 1):**
1. Rosh Hashanah ( apples + honey)
2. Yom Kippur (quiet theme, reflection)
3. Sukkot (leaf huts, stars)
4. Hanukkah (menorah, dreidels, double coins)
5. Tu BiShvat (trees, flowers, planting)
6. Pesach (matzah, frogs, spring)

### 4B. 🌈 Accessibility Mode — "Gentle Play"

**What:** A profile-level setting (toggled in parent dashboard) that transforms the experience for kids who need a calmer pace:
- **No timer** in any arcade mode (forces zen-like behavior)
- **Larger bubbles** (1.5× default size, easier to tap)
- **Slower spawn rate** (50% slower)
- **No "wrong" sound** — replaced with gentle "try again" chime
- **No strikes/fail conditions** — endless mode only
- **Higher contrast** bubbles (dark text on bright background, no gradients)
- **Longer feedback delay** (3s instead of 2s on correct, to process)

**Why it's high value:**
- Covers kids with ADHD, fine motor delays, sensory sensitivity, and younger kids (age 4–5)
- Israeli inclusion classrooms (כיתות תקינויות) are growing — this makes the app viable for them
- It's pure configuration — no new game logic, just a profile flag that the game modes read

**Architecture:**

```typescript
// src/types/user.ts — add to UserProfile
settings: {
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  // NEW:
  accessibilityMode?: boolean;
};

// src/lib/gameConfig.ts — new helper
export function getAccessibilityOverrides(profile: UserProfile) {
  if (!profile.settings.accessibilityMode) return {};
  return {
    bubbleScale: 1.5,
    spawnIntervalMultiplier: 1.5,
    failCondition: { type: 'none' }, // no fail
    winCondition: { type: 'endless', value: 0 },
    feedbackDelayMs: 3000,
    highContrast: true,
    gentleSounds: true,
  };
}
```

**Files to modify:**

| File | Change |
|------|--------|
| `src/types/user.ts` | Add `accessibilityMode` to settings |
| `src/components/parent/ParentDashboard.tsx` | Add toggle in edit profile modal |
| `src/components/parent/EditProfileModal.tsx` | Add accessibility toggle |
| `src/components/games/BubbleGameContainer.tsx` | Read accessibility overrides |
| `src/components/sensory/Bubble.tsx` | Apply scale + high contrast |
| `src/hooks/useSound.ts` | Swap sound set when gentle mode active |
| `src/components/games/ArcadeHUD.tsx` | Hide timer when accessibility on |
| `src/lib/gameConfig.ts` | New: override helper |

**Effort:** 0.5 days

### 4C. 🤖 "Ask the Mascot" — Hint System Upgrade

**What:** Transform the existing hint system from a formula display into an interactive dialogue with the kid's mascot. When a kid gets stuck (2 consecutive wrong answers on the same problem), the mascot pops up with a **progressive hint ladder**:

1. **Hint 1 (Visual):** Mascot says "Look! 3 + 4... let's count together!" and animates counting on fingers/objects.
2. **Hint 2 (Strategy):** Mascot says "Try breaking it down: 3 + 3 = 6, then add 1 more!"
3. **Hint 3 (Answer reveal):** Mascot says "The answer is 7! Now try: what's 3 + 5?"

This replaces the current `HintVisualizer` and `AdditionHint` components with a unified, character-driven hint system.

**Why it's high value:**
- Kids talk to their mascots. A mascot that *helps* is a mascot that matters.
- Progressive hints teach problem-solving strategies, not just answers.
- The mascot character (owl, bear, ant, lion) gets a personality — this builds emotional attachment.
- It directly addresses the "kid gets stuck and quits" problem.

**Architecture:**

```typescript
// src/hooks/useMascotHint.ts
export interface HintLevel {
  level: 1 | 2 | 3;
  textKey: string;
  animation?: 'count_fingers' | 'break_down' | 'show_answer';
  answerReveal?: boolean;
}

export function useMascotHint(problem: Problem, consecutiveWrong: number) {
  // Returns null until 2 consecutive wrongs, then escalates
  const [hintLevel, setHintLevel] = useState(0);

  useEffect(() => {
    if (consecutiveWrong >= 2 && hintLevel < 3) {
      setHintLevel(prev => Math.min(prev + 1, 3));
    }
    if (consecutiveWrong === 0) {
      setHintLevel(0);
    }
  }, [consecutiveWrong]);

  // Generate hint content based on problem type
  const hints: HintLevel[] = generateHints(problem);
  return hintLevel > 0 ? hints[hintLevel - 1] : null;
}
```

**Files to create:**

| File | Purpose | Effort |
|------|---------|--------|
| `src/hooks/useMascotHint.ts` | Progressive hint ladder logic | 1.5 hrs |
| `src/components/mascot/MascotHint.tsx` | Mascot dialogue with hint animation | 2 hrs |

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/PracticeMode.tsx` | Track consecutive wrongs, trigger mascot hint |
| `src/components/mascot/Mascot.tsx` | Add hint animations (finger counting, etc.) |
| `src/components/HintVisualizer.tsx` | Deprecate or wrap with MascotHint |
| `src/i18n/locales/he.json` | ~20 hint dialogue keys |

**Effort:** 0.75 days

### 4D. 📴 PWA Offline Resilience & "Continue Anywhere"

**What:** The app is already a PWA, but there's no offline indicator, no "install to home screen" prompt, and no graceful degradation if localStorage is full. This feature adds:
- An offline banner when the app detects no internet ( reassure: "אתה יכול להמשיך לשחק! הנתונים נשמרים במכשיר")
- A "התקן על מסך הבית" (Install to Home Screen) prompt with a mini-tutorial, shown after 3 sessions
- localStorage quota detection — if `setItem` throws, show a gentle "אין מספיק מקום" message
- A `beforeinstallprompt` event capture to show a custom install banner instead of the browser's default

**Why it's high value:**
- Israeli kids often play on shared family tablets with flaky internet. The app needs to work perfectly offline.
- The "install to home screen" flow is critical for retention — kids who install re-open 3× more often.
- localStorage is 5MB on most browsers. With coins, badges, session history, and 10 profiles, we could hit that limit. We need graceful handling.

**Files to create:**

| File | Purpose | Effort |
|------|---------|--------|
| `src/hooks/useOnlineStatus.ts` | Network status hook | 30 min |
| `src/components/system/OfflineBanner.tsx` | Top-of-screen banner | 30 min |
| `src/components/system/InstallPrompt.tsx` | Custom PWA install prompt | 1 hr |
| `src/lib/storageQuota.ts` | Quota detection + graceful error | 30 min |

**Files to modify:**

| File | Change |
|------|--------|
| `src/App.tsx` | Wrap with OfflineBanner + InstallPrompt |
| `src/context/ProfileContext.tsx` | Wrap `localStorage.setItem` in try/catch with quota check |
| `src/i18n/locales/he.json` | ~10 new keys |

**Effort:** 0.5 days

---

## Recommended Sprint Ordering

Ranked by **impact → effort ratio**, with dependency chains noted.

### Sprint 5A: "Meaningful Data" (2.5 days)

| # | Feature | Impact | Effort | Day |
|---|---------|--------|--------|-----|
| 1 | **Parent Analytics Dashboard** | 🟠 High | 1.5 days | 1–2 |
| 2 | **PWA Offline Resilience** | 🟡 Medium | 0.5 days | 2 |
| 3 | **Accessibility Mode** | 🟡 Medium | 0.5 days | 2.5 |

**Rationale:** The data for analytics already exists. Session tracking is a small addition. PWA resilience and accessibility are both half-day features that make the app more robust and inclusive. Together they make the app "parent-ready" and "device-ready."

### Sprint 5B: "Number Bonds + Hints" (2 days)

| # | Feature | Impact | Effort | Day |
|---|---------|--------|--------|-----|
| 4 | **Number Bond Puzzle** | 🟡 Medium | 1 day | 3 |
| 5 | **Mascot Hint System** | 🟠 High | 0.75 days | 3.75 |

**Rationale:** Number bonds fill a real curriculum gap (number decomposition, ages 5–7). The mascot hint system addresses the #1 frustration point (kid gets stuck, gives up). Both are self-contained.

### Sprint 5C: "Story Time" (2 days)

| # | Feature | Impact | Effort | Day |
|---|---------|--------|--------|-----|
| 6 | **Story Mode (5 story beats)** | 🟠 High | 2 days | 4–5 |

**Rationale:** Story mode is the highest-delight feature but also the highest scope. It goes last because it benefits from having all other systems in place — coins to reward, badges to earn, hints to help stuck kids, accessibility mode for younger story consumers. The right-sized version (4 panels per unit, no branching) keeps it to 2 days.

### Sprint 5D: "Seasonal Surprise" (0.5 days, rolling)

| # | Feature | Impact | Effort | Day |
|---|---------|--------|--------|-----|
| 7 | **Holiday Mode (Rosh Hashanah first)** | 🟡 Medium | 0.5 days | 5.5 |

**Rationale:** Holiday theming is cheapest per unit of delight but needs to be timed to the calendar. Start with Rosh Hashanah (September 2026), add one holiday per sprint. By next year, all 6 major holidays are themed.

---

## Total Effort Summary

| Feature | Effort | Sprint |
|---------|--------|--------|
| Parent Analytics Dashboard | 1.5 days | 5A |
| PWA Offline Resilience | 0.5 days | 5A |
| Accessibility Mode | 0.5 days | 5A |
| Number Bond Puzzle | 1 day | 5B |
| Mascot Hint System | 0.75 days | 5B |
| Story Mode (right-sized) | 2 days | 5C |
| Holiday Mode (first holiday) | 0.5 days | 5D |
| **Total** | **6.75 days** | **~1.5 weeks** |

---

## What I'm Explicitly NOT Recommending (and why)

- **Full branching story engine:** Too much scope. The right-sized 4-panel story beats deliver 80% of the delight at 20% of the effort. Branching can be added later if engagement data justifies it.

- **Leaderboards / social features:** localStorage-only is a hard constraint. No backend means no leaderboards. This stays cut until cloud sync exists.

- **Speech recognition / voice answers:** Israeli Hebrew speech recognition is unreliable on mobile browsers. The tech isn't ready for kids' voices in Hebrew.

- **AI-generated content:** Dynamic problem generation already exists via `MathModule`. AI-generated stories would be a maintenance and quality nightmare for a kids' app.

- **Parent push notifications:** No backend = no push. The app is PWA-installable but push requires a service worker + server. Cut until backend exists.

- **Multi-player / sibling vs. mode:** UI complexity on mobile. The Memory Duel already serves the "two siblings take turns" use case adequately.

- **Rewind / practice history replay:** Recording and replaying sessions is a debugging feature, not a kid feature. Skip.

- **Gamification fatigue prevention (anti-streak-loss, etc.):** The streak system is simple enough (consecutive days) that fatigue prevention is premature. Add it only if we see kids getting frustrated by streak loss — which we can detect via analytics.

---

## Technical Implementation Notes

### Story Mode integration point

```typescript
// In GameOrchestrator.tsx, add:
if (effectiveMode === 'STORY') {
  const story = getStoryForNode(node?.id);
  if (story) {
    return (
      <StoryReader
        story={story}
        mascotId={profile?.mascotId || 'owl'}
        onComplete={(success) => {
          if (node && success) {
            completeNode(node.id, 3);
            // Story nodes give flat 3 stars — they're narrative, not tests
          }
          onExit();
        }}
        onExit={onExit}
      />
    );
  }
}
```

### Session recording in PracticeMode

```typescript
// In PracticeMode.tsx, on session end:
const { recordSession } = useProfile();
// ...
recordSession({
  date: new Date().toISOString().slice(0, 10),
  durationSec: Math.floor((Date.now() - sessionStartRef.current) / 1000),
  correct: session.correct,
  attempts: session.attempts,
  skillFocus: problemConfig?.type || 'mixed',
});
```

### Number Bond as a learning path node

```typescript
// In learningPath.ts, unit_1, after n1_6 (Sum to 10):
{
  id: 'n1_6b',
  unitId: 'unit_1',
  title: 'Make 10',
  description: 'Find pairs that sum to 10',
  type: 'SENSORY', // or a new NUMBER_BOND type
  position: { x: 60, y: 660 },
  targetLevel: 2,
  config: { gameMode: 'number_bond', target: 10, pairCount: 5 }
},
```

### Holiday detection without a full Hebrew calendar library

```typescript
// Hardcode major holiday dates for next 3 years (2025-2027)
// This avoids adding a Hebrew calendar dependency.
const HOLIDAY_DATES_2026: Record<string, HebrewHoliday> = {
  '2026-09-11': { name: 'rosh_hashanah', emoji: '🍯', ... },
  '2026-09-12': { name: 'rosh_hashanah', emoji: '🍯', ... },
  // ... etc
};
// Check today's Gregorian date against the map.
```

This is fragile (needs manual updates) but avoids a 50KB+ Hebrew calendar library. A better long-term solution is `@hebcal/core` (35KB gzipped) but for a kids' app on a Pi, the hardcoded approach is pragmatic.

---

## Council Sign-off

This plan is deliberately scoped for a localStorage-only PWA running on a Raspberry Pi, serving Israeli kids ages 5–11 on mobile web. Every feature either:
- **Makes data meaningful** (Parent Analytics, Session Tracking)
- **Fills a curriculum gap** (Number Bonds, Story Mode)
- **Reduces frustration** (Mascot Hints, Accessibility Mode)
- **Creates emotional connection** (Story Mode, Holiday Mode)
- **Hardens the platform** (PWA Offline)

No backend. No cloud sync. No bloat. Each feature is independently shippable.

The #1 priority is **Parent Analytics** — it turns the existing data into the "parent audit" survival tool. The #2 priority is **Story Mode** — it's the feature kids will tell their friends about. Everything else layers on top.

— Claude, Senior Game Architect