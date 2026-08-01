# Translation Audit Report

**Date:** 2026-08-01  
**Auditor:** Gemini Subagent  
**Scope:** Full i18n translation audit of `hebrew-math-adventures` — bilingual Hebrew/English kids' math game

---

## 1. Structural Parity Issues

### Keys missing from he.json:
*None — all keys in en.json exist in he.json*

### Keys missing from en.json:
*None — all keys in he.json exist in en.json*

### Type mismatches:
*None — all corresponding keys have the same type (string or array) in both files*

### Array length mismatches:
*None — `feedback.phrases` has 20 items and `feedback.gentle` has 4 items in both files*

**✅ Structural parity is perfect. Both files have identical key structure.**

---

## 2. Language Contamination

### Hebrew text in en.json:
*None found — all English translation values contain only Latin text, template variables, emoji, and standard punctuation.*

**✅ en.json is clean.**

### English text in he.json (intentionally untranslated brand names):
- `practice.zen.title`: `"Zen Math"` — **intentional** brand/mode name, kept untranslated
- `practice.time.title`: `"Time Attack"` — **intentional** brand/mode name, kept untranslated
- `practice.survival.title`: `"Survival"` — **intentional** brand/mode name, kept untranslated
- `parent.table.xp`: `"XP"` — **intentional** universal abbreviation
- `summary.result`: Contains `<c>` and `<t>` tags — **intentional** `Trans` component markup tags (not visible English text)

**Note:** The brand mode names ("Zen Math", "Time Attack", "Survival") are consistently untranslated in he.json. This is a design decision but should be confirmed — kids who don't read English may not understand these mode names. Consider adding Hebrew transliterations or translations.

### Punctuation issues:
*See Section 3 below for the full RTL punctuation analysis.*

---

## 3. RTL/LTR Issues

### Inconsistent exclamation mark placement in Hebrew translations

The Hebrew translations use **two conflicting patterns** for exclamation marks:

**Pattern A — `!` at the BEGINNING (visually right side in RTL):**  
Used in `feedback.phrases[]`, `feedback.correct`, and `summary.title`  
Example: `"!אלופה"`, `"!נכון"`, `"!סיימנו"`  
Total: 26 values use this pattern

**Pattern B — `!`/`?` at the END (visually left side in RTL):**  
Used in all other Hebrew translations  
Example: `"בוקר טוב!"`, `"מי משחק?"`, `"האימון הושלם!"`  
Total: ~90+ values use this pattern

**Analysis:**  
- Pattern A is a manual RTL fix — the `!` is placed at the start of the string so it appears on the right side when rendered RTL.
- Pattern B relies on the Unicode Bidirectional Algorithm + `dir="rtl"` container to correctly position the `!` at the visual end (left side) of the Hebrew text.
- Both patterns can render correctly, but the inconsistency is problematic and suggests different authors wrote different sections.
- If any text is rendered without a `dir="rtl"` container, Pattern B text will show `!` on the wrong side.

**Recommendation:** Standardize on one pattern. Pattern B (end-of-string `!`) is more natural and works with proper `dir="rtl"` containers. Pattern A values should be changed to Pattern B. Alternatively, if containers are unreliable, all values should use Pattern A.

### `game.howTo` has `?` at beginning: `"?איך עושים את זה"`
This is Pattern A. Compare with `game.compareNumbers` which also uses Pattern A: `"?מי יותר גדול"`

### `game.completePattern` uses `:` at beginning: `":השלימו את הסדרה"`
### `game.readCarefully` uses `:` at beginning: `":קראו בהקפדה"`
These are Pattern A for colons — consistent with the Pattern A group.

---

## 4. Hardcoded Strings (not using `t()`)

### CRITICAL — Hebrew text hardcoded in source (not using `t()`):

#### File: `src/components/games/LevelUpBanner.tsx`
- **Line 34:** `כל הכבוד! 🎉` — Hebrew text hardcoded directly in JSX, no `t()` call
- **Line 31:** `Level {level}!` — English text hardcoded directly in JSX, no `t()` call

#### File: `src/components/parent/StreakHeatmap.tsx`
- **Line 80:** `title={cell.count < 0 ? 'עתידי' : ...}` — Hebrew `'עתידי'` (="Future") hardcoded
- **Line 80:** `' — פעילות'` — Hebrew `'פעילות'` (="Activity") hardcoded in title template
- **Line 90:** `פחות` — Hebrew (="Less") hardcoded in JSX
- **Line 96:** `יותר` — Hebrew (="More") hardcoded in JSX

