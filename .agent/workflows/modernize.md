---
description: modernize
---

# Workflow: /modernize
**Intent:** Audit a component for React 19/Tailwind 4/i18next 25 standards.

## Phase 1: Tech Audit
1. Check for `forwardRef` and refactor to React 19's direct ref props.
2. Check for `useMemo` or `useCallback` that might be redundant in React 19.
3. Identify hardcoded strings and suggest `i18next` keys using the new Selector API.
4. Verify Tailwind classes against v4 standards (e.g., checking for deprecated v3-style container queries).

## Phase 2: Design & Motion Review
1. **Framer Motion:** If the element is a list, suggest `staggerChildren` variants.
2. **Accessibility:** Ensure `lucide-react` icons have `aria-hidden` or labels.

## Phase 3: Implementation
- Trigger **Planning Mode**. 
- Generate an `Implementation Plan` artifact.
- **Wait for User Approval.**

## Phase 4: Verification
- Run `npm run lint` to catch ESLint 9 flat-config errors.
- Open the **Browser Subagent** to verify the visual "vibe" is improved.