---
description: ou will trigger this by typing /pre-flight before every major commit or PR.
---

# Workflow: /pre-flight
**Goal:** Full validation of the project state across types, linting, and build integrity.

## Phase 1: Structural Integrity
1. **Type Check:** Run `tsc -b`. If there are any `any` types where strict types are expected, flag them.
2. **Linting:** Run `npm run lint`. Ensure all Tailwind v4 classes are ordered and no React 19 rules are violated.
3. **Dead Code:** Scan for unused imports or variables introduced during the session.

## Phase 2: Build Validation
1. **Execution:** Run `npm run build`. 
2. **Analysis:** Check the `dist` folder size. If there's a significant jump in bundle size, identify which dependency caused it.

## Phase 3: Visual Verification
1. **Launch:** Start the dev server (`npm run dev`).
2. **Browser Subagent:** Open the app and verify the main entry point loads without console errors.
3. **Artifact:** Generate a "System Health Report" artifact summarizing the results.