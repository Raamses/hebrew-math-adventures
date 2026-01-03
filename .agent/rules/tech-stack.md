---
trigger: always_on
---

# Project Tech Stack & Standards

## Core Frameworks
- **React 19:** Use latest hooks. Avoid legacy `forwardRef` (use ref as a prop).
- **Vite 7 (Rolldown):** Performance is key. Do not add Rollup-specific plugins unless verified for Rolldown compatibility.
- **Tailwind CSS v4:** We use the CSS-first configuration. Do NOT create a `tailwind.config.js`. Use CSS variables in `index.css` for theme extensions.

## Styling & Animation
- **Lucide React:** Use for all icons.
- **Framer Motion 12:** Prefer the `layout` prop for shared element transitions. Use `AnimatePresence` for unmounting.
- **Utility Classes:** Use `clsx` and `tailwind-merge` for conditional classes (the `cn()` utility pattern).

## Internationalization (i18next v25)
- Use the `useTranslation` hook. 
- **TS Overhaul:** Prefer the selector function `t($=>$.key)` for better type safety and autocomplete.

## Class Name Orchestration
- **Utility:** Always use the `cn()` utility from `@/lib/utils` for joining classes.
- **Pattern:** Prefer `cn('base-class', condition && 'conditional-class')` over template literals or manual string concatenation.