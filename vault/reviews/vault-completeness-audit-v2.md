---
type: review
project: hebrew-math-adventures
updated: 2026-08-11
status: complete
reviewer: planner2
scope: "Vault completeness re-audit — verify Aug 9 findings, identify new gaps, check for code drift"
supersedes: reviews/vault-completeness-audit
tags: [review, audit, vault, documentation, consistency, re-audit]
---

# Vault Completeness Audit v2 — Re-verification & New Findings

> **Reviewer:** planner2 (automated audit)
> **Date:** 2026-08-11
> **Scope:** All files in `vault/` vs live `src/` tree + root-level docs + commits since 2026-08-09
> **Previous audit:** [[reviews/vault-completeness-audit]] (2026-08-09, 18 findings)
> **Verdict:** ⚠️ **8 missing docs still uncreated, 5 consistency issues persist, 3 new findings since v1**

---

## Executive Summary

The original audit (v1, 2026-08-09) identified 18 findings across 6 categories. **Zero of the 14 recommended fixes have been implemented.** Additionally, 3 new findings have emerged from code changes between 2026-08-09 and 2026-08-11:

1. `useSoundManager` hook created and all 8 consumers migrated — vault docs (ADR, component-map, backlog) are stale
2. Bubble spawn playability fix (commit `8241f4b`) landed — vault domain doc `bubble-spawn-design.md` not updated
3. Invader equationId tagging fix (commit `5c4d1b1`) — not reflected in any vault doc

**Total findings: 21** (18 carried forward + 3 new)

---

## 1. Missing Domain Docs (STILL MISSING — 8 items)

All 8 missing docs identified in v1 are **still missing**. No new domain docs have been created since the v1 audit.

### MISSING-1: Arcade Modes & Game Variants ❌ STILL MISSING
**Code:** `src/lib/arcadeModes.ts`, `src/hooks/usePracticeSession.ts`, `src/components/games/ModeSelectorOverlay.tsx`, `src/components/games/ArcadeHUD.tsx`
**What's undocumented:**
- The 4 game modes: STANDARD, TIME_ATTACK (60s), SURVIVAL (3 lives), ZEN
- Mode selection UI flow, best-score tracking, combo multipliers
- `ARCADE_CONFIGS` in `worldConfig.ts` mapping to bubble game mode overrides
- `ExtendedArcadeMode` type adding 'memory' and 'invaders'
**Impact:** HIGH — an agent cannot understand the arcade mode system without reading source code.

### MISSING-2: Math Invaders Game ❌ STILL MISSING
**Code:** `src/engines/invader/useInvaderEngine.ts`, `src/engines/invader/types.ts`, `src/components/games/MathInvadersGame.tsx`
**What's undocumented:**
- Full standalone game engine: invader spawning, problem display, lives, scoring
- Session recording, arcade best-score tracking
- Integration with arcade mode selector
- **NEW since v1:** equationId tagging fix (commit `5c4d1b1`) — answer bubbles now tagged with source equationId to prevent stale validation. This fix is undocumented in any vault doc.

### MISSING-3: Memory Duel Game ❌ STILL MISSING
**Code:** `src/engines/memory/MemoryFactory.ts`, `src/hooks/useMemoryGame.ts`, `src/components/games/MemoryDuelGame.tsx`
**What's undocumented:**
- Memory card matching game with math problems on cards
- 6-pair (12 card) layout, matching logic, scoring
- Integration with `useMemoryGame` hook and `MemoryFactory` engine

### MISSING-4: Pet System ❌ STILL MISSING
**Code:** `src/lib/pet.ts`, `src/components/pet/PetScreen.tsx`, `src/components/pet/PetAvatar.tsx`, `src/data/` (pet-related)
**What's undocumented:**
- Pet species selection (owl, cat, dragon, robot)
- Pet stages by level (egg → baby → adult)
- Happiness decay mechanic (daily, floored at 50 — "no dead pets for kids")
- Feeding cost (2 gems), pet renaming
- `PET_STAGES` config in `worldConfig.ts`

### MISSING-5: Shop & Badge System ❌ STILL MISSING
**Code:** `src/components/shop/TreasureShop.tsx`, `src/data/shopItems.ts`, `src/components/badges/BadgeCollection.tsx`, `src/components/badges/BadgePopup.tsx`, `src/data/badges.ts`
**What's undocumented:**
- Shop economy: coins, categories (mascot, bubble_skin, particle_effect), buy/equip flow
- 11 shop items with prices and categories
- Badge system: `BadgeStats` interface, 6+ badge definitions with check functions
- Badge unlock criteria and progress display

