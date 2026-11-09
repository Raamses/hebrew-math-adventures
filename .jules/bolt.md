## 2024-03-24 - Math.random() in Render Path Anti-Pattern
**Learning:** Using `Math.random()` directly in `animate` or `transition` properties in Framer Motion causes animations to jitter, reset, or layout thrash on every re-render, especially for components that re-render frequently (like overlays with internal state `showBurst`).
**Action:** Always pre-calculate random properties for visual elements using `useMemo` or extract them into separate `React.memo` components with static initial values.
