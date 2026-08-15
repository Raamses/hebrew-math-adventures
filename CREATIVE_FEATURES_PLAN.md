# 🎨 Creative Features Implementation Plan — Phase 2

**Author:** Claude Opus (Lead Game Designer)
**Date:** 2026-08-01
**Source:** Codebase audit + COUNCIL_REPORT.md + IMPLEMENTATION_PLAN.md
**Scope:** Top 3 creative features — Math Pet + Daily Quests, Boss Knowledge Gates, Combo Fusion + Power-Ups

---

## Grounding Notes (from codebase audit)

Three things that change the design from the initial assumptions:

1. **The invisible level is `profile.capabilities.estimatedLevel`** (nested), not `profile.estimatedLevel`.
2. **A `QuestContext` already exists** and owns the coins/streak/daily economy — Daily Quests should extend it and mint a new `gems` currency, not fork a parallel system.
3. **The current boss is literally "click the boss bubble 3×"** (`content` = the answer, validated by `behavior.validate` which is always true for the boss). Knowledge Gates require redirecting "what counts as correct" from `behavior.targetValue` to a gate answer, and injecting that answer into the floating bubbles.

---

# FEATURE 1 — Persistent Math Pet + Daily Quests 🐾

## A. Architecture Overview

Surface `capabilities.estimatedLevel` as a companion whose stage is a **pure function** of that level (no independent pet XP). Daily Quests pay **Star Gems** (`gems`), separate from `coins`.

**New files:**
- `src/lib/pet.ts` — species table, `getPetStage`, `getPetEmoji`, `decayedHappiness`
- `src/data/dailyQuests.ts` — `getDailyQuests`, quest registry
- `src/components/pet/PetAvatar.tsx` — badge/hero variants
- `src/components/pet/PetScreen.tsx` — full pet page
- `src/components/pet/DailyQuestList.tsx` — quest progress + claim

**Modify:**
- `src/types/user.ts` — types
- `src/context/ProfileContext.tsx` — whitelist + migration + mutators
- `src/context/QuestContext.tsx` — quest progress + claim
- `src/App.tsx` — `'pet'` view
- `src/components/WorldMap.tsx` — pet badge + gem chip

**Data flow:**
```
capabilities.estimatedLevel → getPetStage() → PetAvatar        [derived, read-only]
correct answers → QuestContext.recordQuestEvent() → progress (localStorage)
claimQuest() → ProfileContext.addGems() → profile.gems
feedPet() → pet.happiness↑, pet.lastFedDate                    [spends gems]
```

## B. Data Models

```ts
// src/types/user.ts
export type PetSpecies = 'owl' | 'cat' | 'dragon' | 'robot';
export interface PetState {
    species: PetSpecies;
    name: string;
    happiness: number;            // 0..100
    unlockedTricks: string[];
    lastFedDate: string | null;   // YYYY-MM-DD
}
export interface UserProfile {
    // ...existing...
    pet?: PetState;
    gems?: number;                // >= 0
}
export const PET_DEFAULT: PetState = {
    species: 'owl', name: 'באדי', happiness: 60, unlockedTricks: [], lastFedDate: null,
};
```

```ts
// src/lib/pet.ts
import type { PetSpecies, PetState } from '../types/user';
export interface PetStage { index: 0|1|2|3|4; key: 'egg'|'baby'|'child'|'teen'|'adult'; minLevel: number; }
export const PET_STAGES: PetStage[] = [
    { index:0, key:'egg',   minLevel:1 },
    { index:1, key:'baby',  minLevel:2 },
    { index:2, key:'child', minLevel:4 },
    { index:3, key:'teen',  minLevel:6 },
    { index:4, key:'adult', minLevel:8 },
];
export function getPetStage(level: number): PetStage {
    const lvl = Number.isFinite(level) ? level : 1;
    let s = PET_STAGES[0];
    for (const st of PET_STAGES) if (lvl >= st.minLevel) s = st;
    return s;
}
const PET_EMOJI: Record<PetSpecies, string[]> = {
    owl:['🥚','🐣','🦉','🦉','🦉'], cat:['🥚','🐱','🐈','🐈','🐈⬛'],
    dragon:['🥚','🐉','🐲','🐉','🐲'], robot:['📦','🤖','🤖','🦾','🦿'],
};
export const getPetEmoji = (sp: PetSpecies, lvl: number) => PET_EMOJI[sp][getPetStage(lvl).index];
export function decayedHappiness(pet: PetState, todayISO: string): number {
    if (!pet.lastFedDate) return pet.happiness;
    const days = Math.max(0, Math.round((Date.parse(todayISO) - Date.parse(pet.lastFedDate))/86_400_000));
    return Math.max(0, pet.happiness - days);
}
```

