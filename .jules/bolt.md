## 2026-09-17 - React.memo Optimization in Game Loops
**Learning:** In high-frequency game loops where React state updates at up to 60fps (e.g., via `requestAnimationFrame`), unmemoized static or infrequently updating overlay UI components (like `FrenzyOverlay`) cause severe performance degradation from unnecessary component reconciliations.
**Action:** Wrap such components with `React.memo()` to prevent useless re-renders. Avoid explicitly typing the variable as `React.FC<Props>` when wrapping components to avoid TypeScript `MemoExoticComponent` type mismatch, instead type properties inline and set `displayName`.

## 2026-09-17 - React.memo Optimization in Game Loops
**Learning:** In high-frequency game loops where React state updates at up to 60fps, unmemoized random value generation using `Math.random()` inside the component tree causes layout thrashing and animation jitter due to constant component reconciliations and property recalculation.
**Action:** Move inline `Math.random()` expressions inside `useMemo` or extract them into separate `React.memo()` components to pre-calculate values once per relevant prop change.
