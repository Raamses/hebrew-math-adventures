## 2024-05-19 - [AudioContext Leak]
**Learning:** `useSound` hook creates a new `AudioContext` every time `playSound` is called. Browsers strictly limit the number of AudioContext instances per page (usually 6), so repeated sounds quickly exhaust this limit and cause a crash or silent failure. This is a common performance/reliability bottleneck in React audio implementations.
**Action:** Implement a singleton `AudioContext` that is instantiated once globally or lazily upon the first user interaction to ensure sounds can be played endlessly.
## 2024-05-19 - [Cascading Renders in Context]
**Learning:** Using `useEffect` to synchronize props (like `profile.themeId`) into local state (like `currentTheme`) causes an immediate secondary render, slowing down context updates and triggering ESLint warnings.
**Action:** Derive state directly during the render phase (e.g. `const currentTheme = profile?.themeId ? getThemeById(profile.themeId) : guestTheme;`) to ensure components render with the correct state on the first pass.

## 2024-05-19 - [Avoid State Setters in requestAnimationFrame]
**Learning:** Unconditional calls to `setState` (like `setEntities`) inside a `requestAnimationFrame` loop run 60 times a second, enqueueing React updates or invoking the state updater function continually even when the state hasn't changed. This causes significant reconciliation overhead and garbage collection, severely degrading performance.
**Action:** When working with high-frequency loops (like game engines), always use a pre-check via a mutable ref (e.g. `const needsCleanup = entitiesRef.current.some(...)`) before deciding to call the React state setter. Only enqueue updates when a mutation is genuinely required.
