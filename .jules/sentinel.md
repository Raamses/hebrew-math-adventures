## 2025-02-14 - Crypto API in Non-Secure Contexts
**Vulnerability:** Unnecessary use of `crypto.randomUUID()` to replace `Math.random()` in transient game logic.
**Learning:** Adding Web Crypto APIs for non-sensitive ID generation (like visual bubble IDs in a game) provides no real security benefit ("security theater") and causes immediate runtime crashes when testing on local networks (HTTP instead of HTTPS), as `crypto.randomUUID()` is undefined in non-secure contexts.
**Prevention:** Only use Web Crypto APIs when generating authenticators, secrets, or secure authorization tokens. For UI/game transient IDs, stick to simpler generators like `Date.now() + Math.random()` or specific libraries. Focus on real security threats like DoS via unconstrained inputs (fixed in this session via truncations).

## 2024-05-24 - DoS Risk in Numeric Inputs
**Vulnerability:** Input fields using `type="number"` (like `NumberInput`) did not restrict input length natively (as browsers often ignore `maxLength` for number types), potentially leading to Denial of Service (DoS) when excessively long strings were repeatedly parsed or re-rendered by React.
**Learning:** Native `maxLength` attributes are unreliable for `type="number"` inputs across different browsers.
**Prevention:** Enforce length restrictions programmatically in controlled component handlers (e.g., `onChange={(e) => onChange(e.target.value.substring(0, 10))}`) to ensure input size constraints are always respected.
## 2025-02-14 - Type Number Input DoS Risk
**Vulnerability:** Unconstrained length on `<input type="number">` fields across the application.
**Learning:** Browsers often ignore the native `maxLength` attribute on `type="number"` inputs. This can lead to users (or scripts) pasting massively long numeric strings, which are then parsed by React/JavaScript, potentially causing performance issues or Application-Level Denial of Service (DoS) due to CPU spikes during parsing or state updates.
**Prevention:** Always explicitly enforce length limits for numeric inputs in the `onChange` handler using string manipulation (e.g., `e.target.value.slice(0, MAX_LENGTH)`) before passing the value to `setState` or `Number()`.
