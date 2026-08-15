---
type: vault-root
purpose: "Single source of truth for Hebrew Math Adventures"
created: 2026-08-03
owner: ram
source-of-truth: true
project: hebrew-math-adventures
updated: 2026-08-08
tags: [vault, index, home]
---

# Hebrew Math Adventures — Knowledge Vault 🦉

This vault is the **single source of truth** for the Hebrew Math Adventures project. It governs how development happens, captures business logic and rules in machine-readable form, and records decisions. Code lives in git; this vault explains *why* and *how*.

> **Rule of thumb:** If it's not in this vault, it's not a settled decision. If a rule here conflicts with code, the vault is the authority — fix the code, not the note.

## Quick navigation

| Area | Folder | What lives here |
|---|---|---|
| 🗺 Index | [[INDEX]] | Everything, one place. Start here. |
| 📋 Project spec | [[projects/hebrew-math-adventures]] | The project itself, single frontmatter source |
| ⚖️ Rules | [[rules/]] | Non-negotiable engineering rules (frontmatter-encoded) |
| 🏛 Architecture | [[architecture/]] | System design, data flow, component map |
| 🧭 Decisions | [[decisions/]] | Dated ADRs — what we chose and why |
| 📚 Domain | [[domain/]] | Curriculum, pedagogy, math generation logic |
| 🗺 Roadmap | [[roadmap/]] | Plans, backlog, current work |

## How to use this vault

1. **I (AmosBot) load `rules/` + `INDEX.md` at startup** and follow them on every task.
2. **Ram edits notes in Obsidian** (on laptop, synced via git to the Pi).
3. **Every significant decision** gets a dated note in `decisions/`.
4. **Every rule** is a note with frontmatter so it's queryable, not just prose.
