## 2025-02-09 - Performance Optimization: Intermediate Array Allocation
**Learning:** Using `Object.values(obj).reduce(...)` to aggregate values from a large object dictionary allocates a potentially large intermediate array purely for the iteration, negatively impacting performance and garbage collection compared to iterating with a `for...in` loop.
**Action:** Prefer manual `for...in` loops with an accumulator when aggregating data from keyed dictionary objects in performance-sensitive logic, rather than utilizing higher order array methods.

## 2025-02-09 - Performance Optimization: Memoization and Impure Function Removal
**Learning:** Calling impure functions like `Math.random()` during render (e.g. inside `FrenzyOverlay`) causes unstable React reconciliations and triggers linter errors. Furthermore, replacing simple `.map()`/`.filter()` calls with manual `for` loops inside state setters is a negligible micro-optimization that sacrifices critical code readability.
**Action:** Use `React.memo` for highly reused components rendering in lists (like `SeriesView`), and fix unstable renders by replacing `Math.random()` in render bodies with deterministic pseudo-random logic (e.g., using `Math.sin(index)`). Avoid subjective micro-optimizations that harm readability.
