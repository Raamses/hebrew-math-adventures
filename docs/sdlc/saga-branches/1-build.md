# Phase 8: Saga Branching — Build Artifact

**Model:** gemini-3.1-pro-high (via `ask-agy --card ff00ea03`)
**Date:** 2026-08-15
**Branch:** sdlc/loop-v0
**Status:** Ready for implementation
**Plan doc:** docs/sdlc/saga-branches/0-plan.md

---

## Model Delegation Log

| Attempt | Tool | Model | Status | Tokens |
|---|---|---|---|---|
| 1 | ask-claude --escalate --card | claude-opus-5 | FAILED — session limit (resets 2pm) | 0 |
| 2 | ask-claude --escalate --card | claude-opus-5 | FAILED — session limit (resets 2pm) | 0 |
| 3 | ask-agy --card | gemini-3.1-pro-high | SUCCESS | 23,994 |

Claude (opus-5) hit session limit on 2 attempts (both logged in `~/.openclaw/bin/model-usage.jsonl`, actual: "unknown"). Gemini CLI (ask-agy --card, gemini-3.1-pro-high) succeeded with 23,994 tokens. The analysis from Gemini was a 225-line structural guide. This artifact enriches it with full codebase specifics, exact TypeScript interfaces, algorithms, and test cases derived from direct inspection of the repository.

---

## 1. Architecture Decisions

### 1.1 Confirm the Plan's Approach

The plan (0-plan.md) is architecturally sound. Key decisions confirmed:

1. **DAG over linear array** — Replace flat CURRICULUM traversal with a graph engine (`sagaGraph.ts`). This is correct. The current `completeNode()` in ProgressContext.tsx (lines 78-110) iterates `CURRICULUM` flat to find the next node after `nodeId`. This O(n) scan breaks for branching.

2. **Optional fields preserve backward compat** — All new fields on `LearningNode` (`track`, `unlockedBy`, `unlockRule`, `branchOf`, `isMilestone`, `revealRule`) are optional. Existing 53 nodes type-check unchanged. Confirmed: current `LearningNode` interface (src/types/learningPath.ts:5-22) has no branching fields.

3. **NodeStatus as source of truth** — Add `status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'SKIPPED'` to `NodeProgress`. Keep `isLocked` as a derived mirror so existing component reads (`isNodeLocked()`, SagaMap locked checks) keep working.

4. **Separate currency for side nodes** — Treasure Caves and Mascot Games give gems/stickers, NOT stars. Stars remain the mastery signal. `UserProfile.gems` already exists (src/types/user.ts:58). `ProfileContext` already has `addGems()`, `spendGems()`.

5. **Speed Gates never bypass** — They're for bored fast kids, not stuck ones. No `ANY` rule connections to main path.

### 1.2 Gaps Identified in Plan

| Gap | Resolution |
|---|---|
| Plan says `src/types/curriculum.ts` — actual file is `src/types/learningPath.ts` | Use existing file name |
| Plan says `src/components/WorldMap.tsx` — active component is `src/components/map/SagaMap.tsx` (331 lines) | Modify SagaMap.tsx, not WorldMap.tsx |
| Plan says `src/data/curriculum.ts` — actual file is `src/data/learningPath.ts` | Use existing file name |
| Plan's `unlockedBy: string[]` is too loose — Gemini correctly proposed `NodeUnlockCondition[]` with per-edge rules | Use `unlockedBy: { nodeId: string; rule: 'ALL' | 'ANY' }[]` |
| Plan doesn't address that SagaMap uses `index` for vertical positioning (`top: 150 * (index + 0.5)`) not `node.position.y` | Side nodes need custom positioning logic — see §3.3 |
| Existing story lesson nodes (n1_3a, n2_3a) are interleaved in the nodes array but not in the linear unlock chain | Graph synthesis must handle these correctly — they're unlocked by their preceding main node |
| Plan mentions `progression.ts:34` guard — actual line 34 is `if (unit.nodes.length > 0)` | Container height in SagaMap.tsx:233 uses `unit.nodes.length * 150 + 100` — must filter to main nodes only |

### 1.3 Improvements Over Plan

1. **Graph build at module scope** — Build the saga graph once at import time, not per render. `buildGraph(CURRICULUM)` is a constant. This prevents 70-node re-computation on every ProgressContext state change.

2. **Explicit `isSideNode()` helper** — Rather than checking `track !== 'MAIN'` ad hoc, export a typed predicate. Used in SagaMap rendering filter, GameOrchestrator dispatch, and GA4 event logging.

3. **Side node testid pattern** — Use `side-node-{id}` (not `saga-node-{id}`) to avoid collision with existing e2e selectors that target main nodes.

---

## 2. Phase 1: Graph Foundation — Zero Behavior Change

**Goal:** Replace linear traversal with graph engine. No visible change. All 953 tests pass.

### 2.1 Extended Types — `src/types/learningPath.ts`

All new fields are **optional**. Existing 53 nodes need zero edits.

```typescript
// === NEW: Side node types ===
export type SideNodeType = 'TREASURE_CAVE' | 'MASCOT_GAME' | 'SPEED_GATE';
export type NodeType = 'LESSON' | 'PRACTICE' | 'SENSORY' | 'STORY' | 'CHALLENGE' | SideNodeType;
export type NodeTrack = 'MAIN' | 'SIDE';

export type RevealRule =
  | { kind: 'ALWAYS' }
  | { kind: 'ON_UNLOCK' }
  | { kind: 'ON_STRUGGLE'; attempts: number };

// === NEW: Node status (source of truth) ===
export type NodeStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'SKIPPED';

// === EXTENDED: LearningNode ===
export interface LearningNode {
  // --- existing fields (unchanged) ---
  id: string;
  unitId: string;
  title: string;
  description: string;
  type: NodeType;
  position: { x: number; y: number };
  targetLevel?: number;
  config?: Record<string, unknown>;

  // --- NEW: branching (all optional, defaults preserve linear behavior) ---
  track?: NodeTrack;              // default 'MAIN'
  unlockedBy?: string[];          // inbound edge node ids; default = synthesized linear predecessor
  unlockRule?: 'ALL' | 'ANY';    // default 'ANY' (matching current behavior: single predecessor unlocks)
  branchOf?: string;             // main node id this side path departs from
  isMilestone?: boolean;          // counts toward unit completion; can never be bypassed
  revealRule?: RevealRule;        // default 'ON_UNLOCK' for MAIN, per-type for SIDE
}

// === EXTENDED: NodeProgress ===
export interface NodeProgress {
  // --- existing fields (unchanged) ---
  stars: number;
  isLocked: boolean;
  mistakes?: number;

  // --- NEW (all optional) ---
  status?: NodeStatus;           // source of truth; isLocked mirrors this
  attempts?: number;             // drives ON_STRUGGLE reveal
  bypassedVia?: string;          // side node id that let them past
  lastPlayedAt?: number;         // analytics timestamp
}

// === NEW: Unit completion rule ===
export interface UnitCompletionRule {
  requiredMilestones?: string[];  // explicit node ids
  minMilestones?: number;         // or: N of the isMilestone nodes
  minStars?: number;
}

// === EXTENDED: LearningUnit ===
export interface LearningUnit {
  // --- existing fields (unchanged) ---
  id: string;
  title: string;
  theme: 'beach' | 'forest' | 'mountain' | 'space';
  nodes: LearningNode[];
  order: number;
  backgroundClass: string;

  // --- NEW ---
  completionRule?: UnitCompletionRule;  // default: all MAIN nodes completed
}
```

