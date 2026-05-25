## 2025-02-09 - Performance Optimization: Intermediate Array Allocation
**Learning:** Using `Object.values(obj).reduce(...)` to aggregate values from a large object dictionary allocates a potentially large intermediate array purely for the iteration, negatively impacting performance and garbage collection compared to iterating with a `for...in` loop.
**Action:** Prefer manual `for...in` loops with an accumulator when aggregating data from keyed dictionary objects in performance-sensitive logic, rather than utilizing higher order array methods.

## 2025-02-13 - Performance Optimization: False O(1) state removals via Object Spreading
**Learning:** Attempting to optimize React array state removals (e.g. `setItems(prev => prev.filter(i => i.id !== id))`) by converting the state to a `Record` dictionary and using `delete` on a shallow copy (`setItems(prev => { const next = {...prev}; delete next[id]; return next; })`) does not achieve O(1) performance. The object spreading (`{...prev}`) is inherently an O(N) operation (where N is the number of keys), rendering the optimization pointless while degrading code readability.
**Action:** When a high-frequency game loop demands true O(1) removal, avoid using React state entirely for the entity collection; use a mutable `useRef` map or array and handle rendering imperatively, or accept the O(N) array filter if N is small and stability is preferred.

## 2025-02-13 - Performance Optimization: Ineffective React.memo wraps
**Learning:** Wrapping sub-components in `React.memo` is completely ineffective if the parent component passes newly instantiated functions (e.g., inline arrow functions or unmemoized variables) as props on every render. `React.memo` relies on a shallow equality check (`===`), which will always fail for new function references, causing the component to re-render anyway and adding overhead for the failed check.
**Action:** Always verify that the parent component provides stable props (using `useCallback` or `useMemo`) before applying `React.memo` to a child component.