#### File: `src/components/parent/SkillBreakdown.tsx`
- **Lines 10-55:** `labelHe` field contains hardcoded Hebrew skill names (`'חיבור'`, `'חיסור'`, `'כפל'`, `'חילוק'`, `'סדרות'`, `'השוואה'`, `'בעיות מילוליות'`, `'אלגברה'`)
- **Lines 124, 140, 175:** Always uses `labelHe` regardless of current language — **ignores `labelEn`**. When app is in English mode, skill labels will still display in Hebrew.

#### File: `src/lib/skillAnalysis.ts`
- **Line 89:** `dayLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']` — Hebrew day abbreviations hardcoded

#### File: `src/lib/themes.ts`
- **Lines 24, 38, 54, 70:** `nameHebrew` field hardcoded (`'בְּרִירַת מֶחְדָּל'`, `'יַעַר'`, `'חָלָל'`, `'סוּכָּרִיָּה'`)

#### File: `src/components/ThemeSelector.tsx`
- **Line 60:** `{theme.nameHebrew}` — Always displays Hebrew theme name, ignores `theme.name` (English). No i18n used.

#### File: `src/context/ProfileContext.tsx`
- **Line 8:** `name: 'באדי'` — Pet default name hardcoded in Hebrew

### IMPORTANT — English text hardcoded in source (not using `t()`):

#### File: `src/components/games/FrenzyOverlay.tsx`
- **Line 34:** `label: 'FRENZY!'` — hardcoded English
- **Line 42:** `label: 'SUPER FRENZY!'` — hardcoded English
- **Line 50:** `label: 'MEGA FRENZY!'` — hardcoded English
- **Line 168:** `{config.multiplier}x Score!` — hardcoded English "Score!"
- **Line 126:** `aria-label={\`${config.label} Mode Activated\`}` — hardcoded English

#### File: `src/components/games/ArcadeHUD.tsx`
- **Line 70:** `{combo}x COMBO!` — hardcoded English
- **Line 79:** `Score` — hardcoded English label

#### File: `src/components/games/ModeSelectorOverlay.tsx`
- **Line 188:** `💡 Tip:` — hardcoded English "Tip" label (the actual hint text uses `t()`)

#### File: `src/components/SettingsMenu.tsx`
- **Lines 100, 104:** `'Switch to English'` / `'עבור לעברית'` — hardcoded language toggle labels (these are intentionally bilingual since they show the *other* language name)

#### File: `src/components/onboarding/ProfileSelector.tsx`
- **Lines 61, 86:** `'English'` / `'עברית'` — hardcoded language toggle labels (same pattern as above)
- **Lines 58, 83:** `title="Switch Language"` — hardcoded English aria-label/title

#### File: `src/components/parent/EditProfileModal.tsx`
- **Line 142:** `aria-label={\`Select mascot ${t(\`mascot.names.${m}\`)}\`}` — "Select mascot" is hardcoded English in the aria-label

### Minor — Fallback strings in `t()` calls:

Several components use `t('key', 'fallback')` where the fallback is Hebrew text. This is not a bug per se (fallbacks only show if the key is missing), but the fallbacks should be in the default language:

#### File: `src/components/pet/PetScreen.tsx`
- **Line 60:** `t('pet.title', 'החיית שלי')` — **also has a typo**: `החיית` (double yod) vs correct `החיה` (in he.json)
- Multiple lines use Hebrew fallbacks: `'רמה'`, `'רמות לגדילה'`, `'בחר חיה'`, `'אושר'`, `'להאכיל'`, `'הואכל היום'`, `'אין חיית מחמד'`

#### File: `src/components/pet/DailyQuestList.tsx`
- Hebrew fallbacks: `'משימות יומיות'`, `'נתבע'`, `'תבע'`

#### File: `src/components/MathCard.tsx`
- **Line 181:** `t('game.emptyInput', 'מספר?')` — Hebrew fallback for a key that **doesn't exist** in either translation file (see Section 5)

---

## 5. Missing/Dead Translation Keys

### Keys used in code but MISSING from both translation files:

