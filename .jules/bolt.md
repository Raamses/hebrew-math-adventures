## 2026-09-17 - React.memo Optimization in Game Loops
**Learning:** In high-frequency game loops where React state updates at up to 60fps (e.g., via `requestAnimationFrame`), unmemoized static or infrequently updating overlay UI components (like `FrenzyOverlay`) cause severe performance degradation from unnecessary component reconciliations.
**Action:** Wrap such components with `React.memo()` to prevent useless re-renders. Avoid explicitly typing the variable as `React.FC<Props>` when wrapping components to avoid TypeScript `MemoExoticComponent` type mismatch, instead type properties inline and set `displayName`.

## 2024-10-24 - [Framer Motion Re-render Thrashing]
**Learning:** Using inline `Math.random()` to set properties on Framer Motion `initial`, `animate`, or `transition` props in components that re-render frequently (like `FrenzyOverlay` attached to a 60fps game loop) forces constant layout recalculations, resets animations, and causes visual jitter.
**Action:** Extract random or computed initialization variables out of inline render props by wrapping them in `useMemo` with an appropriate dependency array so that their values stay stable across multiple unrelated parent re-renders.
