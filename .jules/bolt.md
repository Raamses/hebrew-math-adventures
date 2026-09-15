## 2024-05-24 - React Framer Motion Performance Optimization
**Learning:** Animating primitive numbers like score using setInterval causes 60fps reconciliations in React components. Using useSpring and useTransform with motion elements allows the DOM to be updated directly, bypassing React's render phase.
**Action:** Use framer-motion's useSpring for animating numeric values instead of React state and setInterval.
