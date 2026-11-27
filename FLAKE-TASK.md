# Task: fix the chronic flake in e2e/saga-node-completion.spec.ts Test 1

Test: "SENSORY node (n1_1) — pop target bubbles → completes → stars awarded → n1_2 unlocks".

Flake evidence: failed AND passed in the same CI run; flaky in 3 of the last 7 nightly
runs on main (retries=1 masked it in most runs).

## Known hazards in the Test 1 loop

1. `isSensoryGameActive()` returns false transiently when BubbleGameContainer
   re-renders between problems or during the victory animation, so the loop breaks
   prematurely with popped < target_count (=10) and `waitForSagaMap` then stalls/times out.
2. `popTargetBubble()` waits for a visible `[data-testid="bubble-N"]` and then calls
   `el.click()` inside `evaluate` — if React remounts/reorders the bubble list between
   the waitFor and the evaluate, the click lands on a detached node (silent no-op), the
   test counts a pop that never registered, attempts drain, the session never completes.
3. Fixed `waitForTimeout` sleeps instead of state-based polling.
4. Local `getBubbleInstruction()` uses a narrower DOM probe than
   `helpers.readInstructionText()` (which handles both the PracticeMode shape and the
   BubbleGameContainer shape).

## Requirements

- Make Test 1 deterministic with `--retries=0 --repeat-each=3` on mobile-chrome AND
  mobile-safari.
- Drive the pop loop from STATE: verify each pop actually registered (bubble
  detached/hidden, instruction change, or score/pop-count advance) and retry no-ops;
  use a global deadline rather than attempt-count-only termination.
- Never break the loop on a transiently-missing instruction: poll until game-complete
  or the global deadline.
- Reuse the shared probes/helpers (e2e/helpers.ts) where that is cleaner than the
  duplicated fragile local ones; helpers.ts is an allowed edit target.
- Do NOT weaken assertions: stars > 0, isLocked false, and persistence after reload
  must all stay.
- Keep tests 2–4 working and untouched in behavior.
- Prefer minimal, targeted edits over rewrites.
