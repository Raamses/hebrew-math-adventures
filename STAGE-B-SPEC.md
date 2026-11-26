# Stage B spec: verbal analogies (יחסי מילים) — verbatim implementation contract

ADR: `vault/decisions/2026-11-gifted-prep-stage-a.md` — §5 (Stage B extends the PrepKind union without changing the player), §8 (original content only), Niqqud section (every text field has a fully vocalized twin; twin must strip to the exact plain text; `niqqudProvenance` required when twins exist, must contain the phrase "not been human-reviewed").

**Change exactly these 7 files — nothing else. No new tests. No new PrepSection.**

## 1. `src/features/giftedPrep/types.ts`
- PrepKind union: after `| 'sentence-completion'` add `| 'verbal-analogy'` with comment `// יחסי מילים: "ספר : לקרוא :: עט : ?"`.
- SKILL_TAGS: append `'verbal-analogy'` after `'word-meaning', 'sentence-completion',`.

## 2. NEW `src/features/giftedPrep/content/he/analogies.json`
Top level exactly like `content/he/language.json`:
```json
{
 "schemaVersion": 1,
 "niqqudProvenance": "<string that contains the exact phrase: not been human-reviewed>",
 "items": [ ...24 items... ]
}
```
Each item (same fields as language.json items):
- `"id"`: `"va-001"` … `"va-024"`
- `"kind"`: `"verbal-analogy"`
- `"stem"`: Hebrew analogy for a 2nd-grader in the form `"א : ב :: ג : ?"` or a short relation question ending with `?`. Plain text only (renders via PrepStem.text) — no figures, no equations, no Latin.
- `"options"`: exactly 4 Hebrew options, exactly one correct
- `"answerIndex"`: 0–3
- `"explanation"`: 1–2 kid-friendly Hebrew sentences naming the relation
- `"difficulty"`: 1, 2 or 3 (8 items of each)
- `"skill"`: `"verbal-analogy"`
- `"reviewStatus"`: `"reviewed"`
- `"source"`: `"original"`
- `"stemNiqqud"`, `"optionsNiqqud"` (array of exactly 4), `"explanationNiqqud"` twins for every text field

**Niqqud rule (enforced by `__tests__/bank.test.ts`):** `stripNiqqud(twin) === plainText` exactly for every field — same letters (ktiv male kept), only marks differ.

**Content:** 24 distinct relations, no relation repeated. Cover categories like: tool→use (מסרק:לסרק), animal→sound, adult→young (כלב:גור), place→thing kept there, worker→tool, part→whole, opposites, degree (חם:רותח), object→material, action→result. Distractors plausible but clearly wrong to a child who understands the relation. All content original (never copy real Ministry/Szold items).

## 3. `src/features/giftedPrep/engine/bankSchema.ts`
Add below `BankLanguageItem`:
```ts
export interface BankAnalogyItem extends BankQuestion {
    readonly kind: 'verbal-analogy';
    readonly difficulty: number;
    readonly reviewStatus: string;
    readonly source: string;
}
```
Add `export function parseAnalogyBank(json: { items: readonly unknown[] }): BankAnalogyItem[]` mirroring `parseLanguageBank` (reuse `parseQuestion`; throw when `kind !== 'verbal-analogy'`).

## 4. `src/features/giftedPrep/engine/bank.ts`
- `import analogiesJson from '../content/he/analogies.json';`
- `export const ANALOGY_ITEMS: readonly BankAnalogyItem[] = parseAnalogyBank(analogiesJson);`
- `export function analogyItems(rng: Rng, count: number, seen: ReadonlySet<string>, pool = ANALOGY_ITEMS): PrepItem[]` mirroring `languageItems` (BagDeck; each drawn item → `toItem(rng, it, { kind: it.kind, section: 'language', difficulty: asDifficulty(it.difficulty), stem: { text: it.stem, textNiqqud: it.stemNiqqud }, source: 'bank' })`).
- Extend `makeBuilders` to **three** params: `makeBuilders(passages, items, analogies: readonly BankAnalogyItem[] = [])` — optional third param with default `[]` so existing 2-arg calls still compile. When `items.length > 0 || analogies.length > 0`, build the single `'language'` entry from the **combined pool** (concat of both arrays, each item keeping its own kind; one BagDeck). When both pools are empty, return no language builder (unchanged behavior).

## 5. `src/features/giftedPrep/engine/sections.ts`
Only the BUILDERS line: `const BUILDERS = makeBuilders(READING_PASSAGES, LANGUAGE_ITEMS, ANALOGY_ITEMS);` and add `ANALOGY_ITEMS` to the existing `from './bank'` import. Nothing else in the file.

## 6. `src/i18n/locales/he.json`
In the `"prep"` object's `"skills"` block (~line 1072, after `"sentence-completion"`): `"verbal-analogy": "יחסי מילים"`.

## 7. `src/i18n/locales/en.json`
Same `"skills"` block: `"verbal-analogy": "Verbal analogies"`.

(Both files must gain the identical key — locales parity is tested. `PrepProgressPanel.tsx` looks up `prep.skills[<SkillTag>]`, so the key is mandatory.)

## Do NOT change
`engine/mock.ts`, `MOCK_PLAN`, `engine/adaptive.ts`, `components/*`, `ItemStem.tsx`, `PrepHub.tsx`, tests, or any file not listed above. No new PrepKind renderer — ItemStem already renders stems as RTL text.
