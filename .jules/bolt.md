## 2024-05-11 - Optimize AudioContext instantiation
**Learning:** Web Audio API has strict instance limits (typically max 6 instances per browser tab). Creating a new `AudioContext` instance inside frequently called functions, like a `playSound` hook callback, quickly exhausts this limit. This results in silent audio failures, warnings in the console, and potentially crashes.
**Action:** Always use a lazily-initialized global singleton for `AudioContext` across the application to avoid exceeding browser limits while providing performant sound effects.
