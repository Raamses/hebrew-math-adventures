## 2024-05-24 - Unhandled Exceptions in Local Storage

**Vulnerability:** Application crash risk (Denial of Service) via unhandled `QuotaExceededError` or `SecurityError` during `localStorage` operations.
**Learning:** React hooks utilizing `localStorage` without `try...catch` blocks can fatally crash the application in restrictive browser environments (like incognito mode) or when storage is full.
**Prevention:** Always wrap all `localStorage.getItem`, `localStorage.setItem`, and related `JSON.parse` operations in `try...catch` blocks and provide safe fallback states.