| Key | Used in | Issue |
|-----|---------|-------|
| `common.close` | `GameMenuModal.tsx:130`, `ModeSelectorOverlay.tsx:129` | Missing — should use `app.common.close` which exists, or add `common.close` |
| `common.next` | `BorrowingHint.tsx:187, 328` | Missing — no `common.next` in either file |
| `common.prev` | `BorrowingHint.tsx:179, 321` | Missing — no `common.prev` in either file |
| `common.save` | `PetScreen.tsx:88` | Missing — no `common.save` in either file |
| `common.step` | `BorrowingHint.tsx:309` | Missing — no `common.step` in either file |
| `game.emptyInput` | `MathCard.tsx:181` | Missing — placeholder text for empty number input |
| `game.hints.additionVisual` | `AdditionHint.tsx:91` | Missing — visual addition hint |
| `game.hints.simpleCalc` | `BorrowingHint.tsx:291` | Missing — simple calculation hint |
| `menu.back` | `PetScreen.tsx:56` | Missing — should use `onboarding.back` or `saga.back`, or add `menu.back` |

### Keys in translation files but never used in code:

**Dynamically used via template literals (NOT actually dead):**  
The following keys are used via dynamic `t()` calls like `t(\`saga.${node.id}_title\`)`, `t(q.titleKey)`, `t(item.nameKey)`, `t(badge.nameKey)`, `t(greeting.textKey)`, `t(problem.questionKey)`, `t(lesson.title)`, `t(currentStep.mascotText)`, etc. These are **false positives** and are actually used:
- All `saga.*_title` keys (used in `SagaMap.tsx`, `GameOrchestrator.tsx`, `UnitCompleteCinematic.tsx`)
- All `wordProblems.*` keys (used via `i18nKey` in `wordProblemTemplates.ts`, consumed in `WordProblemView.tsx`)
- All `mascot.greeting.*` keys (used via `textKey` in `mascotDialogue.ts`, consumed in `MascotGreeting.tsx`)
- All `mascot.names.*` keys (used in `MascotSelector.tsx`, `EditProfileModal.tsx`)
- All `badges.*.name` and `badges.*.desc` keys (used via `nameKey`/`descriptionKey` in `badges.ts`)
- All `shop.*` keys (used via `nameKey` in `shopItems.ts`, consumed in `TreasureShop.tsx`)
- All `quest.*` keys (used via `titleKey`/`descKey` in `dailyQuests.ts`, consumed in `DailyQuestList.tsx`)
- All `pet.stage.*` keys (used via `t(\`pet.stage.${stage.key}\`)` in `PetScreen.tsx`)
- All `skills.*` keys (available for skill display, though no direct `t()` call found — may be used in future)
- `lessons.multiplication.*` keys (used via `mascotText`/`title` in `lesson1_multiplication.ts`)

**Genuinely dead translations (not used anywhere):**

| Key | Notes |
|-----|-------|
| `analytics.accuracy` | Not referenced in any component |
| `analytics.avgSpeed` | Not referenced in any component |
| `app.greeting` | Not referenced — `app.title` is used instead |
| `app.streak` | Not referenced — `app.streakTooltip` is used |
| `daily.comeBack` | Not referenced in any component |
| `daily.streak` | Not referenced in any component |
| `feedback.defaultError` | Not referenced — may be used in error handling logic |
| `game.compareNumbers` | Not referenced |
| `game.completePattern` | Not referenced |
| `game.frenzy` | Not referenced (FrenzyOverlay uses hardcoded labels instead) |
| `game.hints.blueDots` | Not referenced |
| `game.hints.borrow10` | Not referenced |
| `game.hints.carry1` | Not referenced |
| `game.hints.circles` | Not referenced |
| `game.hints.greenDots` | Not referenced |
| `game.hints.step2Add` | Not referenced |
| `game.hints.step2Sub` | Not referenced |
| `game.hints.step2SubNote` | Not referenced |
| `game.hints.step3Add` | Not referenced |
| `game.hints.step3Sub` | Not referenced |
| `game.hints.step3SubDesc` | Not referenced |
| `game.hints.totalPoints` | Not referenced |
| `game.hints.weHad` | Not referenced |
| `game.hints.weHave` | Not referenced |
| `game.hints.weRemoved` | Not referenced |
| `game.howMuch` | Not referenced |
| `game.readCarefully` | Not referenced |
| `invaders.frenzy` | Not referenced |
| `invaders.start` | Not referenced |
| `mascot.select` | Not referenced |
| `mascot.welcome` | Not referenced |
| `menu.gameMenu` | Not referenced |
| `onboarding.errorNameInvalid` | Not referenced (parent.edit.errorNameInvalid is used instead) |
| `parent.edit.errorLevel` | Not referenced |
| `parent.edit.errorXP` | Not referenced |
| `parent.table.level` | Not referenced |
| `parent.table.totalScore` | Not referenced |
| `parent.table.xp` | Not referenced |
| `practice.noRecord` | Not referenced |
| `saga.locked` | Not referenced |
| `saga.play` | Not referenced |
| `settings.tabs.theme` | Not referenced |
| `settings.unlockLevel` | Not referenced |
| `shop.buy` | Not referenced (shop uses `equip`/`equipped`/`owned` but `buy` not called) |
| `shop.coins` | Not referenced |
| `shop.notEnough` | Not referenced |
| `shop.owned` | Not referenced |
| `summary.levelProgress` | Not referenced |
| `summary.points` | Not referenced |
| `summary.practiceComplete` | Not referenced |
| `summary.result` | Used via `Trans` component with `i18nKey="summary.result"` — **NOT dead** |
| `zones.*` | Not referenced (WorldMap may use different keys) |

