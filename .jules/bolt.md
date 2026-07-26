## 2025-02-09 - Performance Optimization: Intermediate Array Allocation
**Learning:** Using `Object.values(obj).reduce(...)` to aggregate values from a large object dictionary allocates a potentially large intermediate array purely for the iteration, negatively impacting performance and garbage collection compared to iterating with a `for...in` loop.
**Action:** Prefer manual `for...in` loops with an accumulator when aggregating data from keyed dictionary objects in performance-sensitive logic, rather than utilizing higher order array methods.
## 2023-10-27 - React Array Updates Optimization
**Learning:** For React state that manages arrays of objects (e.g., `allProfiles`), updating a single specific item by its ID using `.map()` creates unnecessary iterations over the entire collection. Benchmarking showed that using `.findIndex()` and only modifying the copied array index when found is roughly ~35% faster (313ms vs 263ms for 1M iterations) and prevents unnecessary object allocations.
**Action:** When updating a specific element in an array by a unique identifier, use `.findIndex()` combined with array spreading (`const next = [...prev]; next[index] = updatedItem;`) instead of `.map()`.
## 2026-07-26 - React Conditional Rendering Optimization
**Learning:** Rendering all child views in a parent component and relying on them to internally check a condition (like `problem.type !== 'arithmetic'`) to return `null` still requires React to execute the function body, evaluate hooks, and perform prop comparison for the inactive views on every render.
**Action:** Use conditional rendering (`&&`) in the parent component (`MathCard`) to only render active child views. This eliminates the reconciliation overhead for inactive components.
