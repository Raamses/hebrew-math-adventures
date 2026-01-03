---
trigger: always_on
---

# Rule: Styling & Motion (Tailwind v4 + Framer Motion)

## Tailwind CSS v4
- **No Config Files:** Do NOT look for `tailwind.config.js`. Everything is CSS-variable driven in `src/index.css`.
- **Dynamic Classes:** Use `tailwind-merge` (via `cn()`) to resolve conflicts.
- **Container Queries:** Prefer `@container` and `@sm/container` over traditional media queries where component-level responsiveness is needed.

## Framer Motion 12
- **Performance:** Use `layoutId` for shared element transitions.
- **Orchestration:** Use `variants` and `staggerChildren` for lists instead of manual delays on individual items.
- **Accessibility:** Ensure every `motion.div` that acts as a button has the appropriate `role` and `tabIndex`.