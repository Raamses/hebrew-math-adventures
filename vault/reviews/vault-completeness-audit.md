---
type: review
project: hebrew-math-adventures
updated: 2026-08-09
status: complete
reviewer: planner2
scope: "Vault completeness — missing domain docs and cross-doc consistency"
tags: [review, audit, vault, documentation, consistency]
---

# Vault Completeness Audit — Missing Domain Docs & Consistency

> **Reviewer:** planner2 (automated audit)
> **Date:** 2026-08-09
> **Scope:** All files in `vault/` vs live `src/` tree + root-level docs
> **Verdict:** ⚠️ **6 missing domain docs, 5 consistency issues, 4 stale references**

---

## 1. Missing Domain Docs (code exists, no vault documentation)

The vault has 6 domain docs: `analytics`, `bubble-spawn-design`, `curriculum-levels`, `daily-quests`, `math-generation`, `powerups`. The following code areas have significant business logic but **no corresponding vault domain doc**:

### MISSING-1: Arcade Modes & Game Variants
**Code:** `src/lib/arcadeModes.ts`, `src/hooks/usePracticeSession.ts` (GameMode type), `src/components/games/ModeSelectorOverlay.tsx`, `src/components/games/ArcadeHUD.tsx`
**What's undocumented:**
- The 4 game modes: STANDARD, TIME_ATTACK (60s), SURVIVAL (3 lives), ZEN
- Mode selection UI flow, best-score tracking, combo multipliers
- How `ARCADE_CONFIGS` in `worldConfig.ts` maps to bubble game mode overrides
- The `ExtendedArcadeMode` type adding 'memory' and 'invaders'

**Impact:** An agent entering this project cannot understand the arcade mode system without reading source code.

### MISSING-2: Math Invaders Game
**Code:** `src/engines/invader/useInvaderEngine.ts`, `src/engines/invader/types.ts`, `src/components/games/MathInvadersGame.tsx`
**What's undocumented:**
- Full standalone game engine: invader spawning, problem display, lives, scoring
- Session recording, arcade best-score tracking
- How it integrates with the arcade mode selector

### MISSING-3: Memory Duel Game
**Code:** `src/engines/memory/MemoryFactory.ts`, `src/hooks/useMemoryGame.ts`, `src/components/games/MemoryDuelGame.tsx`
**What's undocumented:**
- Memory card matching game with math problems on cards
- 6-pair (12 card) layout, matching logic, scoring
- Integration with `useMemoryGame` hook and `MemoryFactory` engine

### MISSING-4: Pet System
**Code:** `src/lib/pet.ts`, `src/components/pet/PetScreen.tsx`, `src/components/pet/PetAvatar.tsx`, `src/data/` (pet-related)
**What's undocumented:**
- Pet species selection (owl, cat, dragon, robot)
- Pet stages by level (egg → baby → adult → etc.)
- Happiness decay mechanic (daily, floored at 50 — "no dead pets for kids")
- Feeding cost (2 gems), pet renaming
- `PET_STAGES` config in `worldConfig.ts`

### MISSING-5: Shop & Badge System
**Code:** `src/components/shop/TreasureShop.tsx`, `src/data/shopItems.ts`, `src/components/badges/BadgeCollection.tsx`, `src/components/badges/BadgePopup.tsx`, `src/data/badges.ts`
**What's undocumented:**
- Shop economy: coins, categories (mascot, bubble_skin, particle_effect), buy/equip flow
- 11 shop items with prices and categories
- Badge system: `BadgeStats` interface, 6+ badge definitions with check functions
- Badge unlock criteria and progress display

### MISSING-6: Cinematic & Mascot Dialogue System
**Code:** `src/components/cinematic/UnitCompleteCinematic.tsx`, `src/data/mascotDialogue.ts`, `src/components/mascot/` (all files)
**What's undocumented:**
- Unit completion cinematic: 4-phase animation (charge → shatter → converge → reveal)
- Boss emojis per unit, mascot emoji mapping
- `cinematic_seen_units` localStorage tracking (one-time view per unit)
- Mascot dialogue system: triggers (greeting, streak, welcome_back), per-mascot lines, emotion states

