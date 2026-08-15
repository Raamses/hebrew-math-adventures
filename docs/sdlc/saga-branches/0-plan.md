# Phase 4: Branching Saga Map & Mystery Treasure Caves — Plan

**Model:** claude-opus-5 (via `ask-claude --escalate --card c8460bf8`)
**Date:** 2026-08-15
**Branch:** sdlc/loop-v0
**Status:** Draft for review

---

## 1. Problem Statement

The current saga map is a strictly linear chain: 5 units × 10 nodes, where completing node N is the only way to unlock node N+1. A child who struggles on, say, node 4 of any unit is hard-blocked from the rest of the game — no alternative paths, no bypass, no way to earn progression through a different activity.

**Goal:** Add optional side nodes (Treasure Caves, Mascot Mini-Games, Speed Gates) that branch off the main path, allowing kids to bypass difficult nodes and earn bonus rewards, while preserving the integrity of the main learning path.

---

## 2. Current Architecture Summary

### Files & Types

| File | Role |
|---|---|
| `src/types/learningPath.ts` | Type definitions: `LearningNode`, `LearningUnit`, `NodeProgress`, `SagaProgress` |
| `src/data/learningPath.ts` | `CURRICULUM` array — 5 units × 10 nodes, linear |
| `src/context/ProgressContext.tsx` | `completeNode()`, `isNodeLocked()`, `getStars()` — linear traversal |
| `src/lib/progression.ts` | `getInitialProgress(age)` — unlocks first node of age-appropriate unit |
| `src/components/map/SagaMap.tsx` | Vertical map UI — absolute-positioned circular nodes, empty SVG connectors |
| `src/components/WorldMap.tsx` | Zone-based map (older, parallel UI — `MapZone` cards) |
| `src/components/MapZone.tsx` | Zone card component for `WorldMap` |
| `src/components/GameOrchestrator.tsx` | Dispatches `LearningNode` → game mode (LESSON, PRACTICE, SENSORY, MEMORY, INVADERS) |

### Current Progression Flow

```
completeNode('n1_3', 2)
  → set stars on n1_3
  → flat-traverse CURRICULUM to find node after n1_3 → n1_4
  → unlock n1_4 (isLocked: false)
```

### Key Findings (verified against actual codebase)

