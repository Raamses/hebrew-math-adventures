## 2025-03-01 - Avoid React state for high-frequency numeric lerping
**Learning:** Using `setInterval` with React's `setState` to lerp values (like animating a score) causes 60 FPS re-renders of the entire component tree, leading to high CPU usage and potential stuttering in game loops.
**Action:** Replace `useState`/`setInterval` polling loops with Framer Motion's `useSpring` and `useTransform` hooks, binding the resulting `MotionValue` directly to the `<motion.span>` child. This bypasses React's render phase entirely and updates the DOM natively.
