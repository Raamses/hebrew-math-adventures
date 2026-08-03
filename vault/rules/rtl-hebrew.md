---
type: rule
rule_id: rtl-hebrew
severity: critical
applies_to: [hebrew-math-adventures]
trigger: always_on
category: compliance
tags: [rtl, hebrew, i18n]
---

# RTL & Hebrew Compliance (CRITICAL)

## Root direction
- `<html dir="rtl" lang="he">`

## CSS
- ALWAYS use **Logical Properties** (`ms-`, `me-`, `ps-`, `pe-`). NEVER use `left` or `right` for layout.

## Math exception
- All equations (e.g. `5 + 2 = 7`) MUST be wrapped in:
  ```html
  <div dir="ltr" className="unicode-bidi-isolate font-rubik">
  ```
  This prevents numbers from visually flipping order.

## Verification
- QA must visually verify the "Back" button is on the **Right** and "Next" is on the **Left**.

## i18n
- Use `react-i18next` selector API `t($=>$.key)` for end-to-end type safety. No hardcoded strings.
- Full Hebrew (RTL primary) + English (LTR secondary) via `i18next`.
- Switch document direction dynamically (`dir="rtl"`).

> **This is the #1 rule.** Breaking RTL/Hebrew compliance is a release blocker.
