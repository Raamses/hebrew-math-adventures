## 2024-08-06 - Conditional Rendering of Inactive Views
**Learning:** Rendering components that internally return `null` (e.g. `if (type !== 'expected') return null;`) still incurs React reconciliation overhead for function execution and prop comparisons on every parent render (e.g., during rapid user input).
**Action:** Use conditional rendering (`&&`) in the parent component to entirely prevent the mounting/evaluation of inactive child views.