1. **`ProgressContext` persists to `localStorage`** per-profile: key `hebrew_game_saga_progress_v1_{profileId}`. Migration hooks go here.
2. **`unit.nodes.length` is used in 2 places**: `progression.ts:34` (guard for empty units) and `SagaMap.tsx:235` (container height calculation: `nodes.length * 150 + 100`). Both need updating when side nodes are added.
3. **Tests at risk**: `ProgressContext.test.tsx` asserts `completeNode` unlock order; e2e tests use `[data-testid="saga-node-nX_Y"]` selectors; `SagaMap.tsx` renders nodes by iterating `unit.nodes` — adding side nodes changes DOM count.
4. **No existing `isUnitComplete` function** — unit completion is implicit (last node completed → next unit's first node unlocks).

---

## 3. Data Model Design

### 3.1 Extended Types — `src/types/learningPath.ts`

All new fields are **optional** — existing curriculum data type-checks unchanged with zero edits.

```typescript
export type MainNodeType = 'LESSON' | 'PRACTICE' | 'SENSORY' | 'STORY' | 'CHALLENGE';
export type SideNodeType = 'TREASURE_CAVE' | 'MASCOT_GAME' | 'SPEED_GATE';
export type NodeType = MainNodeType | SideNodeType;

export type NodeTrack = 'MAIN' | 'SIDE';

export type RevealRule =
  | { kind: 'ALWAYS' }
  | { kind: 'ON_UNLOCK' }
  | { kind: 'ON_STRUGGLE'; attempts?: number; mistakeRate?: number };

export interface LearningNode {
  id: string;
  unitId: string;
  title: string;
  description: string;
  type: NodeType;
  position: { x: number; y: number };
  targetLevel?: number;
  config?: Record<string, unknown>;

  // --- Branching (optional, defaults preserve linear behavior) ---
  track?: NodeTrack;            // default 'MAIN'
  unlockedBy?: string[];        // inbound edges; default = synthesized linear predecessor
  unlockRule?: 'ALL' | 'ANY';   // default 'ANY'
  branchOf?: string;            // main node this side path departs from
  isMilestone?: boolean;        // counts toward unit completion; can never be bypassed
  revealRule?: RevealRule;      // default 'ON_UNLOCK' for MAIN, per-type for SIDE
}
```

**No `bypasses` field** — a bypass is pure graph topology. If node `n1_5` has `unlockedBy: ['n1_4', 'u1-cave-a']` with `unlockRule: 'ANY'`, completing either the hard node 4 *or* the treasure cave opens node 5. One mechanism, no special case.

### 3.2 Extended Progress — Additive to `NodeProgress`

```typescript
export type NodeStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'SKIPPED';

export interface NodeProgress {
  stars: number;           // existing
  isLocked: boolean;       // existing — now a derived mirror of status
  mistakes?: number;       // existing
  status?: NodeStatus;     // new source of truth
  attempts?: number;       // drives ON_STRUGGLE reveal
  bypassedVia?: string;    // side node id that let them past
  lastPlayedAt?: number;   // analytics
}
```

`isLocked` is written on every mutation alongside `status`, so any component still reading the old field keeps working.

### 3.3 Unit Completion Rule

```typescript
export interface UnitCompletionRule {
  requiredMilestones?: string[];  // explicit node ids
  minMilestones?: number;         // or: N of the isMilestone nodes
  minStars?: number;
}

export interface LearningUnit {
  // ...existing fields...
  completionRule?: UnitCompletionRule;  // default: all MAIN nodes (today's behavior)
}
```

### 3.4 Side Node Config Schemas

```typescript
// Treasure Cave config
interface TreasureCaveConfig {
  timeLimitSec: number;      // e.g. 30
  problemCount: number;      // e.g. 5
  coinReward: number;        // e.g. 15
  gemReward: number;         // e.g. 3
  difficultyLevel: number;   // maps to targetLevel
  bypassTarget?: string;     // main node id this cave can bypass
}

// Mascot Mini-Game config
interface MascotGameConfig {
  gameType: 'feed_pet' | 'dress_up' | 'trick_show' | 'pet_race';
  durationSec: number;
  gemReward: number;
  stickerReward?: string;
  bypassTarget?: string;
}

// Speed Gate config
interface SpeedGateConfig {
  timeLimitSec: number;      // e.g. 20 (tight)
  problemCount: number;      // e.g. 10
  targetAccuracy: number;    // e.g. 0.8
  cosmeticReward: string;    // e.g. 'rocket_skin'
  // NOTE: Speed Gates can NEVER serve as bypass — they're for bored fast kids, not stuck ones
}
```

### 3.5 Example Curriculum Entry (side node)

```typescript
// Added to unit_1 nodes array:
{
  id: 'u1_cave_a',
  unitId: 'unit_1',
  title: 'Sparkle Cave',
  description: 'Find treasure numbers!',
  type: 'TREASURE_CAVE',
  track: 'SIDE',
  position: { x: 12, y: 405 },   // midpoint between n1_3 (y=240) and n1_4 (y=360) → ~300... adjusted
  branchOf: 'n1_3',
  unlockedBy: ['n1_3'],           // available after completing n1_3
  unlockRule: 'ANY',
  revealRule: { kind: 'ON_STRUGGLE', attempts: 2 },
  isMilestone: false,
  config: {
    timeLimitSec: 30,
    problemCount: 5,
    coinReward: 15,
    gemReward: 3,
    difficultyLevel: 1,
    bypassTarget: 'n1_4'
  }
},
```

---

## 4. Progression Logic Redesign

### 4.1 New Pure Module: `src/lib/sagaGraph.ts`

No React, fully unit-testable.

```typescript
export interface SagaGraph {
  nodes: Map<string, LearningNode>;
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
  unitOf: Map<string, string>;
}

export function buildGraph(curriculum: LearningUnit[]): SagaGraph;
export function resolveUnlocks(g: SagaGraph, p: SagaProgress, justCompleted: string): string[];
export function isNodeLocked(g: SagaGraph, p: SagaProgress, id: string): boolean;
export function getVisibleNodes(g: SagaGraph, p: SagaProgress, unitId: string): LearningNode[];
export function isUnitComplete(unit: LearningUnit, p: SagaProgress): boolean;
export function validateCurriculum(curriculum: LearningUnit[]): string[];
```

### 4.2 Implicit Edge Synthesis (backward compat)

`buildGraph` fills in missing `unlockedBy`: within a unit, each `track:'MAIN'` node in array order gets `unlockedBy: [previousMainNode.id]`. The first main node of unit N gets the last main node of unit N−1. **Existing 50 nodes need zero edits and behave exactly as today.**

### 4.3 Rewired `completeNode` in `ProgressContext.tsx`

```typescript
const completeNode = (nodeId: string, stars: number) => {
  setProgress(prev => {
    const next = { ...prev };
    // Mark completed
    next[nodeId] = {
      ...prev[nodeId],
      stars: Math.max(stars, prev[nodeId]?.stars ?? 0),
      status: 'COMPLETED',
      isLocked: false,
    };
    // Resolve unlocks via graph
    for (const id of resolveUnlocks(graph, next, nodeId)) {
      if (!next[id] || next[id].status === 'LOCKED') {
        next[id] = { stars: 0, isLocked: false, status: 'AVAILABLE' };
      }
    }
    // Mark bypassed main nodes
    markBypassed(graph, next, nodeId);
    return next;
  });
};
```

### 4.4 Bypass Semantics

When main node M unlocks via a SIDE parent while main parent P is still incomplete:
- P is marked `SKIPPED` with `bypassedVia` pointing to the side node
- **`SKIPPED` nodes stay playable** — the kid can return anytime and earn full stars
- `SKIPPED` → `COMPLETED` transition is always allowed

**Guardrails:**
- **Milestone nodes can never be bypassed** — validator rejects any curriculum where a milestone has a SIDE node in an `ANY` group
- **Max 2 `SKIPPED` per unit** — past that, side nodes still give rewards but stop granting the skip
- **Speed Gates can never serve as bypass** — they're for bored fast kids, not stuck ones

### 4.5 Struggle Detection

`recordAttempt(nodeId, mistakes)` bumps `attempts`. When `attempts >= 2` (or mistakes >50% on attempt 1) for node P, any `ON_STRUGGLE` side node with P in its `unlockedBy` flips to visible **and** available.

### 4.6 Migration — `src/lib/progressMigration.ts`

| Old State | → `status` |
|---|---|
| `isLocked === true` | `LOCKED` |
| `isLocked === false && stars > 0` | `COMPLETED` |
| `isLocked === false && stars === 0` | `AVAILABLE` |

Unknown node ids in old saves are dropped silently (curriculum will change). Add `schemaVersion: 2` wrapper to persisted progress.

---

## 5. Visual Layout Design

### 5.1 Side Node Positioning

Container: `max-w-md` (448px), worst case 360px phone.

- Main path: x ∈ [30, 70], y += 150px per node (unchanged)
- Side nodes: x ∈ {12, 86}, y = parentY + 75 (midpoint between two main nodes)
- Main node size: 80px (unchanged); side node size: **64px** (smaller = "optional bonus")

At 360px: `0.86 × 360 = 310px` + 32px half-width = 342px, leaving 18px margin. Fits.

### 5.2 SVG Connectors — `src/components/saga/SagaConnectors.tsx`

Use `ResizeObserver` to measure section width, render 1:1 viewBox (no aspect ratio distortion).

**Path shapes** (all vertical-tangent cubics):

```
// main → main: dotted stepping-stone trail
M ${x1} ${y1} C ${x1} ${y1+60}, ${x2} ${y2-60}, ${x2} ${y2}
stroke-width=8, stroke-dasharray="2 14", stroke-linecap="round"

// main → side: control points biased horizontally so it visibly peels off
M ${x1} ${y1} C ${x1+dx} ${y1+20}, ${x2} ${y2-40}, ${x2} ${y2}
stroke-width=5, opacity 0.55, colored per side type
```

**The rejoin edge (side → main) renders only once the side node is unlocked.** Before that it's invisible — the kid sees the treasure but not the shortcut.

### 5.3 Per-Type Visual Differentiation

Shape and icon carry meaning; color is secondary (4-year-olds, colorblind kids).

| Type | Shape | Palette | Icon |
|---|---|---|---|
| `TREASURE_CAVE` | Circle, 64px | `from-amber-300 to-yellow-500` | 💎 chest |
| `MASCOT_GAME` | Circle w/ mascot portrait | `from-fuchsia-400 to-purple-500` | Mascot art |
| `SPEED_GATE` | Rounded-rect gate (not circle) | `from-cyan-300 to-blue-500` | ⏱ badge |

**States:**
- `LOCKED`: grayscale + 40% opacity
- `AVAILABLE`: full color + ring + soft bounce
- `COMPLETED`: star badge below
- `SKIPPED`: full color, ~60% saturation, small ↩ badge, still tappable

All animations gated behind `prefers-reduced-motion`.

### 5.4 New Files

| File | Purpose |
|---|---|
| `src/components/saga/SagaNode.tsx` | Extracted main node component (from SagaMap) |
| `src/components/saga/SideNode.tsx` | New side node component |
| `src/components/saga/SagaConnectors.tsx` | SVG connector paths |
| `src/lib/sagaLayout.ts` | Pure: unit + width → `{points, edges}` |
| `src/lib/sagaGraph.ts` | Pure: graph build, unlock resolution, validation |
| `src/lib/progressMigration.ts` | Schema v1 → v2 migration |

### 5.5 SagaMap.tsx Changes

- Replace inline node rendering with `<SagaNode>` and `<SideNode>` components
- Replace empty SVG with `<SagaConnectors>` component
- Update container height: `mainNodeCount * 150 + 100` (not `nodes.length * 150 + 100`)
- Filter side nodes by `getVisibleNodes()` before rendering

---

## 6. Implementation Phases

### Phase 1: Graph Foundation — Zero Behavior Change

**Goal:** Replace linear traversal with graph engine; no visible change.

1. Extend `src/types/learningPath.ts` with optional branching fields
2. Write `src/lib/sagaGraph.ts` (buildGraph, resolveUnlocks, isNodeLocked, validateCurriculum)
3. Write `src/lib/progressMigration.ts` (schema v1 → v2)
4. Rewire `ProgressContext.tsx` to use `sagaGraph` instead of flat traversal
5. Add `validateCurriculum()` call in dev/test mode
6. **No curriculum edits, no visual change**
7. Run existing test suite — if green untouched, graph is correct

**Risk:** Highest risk phase. All existing tests must pass without modification.

**Estimated child cards:** 3-4 (types, graph, migration, context rewire)

### Phase 2: Treasure Caves — MVP Value

**Goal:** One treasure cave per unit; the smallest change that actually unsticks a kid.

1. Add 1 Treasure Cave node per unit to `CURRICULUM` (5 total)
2. Implement `ON_STRUGGLE` reveal logic (attempts tracking, visibility toggle)
3. Implement bypass via `ANY` rule
4. Build `SagaConnectors.tsx` (render SVG paths for main + side)
5. Build `SideNode.tsx` (treasure cave visual)
6. Extract `SagaNode.tsx` from SagaMap
7. Update `SagaMap.tsx` to render side nodes + connectors
8. Switch unit completion to milestone-based (`isUnitComplete()`)
9. Add GA4 events: `side_node_start`, `side_node_complete`, `path_bypass_used`
10. Add gem currency to `ProfileContext` (if not already present)
11. Update `GameOrchestrator.tsx` to handle `TREASURE_CAVE` node type
12. Update tests + add new tests for branching logic

**Estimated child cards:** 6-8

### Phase 3: Mascot Mini-Games + Speed Gates

**Goal:** Full side node ecosystem.

1. Add Mascot Mini-Game nodes (always visible, gem/sticker rewards)
2. Add Speed Gate nodes (units 3-5 only, timed, cosmetic rewards)
3. Build `SideNode.tsx` variants for mascot and speed types
4. Implement mascot mini-game modes in GameOrchestrator
5. Implement speed gate mode
6. Add sticker/cosmetic reward system
7. Analytics dashboard for side node engagement
8. Full e2e test coverage for all side node types

**Estimated child cards:** 5-7

---

## 7. Risk Analysis

### 7.1 Test Breakage

| Test | Risk | Mitigation |
|---|---|---|
| `ProgressContext.test.tsx` — `completeNode` unlock order | HIGH — asserts linear traversal | Phase 1 must keep identical unlock behavior; tests pass unchanged |
| e2e `saga-node-nX_Y` selectors | MEDIUM — side nodes add DOM elements | Selectors still match main nodes; side nodes get different testid pattern `side-node-{id}` |
| `SagaMap` snapshot tests | LOW — none found | N/A |
| `worldConfig.test.ts` | LOW — worldConfig unchanged | N/A |
| `progression.ts` tests | LOW — `getInitialProgress` still unlocks first main node | Ensure `buildGraph` marks first main node as available |

### 7.2 Edge Cases

- **Bypass then complete later**: idempotent unlock; `SKIPPED → COMPLETED` always allowed; full stars awarded
- **Kid bypasses everything**: capped at 2 skips/unit; milestones unbypassable
- **Stuck on the bypass itself**: Treasure Caves and Mascot Games must have *no fail state and no timer* — guaranteed completable. Speed Gate is timed, so it can never be a bypass.
- **Save from older curriculum version**: drop unknown node ids silently
- **Cycles in graph**: `validateCurriculum()` must run in CI — topological sort, no orphans, main path alone must always complete unit

### 7.3 Performance

- 50 → ~70 nodes total; build graph once at module scope, not per render
- `React.memo` each `SagaNode` on its own progress slice — one completion shouldn't re-render 70 nodes
- Recompute connector geometry only on `ResizeObserver` fire — never on scroll

---

## 8. Child Psychology Considerations

### 8.1 Side Node Count

**1-2 side nodes per 10-node unit.** More and the main path stops reading as *the* path — the map becomes a route-planning problem, and 4-6 year olds don't have the executive function for that.

- 1 Treasure Cave + 1 Mascot Game per unit
- Speed Gates only in units 3-5 (where older/faster kids are)

### 8.2 Visibility — Hybrid Approach

**Make Treasure Caves and Mascot Games always visible** (locked, sparkling, aspirational). Visible goals drive engagement, and a map that *changes shape when you fail* is confusing and reads as pity.

**Reveal the bypass connector only on struggle.** The kid always sees the treasure; they only discover it's *also* a shortcut at the moment they need one. This kills the path-of-least-resistance problem — a coasting kid never learns the caves skip anything.

### 8.3 Language

**Never label it "skip" or "too hard."** Call it *"Another Way!"* with its own road color. Failure-labeled affordances measurably depress self-efficacy in this age range.

### 8.4 Struggle Threshold

**2 failed attempts, not 3.** By the third failure a 5-year-old has usually disengaged — we'd be rescuing them after the churn.

### 8.5 Reward Balancing — Different Currency

Side nodes must pay a **different currency**. If a cave hands out 3 stars for easy work, stars stop meaning mastery.

| Path | Reward |
|---|---|
| Main path + milestones | **Stars** (mastery signal) |
| Treasure Caves, Mascot Games | **Gems / stickers / mascot outfits** (collection, orthogonal to progression) |
| Speed Gates | **Large cosmetic prize** (hard, optional, never on critical path) |

A `SKIPPED` node reads as *"come back later!"* with a friendly badge. The mascot invites them back after the unit wraps. Completing it late pays full stars — mastery goal stays alive without punishing the kid for taking help.

---

## 9. GA4 Events (Planned)

```typescript
// When a child starts a side node
logEvent('side_node_start', {
  node_id: nodeId,
  side_type: 'treasure' | 'mascot' | 'speed',
  unit_id: unitId,
});

// When a child completes a side node
logEvent('side_node_complete', {
  node_id: nodeId,
  side_type: 'treasure' | 'mascot' | 'speed',
  coins_earned: coins,
  gems_earned: gems,
});

// When a bypass is triggered (side node completion unlocks main node)
logEvent('path_bypass_used', {
  main_node_bypassed: mainNodeId,
  side_node_used: sideNodeId,
  unit_id: unitId,
});
```

---

## 10. Success Criteria

- [ ] Kids stuck on a node have visible alternate paths within 2 failed attempts
- [ ] Side node completion ≥30% (measured via GA4)
- [ ] No test regressions (existing test suite passes in Phase 1)
- [ ] `SKIPPED` nodes remain replayable
- [ ] Max 2 bypasses per unit enforced
- [ ] Milestone nodes unbypassable
- [ ] `validateCurriculum()` passes in CI

---

## 11. Open Questions for Review

1. **Which main nodes are milestones?** Proposal: node 10 (boss) of each unit is always a milestone. Should node 5 (unit midpoint) also be a milestone?
2. **Gem currency**: `ProfileContext` already has `gems` field — confirm it's wired and displayable.
3. **Mascot mini-game scope**: Are we building new mini-games or reskinning existing arcade modes (Memory, Invaders) with pet themes?
4. **WorldMap.tsx vs SagaMap.tsx**: The card mentions `WorldMap.tsx` but `SagaMap.tsx` is the active component. Confirm we're modifying SagaMap only.
5. **Sticker/cosmetic system**: Does one exist, or is this net-new for Phase 3?

---

## 12. Child Card Breakdown (for implementation dispatch)

### Phase 1 (3-4 cards)
| Card | Description |
|---|---|
| P1-types | Extend `learningPath.ts` types + add `sagaGraph.ts` + `progressMigration.ts` |
| P1-context | Rewire `ProgressContext.tsx` to graph engine + migration |
| P1-validate | Add `validateCurriculum()` + dev-mode guard + tests |
| P1-regression | Run full test suite, fix any breakage from graph migration |

### Phase 2 (6-8 cards)
| Card | Description |
|---|---|
| P2-curriculum | Add 1 Treasure Cave per unit to `CURRICULUM` data |
| P2-connectors | Build `SagaConnectors.tsx` (SVG paths) |
| P2-sidenode | Build `SideNode.tsx` + `SagaNode.tsx` extraction |
| P2-sagamap | Update `SagaMap.tsx` to render side nodes + connectors |
| P2-struggle | Implement `ON_STRUGGLE` reveal + attempts tracking |
| P2-bypass | Implement bypass logic + `markBypassed` + milestone enforcement |
| P2-gems | Wire gem rewards + update GameOrchestrator for TREASURE_CAVE |
| P2-analytics | Add GA4 events + tests |

### Phase 3 (5-7 cards)
| Card | Description |
|---|---|
| P3-mascot-curriculum | Add Mascot Game nodes to curriculum |
| P3-mascot-game | Build mascot mini-game mode in GameOrchestrator |
| P3-speed-curriculum | Add Speed Gate nodes (units 3-5) |
| P3-speed-game | Build Speed Gate mode |
| P3-cosmetics | Sticker/cosmetic reward system |
| P3-sidenode-variants | SideNode visual variants for mascot + speed types |
| P3-e2e | Full e2e test coverage for all side node types |

---

*Analysis delegated to claude-opus-5 via `ask-claude --escalate --card c8460bf8`. Model attribution verified in `~/.openclaw/bin/model-usage.jsonl`.*
