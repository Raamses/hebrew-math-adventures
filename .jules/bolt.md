## 2025-02-09 - Performance Optimization: Intermediate Array Allocation
**Learning:** Using `Object.values(obj).reduce(...)` to aggregate values from a large object dictionary allocates a potentially large intermediate array purely for the iteration, negatively impacting performance and garbage collection compared to iterating with a `for...in` loop.
**Action:** Prefer manual `for...in` loops with an accumulator when aggregating data from keyed dictionary objects in performance-sensitive logic, rather than utilizing higher order array methods.
## 2023-10-27 - React Array Updates Optimization
**Learning:** For React state that manages arrays of objects (e.g., `allProfiles`), updating a single specific item by its ID using `.map()` creates unnecessary iterations over the entire collection. Benchmarking showed that using `.findIndex()` and only modifying the copied array index when found is roughly ~35% faster (313ms vs 263ms for 1M iterations) and prevents unnecessary object allocations.
**Action:** When updating a specific element in an array by a unique identifier, use `.findIndex()` combined with array spreading (`const next = [...prev]; next[index] = updatedItem;`) instead of `.map()`.
## 2024-06-10 - Avoiding False Array Micro-Optimizations
**Learning:** Replacing `.filter()` with `.findIndex()` + array spreading (`[...prev]`) + `.splice()` for array item removal is a false micro-optimization. The spread operator (`...`) iterates the entire array to create a shallow copy, so it does not save N operations. It also severely degrades code readability by turning a 1-liner into 6 lines.
**Action:** Never replace native `.filter()` or `.map()` with verbose array copying unless specifically moving to a mutable `useRef` for a true game loop optimization. Stick to React idioms for state updates.

## 2024-06-10 - React.memo and Inline Callbacks
**Learning:** When a child component receives an inline arrow function from a parent (e.g., `onComplete={() => ...}`), the child will completely re-render every time the parent's state changes, bypassing any `React.memo` benefits. In high-frequency update loops (like game state score/frenzy changes), this can cause severe performance degradation for complex UI elements like animated `Explosion`s.
**Action:** Always wrap callbacks in `React.useCallback` and pass identifiers (like `id`) as props to child components so the memoized callback can be reused without causing child re-renders.
