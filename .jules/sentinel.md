## 2025-02-14 - Crypto API in Non-Secure Contexts
**Vulnerability:** Unnecessary use of `crypto.randomUUID()` to replace `Math.random()` in transient game logic.
**Learning:** Adding Web Crypto APIs for non-sensitive ID generation (like visual bubble IDs in a game) provides no real security benefit ("security theater") and causes immediate runtime crashes when testing on local networks (HTTP instead of HTTPS), as `crypto.randomUUID()` is undefined in non-secure contexts.
**Prevention:** Only use Web Crypto APIs when generating authenticators, secrets, or secure authorization tokens. For UI/game transient IDs, stick to simpler generators like `Date.now() + Math.random()` or specific libraries. Focus on real security threats like DoS via unconstrained inputs (fixed in this session via truncations).
## 2025-02-14 - Type Number Input DoS Risk
**Vulnerability:** Unconstrained length on `<input type="number">` fields across the application.
**Learning:** Browsers often ignore the native `maxLength` attribute on `type="number"` inputs. This can lead to users (or scripts) pasting massively long numeric strings, which are then parsed by React/JavaScript, potentially causing performance issues or Application-Level Denial of Service (DoS) due to CPU spikes during parsing or state updates.
**Prevention:** Always explicitly enforce length limits for numeric inputs in the `onChange` handler using string manipulation (e.g., `e.target.value.slice(0, MAX_LENGTH)`) before passing the value to `setState` or `Number()`.

## 2025-02-14 - LocalStorage Quota Exhaustion (DoS)
**Vulnerability:** Unbounded profile creation storing data in `localStorage`.
**Learning:** If a creation function that persists to `localStorage` doesn't enforce a hard limit, malicious scripts or uncontrolled loops can easily add an excessive number of records, exhausting the `localStorage` quota (typically 5MB). This can crash the app or cause a Denial of Service (DoS) when the app subsequently attempts to parse or stringify the massive bloated structure on boot.
**Prevention:** Always enforce a sane upper limit/quota on the number of items or size of data persisted to `localStorage` or other client-side storage mechanisms.
