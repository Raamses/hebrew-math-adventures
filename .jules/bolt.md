## 2026-09-17 - React.memo Optimization in Game Loops
**Learning:** In high-frequency game loops where React state updates at up to 60fps (e.g., via `requestAnimationFrame`), unmemoized static or infrequently updating overlay UI components (like `FrenzyOverlay`) cause severe performance degradation from unnecessary component reconciliations.
**Action:** Wrap such components with `React.memo()` to prevent useless re-renders. Avoid explicitly typing the variable as `React.FC<Props>` when wrapping components to avoid TypeScript `MemoExoticComponent` type mismatch, instead type properties inline and set `displayName`.

## 2026-09-17 - useMemo for Random Values in Framer Motion
**Learning:** In React components that re-render frequently (like `FrenzyOverlay` on combo updates), using inline `Math.random()` calls inside Framer Motion's `animate` and `transition` props causes severe layout thrashing because the target values change on every render, restarting the animations.
**Action:** Always extract randomly generated values for presentational animations into a `useMemo` block with a stable dependency array. For arrays of elements like particles, pre-calculate an array of attributes and map over them in the render phase.
