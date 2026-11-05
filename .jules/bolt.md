## 2026-09-17 - React.memo Optimization in Game Loops
**Learning:** In high-frequency game loops where React state updates at up to 60fps (e.g., via `requestAnimationFrame`), unmemoized static or infrequently updating overlay UI components (like `FrenzyOverlay`) cause severe performance degradation from unnecessary component reconciliations.
**Action:** Wrap such components with `React.memo()` to prevent useless re-renders. Avoid explicitly typing the variable as `React.FC<Props>` when wrapping components to avoid TypeScript `MemoExoticComponent` type mismatch, instead type properties inline and set `displayName`.

## 2024-05-14 - React Performance Anti-pattern: Math.random() in Render Loop
**Learning:** Avoid using inline `Math.random()` calls inside render components or loops, particularly animations, as it causes severe layout thrashing and visual jittering when the component frequently re-renders (like in 60fps game loops).
**Action:** Extract presentational randomized static elements into separate `React.memo()` components and calculate random properties once on mount using `useMemo()` with an empty dependency array. If inside an array mapping, pre-calculate random values in a hook or state before rendering.
