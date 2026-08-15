# Phase 5: Combo Fusion Mode — Build Artifact

**Card:** ddd5c1cd-1b4b-4134-bcdf-54684748c025
**Branch:** sdlc/loop-v0
**Model:** gemini-3.1-pro-high (via `ask-agy`, 37,514 tokens served)
**Date:** 2026-08-15

## Model Delegation Log

| Attempt | Tool | Result |
|---------|------|--------|
| 1 | `ask-claude --escalate --card ddd5c1cd...` | Session limit — "resets 2pm (Asia/Jerusalem)" |
| 2 | `ask-claude --card ddd5c1cd...` (no escalate) | Session limit — same message |
| 3 | `ask-claude --card ddd5c1cd...` (minimal test) | Session limit — same message |
| 4 | `ask-agy` (gemini-3.1-pro-high) | **SUCCESS** — 37,514 tokens, full analysis returned |

Per card instructions: the `--card` flag was passed on all Claude attempts. Claude did not serve
(no model-usage.jsonl entry created). The `ask-agy` tool served via gemini-3.1-pro-high and returned
a complete analysis. The artifact below is built from that Gemini analysis, validated and enriched
by builder-agent (glm-5.2) codebase inspection.

---

## Summary

Combo Fusion is a new opt-in arcade mode where chaining correct answers spawns Fusion Bubbles.
Popping a Fusion Bubble merges nearby bubbles into a single high-value score event worth
combo_points × multiplier. Multiplier tiers scale with streak length: 3-streak=1.5×, 5-streak=2×,
7-streak=3×, 10-streak=5×. The mode tracks fusion streaks separately from normal combo streaks
to keep the mechanic distinct from the existing frenzy system.

The design extends `MathBehaviorStrategy` (reuse math generation, distractor bags, anti-repeat)
and extends `BubbleGameContainer` (reuse game loop, HUD, session leveling) with conditional
fusion-specific rendering and state tracking.

---

## Baseline

- **Tests:** 921 passing (50 test files) — verified before work
- **Branch:** `sdlc/loop-v0`
- **HEAD:** `54f39f4 fix(build): LessonModal step→stepType prop, exclude test files from tsc -b`
- **Key files inspected:**
  - `src/types/game.ts` — ArcadeMode type (zen | classic | blitz | survival)
  - `src/engines/bubble/types.ts` — BubbleEntity, GameConfig, IGameBehavior, GameState, PowerUpState
  - `src/engines/bubble/strategies/MathStrategy.ts` — MathBehaviorStrategy (760+ lines)
  - `src/engines/bubble/useGameEngine.ts` — game loop, combo/frenzy/scoring logic (765 lines)
  - `src/lib/worldConfig.ts` — ARCADE_CONFIGS, FRENZY_CONFIG, SCORING_CONFIG, BUBBLE_ENGINE_CONFIG
  - `src/lib/arcadeModes.ts` — getArcadeModeConfig(), ExtendedArcadeMode
  - `src/components/sensory/BubbleGame.tsx` — base config + arcade mode override + Director tuning
  - `src/components/games/BubbleGameContainer.tsx` — main game UI, session leveling, boss, power-ups
  - `src/components/games/ModeSelectorOverlay.tsx` — practice mode selection (5 cards)
  - `src/hooks/usePracticeSession.ts` — GameMode type (STANDARD | TIME_ATTACK | SURVIVAL | MEMORY | INVADERS)
  - `src/i18n/locales/en.json` — English strings (24 top-level keys)
  - `src/i18n/locales/he.json` — Hebrew strings
  - `docs/sdlc/pet-superpowers/0-build.md` — prior build artifact pattern reference

---

## 1. Architecture Decision: Extend, Don't Rebuild

### Decision: ComboFusionStrategy extends MathBehaviorStrategy

| Factor | Extend MathBehaviorStrategy | New IGameBehavior from scratch |
|--------|---------------------------|-------------------------------|
| Math generation | Reuse MathModule, problem signatures, anti-repeat | Must re-implement all |
| Distractor logic | Reuse pedagogical misconception distractors | Must re-implement |
| Boss gate | Inherited (boss gates work in fusion mode too) | Must re-implement |
| Spawn bag | Reuse target/distractor ratio bag | Must re-implement |
| Fusion injection | Override `generateNext()` to add `isFusion` flag | Clean but duplicative |
| Test surface | Only test fusion-specific behavior; inherit existing tests | Must test everything |

**Rationale:** MathBehaviorStrategy is 760+ lines of battle-tested logic with anti-repeat,
pedagogical distractors, boss gates, and spawn-bag ratio management. Rebuilding would duplicate
all of this. Extending lets us override only `generateNext()` to inject fusion properties.

### Decision: Extend BubbleGameContainer, no separate ComboFusionContainer

| Factor | Extend BubbleGameContainer | New ComboFusionContainer |
|--------|---------------------------|-------------------------|
| Game loop | Reuse useGameEngine, spawn credits, entity lifecycle | Must wire all from scratch |
| Session leveling | Reuse adaptive difficulty, Director tuning | Must re-implement |
| Power-ups | Reuse existing power-up system | Must re-implement or disable |
| Boss battles | Reuse boss spawn/health logic | Must re-implement or disable |
| Fusion HUD | Conditional render when `mode === 'combo_fusion'` | Clean separation |
| Code duplication | Minimal — a few conditional blocks | Significant — 400+ lines copied |