**Why `unlockedBy?: string[]` not `NodeUnlockCondition[]`:** The plan's original design is simpler and sufficient. Per-edge rules add complexity without benefit — the `unlockRule` on the node itself (`'ALL' | 'ANY'`) determines whether ALL or ANY of its `unlockedBy` nodes must be completed. This is cleaner than per-edge rules and matches the plan's intent.

### 2.2 New Module: `src/lib/sagaGraph.ts`

Pure functions, no React. Fully unit-testable.

```typescript
import type { LearningUnit, LearningNode, SagaProgress, NodeProgress } from '../types/learningPath';

// === Types ===
export interface SagaGraph {
  nodes: Map<string, LearningNode>;
  outgoing: Map<string, string[]>;   // nodeId → node ids this unlocks
  incoming: Map<string, string[]>;   // nodeId → node ids that unlock this
  unitOf: Map<string, string>;       // nodeId → unitId
  mainNodesByUnit: Map<string, LearningNode[]>;  // unitId → main path nodes in order
}

// === Build ===
export function buildGraph(curriculum: LearningUnit[]): SagaGraph {
  const nodes = new Map<string, LearningNode>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const unitOf = new Map<string, string>();
  const mainNodesByUnit = new Map<string, LearningNode[]>();

  let prevMainNodeId: string | null = null;

  for (const unit of curriculum) {
    const mainNodes: LearningNode[] = [];

    for (const node of unit.nodes) {
      nodes.set(node.id, node);
      unitOf.set(node.id, unit.id);
      outgoing.set(node.id, []);
      incoming.set(node.id, []);

      const isMain = !node.track || node.track === 'MAIN';
      if (isMain) {
        mainNodes.push(node);

        // Synthesize linear edge from previous main node if no explicit unlockedBy
        if (!node.unlockedBy && prevMainNodeId) {
          // Mutate a copy, not the original curriculum object
          // (callers should treat the graph as the source of truth)
          // We store the implicit edge in incoming/outgoing maps directly
          outgoing.get(prevMainNodeId)!.push(node.id);
          incoming.get(node.id)!.push(prevMainNodeId);
        }
        prevMainNodeId = node.id;
      }
    }

    // Handle cross-unit link: last main node of this unit → first main node of next
    // (Will be connected when next unit is processed and prevMainNodeId is set)
    mainNodesByUnit.set(unit.id, mainNodes);
  }

  // Process explicit unlockedBy edges
  for (const [nodeId, node] of nodes) {
    if (node.unlockedBy) {
      for (const depId of node.unlockedBy) {
        if (nodes.has(depId)) {
          outgoing.get(depId)!.push(nodeId);
          incoming.get(nodeId)!.push(depId);
        }
      }
    }
  }

  return { nodes, outgoing, incoming, unitOf, mainNodesByUnit };
}

// === Unlock Resolution ===
export function resolveUnlocks(
  graph: SagaGraph,
  progress: SagaProgress,
  justCompleted: string
): string[] {
  const newlyUnlocked: string[] = [];
  const candidates = graph.outgoing.get(justCompleted) || [];

  for (const candidateId of candidates) {
    const node = graph.nodes.get(candidateId);
    if (!node) continue;

    const currentProgress = progress[candidateId];
    const isCurrentlyLocked = !currentProgress || currentProgress.isLocked;
    if (!isCurrentlyLocked) continue;

    // Check reveal rule for side nodes
    if (!isNodeVisible(graph, progress, candidateId)) continue;

    // Check unlock conditions
    const deps = graph.incoming.get(candidateId) || [];
    const rule = node.unlockRule || 'ANY';

    const allDepsCompleted = deps.every(depId => {
      const depProg = progress[depId];
      return depProg && !depProg.isLocked && depProg.stars > 0;
    });

    const anyDepCompleted = deps.some(depId => {
      const depProg = progress[depId];
      return depProg && !depProg.isLocked && depProg.stars > 0;
    });

    if (rule === 'ALL' && allDepsCompleted) {
      newlyUnlocked.push(candidateId);
    } else if (rule === 'ANY' && anyDepCompleted) {
      newlyUnlocked.push(candidateId);
    }
  }

  return newlyUnlocked;
}

// === Visibility (for side nodes with reveal rules) ===
export function isNodeVisible(
  graph: SagaGraph,
  progress: SagaProgress,
  nodeId: string
): boolean {
  const node = graph.nodes.get(nodeId);
  if (!node) return false;

  // Main nodes are always visible
  if (!node.track || node.track === 'MAIN') return true;

  // Side nodes: check revealRule
  const revealRule = node.revealRule || { kind: 'ON_UNLOCK' };

  if (revealRule.kind === 'ALWAYS') return true;
  if (revealRule.kind === 'ON_UNLOCK') {
    // Visible if any incoming dep is completed
    const deps = graph.incoming.get(nodeId) || [];
    return deps.some(depId => {
      const p = progress[depId];
      return p && !p.isLocked && p.stars > 0;
    });
  }
  if (revealRule.kind === 'ON_STRUGGLE') {
    // Visible if the branchOf node has >= N attempts
    if (!node.branchOf) return false;
    const branchProg = progress[node.branchOf];
    if (!branchProg) return false;
    return (branchProg.attempts || 0) >= revealRule.attempts;
  }

  return false;
}

// === Lock Check ===
export function isNodeLocked(
  graph: SagaGraph,
  progress: SagaProgress,
  nodeId: string
): boolean {
  const node = graph.nodes.get(nodeId);
  if (!node) return true;

  const current = progress[nodeId];
  if (current && !current.isLocked) return false;
  if (current && current.status === 'COMPLETED') return false;

  // Check if all/any deps are completed
  const deps = graph.incoming.get(nodeId) || [];
  if (deps.length === 0) {
    // No dependencies — this is a root node (first node of first unit, or uninitialized)
    // Check if it's the first main node of any unit
    for (const [, mainNodes] of graph.mainNodesByUnit) {
      if (mainNodes[0]?.id === nodeId) return false;
    }
    return true;
  }

  const rule = node.unlockRule || 'ANY';
  if (rule === 'ALL') {
    return !deps.every(depId => {
      const p = progress[depId];
      return p && !p.isLocked && p.stars > 0;
    });
  } else {
    return !deps.some(depId => {
      const p = progress[depId];
      return p && !p.isLocked && p.stars > 0;
    });
  }
}

// === Unit Completion ===
export function isUnitComplete(
  graph: SagaGraph,
  unit: LearningUnit,
  progress: SagaProgress
): boolean {
  if (unit.completionRule) {
    const rule = unit.completionRule;
    if (rule.requiredMilestones) {
      return rule.requiredMilestones.every(id => {
        const p = progress[id];
        return p && !p.isLocked && p.stars > 0;
      });
    }
    if (rule.minMilestones) {
      const mainNodes = graph.mainNodesByUnit.get(unit.id) || [];
      const milestones = mainNodes.filter(n => n.isMilestone);
      const completed = milestones.filter(n => {
        const p = progress[n.id];
        return p && !p.isLocked && p.stars > 0;
      });
      return completed.length >= rule.minMilestones;
    }
  }

  // Default: all main nodes completed
  const mainNodes = graph.mainNodesByUnit.get(unit.id) || [];
  return mainNodes.every(n => {
    const p = progress[n.id];
    return p && !p.isLocked && p.stars > 0;
  });
}

// === Bypass Marking ===
export function markBypassed(
  graph: SagaGraph,
  progress: SagaProgress,
  completedSideNodeId: string
): SagaProgress {
  const sideNode = graph.nodes.get(completedSideNodeId);
  if (!sideNode || !sideNode.branchOf) return progress;

  // Find main nodes that this side node can bypass
  // A main node M is bypassed if:
  // 1. M has completedSideNodeId in its incoming edges
  // 2. M's other main-path predecessor is NOT completed
  // 3. M is not a milestone
  // 4. Unit hasn't exceeded 2 bypasses

  const outgoing = graph.outgoing.get(completedSideNodeId) || [];
  const result = { ...progress };

  for (const mainNodeId of outgoing) {
    const mainNode = graph.nodes.get(mainNodeId);
    if (!mainNode || mainNode.isMilestone) continue;
    if (mainNode.track && mainNode.track !== 'MAIN') continue;

    // Check if main node is already completed
    const mainProg = result[mainNodeId];
    if (mainProg && !mainProg.isLocked && mainProg.stars > 0) continue;

    // Count existing bypasses in this unit
    const unitId = graph.unitOf.get(mainNodeId);
    if (!unitId) continue;
    let bypassCount = 0;
    for (const [nid, np] of Object.entries(result)) {
      if (np.bypassedVia && graph.unitOf.get(nid) === unitId) {
        bypassCount++;
      }
    }
    if (bypassCount >= 2) continue;

    // Mark as SKIPPED (available but not completed)
    result[mainNodeId] = {
      ...mainProg,
      stars: 0,
      isLocked: false,
      status: 'SKIPPED',
      bypassedVia: completedSideNodeId,
    };
  }

  return result;
}

// === Validation ===
export function validateCurriculum(curriculum: LearningUnit[]): string[] {
  const errors: string[] = [];
  const graph = buildGraph(curriculum);

  // 1. No cycles (topological sort)
  const visited = new Set<string>();
  const inProgress = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (inProgress.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    inProgress.add(nodeId);
    for (const next of graph.outgoing.get(nodeId) || []) {
      if (hasCycle(next)) {
        errors.push(`Cycle detected involving node: ${nodeId} → ${next}`);
        return true;
      }
    }
    inProgress.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  for (const [nodeId] of graph.nodes) {
    if (!visited.has(nodeId)) hasCycle(nodeId);
  }

  // 2. Milestone nodes must not have ANY rule with side node deps
  for (const [nodeId, node] of graph.nodes) {
    if (!node.isMilestone) continue;
    if (node.unlockRule === 'ANY') {
      const deps = graph.incoming.get(nodeId) || [];
      const hasSideDep = deps.some(depId => {
        const dep = graph.nodes.get(depId);
        return dep && dep.track === 'SIDE';
      });
      if (hasSideDep) {
        errors.push(`Milestone node ${nodeId} has ANY rule with side node dependency — milestones must be unbypassable`);
      }
    }
  }

  // 3. Speed Gate nodes must never be in bypass position
  for (const [nodeId, node] of graph.nodes) {
    if (node.type === 'SPEED_GATE' && node.branchOf) {
      const outgoing = graph.outgoing.get(nodeId) || [];
      for (const targetId of outgoing) {
        const target = graph.nodes.get(targetId);
        if (target && (!target.track || target.track === 'MAIN') && !target.isMilestone) {
          errors.push(`Speed Gate ${nodeId} bypasses main node ${targetId} — Speed Gates must never bypass`);
        }
      }
    }
  }

  // 4. Main path alone must always complete the unit
  for (const unit of curriculum) {
    const mainNodes = graph.mainNodesByUnit.get(unit.id) || [];
    if (mainNodes.length === 0) {
      errors.push(`Unit ${unit.id} has no main nodes`);
    }
  }

  // 5. No orphan nodes (every node reachable from some root)
  for (const [nodeId] of graph.nodes) {
    const deps = graph.incoming.get(nodeId) || [];
    if (deps.length === 0) {
      // Must be a first main node of some unit
      let isRoot = false;
      for (const [, mainNodes] of graph.mainNodesByUnit) {
        if (mainNodes[0]?.id === nodeId) { isRoot = true; break; }
      }
      if (!isRoot) {
        errors.push(`Orphan node: ${nodeId} has no incoming edges and is not a unit root`);
      }
    }
  }

  return errors;
}

// === Helper: is side node ===
export function isSideNode(node: LearningNode): boolean {
  return node.track === 'SIDE' ||
    node.type === 'TREASURE_CAVE' ||
    node.type === 'MASCOT_GAME' ||
    node.type === 'SPEED_GATE';
}
```

