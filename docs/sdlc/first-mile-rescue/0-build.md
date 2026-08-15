# Phase 1b: First-Mile Rescue — Build Artifact

**Card:** feeae070-70b9-4732-92d4-817ad21b7087
**Branch:** sdlc/loop-v0
**Model:** claude-opus-5 (via `ask-claude --escalate --card`)
**Date:** 2026-08-15

## Summary

Eliminate the 23% zero-answer bounce rate by adding three scaffolding components
(FirstTouchGuide, VisualManipulator, TenFrame), a `useRescue` hesitation-detection
hook, distractor fading, dynamic session pacing, and profile-backed first-visit
tracking. Claude's analysis was delegated via `ask-claude --escalate --card` and
served by **claude-opus-5** (confirmed in `model-usage.jsonl`).

## Baseline

- **Tests:** 920 passing, 1 pre-existing failure (`zenStateReset.test.ts` — stale
  target bubble counted as 'correct' instead of 'stale'). Unrelated to this work.
- **Branch:** `sdlc/loop-v0`
- **HEAD:** `3b15255 docs(saga-branches): Phase 4 branching saga map plan`

## Architecture

**Two hooks, not inline logic, and not a store.**

```
useFirstTouch(nodeId)  →  FirstTouchGuide      (one-shot, profile-backed)
useRescue({...})       →  VisualManipulator → TenFrame   (repeatable, session-local)
```

**Why `useRescue` as a hook:** the trigger logic is identical in both hosts —
arm a timer, cancel on interaction, count consecutive wrongs, enforce cooldown,
fire analytics, clean up on unmount. Only two things differ: the target number
and whether distractors can be dimmed. Inline means writing that twice, and timer
teardown is precisely the thing that gets subtly wrong the second time.

**Why not a context/store:** no cross-screen consumer. Putting a hesitation timer
in context re-renders the whole subtree on every state change — in
`BubbleGameContainer` that's 20+ framer-motion bubbles per tick. Keep it local.

**Why `useFirstTouch` is separate from `useRescue`:** different lifecycles.
First-touch is once-ever-per-node and writes to the persisted profile; rescue is
many-times-per-session and writes nothing. Fusing them couples a profile mutation
to a timer.

**Performance rule:** the hesitation timer must be a single re-armed `setTimeout`,
never a `setInterval` that ticks countdown state. Nothing re-renders until the 7s
actually fires.

## Component APIs

### TenFrame.tsx

```typescript
export interface TenFrameProps {
    /** Number of filled dots, 0–10. Values outside are clamped. */
    value: number;
    /** 'static' = display only; 'countable' = tap a dot to count it aloud/highlight. */
    mode?: 'static' | 'countable';
    /** Fires as the child taps dots, with the running count. */
    onCount?: (counted: number) => void;
    /** Second colour band for showing an addend split, e.g. 7 = 5 + 2. */
    split?: { first: number; second: number };
    'aria-label'?: string;
}
```

### VisualManipulator.tsx

```typescript
export type RescueReason = 'hesitation' | 'consecutive_wrong';

export interface VisualManipulatorProps {
    open: boolean;
    reason: RescueReason;
    /** The number the child is being asked to build/find. */
    targetNumber: number;
    /** Optional operands, so 3+4 renders as two coloured bands, not just 7. */
    operands?: { left: number; right: number; operator: '+' | '-' };
    /** Child dismissed it, or tapped "I've got it". */
    onDismiss: () => void;
    /** Fires rescue_completed. helpedCorrect is resolved by the host on the NEXT answer. */
    onResolved?: (outcome: { dismissedVia: 'button' | 'answer' | 'timeout' }) => void;
}
```

### FirstTouchGuide.tsx

```typescript
export interface FirstTouchGuideProps {
    open: boolean;
    /** Where the bouncing pointer aims. Ref to a target bubble / the MathCard. */
    anchorRef?: React.RefObject<HTMLElement | null>;
    /** i18n key, not raw Hebrew — see note below. */
    messageKey?: string;
    messageParams?: Record<string, string | number>;
    onDismiss: () => void;
}
```

**i18n note:** The card specifies the literal string `"בואו נפוצץ את המספר 10!"`.
Hardcoding Hebrew defeats the existing i18next setup and breaks the English locale.
Use `t('scaffolding.firstTouch.popNumber', { number })` with the Hebrew string
living in the `he` bundle. The `10` must be interpolated, since the target number
varies by node.

## Hesitation Detection (`useRescue` hook)

