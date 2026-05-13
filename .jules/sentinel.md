## 2024-05-18 - parseInt Radix Safety
**Vulnerability:** Use of `parseInt` without an explicitly specified radix (e.g., `parseInt(answer)`).
**Learning:** While modern engines default to decimal, omitting the radix can lead to unexpected parsing results, especially if strings start with '0', risking logic flaws in components like `ParentGate`.
**Prevention:** Always explicitly define a radix when using `parseInt`, typically 10 (e.g., `parseInt(answer, 10)`), to ensure deterministic behavior across all environments.
## 2025-05-09 - Math.random() usage in authorization context
**Vulnerability:** The application used `Math.random()` to generate the math problem challenges for the `ParentGate` component which gates the `ParentDashboard`. Furthermore, there was no brute-force prevention mechanism (the problem remained the same on incorrect answers), and no input limits.
**Learning:** While `Math.random()` is fine for simple animations, using it to generate an authorization gate (like checking if the user is a parent) poses a minor security risk due to its predictability. Also, static challenges allow for simple script-based brute forcing.
**Prevention:** Always use `crypto.getRandomValues` (or other cryptographically secure pseudo-random number generators) for any form of authorization, token generation, or security challenge. Additionally, always regenerate challenges upon failure to thwart brute-forcing, and limit input lengths.

## 2025-05-10 - Unsafe integer parsing
**Vulnerability:** The application parsed inputs from numeric inputs without explicitly providing the radix. This can cause problems with certain unexpected string payloads being parsed with incorrect base.
**Learning:** While most modern engines default to base-10, always passing radix=10 removes unexpected evaluation edge cases.
**Prevention:** Make sure `parseInt` is explicitly provided radix=10 where a string input is being evaluated into an integer.