### 2.3 New Module: `src/lib/progressMigration.ts`

```typescript
import type { SagaProgress, NodeProgress } from '../types/learningPath';

const SCHEMA_VERSION = 2;

export interface PersistedProgress {
  schemaVersion: number;
  progress: SagaProgress;
}

export function migrateProgress(raw: unknown): SagaProgress {
  // Handle both old (bare SagaProgress) and new (wrapped) formats
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;

    // New format: { schemaVersion, progress }
    if ('schemaVersion' in obj && 'progress' in obj && obj.progress && typeof obj.progress === 'object') {
      return migrateV1toV2(obj.progress as SagaProgress);
    }

    // Old format: bare SagaProgress object
    if (!('schemaVersion' in obj)) {
      return migrateV1toV2(obj as SagaProgress);
    }
  }

  return {};
}

function migrateV1toV2(old: SagaProgress): SagaProgress {
  const result: SagaProgress = {};

  for (const [nodeId, nodeProg] of Object.entries(old)) {
    const np: NodeProgress = {
      stars: nodeProg.stars || 0,
      isLocked: nodeProg.isLocked ?? true,
      mistakes: nodeProg.mistakes,
    };

    // Derive status from existing fields
    if (np.isLocked) {
      np.status = 'LOCKED';
    } else if (np.stars > 0) {
      np.status = 'COMPLETED';
    } else {
      np.status = 'AVAILABLE';
    }

    // Preserve existing optional fields
    if (nodeProg.attempts) np.attempts = nodeProg.attempts;
    if ((nodeProg as any).bypassedVia) np.bypassedVia = (nodeProg as any).bypassedVia;
    if ((nodeProg as any).lastPlayedAt) np.lastPlayedAt = (nodeProg as any).lastPlayedAt;

    result[nodeId] = np;
  }

  return result;
}

export function wrapForPersistence(progress: SagaProgress): PersistedProgress {
  return {
    schemaVersion: SCHEMA_VERSION,
    progress,
  };
}
```

