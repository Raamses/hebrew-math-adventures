# PR Review Batch 6: Sentinel Hardening + Bolt Memoization

**Date:** 2026-08-19
**Reviewer:** reviewer-opus (OpenClaw)
**Model:** claude-opus-5
**PRs:** #26 (Sentinel: input lengths + Crypto API), #55 (Bolt: SeriesView memoization + FrenzyOverlay), #130 (Bolt: inline closure React.memo fix)

> ## ⚠️ INCOMPLETE REVIEW — TOOLING BLOCKED
>
> The requested procedure could **not** be executed. In this session `gh`, `git`, and `npm`
> were all denied by the permission layer (`"This command requires approval"`), including
> under an explicit sandbox override:
>
> | Step | Command | Result |
> |---|---|---|
> | 1 | `gh pr view <num> --json ...` | **DENIED** (also `gh --version`) |
> | 2 | `gh pr diff <num>` | **DENIED** (not attempted past step 1) |
> | 4 | `npm test` | **DENIED** |
> | — | `git status` / `git log` | **DENIED** |
>
> Only read-only `ls`/`cat`/`grep`/`find` inside the workspace succeeded.
>
> **Therefore: I have not read a single line of any PR diff, and no tests were run.**
> Every verdict below is *provisional*, derived entirely from static analysis of the
> current `main` working tree (`.git/HEAD` → `refs/heads/main`) checked against the
> PR descriptions supplied in the task prompt. Do not merge or close on this basis
> alone — see [Required Follow-Up](#required-follow-up).

## What Was Actually Verified

All findings below are from reading files on `main`. This is genuinely informative about
whether each PR is *still needed*, but says nothing about whether each PR's *implementation*
is correct, or how stale its branch is.

### PR #26 — Input lengths + Crypto API → likely REDUNDANT

Both claimed hardening measures are **already present on `main`**.

Crypto API is already feature-guarded at every call site:

- `src/engines/utils/ProblemUtils.ts:41` — `typeof crypto !== 'undefined' && crypto.randomUUID`
- `src/components/parent/ParentGate.tsx:14,31` — `crypto.getRandomValues` guarded
- `src/context/ProfileContext.tsx:283` — guarded, with a `Date.now()`/`Math.random()` fallback

Input length caps are already applied on every free-text input:

- `src/components/math-card/NumberInput.tsx:28,54` — `maxLength = 10`, enforced in `onChange` via `val.slice(0, maxLength)`
- `src/components/parent/ParentGate.tsx:94` — `maxLength={3}`
- `src/components/ProfileSetup.tsx:95`, `src/components/parent/EditProfileModal.tsx:93` — `maxLength={30}`
- `src/components/pet/PetScreen.tsx:79` — `maxLength={20}`

Note `NumberInput` enforces the cap in the change handler, not just the DOM `maxLength`
attribute — that is the stronger form, and closes the paste/IME bypass that a bare
attribute leaves open. **Provisional verdict: CLOSE as redundant.** The prompt's prior-attempt
context said the same; this is now independently corroborated against `main`.

### PR #130 — Inline closure defeating React.memo → REAL, STILL UNFIXED

This is the highest-value PR in the batch, and the finding is concrete.

`src/components/MathCard.tsx:68` defines the keydown handler as a **plain arrow function**,
recreated on every render:

```
68:    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
```

It is passed as `onKeyDown` to three memoized children — `ArithmeticView` (`:157`),
`SeriesView` (`:166`), `WordProblemView` (`:175`). Its sibling `handleAnswerChange`
(`:29`) *is* `useCallback`-wrapped, as is `handleCompare` (`:74`), so `handleInputKeyDown`
is the odd one out and it single-handedly defeats `React.memo` on all three views —
the memo boundary never holds, because one prop always changes identity.

`SeriesView` is confirmed `React.memo`'d on `main` (`src/components/math-card/SeriesView.tsx:14`,
named `function SeriesView` — good, preserves the DevTools name). So the memo exists and
is currently inert. The fix is worth making.

**⚠️ Correctness trap the reviewer must check in the diff.** `handleInputKeyDown` calls
`handleSubmit` (`:70`), and `handleSubmit` (`:37`) is **also not memoized** — it closes over
`answer`, `problem`, and `isProcessing`. This makes a naive fix actively dangerous:

- `useCallback(..., [])` → freezes a stale `handleSubmit`, capturing `answer` at its initial
  `''`. Enter-key submission would then always `parseInt('')` → `NaN` → shake + "empty input"
  regardless of what the child typed. **Silent breakage of Enter-to-submit**, and there is
  no test asserting Enter submits a *correct* answer, so CI would stay green.
- `useCallback(..., [handleSubmit])` → dep changes every render; identity churns anyway and
  the memo stays inert. Cosmetic no-op.