```ts
// src/data/dailyQuests.ts
export type QuestMetric = 'correct_answers'|'games_finished'|'combo_reached'|'boss_defeated'|'daily_challenge';
export interface DailyQuest { id:string; metric:QuestMetric; target:number; gemReward:number; titleKey:string; descKey:string; icon:string; }
const POOL: Omit<DailyQuest,'id'|'gemReward'>[] = [
    { metric:'correct_answers', target:15, titleKey:'quest.pop15',  descKey:'quest.pop15_d',  icon:'🎯' },
    { metric:'correct_answers', target:25, titleKey:'quest.pop25',  descKey:'quest.pop25_d',  icon:'🫧' },
    { metric:'combo_reached',   target:5,  titleKey:'quest.combo5', descKey:'quest.combo5_d', icon:'⚡' },
    { metric:'games_finished',  target:2,  titleKey:'quest.play2',  descKey:'quest.play2_d',  icon:'🎮' },
    { metric:'boss_defeated',   target:1,  titleKey:'quest.boss1',  descKey:'quest.boss1_d',  icon:'🛡️' },
    { metric:'daily_challenge', target:1,  titleKey:'quest.daily',  descKey:'quest.daily_d',  icon:'📅' },
];
export function getDailyQuests(date?: Date): DailyQuest[] {
    const iso = (date||new Date()).toISOString().slice(0,10);
    const seed = iso.split('-').reduce((a,b)=>a+parseInt(b,10),0);
    const picks: DailyQuest[] = []; const used = new Set<number>();
    for (let slot=0; slot<3; slot++) {
        let idx = (seed + slot*7) % POOL.length;
        while (used.has(idx)) idx = (idx+1)%POOL.length;
        used.add(idx);
        picks.push({ ...POOL[idx], id:`${iso}:${slot}`, gemReward: 3 + slot*2 }); // 3,5,7
    }
    return picks;
}
```

## C. Implementation Spec (step-by-step)

### C1. ProfileContext whitelist + migration + mutators

**File:** `src/context/ProfileContext.tsx`

Add to `validateProfileUpdate` (mirror the `coins` block):
```ts
if (updates.gems !== undefined) {
    if (typeof updates.gems === 'number' && Number.isFinite(updates.gems) && updates.gems >= 0)
        sanitized.gems = updates.gems;
    else console.warn('invalid gems, skipping');
}
if (updates.pet !== undefined) {
    const p = updates.pet as Partial<PetState>;
    if (isPlainObject(p) && typeof p.species==='string'
        && (['owl','cat','dragon','robot'] as const).includes(p.species as any)
        && typeof p.name==='string' && typeof p.happiness==='number' && Number.isFinite(p.happiness)
        && Array.isArray(p.unlockedTricks) && p.unlockedTricks.every(t=>typeof t==='string')
        && (p.lastFedDate===null || typeof p.lastFedDate==='string')) {
        sanitized.pet = {
            species: p.species as PetState['species'],
            name: p.name.slice(0,20),
            happiness: Math.max(0, Math.min(100, p.happiness)),
            unlockedTricks: p.unlockedTricks,
            lastFedDate: p.lastFedDate ?? null,
        };
    } else console.warn('invalid pet, skipping');
}
```

**Migration** — add to the `.map(p => ({...}))` initializer and `createProfile`:
```ts
gems: p.gems ?? 0,
pet: p.pet ?? { ...PET_DEFAULT },
```

**New mutators** (interface + `useMemo` value, modeled on `addCoins`):
- `addGems(n)` — `updateProfile({ gems: (profile.gems ?? 0) + n })`
- `spendGems(n)` — returns boolean; guard `if ((profile.gems ?? 0) < n) return false; updateProfile({ gems: profile.gems - n }); return true;`
- `feedPet(todayISO)` — spends 2 gems → `+25` capped happiness + `lastFedDate`
- `setPetSpecies(sp)` — `updateProfile({ pet: { ...profile.pet, species: sp } })`
- `renamePet(name)` — `updateProfile({ pet: { ...profile.pet, name: name.slice(0,20) } })`

