## 2025-02-14 - Crypto API in Non-Secure Contexts
**Vulnerability:** Unnecessary use of `crypto.randomUUID()` to replace `Math.random()` in transient game logic.
**Learning:** Adding Web Crypto APIs for non-sensitive ID generation (like visual bubble IDs in a game) provides no real security benefit ("security theater") and causes immediate runtime crashes when testing on local networks (HTTP instead of HTTPS), as `crypto.randomUUID()` is undefined in non-secure contexts.
**Prevention:** Only use Web Crypto APIs when generating authenticators, secrets, or secure authorization tokens. For UI/game transient IDs, stick to simpler generators like `Date.now() + Math.random()` or specific libraries. Focus on real security threats like DoS via unconstrained inputs (fixed in this session via truncations).
## 2025-02-14 - Type Number Input DoS Risk
**Vulnerability:** Unconstrained length on `<input type="number">` fields across the application.
**Learning:** Browsers often ignore the native `maxLength` attribute on `type="number"` inputs. This can lead to users (or scripts) pasting massively long numeric strings, which are then parsed by React/JavaScript, potentially causing performance issues or Application-Level Denial of Service (DoS) due to CPU spikes during parsing or state updates.
**Prevention:** Always explicitly enforce length limits for numeric inputs in the `onChange` handler using string manipulation (e.g., `e.target.value.slice(0, MAX_LENGTH)`) before passing the value to `setState` or `Number()`.
## 2025-02-14 - LocalStorage Quota Exhaustion DoS Risk
**Vulnerability:** Unbounded profile creation leading to LocalStorage quota exhaustion.
**Learning:** LocalStorage has a hard limit (typically 5MB). Without bounds on the number of entities (like profiles) that can be created and stored, a malicious script or an enthusiastic user can exhaust this storage, causing `DOMException: QuotaExceededError` and permanently crashing or rendering the application unusable (Application-Level Denial of Service).
**Prevention:** Always explicitly enforce a hard limit on the collection size (e.g., maximum 10 items) inside the creation/persistence functions to prevent quota exhaustion DoS.
