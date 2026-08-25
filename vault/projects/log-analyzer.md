---
type: project
name: Log Analyzer
repo: "github.com/Raamses/log_analyzer_electron_prompt"
local_path: "~/log_analyzer_electron_prompt"
status: active
current_branch: feat/generic-log-analyzer
domain: developer-tools
audience: Developers, SRE, data analysts
project: log-analyzer
updated: 2026-08-25
tags: [project, logs, analytics, client-side, vite, react19, typescript, tailwindv4]
stack:
  - React 19
  - TypeScript (strict, no any)
  - Vite 7
  - Tailwind CSS v4
  - Vitest (happy-dom)
owners: [ram]
---

# Log Analyzer — Project Spec

A 100% client-side SPA that ingests structured logs of many formats and gives you
a query-first table with role-driven insights. Nothing leaves the browser.

**Not** an Electron app despite the repo name. Tauri v2 is the eventual desktop
path; the current deliverable is a browser SPA.

## What it does
- **Dialect framing**: W3C, TSV, CSV (RFC4180), JSON-lines, Apache CLF, key-value. Encoding detection (BOM, UTF-16, UTF-8).
- **Semantic roles**: `timestamp`, `status`, `latency_ms`, `client_ip`, `uri`... Registry-driven format matching.
- **TZ-safe normalization**: no `new Date(ambiguousString)` anywhere.
- **Generic virtualized table**: sort, resize, reorder, hide, pin, detail drawer. Data-driven by `ColumnDef[]`.
- **Query-first UX**: KQL subset parser, filter chips, command palette, saved views.
- **Role-driven insights**: error rate, slow endpoints p95, top talkers, cache health — each with a reproduction query.
- **Export**: CSV / TSV / JSON / NDJSON, with optional PII redaction.

## Architecture: three layers
1. **Dialect → Schema** — framing + encoding detection → semantic role binding
2. **Schema → Dataset** — normalization into typed columns
3. **Dataset → UX** — table, query, insights, export all read `Dataset`

## Known limits (current)
- **<50MB comfortable, ~80MB ceiling** (row-object store, 100MB OOMs a tab)
- Compressed files: detected, not decompressed
- Filter-chip removal clears whole query (stub)
- `role: 'unknown'` for unrecognized formats → no insights
- 705KB JS bundle (no code-splitting)

## Phase 6 goal: columnar storage
Measured at 500k rows × 40 cols: Array<Record> = 1116 MB, columnar (low-card) = 96 MB,
columnar + unique-ids = 207 MB. Reduction: **5-12×** depending on cardinality.

Lifts ceiling from ~50MB to ~1GB (300-500MB comfortable) with chunked allocation,
buffer transfer, recursive bitset filters, and vectorized analytics.

## Success criteria
| Criterion | Status |
|-----------|--------|
| IIS W3C with XFF | ✅ |
| IIS without XFF | ✅ |
| Azure APGW | ✅ |
| Cloudflare | ✅ |
| 100MB+ files | ⚠️ streams, heap-bound |
| Corrupt files | ✅ partial results |
| PII redaction | ✅ |

## Related projects
- **[[projects/hebrew-math-adventures]]** — the main project this agent also works on
