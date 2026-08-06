---
type: moc
purpose: "Map of Content — single entry point to the whole project"
project: hebrew-math-adventures
updated: 2026-08-03
tags: [index, moc]
---

# 🗺 INDEX — Hebrew Math Adventures

Everything about this project, one place. **Start here.**

## ⚙️ Project at a glance
- **Project:** [[projects/hebrew-math-adventures]]
- **Repo:** `github.com/Raamses/hebrew-math-adventures` (local: `~/.openclaw/workspace/hebrew-math-adventures`)
- **Live demo:** https://hebrew-math-adventures-2025.web.app
- **Stack:** React 19 + TS + Vite 7 (Rolldown) + Tailwind v4 + Framer Motion 12 + Firebase
- **Audience:** Israeli kids, ages 5–11, grades 1–6
- **Current branch:** `sdlc/loop-v0`
- **Owner:** Ram

## ⚖️ Rules (non-negotiable — I load these at startup)
- [[rules/rtl-hebrew]] — RTL & Hebrew compliance (CRITICAL)
- [[rules/tech-stack]] — React 19 / Vite 7 / Tailwind v4 / Framer Motion
- [[rules/styling-motion]] — Tailwind v4 + animation standards
- [[rules/architecture]] — directory, typing, i18n, component patterns
- [[rules/math-curriculum]] — level math standards & generation rules
- [[rules/game-flow]] — game flow control & restart logic
- [[rules/quality-gates]] — verification, lint, build, testing gates

## 🏛 Architecture
- [[architecture/system-overview]] — data flow, director-module pattern
- [[architecture/feature-inventory]] — every feature, status, location
- [[architecture/component-map]] — source tree & responsibilities

## 🧭 Decisions (ADRs — dated)
- [[decisions/2026-07-spawn-overhaul]] — bubble spawn engine rework (P0+P1)
- [[decisions/2026-08-dynamic-star-tiers]] — dynamic star rewards by performance tier
- [[decisions/2026-08-zen-answer-race]] — zen answer race + anti-repeat fix
- *(add new decisions here as they're made)*

## 📚 Domain / Curriculum
- [[domain/curriculum-levels]] — level-by-level math standards (ages 5–11)
- [[domain/math-generation]] — Bag Deck algorithm, 3-digit rules, repetition guard
- [[domain/bubble-spawn-design]] — playability design intent (anti-stale-gameplay)

## 🗺 Roadmap & Backlog
- [[roadmap/current-work]] — what's in flight right now
- [[roadmap/backlog]] — technical debt & future work
- [[roadmap/known-issues]] — open problems (e.g. bubble spawn playability)

## 📄 References (source docs in repo)
- `docs/plans/PRODUCT_OVERVIEW.md` — the canonical feature/architecture audit
- `docs/plans/roadmap.md`, `docs/plans/backlog.md`
- `ANTIGRAVITY_RULES.md`, `.agent/rules/*.md`
- `SPAWN_OVERHAUL_PLAN.md`, `CHALLENGE_CLUTTER_PLAN.md`

## 🧭 Conventions
- Every significant decision → dated note in [[decisions/]]
- Every rule → note in [[rules/]] with frontmatter
- If a rule conflicts with code → **vault wins**, fix the code
