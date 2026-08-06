## 2024-05-18 - Unhandled LocalStorage Exceptions
**Vulnerability:** `localStorage.setItem` and `getItem` calls were not wrapped in try-catch blocks across multiple React contexts (ProfileContext, ThemeContext, ProgressContext).
**Learning:** `localStorage` can throw `QuotaExceededError` or `SecurityError` (e.g., in Safari Private Mode). Unhandled exceptions in `useEffect` hooks or initial state functions can crash the application or break the React component tree.
**Prevention:** Wrap all `localStorage` operations (`setItem`, `getItem`, `clear`) and associated `JSON.parse()` calls in `try...catch` blocks to ensure the application fails securely and gracefully without crashing.
