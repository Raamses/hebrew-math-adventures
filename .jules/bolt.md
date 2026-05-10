## 2024-05-19 - [AudioContext Leak]
**Learning:** `useSound` hook creates a new `AudioContext` every time `playSound` is called. Browsers strictly limit the number of AudioContext instances per page (usually 6), so repeated sounds quickly exhaust this limit and cause a crash or silent failure. This is a common performance/reliability bottleneck in React audio implementations.
**Action:** Implement a singleton `AudioContext` that is instantiated once globally or lazily upon the first user interaction to ensure sounds can be played endlessly.
