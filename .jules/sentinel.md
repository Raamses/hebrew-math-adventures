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
## 2024-05-24 - Reverse Tabnabbing Vulnerability
**Vulnerability:** Reverse tabnabbing vulnerability in `window.open` calls (`Sudoku.tsx`, `NumberMerge.tsx`, `EquationOfTheDay.tsx`).
**Learning:** Using `window.open(url, '_blank')` without explicitly setting `noopener,noreferrer` as the features string allows the newly opened external tab to retain a reference to the `window.opener` object. A malicious external site can use this reference to redirect the original application page (the opener) to a phishing site, bypassing cross-origin restrictions.
**Prevention:** Always pass `'noopener,noreferrer'` as the features argument when calling `window.open(url, '_blank')` to break the connection between the original window and the newly opened external window.
