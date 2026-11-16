---
type: decision
status: accepted
date: 2026-11-15
updated: 2026-11-15
project: hebrew-math-adventures
decision: "Gifted-prep section (Stage A slice): Hebrew-only, parent-enabled, PrepItem contract, original content only"
related: [rules/rtl-hebrew, rules/math-curriculum, rules/architecture, rules/quality-gates]
tags: [gifted-prep, stage-a, content-policy, i18n, decision]
---

# ADR: Gifted-prep section, Stage A slice

**Date:** 2026-11-15 · **Status:** Accepted (plan approved by Ram 2026-11-14; Stage-A blitz decided 2026-11-15)
**Plan:** fleet `HMA-Giftedness-Prep-Plan-2026-11-14.md` (Pi vault `Fleet/SDLC/Plans/`).

## Context
Ram's 2nd-grader sits the Ministry of Education Stage-A screening (שלב א׳) in school on Mon 2026-11-30 (confirmed by Ram 2026-11-15, see below). The goal is familiarity with the *kinds* of tasks, not drilling answers. Stage B (figural matrices etc., Mar–Apr 2027) follows later on the normal card flow.

### Format facts checked against public sources (2026-11-15)
- The Ministry's public scoring guide for the grade-2 screening (תשפ"ה, `meyda.education.gov.il/files/Rama/mechvan-gifted-students-heb-2025.pdf`) lists **reading-comprehension** tasks (2 passages, 5 and 7 four-option questions) and **arithmetic** tasks (exercises, missing number, word problems, picture puzzles).
- Scoring: a correct answer = 1 point; wrong, blank, unclear or double-marked = 0. **No negative marking**, so the mock teaches "never leave a question blank, guess". A digit-swapped answer (61 for 16) scores 0.
- The format brief's separate "Hebrew language" section was **not** in that key; language items (word meaning, sentence completion) ship as practice that supports reading, not as a mock section.
- Test date: **Mon 2026-11-30, confirmed by Ram 2026-11-15**. First release = reading comprehension + arithmetic (Ram: "ship reading + arithmetic before 30.11"); figural reasoning is Stage B (Mar–Apr 2027).

