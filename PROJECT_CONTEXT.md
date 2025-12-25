# Project Context: Hebrew Math Adventures (הרפתקאות חשבון)

## 1. Project Overview
**Goal:** Build a gamified, engaging math learning web application for Israeli children (ages 6-11+).
**Core Philosophy:** "Smart Fun" - combining rigorous math practice with game mechanics (XP, streaks, animations) in a native Hebrew (RTL) environment.
**Target Audience:** Kids grades 1-6. UI must be intuitive, large, and text-minimal. **Mobile-First Design** is mandatory.

## 2. Technical Architecture
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (with custom animations in `index.css`)
- **State Management:** React Context (`ProfileContext`) for user session data.
- **Persistence:** `localStorage` for user profile and progress.
- **Icons:** Lucide React.
- **Animation:** Framer Motion.
- **Localization:** `react-i18next` (he/en).

## 3. Core Systems & Rules

### A. Math Engine (`src/engines/`)
-   **`QuestionGenerator.ts` (Singleton):**
    -   **Rule:** Must cycle through question types (`addition_simple`, `sub_borrow`, etc.) using a "Bag Deck" system to ensure variety.
    -   **Rule:** Must maintain a history of 3 questions to prevent duplicates.
    -   **Generation Rules by Level:**
        -   **Level 1 (Age 6):** Single-digit addition (sum ≤ 10), non-negative subtraction.
        -   **Level 2 (Age 7):** 2-digit simple operations.
        -   **Level 3 (Age 8):** 3-digit operations with forced carry/borrow and zero-crossing logic.
        -   **Level 4+:** Includes multiplication and division.
-   **`MathEngine.ts`:**
    -   **XP Rule:** Base XP (5) + (Level * 2) + (Streak * 2).
    -   **Penalty Rule:** Incorrect answers deduct `-(2 + level)`.

### B. User Profile (`src/context/ProfileContext.tsx`)
-   **Data Model:** `UserProfile`
    -   `id`: UUID string.
    -   `currentLevel`: 1-10.
    -   `xp`: Progress within current level.
    -   `totalScore`: Lifetime accumulated score (never resets).
    -   `mascot`: Selected companion ('owl', 'bear', 'ant', 'lion').
-   **Business Logic:**
    -   **Level Up:** Occurs when `xp >= XP_PER_LEVEL` (currently 100).
    -   **Migration:** Logic exists to migrate legacy single-profile data to the new multi-profile array format.

### C. Parent Ecosystem (`src/components/parent/`)
-   **`ParentGate.tsx`:**
    -   **Rule:** Must protect sensitive areas with a math challenge (e.g., "3 × 4 = ?").
    -   **Rule:** Cannot be bypassed without solving the challenge.
-   **`ParentDashboard.tsx`:**
    -   **View:** Displays all profiles in a Data Grid / Table.
    -   **Actions:** Edit (opens modal), Delete (with confirmation).
    -   **Design:** Clean, "Admin-like" but friendly stats view.
-   **`EditProfileModal.tsx`:**
    -   **Validation:** Name required, Age 4-12, Level 1-10, XP >= 0.
    -   **Feedback:** Toast/Alert on success or error.

## 4. UI Components & Design Rules

### General UI
-   **Mobile-First:** Touch targets must be >= 48px.
-   **Thumb Zone:** Key actions (Answer, Next, Back) must be in the bottom 50% of the screen.
-   **RTL:** Layouts must naturally support Right-to-Left (Hebrew). Use `flex-row-reverse` or standard RTL flow.
-   **Typography:** Large, rounded fonts for readability.

### Game Loop Components
-   **`MathCard.tsx`:**
    -   **State:** Manages Input, Shake animation, and Hint visibility.
    -   **Hint Rule:** "Show Me How" button appears after 1 wrong attempt (or if enabled in settings).
    -   **Input:** Custom Numeric Keypad (no native keyboard) for consistent mobile experience.
-   **Hints (`src/components/*Hint.tsx`):**
    -   **`BorrowingHint.tsx`:** Shows visual crossing out of digits for subtraction.
    -   **`MultiplicationHint.tsx`:** Shows grid/array visualization.
    -   **Rule:** Hints must be visual/animated, not just text explanations.

### Global Components
-   **`ThemeSelector.tsx`:** Allows switching global CSS variables for colors/backgrounds. Unlockable based on level.
-   **`SessionProgressBar.tsx`:** Linear progress (1-10 questions). must persist during a session.

## 5. Current Roadmap

### Completed
- [x] Core Math Engine (Levels 1-10)
- [x] Multi-Profile System
- [x] Parent Dashboard with Editing
- [x] Visual Hint System (Carry/Borrow/Mult/Div)
- [x] World Map Navigation

### In Progress
- [ ] **Mascot Integration:** Fully interactive 3D/Animated 2D mascots.
- [ ] **Lesson Mode:** Pre-level interactive tutorials.
- [ ] **Mobile Optimization:** Ongoing refinement of touch targets.

## 6. Deployment API
-   **Hosting:** Firebase Hosting (`hebrew-math-adventures-2025`).
-   **CI/CD:** Manual `npm run build` && `firebase deploy`.
