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

### 🚀 Next Steps
- [ ] **Sound Effects:** Add audio feedback for correct/wrong answers and level ups.
- [ ] **Visual Themes:** Unlockable backgrounds or avatars based on Level/XP.
- [ ] **Teacher/Parent Dashboard:** View progress over time.
- [ ] **More Problem Types:** Geometry, fractions, or word problems for higher levels.

## 6. Key Files Index
- `src/App.tsx`: Main entry and game loop.
- `src/engines/QuestionGenerator.ts`: The "Brain" of the math generation.
- `src/components/MathCard.tsx`: The primary interaction UI.
- `src/context/ProfileContext.tsx`: User state management.
- `ANTIGRAVITY_RULES.md`: Detailed game design rules.
