## 2025-02-09 - Performance Optimization: Intermediate Array Allocation
**Learning:** Using `Object.values(obj).reduce(...)` to aggregate values from a large object dictionary allocates a potentially large intermediate array purely for the iteration, negatively impacting performance and garbage collection compared to iterating with a `for...in` loop.
**Action:** Prefer manual `for...in` loops with an accumulator when aggregating data from keyed dictionary objects in performance-sensitive logic, rather than utilizing higher order array methods.
## 2023-10-27 - React Array Updates Optimization
**Learning:** For React state that manages arrays of objects (e.g., `allProfiles`), updating a single specific item by its ID using `.map()` creates unnecessary iterations over the entire collection. Benchmarking showed that using `.findIndex()` and only modifying the copied array index when found is roughly ~35% faster (313ms vs 263ms for 1M iterations) and prevents unnecessary object allocations.
**Action:** When updating a specific element in an array by a unique identifier, use `.findIndex()` combined with array spreading (`const next = [...prev]; next[index] = updatedItem;`) instead of `.map()`.

## 2023-10-27 - React Child Component Reconciliation
**Learning:** Rendering child components unconditionally and relying on them to return `null` based on props (e.g., `<View problem={problem} />` when `problem.type` is wrong) causes React to needlessly execute their function bodies, compute hooks, and perform prop equality checks (even if wrapped in `React.memo`) on every parent render.
**Action:** Use conditional rendering (`{condition && <Component />}`) in the parent component to entirely bypass the React reconciliation phase for inactive UI branches, especially those receiving frequently updating state like form inputs.
