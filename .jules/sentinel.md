## 2025-02-14 - Crypto API in Non-Secure Contexts
**Vulnerability:** Unnecessary use of `crypto.randomUUID()` to replace `Math.random()` in transient game logic.
**Learning:** Adding Web Crypto APIs for non-sensitive ID generation (like visual bubble IDs in a game) provides no real security benefit ("security theater") and causes immediate runtime crashes when testing on local networks (HTTP instead of HTTPS), as `crypto.randomUUID()` is undefined in non-secure contexts.
**Prevention:** Only use Web Crypto APIs when generating authenticators, secrets, or secure authorization tokens. For UI/game transient IDs, stick to simpler generators like `Date.now() + Math.random()` or specific libraries. Focus on real security threats like DoS via unconstrained inputs (fixed in this session via truncations).
## 2025-02-14 - Type Number Input DoS Risk
**Vulnerability:** Unconstrained length on `<input type="number">` fields across the application.
**Learning:** Browsers often ignore the native `maxLength` attribute on `type="number"` inputs. This can lead to users (or scripts) pasting massively long numeric strings, which are then parsed by React/JavaScript, potentially causing performance issues or Application-Level Denial of Service (DoS) due to CPU spikes during parsing or state updates.
**Prevention:** Always explicitly enforce length limits for numeric inputs in the `onChange` handler using string manipulation (e.g., `e.target.value.slice(0, MAX_LENGTH)`) before passing the value to `setState` or `Number()`.
## 2025-02-14 - LocalStorage Quota Exhaustion
**Vulnerability:** Unbounded collections saved to LocalStorage, which has a tight quota (usually 5MB).
**Learning:** Automatically saving arrays or collections directly to LocalStorage without enforcing constraints or hard limits can lead to quota exhaustion. Once LocalStorage is full, any subsequent writes fail, which often breaks other state logic or causes silent unhandled Promise rejections that degrade the UI.
**Prevention:** Always enforce a hard limit on the number of items that can be created in a persisted collection (e.g., max 10 profiles). Wrap actions that modify these collections in `try...catch` blocks to gracefully handle limits and provide actionable error messages to the user.
## 2025-02-14 - LocalStorage Security and Quota Errors
**Vulnerability:** Unhandled `localStorage.getItem` and `localStorage.setItem` calls crashing the application due to `SecurityError` (e.g. cookies disabled) or `QuotaExceededError`.
**Learning:** Browser environments can throw synchronous exceptions when accessing `localStorage` if privacy settings block it or if the quota is exceeded. If these calls happen during React initialization or render cycles without `try...catch` blocks, they will cause unhandled exceptions that break the entire UI, leading to a localized Denial of Service.
**Prevention:** Always wrap all `localStorage` reads and writes (`getItem`, `setItem`, `removeItem`, `clear`) in `try...catch` blocks. Provide safe fallback values when reads fail, and gracefully ignore or warn when writes fail to ensure the application remains functional even when persistence is unavailable.
