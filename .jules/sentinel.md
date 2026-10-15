## 2025-02-19 - Replace Math.random with secure RandomUtils in CelebrationTray
**Vulnerability:** Weak PRNG `Math.random` was used to generate an ID in `queueKidCelebration` in `src/components/parent/CelebrationTray.tsx`.
**Learning:** Even for non-critical IDs, using `Math.random` creates a security theater and can be flagged by security scanners. The codebase already had a secure fallback utility `RandomUtils.generateId()` in `src/engines/utils/ProblemUtils.ts`.
**Prevention:** Use `RandomUtils.generateId()` instead of `Math.random` for all ID generation tasks in the future.