```typescript
// src/hooks/useRescue.ts (new)
const HESITATION_MS = 7000;
const WRONG_THRESHOLD = 2;
const COOLDOWN_MS = 20000;   // don't re-trigger immediately after dismissal

export function useRescue({ nodeId, level, enabled, onTrigger }: UseRescueOpts) {
    const [state, setState] = useState<{ open: boolean; reason: RescueReason | null }>(
        { open: false, reason: null }
    );
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrongRef = useRef(0);
    const lastInteractionRef = useRef<number>(Date.now());
    const cooldownUntilRef = useRef(0);

    const clearTimer = useCallback(() => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    }, []);

    const trigger = useCallback((reason: RescueReason) => {
        if (Date.now() < cooldownUntilRef.current) return;
        clearTimer();
        setState({ open: true, reason });
        onTrigger?.(reason);   // fires rescue_triggered
    }, [clearTimer, onTrigger]);

    /** Call when a new problem/round is presented, AFTER the answer lock releases. */
    const arm = useCallback(() => {
        clearTimer();
        if (!enabled || state.open) return;
        lastInteractionRef.current = Date.now();
        timerRef.current = setTimeout(() => trigger('hesitation'), HESITATION_MS);
    }, [enabled, state.open, clearTimer, trigger]);

    const notifyInteraction = useCallback(() => {
        lastInteractionRef.current = Date.now();
        clearTimer();
    }, [clearTimer]);

    const notifyWrong = useCallback(() => {
        notifyInteraction();
        if (++wrongRef.current >= WRONG_THRESHOLD) trigger('consecutive_wrong');
    }, [notifyInteraction, trigger]);

    const notifyCorrect = useCallback(() => {
        wrongRef.current = 0;
        notifyInteraction();
    }, [notifyInteraction]);

    const dismiss = useCallback(() => {
        cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
        wrongRef.current = 0;
        setState({ open: false, reason: null });
    }, []);

    useEffect(() => clearTimer, [clearTimer]);   // unmount safety
    return { ...state, arm, notifyInteraction, notifyWrong, notifyCorrect, dismiss };
}
```

**Two timing subtleties:**

- **Arm after the lock, not before.** `BubbleGameContainer` holds a 120ms
  `answerLockRef`; PracticeMode holds 400/600ms. If you arm at render, that lock
  time is counted inside the 7s.
- **Pause on tab hide.** A child who wanders off returns to an instant rescue,
  and `first_touch_latency_ms` reports 40 minutes. Add a `visibilitychange`
  listener that clears the timer on hide and re-arms on show.

**Host wiring differs only in where `arm()` is called:**
- `BubbleGameContainer` — on each new entity spawn wave; `notifyWrong`/
  `notifyCorrect` inside `onPopWrapper`, alongside the existing
  `consecutiveWrongRef` (leave that ref alone, it drives adaptive difficulty).
- `PracticeMode` — on each new question; `notifyWrong`/`notifyCorrect` inside
  `handleAnswer(isCorrect)`.

## Distractor Fading

**Add `dimmed?: boolean` to `Bubble`, not an opacity number, and not a wrapper class.**

`Bubble` is a framer-motion component. If the parent sets inline
`style={{ opacity: 0.5 }}` while motion drives an `animate={{ opacity: 1 }}`,
motion writes opacity on the element every frame and wins. A wrapper `<div>`
with a CSS class avoids that but introduces an extra layout box into a
positioned/animated bubble field, which risks disturbing hit targets and
transforms.

A boolean prop lets `Bubble` fold the dim into its own `animate` target:

```typescript
// inside Bubble
animate={{ scale: 1, opacity: dimmed ? 0.5 : 1 }}
transition={{ opacity: { duration: 0.4 } }}
```

**Choosing which distractors to dim** — must be stable across re-renders:

```typescript
const EMPTY_SET = new Set<string>();

const dimmedIds = useMemo(() => {
    if (!rescue.open || rescue.reason !== 'hesitation') return EMPTY_SET;
    const wrong = entities.filter(e => !isCorrectAnswer(e)).map(e => e.id).sort();
    return wrong.length >= 3 ? new Set(wrong.slice(0, 2)) : EMPTY_SET;
}, [rescue.open, rescue.reason, entities]);
```

**Guard: `wrong.length >= 3`.** With 3 bubbles on screen (1 correct, 2 wrong),
dimming both wrong ones doesn't scaffold — it hands over the answer, and the
child learns "wait 7 seconds." The guard means dimming only fires when at least
3 distractors remain, so it narrows the field without solving it. If the bubble
game routinely shows fewer than 4 entities, this feature is close to a no-op and
should either lower the fade to a subtler 0.7 or drop it in favour of the
Ten-Frame alone.

`EMPTY_SET` must be a module-level constant, or the `useMemo` returns a fresh
`Set` each time and defeats itself.

## Dynamic Session Pacing

Keep `UI_CONFIG.SESSION_LENGTH = 10` as the default; introduce a session-local
target.

