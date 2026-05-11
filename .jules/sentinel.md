## 2024-05-18 - parseInt Radix Safety
**Vulnerability:** Use of `parseInt` without an explicitly specified radix (e.g., `parseInt(answer)`).
**Learning:** While modern engines default to decimal, omitting the radix can lead to unexpected parsing results, especially if strings start with '0', risking logic flaws in components like `ParentGate`.
**Prevention:** Always explicitly define a radix when using `parseInt`, typically 10 (e.g., `parseInt(answer, 10)`), to ensure deterministic behavior across all environments.
