# AGENTS.md — Hebrew Math Adventures

**Read this FIRST. This governs all work in this repo, for every agent (AmosBot, Claude, Jules, agy, etc.).**

## 🗂 The vault is the single source of truth
- Load **`vault/.vault-loader.md`**, then **`vault/INDEX.md`** and **ALL `vault/rules/*.md`** into context before starting any task.
- If a vault rule conflicts with code → **the vault wins**, fix the code.
- CRITICAL: `vault/rules/rtl-hebrew.md` — breaking RTL/Hebrew compliance is a release blocker.
- Source-of-truth hierarchy: **vault → code → docs/plans/**.

## 🔁 Mandatory vault update loop (do this EVERY task)
You are the update mechanism. After finishing any significant task, decision, approval, or plan:

1. **Decision/approval made?** → create a dated ADR in `vault/decisions/YYYY-MM-<slug>.md` (copy the frontmatter template from an existing ADR).
2. **Rule changed?** → update the relevant `vault/rules/*.md` + note it in the ADR.
3. **Work landed / PR merged?** → refresh `vault/roadmap/current-work.md` and `vault/roadmap/backlog.md`.
4. **New feature/domain concept?** → add a note in `vault/domain/` or `vault/architecture/`, link it from `vault/INDEX.md`.
5. **Fixed a known issue?** → update `vault/roadmap/known-issues.md`.
6. Commit vault changes **with** the code change (same PR/commit if possible). Never leave the vault out of date relative to the code.

## ⚙️ Engineering standards (summary — full details in vault/rules/)
- React 19 (no `forwardRef`), Vite 7 (Rolldown, ESM-only), Tailwind v4 (CSS-first, no config file), Framer Motion 12.
- RTL/Hebrew compliance is CRITICAL (logical props, `<div dir="ltr">` for equations, t() selector for i18n).
- `cn()` from `@/lib/utils` for classes. `lucide-react` for icons.
- Always run `npm run lint` + `tsc -b`; build must pass. Browser-verify at 375/768/1440.
- Math generation: Bag Deck randomization (never pure Math.random), repetition guard (last 3 questions), curriculum level constraints in `vault/rules/math-curriculum.md`.
- Game flow: 2-step Pause→Quit exit; Restart resets score/streak/history/bag.

## 🚦 When in doubt
- If a rule here conflicts with anything, the **vault wins** — update code to match, don't edit the vault to excuse the code.
- Keep `vault/INDEX.md` and `vault/roadmap/current-work.md` current — if those are fresh, the project isn't side-tracking.