---

## 2. Missing Architecture Docs

### MISSING-ARCH-1: i18n / Localization Architecture
**Code:** `src/i18n.ts`, `src/i18n/locales/en.json` (681 lines), `src/i18n/locales/he.json` (681 lines), `src/i18n/TRANSLATION_AUDIT.md`
**What's undocumented in vault:**
- i18next setup, language detection, localStorage caching
- Translation audit results (structural parity confirmed, intentional brand names kept in English)
- 681 translation keys per language

> **Note:** `rules/rtl-hebrew.md` covers RTL compliance rules, but the i18n *architecture* (how translations are structured, audited, maintained) is not in the vault.

### MISSING-ARCH-2: Boss Gate System
**Code:** `src/lib/bossGate.ts`
**What's undocumented:**
- 3 boss gate types: `rapid_fire`, `missing_operand`, `reverse_chain`
- Boss levels at 3, 6, 9
- `generateBossGate` function and `BOSS_GATE_PROBLEM_COUNT` config

---

## 3. Cross-Reference Issues (wikilinks)

### BROKEN-1: `handoff-zen-bug.md` referenced but does not exist
**File:** `vault/roadmap/known-issues.md`
**Issue:** References `handoff-zen-bug.md` — this file does not exist anywhere in the repo or vault.
**Fix:** Either create the file or remove the reference.

### BROKEN-2: `.agent/rules/*.md` glob reference in INDEX.md
**File:** `vault/INDEX.md`
**Issue:** References `.agent/rules/*.md` — the directory exists with 9 rule files, but the glob is ambiguous. No specific file is linked.
**Fix:** Either list specific `.agent/rules/` files or clarify this is a directory reference, not a wikilink.

### BROKEN-3: Section-only wikilinks (`[[rules/]]`, `[[domain/]]`, etc.)
**Files:** Multiple vault files use `[[rules/]]`, `[[domain/]]`, `[[decisions/]]`, `[[roadmap/]]` as section references.
**Issue:** These are not valid Obsidian wikilinks (no target file). They render as broken links in Obsidian.
**Fix:** Replace with `[[INDEX]]` anchors or remove the trailing slash to point to the directory's implicit index.

---

## 4. Consistency Issues

### CONSIST-1: Feature Inventory stale — Legacy Zone Map status contradicts backlog
**File:** `vault/architecture/feature-inventory.md` vs `vault/roadmap/backlog.md`
**Issue:** Feature inventory says Legacy Zone Map is `⚠️` ("WorldMap.tsx exists but unlinked"). Backlog says `✅ resolved (world-config consolidation removed dead code)`. The `WorldMap.tsx` file still exists in source.
**Fix:** Update feature-inventory.md to mark Legacy Zone Map as `✅ resolved` and note the file still exists but is dead code / scheduled for removal.

### CONSIST-2: Project spec has duplicate `tags` frontmatter
**File:** `vault/projects/hebrew-math-adventures.md`
**Issue:** The frontmatter has two `tags:` lines (lines 17 and 21). YAML parsers will use only the last one, silently dropping the first set of tags.
**Fix:** Merge into a single `tags:` line: `tags: [project, spec, overview, education, kids, math]`

### CONSIST-3: Missing `status` field on 4 vault files
**Files:** `domain/curriculum-levels.md`, `domain/math-generation.md`, `roadmap/backlog.md`, `roadmap/known-issues.md`
**Issue:** Other domain and roadmap files have a `status` field. These 4 don't, creating an inconsistent frontmatter schema.
**Fix:** Add `status: active` (or appropriate value) to each.

### CONSIST-4: 12 vault files have stale `updated` dates (before 2026-08-08)
**Files:** 12 of 28 vault files have `updated` dates ranging from 2026-07-31 to 2026-08-07.
**Issue:** The project has been actively changing (commits through 2026-08-08+). Some files may be genuinely current but their `updated` field wasn't bumped. Most notable:
- `architecture/feature-inventory.md` (2026-08-03) — should be updated for the Legacy Zone Map resolution
- `domain/curriculum-levels.md` (2026-08-03) — no update despite world-config consolidation
- `.vault-loader.md` (2026-08-03) — may need update if loader instructions changed