### MISSING-6: Cinematic & Mascot Dialogue System ❌ STILL MISSING
**Code:** `src/components/cinematic/UnitCompleteCinematic.tsx`, `src/data/mascotDialogue.ts`, `src/components/mascot/` (all files)
**What's undocumented:**
- Unit completion cinematic: 4-phase animation (charge → shatter → converge → reveal)
- Boss emojis per unit, mascot emoji mapping
- `cinematic_seen_units` localStorage tracking (one-time view per unit)
- Mascot dialogue system: triggers (greeting, streak, welcome_back), per-mascot lines, emotion states

### MISSING-ARCH-1: i18n / Localization Architecture ❌ STILL MISSING
**Code:** `src/i18n.ts`, `src/i18n/locales/en.json` (681 lines), `src/i18n/locales/he.json` (681 lines), `src/i18n/TRANSLATION_AUDIT.md`
**What's undocumented:**
- i18next setup, language detection, localStorage caching
- Translation audit results (structural parity confirmed)
- 681 translation keys per language
> `rules/rtl-hebrew.md` covers RTL compliance rules, but the i18n *architecture* is not in the vault.

### MISSING-ARCH-2: Boss Gate System ❌ STILL MISSING
**Code:** `src/lib/bossGate.ts`
**What's undocumented:**
- 3 boss gate types: `rapid_fire`, `missing_operand`, `reverse_chain`
- Boss levels at 3, 6, 9
- `generateBossGate` function and `BOSS_GATE_PROBLEM_COUNT` config

---

## 2. New Findings Since v1 (3 items)

### NEW-1: `useSoundManager` supersedes `useSound` — vault docs stale
**Commits:** `841ebf5` (create hook), `424f8a6` (migrate 8 consumers), `424f8a6` (refactor)
**What changed:**
- New hook `src/hooks/useSoundManager.ts` created, merging `useSound` + `useMusicalSound` into a single unified hook
- Single module-level AudioContext singleton (no duplicate contexts)
- Semantic event API: `playCorrect`, `playWrong`, `playLevelUp`, `playGameOver`, `playClick`, `playStreak`, `playFrenzy`, `playMilestone`
- All 8 consumers (PracticeMode, BubbleGameContainer, MathInvadersGame, MemoryDuelGame, BubbleGame, FrenzyOverlay, UnitCompleteCinematic, PracticeHeader) migrated to `useSoundManager`
- 199 new tests in `useSoundManager.test.ts`
- `useSound.ts` and `useMusicalSound.ts` still exist as files but are no longer imported by any component

**Vault staleness:**
- `vault/decisions/2026-08-centralize-sound.md` — documents `useSound` as the central hook; does NOT mention `useSoundManager`. The ADR's decision text says "Centralize sound handling in `useSound`" — this is now outdated.
- `vault/architecture/component-map.md` — lists `useSound.ts` as "Semantic sound API (centralized)" and `useMusicalSound.ts` as "Web Audio synth". Neither mentions `useSoundManager.ts`.
- `vault/roadmap/backlog.md` — says "Raw `soundGarden` ternaries remain in `BubbleGameContainer`/`MathInvadersGame`/`MemoryDuelGame` — migrate to semantic `useSound` API." This is now **resolved** by the `useSoundManager` migration but the backlog still shows it as open.
- `vault/roadmap/known-issues.md` — says "Sound calls in `BubbleGameContainer`/`MathInvadersGame`/`MemoryDuelGame` — raw `soundGarden` ternaries remain." This is now **resolved**.

**Fix needed:**
1. Add a new ADR: `decisions/2026-08-useSoundManager-unification.md` documenting the `useSoundManager` creation and consumer migration
2. Update `architecture/component-map.md` to list `useSoundManager.ts` as the primary sound hook
3. Update `roadmap/backlog.md` to mark the sound handling follow-up as ✅ done
4. Update `roadmap/known-issues.md` to mark the sound ternaries issue as ✅ resolved

