---
type: rule
rule_id: tech-stack
severity: must
applies_to: [hebrew-math-adventures]
trigger: always_on
category: stack
project: hebrew-math-adventures
updated: 2026-08-08
tags: [react, vite, tailwind, framer-motion, typescript]
---

# Tech Stack & Standards

## Core
- **React 19** — pass `ref` as standard prop (NO `forwardRef`); prefer `use(Promise)`; use `useActionState`/`useFormStatus` for forms.
- **Vite 7 (Rolldown)** — ESM-only. Vet plugins for Rolldown compatibility. "Zero-unnecessary-dependency" policy; keep builds fast.
- **Tailwind CSS v4** — CSS-first. NO `tailwind.config.js`. Theme extensions via `@theme` block in `src/index.css`.
- **Framer Motion 12** — `layoutId` for shared transitions; declarative `variants`/`staggerChildren` (no manual delays); animate `transform`+`opacity` only; wrap conditionals in `<AnimatePresence/>`.
- **Lucide React** — icons imported as individual components.
- **i18next v25** — selector API `t($=>$.key)` only. No string keys.

## Class orchestration
- Use `cn()` utility from `@/lib/utils` exclusively. Template literals with conditional logic are forbidden.

## TypeScript
- `interface` for component props, `type` for unions/utility types.
- `readonly` for array/object props to prevent mutation re-renders.
- Absolute imports `@/`.

## Context vs Zustand
- Context: global config only (theme, auth). Zustand: complex feature-state.

## Deployment
- Firebase Hosting (primary). Firebase Functions V2 compatible. Live: `hebrew-math-adventures-2025.web.app`.

## Dependencies (current, package.json)
- firebase ^12.7, framer-motion ^12, i18next ^25, lucide-react, react ^19.2, tailwind-merge, rolldown-vite 7.
