# Product Roadmap: Hebrew Math Adventures

Based on `PRODUCT_DESIGN_ANALYSIS.md`, this roadmap breaks down the evolution of the app into distinct, deliverable Feature PRs.

## Phase 1: Immediate Impact & Engagement (The "Juice" Update)
**Goal:** Make the game feel more alive, rewarding, and polished for the target audience (Ages 6-11).

### 📦 PR 1: Enhanced Feedback System ("Juicy" Interactions)
**Focus:** Replace static feedback with joyful animations.
- [x] **Correct Answer:**
  - Implement "Confetti" or "Sparkle" explosion on correct answer.
  - Animate numbers "dancing" or pulsing.
  - Add random encouraging Hebrew phrases ("!מעולה", "!כל הכבוד", "!אלוף").
- [x] **Wrong Answer:**
  - Gentle "shake" animation of the card (instead of just text).
  - Wrong Answer (Soft Thud/Buzz)
  - Level Up (Fanfare)
  - Button Click (Pop/Click)
- [ ] **UI:** Add Mute/Unmute toggle in the Game Menu.

### 📦 PR 4: RTL & UI Polish
**Focus:** Fix usability friction points identified in analysis.
- [ ] **Pause Button:** Move to Top-Right (Logical Start in RTL).
- [ ] **Layout:** Ensure all modals and menus flow naturally Right-to-Left.
- [ ] **Typography:** Verify font sizes are large enough (24px+) for all key text.
- [ ] **Input:** Refine the custom keypad layout for better ergonomics.

---

## Phase 2: Deeper Learning & Progression (The "Adventure" Update)
**Goal:** Add narrative context and deeper help systems.

### 📦 PR 5: World Select & Map UI
**Focus:** Replace the static "Profile Setup -> Game" loop with a Map.
- [ ] **Map Component:** A scrollable or static map view.
- [ ] **Zones:** Create visual zones for:
  - 🏝️ Addition Island (Levels 1-2)
  - 🌲 Subtraction Forest (Levels 3-4)
  - 🏔️ Multiplication Mountain (Levels 5+)
- [ ] **Navigation:** Clicking a zone starts the game at the corresponding level.

### 📦 PR 6: Interactive "Show Me How" Hint System
**Focus:** Teach, don't just test.
- [ ] **Trigger:** Show a "💡 ?איך" button after 1 wrong attempt.
- [ ] **Visualizer:**
  - For Addition: Show dots/objects being combined.
  - For Subtraction: Show items being crossed out.
  - For Borrowing: Animate the "borrow" step-by-step (slow version of the current hint).

### 📦 PR 7: Unlockable Themes (Rewards)
**Focus:** Spend XP on visual customization.
- [ ] **Theme System:** Support CSS variable switching for themes (Forest, Space, Candy).
- [ ] **Unlock Logic:** Link themes to Level milestones (e.g., Level 5 unlocks Space).
- [ ] **Theme Selector:** Add to Game Menu or Map screen.

---

## Phase 3: Expansion (The "Ecosystem" Update)
**Goal:** Support families and long-term growth.

### 📦 PR 8: Multi-Profile Parent Dashboard
**Focus:** Household use.
- [ ] **Profile Switcher:** Allow creating/selecting multiple local profiles.
- [ ] **Parent Gate:** Simple math challenge (e.g., "12 x 12 = ?") to enter Parent Mode.
- [ ] **Dashboard:** View stats for all profiles (Time played, Weakest areas).

### 📦 PR 9: Mascot Integration
**Focus:** Emotional connection.
- [ ] **Character:** Design/Add a simple SVG mascot (e.g., "Beni the Owl").
- [ ] **Integration:** Mascot appears on:
  - Welcome screen.
  - Feedback (Cheering/Thinking).
  - Session Summary.
