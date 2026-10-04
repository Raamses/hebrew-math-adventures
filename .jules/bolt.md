## 2026-09-17 - React.memo Optimization in Game Loops
**Learning:** In high-frequency game loops where React state updates at up to 60fps (e.g., via `requestAnimationFrame`), unmemoized static or infrequently updating overlay UI components (like `FrenzyOverlay`) cause severe performance degradation from unnecessary component reconciliations.
**Action:** Wrap such components with `React.memo()` to prevent useless re-renders. Avoid explicitly typing the variable as `React.FC<Props>` when wrapping components to avoid TypeScript `MemoExoticComponent` type mismatch, instead type properties inline and set `displayName`.

## 2026-09-17 - Inline Randomization in High-Frequency Game Components
**Learning:** Initializing randomized static UI elements (e.g., starfields with `Math.random()`) directly inside the render body of a component bound to a 60fps game loop (like `MathInvadersGame.tsx`) triggers layout thrashing, as the UI recalculates and jitter-moves the static elements on every frame.
**Action:** Extract such presentational static elements into separate `React.memo()` components and calculate their properties once on mount using `useMemo()` with an empty dependency array to completely bypass unnecessary re-renders when the parent loop updates.
