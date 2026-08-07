## 2025-02-14 - Unhandled LocalStorage Exceptions in Context Providers
**Vulnerability:** `localStorage.getItem` and `localStorage.setItem` inside `useState` initialization and `useEffect` blocks in Context Providers were not wrapped in `try...catch` blocks.
**Learning:** In strict environments (like iframe or incognito modes), or when the storage quota is exceeded, these raw `localStorage` calls can throw exceptions (e.g. `SecurityError` or `QuotaExceededError`), causing the React component tree to crash.
**Prevention:** Wrap all `localStorage` operations (`setItem`, `getItem`, `clear`) in context providers with `try...catch` blocks to fail securely and provide a graceful fallback.
