---
type: project-update
project: log-analyzer
date: 2026-08-25
status: phase6-implementation
tags: [log-analyzer, phase6, columnar, implementation]
---

# Phase 6 Implementation — Progress

**Branch:** `feat/phase6-columnstore`
**Plan:** `docs/plans/phase-6-columnar-storage.md`
**PR:** https://github.com/Raamses/log_analyzer_electron_prompt/pull/new/feat/phase6-columnstore

## Status: 4/5 PRs committed and pushed

### PR 1 — ColumnStore foundation
- Chunked columnar storage (64k-row blocks, no realloc-copy)
- Type-aware stores: Int32/Float64/Dict(Uint16)/String
- DTO serialization for zero-copy postMessage transfer
- 21 tests

### PR 2 — Columnar filter engine + adapter bridge
- Recursive bitset filter with NULL-safe NOT via NNF/De Morgan
- 3VL bug fixed: NOT (FALSE AND UNKNOWN) = TRUE
- Boolean precedence tested across shared columns
- ColumnarDataset adapter (additive — existing call sites unchanged)
- 29 new tests

### PR 3 — Query serializer + inferRole + gzip
- serializeQuery: AST → text, enables real filter-chip removal
- Value-sampled inferRole: name-based first, then sample scoring
- Gzip: DecompressionStream with test-injectable fallback
- bzip2: Bzip2UnsupportedError with clear user message
- 16 new tests

### PR 4 — Production hardening
- Multi-chunk delimiter bug fixed (preserve across chunks)
- Worker error recovery (per-line try/catch + skipped counter)
- LogAnalyzer mounted in App.tsx with toggle
- Real clause removal via AST walk + serializeQuery
- compileQuery stub marked for deletion
- entry-to-dataset adapter for LogEntry[] → Dataset

### PR 5 — Strip hotel app + fix build + CI green
- Removed hotel-specific app (useLogAnalysis, DashboardLayout, FileUploader,
  SummaryCard, TrafficSegmentation, VirtualizedLogViewer, charts, ipUtils,
  parser, analytics, logParser.worker, their tests)
- Replaced App.tsx with thin shell using ingest worker + LogAnalyzer
- Added src/lib/ingest.ts wrapper (worker → Dataset)
- Fixed 32 build errors that tsc -b caught (tsc --noEmit had missed them)
- Fixed test script: 'vitest src/test' → 'vitest run'
- CI: dropped Node 18 (Vite 7 requires Node 20.19+), Node 20 green
- Merged into feat-log-analyzer-electron (CI/default branch)

## Total: 195 unit tests passing, lint clean, build passes, CI green

## Key findings during implementation

1. **Benchmark was wrong** (caught by Gemini): the original "1MB columnar"
   number measured heapUsed only, missing ArrayBuffer memory. Real figures:
   96MB (low-card) / 207MB (unique-ids) at 500k×40. Reduction: 5-12×.

2. **AmosBot's DateColumn Int32 suggestion was mathematically broken**:
   Int32 max = 2.1 billion; current epoch ms = 1.787 trillion. Kept Float64.

3. **Gemini's two catches**: 3VL NULL semantics needed NNF (not compound
   masking), and the column-grouping filter design destroyed precedence.

## Remaining work
- Delete `rows` from Dataset after all consumers migrate (additive-then-delete)
- Columnar sort (on codes, off-main-thread above 250k)
- Vectorized analytics (count into arrays indexed by dict code)
- Bundle code-splitting (manualChunks + lazy insight/export)
- Tauri v2 packaging