**Rationale:** BubbleGameContainer handles session leveling, boss spawns, power-up toasts,
adaptive difficulty, and the entire game loop. A separate container would duplicate all of this.
Conditional rendering for fusion-specific UI (fusion HUD, merge animations, fusion streak counter)
keeps the fusion code isolated and readable.

---

## 2. New Types

### 2.1 ArcadeMode Extension (src/types/game.ts)

```typescript
// Current:
export type ArcadeMode = 'zen' | 'classic' | 'blitz' | 'survival';

// New:
export type ArcadeMode = 'zen' | 'classic' | 'blitz' | 'survival' | 'combo_fusion';
```

### 2.2 BubbleEntity Extensions (src/engines/bubble/types.ts)

```typescript
export interface BubbleEntity<T = any> {
    // ... all existing fields ...

    // --- Combo Fusion Properties ---
    /** Marks this bubble as a Fusion Bubble (special visual, triggers merge on pop) */
    isFusion?: boolean;
    /** The multiplier tier applied when this fusion bubble is popped */
    fusionMultiplier?: number;
    /** Marks this bubble as consumed by a merge (for animation before removal) */
    isMerged?: boolean;
    /** The calculated point value of a merged bubble (displayed in floating text) */
    mergeValue?: number;
    /** Tier index (0=none, 1=1.5×, 2=2×, 3=3×, 4=5×) for visual styling */
    fusionTier?: 0 | 1 | 2 | 3 | 4;
}
```

### 2.3 Fusion State (src/engines/bubble/types.ts)

```typescript
/** Fusion-specific game state, tracked alongside GameState */
export interface FusionState {
    /** Current fusion streak (correct answers in a row, separate from normal combo) */
    fusionStreak: number;
    /** Maximum fusion streak achieved this session */
    maxFusionStreak: number;
    /** Total number of fusion bubbles spawned this session */
    fusionBubblesSpawned: number;
    /** Total number of merges completed this session */
    totalMerges: number;
    /** Total points earned from merges */
    totalMergePoints: number;
    /** Whether a fusion bubble is currently on screen */
    fusionBubbleActive: boolean;
}

/** A merge event for UI animation */
export interface MergeEvent {
    id: string;
    /** The fusion bubble that was popped (center of merge) */
    centerId: string;
    /** IDs of bubbles consumed in the merge */
    consumedIds: string[];
    /** Center position for animation origin */
    centerX: number;
    centerY: number;
    /** Points earned from the merge */
    points: number;
    /** Multiplier applied */
    multiplier: number;
    /** Tier for visual styling */
    tier: 1 | 2 | 3 | 4;
    /** Timestamp for cleanup */
    timestamp: number;
}
```

### 2.4 Fusion Config (src/lib/worldConfig.ts)

```typescript
export interface FusionConfig {
    /** Streak thresholds → multiplier mapping */
    STREAK_TIERS: Readonly<Record<number, number>>;
    /** Pixel radius for merge absorption (relative to bubble x%,y coordinates) */
    MERGE_RADIUS_PERCENT: number;
    /** Maximum bubbles that can be consumed in a single merge */
    MAX_MERGE_TARGETS: number;
    /** Minimum streak to spawn a fusion bubble */
    MIN_FUSION_STREAK: number;
}

export const FUSION_CONFIG: FusionConfig = {
    STREAK_TIERS: { 3: 1.5, 5: 2.0, 7: 3.0, 10: 5.0 },
    MERGE_RADIUS_PERCENT: 25,  // 25% of screen width/height
    MAX_MERGE_TARGETS: 8,
    MIN_FUSION_STREAK: 3,
} as const;
```

---

## 3. ComboFusionStrategy Design

### 3.1 Class Structure

```typescript
// src/engines/bubble/strategies/ComboFusionStrategy.ts

import { MathBehaviorStrategy } from './MathStrategy';
import type { GameConfig, BubbleEntity } from '../types';
import { FUSION_CONFIG } from '../../../lib/worldConfig';

export class ComboFusionStrategy extends MathBehaviorStrategy {
    /** Current fusion streak, set by the engine via setFusionStreak() */
    private fusionStreak: number = 0;

    /** Set by engine on each correct/wrong answer */
    setFusionStreak(streak: number): void {
        this.fusionStreak = streak;
    }

    /** Get the multiplier for the current fusion streak */
    getFusionMultiplier(streak: number = this.fusionStreak): number {
        if (streak >= 10) return 5;
        if (streak >= 7) return 3;
        if (streak >= 5) return 2;
        if (streak >= 3) return 1.5;
        return 1; // No fusion at streak < 3
    }

    /** Get the tier index for visual styling */
    getFusionTier(streak: number = this.fusionStreak): 0 | 1 | 2 | 3 | 4 {
        if (streak >= 10) return 4;
        if (streak >= 7) return 3;
        if (streak >= 5) return 2;
        if (streak >= 3) return 1;
        return 0;
    }

    /** Check if a fusion bubble should spawn on the next target */
    shouldSpawnFusion(): boolean {
        return this.fusionStreak >= FUSION_CONFIG.MIN_FUSION_STREAK;
    }

    /**
     * Override generateNext to inject fusion properties on target bubbles.
     * Called by the engine's spawn loop. When fusionStreak >= 3, target
     * bubbles get isFusion=true with the appropriate multiplier.
     * Distractors, power-ups, and boss bubbles are never fusion bubbles.
     */
    generateNext(config: GameConfig, opts?: { forceTarget?: boolean }): Partial<BubbleEntity> {
        const base = super.generateNext(config, opts);

        // Only target bubbles can be fusion bubbles
        const isTarget = opts?.forceTarget || base.internalValue === this.getTargetValue();
        if (!isTarget) return base;

        // Don't fusion if already a power-up or boss
        if (base.isPowerUp || base.isBoss) return base;

        const multiplier = this.getFusionMultiplier();
        if (multiplier <= 1) return base;

        const tier = this.getFusionTier();

        return {
            ...base,
            isFusion: true,
            fusionMultiplier: multiplier,
            fusionTier: tier,
        };
    }
}
```