The only correct fix memoizes `handleSubmit` first (or hoists the submit logic into a ref /
`useEvent`-style stable callback), *then* memoizes `handleInputKeyDown`. **Provisional verdict:
REQUEST CHANGES unless the diff memoizes `handleSubmit` too** — and if it does, verify Enter-key
submit behavior manually, because the test suite does not cover it.

### PR #55 — SeriesView memoization + FrenzyOverlay → PARTIALLY redundant

Split verdict; the two halves differ.

- **SeriesView half: redundant.** Already `React.memo`'d on `main` (`SeriesView.tsx:14`).
- **FrenzyOverlay half: still valid.** `src/components/games/FrenzyOverlay.tsx:86` is a
  bare `React.FC`, **not** memoized.

The FrenzyOverlay memoization would be effective, which is worth stating precisely because
memoization PRs so often aren't. All three call sites pass **only primitives**, so a
`React.memo` boundary will actually hold:

- `BubbleGameContainer.tsx:681` — `isActive={gameState.isFrenzy} combo={gameState.combo} variant="bubble"`
- `PracticeFeedback.tsx:47` — `isActive={(profile?.streak || 0) >= 5} combo={profile?.streak || 0} variant="practice"`
- `MathInvadersGame.tsx:206` — `isActive={state.frenzy} combo={state.combo} variant="invaders"`

No object/array/function props, so no identity churn to defeat it. `BubbleGameContainer`
re-renders per game tick while `isFrenzy`/`combo` sit unchanged for long stretches, and
`FrenzyOverlay` is not cheap — it renders 5–15 `framer-motion` particles plus infinite-repeat
border and badge animations. Skipping those re-renders is a real win on the low-end tablets
this project targets.

Incidental benefit worth noting: `FrenzyOverlay.tsx:217,220` call `Math.random()` **inside
render** (particle `x` drift and `duration`). Today every parent tick re-randomizes those
animation targets mid-flight; memoizing stops the re-roll and will make particle motion
visibly smoother. Conversely this means **any snapshot test asserting particle style would be
flaky-by-construction** — check whether `FrenzyOverlay.test.tsx` does.

**#55 and #130 are complementary, not duplicates** — confirmed. Different files
(`FrenzyOverlay.tsx` vs `MathCard.tsx`), different mechanisms (adding a memo boundary vs
stabilizing a prop so an existing boundary works). The prompt's prior-attempt context was
correct on this point. They do overlap on the now-redundant `SeriesView` change.

## Provisional Verdicts

Every row is **unconfirmed** — no diff was read, no test was run.

| PR | Provisional verdict | Basis | Confidence |
|---|---|---|---|
| #26 | **CLOSE** — redundant | Both measures verified present on `main` at 8 call sites | High — claim is about `main`, which I *could* read |
| #55 | **SPLIT** — take FrenzyOverlay, drop SeriesView | FrenzyOverlay unmemoized on `main`; all 3 call sites primitive-only | Medium — need diff to confirm scope/staleness |
| #130 | **REQUEST CHANGES** — valid bug, fix likely incomplete | `MathCard.tsx:68` unmemoized; its `handleSubmit` dep also unmemoized | Medium — the trap is real; whether the PR hits it is unknown |

Given this batch's history — batch 5 closed 7/7 PRs, mostly for branch staleness at 97–142
commits behind `main` — **staleness is the single most likely disqualifier here and is exactly
what I could not check.** #26 and #55 are low-numbered PRs in a repo whose open PRs already
exceed #130, so both are plausibly very old. Treat the two "take this" recommendations above
as conditional on a staleness check.

## Required Follow-Up

This review cannot be closed out as-is. To complete it, re-run in a session where `gh`,
`git`, and `npm` are permitted:

1. `gh pr view 26 --json title,body,files,additions,deletions,state` (and `55`, `130`)
2. `gh pr diff 26` (and `55`, `130`) — **the actual review input, still unread**
3. Per PR, check branch staleness: `git rev-list --count origin/main..<branch>` and the
   reverse. Batch 5's dominant close reason.
4. `npm test` (`vitest run`) on `main` for a baseline, then per PR.
5. For #130 specifically: confirm the diff memoizes `handleSubmit`, then manually verify
   Enter-key submission of a **correct** answer still registers. Automated tests will not
   catch the stale-closure regression.

### Suggested test gap to close regardless of verdict

No test asserts Enter-to-submit on `MathCard`. That gap is what makes the #130 stale-closure
failure mode silent, and it will keep making future handler-memoization PRs unreviewable.
Worth adding before touching those callbacks:

- type a correct answer → `keyDown{Enter}` → asserts `onAnswer(true)`
- type a wrong answer → `keyDown{Enter}` → asserts `onAnswer(false)` and increments `wrongAttempts`
