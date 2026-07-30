## 2024-11-20 - High-Frequency Object Values and Filter Anti-pattern
**Learning:** Using `Object.values().filter().length` in high-frequency state update functions (like `recordResult` called on every answer) creates unnecessary intermediate array allocations, causing memory pressure and garbage collection stutter.
**Action:** Replace functional array chaining on objects with direct `for...in` loops to track counts or find items without allocating intermediate memory.