### 3.2 Multiplier Tier Lookup Table

| Streak | Multiplier | Tier Index | Visual Aura |
|--------|-----------|------------|-------------|
| 0-2 | 1.0× (no fusion) | 0 | None |
| 3-4 | 1.5× | 1 | Cyan glow |
| 5-6 | 2.0× | 2 | Orange glow |
| 7-9 | 3.0× | 3 | Magenta glow |
| 10+ | 5.0× | 4 | Gold glow + pulse animation |

### 3.3 Fusion Streak Tracking

Fusion streak is tracked **separately** from the normal combo counter:

- **Normal combo** (existing): increments on every correct answer, resets on wrong. Drives frenzy mode (5/10/15 thresholds) and speed multiplier.
- **Fusion streak** (new): increments on every correct answer, resets on wrong. Drives fusion bubble spawning. When a fusion bubble is popped, the fusion streak resets to 0 (but the normal combo continues).

The separation means:
1. Popping a fusion bubble doesn't break your normal combo — it resets only the fusion streak.
2. Frenzy mode (combo-based) and fusion mode (streak-based) can coexist.
3. A wrong answer resets both, which is correct behavior.

---

## 4. useGameEngine Modifications

### 4.1 New State

```typescript
// In useGameEngine.ts
const [fusionState, setFusionState] = useState<FusionState>({
    fusionStreak: 0,
    maxFusionStreak: 0,
    fusionBubblesSpawned: 0,
    totalMerges: 0,
    totalMergePoints: 0,
    fusionBubbleActive: false,
});

const [mergeEvents, setMergeEvents] = useState<MergeEvent[]>([]);

const fusionStateRef = useRef(fusionState);
useEffect(() => { fusionStateRef.current = fusionState; }, [fusionState]);
```

### 4.2 Pop Logic Changes

Inside `handlePop()` in useGameEngine.ts, after the existing correct/wrong determination:

