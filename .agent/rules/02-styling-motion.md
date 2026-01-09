---
trigger: always_on
---

# Rule: Styling & Motion (Tailwind v4 + Framer Motion 12)

## 🎨 Tailwind CSS v4 (CSS-First Orchestration)
- **Zero Config Policy:** Do NOT create or look for `tailwind.config.js`. Use the `@theme` block in `src/index.css` for all theme extensions (colors, spacing, fonts).
- **Conflict Resolution:** Always wrap conditional classes in the `cn()` utility to ensure `tailwind-merge` resolves v4 utility conflicts correctly.
- **Modern Layouts:** Prioritize `@container` queries for component-level responsiveness over global `md:` or `lg:` breakpoints to ensure components are truly modular.
- **Hardware Acceleration:** Use `will-change-*` utility classes sparingly but intentionally for high-frequency animations.

## 🎬 Framer Motion 12 (High-Performance Animation)
- **Layout Orchestration:** Use `layoutId` for seamless shared element transitions between different component states.
- **Declarative Variants:** Never use manual `delay` or `duration` props on children; define `variants` and use `staggerChildren` in the parent `motion.div`.
- **GPU Optimization:** Prefer animating `transform` (scale, rotate, translate) and `opacity` over properties that trigger reflow (width, height, top, left).
- **AnimatePresence:** Always wrap conditional components in `<AnimatePresence />` to handle exit animations correctly.

## ♿ Accessibility & Interactivity
- **A11y Standards:** Every `motion.div` that is clickable MUST have `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler.
- **Reduced Motion:** Respect user preferences by using the `useReducedMotion` hook to disable or simplify animations.

## 🔍 Verification (The Agent Gate)
- **Browser Subagent:** After styling changes, launch the Browser Subagent. Navigate to the component and verify that animations do not drop frames (aim for 60fps). 
- **Walkthrough:** Create a `Walkthrough` artifact showing the component in both Light and Dark modes (using the `scheme-*` v4 classes).