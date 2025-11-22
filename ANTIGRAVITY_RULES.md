# ANTIGRAVITY PROJECT RULES: Harpatkaot Heshbon

## 1. RTL & Hebrew Compliance (CRITICAL)
- **Root Direction:** <html dir="rtl" lang="he">
- **CSS:** ALWAYS use Logical Properties (`ms-`, `me-`, `ps-`, `pe-`). NEVER use `left` or `right` for layout.
- **Math Exception:** All equations (e.g., "5 + 2 = 7") MUST be wrapped in:
  `<div dir="ltr" className="unicode-bidi-isolate font-rubik">`
  This prevents the numbers from visually flipping order.

## 2. Tech Stack
- Vite + React + TypeScript + Tailwind CSS + Framer Motion.
- **No Placeholders:** If you need text, generate encouraging Hebrew phrases (e.g., "!כל הכבוד").

## 3. Verification Standards
- **QA Agent:** When running browser tests, you MUST visually verify that the "Back" button is on the Right and "Next" is on the Left.

## 4. Math Logic Standards (Curriculum)
- **Level 1 (Age 6):** Addition/Subtraction result < 10. (e.g., 3 + 4)
- **Level 2 (Age 7):** Addition/Subtraction result < 20. (e.g., 12 - 5)
- **Level 3 (Age 8):** Addition/Subtraction < 100, Basic Multiplication (1-5 tables).
- **Level 4 (Age 9+):** Multiplication (1-10), Basic Division.
- **Level 5 (Age 10+):** Basic fractions (1/2, 1/4, 1/8), Basic Division (1-100).
- **Progression:** Users earn "XP". Every 100 XP = Level Up, use progression in the amount of XP to level up.

## 5. Advanced Math Generation Rules
- **Algorithm:** Use "Bag Deck" Randomization. Never use pure `Math.random()` for question selection.
- **3-Digit Constraints:**
  - *Simple:* No carrying/borrowing (e.g., 245 + 123).
  - *Carry Tens:* e.g., 150 + 170 (5+7 > 10).
  - *Zero Crossing:* Critical for subtraction (e.g., 503 - 15).
- **Repetition Guard:** Store the last 3 questions in a `history` array. If a newly generated question matches any operand or result of the last 3, discard and regenerate.

## 6. Game Flow Control
- **Safety:** Never allow instant exit from an active game session. Always require a 2-step confirmation (Pause -> Quit).
- **Restart Logic:** A "Restart" must:
  1. Reset Score/Streak to 0.
  2. Clear the "Last 3 Questions" history buffer.
  3. Refill the "Question Bag" (Math Engine reset).