### 2.4 Rewire `ProgressContext.tsx`

**Current** (lines 78-110 of src/context/ProgressContext.tsx):
```typescript
const completeNode = (nodeId: string, stars: number): void => {
    if (!profile) return;
    setProgress(prev => {
        // ... flat CURRICULUM traversal to find next node ...
        let found = false;
        let nextNodeId: string | null = null;
        for (const unit of CURRICULUM) {
            for (const node of unit.nodes) {
                if (found) { nextNodeId = node.id; break; }
                if (node.id === nodeId) { found = true; }
            }
            if (nextNodeId) break;
        }
        if (nextNodeId) {
            newProgress[nextNodeId] = { ...nextState, isLocked: false };
        }
        return newProgress;
    });
};
```

**After** (same behavior, graph-driven):
```typescript
import { buildGraph, resolveUnlocks, isNodeLocked as graphIsLocked, markBypassed, isSideNode } from '../lib/sagaGraph';

// Build graph once at module scope
const SAGA_GRAPH = buildGraph(CURRICULUM);

// Inside ProgressProvider:
const completeNode = (nodeId: string, stars: number): void => {
    if (!profile) return;
    setProgress(prev => {
        const current = prev[nodeId] || { isLocked: false, stars: 0 };
        const newStars = Math.max(current.stars, stars);

        let newProgress: SagaProgress = {
            ...prev,
            [nodeId]: {
                ...current,
                stars: newStars,
                isLocked: false,
                status: 'COMPLETED',
            }
        };

        // Resolve unlocks via graph
        const unlocked = resolveUnlocks(SAGA_GRAPH, newProgress, nodeId);
        for (const id of unlocked) {
            const existing = newProgress[id] || { stars: 0, isLocked: true };
            newProgress[id] = {
                ...existing,
                isLocked: false,
                status: 'AVAILABLE',
            };
        }

        // Mark bypassed main nodes if this was a side node
        const completedNode = SAGA_GRAPH.nodes.get(nodeId);
        if (completedNode && isSideNode(completedNode)) {
            newProgress = markBypassed(SAGA_GRAPH, newProgress, nodeId);
        }

        return newProgress;
    });
};

const isNodeLocked = (nodeId: string): boolean => {
    return graphIsLocked(SAGA_GRAPH, progress, nodeId);
};
```

**Critical: Phase 1 must NOT add side nodes to CURRICULUM.** The graph synthesizes linear edges for all existing 53 nodes. `resolveUnlocks` produces the same unlock chain as the flat traversal. The 3 existing ProgressContext tests (load, save, legacy migration) pass unchanged.

### 2.5 Update `progression.ts`

`getInitialProgress(age)` must set `status` on initialized nodes:

```typescript
// In the loop that unlocks first nodes:
progress[firstNodeId] = {
    stars: 0,
    isLocked: false,
    mistakes: 0,
    status: 'AVAILABLE',
};
```

This is a 1-line addition per node. The existing `isLocked: false` check in tests still works.

### 2.6 Dev-Mode Validation Guard

Add to `ProgressContext.tsx` or `main.tsx`:

```typescript
if (import.meta.env.DEV) {
  const errors = validateCurriculum(CURRICULUM);
  if (errors.length > 0) {
    console.error('[sagaGraph] Curriculum validation errors:', errors);
  }
}
```

### 2.7 Phase 1 Test Plan

All 953 existing tests must pass. New tests to add:

**File: `src/lib/__tests__/sagaGraph.test.ts`**

| Test | Description |
|---|---|
| `buildGraph — synthesizes linear edges for 53 existing nodes` | Graph has 53 nodes, 52 edges (n-1 linear chain) |
| `buildGraph — first node of each unit has no incoming edge (or cross-unit edge)` | Verify root nodes |
| `resolveUnlocks — completing n1_1 unlocks n1_3a` | (n1_3a follows n1_1 in array, n1_2 is between them) — **Wait**: check actual order. n1_1→n1_2→n1_3a→n1_3. Linear chain in array order. |
| `resolveUnlocks — completing last node of unit_1 unlocks first node of unit_2` | Cross-unit edge |
| `isNodeLocked — root node returns false` | First node of age-appropriate unit |
| `isNodeLocked — unreached node returns true` | Node with uncompleted predecessor |
| `isNodeLocked — completed node returns false` | Node with stars > 0 |
| `validateCurriculum — passes for current 53-node curriculum` | Zero errors |
| `validateCurriculum — detects cycle` | Synthetic cyclic graph |
| `validateCurriculum — detects milestone with ANY side dep` | Synthetic violation |
| `isUnitComplete — returns true when all main nodes completed` | Full unit |
| `isUnitComplete — returns false when main node missing` | Partial unit |

**File: `src/lib/__tests__/progressMigration.test.ts`**

| Test | Description |
|---|---|
| `migrateV1toV2 — LOCKED when isLocked=true` | Status derivation |
| `migrateV1toV2 — COMPLETED when isLocked=false and stars>0` | Status derivation |
| `migrateV1toV2 — AVAILABLE when isLocked=false and stars=0` | Status derivation |
| `migrateV1toV2 — preserves attempts and mistakes` | Field passthrough |
| `migrateProgress — handles bare SagaProgress (old format)` | No wrapper |
| `migrateProgress — handles wrapped PersistedProgress` | New format |
| `migrateProgress — handles empty object` | Returns {} |

---

## 3. Phase 2: Treasure Caves — MVP Value

**Goal:** One treasure cave per unit. The smallest change that actually unsticks a kid.

### 3.1 Treasure Cave Curriculum Entries

