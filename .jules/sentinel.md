## 2024-05-24 - Handle localStorage securely to prevent render phase crashes
**Vulnerability:** `localStorage` operations (`getItem`, `setItem`) were used without `try...catch` blocks, particularly within React's `useState` initialization callbacks (synchronous render phase).
**Learning:** If a user blocks cookies/local storage (resulting in a `SecurityError`), or if the storage quota is exceeded (`QuotaExceededError`), the unhandled exception during the synchronous render phase will crash the entire React application unrecoverably.
**Prevention:** Always wrap `localStorage` operations in `try...catch` blocks, especially when hydrating initial state in `useState(() => { ... })` or inside `useEffect`, to fail securely and gracefully.

## 2024-05-24 - Prevent ID collisions via Secure Randomization
**Vulnerability:** Game entities and profiles were generating IDs using `Math.random().toString(36).substring(...)`. `Math.random()` is not cryptographically secure and could lead to ID collisions, especially in high-frequency game loops or environments with low entropy.
**Learning:** For transient UI elements, simple randomness is usually fine, but when these IDs are relied upon for game logic or state management, predictable or colliding IDs can lead to hard-to-debug state bugs or potential vulnerabilities.
**Prevention:** Use Web Crypto APIs (`crypto.randomUUID()`) to generate authenticators, secrets, and persisted entity IDs. Only fallback to custom random logic if `crypto` is undefined (e.g., non-secure HTTP contexts).
