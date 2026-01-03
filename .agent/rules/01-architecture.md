---
trigger: always_on
---

# Rule: Architecture & React 19 Standards

## Core Principles
- **React 19 First:** Use the new `ref` prop directly on components; avoid `forwardRef`. 
- **Server/Client Boundary:** Clearly mark `'use client'` at the top of files that use hooks or browser APIs.
- **Type Safety:** Use TypeScript `interface` for props and `type` for unions/internal logic. Prefer `readonly` for array props.

## Component Patterns
- **Utility usage:** Always use the `cn()` utility from `@/lib/utils` for all `className` logic.
- **Hooks:** Prefer `useActionState` and `useFormStatus` for form handling where applicable (React 19).
- **i18n:** Use the `useTranslation` hook and the selector pattern `t($=>$.key)` for type safety.