**Note:** Many "dead" keys may be planned for future use or used in components not yet created. They don't cause harm but add maintenance burden.

---

## 6. Config Issues

### Two competing i18n config files:

1. **`src/i18n.ts`** — `fallbackLng: 'en'`, no explicit `lng` (uses LanguageDetector)
2. **`src/i18n/config.ts`** — `fallbackLng: 'he'`, `lng: 'he'` (explicit default), `debug: true`

### Which one is loaded?
- **`src/main.tsx` line 5:** `import './i18n';` — loads `src/i18n.ts`
- **`src/App.tsx` line 2:** `import './i18n';` — loads `src/i18n.ts`

**`src/i18n/config.ts` is NOT imported anywhere.** It's a dead file. The active config is `src/i18n.ts` with:
- `fallbackLng: 'en'` — if a Hebrew key is missing, it falls back to English
- No explicit `lng` — relies on `LanguageDetector` with order `['localStorage', 'navigator']`
- No `lookupLocalStorage` setting (unlike `config.ts` which uses `'app-language'`)

### Issues with the active config (`i18n.ts`):
1. **No explicit default language** — relies on browser detection. If a user's browser is set to English, the app will default to English, but the app is primarily Hebrew-first.
2. **`fallbackLng: 'en'`** — if a Hebrew translation is missing, it shows English. For a Hebrew-first kids' app, `fallbackLng: 'he'` would be more appropriate.
3. **`debug` is not set** — no debug logging for missing keys (could help during development).
4. **No `lookupLocalStorage` key** — the LanguageDetector will use the default `'i18nextLng'` localStorage key, while `config.ts` uses `'app-language'`. If any code reads/writes `'app-language'`, it won't be detected.

### Recommendation:
Consolidate to a single config file. Use `src/i18n/config.ts` (which is better configured) and update imports, or merge its settings into `src/i18n.ts` and delete `config.ts`.

---

## 7. Summary

| Category | Count | Severity |
|----------|-------|----------|
| **Critical (breaks UX in English mode)** | 5 | High |
| **Important (visible to users, language mixing)** | 12 | Medium |
| **Minor (dead translations, config, inconsistency)** | 60+ | Low |

### Critical Issues:
1. **`SkillBreakdown.tsx`** — Always uses `labelHe` (Hebrew skill names) regardless of language. English mode shows Hebrew text. (5 hardcoded labels)
2. **`LevelUpBanner.tsx`** — "Level {level}!" in English and "כל הכבוד!" in Hebrew, both hardcoded. Shows both languages simultaneously in both modes.
3. **`StreakHeatmap.tsx`** — 4 Hebrew strings hardcoded, always Hebrew regardless of language.
4. **`ThemeSelector.tsx`** — Always shows `nameHebrew`, never `name` (English). English mode shows Hebrew theme names.
5. **`FrenzyOverlay.tsx`** — 5 English strings hardcoded ("FRENZY!", "SUPER FRENZY!", "MEGA FRENZY!", "x Score!", "Mode Activated"). Always English regardless of language.

