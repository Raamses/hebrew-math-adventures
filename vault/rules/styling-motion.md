---
type: rule
rule_id: styling-motion
severity: must
applies_to: [hebrew-math-adventures]
trigger: always_on
category: styling
project: hebrew-math-adventures
updated: 2026-08-08
tags: [tailwind, framer-motion, animation, a11y]
---

# Styling & Motion (Tailwind v4 + Framer Motion 12)

## Tailwind v4 (CSS-first)
- NO `tailwind.config.js`. Use `@theme` block in `src/index.css` for all theme extensions (colors, spacing, fonts).
- Wrap conditional classes in `cn()` so `tailwind-merge` resolves v4 conflicts.
- Prioritize `@container` queries over global `md:`/`lg:` breakpoints for component-level responsiveness.
- Use `will-change-*` sparingly for high-frequency animations.

## Framer Motion 12
- `layoutId` for shared element transitions.
- Declarative `variants` + `staggerChildren` in parent; NEVER manual `delay`/`duration` on children.
- Animate `transform` + `opacity` only (GPU-friendly), not width/height/top/left.
- Wrap conditionals in `<AnimatePresence/>` for exit animations.

## Accessibility
- Clickable `motion.div` MUST have `role="button"`, `tabIndex={0}`, `onKeyDown` handler.
- Respect reduced motion via `useReducedMotion`.

## Verification gate
- After styling changes, browser-verify no dropped frames (aim 60fps).
- Check Light + Dark modes (`scheme-*` v4 classes).
- Check responsive: 375px mobile, 768px tablet, 1440px desktop.
