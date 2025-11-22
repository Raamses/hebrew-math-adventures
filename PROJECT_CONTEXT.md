# Project Context: Hebrew Math Adventures (הרפתקאות חשבון)

## 1. Project Overview
**Goal:** Build a gamified, engaging math learning web application for Israeli children (ages 6-11+).
**Core Philosophy:** "Smart Fun" - combining rigorous math practice with game mechanics (XP, streaks, animations) in a native Hebrew (RTL) environment.
**Target Audience:** Kids grades 1-6. UI must be intuitive, large, and text-minimal.

## 2. Technical Architecture
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (with custom animations in `index.css`)
- **State Management:** React Context (`ProfileContext`) for user session data.
- **Persistence:** `localStorage` for user profile and progress.
- **Icons:** Lucide React.
- **Animation:** Framer Motion.

## 3. Core Systems

### A. Math Engine (`src/engines/`)
- **`QuestionGenerator.ts` (Singleton):**
  - **Bag Deck System:** Ensures variety by cycling through question types (e.g., `addition_simple`, `sub_borrow`) before repeating.
  - **History Buffer:** Remembers last 3 questions to prevent immediate duplicates.
  - **Difficulty Tuning:**
    - **Level 1 (Age 6):** Single-digit addition (sum ≤ 10), non-negative subtraction.
    - **Level 2 (Age 7):** 2-digit simple operations.
    - **Level 3 (Age 8):** 3-digit operations with forced carry/borrow and zero-crossing logic.
    - **Level 4+:** Includes multiplication and division.
- **`MathEngine.ts`:**
  - Facade for generating problems.
  - **XP Calculation:** Base XP (5) + Level Bonus + Streak Bonus.
  - **Penalties:** Negative XP for incorrect answers (`-(2 + level)`).

### B. Game Logic (`src/lib/gameLogic.ts`)
- **Types:** `Problem` interface (operands, operator, answer, subType).
- **Operators:** `+`, `-`, `*`, `/`.
- **SubTypes:** `simple`, `carry`, `borrow`, `zero` (used for UI hints).

### C. User Profile (`src/context/ProfileContext.tsx`)
- **Data Model:** `UserProfile` (name, age, currentLevel, xp, streak).
- **Logic:** Handles leveling up (threshold: `level * 100 XP`) and streak management.
- **Safety:** Handles negative XP (clamped at 0) and session resets.

## 4. UI Components (`src/components/`)

### Game Loop
- **`App.tsx`:** Main game controller. Handles state transitions (Setup <-> Game), feedback loops, and modal visibility.
- **`MathCard.tsx`:**
  - Displays the problem.
  - **Visuals:** `tracking-widest` for 3-digit numbers.
  - **Hint System:** Visual "borrow" animation (crossing out numbers) triggers after 2 wrong attempts.
  - **Feedback:** Shake animation on wrong answer.
  - **Input:** Custom numeric keypad or keyboard input.
- **`Confetti.tsx`:**
  - Particle system using `framer-motion` and React Portals.
  - Triggers on correct answers for positive reinforcement ("Juice").
- **`SessionProgressBar.tsx`:**
  - Visualizes progress through a 10-question session.
- **`SessionSummary.tsx`:**
  - Modal showing session stats (Accuracy, XP) upon completion.
  - Options to "Play Again" or "Exit".

### Audio
- **`useSound.ts`:**
  - Custom hook using `AudioContext` for synthesized sound effects.
  - Handles "Correct", "Wrong", "Level Up", and "Click" sounds.
  - Manages Mute state via `localStorage`.

### Navigation & Control
- **`GameMenuModal.tsx`:**
  - **Safe Pause:** Triggered by top-left pause button.
  - **Options:** Resume, Restart (resets session, keeps level), Exit (saves & quits).
  - **Design:** Kid-friendly, large buttons, RTL layout.

### Onboarding
- **`ProfileSetup.tsx`:**
  - Simple form for Name and Age.
  - Auto-calibrates starting level based on age (e.g., Age 6 -> Level 1).

## 5. Current Status & Roadmap

### ✅ Completed
- [x] Core Math Engine with Bag Deck & History.
- [x] Adaptive Difficulty (Levels 1-10) with specific tuning for Level 1.
- [x] XP System with streaks, bonuses, and penalties.
- [x] Safe Pause/Restart/Exit mechanism.
- [x] 3-Digit visual enhancements and Hint Animations.
- [x] GitHub Integration (`hebrew-math-adventures`).
- [x] **Phase 1: Enhanced Feedback** (Confetti, Shake, Encouraging Phrases).
- [x] **Phase 1: Session Progress** (Progress Bar, Summary Modal with accurate tracking).
- [x] **Phase 1: Sound Effects** (Synthesized Audio, Mute Toggle).
- [x] **Phase 1: RTL & UI Polish** (Header Layout, Mobile Input Optimization).
- [x] **Phase 2: World Map** (Visual zone-based progression).

### Phase 2: Core Game Loop & Progression (In Progress)
- [x] **PR 5: World Select & Map UI**
  - Replaced linear flow with World Map
  - Implemented zones (Island, Forest, Mountain)
  - Added navigation logic
- [x] **PR 6: Interactive "Show Me How" Hint System**
  - Added visual hint components (Addition, Subtraction, Borrowing)
  - Integrated "Show Me How" button in MathCard
  - Implemented smart hint selection
- [x] **PR 7: Unlockable Themes (Rewards)**
  - Implemented Theme System with CSS variables
  - Added 4 themes (Default, Forest, Space, Candy)
  - Created ThemeSelector and Settings UI
  - Linked themes to level milestones

### Phase 3: Expansion (The "Ecosystem" Update) (Next)
- [ ] **PR 8: Multi-Profile Parent Dashboard**
- [ ] **PR 9: Mascot Integration**

## 6. Key Files Index
- `src/App.tsx`: Main entry and game loop with navigation state management.
- `src/engines/QuestionGenerator.ts`: The "Brain" of the math generation.
- `src/components/MathCard.tsx`: The primary interaction UI.
- `src/components/WorldMap.tsx`: Zone-based level selection and progression.
- `src/context/ProfileContext.tsx`: User state management.
- `src/lib/worldConfig.ts`: Zone configuration and level ranges.
- `ANTIGRAVITY_RULES.md`: Detailed game design rules.