Add 1 Treasure Cave node per unit to `src/data/learningPath.ts`. Insert AFTER the node it branches from, at the end of the nodes array (so it doesn't disrupt main-node indexing).

**Unit 1 — "Sparkle Cave" (branches from n1_4 "Pop the 7s")**
```typescript
{
  id: 'u1_cave_a',
  unitId: 'unit_1',
  title: 'Sparkle Cave',
  description: 'Find treasure numbers!',
  type: 'TREASURE_CAVE',
  track: 'SIDE',
  position: { x: 85, y: 300 },  // right side, between n1_3 (y=240) and n1_4 (y=360)
  branchOf: 'n1_4',
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
}
```

**Unit 2 — "Acorn Stash" (branches from n2_4 "Take Away")**
```typescript
{
  id: 'u2_cave_a',
  unitId: 'unit_2',
  title: 'Acorn Stash',
  description: 'Hidden forest treasure!',
  type: 'TREASURE_CAVE',
  track: 'SIDE',
  position: { x: 85, y: 390 },  // right side, between n2_3a (y=375) and n2_4 (y=450)
  branchOf: 'n2_4',
  unlockedBy: ['n2_3'],
  unlockRule: 'ANY',
  revealRule: { kind: 'ON_STRUGGLE', attempts: 2 },
  isMilestone: false,
  config: {
    timeLimitSec: 30,
    problemCount: 5,
    coinReward: 15,
    gemReward: 3,
    difficultyLevel: 2,
    bypassTarget: 'n2_4'
  }
}
```

**Unit 3 — "Crystal Mine" (branches from n3_4 "Skip Counting")**
```typescript
{
  id: 'u3_cave_a',
  unitId: 'unit_3',
  title: 'Crystal Mine',
  description: 'Dig up number gems!',
  type: 'TREASURE_CAVE',
  track: 'SIDE',
  position: { x: 85, y: 390 },
  branchOf: 'n3_4',
  unlockedBy: ['n3_3'],
  unlockRule: 'ANY',
  revealRule: { kind: 'ON_STRUGGLE', attempts: 2 },
  isMilestone: false,
  config: {
    timeLimitSec: 30,
    problemCount: 5,
    coinReward: 20,
    gemReward: 5,
    difficultyLevel: 4,
    bypassTarget: 'n3_4'
  }
}
```

**Unit 4 — "Pyramid Vault" (branches from n4_4 "Missing Part")**
```typescript
{
  id: 'u4_cave_a',
  unitId: 'unit_4',
  title: 'Pyramid Vault',
  description: 'Ancient number secrets!',
  type: 'TREASURE_CAVE',
  track: 'SIDE',
  position: { x: 85, y: 390 },
  branchOf: 'n4_4',
  unlockedBy: ['n4_3'],
  unlockRule: 'ANY',
  revealRule: { kind: 'ON_STRUGGLE', attempts: 2 },
  isMilestone: false,
  config: {
    timeLimitSec: 35,
    problemCount: 5,
    coinReward: 20,
    gemReward: 5,
    difficultyLevel: 5,
    bypassTarget: 'n4_4'
  }
}
```

**Unit 5 — "Black Hole Cache" (branches from n5_4 "Velocity")**
```typescript
{
  id: 'u5_cave_a',
  unitId: 'unit_5',
  title: 'Black Hole Cache',
  description: 'Cosmic number treasure!',
  type: 'TREASURE_CAVE',
  track: 'SIDE',
  position: { x: 85, y: 390 },
  branchOf: 'n5_4',
  unlockedBy: ['n5_3'],
  unlockRule: 'ANY',
  revealRule: { kind: 'ON_STRUGGLE', attempts: 2 },
  isMilestone: false,
  config: {
    timeLimitSec: 30,
    problemCount: 5,
    coinReward: 25,
    gemReward: 7,
    difficultyLevel: 7,
    bypassTarget: 'n5_4'
  }
}
```

**Additionally:** Update the `unlockedBy` on each bypassed main node to include the cave:

```typescript
// n1_4 gets: unlockedBy: ['n1_3', 'u1_cave_a'], unlockRule: 'ANY'
// (was: no explicit unlockedBy, synthesized linear edge from n1_3)
```

This is the bypass mechanism: completing EITHER n1_3 (main path) OR u1_cave_a (side path) unlocks n1_4. But the cave only becomes VISIBLE after 2 failed attempts on n1_4's predecessor (n1_3 → n1_4). Wait — the cave branches from n1_4 and is unlocked by n1_3. So:
- n1_3 completed → cave is available (but invisible if ON_STRUGGLE)
- n1_4 is the hard node. Kid attempts n1_4, fails twice → cave becomes visible
- Kid completes cave → n1_4 gets unlocked (via ANY rule) → kid proceeds

**Correction to bypassTarget semantics:** The cave doesn't bypass n1_4 — it provides an alternate path TO n1_5. Update:

```typescript
// n1_5 gets: unlockedBy: ['n1_4', 'u1_cave_a'], unlockRule: 'ANY'
```

The cave is `unlockedBy: ['n1_3']` (available after n1_3). Completing the cave unlocks n1_5 (the node AFTER the hard node n1_4). This means the kid skips n1_4 entirely via the cave path.

**Revised cave node for Unit 1:**
```typescript
{
  id: 'u1_cave_a',
  unitId: 'unit_1',
  title: 'Sparkle Cave',
  description: 'Find treasure numbers!',
  type: 'TREASURE_CAVE',
  track: 'SIDE',
  position: { x: 85, y: 300 },
  branchOf: 'n1_4',             // visually branches near n1_4
  unlockedBy: ['n1_3'],         // available after n1_3
  unlockRule: 'ANY',
  revealRule: { kind: 'ON_STRUGGLE', attempts: 2 },
  isMilestone: false,
  config: {
    timeLimitSec: 30,
    problemCount: 5,
    coinReward: 15,
    gemReward: 3,
    difficultyLevel: 1,
  }
}
// And n1_5 gets: unlockedBy: ['n1_4', 'u1_cave_a'], unlockRule: 'ANY'
```

Apply the same pattern for all 5 units: cave branches from the hard node (n1_4, n2_4, n3_4, n4_4, n5_4), is unlocked by the node before it, and the node AFTER the hard node gets `unlockedBy` including both the hard node and the cave with `ANY` rule.

### 3.2 Struggle Detection

Add to `ProgressContext.tsx`:

```typescript
const recordAttempt = (nodeId: string, mistakes: number): void => {
    if (!profile) return;
    setProgress(prev => {
        const current = prev[nodeId] || { isLocked: false, stars: 0 };
        return {
            ...prev,
            [nodeId]: {
                ...current,
                attempts: (current.attempts || 0) + 1,
                mistakes,
            }
        };
    });
};
```

Call `recordAttempt` from `GameOrchestrator.tsx` when a session ends with <50% accuracy (or whenever a node is abandoned without completion). The `ON_STRUGGLE` side nodes become visible when `attempts >= 2` via `isNodeVisible()` in sagaGraph.

### 3.3 New Components

#### `src/components/saga/SagaNode.tsx`

Extracted from SagaMap.tsx (lines 170-230). Props:

```typescript
interface SagaNodeProps {
  node: LearningNode;
  index: number;          // index within main nodes (for vertical positioning)
  locked: boolean;
  stars: number;
  isRtl: boolean;
  onSelect: (node: LearningNode) => void;
}
```

Renders the 80px circular main path node with lock/star/number states. Identical visual to current SagaMap node rendering.

#### `src/components/saga/SideNode.tsx`

```typescript
interface SideNodeProps {
  node: LearningNode;
  visible: boolean;       // from isNodeVisible()
  locked: boolean;        // from isNodeLocked()
  stars: number;
  isRtl: boolean;
  onSelect: (node: LearningNode) => void;
}
```

Visual states:
- **Not visible**: render nothing
- **Visible + locked**: 64px circle, grayscale, 40% opacity, sparkle icon
- **Visible + available**: 64px circle, `from-amber-300 to-yellow-500` gradient, ring + soft bounce (respects `prefers-reduced-motion`), 💎 icon
- **Completed**: 64px circle, full color, star badge below

Position: absolute, `left: {node.position.x}%`, `top: {parentY + 75}px` (midpoint between two main nodes). `data-testid="side-node-{id}"`.

#### `src/components/saga/SagaConnectors.tsx`

```typescript
interface SagaConnectorsProps {
  unit: LearningUnit;
  graph: SagaGraph;
  progress: SagaProgress;
  containerWidth: number;
}
```

Uses `ResizeObserver` to measure section width. Renders SVG `<path>` elements:

**Main → Main:** Dotted stepping-stone trail
```
M ${x1} ${y1} C ${x1} ${y1+60}, ${x2} ${y2-60}, ${x2} ${y2}
stroke-width=8, stroke-dasharray="2 14", stroke-linecap="round", stroke=slate-400
```

**Main → Side (visible):** Curved branch path
```
M ${x1} ${y1} C ${x1+dx} ${y1+20}, ${x2} ${y2-40}, ${x2} ${y2}
stroke-width=5, opacity=0.55, stroke=amber-400 (for treasure caves)
```

**Side → Main (rejoin):** Only renders once side node is unlocked
```
M ${xSide} ${ySide} C ${xSide-dx} ${ySide+20}, ${xMain} ${yMain-40}, ${xMain} ${yMain}
stroke-width=5, opacity=0.55, stroke=amber-400, stroke-dasharray="4 8"
```

All animations gated behind `@media (prefers-reduced-motion: no-preference)`.

### 3.4 SagaMap.tsx Changes

| Change | Location |
|---|---|
| Import SagaNode, SideNode, SagaConnectors | top of file |
| Import buildGraph, isNodeVisible, isSideNode from sagaGraph | top of file |
| Filter side nodes from main nodes for height calc | `const mainNodes = unit.nodes.filter(n => !isSideNode(n))` |
| Update container height | `mainNodes.length * 150 + 100` (was `unit.nodes.length * 150 + 100`) |
| Render `<SagaConnectors>` inside each unit section | Replace empty SVG |
| Render `<SagaNode>` for main nodes | Replace inline motion.div |
| Render `<SideNode>` for visible side nodes | After main nodes loop, `unit.nodes.filter(n => isSideNode(n) && isNodeVisible(graph, progress, n.id))` |
| Keep header, arcade modal, badges, shop, quest panel | Unchanged |

### 3.5 GameOrchestrator: TREASURE_CAVE Handler

Add to `GameOrchestrator.tsx` mode dispatch:

```typescript
// In the game mode selection logic:
if (node?.type === 'TREASURE_CAVE') {
  return <TreasureCaveGame
    config={node.config}
    onComplete={(coins, gems) => {
      addCoins(coins);
      addGems(gems);
      completeNode(node.id, 1);  // 1 star (side nodes don't give stars)
      logEvent('side_node_complete', {
        node_id: node.id,
        side_type: 'treasure',
        coins_earned: coins,
        gems_earned: gems,
      });
      onExit();
    }}
    onExit={onExit}
  />;
}
```

**New component: `src/components/games/TreasureCaveGame.tsx`**

A timed mini-game: 5 simple math problems, 30-second timer. No fail state — if timer runs out, kid gets partial rewards (proportional coins, 1 gem). Uses existing MathModule for problem generation at `config.difficultyLevel`.

### 3.6 GA4 Events

Add to `src/hooks/useAnalytics.ts`:

```typescript
// Add to AnalyticsEvent type:
| 'side_node_start'
| 'side_node_complete'
| 'path_bypass_used'

// Logging calls:
// On side node entry:
logEvent('side_node_start', { node_id: nodeId, side_type: 'treasure', unit_id: unitId });

// On side node completion:
logEvent('side_node_complete', { node_id: nodeId, side_type: 'treasure', coins_earned: coins, gems_earned: gems });

// When bypass is triggered (in markBypassed or completeNode):
logEvent('path_bypass_used', { main_node_bypassed: mainNodeId, side_node_used: sideNodeId, unit_id: unitId });
```

### 3.7 Phase 2 Test Plan

**File: `src/components/saga/__tests__/SideNode.test.tsx`**

| Test | Description |
|---|---|
| `renders nothing when not visible` | `visible=false` → null |
| `renders locked state with grayscale` | `visible=true, locked=true` → has grayscale class |
| `renders available state with amber gradient` | `visible=true, locked=false, stars=0` → has amber class |
| `renders completed state with star badge` | `stars=1` → shows star badge |
| `respects prefers-reduced-motion` | No bounce animation when reduced motion |
| `has data-testid="side-node-{id}"` | Correct testid |

**File: `src/lib/__tests__/sagaGraph.branching.test.ts`**

| Test | Description |
|---|---|
| `isNodeVisible — ALWAYS returns true` | Treasure cave with ALWAYS reveal |
| `isNodeVisible — ON_STRUGGLE returns false before attempts` | 0 attempts |
| `isNodeVisible — ON_STRUGGLE returns true after 2 attempts` | 2 attempts on branchOf node |
| `markBypassed — marks main node as SKIPPED` | Side node completed → main node SKIPPED |
| `markBypassed — does not bypass milestone` | Milestone stays locked |
| `markBypassed — enforces max 2 per unit` | 3rd bypass blocked |
| `resolveUnlocks — ANY rule unlocks with side node` | Side node completes → main node after hard node unlocks |
| `validateCurriculum — detects Speed Gate in bypass position` | Validation error |

**File: `src/__tests__/ProgressContext.branching.test.tsx`**

| Test | Description |
|---|---|
| `completeNode on treasure cave unlocks next main node` | Bypass flow |
| `recordAttempt increments attempts` | Struggle tracking |
| `SKIPPED node can still be completed later` | SKIPPED → COMPLETED transition |
| `max 2 bypasses per unit` | Third bypass doesn't mark |

---

## 4. Phase 3: Mascot Mini-Games + Speed Gates

### 4.1 Mascot Mini-Game Nodes

1 per unit (5 total). `revealRule: { kind: 'ALWAYS' }` — always visible, aspirational content.

```typescript
// Example: Unit 1 Mascot Game
{
  id: 'u1_mascot_a',
  unitId: 'unit_1',
  title: 'Feed the Owl',
  description: 'Play with your mascot!',
  type: 'MASCOT_GAME',
  track: 'SIDE',
  position: { x: 12, y: 540 },  // left side, near node 5
  branchOf: 'n1_5',
  unlockedBy: ['n1_4'],           // available after n1_4
  unlockRule: 'ANY',
  revealRule: { kind: 'ALWAYS' },
  isMilestone: false,
  config: {
    gameType: 'feed_pet',
    durationSec: 45,
    gemReward: 2,
    stickerReward: 'owl_hat_1',
  }
}
```

**Never in bypass position:** Mascot game nodes do NOT appear in any main node's `unlockedBy`. They're pure bonus content.

### 4.2 Speed Gate Nodes

Units 3-5 only (older/faster kids). `revealRule: { kind: 'ALWAYS' }`.

```typescript
// Example: Unit 3 Speed Gate
{
  id: 'u3_speed_a',
  unitId: 'unit_3',
  title: 'Lightning Round',
  description: 'Beat the clock!',
  type: 'SPEED_GATE',
  track: 'SIDE',
  position: { x: 12, y: 690 },  // left side, near node 5
  branchOf: 'n3_5',
  unlockedBy: ['n3_4'],
  unlockRule: 'ANY',
  revealRule: { kind: 'ALWAYS' },
  isMilestone: false,
  config: {
    timeLimitSec: 20,
    problemCount: 10,
    targetAccuracy: 0.8,
    cosmeticReward: 'rocket_skin',
  }
}
```

**Speed Gates NEVER in bypass position:** No main node has a Speed Gate in its `unlockedBy`. The `validateCurriculum` function checks this.

### 4.3 GameOrchestrator Handlers

**MASCOT_GAME:** Dispatch to `src/components/games/MascotMiniGame.tsx` — a simple pet-themed game (feed_pet = drag food to mascot, dress_up = select outfit items, trick_show = tap sequence). Always succeeds, gives gems + sticker.

**SPEED_GATE:** Dispatch to `src/components/games/SpeedGateGame.tsx` — fast-paced math drill with tight timer. Can fail (no bypass consequence). On success: large cosmetic reward. On failure: encouraging message, can retry.

### 4.4 SideNode Visual Variants

Update `SideNode.tsx` to render differently per type:

| Type | Shape | Palette | Icon |
|---|---|---|---|
| `TREASURE_CAVE` | Circle, 64px | `from-amber-300 to-yellow-500` | 💎 |
| `MASCOT_GAME` | Circle w/ mascot portrait | `from-fuchsia-400 to-purple-500` | Mascot emoji |
| `SPEED_GATE` | Rounded-rect gate | `from-cyan-300 to-blue-500` | ⏱️ |

### 4.5 Phase 3 Test Plan

| Test | Description |
|---|---|
| `SideNode renders mascot variant with fuchsia gradient` | Visual differentiation |
| `SideNode renders speed gate variant as rounded rect` | Shape differentiation |
| `validateCurriculum — Speed Gate never in bypass position` | Graph validation |
| `MascotMiniGame — always completes (no fail state)` | Guaranteed completion |
| `SpeedGateGame — can fail without consequence` | Failure handling |
| `Mascot game gives gems, not stars` | Reward currency check |
| `Speed gate gives cosmetic, not stars` | Reward currency check |

---

## 5. Risk Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| Phase 1 breaks existing 953 tests | HIGH | Graph synthesizes identical linear chain. Run full suite after each file change. If any test fails, the graph is NOT correct — do not proceed. |
| SagaMap height calculation breaks with extra nodes | MEDIUM | Filter `isSideNode()` before counting. Use `mainNodes.length * 150 + 100`. |
| e2e selectors `saga-node-nX_Y` collide with side nodes | LOW | Side nodes use `side-node-{id}` testid pattern. Main node testids unchanged. |
| Old save data with unknown node ids | LOW | `migrateProgress` drops unknown ids silently (curriculum changed). Add `schemaVersion: 2` wrapper. |
| Bypass then complete later loses stars | LOW | `SKIPPED → COMPLETED` always allowed. `completeNode` uses `Math.max(stars, newStars)`. |
| Kid bypasses everything | MEDIUM | Max 2 bypasses per unit enforced in `markBypassed`. Milestones unbypassable. |
| Graph cycle in curriculum | LOW | `validateCurriculum` runs in dev mode. Topological sort detects cycles. |
| Performance: 70 nodes re-rendering | LOW | `React.memo` each `SagaNode` on its own progress slice. Graph built once at module scope. |
| 360px phone horizontal overflow | MEDIUM | Side nodes at x=12% or x=85%. At 360px: 0.85×360=306px + 32px half-width = 338px, leaving 22px margin. Safe. |
| `prefers-reduced-motion` not respected | LOW | All animations gated behind `@media (prefers-reduced-motion: no-preference)` CSS query. |

---

## 6. File Manifest

| File | Action | Est. Lines | Purpose |
|---|---|---|---|
| `src/types/learningPath.ts` | Modify | +60 | Add branching types, NodeStatus, RevealRule, UnitCompletionRule |
| `src/lib/sagaGraph.ts` | Create | ~250 | Graph engine: build, resolve, lock check, validate, bypass |
| `src/lib/progressMigration.ts` | Create | ~80 | Schema v1→v2 migration |
| `src/context/ProgressContext.tsx` | Modify | +30 | Rewire completeNode to graph, add recordAttempt |
| `src/lib/progression.ts` | Modify | +3 | Add status: 'AVAILABLE' to initialized nodes |
| `src/data/learningPath.ts` | Modify | +70 | Add 5 Treasure Cave nodes (Phase 2), 5 Mascot + 3 Speed Gate (Phase 3) |
| `src/components/saga/SagaNode.tsx` | Create | ~80 | Extracted main node component |
| `src/components/saga/SideNode.tsx` | Create | ~100 | Side node component with type variants |
| `src/components/saga/SagaConnectors.tsx` | Create | ~120 | SVG connector paths with ResizeObserver |
| `src/components/map/SagaMap.tsx` | Modify | ~40 changed | Use extracted components, filter side nodes, update height |
| `src/components/games/TreasureCaveGame.tsx` | Create | ~150 | Timed treasure cave mini-game |
| `src/components/games/MascotMiniGame.tsx` | Create | ~120 | Pet-themed mini-game (Phase 3) |
| `src/components/games/SpeedGateGame.tsx` | Create | ~100 | Speed drill mini-game (Phase 3) |
| `src/components/GameOrchestrator.tsx` | Modify | +30 | Add TREASURE_CAVE, MASCOT_GAME, SPEED_GATE dispatch |
| `src/hooks/useAnalytics.ts` | Modify | +5 | Add side_node_start, side_node_complete, path_bypass_used events |
| `src/lib/__tests__/sagaGraph.test.ts` | Create | ~150 | Phase 1 graph engine tests |
| `src/lib/__tests__/progressMigration.test.ts` | Create | ~80 | Migration tests |
| `src/lib/__tests__/sagaGraph.branching.test.ts` | Create | ~120 | Phase 2 branching tests |
| `src/components/saga/__tests__/SideNode.test.tsx` | Create | ~80 | SideNode component tests |
| `src/__tests__/ProgressContext.branching.test.tsx` | Create | ~100 | Branching progress integration tests |
| **Total** | | **~1,640** | |

---

## 7. Implementation Order (Sequenced Checklist)

### Phase 1: Graph Foundation (zero behavior change)

- [ ] **P1.1** — Extend `src/types/learningPath.ts` with optional branching fields
- [ ] **P1.2** — Create `src/lib/sagaGraph.ts` (buildGraph, resolveUnlocks, isNodeLocked, isNodeVisible, isUnitComplete, markBypassed, validateCurriculum, isSideNode)
- [ ] **P1.3** — Create `src/lib/progressMigration.ts` (migrateProgress, wrapForPersistence)
- [ ] **P1.4** — Create `src/lib/__tests__/sagaGraph.test.ts` and verify all pass
- [ ] **P1.5** — Create `src/lib/__tests__/progressMigration.test.ts` and verify all pass
- [ ] **P1.6** — Rewire `src/context/ProgressContext.tsx` to use sagaGraph (import buildGraph, replace completeNode logic, update isNodeLocked)
- [ ] **P1.7** — Update `src/lib/progression.ts` to set `status: 'AVAILABLE'` on initialized nodes
- [ ] **P1.8** — Add dev-mode `validateCurriculum()` call in `main.tsx` or `ProgressContext.tsx`
- [ ] **P1.9** — Run full test suite: `npx vitest run` — **MUST be 953/953** (1 pre-existing fail OK)
- [ ] **P1.10** — Update `loadProgressForProfile` to use `migrateProgress()` for save data

### Phase 2: Treasure Caves (MVP)

- [ ] **P2.1** — Add 5 Treasure Cave nodes to `src/data/learningPath.ts` with explicit `unlockedBy` on bypass target nodes
- [ ] **P2.2** — Add `recordAttempt()` to `ProgressContext.tsx`
- [ ] **P2.3** — Create `src/components/saga/SagaNode.tsx` (extract from SagaMap)
- [ ] **P2.4** — Create `src/components/saga/SideNode.tsx` (treasure cave variant)
- [ ] **P2.5** — Create `src/components/saga/SagaConnectors.tsx` (SVG paths with ResizeObserver)
- [ ] **P2.6** — Update `src/components/map/SagaMap.tsx` to use SagaNode, SideNode, SagaConnectors; filter side nodes from height calc
- [ ] **P2.7** — Create `src/components/games/TreasureCaveGame.tsx`
- [ ] **P2.8** — Update `src/components/GameOrchestrator.tsx` with TREASURE_CAVE dispatch
- [ ] **P2.9** — Add GA4 events to `src/hooks/useAnalytics.ts`
- [ ] **P2.10** — Write `sagaGraph.branching.test.ts` and `ProgressContext.branching.test.tsx`
- [ ] **P2.11** — Write `SideNode.test.tsx`
- [ ] **P2.12** — Run full test suite — existing tests must pass + new tests pass

### Phase 3: Mascot Mini-Games + Speed Gates

- [ ] **P3.1** — Add 5 Mascot Game nodes to curriculum
- [ ] **P3.2** — Add 3 Speed Gate nodes (units 3-5) to curriculum
- [ ] **P3.3** — Update `SideNode.tsx` with mascot and speed gate visual variants
- [ ] **P3.4** — Create `src/components/games/MascotMiniGame.tsx`
- [ ] **P3.5** — Create `src/components/games/SpeedGateGame.tsx`
- [ ] **P3.6** — Update `GameOrchestrator.tsx` with MASCOT_GAME and SPEED_GATE dispatch
- [ ] **P3.7** — Run `validateCurriculum` to verify Speed Gates are never in bypass position
- [ ] **P3.8** — Write Phase 3 tests
- [ ] **P3.9** — Run full test suite — all tests pass
- [ ] **P3.10** — E2E test: kid can bypass a hard node via treasure cave side path

---

## 8. Open Questions (from plan, with resolutions)

| # | Question | Resolution |
|---|---|---|
| 1 | Which main nodes are milestones? | Node 10 (boss) of each unit is always a milestone. Node 5 (midpoint) is NOT — it's a common struggle point and should be bypassable. |
| 2 | Gem currency in ProfileContext? | Confirmed: `UserProfile.gems` exists (src/types/user.ts:58). `addGems()`, `spendGems()` already implemented in ProfileContext. |
| 3 | Mascot mini-game scope? | Phase 3 builds new simple mini-games (feed_pet, dress_up, trick_show). Not reskins of existing arcade modes — different interaction pattern for younger kids. |
| 4 | WorldMap.tsx vs SagaMap.tsx? | **SagaMap.tsx is the active component** (331 lines, renders all 5 units). WorldMap.tsx/MapZone.tsx is an older parallel UI. Modify SagaMap.tsx only. |
| 5 | Sticker/cosmetic system? | Net-new for Phase 3. Store stickers as string IDs in `UserProfile.ownedItems`. Cosmetics (rocket_skin etc.) similarly. No new infrastructure needed — just use existing ownedItems array. |

---

## 9. Key Codebase References

| File | Lines | Role |
|---|---|---|
| `src/types/learningPath.ts` | 39 | Type definitions (to be extended) |
| `src/data/learningPath.ts` | 103 | CURRICULUM array — 5 units × ~11 nodes (53 total) |
| `src/context/ProgressContext.tsx` | 146 | Progress state, completeNode, isNodeLocked, getStars |
| `src/components/map/SagaMap.tsx` | 331 | Active map UI — renders nodes, header, modals |
| `src/lib/progression.ts` | 47 | getInitialProgress(age), getRecommendedStartingUnit(age) |
| `src/components/GameOrchestrator.tsx` | 308 | Dispatches LESSON/PRACTICE/SENSORY/MEMORY/INVADERS |
| `src/__tests__/ProgressContext.test.tsx` | 104 | 3 tests: load, save, legacy migration |
| `src/hooks/useAnalytics.ts` | ~30 | Firebase analytics wrapper, logEvent |
| `src/types/user.ts` | ~60 | UserProfile with coins, gems, ownedItems, equippedItems |
| `src/lib/worldConfig.ts` | ~30+ | STORAGE_KEYS.SAGA_PROGRESS = 'hebrew_game_saga_progress_v1' |

**Test count at time of writing:** 953 tests, 952 passing (1 pre-existing failure in `useMemoryGame.test.ts > does not flip more than 2 cards at once` — unrelated to this work).

---

## 10. Child Psychology Safeguards

These are NOT optional — they're core product requirements:

1. **Never label it "skip" or "too hard"** — Call it "Another Way!" with its own road color. Failure-labeled affordances measurably depress self-efficacy in ages 4-6.

2. **Treasure Caves always visible (locked, sparkling)** — Visible goals drive engagement. A map that changes shape when you fail is confusing and reads as pity.

3. **Bypass connector reveals only on struggle** — The kid always sees the treasure; they only discover it's also a shortcut at the moment they need one. This kills the path-of-least-resistance problem.

4. **2 failed attempts, not 3** — By the third failure a 5-year-old has usually disengaged.

5. **Different currency** — Side nodes give gems/stickers/cosmetics, NOT stars. Stars remain the mastery signal. If a cave hands out 3 stars for easy work, stars stop meaning mastery.

6. **SKIPPED nodes stay playable** — The kid can return anytime and earn full stars. The mascot invites them back after the unit wraps.

7. **1-2 side nodes per unit max** — More and the main path stops reading as *the* path. The map becomes a route-planning problem, and 4-6 year olds don't have the executive function for that.

8. **Treasure Caves and Mascot Games have no fail state** — Guaranteed completable. Speed Gate is timed and can fail, but it can NEVER be a bypass.

---

*Analysis delegated to gemini-3.1-pro-high via `ask-agy --card ff00ea03`. Claude (opus-5) hit session limit on 2 attempts (both logged in model-usage.jsonl). Build artifact enriched with direct codebase inspection by builder (glm-5.2).*