### NEW-2: Bubble spawn playability fix (commit `8241f4b`) — domain doc not updated
**Commit:** `8241f4b` (2026-08-11)
**What changed:**
- B1: Adaptive difficulty now reaches `configRef` in `useGameEngine` (was broken — adaptive config wasn't being passed through)
- B2: `validateAgainst` and `getTargetValue` added to `IGameBehavior` interface (no more duck-typing)
- M1: Initial bubble burst — `spawnCredits` seeded to 3 on first rAF callback (screen fills in 1-2 frames instead of 4-8s of empty screen)
- M2: SSR guard for `window.innerWidth` in `computeLaneCount`
- M3: Distractor TTL aligned to plan spec — 22s (was 25s, undocumented deviation)
- m4: Bag refill now uses `effectiveConfig.distractorRatio` instead of base config
- 10 new unit tests (815 total)

**Vault staleness:**
- `vault/domain/bubble-spawn-design.md` — still says "status: active-concern" and "⚠️ Watch item: whether playability feels good in real kid playtesting." The 6 fixes above are significant improvements that should be documented. The status should be updated to reflect these fixes landed.
- `vault/decisions/2026-07-spawn-overhaul.md` — documents the original P0 overhaul but does NOT mention the B1/M1-M4 follow-up fixes. These are significant enough to warrant either an ADR update or a new ADR.

**Fix needed:** Update `domain/bubble-spawn-design.md` with the 6 fixes, and either update the spawn-overhaul ADR or create a new one for the playability fix round.

### NEW-3: Sound review findings not tracked in vault
**Source:** `docs/reviews/REVIEW-SOUND-RECHECK.md` (2026-08-11)
**What changed:** A devil's-advocate re-check of the sound centralization found 2 persisting blockers and 4 major issues:
- B1: No `AudioContext.resume()` — sounds silent after page load
- B2: `vibrate()` gated by `isMuted` — silent behavior change
- 4 major issues (persisting from prior review)

**Vault staleness:** These review findings are in `docs/reviews/` but NOT referenced or tracked in `vault/roadmap/known-issues.md`. An agent working from the vault would not know about these blockers.

**Fix needed:** Add the 2 sound blockers to `roadmap/known-issues.md` and add a review link in `vault/reviews/`.

---

## 3. Carried-Forward Findings from v1 (all still open)

### 3.1 Broken Cross-References (3 items — all still open)

#### BROKEN-1: `handoff-zen-bug.md` referenced but does not exist ❌ STILL BROKEN
**Files:** `vault/roadmap/known-issues.md`, `vault/roadmap/backlog.md`, `vault/roadmap/current-work.md`, `vault/decisions/2026-08-zen-answer-race.md`
**Issue:** 4 vault files reference `handoff-zen-bug.md` — this file does not exist anywhere in the repo or vault.
**Fix:** Create the file or remove all references.

#### BROKEN-2: `.agent/rules/*.md` glob reference in INDEX.md ⚠️ STILL AMBIGUOUS
**File:** `vault/INDEX.md`
**Issue:** References `.agent/rules/*.md` as a glob — the directory exists with 9 rule files, but no specific file is linked.
**Fix:** List specific files or clarify as directory reference.

#### BROKEN-3: Section-only wikilinks ⚠️ STILL PRESENT
**Files:** Multiple vault files use `[[rules/]]`, `[[domain/]]`, `[[decisions/]]`, `[[roadmap/]]` as section references.
**Issue:** These are not valid Obsidian wikilinks (no target file).
**Fix:** Replace with `[[INDEX]]` anchors or remove trailing slashes.

### 3.2 Consistency Issues (5 items — all still open)

#### CONSIST-1: Feature Inventory stale — Legacy Zone Map ❌ STILL STALE
**File:** `vault/architecture/feature-inventory.md`
**Issue:** Still says Legacy Zone Map is `⚠️` ("WorldMap.tsx exists but unlinked"). Backlog says `✅ resolved`.
**Fix:** Update feature-inventory to mark as `✅ resolved` (dead code, scheduled for removal).

#### CONSIST-2: Project spec has duplicate `tags` frontmatter ❌ STILL BROKEN
**File:** `vault/projects/hebrew-math-adventures.md`
**Issue:** Frontmatter has TWO `tags:` lines (lines 17 and 21). YAML parsers silently drop the first.
**Fix:** Merge into single `tags:` line.

#### CONSIST-3: Missing `status` field on 4 vault files ❌ STILL MISSING
**Files:** `domain/curriculum-levels.md`, `domain/math-generation.md`, `roadmap/backlog.md`, `roadmap/known-issues.md`
**Issue:** Other domain and roadmap files have `status` — these 4 don't, creating inconsistent frontmatter schema.
**Fix:** Add `status: active` to each.

#### CONSIST-4: 12 vault files have stale `updated` dates ⚠️ WORSENED
**Issue:** Now 14+ vault files have `updated` dates before 2026-08-11. Several are genuinely stale:
- `architecture/feature-inventory.md` (2026-08-03) — needs Legacy Zone update + new sound hook
- `domain/curriculum-levels.md` (2026-08-03) — no update despite world-config consolidation
- `domain/bubble-spawn-design.md` (2026-08-03) — needs playability fix documentation
- `.vault-loader.md` (2026-08-03) — may need update
- `decisions/2026-08-centralize-sound.md` (2026-08-06) — needs `useSoundManager` update or new ADR
> ADRs should NOT have dates bumped — they're historical records. The staleness concern is for domain/architecture/roadmap docs.

#### CONSIST-5: 7 root-level .md files unreferenced in INDEX ❌ STILL MISSING
**Files:** `AGENTS.md`, `CLAUDE_BRIEF.md`, `COUNSEL_FRENZY.md`, `COUNSEL_FRENZY_GEMINI.md`, `DESIGN_REVIEW_PRACTICEMODE.md`, `IMPLEMENTATION_PLAN_zen.md`, `README.md`
**Issue:** INDEX.md references some root docs but not these 7.
**Fix:** Add a "Root-level docs" section to INDEX.md.

### 3.3 Code-vs-Vault Discrepancies (2 items — all still open)

#### CODE-1: GameOrchestrator LESSON dead code ❌ STILL UNTRACKED
**File:** `src/components/GameOrchestrator.tsx`
**Issue:** LESSON code path is unreachable dead code (documented in e2e review but NOT in `roadmap/known-issues.md`).
**Fix:** Add to `known-issues.md`.

#### CODE-2: SENSORY/arcade game-over has no SessionSummary ❌ STILL UNTRACKED
**File:** `src/components/games/BubbleGameContainer.tsx`, `src/components/GameOrchestrator.tsx`
**Issue:** Only PracticeMode renders SessionSummary. Arcade modes exit directly to saga map.
**Fix:** Add to `known-issues.md` or resolve the design decision.

---

## 4. Updated Summary Scorecard

| Area | v1 Count | v2 Count | Change | Severity |
|---|---|---|---|---|
| Missing domain docs | 6 | 6 | 0 | HIGH — agents lack context for entire feature areas |
| Missing architecture docs | 2 | 2 | 0 | MEDIUM — i18n and boss gate have significant logic |
| Broken cross-references | 3 | 3 | 0 | LOW — cosmetic but affects Obsidian navigation |
| Consistency issues | 5 | 5 | 0 | MEDIUM — stale status, duplicate tags, missing fields |
| Code-vs-vault discrepancies | 2 | 2 | 0 | MEDIUM — known bugs not tracked in known-issues |
| **NEW: Stale vault docs (code drift)** | 0 | 3 | +3 | HIGH — useSoundManager, bubble-spawn fix, sound review |
| **Total findings** | **18** | **21** | **+3** | |

---

## 5. Recommended Priority Order (v2)

### P0 — High impact, quick wins
1. **Fix CONSIST-2** — merge duplicate `tags` in project spec (1-line fix)
2. **Fix CONSIST-3** — add `status: active` to 4 files (4-line fix)
3. **Fix BROKEN-1** — create `handoff-zen-bug.md` or remove all 4 references
4. **Update `roadmap/backlog.md`** — mark sound handling follow-up as ✅ done (NEW-1)
5. **Update `roadmap/known-issues.md`** — mark sound ternaries as ✅ resolved (NEW-1)
6. **Add sound blockers to `known-issues.md`** (NEW-3) — 2 blockers from REVIEW-SOUND-RECHECK
7. **Add CODE-1 and CODE-2 to `known-issues.md`** — known bugs should be tracked

### P1 — New vault docs
8. **Create `domain/arcade-modes.md`** — covers 4 game modes + 3 standalone games (highest impact)
9. **Create new ADR for `useSoundManager` unification** (NEW-1) — or substantially update `2026-08-centralize-sound.md`
10. **Update `domain/bubble-spawn-design.md`** with 6 playability fixes (NEW-2)
11. **Update `architecture/component-map.md`** to list `useSoundManager.ts` (NEW-1)

### P2 — Remaining missing docs
12. **Create `domain/pet-system.md`** — pet mechanics entirely undocumented
13. **Create `domain/shop-badges.md`** — economy and achievement system undocumented
14. **Create `domain/cinematic-mascot-dialogue.md`** — cinematic and dialogue system
15. **Create `architecture/i18n-localization.md`** — i18n architecture
16. **Create `domain/boss-gate.md`** — boss gate system

### P3 — Cosmetic fixes
17. **Fix CONSIST-1** — update feature-inventory Legacy Zone Map status
18. **Fix CONSIST-5** — add unreferenced root docs to INDEX.md
19. **Fix BROKEN-3** — replace section-only wikilinks
20. **Fix BROKEN-2** — clarify `.agent/rules/` reference
21. **Review CONSIST-4** — bump `updated` dates on stale non-ADR files

---

## 6. Methodology

This audit was performed by:
1. Reading all 36 files in `vault/` (rules, architecture, decisions, domain, roadmap, references, reviews, projects, snapshots, index, loader)
2. Reading all root-level `.md` files referenced in INDEX
3. Cross-referencing vault docs against the live `src/` tree (2026-08-11, branch `sdlc/loop-v0`, commit `8241f4b`)
4. Reviewing git commits since the v1 audit (2026-08-09) for new features/code changes
5. Verifying each v1 finding against current state
6. Checking `docs/reviews/` for review findings not yet in vault
7. Checking all vault wikilinks for broken references
