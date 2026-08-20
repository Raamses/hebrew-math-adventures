# Arcade Mode Selector: i18n Fix — Hebrew Names in Hebrew Mode

**Card:** ba6c3a77-4778-4b95-b129-b0c9c99bfb54  
**Date:** 2026-08-20  
**Model:** glm-5.2 (Claude escalation FAILED — session limit reached)  
**Status:** COMPLETE

## Claude Escalation Failure

Two attempts were made to delegate analysis to Claude via `~/.openclaw/bin/ask-claude --escalate --card ba6c3a77-4778-4b95-b129-b0c9c99bfb54`:

1. **Attempt 1** (detailed prompt): Process killed (SIGKILL) — likely OOM. No output recorded.
2. **Attempt 2** (shorter prompt): "You've hit your session limit · resets 1:30pm" — exit code 1.
3. **Attempt 3** (minimal prompt): Same session limit error — exit code 1.

Per card instructions, documenting the failure explicitly. Analysis was performed directly on glm-5.2.

## Changes Applied

### 1. Hebrew translations for 3 untranslated mode titles (he.json)

| Key | Before (English) | After (Hebrew) |
|-----|-------------------|----------------|
| `practice.zen.title` | Zen Math | חשבון זן |
| `practice.time.title` | Time Attack | נגד השעון |
| `practice.survival.title` | Survival | הישרדות |

The other 2 modes (Memory Duel, Math Invaders) were already translated in he.json.

### 2. RTL bidi-isolation on text elements (ModeSelectorOverlay.tsx)

Added `dir="auto"` to 6 elements to prevent Unicode bidi algorithm from flipping punctuation when mixed LTR/RTL content appears:

- `<h1 dir="auto">` — header title (practice.chooseMode)
- `<p dir="auto">` — header subtitle (practice.chooseModeDesc)
- `<h3 dir="auto">` — mode card title
- `<p dir="auto">` — mode card description
- `<span dir="auto">` — best score badge
- `<motion.p dir="auto">` — keyboard hint paragraph

`dir="auto"` lets each text element auto-detect its content direction. When the text is Hebrew, it renders RTL; when English fallback is used, it renders LTR. This prevents the punctuation flip issue.

### 3. Component already uses t() keys

The component already uses `t()` for all 5 mode names and descriptions — no hardcoded English in the rendering logic. The English strings in `t()` calls are fallbacks (second argument), which is the correct i18next pattern.

## Files Changed

- `src/i18n/locales/he.json` — 3 lines changed (untranslated English → Hebrew)
- `src/components/games/ModeSelectorOverlay.tsx` — 6 `dir="auto"` attributes added + explanatory comment

## Verification

- TypeScript: `npx tsc --noEmit` — no errors
- JSON validity: both en.json and he.json are valid JSON
- Test suite: 1222/1230 tests pass (8 pre-existing ParentBlitz timeouts, unrelated to this change)
