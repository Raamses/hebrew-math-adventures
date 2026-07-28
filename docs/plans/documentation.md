# Game Documentation & Mechanics

## 1. Sensory Game Modes

The Bubble Game (`BubbleGameContainer`) operates in two distinct modes depending on the configuration provided by `SensoryFactory` or the Learning Node.

### A. Standard Sensory (Static/Bag Mode)
**Used by:** Levels like `n1_4` ("Pop separate 7s").
**Configuration:** `isMathSensory: false` (default)
**Logic:**
- **Finite Pool:** The game generates a static "bag" of items (e.g., 10 bubbles).
- **Winning Condition:** You must find and pop *all* the correct items hidden in this bag.
- **Density:** The number of correct items is determined by `Total Items * Density` (Default 0.25).
    - *Example:* 10 items * 0.25 = 2 Correct Bubbles.
- **Gameplay:** Slower pace, search-and-find focus. The game ends when the specific hidden items are found.

### B. Math Sensory (Infinite/Action Mode)
**Used by:** "Blast Off" mode.
**Configuration:** `isMathSensory: true`
**Logic:**
- **Infinite Stream:** Bubbles spawn continuously and indefinitely. There is no predefined "bag".
- **Winning Condition:** You must pop a specific *count* of correct answers (e.g., "Pop 10 correct bubbles").
- **Dynamic Balance:** The engine ensures a consistent ratio of Target vs Distractor bubbles (e.g., 40% chance of Target).
- **Gameplay:** Faster pace, arcade style. The game ends when you reach the target score/count.

### Key Difference
- **Standard:** "Find the needles in this haystack." (Bounded)
- **Math:** "Catch 10 fish from this flowing river." (Unbounded)