```typescript
// --- Fusion Logic (only when combo_fusion mode) ---
const isFusionMode = configRef.current.modeName === 'Combo Fusion';

if (isFusionMode) {
    if (isCorrect) {
        // Check if the popped bubble is a fusion bubble
        if (target.isFusion && target.fusionMultiplier) {
            // === FUSION MERGE ===
            const multiplier = target.fusionMultiplier;
            const tier = target.fusionTier ?? 1;

            // Find nearby active non-fusion, non-boss, non-popped bubbles
            const nearbyIds: string[] = [];
            const allEntities = entitiesRef.current;
            for (const e of allEntities) {
                if (e.id === target.id || e.isPopped || e.isFusion || e.isBoss || e.isPowerUp) continue;
                const dx = Math.abs(e.x - target.x);
                const dy = Math.abs(e.y - target.y);
                if (dx <= FUSION_CONFIG.MERGE_RADIUS_PERCENT && dy <= FUSION_CONFIG.MERGE_RADIUS_PERCENT) {
                    nearbyIds.push(e.id);
                    if (nearbyIds.length >= FUSION_CONFIG.MAX_MERGE_TARGETS) break;
                }
            }

            // Calculate merge points
            const basePointsPerBubble = SCORING_CONFIG.BASE_SCORE_CORRECT;
            const comboPoints = basePointsPerBubble * (nearbyIds.length + 1);
            const totalPoints = Math.round(comboPoints * multiplier);

            // Mark nearby bubbles as merged (for animation before removal)
            setEntities(prev => {
                const next = [...prev];
                for (const id of nearbyIds) {
                    const idx = next.findIndex(e => e.id === id);
                    if (idx !== -1) {
                        next[idx] = { ...next[idx], isMerged: true, mergeValue: basePointsPerBubble };
                    }
                }
                entitiesRef.current = next;
                return next;
            });

            // Dispatch merge event for UI animation
            const mergeEvent: MergeEvent = {
                id: `merge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                centerId: target.id,
                consumedIds: nearbyIds,
                centerX: target.x,
                centerY: target.y,
                points: totalPoints,
                multiplier,
                tier,
                timestamp: Date.now(),
            };
            setMergeEvents(prev => [...prev, mergeEvent]);

            // Update fusion state — reset streak after fusion pop
            setFusionState(prev => ({
                ...prev,
                fusionStreak: 0,
                fusionBubbleActive: false,
                totalMerges: prev.totalMerges + 1,
                totalMergePoints: prev.totalMergePoints + totalPoints,
                maxFusionStreak: Math.max(prev.maxFusionStreak, prev.fusionStreak),
            }));

            // Add merge points to score (on top of normal correct-answer points)
            // Score update is in the existing setGameState block; we add merge bonus here
            // by augmenting the scoreBonus. The existing block handles the base correct score.

            // GA4: combo_fusion_merge event
            // { streak_count, multiplier, points_earned }
            // Logged by BubbleGameContainer via useAnalytics

            return { fusionMerge: true, points: totalPoints, multiplier, consumedIds: nearbyIds };
        } else {
            // Normal correct pop — increment fusion streak
            setFusionState(prev => ({
                ...prev,
                fusionStreak: prev.fusionStreak + 1,
                maxFusionStreak: Math.max(prev.maxFusionStreak, prev.fusionStreak + 1),
                fusionBubbleActive: prev.fusionStreak + 1 >= FUSION_CONFIG.MIN_FUSION_STREAK,
            }));
        }
    } else if (isCorrect === false) {
        // Wrong answer — reset fusion streak
        setFusionState(prev => ({
            ...prev,
            fusionStreak: 0,
            fusionBubbleActive: false,
        }));
    }
}
```

### 4.3 Spawn Loop Integration

In the game loop's spawn section, when `isFusionMode` and the strategy reports `shouldSpawnFusion()`,
the next target bubble spawned gets `isFusion: true`. This is handled by the strategy's
`generateNext()` override — the engine just needs to call `setFusionStreak` on the strategy
before spawning:

```typescript
// In the spawn section of the game loop:
if (isFusionMode && behavior instanceof ComboFusionStrategy) {
    behavior.setFusionStreak(fusionStateRef.current.fusionStreak);
}
```

### 4.4 Merge Event Cleanup

```typescript
// Auto-remove merge events after animation completes (1.5s)
useEffect(() => {
    if (mergeEvents.length === 0) return;
    const timer = setTimeout(() => {
        setMergeEvents(prev => prev.filter(e => Date.now() - e.timestamp < 1500));
    }, 1600);
    return () => clearTimeout(timer);
}, [mergeEvents]);
```

### 4.5 Return Value Extension

The `useGameEngine` hook return object adds:

```typescript
return {
    // ... existing returns ...
    fusionState,
    mergeEvents,
    isFusionMode,
};
```

---

## 5. worldConfig Changes

### 5.1 ARCADE_CONFIGS Entry

```typescript
// In ARCADE_CONFIGS record:
combo_fusion: {
    winCondition: { type: 'time_limit', value: 120 },  // 2-minute rounds
    failCondition: { type: 'strikes', value: 3 },
    spawnIntervalMs: 1000,   // Slightly faster than classic for more bubbles to merge
    distractorRatio: 1.5,    // Moderate distractor density
    levelMultiplier: 1.2,
},
```

### 5.2 ARCADE_MODE_LABELS Entry

```typescript
combo_fusion: {
    emoji: '🌀',
    name: 'Combo Fusion',
    desc: 'Chain correct answers → spawn Fusion Bubbles → pop them to merge nearby bubbles!',
},
```

### 5.3 FUSION_CONFIG

```typescript
export const FUSION_CONFIG = {
    STREAK_TIERS: { 3: 1.5, 5: 2.0, 7: 3.0, 10: 5.0 } as const,
    MERGE_RADIUS_PERCENT: 25,
    MAX_MERGE_TARGETS: 8,
    MIN_FUSION_STREAK: 3,
} as const;
```

### 5.4 STORAGE_KEYS Extension

```typescript
COMBO_FUSION_BEST_SCORE: 'hebrew-math-combo-fusion-best',
```

---

## 6. UI / Visual Design

### 6.1 Fusion Bubble Visual Tiers

| Tier | Streak | Aura Color | CSS |
|------|--------|------------|-----|
| 1 | 3-4 | Cyan | `filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.8))` |
| 2 | 5-6 | Orange | `filter: drop-shadow(0 0 15px rgba(255, 165, 0, 0.9))` |
| 3 | 7-9 | Magenta | `filter: drop-shadow(0 0 20px rgba(255, 0, 255, 1))` |
| 4 | 10+ | Gold + pulse | `filter: drop-shadow(0 0 25px rgba(255, 215, 0, 1)); animation: fusion-pulse 1s infinite alternate;` |

The `Bubble` component (src/components/sensory/Bubble.tsx) needs a conditional class:
```tsx
{entity.isFusion && (
    <div
        className="fusion-aura"
        style={{ filter: getFusionAuraStyle(entity.fusionTier) }}
        data-testid={`fusion-bubble-${entity.id}`}
    />
)}
```

### 6.2 Merge Animation (Framer Motion)

When `mergeEvents` contains events, render animated overlays:

```tsx
<AnimatePresence>
    {mergeEvents.map(event => (
        <motion.div
            key={event.id}
            initial={{ opacity: 1, scale: 0.5 }}
            animate={{ opacity: 0, scale: 2, y: -60 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="fusion-merge-text"
            style={{
                left: `${event.centerX}%`,
                top: `${event.centerY}px`,
            }}
        >
            +{event.points} ×{event.multiplier}!
        </motion.div>
    ))}
</AnimatePresence>
```

Consumed bubbles animate toward the center:
```tsx
// In Bubble component, if entity.isMerged:
<motion.div
    animate={{ x: mergeCenterX, y: mergeCenterY, scale: 0, opacity: 0 }}
    transition={{ duration: 0.4, ease: "easeIn" }}
/>
```

### 6.3 Fusion HUD

A 10-segment progress bar displayed below the score when `isFusionMode`:

```tsx
{isFusionMode && (
    <div className="fusion-hud" data-testid="fusion-hud">
        <div className="fusion-track">
            {Array.from({ length: 10 }, (_, i) => (
                <div
                    key={i}
                    className={`fusion-segment ${i < fusionState.fusionStreak ? 'filled' : ''}`}
                    data-testid={`fusion-segment-${i + 1}`}
                >
                    {(i + 1) === 3 && <span>1.5×</span>}
                    {(i + 1) === 5 && <span>2×</span>}
                    {(i + 1) === 7 && <span>3×</span>}
                    {(i + 1) === 10 && <span>5×</span>}
                </div>
            ))}
        </div>
        <div className="fusion-stats">
            <span>Merges: {fusionState.totalMerges}</span>
            <span>Best Streak: {fusionState.maxFusionStreak}</span>
        </div>
    </div>
)}
```

### 6.4 CSS Keyframes

```css
@keyframes fusion-pulse {
    0% { transform: scale(1); filter: drop-shadow(0 0 25px rgba(255, 215, 0, 1)); }
    100% { transform: scale(1.1); filter: drop-shadow(0 0 35px rgba(255, 215, 0, 1)); }
}

.fusion-segment.filled {
    background: linear-gradient(90deg, #00d4ff, #ffaa00, #ff00ff, #ffd700);
    transition: background 0.3s;
}
```

---

## 7. Mode Selector Integration

### 7.1 ModeSelectorOverlay.tsx — Add Combo Fusion Card

The existing `ModeSelectorOverlay` uses `GameMode` type from `usePracticeSession`. Since
combo_fusion is an `ArcadeMode` (not `GameMode`), it appears in the arcade mode flow, not the
practice mode flow. The arcade mode selection happens through `ARCADE_MODE_LABELS` in
`worldConfig.ts` and is rendered wherever arcade modes are listed.

If combo_fusion should also appear in the practice `ModeSelectorOverlay`, add:

```typescript
// Add to GameMode type in usePracticeSession.ts:
export type GameMode = 'STANDARD' | 'TIME_ATTACK' | 'SURVIVAL' | 'MEMORY' | 'INVADERS' | 'COMBO_FUSION';

// Add ModeCard in ModeSelectorOverlay.tsx:
<ModeCard
    mode="COMBO_FUSION"
    title={t('game.modes.combo_fusion.name', 'Combo Fusion')}
    description={t('game.modes.combo_fusion.desc', 'Chain answers → merge bubbles → multiply score!')}
    icon={Sparkles}
    color="bg-fuchsia-500"
    onSelect={onSelectMode}
    bestScore={bestScores?.['COMBO_FUSION']}
/>
```

Grid changes from `grid-cols-1 md:grid-cols-5` to `md:grid-cols-6` (or use `lg:grid-cols-3`
for a 2×3 layout on large screens).

### 7.2 BubbleGame.tsx — Wire Arcade Mode

`BubbleGame.tsx` already handles `arcadeMode?: ArcadeMode`. When `arcadeMode === 'combo_fusion'`,
it should instantiate `ComboFusionStrategy` instead of `MathBehaviorStrategy`:

```typescript
const [behavior] = useState(() => {
    if (arcadeMode === 'combo_fusion') {
        return new ComboFusionStrategy();
    }
    return new MathBehaviorStrategy();
});
```

And apply the combo_fusion config overrides from `getArcadeModeConfig('combo_fusion')`.

---

## 8. i18n Strings

### 8.1 English (src/i18n/locales/en.json)

Add to the `game` section:

```json
{
  "game": {
    "modes": {
      "combo_fusion": {
        "name": "Combo Fusion",
        "desc": "Chain correct answers to spawn Fusion Bubbles. Pop them to merge nearby bubbles and multiply your score!"
      }
    },
    "fusion": {
      "spawned": "Fusion Bubble!",
      "merged": "Mega Merge!",
      "multiplier": "×{{val}} Multiplier!",
      "streak": "Fusion Streak",
      "merges": "Merges",
      "bestStreak": "Best Streak",
      "tier1": "×1.5 Cyan Fusion!",
      "tier2": "×2 Orange Fusion!",
      "tier3": "×3 Magenta Fusion!",
      "tier4": "×5 GOLD FUSION!"
    }
  }
}
```

### 8.2 Hebrew (src/i18n/locales/he.json)

Add to the `game` section:

```json
{
  "game": {
    "modes": {
      "combo_fusion": {
        "name": "פיוז'ן קומבו",
        "desc": "שרשר תשובות נכונות ליצירת בועות פיוז'ן. פוצץ אותן כדי למזג בועות סמוכות ולהכפיל את הניקוד שלך!"
      }
    },
    "fusion": {
      "spawned": "בועת פיוז'ן!",
      "merged": "מיזוג ענק!",
      "multiplier": "מכפיל ×{{val}}!",
      "streak": "רצף פיוז'ן",
      "merges": "מיזוגים",
      "bestStreak": "רצף מירבי",
      "tier1": "×1.5 פיוז'ן תכלת!",
      "tier2": "×2 פיוז'ן כתום!",
      "tier3": "×3 פיוז'ן מג'נטה!",
      "tier4": "×5 פיוז'ן זהב!"
    }
  }
}
```

---

## 9. GA4 Events

### 9.1 Event Definitions

| Event Name | Trigger | Parameters |
|------------|---------|------------|
| `combo_fusion_start` | Mode loaded, first bubble spawns | `{ profile_id: string }` |
| `combo_fusion_merge` | Fusion bubble popped, merge completed | `{ streak_count: number, multiplier: number, points_earned: number, bubbles_merged: number }` |
| `combo_fusion_complete` | Game over (win or lose) | `{ max_streak: number, total_merges: number, score: number, time_played_ms: number }` |
| `fusion_bubble_spawned` | Fusion bubble appears on screen | `{ tier: number, multiplier: number }` |
| `fusion_streak_lost` | Wrong answer breaks fusion streak | `{ max_streak: number }` |

### 9.2 Implementation Points

- `combo_fusion_start`: Log in `BubbleGameContainer` `useEffect` on mount when `isFusionMode`.
- `combo_fusion_merge`: Log in `handlePop` callback when `result.fusionMerge === true`.
- `combo_fusion_complete`: Log in `onComplete` handler when `isFusionMode`.
- `fusion_bubble_spawned`: Log in the spawn loop when a new entity with `isFusion: true` is created.
- `fusion_streak_lost`: Log when `fusionStreak` transitions from >0 to 0 due to wrong answer.

### 9.3 Analytics Code (src/hooks/useAnalytics.ts)

The existing `useAnalytics` hook exposes `logEvent(eventName, params)`. Fusion events use the same
pattern as existing arcade events. No new analytics infrastructure needed.

---

## 10. Test Plan

### 10.1 Unit Tests — ComboFusionStrategy

**File:** `src/engines/bubble/strategies/__tests__/ComboFusionStrategy.test.ts`

```
describe('ComboFusionStrategy', () => {
  describe('multiplier tiers', () => {
    it('returns 1× (no fusion) at streak 0, 1, 2');
    it('returns 1.5× at streak 3');
    it('returns 1.5× at streak 4');
    it('returns 2× at streak 5');
    it('returns 2× at streak 6');
    it('returns 3× at streak 7');
    it('returns 3× at streak 9');
    it('returns 5× at streak 10');
    it('returns 5× at streak 15 (no higher cap)');
  });

  describe('fusion tier index', () => {
    it('returns tier 0 for streak 0-2');
    it('returns tier 1 for streak 3-4');
    it('returns tier 2 for streak 5-6');
    it('returns tier 3 for streak 7-9');
    it('returns tier 4 for streak 10+');
  });

  describe('generateNext fusion injection', () => {
    it('does NOT set isFusion when streak < 3');
    it('sets isFusion=true and fusionMultiplier=1.5 when streak=3 and bubble is target');
    it('sets isFusion=true and fusionMultiplier=2 when streak=5');
    it('sets isFusion=true and fusionMultiplier=5 when streak=10');
    it('does NOT set isFusion on distractor bubbles');
    it('does NOT set isFusion on power-up bubbles');
    it('does NOT set isFusion on boss bubbles');
    it('respects forceTarget option');
  });

  describe('shouldSpawnFusion', () => {
    it('returns false when streak < 3');
    it('returns true when streak >= 3');
  });

  describe('inheritance from MathBehaviorStrategy', () => {
    it('generates valid math problems via initializeLevel');
    it('anti-repeat signature system still works');
    it('distractor generation still works');
    it('boss gate methods inherited');
  });
});
```

### 10.2 Unit Tests — useGameEngine Fusion

**File:** `src/engines/bubble/__tests__/useGameEngine.fusion.test.ts`

```
describe('useGameEngine — Combo Fusion', () => {
  describe('fusion streak tracking', () => {
    it('fusionStreak starts at 0');
    it('increments fusionStreak on correct pop');
    it('resets fusionStreak on wrong pop');
    it('tracks maxFusionStreak');
    it('fusionStreak is separate from normal combo');
  });

  describe('fusion bubble spawning', () => {
    it('does not spawn fusion bubbles when streak < 3');
    it('spawns fusion bubble when streak reaches 3');
    it('fusion bubble has correct multiplier for current tier');
  });

  describe('merge logic', () => {
    it('popping fusion bubble consumes nearby non-fusion bubbles');
    it('merge radius is 25% screen width/height');
    it('max 8 bubbles consumed per merge');
    it('merge points = base_score × (consumed_count + 1) × multiplier');
    it('merge points added to score');
    it('fusion streak resets to 0 after merge');
    it('normal combo does NOT reset after merge');
    it('boss and power-up bubbles are NOT consumed by merge');
    it('mergeEvent is dispatched with correct data');
    it('mergeEvents auto-cleanup after 1.5s');
  });

  describe('game state integration', () => {
    it('combo_fusion mode has 120s time limit');
    it('combo_fusion mode has 3 strikes fail condition');
    it('fusion state persists across session level changes');
  });
});
```

### 10.3 E2E Test — Playwright

**File:** `e2e/comboFusion.spec.ts`

```
test.describe('Combo Fusion Mode', () => {
  test('fusion bubble appears after 3 correct answers', async ({ page }) => {
    // 1. Navigate to arcade mode selection
    // 2. Select Combo Fusion
    // 3. Verify game starts (fusion HUD visible)
    // 4. Answer 3 questions correctly (mock or click correct bubbles)
    // 5. Assert fusion bubble appears with data-testid="fusion-bubble-*"
    // 6. Assert fusion HUD shows 3 filled segments
  });

  test('popping fusion bubble merges nearby bubbles', async ({ page }) => {
    // 1. Get to fusion bubble state (3 correct answers)
    // 2. Pop the fusion bubble
    // 3. Assert merge animation appears (floating text with multiplier)
    // 4. Assert nearby bubbles are removed
    // 5. Assert score increases by merge points
    // 6. Assert fusion streak resets to 0
  });

  test('multiplier tiers scale correctly', async ({ page }) => {
    // 1. Get to 5-streak, verify ×2 multiplier on fusion bubble
    // 2. Get to 7-streak, verify ×3 multiplier
    // 3. Get to 10-streak, verify ×5 multiplier and gold aura
  });

  test('wrong answer resets fusion streak', async ({ page }) => {
    // 1. Build fusion streak to 4
    // 2. Answer incorrectly
    // 3. Assert fusion HUD shows 0 segments
    // 4. Assert no fusion bubble on next spawn
  });

  test('game completes after time limit or 3 strikes', async ({ page }) => {
    // 1. Start combo fusion mode
    // 2. Either wait for 120s timer or get 3 wrong answers
    // 3. Assert game over screen shows fusion stats (merges, best streak)
    // 4. Assert combo_fusion_complete GA4 event fired
  });
});
```

### 10.4 Existing Test Regression

- All 921 existing tests must continue to pass.
- The `ArcadeMode` type change from 4 to 5 variants may cause type errors in places that
  exhaustively switch on `ArcadeMode`. Search for `switch (mode)` or `Record<ArcadeMode, ...>`.
- `ARCADE_CONFIGS` is a `Record<ArcadeMode, ...>` — adding `combo_fusion` is mandatory or
  TypeScript will error on the missing key.
- `getArcadeModeConfig()` has a fallback `?? ARCADE_CONFIGS.classic` so unknown modes won't crash.

---

## 11. Implementation Step Order

| Step | File(s) | Action | Depends On |
|------|---------|--------|------------|
| 1 | `src/types/game.ts` | Add `'combo_fusion'` to `ArcadeMode` union | — |
| 2 | `src/engines/bubble/types.ts` | Add fusion fields to `BubbleEntity`, add `FusionState`, `MergeEvent` interfaces | Step 1 |
| 3 | `src/lib/worldConfig.ts` | Add `FUSION_CONFIG`, `ARCADE_CONFIGS.combo_fusion`, `ARCADE_MODE_LABELS.combo_fusion`, `STORAGE_KEYS.COMBO_FUSION_BEST_SCORE` | Step 1 |
| 4 | `src/i18n/locales/en.json` | Add `game.modes.combo_fusion` and `game.fusion` sections | — |
| 5 | `src/i18n/locales/he.json` | Add Hebrew translations for same keys | — |
| 6 | `src/engines/bubble/strategies/ComboFusionStrategy.ts` | Create class extending `MathBehaviorStrategy` | Steps 2, 3 |
| 7 | `src/engines/bubble/strategies/__tests__/ComboFusionStrategy.test.ts` | Write and run unit tests | Step 6 |
| 8 | `src/engines/bubble/useGameEngine.ts` | Add fusion state, merge logic, spawn integration, return fusion values | Steps 2, 3, 6 |
| 9 | `src/engines/bubble/__tests__/useGameEngine.fusion.test.ts` | Write and run engine fusion tests | Step 8 |
| 10 | `src/lib/arcadeModes.ts` | Verify `getArcadeModeConfig('combo_fusion')` works (no code change needed if ARCADE_CONFIGS has the entry) | Step 3 |
| 11 | `src/components/sensory/Bubble.tsx` | Add fusion aura visual rendering (conditional `isFusion` styling) | Step 2 |
| 12 | `src/components/games/BubbleGameContainer.tsx` | Add fusion HUD, merge animation overlays, fusion streak display, GA4 events | Steps 8, 11 |
| 13 | `src/components/games/ModeSelectorOverlay.tsx` | Add Combo Fusion mode card (if practice mode integration desired) | Steps 1, 4 |
| 14 | `src/components/sensory/BubbleGame.tsx` | Wire `ComboFusionStrategy` instantiation when `arcadeMode === 'combo_fusion'` | Step 6 |
| 15 | `src/hooks/usePracticeSession.ts` | Add `'COMBO_FUSION'` to `GameMode` type (if practice integration) | Step 1 |
| 16 | `e2e/comboFusion.spec.ts` | Write and run Playwright E2E tests | Steps 12, 14 |
| 17 | All | Run full test suite (921 + new tests), verify no regressions | All |
| 18 | CSS / styles | Add fusion aura keyframes, merge text animation styles, fusion HUD styles | Step 12 |

---

## 12. Risk Analysis

### 12.1 Type Breakage from ArcadeMode Union Expansion

**Risk:** Adding `'combo_fusion'` to `ArcadeMode` makes the union 5 members. Any `switch` statement
or `Record<ArcadeMode, ...>` that doesn't have a default/fallback will fail TypeScript compilation.

**Mitigation:** `ARCADE_CONFIGS` is `Record<ArcadeMode, ArcadeModeConfigEntry>` — MUST add
`combo_fusion` entry (step 3). `getArcadeModeConfig()` has `?? ARCADE_CONFIGS.classic` fallback.
Search for all `switch` on `ArcadeMode` or `mode` variables.

### 12.2 Fusion Bubble vs. Power-Up Bubble Collision

**Risk:** A bubble could be both `isPowerUp` and `isFusion` if the strategy doesn't guard.

**Mitigation:** `ComboFusionStrategy.generateNext()` explicitly checks `!base.isPowerUp && !base.isBoss`
before setting `isFusion`. The engine's spawn loop creates power-up bubbles separately (every 15s)
and they don't go through the strategy's `generateNext()` — they use their own `generatePowerUpBubble()`.

### 12.3 Merge Radius Calculation

**Risk:** `BubbleEntity.x` is 0-100% and `y` is in pixels. The merge radius check must account for
this mixed coordinate system.

**Mitigation:** Use percentage-based radius for x (25%) and a pixel-based radius for y (calculated
from viewport height × 25%). Or convert both to viewport pixels before comparison. The simpler
approach: check `|dx_percent| <= 25 && |dy_pixels| <= viewport_height * 0.25`.

### 12.4 Fusion State and Session Leveling

**Risk:** Session level changes (level up/level down) trigger `regenerateProblem()`, which could
interfere with fusion streak tracking.

**Mitigation:** Fusion streak is tracked in `fusionStateRef` in `useGameEngine`, not in the strategy.
Session level changes don't touch fusion state. The strategy only reads `fusionStreak` via
`setFusionStreak()` called from the engine before each spawn.

### 12.5 Performance: Merge Animation with Many Bubbles

**Risk:** If 8 bubbles animate simultaneously toward the merge center, Framer Motion could cause
frame drops on low-end devices (this is a Raspberry Pi deployment).

**Mitigation:** Keep `MAX_MERGE_TARGETS` at 8 (cap). Use `transform` animations only (GPU-accelerated).
The merge animation is 400ms — short enough to not overwhelm. Consider `will-change: transform`
on merged bubbles.

---

## 13. File Manifest

### Files to Create

| File | Purpose |
|------|---------|
| `src/engines/bubble/strategies/ComboFusionStrategy.ts` | Fusion strategy class |
| `src/engines/bubble/strategies/__tests__/ComboFusionStrategy.test.ts` | Strategy unit tests |
| `src/engines/bubble/__tests__/useGameEngine.fusion.test.ts` | Engine fusion tests |
| `e2e/comboFusion.spec.ts` | E2E Playwright tests |
| `docs/sdlc/combo-fusion/0-build.md` | This artifact |

### Files to Modify

| File | Change |
|------|--------|
| `src/types/game.ts` | Add `'combo_fusion'` to `ArcadeMode` |
| `src/engines/bubble/types.ts` | Add fusion fields to `BubbleEntity`, add `FusionState`, `MergeEvent` |
| `src/lib/worldConfig.ts` | Add `FUSION_CONFIG`, arcade config entry, labels, storage key |
| `src/lib/arcadeModes.ts` | Verify (likely no change needed) |
| `src/i18n/locales/en.json` | Add fusion i18n strings |
| `src/i18n/locales/he.json` | Add Hebrew fusion i18n strings |
| `src/engines/bubble/useGameEngine.ts` | Add fusion state, merge logic, spawn integration |
| `src/components/sensory/Bubble.tsx` | Add fusion aura rendering |
| `src/components/sensory/BubbleGame.tsx` | Wire ComboFusionStrategy for combo_fusion mode |
| `src/components/games/BubbleGameContainer.tsx` | Add fusion HUD, merge animations, GA4 events |
| `src/components/games/ModeSelectorOverlay.tsx` | Add combo fusion mode card (if practice integration) |
| `src/hooks/usePracticeSession.ts` | Add `COMBO_FUSION` to `GameMode` (if practice integration) |

---

## 14. Acceptance Criteria Checklist

- [ ] `ArcadeMode` type includes `'combo_fusion'`
- [ ] `ARCADE_CONFIGS` has `combo_fusion` entry
- [ ] `ARCADE_MODE_LABELS` has `combo_fusion` entry
- [ ] `FUSION_CONFIG` defined with correct tier mapping (3→1.5, 5→2, 7→3, 10→5)
- [ ] `ComboFusionStrategy` extends `MathBehaviorStrategy`
- [ ] `ComboFusionStrategy.generateNext()` injects `isFusion` on targets at streak ≥ 3
- [ ] Multiplier tiers match spec exactly (1.5×, 2×, 3×, 5×)
- [ ] Fusion streak tracked separately from normal combo
- [ ] Wrong answer resets fusion streak to 0
- [ ] Popping fusion bubble resets fusion streak to 0 (but not normal combo)
- [ ] Merge radius finds nearby bubbles within 25% screen distance
- [ ] Max 8 bubbles consumed per merge
- [ ] Merge points = base_score × (consumed + 1) × multiplier
- [ ] Fusion bubble visual: glowing aura with tier-specific color
- [ ] Merged bubble visual: combined value displayed, animate toward center
- [ ] Fusion HUD: 10-segment progress bar with tier markers
- [ ] combo_fusion mode selectable in arcade/practice mode UI
- [ ] GA4 events: combo_fusion_start, combo_fusion_merge, combo_fusion_complete
- [ ] i18n: English and Hebrew strings for all fusion UI text
- [ ] All 921 existing tests pass
- [ ] New unit tests pass (strategy + engine)
- [ ] E2E test: fusion bubble appears after 3 correct answers
- [ ] E2E test: popping fusion bubble triggers merge
- [ ] E2E test: multiplier tiers scale correctly
- [ ] No test regressions
