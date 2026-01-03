---
trigger: always_on
---

# Rule: Verification & Quality Control

## The "Agentic Loop"
- **Implementation Plans:** For any change affecting >3 files, generate an `Implementation Plan` artifact and WAIT for user approval.
- **Linting:** Always run `npm run lint` after code changes. Do not report success if linting fails.

## Verification
- **Browser Subagent:** If a visual component is changed, use the Browser Subagent to:
    1. Render the component.
    2. Check for responsiveness.
    3. Generate a `Walkthrough` recording artifact for the user.
- **Dry Runs:** Use `Turbo` mode only for `npm install`. Use `Auto` mode for all source code modifications.