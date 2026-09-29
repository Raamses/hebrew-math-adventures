## 2024-05-18 - Weak Cryptography in Profile ID Generation
**Vulnerability:** Weak PRNG (`Math.random()`) used as fallback for sensitive user profile ID generation in `ProfileContext`.
**Learning:** Even as a fallback, `Math.random()` lacks sufficient entropy and predictability protection for sensitive identifiers like user IDs, making them susceptible to collision or guessing. The codebase already had a standard secure generator utility `RandomUtils.generateId()`.
**Prevention:** Use standard utility `RandomUtils.generateId()` which handles fallbacks securely, avoiding ad-hoc inline PRNG generation for sensitive identifiers.
## 2024-05-18 - Predictable PRNG in Auth Gate
**Vulnerability:** Ad-hoc inline PRNG (`Math.random()`) used for authentication gate challenges (`ParentGate.tsx`).
**Learning:** Using predictable weak PRNGs for authentication or gating mechanisms can make the challenges trivial to bypass. Standardized utility functions should always be used for cryptography to prevent fragmented security logic.
**Prevention:** Use standard utility `RandomUtils.secureIntInRange()` which handles fallbacks securely, avoiding ad-hoc inline PRNG generation for sensitive gating logic.