### Important Issues:
1. **`ArcadeHUD.tsx`** — "COMBO!" and "Score" hardcoded in English
2. **`ModeSelectorOverlay.tsx`** — "💡 Tip:" hardcoded in English
3. **`ProfileContext.tsx`** — Pet default name `'באדי'` hardcoded in Hebrew
4. **`EditProfileModal.tsx`** — "Select mascot" hardcoded in English aria-label
5. **`ProfileSelector.tsx`** — `title="Switch Language"` hardcoded in English
6. **9 missing translation keys** — `common.close`, `common.next`, `common.prev`, `common.save`, `common.step`, `game.emptyInput`, `game.hints.additionVisual`, `game.hints.simpleCalc`, `menu.back` — will fall back to English (or Hebrew fallback) text
7. **`PetScreen.tsx` fallback typo** — `'החיית שלי'` (double yod) vs correct `'החיה שלי'` in he.json
8. **`i18n/config.ts` is dead code** — duplicate config file not imported anywhere

### Minor Issues:
1. **~50 dead translation keys** — exist in translation files but not used in code (may be planned for future)
2. **RTL punctuation inconsistency** — 26 values use `!` at beginning (Pattern A), ~90 values use `!` at end (Pattern B). Should be standardized.
3. **Brand names untranslated** — "Zen Math", "Time Attack", "Survival" are English in he.json. May confuse Hebrew-only kids.
4. **`skillAnalysis.ts` day labels** — Hebrew abbreviations hardcoded, no i18n
5. **`themes.ts`** — Has both `name` (English) and `nameHebrew` fields but `ThemeSelector` only uses `nameHebrew`

---

## 8. Recommended Fixes

### Priority 1 — Fix language mixing (Critical):

1. **`SkillBreakdown.tsx`**: Replace `labelHe` usage with `t('skills.{key}')` calls. The `skills.*` translation keys already exist in both en.json and he.json. Remove `labelHe`/`labelEn` fields entirely.
2. **`LevelUpBanner.tsx`**: Add translation keys (e.g., `game.levelUp` = "Level {{level}}!" / "רמה {{level}}!") and use `t()`. Replace hardcoded "כל הכבוד!" with `t('feedback.phrases')` or a new key.
3. **`StreakHeatmap.tsx`**: Add translation keys for "Future", "Activity", "Less", "More" and use `t()`. Move day labels to translations or use `i18n.dir()` to select.
4. **`ThemeSelector.tsx`**: Use `i18n.language` to select between `theme.name` and `theme.nameHebrew`, or better, add theme names to translation files.
5. **`FrenzyOverlay.tsx`**: Add translation keys for frenzy labels (e.g., `game.frenzy`, `game.superFrenzy`, `game.megaFrenzy`, `game.scoreMultiplier`) and use `t()`. Note: `game.frenzy` already exists in both translation files as "FRENZY!" / "טירוף!".
6. **`ArcadeHUD.tsx`**: Add translation keys for "COMBO!" and "Score" or reuse existing `invaders.combo` / `invaders.score`.

### Priority 2 — Add missing translation keys:

7. Add these keys to both en.json and he.json:
   - `common.close` (or change code to use `app.common.close`)
   - `common.next`, `common.prev`, `common.save`, `common.step`
   - `game.emptyInput` (e.g., "Number?" / "מספר?")
   - `game.hints.additionVisual`, `game.hints.simpleCalc`
   - `menu.back` (or change code to use `onboarding.back` or `saga.back`)

### Priority 3 — Fix hardcoded text:

8. **`ProfileContext.tsx`**: Use a translation key for pet default name or use a language-neutral default.
9. **`ModeSelectorOverlay.tsx`**: Replace "💡 Tip:" with a translation key.
10. **`EditProfileModal.tsx`**: Replace "Select mascot" with translation key or construct aria-label from existing keys.
11. **`ProfileSelector.tsx`**: Replace `title="Switch Language"` with `t('app.switchLanguage')`.
12. **`skillAnalysis.ts`**: Move day labels to translation files or make language-aware.
13. **`FrenzyOverlay.tsx` aria-label**: Use translation key for "Mode Activated".

### Priority 4 — Config cleanup:

14. Delete `src/i18n/config.ts` (dead code) OR merge its better settings into `src/i18n.ts`:
    - Add `lng: 'he'` as default
    - Change `fallbackLng` to `'he'`
    - Add `lookupLocalStorage: 'app-language'`
    - Add `debug: true` for development
15. Ensure only one i18n config file exists.

### Priority 5 — Consistency:

16. Standardize RTL punctuation — pick one pattern (beginning `!` or end `!`) and apply to all Hebrew values.
17. Fix `PetScreen.tsx` fallback typo: `'החיית שלי'` → `'החיה שלי'`.
18. Consider translating or transliterating "Zen Math", "Time Attack", "Survival" in he.json for Hebrew-only kids.
19. Clean up dead translation keys (or document them as reserved for future use).