## Decisions
1. **Self-contained feature folder** `src/features/giftedPrep/` (`engine/`, `components/`, `context/`, `hooks/`, `content/he/`). Nothing goes into `GameOrchestrator`. App.tsx gets a `'prep'` view loaded with `React.lazy` (own chunk; content JSON is in that chunk, not in the main bundle).
2. **Parent-enabled, per profile.** `UserProfile.giftedPrepEnabled` (default off), switched in Parent zone → Settings (`PrepToggle`). The SagaMap tile and the `'prep'` view exist only when it is on. Not a saga node: it never locks or unlocks math worlds.
3. **Hebrew-only section.** Content is Hebrew data (`content/he/*.json`), not i18n keys. The section root is always `dir="rtl" lang="he"`. UI chrome uses i18n keys in both `he.json` and `en.json` (locales-parity test stays green). In English mode the tile is visible and the section opens in Hebrew.
4. **i18n selector API, feature-scoped.** `usePrepT()` gives `t($ => $.prep.key)` typed against `he.json`. A global `CustomTypeOptions` would re-type ~500 legacy string-key calls (measured: 494 errors), so it is not turned on repo-wide here.
5. **`PrepItem` contract** (`types.ts`): `id, kind, section, skill, difficulty, stem (data, never JSX; equations render in <div dir="ltr">), options (4, shuffled by seed), answerIndex, explanation (kid Hebrew), source`. Stage-A kinds only: `math-exercise | math-missing | math-word | reading | word-meaning | sentence-completion`. Stage B extends the union.
6. **Determinism.** Seeded `mulberry32`; session seeds from `RandomUtils.secureIntInRange` (#257). Selection is a seeded **bag deck** with a last-3 repetition guard that prefers unseen bank items (`engine/bagDeck.ts`).
7. **Progress** is local only: `hebrew-math-prep-progress-${profileId}`, `schemaVersion: 1`, `migratePrepProgress()` from day one; capped attempt log (300), mock history (20). No cloud sync of child answers, no free text in analytics (`prep_open`, `prep_toggle`, `prep_session_start/end`, `prep_item_answered`).
8. **Original content only.** Never copy, scrape or paraphrase real Ministry/Szold/Karni items. Formats inspire item *types* only. Every bank item carries `source: "original"` and `reviewStatus`; **only `reviewed` items ship** (a unit test enforces it). Drafts get a blind second solve; disagreements are flagged for the reviewer (Ram).
9. **Kid wellbeing.** No "gifted" labels, no percentiles, gentle copy. The mock timer is calm (no red flashing).

## Picture puzzles (Ram 2026-11-15: "build the picture puzzles task before 30.11")
- New math kind `math-picture` (skill `picture-puzzle`): every picture is a number; 1–2 picture equations (numbers to 20), find one picture's value. Shapes: double (🍎+🍎), triple, pair, chain, back-substitution; difficulty picks the shape. Original puzzle shapes only.
- Exactly one solution per puzzle, proven by a brute-force solver over 3000 seeds × 3 difficulties in `pictures.test.ts`; the typical slip (e.g. not halving) is one distractor. Lines render LTR; explanations isolate every equation.
- In the math mix 1 in 5 items (also in the mock's math part); the repetition guard covers picture numbers.

## Content pipeline (Stage A)
- Drafts: `content-drafts/gifted-prep/he/{reading,language}.json` (round 1: 40 passages / 126 questions, 40 language items, blind second solve: 1 disagreement of 166, 5 more flags; round 2 (#288): 34 passages / 160 questions, 40 language items in 5 genres, blind second solve 200/200; 74 passages / 286 questions / 80 language items in all; Claude-drafted, every flag shown to the reviewer). Never bundled.
- Review: Ram's phone review page (artifact) stores approve / edit / drop per passage or item.
- Promote: `node scripts/prep-content-promote.mjs <round1.json> <round2.json> ...` (**pass every round's export**: the shipped bank is rebuilt from all decisions given, so one round alone drops the others) copies approved items into `src/features/giftedPrep/content/he/` with `reviewStatus: reviewed`. A section appears in the hub only once it has reviewed items.
- Review 2026-11-15: Ram approved all 80 (40 passages, 40 language items); promoted with `reviewStatus: reviewed`.
- Review 2026-11-16 (round 2): Ram approved all 74 (34 passages, 40 language items); promoted together with round 1. Round-2 niqqud is Claude-only (no Dicta cross-check), not human-reviewed. Whole passages (up to 7 questions) can run a mock reading part past its 10 questions, so a part's timer keeps the planned pace per question (`engine/mock.ts`).
- **Niqqud (Ram 2026-11-15: "do the best you can").** Every text field has a fully vocalized twin (`*Niqqud`), ktiv male kept (stripping the marks gives the approved text exactly, enforced by `bank.test.ts`). Pipeline: an LLM vocalized all 1,076 strings; Dicta's Nakdan (the strongest documented Hebrew vocalizer; DictaBERT-menaked, SOTA on modern-Hebrew benchmarks) vocalized them independently; 91.6% of 5,960 words agreed. The 239 distinct disagreements were adjudicated in context (Dicta kept in 110, the LLM form or a corrected form in 129: e.g. Dicta read אפו as "his nose", חמניה as חַמָּנֶיהָ). Shown by default; per-profile switch in the hub. **Review scope:** Ram's approve pass (and `reviewStatus: reviewed`) covers the plain text only; the niqqud is machine-made and Claude-adjudicated, not human-reviewed. Each bank file says so in `niqqudProvenance` (a test requires it whenever twins exist). Math stems and word-problem templates have twins too (`content/he/math-niqqud.json`, Dicta Nakdan + review); math explanations stay plain.
- Fix-in-place decision (Ram 2026-11-15, after the reviewer's 2nd REQUEST_CHANGES on #284/#285): "fix everything in place" rather than splitting niqqud into separate PRs.

## Consequences
- Stage-A PRs are file-disjoint from saga/arcade work except the one-time wiring in App.tsx, SagaMap, ProfileManager, ProfileContext (validator), types/user.ts and the locales.
- `STORAGE_KEYS` in worldConfig.ts is pinned by a test (10 keys), so the prep key is feature-local.
