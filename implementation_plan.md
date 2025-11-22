# Implementation Plan - Phase 1: Immediate Impact & Engagement

## Goal Description
Implement the "Juice" update to make the game more engaging, rewarding, and polished for 6-11 year olds. This covers PRs 1-4 from the roadmap.

## User Review Required
> [!IMPORTANT]
> **Sound Assets:** I will use placeholder sounds or synthesized beeps if actual assets are not provided.
> **Session Logic:** Defining a "Session" as 10 questions. This changes the infinite loop nature of the current game.

## Proposed Changes

### 📦 PR 1: Enhanced Feedback System
#### [NEW] [Confetti.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/components/Confetti.tsx)
- Create a confetti particle system using `framer-motion`.

#### [MODIFY] [Effects.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/components/Effects.tsx)
- Export `Confetti` component.
- Update `FlyingStars` to be more dynamic.

#### [MODIFY] [MathCard.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/components/MathCard.tsx)
- Add `shake` animation prop for wrong answers.
- Add `pulse` animation for correct answers.
- Update feedback overlay to use "Juicy" animations (pop-in, rotate).

#### [MODIFY] [App.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/App.tsx)
- Update `handleAnswer` to use random encouraging Hebrew phrases.
- Trigger `shake` on wrong answer.
- Trigger `Confetti` on correct answer.

### 📦 PR 2: Session Progress & Micro-Goals
#### [NEW] [SessionProgressBar.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/components/SessionProgressBar.tsx)
- Simple progress bar (0-10).

#### [NEW] [SessionSummary.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/components/SessionSummary.tsx)
- Modal showing Accuracy, Time, XP gained.
- "Play Again" button.

#### [MODIFY] [App.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/App.tsx)
- Add `sessionCount` state.
- Show `SessionSummary` when `sessionCount >= 10`.

### 📦 PR 3: Sound Effects System
#### [NEW] [useSound.ts](file:///d:/Projects/Hebrew%20Educational%20Game/src/hooks/useSound.ts)
- Hook to manage `Audio` objects.
- Preload sounds: `correct.mp3`, `wrong.mp3`, `levelUp.mp3`.
- Mute toggle state (persisted in localStorage).

#### [MODIFY] [App.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/App.tsx)
- Integrate `useSound` hook.
- Play sounds in `handleAnswer`.

### 📦 PR 4: RTL & UI Polish
#### [MODIFY] [App.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/App.tsx)
- Move Pause button to Top-Right.
- Ensure logical tab order.

#### [MODIFY] [MathCard.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/components/MathCard.tsx)
- Refine keypad layout/size.
- Ensure all text is `text-right` or `text-center` as appropriate.

## Verification Plan

### Automated Tests
- None for visual effects (manual verification required).

### Manual Verification
- **Feedback:** Play game, verify confetti on correct, shake on wrong.
- **Session:** Play 10 questions, verify Summary screen appears.
- **Sound:** Verify sounds play (if assets available) or console logs trigger.
- **RTL:** Verify Pause button position and layout flow.
