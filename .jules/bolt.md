## 2026-09-17 - React.memo Optimization in Game Loops
**Learning:** In high-frequency game loops where React state updates at up to 60fps (e.g., via `requestAnimationFrame`), unmemoized static or infrequently updating overlay UI components (like `FrenzyOverlay`) cause severe performance degradation from unnecessary component reconciliations.
**Action:** Wrap such components with `React.memo()` to prevent useless re-renders. Avoid explicitly typing the variable as `React.FC<Props>` when wrapping components to avoid TypeScript `MemoExoticComponent` type mismatch, instead type properties inline and set `displayName`.

## 2026-09-17 - Inline Math.random() in 60fps Game Loops
**Learning:** Using inline `Math.random()` calls inside a component that updates on a `requestAnimationFrame` game loop (like the starfield in `MathInvadersGame`) forces React to re-calculate styles continuously, causing severe layout thrashing and creating unnecessary function overhead (thousands of calls per second).
**Action:** Always extract purely presentational randomized static elements into their own `React.memo()` wrapped components. Generate the random properties once inside a `useMemo` block using an empty dependency array. This way, the layout and generation only happen once at mount.
