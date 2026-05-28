## 2025-02-14 - Crypto API in Non-Secure Contexts
**Vulnerability:** Unnecessary use of `crypto.randomUUID()` to replace `Math.random()` in transient game logic.
**Learning:** Adding Web Crypto APIs for non-sensitive ID generation (like visual bubble IDs in a game) provides no real security benefit ("security theater") and causes immediate runtime crashes when testing on local networks (HTTP instead of HTTPS), as `crypto.randomUUID()` is undefined in non-secure contexts.
**Prevention:** Only use Web Crypto APIs when generating authenticators, secrets, or secure authorization tokens. For UI/game transient IDs, stick to simpler generators like `Date.now() + Math.random()` or specific libraries. Focus on real security threats like DoS via unconstrained inputs (fixed in this session via truncations).
## 2025-02-14 - Type Number Input DoS Risk
**Vulnerability:** Unconstrained length on `<input type="number">` fields across the application.
**Learning:** Browsers often ignore the native `maxLength` attribute on `type="number"` inputs. This can lead to users (or scripts) pasting massively long numeric strings, which are then parsed by React/JavaScript, potentially causing performance issues or Application-Level Denial of Service (DoS) due to CPU spikes during parsing or state updates.
**Prevention:** Always explicitly enforce length limits for numeric inputs in the `onChange` handler using string manipulation (e.g., `e.target.value.slice(0, MAX_LENGTH)`) before passing the value to `setState` or `Number()`.
## 2024-05-18 - LocalStorage Quota Exhaustion (DoS) Vulnerability
**Vulnerability:** Unbounded array of user profiles saved in LocalStorage could lead to quota exhaustion, crashing the application (DoS).
**Learning:** LocalStorage has strict storage limits per domain (typically 5MB). Without hard caps on array sizes, users could create unlimited profiles, eventually exhausting this limit and causing the `setItem` call to throw a quota exceeded exception, potentially bricking the application if unhandled.
**Prevention:** Always enforce a hard limit on the number of items stored in LocalStorage arrays (e.g., maximum 10 profiles) and wrap `setItem` calls or persistence-triggering actions in `try...catch` blocks to gracefully handle potential limits.