Always spread `profile.pet` since `updateProfile` replaces the object wholesale.

### C2. QuestContext extension

**File:** `src/context/QuestContext.tsx`

Extend the existing `DailyProgress` (same `hebrew-math-daily-progress` key, no new key): add `questProgress?: Record<string,number>`, `questClaimed?: string[]`, `questDate?: string`.

Add:
- `recordQuestEvent(metric, amount=1)` — functional `setDailyProgress`, caps at target, resets when `questDate !== todayStr`
- `claimQuest(id)` — checks `>= target && !claimed`, then `addGems(reward)` + marks claimed

Pull `addGems` from the `useProfile()` already imported here.

### C3. Emit events in game containers

**File:** `src/components/games/BubbleGameContainer.tsx`

In the `onPopWrapper`:
- `if (isCorrect===true) recordQuestEvent('correct_answers',1)`
- After boss defeat: `recordQuestEvent('boss_defeated',1)`
- On `combo===5` effect: `recordQuestEvent('combo_reached',5)`
- On victory effect: `recordQuestEvent('games_finished',1)`

`daily_challenge` fires where `completeDailyChallenge()` is already called.

### C4. UI components

**New files:**
- `PetAvatar.tsx` — `badge`/`hero` variants, emoji + stage ring
- `PetScreen.tsx` — hero avatar, rename, "N levels to grow", happiness bar, **Feed 🍎 2💎** button, `DailyQuestList`
- `DailyQuestList.tsx` — progress bars + Claim → "+N💎" pop

### C5. Wiring

**File:** `src/App.tsx`
- Add `'pet'` to view union
- `if (effectiveView==='pet') return <PetScreen onBack={()=>setView('map')}/>`
- Pass `onOpenPet={()=>setView('pet')}` to `WorldMap`

**File:** `src/components/WorldMap.tsx`
- Corner cluster with `PetAvatar` badge, `💎 {gems}`, quest bell (dot when claimable)
- `lvl = profile.capabilities?.estimatedLevel ?? 1`

## D. Integration Points

- Level→stage via `getPetStage` everywhere (no persisted stage)
- Gems minted only by `claimQuest`, spent by `feedPet`
- Quest events from `BubbleGameContainer`
- Consumers: `PetAvatar`, `PetScreen`, `DailyQuestList`
- Does NOT affect any arcade mode (zen/classic/blitz/survival) — purely additive UI + profile

## E. Risk Assessment

| Risk | Mitigation | Priority |
|---|---|---|
| New field stripped by `validateProfileUpdate` | Whitelist `pet`+`gems`; round-trip test | **P0** |
| Migration misses old profiles → `undefined` crash | `?? PET_DEFAULT`/`?? 0` at reads + migration | **P0** |
| `updateProfile` overwrites whole `pet` | Always spread existing `pet` | P1 |
| Quest not resetting at midnight | Reuse `todayStr` reset pattern | P1 |
| Gem double-claim | `claimQuest` checks `questClaimed` first | P1 |

**Tests:**
- `ProfileContext.test.ts`: profile round-trip; pet/gems migration
- `pet.test.ts`: `getPetStage` boundaries (1/2/4/6/8); `getDailyQuests` determinism + 3 distinct
- `dailyQuests.test.ts`: claim idempotency; happiness decay

## F. MVP Scope vs Full Vision

**MVP:** emoji pet, 5 stages, 3 deterministic quests, gems, cosmetic feed, badge + Pet Screen.
**Full:** sprites, tricks performed on quest completion, happiness→small gameplay buff, gem shop reusing `ownedItems/equippedItems`, weekly chains.

---

# FEATURE 2 — Boss Knowledge Gates 🛡️

## A. Architecture Overview

The boss bubble becomes a **question display**; the child pops the **correct-answer bubble** among distractors. Each correct pop escalates the concept and decrements `bossHealth`: `2+2 (=4) → 2+2+2 (=6) → 2×3 (=6)`.

**Key move:** while the boss is up, the gate's current answer *becomes* the effective target — reusing the existing spawn/pop pipeline, only redirecting "what's correct" and forcing that value into spawns.

