## 2026-09-11 - [Performance] Use Framer Motion useSpring for high-frequency value lerping
**Learning:** Using `setInterval` with `setState` for visual effects like score counters causes React to reconcile the entire component tree at 60fps, which can cause micro-stutters and high CPU usage in complex HUDs.
**Action:** Replace `setInterval`/`setState` value animations with Framer Motion's `useSpring` and `useTransform`, passing the `MotionValue` directly as a child to a `<motion.span>`. This updates the DOM directly, completely bypassing React's render phase.
