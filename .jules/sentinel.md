## 2024-05-08 - Add input length limits to prevent storage exhaustion
**Vulnerability:** Missing input validation and length limits on user-provided profile names. This allowed creation of extremely long strings which would be persisted to `localStorage`, potentially leading to storage exhaustion or application crashes when parsing the JSON payload.
**Learning:** LocalStorage has strict quota limits (~5MB). Unbounded inputs persisted directly to it are a vector for local DoS and state corruption.
**Prevention:** Added `maxLength={50}` to all relevant HTML input fields for UX defense, and implemented server/context-side validation in `ProfileContext.tsx` to truncate names and enforce fallback values.
