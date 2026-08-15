---
type: rule
rule_id: quality-gates
severity: must
applies_to: [hebrew-math-adventures]
trigger: always_on
category: quality
project: hebrew-math-adventures
updated: 2026-08-08
tags: [verification, lint, build, testing, qa]
---

# Verification & Quality Gates

## Required before any change is "done"
- Changes affecting >3 files or core logic → must generate an **Implementation Plan** and pass `/approve-plan` (`[APPROVED]`) before touching source.
- ALWAYS run `npm run lint` and `tsc -b`. If errors persist, the task is NOT complete.
- On UI/CSS change: browser smoke test at 375px / 768px / 1440px, no console errors, verify animations don't drop frames.

## Build & dependency integrity
- After `npm install`, run `npm run build` to confirm Rolldown compatibility.
- Verify no `.env` values leak into `dist` or logs.

## Turbo Mode guardrails
- Auto-execute OK for: `npm install`, `vitest`, `lint`, single-file `refactor`.
- On failure/rejection: immediately `git stash` or `git checkout` to last stable state.

## Reviewer gate
- Reject: `setTimeout` for race conditions, `any` types, `@ts-ignore`, `dangerouslySetInnerHTML`, generic names (`data`, `val`, `temp`), components >200 lines.
- Production Readiness score <8 blocks `/ship`.

## Scripts (package.json)
- `npm run dev` / `build` / `lint` / `preview` / `test` (vitest) / `test:e2e` (playwright) / `test:e2e:report`.
