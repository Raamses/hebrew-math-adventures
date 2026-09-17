## 2024-05-18 - Math.random() in sensitive profile ID creation
**Vulnerability:** ProfileContext.tsx uses `Math.random()` to generate IDs as a fallback, which is predictable.
**Learning:** For sensitive profile/auth IDs, proper cryptography like `crypto.randomUUID()` must be used to prevent ID predictability and potential collision/guessing attacks.
**Prevention:** Always use `crypto.randomUUID()` or centralized secure random generation for sensitive identifiers, rather than ad-hoc `Math.random()` strings.
