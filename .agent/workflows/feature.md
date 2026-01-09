---
description: feature
---

# Workflow: /feature (Robust Edition)
**Goal:** End-to-end feature orchestration from design to verified deployment readiness.

## Phase 1: Contextual Grounding (Deep Research)
1. **Tech Audit:** Scan `package.json` and `.agent/rules/` to align with React 19 and Tailwind v4 standards.
2. **Pattern Matching:** Identify existing UI patterns in `/src/components` to ensure visual and structural consistency.
3. **Dependency Check:** If the feature requires a new library, verify **Vite 7/Rolldown** compatibility before proceeding.

## Phase 2: The Blueprint (Artifact-First)
1. **Implementation Plan:** Generate a detailed `Implementation Plan` artifact. 
2. **STOP & AUDIT:** Automatically invoke the `/approve-plan` workflow. 
3. **Wait for Approval:** Do NOT write code until the user (or a Reviewer Agent) marks the plan as `[APPROVED]`.

## Phase 3: Parallel Execution (Orchestration)
1. **Task Delegation:** Spawn sub-agents in the **Agent Manager**:
    - **Builder:** Handles TSX/CSS logic using the `cn()` utility.
    - **Tester:** Simultaneously writes Vitest suites for the new logic.
2. **Review Mode Execution:** Changes must be applied in **Review Mode** so the user can see the "Inline Diff" before finalization.

## Phase 4: Automated Verification
1. **Lint & Type Check:** Run `npm run lint` and `tsc -b`. Auto-fix linting issues silently (Turbo Mode).
2. **Browser Subagent Smoke Test:**
    - Launch the dev server.
    - Use JS automation to interact with the new feature.
    - Record a `Walkthrough` artifact showcasing the feature in mobile and desktop views.

## Phase 5: Handover
1. **Final Summary:** Generate a Markdown artifact summarizing changes, test results, and the live preview link.
2. **Call to Action:** Prompt the user to run `/ship` to commit and push to GitHub.