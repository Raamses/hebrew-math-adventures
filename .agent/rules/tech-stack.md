---
trigger: always_on
---

# Project Tech Stack & Standards (2026 Edition)

## 🏗 Core Frameworks & Runtime
- **React 19 (Stable):** Mandatory use of React 19 patterns. 
    - **Refs:** Pass `ref` as a standard prop; `forwardRef` is deprecated/legacy.
    - **Data:** Prefer `use(Promise)` for unwrapping data in the component body.
    - **Forms:** Use `useActionState` and `useFormStatus` for all form-related logic.
- **Vite 7 (Rolldown):** The project uses the Rolldown-based build engine. 
    - **Compatibility:** Strictly vet plugins for Rolldown compatibility.
    - **Performance:** Maintain a "zero-unnecessary-dependency" policy to keep build times under 500ms.
- **Tailwind CSS v4:** CSS-First configuration. 
    - **No Config:** `tailwind.config.js` is forbidden.
    - **Theming:** All theme extensions (colors, fonts, spacing) must be defined via `@theme` in `src/index.css`.

## 🎨 Styling & Animation Standards
- **Lucide React:** Standard icon set. Always import icons as individual components.
- **Framer Motion 12:** - **Transitions:** Use `layout` and `layoutId` for shared element transitions.
    - **Mounting:** Every conditional component must be wrapped in `<AnimatePresence />`.
    - **Hardware Acceleration:** Prioritize `transform` and `opacity` properties.
- **Class Orchestration:** Exclusively use the `cn()` utility from `@/lib/utils`. 

## 🌐 Internationalization (i18next v25)
- **Type Safety:** Use the selector pattern `t($=>$.key)` exclusively. Do not use string keys (e.g., `t('common.save')`) to ensure end-to-end type safety and refactoring support.
- **Hooks:** Use `useTranslation` for all client-side string rendering.

## 🛠 Class Name Orchestration & Utility
- **Pattern:** Use the `cn()` utility to resolve Tailwind v4 conflicts: `cn('base-classes', condition && 'conditional-classes', className)`.
- **Constraint:** Template literals for class names are forbidden if they involve conditional logic; use the `cn` arguments instead.

## 📦 Deployment & Backend
- **Firebase:** The primary deployment target.
- **Standards:** All cloud logic must be compatible with Firebase Functions (V2) and Firebase Hosting.