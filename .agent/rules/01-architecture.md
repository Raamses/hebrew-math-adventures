---
trigger: always_on
---

# Rule: Architecture & React 19 Standards

## 🏛 Core Principles & Directory Structure
- **Vite 7 / Rolldown Awareness:** Prioritize ESM-only modules. Avoid CommonJS syntax. Use absolute imports prefixed with `@/` for all internal modules.
- **Atomic Components:** Keep components focused. If a file exceeds 200 lines, extract logic into a custom hook or sub-component.
- **Server/Client Boundary:** Clearly mark `'use client'` at the top of files that use hooks (useState, useEffect) or browser APIs. All components in `@/components/ui` are Client Components by default.

## ⚛️ React 19 Specifics
- **Ref Handling:** Never use `forwardRef`. Pass `ref` as a standard prop to child components.
- **The 'use' Hook:** Prefer the `use(Promise)` pattern over `useEffect` for unwrapping data or context.
- **Form Actions:** Use `action={formAction}` instead of `onSubmit` for forms. Leverage `useActionState` to manage server/client transitions.

## 🛡 Type Safety & Performance
- **TypeScript:** Use `interface` for component props (supports declaration merging). Use `type` for state unions and complex utility types.
- **Prop Immutability:** Always use `readonly` for array and object props to prevent mutation-based re-renders.
- **Zustand vs Context:** Use Context only for global configuration (theme, auth). Use Zustand for complex feature-state to avoid unnecessary re-render chains.

## 🧩 Component Patterns & i18n
- **Styling:** Always use the `cn()` utility from `@/lib/utils`. Never use string interpolation for classNames.
- **Lucide Icons:** All icons must be imported from `lucide-react` as components.
- **i18n (v25):** Use the `useTranslation` hook. Access keys via the selector pattern `t($=>$.key)` to maintain end-to-end type safety.