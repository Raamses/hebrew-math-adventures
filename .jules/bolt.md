## 2024-08-21 - [FrenzyOverlay React.memo Optimization]
**Learning:** In high-frequency game loops where React state updates at up to 60fps (e.g., via `requestAnimationFrame`), static or infrequently updating overlay UI components (like `FrenzyOverlay`) can cause severe performance degradation from unnecessary component reconciliations on every frame if not memoized.
**Action:** Always wrap highly-reused UI components or overlay components used in high-frequency game loops that take simple props with `React.memo()` to prevent unnecessary reconciliations.
