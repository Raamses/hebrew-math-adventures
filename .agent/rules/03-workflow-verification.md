---
trigger: always_on
---

# Rule: Verification & Quality Control (Turbo Edition)

## 🔄 The "Agentic Loop" & Autonomy
- **Implementation Plans:** For any change affecting >3 files or modifying core logic (auth, state, API), you MUST generate an `Implementation Plan` artifact.
- **Approval Gate:** Even in Turbo Mode, wait for the `[APPROVED]` tag from the `/approve-plan` workflow before modifying source code.
- **Linter Enforcement:** Always run `npm run lint` and `tsc -b` after changes. If errors persist, you are forbidden from reporting "Task Complete."

## 🌐 Browser Subagent (Visual & UX Validation)
- **Visual Smoke Test:** If UI/CSS is modified, launch the Browser Subagent to:
    1. Verify the component renders without console errors.
    2. Check responsiveness across 375px (Mobile), 768px (Tablet), and 1440px (Desktop) widths.
    3. Use JS automation to trigger Framer Motion animations and verify exit/entry transitions.
- **Artifact Generation:** Always generate a `Walkthrough` video/interactive artifact for every UI change.

## 🏗 Build & Dependency Integrity
- **Vite 7 Audit:** After `npm install`, run a test build (`npm run build`) to ensure Rolldown compatibility.
- **Environment Safety:** Verify that no `.env` values are leaked into the `dist` folder or committed to logs.

## ⚡ Turbo Mode Guardrails
- **Scope Limitation:** Turbo Mode (Always Proceed) is authorized for: `npm install`, `vitest`, `lint`, and `refactor` within a single file.
- **Rollback Protocol:** If a task fails or the user rejects a diff, immediately execute `git stash` or `git checkout` to return to the last known stable state.