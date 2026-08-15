---
type: project
name: Hebrew Math Adventures
hebrew: "הרפתקאות חשבון"
repo: "github.com/Raamses/hebrew-math-adventures"
local_path: "~/.openclaw/workspace/hebrew-math-adventures"
live_url: "https://hebrew-math-adventures-2025.web.app"
status: active
current_branch: sdlc/loop-v0
domain: education
audience: "Israeli kids ages 5-11 (grades 1-6)"
project: hebrew-math-adventures
updated: 2026-08-08
tags: [project, spec, overview]
stack:
  - React 19
  - TypeScript
  - Vite 7 (Rolldown)
  - Tailwind CSS v4
  - Framer Motion 12
  - Firebase (hosting + analytics)
  - i18next v25
owners: [ram]
last_reviewed: 2026-08-03
tags: [project, education, kids, math]
---

# Hebrew Math Adventures — Project Spec

Gamified, mobile-first math learning web app for Israeli children (ages 5–11, grades 1–6). Native Hebrew, full RTL, kid-friendly Rubik typography, culturally aligned age brackets.

## Core value proposition
- **"Smart Fun"**: structured elementary math practice + gaming mechanics (XP, streaks, mascots, story lessons, arcade, bubble-pop sensory).
- **Overcomes math anxiety** via positive reinforcement, non-punitive adaptive difficulty.
- **No mobile input friction**: custom numeric keypads, not system keyboards.
- **Offline-first**, no cloud login/subscription required.

## Game modes
| Mode | Component | Gameplay |
|---|---|---|
| PRACTICE | `PracticeMode` | Core loop: ~10 problems, XP + stars |
| SENSORY | `BubbleGame` | Bubble-pop mini-game, no typing |
| LESSON | `LessonModal` | Interactive story tutorial |
| CHALLENGE | arcade modes | Time attack, survival, frenzy |

## Key systems
- **Adaptive engine** (`MathModule`, `ProblemFactory`, `GameDirector`): tunes difficulty via `attempts`/`consecutiveCorrect`/`consecutiveFailures`. Rescue multiplier 0.8x, challenge 1.2x.
- **Bubble spawn engine** (`src/engines/bubble/`): rAF loop, shuffled-bag spawning, frenzy at ≥5 combo. ⚠️ Playability concerns — see [[domain/bubble-spawn-design]].
- **Mascots**: Owl, Bear, Ant, Lion — emotion states idle/happy/thinking/excited/encourage.
- **Profiles**: up to 10 per device, localStorage persistence.
- **Parent gate**: math challenge protects parent controls.

## Source of truth hierarchy
1. This vault (`vault/`) — decisions, rules, domain logic.
2. Code in git — implementation.
3. `docs/plans/` — historical audits & plans (superseded by vault going forward).

> If a rule here conflicts with code, **the vault wins** — fix the code.