```typescript
const SHORTENED_LENGTH = 5;
const [targetLength, setTargetLength] = useState(UI_CONFIG.SESSION_LENGTH);
const [wasShortened, setWasShortened] = useState(false);

const shortenSession = useCallback(() => {
    if (wasShortened) return;
    setTargetLength(prev => {
        // CRITICAL: never land at or below what's already answered.
        const next = Math.max(SHORTENED_LENGTH, answeredCount + 1);
        if (next >= prev) return prev;          // already past it — no-op
        logEvent('dynamic_length_adjusted', { original: prev, adjusted: next });
        setWasShortened(true);
        return next;
    });
}, [answeredCount, wasShortened]);
```

**The clamp is the bug you'd otherwise ship.** If the struggle signal fires on
question 6 and you hard-set the target to 5, the session either terminates
instantly mid-animation or computes `answered > target` and produces negative
progress. `Math.max(5, answeredCount + 1)` guarantees at least one more question
and a clean completion.

Every `SESSION_LENGTH` read in PracticeMode's render path — progress bar,
"question N of M", completion check — must switch to `targetLength`.

**Stars:** don't touch `computeStarsByTier` — keep it pure and leave its existing
tests green. Override at the call site:

```typescript
const stars = wasShortened
    ? 1                                   // guaranteed 1-star victory
    : computeStarsByTier(/* existing args */);
```

A shortened session is a rescue, so a flat 1 is correct — computing tiers off a
reduced denominator would let a struggling child score 3 stars, which corrupts
both the reward signal and any downstream mastery data.

**Trigger:** reuse the rescue signal — e.g. shorten after the second
`rescue_triggered` in one session, or on 3 consecutive wrongs. One definition of
"struggling," used twice.

## Profile Changes

### src/types/user.ts

```typescript
export interface UserProfile {
    // ... existing fields ...
    /** nodeId → true once the child has opened that node at least once. */
    firstTimeNodesVisited?: Record<string, boolean>;
}
```

**Make it optional.** A required field is the single largest regression risk to
920 tests: every test fixture, factory, and mock that builds a `UserProfile`
literal becomes a type error at once. Optional + a `?? {}` at each read site is
the same runtime behaviour with none of the blast radius.

### src/context/ProfileContext.tsx — Validator

```typescript
if ('firstTimeNodesVisited' in updates) {
    const v = updates.firstTimeNodesVisited;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
        const clean: Record<string, boolean> = {};
        for (const [k, val] of Object.entries(v)) {
            if (typeof k === 'string' && k.length <= 64 && val === true) clean[k] = true;
        }
        safe.firstTimeNodesVisited = clean;
    }
}
```

Storing only `true` and dropping `false` keeps this a set, so it can't grow via
negative entries. Still bound it — this is persisted and monotonically growing.

### Migration (in the `useState` initializer)

```typescript
firstTimeNodesVisited: p.firstTimeNodesVisited ?? {},
```

**Writes must merge, never replace:**

```typescript
updateProfile(id, {
    firstTimeNodesVisited: { ...(profile.firstTimeNodesVisited ?? {}), [nodeId]: true }
});
```

## GA4 Event Integration

| Event | Where | Guard |
|---|---|---|
| `first_touch_latency_ms` | `useFirstTouch`, on first `notifyInteraction()` | Fire **once per mount** via a ref. Clamp: drop if `> 300000` or tab was hidden |
| `rescue_triggered` | `useRescue.trigger()`, before `setState` | Cooldown-guarded. Payload `{ node_id, trigger_reason, level }` |
| `rescue_completed` | Host's answer handler, **not** the component | Needs `helped_correct`, only knowable on the next answer. Store `pendingRescueRef` on dismiss; resolve on the following answer; fire with `helped_correct: isCorrect`. Flush as `false` on unmount if never resolved |
| `dynamic_length_adjusted` | Inside `shortenSession`, after the `next >= prev` check | Must sit after the guard, else no-op calls emit duplicates |

`rescue_completed` is the one people get wrong — firing it on dismiss makes
`helped_correct` unanswerable, and the whole point of the event is measuring
whether the scaffold worked.

## Test Strategy

### Mock pattern (match existing FrenzyOverlay.test.tsx)

```typescript
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...p }: any) => React.createElement('div', p, children),
        span: ({ children, ...p }: any) => React.createElement('span', p, children),
    },
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));
```

Note: the existing mock only stubs `motion.div`. If `FirstTouchGuide` uses
`motion.span`/`motion.button`, extend it or you'll get an undefined-component
error.

### TenFrame tests (pure — cheapest, highest confidence)
- `value={7}` → 7 filled, 3 empty
- `value={0}` / `value={10}` → boundaries
- `value={-1}` / `value={11}` → clamps, doesn't crash or render 11 cells
- `split={{first:5, second:2}}` → two colour bands, 7 filled total
- `mode="countable"` → tapping dot 3 calls `onCount(3)`; `mode="static"` → no handler
- a11y: `aria-label` present, dots not individually focusable in static mode