**Note:** ADRs (decisions/) are historical records and their dates should NOT be bumped. The staleness concern is for domain/architecture/roadmap docs.

### CONSIST-5: 7 root-level .md files unreferenced in INDEX
**Files:** `AGENTS.md`, `CLAUDE_BRIEF.md`, `COUNSEL_FRENZY.md`, `COUNSEL_FRENZY_GEMINI.md`, `DESIGN_REVIEW_PRACTICEMODE.md`, `IMPLEMENTATION_PLAN_zen.md`, `README.md`
**Issue:** INDEX.md references some root-level docs (`ANTIGRAVITY_RULES.md`, `SPAWN_OVERHAUL_PLAN.md`, `CHALLENGE_CLUTTER_PLAN.md`) but not these 7. An agent won't know they exist.
**Recommendation:** Add a "Root-level docs" section to INDEX.md listing all root .md files with one-line descriptions, or mark them as superseded by vault equivalents.

---

## 5. Code-vs-Vault Discrepancies

### CODE-1: GameOrchestrator LESSON dead code (known, unfixed)
**File:** `src/components/GameOrchestrator.tsx:86, 88, 207-216`
**Issue:** Documented in `reviews/e2e-coverage-review.md` as blocker B1. `effectiveMode` never returns `'LESSON'`; `isLessonOpen` initialized to `false` and never set to `true`. The LESSON code path is unreachable dead code.
**Vault status:** Mentioned in e2e review but NOT tracked in `roadmap/known-issues.md`.
**Fix:** Add to `known-issues.md` as a known bug.

### CODE-2: SENSORY/arcade game-over has no SessionSummary (known, unfixed)
**File:** `src/components/games/BubbleGameContainer.tsx`, `src/components/GameOrchestrator.tsx`
**Issue:** Documented in e2e review as blocker B2. Only PracticeMode renders SessionSummary. Arcade modes exit directly to saga map.
**Vault status:** Mentioned in e2e review but NOT tracked in `roadmap/known-issues.md`.
**Fix:** Add to `known-issues.md` or resolve the design decision (is this intentional?).

---

## 6. Summary Scorecard

| Area | Count | Severity |
|---|---|---|
| Missing domain docs | 6 | High — agents lack context for entire feature areas |
| Missing architecture docs | 2 | Medium — i18n and boss gate have significant logic |
| Broken cross-references | 3 | Low — cosmetic but affects Obsidian navigation |
| Consistency issues | 5 | Medium — stale status, duplicate tags, missing fields |
| Code-vs-vault discrepancies | 2 | Medium — known bugs not tracked in known-issues |
| **Total findings** | **18** | |

## 7. Recommended Priority Order

1. **Create `domain/arcade-modes.md`** — highest impact, covers 4 game modes + 3 standalone games
2. **Create `domain/pet-system.md`** — pet mechanics are entirely undocumented
3. **Create `domain/shop-badges.md`** — economy and achievement system undocumented
4. **Fix CONSIST-1** — update feature-inventory Legacy Zone Map status
5. **Fix CONSIST-2** — fix duplicate tags in project spec
6. **Add CODE-1 and CODE-2 to `roadmap/known-issues.md`** — known bugs should be tracked
7. **Fix BROKEN-1** — remove or create `handoff-zen-bug.md` reference
8. **Create `domain/cinematic-mascot-dialogue.md`** — cinematic and dialogue system
9. **Create `architecture/i18n-localization.md`** — i18n architecture
10. **Create `domain/boss-gate.md`** — boss gate system
11. **Fix CONSIST-3** — add `status` to 4 files missing it
12. **Fix BROKEN-3** — replace section-only wikilinks
13. **Fix CONSIST-5** — add unreferenced root docs to INDEX.md
14. **Review CONSIST-4** — bump `updated` dates on stale non-ADR files
