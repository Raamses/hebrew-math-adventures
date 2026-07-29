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

## 2025-02-14 - LocalStorage Access and Predictable IDs
**Vulnerability:** Unhandled `localStorage` access leading to crashes and predictable profile IDs in non-secure contexts.
**Learning:** Missing `try...catch` around `localStorage` operations can cause application crashes due to `SecurityError` (e.g., third-party cookies blocked) or `QuotaExceededError`. Additionally, using `Math.random()` for IDs is predictable and unsuitable when `crypto.randomUUID` is missing in non-HTTPS environments.
**Prevention:** Wrap all `localStorage` interactions in `try...catch` blocks. Use a secure UUID v4 polyfill that falls back to `crypto.getRandomValues` before resorting to math-based randomness to maintain ID unpredictability as best as possible.