**New file:** `src/engines/bubble/bossGates.ts`
**Modify:** `src/engines/bubble/useGameEngine.ts` (spawnBoss, spawnSystem injection, handlePop), `src/components/games/BubbleGameContainer.tsx` (dynamic banner), `src/components/sensory/Bubble.tsx` (render string content)

## B. Data Models

```ts
// src/engines/bubble/bossGates.ts
export type GateOp = 'plus' | 'minus' | 'multiply';
export interface GateStage { question: string; answer: number; op: GateOp; }
export interface BossGate { stages: GateStage[]; index: number; }
export interface GateSeed { a: number; b: number; operator: '+'|'-'|'*'|'/'; }
```

## C. Implementation Spec (step-by-step)

### C1. bossGates.ts

```ts
export function buildBossGate(seed: GateSeed, _level: number): BossGate {
    const op: GateOp = seed.operator==='-' ? 'minus' : seed.operator==='*' ? 'multiply' : 'plus';
    const n = Math.max(2, Math.min(5, Math.abs(seed.a) || 2));
    let stages: GateStage[];
    switch (op) {
        case 'plus': stages = [
            { question:`${n} + ${n}`,        answer:n*2, op:'plus' },
            { question:`${n} + ${n} + ${n}`, answer:n*3, op:'plus' },
            { question:`${n} × 3`,           answer:n*3, op:'multiply' }]; break;
        case 'multiply': stages = [
            { question:`${n} + ${n}`, answer:n*2, op:'plus' },
            { question:`${n} × 2`,    answer:n*2, op:'multiply' },
            { question:`${n} × 3`,    answer:n*3, op:'multiply' }]; break;
        default: { const t=n*3; stages = [
            { question:`${t} − ${n}`,        answer:t-n,   op:'minus' },
            { question:`${t} − ${n} − ${n}`, answer:t-n*2, op:'minus' },
            { question:`${n} × 2`,           answer:n*2,   op:'multiply' }]; }
    }
    return { stages, index: 0 };
}
export const gateCurrentStage = (g: BossGate) => g.stages[g.index];
export const gateAnswer = (g: BossGate) => g.stages[g.index].answer;
export const gateIsLast = (g: BossGate) => g.index >= g.stages.length - 1;
```

### C2. spawnBoss — build gate from current problem

**File:** `src/engines/bubble/useGameEngine.ts`

Add refs:
```ts
const bossGateRef = useRef<BossGate|null>(null);
const [bossGateQuestion, setBossGateQuestion] = useState<string|null>(null);
```

In `spawnBoss`: build the gate from the current problem; boss `content = stage0.question`, `bossHealth = bossMaxHealth = stages.length` (3); `setBossGateQuestion(stage0.question)`.

Seed helper:
```ts
function getGateSeedFromBehavior(behavior: IGameBehavior): GateSeed {
    const p = (behavior as any).currentProblem;
    if (p && p.type==='arithmetic' && typeof p.num1==='number')
        return { a:p.num1, b:p.num2, operator:p.operator };
    return { a:2, b:2, operator:'+' };
}
```

### C3. Spawn system injection — force gate answer into bubbles

In the normal-spawn branch, when a boss is up, force values to include the gate answer:
```ts
let newBubbleProps: Partial<BubbleEntity>;
if (bossOnScreenRef.current && bossGateRef.current) {
    const ans = gateAnswer(bossGateRef.current);
    const value = Math.random() < 0.45 ? ans : makeGateDistractor(ans);
    newBubbleProps = { content: value, internalValue: value, variant: 'medium' };
} else {
    newBubbleProps = behavior.generateNext(currentConfig);
}
// makeGateDistractor: answer ± spread, never === answer, clamp [0,999]
```

### C4. handlePop — gate-aware validation

**(a)** Boss branch becomes a no-op hint: `if (target.isBoss) return undefined;`

**(b)** At the top of normal handling, when `bossOnScreenRef.current && bossGateRef.current && !target.isPowerUp`:
- Validate `target.internalValue === gateAnswer(gate)`
- Correct + `gateIsLast` → reuse the existing defeat path (pop boss, clear `bossOnScreen`, null the gate, `setBossGateQuestion(null)`, return `BossDefeatResult`)
- Correct + not last → `gate.index++`, update boss entity `content/internalValue`, `bossHealth--`, `setBossGateQuestion(next.question)`, `+50` score, `return true`
- Wrong → `combo:0, strikes+1, return false`

Export `bossGateQuestion` from the hook return value.

