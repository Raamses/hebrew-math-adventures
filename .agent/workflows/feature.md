---
description: feature
---

# Workflow: /feature (Elite Orchestration)
**Goal:** End-to-end feature delivery with built-in Security, Analytics, and Multi-Factor Verification.

## Phase 1: Contextual Grounding & "Vibe" Alignment
1. **Tech Audit:** Scan `package.json` for **Vite 7/Rolldown** compatibility and `@agent/rules/tech-stack.md` for **React 19** standards.
2. **Security Scan (Pre-Code):** Invoke `@role-security.md` to identify any sensitive data vectors involved in this feature (e.g., Firebase PII handling).
3. **Pattern Matching:** Scan `/src/components` for **Tailwind v4** consistency and `@container` query usage.

## Phase 2: The Blueprint & Safety Gate
1. **Implementation Plan:** Generate a detailed `Implementation Plan` including an **"Analytics Schema"** and a **"Security Hardening"** section.
2. **Orchestrated Audit:** Invoke `/approve-plan`.
3. **PAUSE & REVIEW:** The **Security Engineer** and **Reviewer** must both flag the plan as `[SAFE]` and `[CLEAN]` before the user grants `[APPROVED]` status.

## Phase 3: High-Velocity Execution (Parallel)
1. **Task Delegation:** Spawn sub-agents in the **Agent Manager**:
    - **Builder (Implementer):** Focuses on TSX/CSS logic using mobile-first Tailwind v4 and React 19 hooks.
    - **Quality (Tester):** Simultaneously generates Vitest suites and mocks for the new logic.
    - **Security Watchdog:** Monitors the live diffs for `any` types, unvalidated Firebase writes, or exposed API keys.
2. **Review Mode:** All code is written to **Review Mode** with logical diff-grouping (Types, UI, Logic).

## Phase 4: Full-Spectrum Verification
1. **Auto-Fix Gate:** Run `npm run lint` and `tsc -b`. Auto-fix lints (Turbo Mode).
2. **UX & Responsive Smoke Test:** Launch the Browser Subagent via `@role-tester.md`:
    - Verify **Touch Targets (44px)** on Mobile (375px).
    - Verify **Max-Width** on Ultrawide (2560px).
    - Capture **GA4 Event hits** in the network tab.
3. **Performance Audit:** Verify CLS < 0.1 and ensure no frame drops in Framer Motion 12 transitions.

## Phase 5: Handover & Deployment
1. **Final Summary:** Generate a `Mission Log` artifact summarizing Security Status, Test Coverage, and Analytics verification.
2. **Call to Action:** Prompt `/ship` to commit and push, followed by a suggestion for the `/deploy` workflow to Firebase.

"If any verification step in Phase 4 fails, the Implementer must automatically analyze the logs, propose a specific fix, and re-run the Verification Gate once before alerting the user."