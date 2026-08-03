---
type: rule
rule_id: architecture
severity: must
applies_to: [hebrew-math-adventures]
trigger: always_on
category: architecture
tags: [react19, typescript, structure, i18n]
---

# Architecture & React 19 Standards

## Directory & module structure
- Vite 7 / Rolldown: ESM-only. Absolute imports `@/`.
- Atomic components: extract logic into hooks/sub-components if a file exceeds 200 lines.
- Mark `'use client'` at top of files using hooks/browser APIs.

## React 19 specifics
- NO `forwardRef` — pass `ref` as a standard prop.
- Prefer `use(Promise)` over `useEffect` for unwrapping data/context.
- Forms: `action={formAction}` + `useActionState`, not manual `onSubmit` booleans.

## Type safety
- `interface` for props (merging); `type` for unions/utility types.
- `readonly` on array/object props.
- Context for global config only (theme, auth); Zustand for complex feature-state.

## Component patterns & i18n
- Always `cn()` from `@/lib/utils` — never string-interpolated classNames.
- Icons from `lucide-react` as components.
- i18n: `useTranslation` + selector `t($=>$.key)` (type-safe, no string keys).

## Role separation (agent workflows)
- **Architect**: blueprints, interfaces, no UI/TSX. Authors Implementation Plans; waits for `/approve-plan`.
- **Implementer**: pixel-perfect UI + logic. Auto-lint + tsc. Interrupt only for destructive actions.
- **Tester**: Vitest suites per logic change, browser verification at 375/768/1440, edge cases, perf/CLS audit. Feature not done until `/pre-flight` passes.
- **Reviewer**: firm critique, Before/After snippets, Production Readiness score — <8 blocks `/ship`.