### C5. Banner — show live gate question

**File:** `src/components/games/BubbleGameContainer.tsx`

Replace hardcoded subtitle with `Solve: {bossGateQuestion} = ?`; add a **persistent** chip while `bossGateQuestion !== null` (`dir="ltr"`, `🛡️ {q} = ?`).

Health bar (`bossHealth/bossMaxHealth`) now reads as stages remaining — unchanged.

Confirm `Bubble.tsx` renders string `content` (`"2 + 2"`); add a smaller font branch if it's number-centered.

## D. Integration Points

- Trigger unchanged (`spawnBoss` at `BOSS_LEVELS=[3,6,9]`)
- Defeat returns the same `BossDefeatResult` → existing celebration + forced level-up still fire
- `recordQuestEvent('boss_defeated',1)` slots in
- Spawn/positioning/cleanup fully reused — only the injected *value* changed
- Does NOT affect zen (no boss) or other modes unless they spawn bosses

## E. Risk Assessment

| Risk | Mitigation | Priority |
|---|---|---|
| Correct-answer bubble never spawns → unbeatable | 45% forced injection + catch-up; assert ≥1 target within N frames | **P0** |
| Stages sharing an answer (6 & 6) cause double-advance | Advance driven by `gate.index++` per pop, not by value | **P0** |
| String boss content breaks number-only render | String branch/smaller font in `Bubble.tsx` | P1 |
| Old muscle-memory (tap boss) does nothing | Wobble + persistent "Solve:…" chip | P1 |
| Multi-touch double-pop exploits | Queue gate advances; check `gate.index` before advancing | P1 |

**Tests:**
- `bossGates.test.ts`: `buildBossGate` correctness for +/−/×
- `useGameEngine.boss.test.ts`: scripted `handlePop` advances 0→1→2→defeat; wrong strikes without advancing; answer bubbles spawn while boss active

## F. MVP Scope vs Full Vision

**MVP:** 3 fixed stages, +/−/× templates, seed from current problem, banner + chip, health = stages.
**Full:** themed art, 4–5 stages scaling with level, "explain the pattern" micro-lesson on defeat, division gates, timed variant, `getSeed()` on `IGameBehavior`.

---

# FEATURE 3 — Combo Fusion + New Power-Up Types ⚡

## A. Architecture Overview

**3a.** `lightning_chain` (instant: pop all bubbles matching current target) + `rainbow_magnet` (timed: pull targets to center) — added to the central power-up tables, spawn in all modes.

**3b.** `'fusion'` arcade mode: two equations, bonus if both answered within 4s — isolated behind `arcadeMode==='fusion'` via a new `FusionMathStrategy`, so default modes are untouched.

**New file:** `src/engines/bubble/strategies/FusionMathStrategy.ts`
**Modify:** `src/engines/bubble/types.ts`, `src/engines/bubble/useGameEngine.ts`, `src/lib/arcadeModes.ts`, `src/components/games/BubbleGameContainer.tsx`, `src/components/sensory/BubbleGame.tsx`, mode selector

## B. Data Models

```ts
// src/engines/bubble/types.ts
export type PowerUpType = 'freeze'|'double_points'|'pop_distractors'|'slow_motion'|'lightning_chain'|'rainbow_magnet';
export type ArcadeMode = 'zen'|'classic'|'blitz'|'survival'|'fusion';

// BubbleEntity additions:
fusionSlot?: 'A'|'B';
magnetized?: boolean;
```

## C. Implementation Spec (step-by-step)

### C1. Power-up tables

**File:** `src/engines/bubble/useGameEngine.ts`

Add to all three `Record<PowerUpType,...>` entries:
- `POWER_UP_TYPES`: add `'lightning_chain'`, `'rainbow_magnet'`
- `POWER_UP_DURATIONS`: `lightning_chain:0`, `rainbow_magnet:4000`
- `POWER_UP_EMOJI`: `lightning_chain:'⚡'`, `rainbow_magnet:'🌈'`
- TS `Record` forces exhaustiveness — compile error if any table is missing an entry

`activatePowerUp` additions:

