# Implementation Plan - Phase 3: Expansion & Mascot Integration

## Goal Description
Implement the "Mascot Integration" (PR 9) to add an emotional layer to the game. The mascot ("Beni" and friends) will accompany the player, reacting to their success and failure, and providing a sense of companionship.

## User Review Required
> [!IMPORTANT]
> **Mascot Assets:** Currently using SVG placeholders for Owl, Bear, Ant, and Lion. If custom artwork is provided later, we will replace the SVGs.

## Proposed Changes

### 📦 PR 9: Mascot Integration

#### [NEW] [Mascot.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/components/mascot/Mascot.tsx)
- Create `Mascot` component with SVG rendering for 4 characters:
  - Owl (Default)
  - Bear
  - Ant
  - Lion
- Implement `framer-motion` variants for emotions:
  - `idle`: Gentle floating.
  - `happy`/`excited`: Jumping/Rotating on correct answers.
  - `sad`/`encourage`: Supportive gestures on wrong answers.
  - `thinking`: Subtle animation for idle state.

#### [NEW] [SpeechBubble.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/components/mascot/SpeechBubble.tsx)
- Component to display text messages from the mascot.
- Supports `speech` and `thought` variants.
- Animated using `framer-motion` (pop-in/out).

#### [MODIFY] [user.ts](file:///d:/Projects/Hebrew%20Educational%20Game/src/types/user.ts)
- Update `UserProfile` interface to include `mascot` field.

#### [MODIFY] [ProfileContext.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/context/ProfileContext.tsx)
- Update `createProfile` to accept mascot selection.
- Implement migration logic for existing profiles (default to 'owl').

#### [MODIFY] [ProfileSetup.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/components/ProfileSetup.tsx)
- Add "Choose Your Companion" step to the onboarding flow.
- Display preview of mascots.

#### [MODIFY] [App.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/App.tsx)
- Integrate `Mascot` and `SpeechBubble` into the main game loop.
- Manage `mascotEmotion` state based on `handleAnswer` results.
- Trigger "Excited" animation and encouraging text on correct answers.
- Trigger "Encourage" animation and gentle text on wrong answers.
- Show mascot greeting on session start.

#### [MODIFY] [MathCard.tsx](file:///d:/Projects/Hebrew%20Educational%20Game/src/components/MathCard.tsx)
- Clean up any temporary debug logs.

## Verification Plan

### Automated Tests
- Run `npm run type-check` to ensure no TypeScript errors with the new `mascot` field.

### Manual Verification
- **Onboarding:** Create a new profile, verify mascot selection works.
- **Persistence:** Refresh page, verify selected mascot persists.
- **Reactions:**
  - Answer correctly: Verify mascot jumps/cheers and says something nice.
  - Answer incorrectly: Verify mascot looks supportive and says "Try again".
- **Migration:** Switch to an old profile (if any), verify it defaults to Owl without crashing.
