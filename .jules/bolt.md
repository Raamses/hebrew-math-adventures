## 2026-09-17 - React.memo Optimization in Game Loops
**Learning:** In high-frequency game loops where React state updates at up to 60fps (e.g., via `requestAnimationFrame`), unmemoized static or infrequently updating overlay UI components (like `FrenzyOverlay`) cause severe performance degradation from unnecessary component reconciliations.
**Action:** Wrap such components with `React.memo()` to prevent useless re-renders. Avoid explicitly typing the variable as `React.FC<Props>` when wrapping components to avoid TypeScript `MemoExoticComponent` type mismatch, instead type properties inline and set `displayName`.

## 2026-09-18 - useMemo for Particle Layout Thrashing
**Learning:** React re-renders in game loops combined with inline `Math.random()` arrays for particle attributes (like in `FrenzyOverlay`) trigger heavy layout thrashing, as React throws away and creates new animation targets continuously.
**Action:** Always wrap randomly generated arrays or objects intended for presentational effects inside `useMemo()` with appropriate dependency arrays. Ensure `useMemo` contains the complete random generation logic so `Math.random()` isn't executed on every render cycle.