**lightning_chain** (instant):
```ts
case 'lightning_chain': {
    let hits = 0;
    setEntities(prev => prev.map(e => {
        if (!e.isPopped && !e.isPowerUp && !e.isBoss && behavior.validate(e)) {
            hits++;
            return { ...e, isPopped: true, poppedAt: now };
        }
        return e;
    }));
    if (hits > 0) {
        setGameState(prev => ({
            ...prev,
            score: prev.score + hits * 15,
            combo: prev.combo + hits,
            targetsPopped: prev.targetsPopped + hits,
        }));
    }
    return; // instant — no timed state
}
```

**rainbow_magnet** (timed):
```ts
case 'rainbow_magnet': {
    // Tag target entities for magnet effect
    setEntities(prev => prev.map(e =>
        (!e.isPopped && !e.isPowerUp && !e.isBoss && behavior.validate(e))
            ? { ...e, magnetized: true }
            : e
    ));
    // Fall through to timed-state setup
    break;
}
```

New **magnetSystem** in the `update` loop (after `checkPowerUpExpiry`):
```ts
if (gameStateRef.current.powerUpState?.type === 'rainbow_magnet' && gameStateRef.current.powerUpState.active) {
    let changed = false;
    const next = entitiesRef.current.map(e => {
        if (e.magnetized && !e.isPopped) {
            const newX = e.x + (50 - e.x) * 0.06;
            if (Math.abs(newX - e.x) > 0.1) { changed = true; return { ...e, x: newX }; }
        }
        return e;
    });
    if (changed) setEntities(next);
}
// Clear magnetized tags when effect ends (in checkPowerUpExpiry)
```

Labels in `BubbleGameContainer.POWER_UP_LABELS`; add `lightning_chain` to the instant-toast condition alongside `pop_distractors`.

### C2. FusionMathStrategy

**New file:** `src/engines/bubble/strategies/FusionMathStrategy.ts`

```ts
export class FusionMathStrategy implements IGameBehavior {
    private mathModule = new MathModule();
    private problemA: ArithmeticProblem | null = null;
    private problemB: ArithmeticProblem | null = null;
    private targetA: number | null = null;
    private targetB: number | null = null;

    generateNext(config: GameConfig): Partial<BubbleEntity> {
        // Alternate spawning answer-A, answer-B, and distractors
        const roll = Math.random();
        if (roll < 0.3 && this.targetA !== null) {
            return { content: this.targetA, internalValue: this.targetA, variant: 'medium', fusionSlot: 'A' };
        } else if (roll < 0.6 && this.targetB !== null) {
            return { content: this.targetB, internalValue: this.targetB, variant: 'medium', fusionSlot: 'B' };
        } else {
            const distractor = this.generateFusionDistractor();
            return { content: distractor, internalValue: distractor, variant: 'small' };
        }
    }

    validate(entity: BubbleEntity): boolean {
        const v = entity.internalValue;
        return v === this.targetA || v === this.targetB;
    }

    slotOf(entity: BubbleEntity): 'A'|'B'|null {
        if (entity.internalValue === this.targetA && entity.internalValue !== this.targetB) return 'A';
        if (entity.internalValue === this.targetB && entity.internalValue !== this.targetA) return 'B';
        return entity.fusionSlot ?? null;
    }

    getInstruction(): string {
        return `${this.fmt(this.problemA)}  ✦  ${this.fmt(this.problemB)}`;
    }

    regenerateProblem(level: number, config: GameConfig): void {
        // Re-roll B until targetB !== targetA
        do {
            this.problemB = this.mathModule.generateProblem(/* ... */);
            this.targetB = Number(this.problemB.answer);
        } while (this.targetB === this.targetA);
    }

    initializeLevel(level: number, config: GameConfig): void {
        // Generate both problems, ensuring different targets
        this.problemA = this.mathModule.generateProblem(/* ... */);
        this.targetA = Number(this.problemA.answer);
        this.regenerateProblem(level, config);
    }
}
```

### C3. arcadeModes.ts — add fusion mode

```ts
case 'fusion': return {
    modeName: 'Combo Fusion',
    spawnIntervalMs: 900,
    maxOnScreen: 8,
    distractorRatio: 2,
    baseVelocity: 0.8,
    winCondition: { type: 'target_count', value: 20 },
    failCondition: { type: 'strikes', value: 5 },
    difficultyScale: 'linear',
    levelMultiplier: 1.15,
    theme: 'space',
    vfxEnabled: true,
};
// ARCADE_MODE_LABELS.fusion = { emoji:'✦', name:'Combo Fusion', desc:'Two equations! Solve both fast for a mega bonus!' }
```

