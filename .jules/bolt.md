
## 2025-01-20 - Memoizing overlay components in high-frequency loops
**Learning:** Background or overlay UI components (like `FrenzyOverlay`) rendered inside high-frequency game loops (updating via `requestAnimationFrame` at 60fps) can cause severe React reconciliation overhead if they re-render on every frame or state change of the parent.
**Action:** Always wrap static or infrequently updating overlay UI components in `React.memo()` to prevent unnecessary re-renders in high-frequency game loops, keeping frame rates smooth.