### FirstTouchGuide tests
- Renders the i18n key, with the number interpolated (assert against the `he` bundle)
- `open={false}` renders nothing
- `onDismiss` fires on backdrop/button tap
- RTL: container inherits `dir="rtl"` under the Hebrew locale

### useRescue hook tests (test directly with `renderHook`)
- `arm()` then `advanceTimersByTime(6999)` → closed; `+1` → open, reason `hesitation`
- `arm()`, `notifyInteraction()` at 5s, advance 7s → still closed (re-arm works)
- two `notifyWrong()` → open, reason `consecutive_wrong`
- `notifyCorrect()` resets the wrong counter — wrong, correct, wrong should **not** trigger
- `dismiss()` then immediate re-arm → suppressed during cooldown
- unmount with a live timer → no state update; assert no act() warning
- `enabled: false` → never triggers

### Dynamic pacing tests
- shorten at `answeredCount = 6` → target becomes 7, not 5 (the clamp)
- shorten twice → one `dynamic_length_adjusted` event
- `wasShortened` → stars exactly 1

### Container integration — thin
Assert the manipulator mounts on hesitation and that `dimmedIds` has size 2 with
≥3 distractors and size 0 with 2. Don't re-test the hook through the container.

### Fake timers caveat
`vi.useFakeTimers()` plus `userEvent` needs
`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, or clicks hang.

## Risk Analysis

**Highest — the required-field type change.** Covered above: make it optional.

**The pre-existing `zenStateReset` failure.** Capture the baseline *before*
touching anything:
```
npx vitest run --reporter=json > /tmp/baseline.json
```
Record the exact test name and message. If the change alters the failure mode of
that same test, or a second test starts failing, you need the before-text to tell
those apart.

The name suggests it touches state reset. If rescue state isn't reset in the same
path, you may be adding a second instance of the bug that test already documents.
Read it before writing `useRescue`.

**Timer cleanup.** Four leak paths: unmount mid-timer, node change without unmount
(stale `nodeId` closure — key the effect on `nodeId`), the rescue opening while a
timer is pending, and hot-reload in dev. The `useEffect(() => clearTimer, [])`
covers the first; the others need the deps right.

**Analytics volume.** A hesitation trigger every 7s of idle could flood GA4 if
cooldown is misconfigured. The 20s cooldown plus per-session caps should hold, but
sanity-check event counts in DebugView before shipping.

**RTL.** The bouncing pointer must mirror in Hebrew. A pointer aiming right in an
RTL layout points off-screen. Use logical properties (`inset-inline-start`), not
`left`.

**Age appropriateness.** A modal that grabs focus and traps a 4-year-old is worse
than the bounce it's fixing. `VisualManipulator` should be dismissible by tapping
anywhere, and must not block the bubbles underneath — a child who suddenly *does*
know the answer needs to act on it.

## Implementation Order

Each step compiles and tests green on its own.

1. **`src/types/user.ts`** — optional `firstTimeNodesVisited` field. Compiles
   alone; nothing reads it yet.
2. **`ProfileContext.tsx`** — validator + migration. Add a unit test for the
   validator here, before there's a caller.
3. **`TenFrame.tsx`** + tests — zero dependencies, pure. Full test coverage now.
4. **`VisualManipulator.tsx`** + tests — presentational only at this stage; `open`
   driven by a test prop.
5. **`useRescue.ts`** + hook tests — the heaviest logic, tested in isolation with
   no host.
6. **`useFirstTouch.ts` + `FirstTouchGuide.tsx`** + tests.
7. **`PracticeMode.tsx`** — first integration. Simpler host: one discrete answer
   path, no entity spawning. Validates the hook contract where it's easy to debug.
8. **Dynamic pacing** in `usePracticeSession` + star override — separate commit
   from step 7, since it touches session completion and is the most
   regression-prone change.
9. **`Bubble.tsx`** — add `dimmed` prop, defaulting false. Isolated, no behaviour
   change.
10. **`BubbleGameContainer.tsx`** — wire the hook, plus `dimmedIds`. Last, because
    it's the hardest host and by now the hook is proven.
11. **E2E spec** — first-time node 1, against real timers.

Run the full suite after steps 2, 7, 8, and 10. If the count moves off 920,
stop there rather than pressing on.

## Claude Session Note

Claude's sandbox did not have direct file access to the repo. The analysis was
derived from the codebase context provided in the prompt (full source of
BubbleGameContainer.tsx, PracticeMode.tsx, user.ts, ProfileContext.tsx, and
supporting files). Places where code touches existing files and signatures
couldn't be verified are marked with ⚠️ in the original analysis — those points
need reconciliation against the actual code during implementation.