### C4. BubbleGame.tsx — strategy selection

```ts
const [behavior] = useState<IGameBehavior>(() =>
    arcadeMode === 'fusion' ? new FusionMathStrategy() : new MathBehaviorStrategy()
);
```

The existing `setProblem` effect is already guarded by `problem.type==='sensory'`, so fusion skips it.

### C5. Fusion window in BubbleGameContainer

```ts
const fusionRef = useRef<{A?:number; B?:number}>({});
const FUSION_WINDOW_MS = 4000;

// After a correct normal pop:
if (arcadeMode === 'fusion') {
    const slot = (behavior as FusionMathStrategy).slotOf(entity);
    if (slot) {
        fusionRef.current[slot] = Date.now();
        const other = slot === 'A' ? 'B' : 'A';
        if (fusionRef.current[other] && Date.now() - fusionRef.current[other]! < FUSION_WINDOW_MS) {
            // FUSION BONUS!
            setShowFusionFlash(true);
            play('frenzy');
            behavior.regenerateProblem(sessionLevel, config);
            fusionRef.current = {};
            logEvent('fusion_bonus');
            recordQuestEvent('correct_answers', 3);
        }
    }
}
```

`getInstruction()` already returns both equations — allow wrap + smaller font for fusion only.

### C6. Mode entry

Add a Combo Fusion card in the `onArcadeMode`/`ModeSelectorOverlay` flow setting `arcadeMode='fusion'`; renders from `ARCADE_MODE_LABELS.fusion`.

## D. Integration Points

- Power-ups reuse existing spawn + `activatePowerUp` routing (just table + effect entries)
- Magnet = new loop system mutating `x` — only active during 4s window
- Fusion fully isolated behind `arcadeMode==='fusion'` — default modes call none of it
- `lightning_chain` and `rainbow_magnet` spawn in ALL modes (including boss fights)

## E. Risk Assessment

| Risk | Mitigation | Priority |
|---|---|---|
| `magnetSystem` `setEntities` every frame → churn | `changed` guard + only during 4s window | **P0** |
| Missing `Record<PowerUpType>` entry | TS Record forces all 3 tables + labels together | **P0** |
| Fusion A/B share an answer → ambiguous/instant fusion | Re-roll B until `targetB !== targetA` | **P0** |
| Two equations overflow 320px | Wrap + smaller font for fusion only | P1 |
| Lightning during boss pops boss/answer bubbles | Effect skips `isBoss`/`isPowerUp` | P1 |
| Magnet stack collision (overlapping bubbles) | Add repulsion force when bubbles overlap at center | P1 |
| Audio clipping on lightning chain (N concurrent plays) | Debounce/throttle sound to single pitch-shifted effect | P1 |

**Tests:**
- `PowerUps.test.ts`: tables compile exhaustively; lightning pops exactly current targets + scores; magnet moves x→50 and clears tags on expiry
- `ArcadeModes.test.ts`: regression suite confirming `classic`, `blitz`, `zen`, `survival` modes behave identically before and after power-up additions
- `FusionMathStrategy.test.ts`: fusion re-rolls dup answers; bonus only within 4s; default modes never touch fusion code

## F. MVP Scope vs Full Vision

**MVP:** two power-ups in all modes; fusion mode with 4s window, flash + regenerate.
**Full:** magnet slows + tints, lightning arc VFX, fusion escalation (3 equations / shrinking window), fusion streak multiplier, explicit `awardBonus` engine API, per-mode power-up allowlist (fusion excludes `pop_distractors`).

---

# Cross-Cutting Build Order

1. `types.ts` unions + `BubbleEntity` fields
2. `user.ts` types
3. `ProfileContext` (whitelist/migrate/mutators)
4. `QuestContext` quest fields
5. New files (`pet.ts`, `dailyQuests.ts`, `bossGates.ts`, `FusionMathStrategy.ts`, `components/pet/*`)
6. `useGameEngine` (gate + power-ups + magnet, export `bossGateQuestion`)
7. `BubbleGameContainer` (banner, quest events, fusion, labels)
8. `arcadeModes` + `BubbleGame` + `App`/`WorldMap`
9. i18n keys (`quest.*`, `pet.*`, `fusion`)

---

*Generated by Claude Opus. Reviewed by Gemini Pro (see CREATIVE_FEATURES_REVIEW.md).*