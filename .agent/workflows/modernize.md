---
description: modernize
---

# Workflow: /modernize
**Intent:** Deep audit and refactor of components to React 19, Tailwind v4, and i18next v25 standards.

## Phase 1: The "Ace" Tech Audit
1. **React 19 Refactor:** Identify and replace `forwardRef` with direct `ref` props. 
2. **Logic Optimization:** Scan for `useMemo`, `useCallback`, or `memo` that are now redundant due to the React 19 compiler/engine and suggest removal.
3. **i18n Transformation:** Convert string-based translation keys to the type-safe Selector API: `t($=>$.key)`.
4. **Tailwind v4 Alignment:** Identify deprecated v3 utilities and migrate them to CSS-variable-based v4 classes. Replace global media queries with `@container` where appropriate.
5. **Security Check:** Invoke `@role-security.md` to ensure the refactor doesn't introduce XSS via unsanitized prop passing or insecure data handling.

## Phase 2: UX, Motion & A11y Review
1. **Motion Orchestration:** Audit Framer Motion 12 usage. Mandate `variants` and `staggerChildren` for lists; reject manual delays.
2. **Iconography:** Ensure `lucide-react` icons are used correctly with `aria-hidden` or descriptive `aria-label` props.
3. **Touch Targets:** Verify that any interactive element being refactored meets the **44px touch target** requirement for mobile-first integrity.

## Phase 3: The Blueprint (Artifact-First)
1. **Planning Mode:** Generate a detailed `Implementation Plan` artifact.
2. **Vite 7 Audit:** Confirm that any proposed refactors or new utilities are optimized for the **Rolldown** bundler.
3. **STOP & AWAIT:** Pause for user selection:
   - **(A) Execute All:** Trigger the Implementer for a full refactor.
   - **(B) Partial Refactor:** Select specific files/rules to apply.
   - **(C) Re-Audit:** Adjust the modernization depth.

## Phase 4: Verification & Validation
1. **Linting & Types:** Run `npm run lint` (ESLint 9) and `tsc -b` to ensure the refactor hasn't broken the type-graph.
2. **Visual Smoke Test:** Open the **Browser Subagent** via `@role-tester.md`.
3. **Responsive Check:** Verify the component's "Vibe" and functionality at **375px** and **2560px**.
4. **Analytics Check:** Ensure existing GA4 events are still firing correctly after the logic change.