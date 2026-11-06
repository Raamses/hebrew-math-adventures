## 2026-09-17 - React.memo Optimization in Game Loops
**Learning:** In high-frequency game loops where React state updates at up to 60fps (e.g., via `requestAnimationFrame`), unmemoized static or infrequently updating overlay UI components (like `FrenzyOverlay`) cause severe performance degradation from unnecessary component reconciliations.
**Action:** Wrap such components with `React.memo()` to prevent useless re-renders. Avoid explicitly typing the variable as `React.FC<Props>` when wrapping components to avoid TypeScript `MemoExoticComponent` type mismatch, instead type properties inline and set `displayName`.

## 2026-09-17 - Inline Math.random() in Game Loops
**Learning:** Using inline `Math.random()` calls inside the render function for styles or elements in frequently re-rendering components (like a 60fps game loop) causes severe layout thrashing, visual jittering, and unpredictable animations.
**Action:** Extract presentational randomized static elements into separate `React.memo()` components or calculate random properties once on mount using `useMemo()` with an empty dependency array.
