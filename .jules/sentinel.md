## 2024-05-18 - Weak Cryptography in Profile ID Generation
**Vulnerability:** Weak PRNG (`Math.random()`) used as fallback for sensitive user profile ID generation in `ProfileContext`.
**Learning:** Even as a fallback, `Math.random()` lacks sufficient entropy and predictability protection for sensitive identifiers like user IDs, making them susceptible to collision or guessing. The codebase already had a standard secure generator utility `RandomUtils.generateId()`.
**Prevention:** Use standard utility `RandomUtils.generateId()` which handles fallbacks securely, avoiding ad-hoc inline PRNG generation for sensitive identifiers.
## 2024-05-18 - Predictable PRNG in Auth Gate
**Vulnerability:** Ad-hoc inline PRNG (`Math.random()`) used for authentication gate challenges (`ParentGate.tsx`).
**Learning:** Using predictable weak PRNGs for authentication or gating mechanisms can make the challenges trivial to bypass. Standardized utility functions should always be used for cryptography to prevent fragmented security logic.
**Prevention:** Use standard utility `RandomUtils.secureIntInRange()` which handles fallbacks securely, avoiding ad-hoc inline PRNG generation for sensitive gating logic.
## 2024-05-20 - Insecure PRNG Fallback in UUID Generation
**Vulnerability:** Weak PRNG (`Math.random()`) used as the fallback implementation for generating UUIDs inside `RandomUtils.generateId()` when `crypto.randomUUID()` is unavailable.
**Learning:** Even within utility classes meant to provide secure random values, the fallback implementations must also maintain a baseline level of cryptographic security where possible. `Math.random()` provides insufficient entropy and predictability protection for identifiers.
**Prevention:** Ensure all fallback paths in ID generation utilities utilize `crypto.getRandomValues()` (e.g., via `RandomUtils.secureIntInRange()`) before falling back to `Math.random()`.
## 2024-05-22 - Reverse Tabnabbing Vulnerability
**Vulnerability:** External links opened using `window.open(url, '_blank')` did not include the `'noopener,noreferrer'` features argument.
**Learning:** Opening external links without `noopener` allows the newly opened tab to access the original tab's `window` object via `window.opener`, potentially enabling reverse tabnabbing attacks where the external site navigates the original tab to a malicious page.
**Prevention:** Always pass `'noopener,noreferrer'` as the features argument when using `window.open(url, '_blank')` to prevent the new tab from accessing the `window.opener` object.
