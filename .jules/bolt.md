## 2026-09-17 - React.memo Optimization in Game Loops
**Learning:** In high-frequency game loops where React state updates at up to 60fps (e.g., via `requestAnimationFrame`), unmemoized static or infrequently updating overlay UI components (like `FrenzyOverlay`) cause severe performance degradation from unnecessary component reconciliations.
**Action:** Wrap such components with `React.memo()` to prevent useless re-renders. Avoid explicitly typing the variable as `React.FC<Props>` when wrapping components to avoid TypeScript `MemoExoticComponent` type mismatch, instead type properties inline and set `displayName`.

## 2026-10-23 - Extracting inline Math.random() to React.memo
**Learning:** Using inline Math.random() calls inside components that re-render frequently (like 60fps game loops) causes severe layout thrashing and visual jittering as the random values change constantly.
**Action:** Extract presentational randomized static elements into separate React.memo() components and calculate random properties once on mount using useMemo() with appropriate dependency arrays.
