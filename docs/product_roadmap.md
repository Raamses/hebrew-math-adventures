# Product Plan: Hebrew Math Adventures Evolution

## 1. Educational Audit & Strategy
**Current State**: The game currently uses a "Drill & Practice" model. It tests knowledge but doesn't teach it. The progression is steep.

**Strategy**: Shift to a **"Learn-Practice-Master"** loop.
1.  **Introduce**: Visual, interactive tutorials.
2.  **Scaffold**: Content moves from Concrete -> Visual -> Abstract.
3.  **Practice**: Battle mode.

## 2. Mobile-First Design Strategy
Since the primary device is a mobile phone, all new features must adhere to:
*   **"Fat Finger" Friendly**: All interactive elements must be at least 48x48px (physical size ~9mm).
*   **Thumb Zone**: Key actions (Next, Answer) should remain in the bottom 40% of the screen.
*   **Haptic Feedback**: Use vibration for success/error states to reinforce learning without sound.
*   **Simplified Inputs**: Avoid soft keyboards. Use custom on-screen numpads or drag-and-drop bubbles.
*   **Orientation**: Lock to **Landscape** for game modes (maximizes width for equations) but ensure menus work in both or lock consistent.

## 3. Proposed Workflows
### The "New Concept" Workflow
1.  **Trigger**: User reaches Level 5 (Multiplication unlocked).
2.  **Action**: Game pauses "Battle Mode".
3.  **Screen**: Opens "Mascot Lesson" (Landscape modal).
4.  **Interaction**: **Drag-and-Drop**. User drags fruit into baskets with their finger. No typing required.
5.  **Unlock**: Battle Mode allows Multiplication questions.

## 4. New Equation Types
| Type | Example | Age Group | Goal |
| :--- | :--- | :--- | :--- |
| **Missing Operand** | `3 + ? = 10` | 6-8 | Algebraic thinking, Number bonds |
| **Comparison** | `5 + 2 [?] 8` | 7-9 | Quantity relationships (<, >, =) |
| **Number Series** | `2, 4, 6, ?` | 7-10 | Pattern recognition |
| **Word Problems** | "Dan has 3 apples..." | 6-8 | Literacy + Math connection |

## 5. User Journeys
### Persona: "Noya" (Age 6, Struggling with Subtraction)
1.  **Login**: Noya opens the app.
2.  **Detection**: System sees she failed Level 1 Subtraction 3 times.
3.  **Intervention**: "Let's try together!" -> Opens **Visual Subtraction** mode.
4.  **Activity**: Cross out items. "5 balloons, pop 2. How many left?"
5.  **Success**: She gets 3 right in a row.
6.  **Return**: Back to main game.

### Persona: "Ari" (Age 9, Bored, needs challenge)
1.  **Login**: Ari creates a new profile.
2.  **Placement**: Selects Age 9 -> Starts at Level 4.
3.  **Challenge**: Breezes through Level 4.
4.  **Adaptive**: System offers "Boss Battle" (Time Attack).
5.  **Reward**: Special "Golden Calculator" cosmetic.
