# Phase 7: Expand Story Lessons — Build Plan

**Date:** 2026-08-15
**Card:** 370aa415-3256-476a-b36d-a43a71390aa8
**Branch:** sdlc/loop-v0
**Model:** gemini-3.1-pro-low (via ask-agy --card)

> **Model delegation status:** Claude (`ask-claude --escalate --card 370aa415-...`) hit session limit on 2 attempts — both calls are logged in `~/.openclaw/bin/model-usage.jsonl` (ts: 1786784576, 1786784583, actual: "unknown", status: session-limit). Gemini CLI (`ask-agy --card`, gemini-3.1-pro-high) was attempted 4 times — first 3 returned SUCCESS but empty `response` field (a known Gemini API issue where output is consumed by thinking tokens). The 5th attempt with `gemini-3.1-pro-low` (via direct `agy` CLI call, logged manually with card ID) returned a full 195-line analysis with 45,154 tokens. All attempts are recorded with the card ID in `model-usage.jsonl`. The artifact below is built from the Gemini analysis combined with direct codebase context gathered via exec (file reads, test output, git status).

---

## 1. Current State Audit

### 1.1 Curriculum Node Inventory

| Unit | Theme | Total Nodes | LESSON | PRACTICE | SENSORY | CHALLENGE |
|------|-------|-------------|--------|----------|---------|-----------|
| unit_1 | beach | 10 | 1 (n1_3a) | 5 | 3 | 2 |
| unit_2 | forest | 10 | 1 (n2_3a) | 6 | 1 | 2 |
| unit_3 | mountain | 10 | 1 (n3_1) | 6 | 1 | 2 |
| unit_4 | desert | 10 | 1 (n4_1) | 6 | 0 | 2 |
| unit_5 | space | 10 | 0 | 6 | 1 | 3 |
| **Total** | | **50** | **4** | **29** | **6** | **11** |

### 1.2 Existing Lessons

| Node | Lesson ID | Theme | Operation | Steps | Interaction |
|------|-----------|-------|-----------|-------|-------------|
| n1_3a | addition_beach | beach | addition | 5 | drag seashells → ten-frame (3+4=7) |
| n2_3a | subtraction_forest | forest | subtraction | 4 | tap-to-remove apples (8-3=5) |
| n3_1 | multiplication_mountain | mountain | multiplication | 4 | drag crystals → 3 rows (3×2=6) |
| n4_1 | division_desert | desert | division | 4 | drag dates → 3 plates (6÷3=2) |

### 1.3 Gap Analysis

**46 of 50 nodes have no lesson.** The card title says 45 — the discrepancy is because `MultiplicationLesson` (legacy `lesson1_multiplication.ts`) exists but is not mapped to any node in `LESSONS_BY_NODE`.

**Critical gaps by world:**

| World | Existing Lessons | Missing Concepts (per card scope) |
|-------|-----------------|----------------------------------|
| 1 (beach) | addition only | counting, number sense, place value |
| 2 (forest) | subtraction only | making 10, doubles, addition strategies |
| 3 (mountain) | multiplication only | subtraction strategies, fact families |
| 4 (desert) | division only | times tables 2-5, multiplication arrays |
| 5 (space) | NONE | division with remainders, sharing, mixed ops |

### 1.4 Infrastructure Readiness

| Component | Status | Gaps |
|-----------|--------|------|
| LessonEngine | ✅ Ready | Supports drag-drop + tap-to-remove, performance tracking |
| InteractiveStoryScene | ✅ Ready | Percentage coordinate space, theme-aware |
| ItemSprite | ✅ Ready | 10 sprite types: apple, basket, number, seashell, crystal, date, bunny, tree, ten_frame, desert_animal |
| TargetArt | ✅ Ready | 4 visuals: basket, ten_frame, crystal_row, animal_plate |
| SceneBackdrop | ✅ Ready | 4 themes: beach, forest, mountain, desert |
| LessonTheme type | ⚠️ Missing 'space' | No space theme for unit_5 |
| i18n locale files | ⚠️ Incomplete | Only `lessons.multiplication.*` and `lessons.controls.*` exist. 4 newer lessons use keys that don't exist in he.json/en.json |
| Lesson registry | ⚠️ FALLBACK_LESSON | Unmapped LESSON nodes get MultiplicationMountainLesson — wrong content |
| Test suite | ✅ 952/953 passing | 1 known flaky (useMemoryGame race — pre-existing) |

---

## 2. Architecture Decisions

### 2.1 Add 'space' Theme — YES

**Decision:** Add `space` to `LessonTheme`, `THEME_PALETTES`, and `SceneBackdrop`.

**Rationale:** Unit 5 (Space Station) is the only unit with zero lessons. Without a space theme, any lesson mapped to unit_5 nodes would use a mismatched visual environment (e.g., mountain crystals in a space station). Adding a space theme is a small, self-contained change:

```typescript
// src/types/lesson.ts
export type LessonTheme = 'beach' | 'forest' | 'mountain' | 'desert' | 'space';

// src/components/lessons/scene/sceneThemes.tsx
space: {
    containerClass: 'bg-gradient-to-b from-slate-900 via-indigo-950 to-purple-950',
    ground: '#1E1B4B',
    ink: '#A5B4FC',
    slot: '#818CF8',
},
```

A `SpaceBackdrop` SVG component draws stars, a planet silhouette, and a space station ledge.

### 2.2 Convert PRACTICE Nodes vs. Add New LESSON Nodes — HYBRID

**Decision:** Convert 11 existing PRACTICE/SENSORY nodes to LESSON type AND add 5 new LESSON nodes.

**Rationale:** Converting nodes preserves the saga map layout (positions, dependencies). Adding new nodes between existing ones fills concept gaps without disrupting the map.

**Proposed node changes:**

| Action | Node ID | Unit | Current Type | New Type | Concept |
|--------|---------|------|-------------|----------|---------|
| Convert | n1_2 | 1 | PRACTICE | LESSON | Counting 1-5 |
| Keep | n1_3a | 1 | LESSON | LESSON | Addition (existing) |
| Convert | n1_7 | 1 | PRACTICE | LESSON | Missing numbers (pre-place-value) |
| Add | n1_3b | 1 | — | LESSON | Place value: tens and ones |
| Convert | n2_3 | 1 | PRACTICE | LESSON | Addition to 20 (making 10 strategy) |
| Keep | n2_3a | 2 | LESSON | LESSON | Subtraction (existing) |
| Convert | n2_6 | 2 | PRACTICE | LESSON | Missing addends (3 + ? = 5) |
| Add | n2_3b | 2 | — | LESSON | Doubles & near doubles |
| Convert | n3_3 | 3 | PRACTICE | LESSON | Times 2 (multiplication strategy) |
| Keep | n3_1 | 3 | LESSON | LESSON | Multiplication concept (existing) |
| Convert | n3_5 | 3 | PRACTICE | LESSON | Times 5 (skip counting) |
| Keep | n4_1 | 4 | LESSON | LESSON | Division concept (existing) |
| Convert | n4_2 | 4 | PRACTICE | LESSON | Divide by 2 (sharing) |
| Convert | n4_5 | 4 | PRACTICE | LESSON | Divide by 5 (grouping) |
| Add | n4_3a | 4 | — | LESSON | Times tables 3 & 4 (arrays) |
| Convert | n5_2 | 5 | PRACTICE | LESSON | Addition with zero / identity |
| Add | n5_1a | 5 | — | LESSON | Division with remainders |
| Convert | n5_8 | 5 | PRACTICE | LESSON | Multiplication tables review |
| Add | n5_5a | 5 | — | LESSON | Subtraction with borrowing |

**Total after changes: 4 (existing) + 11 (converted) + 5 (new) = 20 LESSON nodes**

This gives each world 3-4 lesson nodes, ensuring every major concept is taught before practice.

### 2.3 i18n Gap — Full Backfill

**Decision:** Add all missing lesson i18n keys to both `he.json` and `en.json`.

**Current state:** Only `lessons.multiplication.*` (5 keys) and `lessons.controls.*` (3 keys) exist. The 4 newer lessons use keys like `lessons.additionBeach.intro` that fall back to showing the key string.

**Plan:** For each lesson (existing + new), add a namespaced block:

```json
{
  "lessons": {
    "controls": { "next": "המשך", "start": "בוא נתחיל!", "finish": "סיים" },
    "multiplication": { ... },
    "additionBeach": {
      "title": "חוף החיבור",
      "intro": "שלום! ברוכים הבאים לחוף הים. בואו נלמד חיבור עם צדפות!",
      "meetFrame": "זה מסגרת העשר. היא עוזרת לנו לראות כמה יש לנו.",
      "addFirst": "גררו שלוש צדפות למסגרת!",
      "hintFirst": "גררו כל צדפה לתוך המסגרת",
      "addMore": "עכשיו הוסיפו עוד ארבע צדפות!",
      "hintMore": "גררו ארבע צדפות נוספות",
      "conclusion": "מדהים! שלוש ועוד ארבע שווה שבע!"
    },
    "subtractionForest": { ... },
    "multiplicationMountain": { ... },
    "divisionDesert": { ... },
    // ... 15 new lesson blocks
  }
}
```

**Estimated keys to add:** ~120 keys (8 keys × 15 new lessons + 32 keys for 4 existing lessons).

### 2.4 FALLBACK_LESSON — Change to Throw

**Decision:** Replace `FALLBACK_LESSON` with a dev-mode warning + throw.

**Rationale:** The fallback silently shows the wrong lesson. A throw during development catches unmapped nodes immediately. In production, a generic "intro" lesson is safer than a wrong-concept lesson.

```typescript
// src/lessons/index.ts — new behavior
export const getLessonForNode = (nodeId: string | undefined): LessonDefinition => {
    if (nodeId && LESSONS_BY_NODE[nodeId]) return LESSONS_BY_NODE[nodeId];
    if (import.meta.env?.DEV) {
        console.warn(`[lessons] No lesson mapped for node "${nodeId}" — using intro placeholder`);
    }
    return INTRO_PLACEHOLDER_LESSON; // a generic "welcome" lesson
};
```

### 2.5 New Sprite Types — Minimal Additions

**Decision:** Add 3 new sprite types and 1 new target visual. Reuse existing types wherever possible.

| New Type | Kind | Purpose | Lesson(s) |
|----------|------|---------|-----------|
| `star` | LessonItem | Counting stars, skip counting | Counting, Times 5 |
| `block` | LessonItem | Base-10 blocks (ones, tens tower) | Place value |
| `balloon` | LessonItem | Tap-to-pop for subtraction | Subtraction strategies |
| `number_line` | LessonTargetVisual | Number line with jump targets | Counting back, skip counting |

All other lessons reuse existing sprites: `seashell` (beach), `apple` (forest), `crystal` (mountain), `date` (desert), `number` (universal), `ten_frame` (place value), `bunny`/`tree` (forest scenery), `desert_animal` (camel/fox/lizard for division).

---

## 3. Lesson Module Designs

### 3.1 World 1 — Beach (Number Sense & Counting)

#### Lesson: Counting Seashells (n1_2)
```typescript
{
  id: 'counting_seashells',
  title: 'lessons.countingSeashells.title',  // ספירת צדפות
  theme: 'beach',
  operation: 'addition',  // counting is pre-addition
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.countingSeashells.intro',  // "שלום! בואו נספור צדפות על החוף!"
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'count_five', type: 'interactive_drag',
      mascotText: 'lessons.countingSeashells.countFive',  // "גררו חמש צדפות לסל!"
      mascotEmotion: 'thinking',
      items: [5 × loose seashells at various x positions, y: 20],
      targets: [basket at {x:50, y:60}, capacity:5],
      validationCriteria: (items, targets) => targets[0].currentCount === 5 },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.countingSeashells.conclusion',  // "כל הכבוד! ספרתם עד חמש!"
      mascotEmotion: 'excited',
      items: [5 placed seashells], targets: [basket with currentCount:5],
      showEquation: '1, 2, 3, 4, 5' }
  ]
}
```

#### Lesson: Place Value Tens (n1_3b — NEW NODE)
```typescript
{
  id: 'place_value_tens',
  title: 'lessons.placeValueTens.title',  // עשרות ויחידות
  theme: 'beach',
  operation: 'addition',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.placeValueTens.intro',  // "יש המון צדפות! בואו נסדר אותן בקבוצות של עשר."
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'fill_ten_frame', type: 'interactive_drag',
      mascotText: 'lessons.placeValueTens.fillFrame',  // "גררו עשר צדפות למסגרת העשר!"
      mascotEmotion: 'thinking',
      items: [12 × loose seashells],
      targets: [ten_frame capacity:10 at center, basket capacity:10 at right],
      validationCriteria: (_items, targets) => targets[0].currentCount === 10 },
    { id: 'see_remainder', type: 'dialog',
      mascotText: 'lessons.placeValueTens.seeRemainder',  // "יופי! מסגרת אחת של עשר, ועוד שתי צדפות. זה 12!"
      mascotEmotion: 'excited',
      items: [10 placed in frame + 2 loose],
      targets: [ten_frame currentCount:10],
      showEquation: '10 + 2 = 12' },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.placeValueTens.conclusion',  // "עשר ועוד שתיים שווה שתים עשרה!"
      mascotEmotion: 'excited', items: [...], targets: [...] }
  ]
}
```

#### Lesson: Missing Numbers (n1_7)
```typescript
{
  id: 'missing_numbers',
  title: 'lessons.missingNumbers.title',  // המספר החסר
  theme: 'beach',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.missingNumbers.intro',  // "אופס! חסרים מספרים בסדרה. בואו נמצא אותם!"
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'find_missing', type: 'interactive_drag',
      mascotText: 'lessons.missingNumbers.find',  // "איזה מספר מתאים במקום הריק? 1, 2, ?, 4"
      mascotEmotion: 'thinking',
      items: [number sprites: 1, 2, 3, 4, 5 — the '3' is loose and draggable],
      targets: [slot at the gap position, accepts: ['number']],
      validationCriteria: (_items, targets) => targets[0].currentCount === 1 },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.missingNumbers.conclusion',  // "מצאתם! שלוש בא אחרי שתיים ולפני ארבע."
      mascotEmotion: 'excited', showEquation: '1, 2, 3, 4, 5' }
  ]
}
```

### 3.2 World 2 — Forest (Addition Strategies)

#### Lesson: Making 10 (n2_3)
```typescript
{
  id: 'making_ten',
  title: 'lessons.makingTen.title',  // השלמה לעשר
  theme: 'forest',
  operation: 'addition',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.makingTen.intro',  // "בואו נמלא את עץ התפוחים בעשרה תפוחים!"
      mascotEmotion: 'happy', items: [tree scenery], targets: [] },
    { id: 'add_to_ten', type: 'interactive_drag',
      mascotText: 'lessons.makingTen.add',  // "יש כבר 7 תפוחים. כמה עוד צריך?"
      mascotEmotion: 'thinking',
      hint: 'lessons.makingTen.hint',  // "גררו תפוחים עד שיהיו 10"
      items: [7 placed apples on tree + 5 loose apples below],
      targets: [ten_frame capacity:10, currentCount:7],
      validationCriteria: (_items, targets) => targets[0].currentCount === 10 },
    { id: 'see_equation', type: 'dialog',
      mascotText: 'lessons.makingTen.equation',  // "שבע ועוד שלוש שווה עשר!"
      mascotEmotion: 'excited',
      showEquation: '7 + 3 = 10' },
    { id: 'try_another', type: 'interactive_drag',
      mascotText: 'lessons.makingTen.tryAnother',  // "עכשיו יש 6. כמה עוד צריך?"
      mascotEmotion: 'thinking',
      items: [6 placed + 6 loose],
      targets: [ten_frame capacity:10, currentCount:6],
      validationCriteria: (_items, targets) => targets[0].currentCount === 10 },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.makingTen.conclusion',  // "כל הכבוד! שש ועוד ארבע גם שווה עשר!"
      mascotEmotion: 'excited', showEquation: '6 + 4 = 10' }
  ]
}
```

#### Lesson: Doubles (n2_3b — NEW NODE)
```typescript
{
  id: 'doubles_forest',
  title: 'lessons.doublesForest.title',  // זוגות ביער
  theme: 'forest',
  operation: 'addition',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.doublesForest.intro',  // "פרפרים אוהבים כנפיים זהות! בואו נתאים."
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'match_doubles', type: 'interactive_drag',
      mascotText: 'lessons.doublesForest.match',  // "בצד השמאלי יש 4 נקודות. גררו 4 תפוחים לצד הימני!"
      mascotEmotion: 'thinking',
      items: [4 loose apples],
      targets: [basket capacity:4, currentCount:0],
      validationCriteria: (_items, targets) => targets[0].currentCount === 4 },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.doublesForest.conclusion',  // "ארבע ועוד ארבע זה שמונה. זוג מושלם!"
      mascotEmotion: 'excited',
      showEquation: '4 + 4 = 8' }
  ]
}
```

#### Lesson: Missing Addends (n2_6)
```typescript
{
  id: 'missing_addends',
  title: 'lessons.missingAddends.title',  // התוספת החסרה
  theme: 'forest',
  operation: 'addition',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.missingAddends.intro',  // "יש לנו 3 תפוחים. צריכים 5. כמה עוד?"
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'find_missing', type: 'interactive_drag',
      mascotText: 'lessons.missingAddends.find',  // "גררו תפוחים לסל עד שיהיו 5!"
      mascotEmotion: 'thinking',
      items: [3 placed apples in basket + 5 loose apples],
      targets: [basket capacity:5, currentCount:3],
      validationCriteria: (_items, targets) => targets[0].currentCount === 5 },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.missingAddends.conclusion',  // "שלוש ועוד שתיים שווה חמש!"
      mascotEmotion: 'excited',
      showEquation: '3 + 2 = 5' }
  ]
}
```

### 3.3 World 3 — Mountain (Subtraction Strategies & Times Tables)

#### Lesson: Subtraction Counting Back (n3_3 — converted from PRACTICE)
```typescript
{
  id: 'subtraction_countback',
  title: 'lessons.subtractionCountback.title',  // ספירה לאחור
  theme: 'mountain',
  operation: 'subtraction',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.subtractionCountback.intro',  // "הקריסטלים נופלים! בואו נספור אחורה."
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'remove_crystals', type: 'interactive_tap',
      mascotText: 'lessons.subtractionCountback.action',  // "הסירו 3 קריסטלים מהמדף!"
      mascotEmotion: 'thinking',
      hint: 'lessons.subtractionCountback.hint',  // "לחצו על קריסטלים כדי להסיר אותם"
      items: [8 crystals on a shelf (tapAction: 'remove')],
      targets: [],
      tapGoal: 3,
      validationCriteria: items => activeItems(items).filter(i => i.type === 'crystal').length === 5 },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.subtractionCountback.conclusion',  // "שמונה פחות שלוש שווה חמש!"
      mascotEmotion: 'excited',
      showEquation: '8 − 3 = 5' }
  ]
}
```

#### Lesson: Times 5 Skip Counting (n3_5 — converted from PRACTICE)
```typescript
{
  id: 'times_five_skip',
  title: 'lessons.timesFiveSkip.title',  // ספירה בקפיצות של 5
  theme: 'mountain',
  operation: 'multiplication',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.timesFiveSkip.intro',  // "כל מדף יש 5 קריסטלים. בואו נספור בקפיצות!"
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'fill_shelves', type: 'interactive_drag',
      mascotText: 'lessons.timesFiveSkip.fill',  // "גררו 5 קריסטלים לכל מדף!"
      mascotEmotion: 'thinking',
      items: [15 loose crystals],
      targets: [3 crystal_rows, capacity:5 each],
      validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 5) },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.timesFiveSkip.conclusion',  // "שלוש פעמים חמש שווה חמש עשרה!"
      mascotEmotion: 'excited',
      showEquation: '3 × 5 = 15' }
  ]
}
```

### 3.4 World 4 — Desert (Times Tables & Division)

#### Lesson: Times Tables 3 & 4 Arrays (n4_3a — NEW NODE)
```typescript
{
  id: 'times_tables_34',
  title: 'lessons.timesTables34.title',  // לוח הכפל 3 ו-4
  theme: 'desert',
  operation: 'multiplication',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.timesTables34.intro',  // "בואו נשתול תמרים במדבר! 3 שורות עם 4 בכל שורה."
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'fill_rows', type: 'interactive_drag',
      mascotText: 'lessons.timesTables34.fill',  // "גררו 4 תמרים לכל שורה!"
      mascotEmotion: 'thinking',
      items: [12 loose dates],
      targets: [3 crystal_rows (reused as date rows), capacity:4 each],
      validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 4) },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.timesTables34.conclusion',  // "שלוש פעמים ארבע שווה שתים עשרה!"
      mascotEmotion: 'excited',
      showEquation: '3 × 4 = 12' }
  ]
}
```

#### Lesson: Divide by 2 Sharing (n4_2 — converted from PRACTICE)
```typescript
{
  id: 'divide_by_two',
  title: 'lessons.divideByTwo.title',  // חלוקה לשתיים
  theme: 'desert',
  operation: 'division',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.divideByTwo.intro',  // "יש לנו 8 תמרים ושני גמלים. בואו נחלק!"
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'share_dates', type: 'interactive_drag',
      mascotText: 'lessons.divideByTwo.share',  // "גררו תמרים לכל גמל באופן שווה!"
      mascotEmotion: 'thinking',
      items: [8 loose dates],
      targets: [2 animal_plates (camel), capacity:4 each],
      validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 4) },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.divideByTwo.conclusion',  // "שמונה לחלק לשתיים שווה ארבע!"
      mascotEmotion: 'excited',
      showEquation: '8 ÷ 2 = 4' }
  ]
}
```

#### Lesson: Divide by 5 Grouping (n4_5 — converted from PRACTICE)
```typescript
{
  id: 'divide_by_five',
  title: 'lessons.divideByFive.title',  // חלוקה בחמש
  theme: 'desert',
  operation: 'division',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.divideByFive.intro',  // "יש 15 תמרים ו-3 חיות. כמה כל אחת?"
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'share_fairly', type: 'interactive_drag',
      mascotText: 'lessons.divideByFive.share',  // "חלקו 15 תמרים שווה בין 3 חיות!"
      mascotEmotion: 'thinking',
      items: [15 loose dates],
      targets: [3 animal_plates (camel, fox, lizard), capacity:5 each],
      validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 5) },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.divideByFive.conclusion',  // "חמש עשרה לחלק לשלוש שווה חמש!"
      mascotEmotion: 'excited',
      showEquation: '15 ÷ 3 = 5' }
  ]
}
```

### 3.5 World 5 — Space (Advanced Concepts)

#### Lesson: Division with Remainders (n5_1a — NEW NODE)
```typescript
{
  id: 'division_remainders',
  title: 'lessons.divisionRemainders.title',  // חילוק עם שארית
  theme: 'space',
  operation: 'division',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.divisionRemainders.intro',  // "יש לנו 14 כוכבים ו-3 תחנות. כמה כל תחנה תקבל?"
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'share_stars', type: 'interactive_drag',
      mascotText: 'lessons.divisionRemainders.share',  // "חלקו את הכוכבים שווה בין 3 תחנות!"
      mascotEmotion: 'thinking',
      items: [14 loose crystals (reused as stars)],
      targets: [3 crystal_rows, capacity:4 each],
      validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 4) },
    { id: 'see_remainder', type: 'dialog',
      mascotText: 'lessons.divisionRemainders.remainder',  // "ארבעה לכל תחנה... ונשארו שניים! זאת השארית."
      mascotEmotion: 'excited',
      items: [12 placed + 2 loose],
      showEquation: '14 ÷ 3 = 4 R2' },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.divisionRemainders.conclusion',  // "חילוק עם שארית: לא תמיד הכל מתחלק!"
      mascotEmotion: 'excited' }
  ]
}
```

#### Lesson: Subtraction with Borrowing (n5_5a — NEW NODE)
```typescript
{
  id: 'subtraction_borrow',
  title: 'lessons.subtractionBorrow.title',  // חיסור עם פריטה
  theme: 'space',
  operation: 'subtraction',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.subtractionBorrow.intro',  // "יש 50 כוכבים. צריכים להסיר 13. בואו נראה!"
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'remove_stars', type: 'interactive_tap',
      mascotText: 'lessons.subtractionBorrow.remove',  // "הסירו 13 כוכבים מהמדף!"
      mascotEmotion: 'thinking',
      items: [50 crystals on shelves (5 rows of 10)],
      targets: [],
      tapGoal: 13,
      validationCriteria: items => activeItems(items).filter(i => i.type === 'crystal').length === 37 },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.subtractionBorrow.conclusion',  // "חמישים פחות שלוש עשרה שווה שלושים ושבע!"
      mascotEmotion: 'excited',
      showEquation: '50 − 13 = 37' }
  ]
}
```

#### Lesson: Multiplication Tables Review (n5_8 — converted from PRACTICE)
```typescript
{
  id: 'multiplication_review',
  title: 'lessons.multiplicationReview.title',  // סקירת כפל
  theme: 'space',
  operation: 'multiplication',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.multiplicationReview.intro',  // "בואו נסכם! 4 שורות של 6 כוכבים כל אחת."
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'fill_grid', type: 'interactive_drag',
      mascotText: 'lessons.multiplicationReview.fill',  // "גררו 6 כוכבים לכל שורה!"
      mascotEmotion: 'thinking',
      items: [24 loose crystals],
      targets: [4 crystal_rows, capacity:6 each],
      validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 6) },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.multiplicationReview.conclusion',  // "ארבע פעמים שש שווה עשרים וארבע!"
      mascotEmotion: 'excited',
      showEquation: '4 × 6 = 24' }
  ]
}
```

#### Lesson: Addition with Zero (n5_2 — converted from PRACTICE)
```typescript
{
  id: 'addition_zero',
  title: 'lessons.additionZero.title',  // חיבור עם אפס
  theme: 'space',
  operation: 'addition',
  steps: [
    { id: 'intro', type: 'dialog',
      mascotText: 'lessons.additionZero.intro',  // "בחלל, אפס פירושו כלום! בואו נראה."
      mascotEmotion: 'happy', items: [], targets: [] },
    { id: 'add_zero', type: 'interactive_drag',
      mascotText: 'lessons.additionZero.add',  // "יש 5 כוכבים. כמה יהיה אם נוסיף אפס?"
      mascotEmotion: 'thinking',
      items: [5 placed crystals + 0 loose items],
      targets: [crystal_row capacity:5, currentCount:5],
      validationCriteria: (_items, targets) => targets[0].currentCount === 5 },
    { id: 'conclusion', type: 'dialog',
      mascotText: 'lessons.additionZero.conclusion',  // "חמש ועוד אפס שווה חמש! כלום לא השתנה."
      mascotEmotion: 'excited',
      showEquation: '5 + 0 = 5' }
  ]
}
```

---

## 4. File-by-File Implementation Plan

### 4.1 New Files to Create

| # | File | Purpose | Est. Lines |
|---|------|---------|-----------|
| 1 | `src/lessons/lesson_counting_seashells.ts` | World 1: counting 1-5 | ~70 |
| 2 | `src/lessons/lesson_place_value_tens.ts` | World 1: place value (10+2=12) | ~90 |
| 3 | `src/lessons/lesson_missing_numbers.ts` | World 1: missing numbers in sequence | ~70 |
| 4 | `src/lessons/lesson_making_ten.ts` | World 2: making 10 strategy | ~90 |
| 5 | `src/lessons/lesson_doubles_forest.ts` | World 2: doubles (4+4=8) | ~70 |
| 6 | `src/lessons/lesson_missing_addends.ts` | World 2: missing addends (3+?=5) | ~70 |
| 7 | `src/lessons/lesson_subtraction_countback.ts` | World 3: subtraction by counting back | ~70 |
| 8 | `src/lessons/lesson_times_five_skip.ts` | World 3: times 5 skip counting | ~80 |
| 9 | `src/lessons/lesson_times_tables_34.ts` | World 4: 3×4 arrays | ~80 |
| 10 | `src/lessons/lesson_divide_by_two.ts` | World 4: divide by 2 sharing | ~80 |
| 11 | `src/lessons/lesson_divide_by_five.ts` | World 4: divide by 5 grouping | ~80 |
| 12 | `src/lessons/lesson_division_remainders.ts` | World 5: division with remainders | ~90 |
| 13 | `src/lessons/lesson_subtraction_borrow.ts` | World 5: subtraction with borrowing | ~80 |
| 14 | `src/lessons/lesson_multiplication_review.ts` | World 5: multiplication tables review | ~80 |
| 15 | `src/lessons/lesson_addition_zero.ts` | World 5: addition with zero (identity) | ~70 |
| 16 | `src/lessons/__tests__/lessonRegistry.test.ts` | Registry: every LESSON node → unique lesson | ~60 |
| 17 | `src/lessons/__tests__/lessonDefinitions.test.ts` | Each lesson: 3+ steps, valid types, Hebrew keys | ~100 |
| **Total** | | | **~1,280** |

### 4.2 Files to Modify

| # | File | Changes | Est. Lines Changed |
|---|------|---------|-------------------|
| 1 | `src/types/lesson.ts` | Add `'space'` to `LessonTheme`. Add `'star'`, `'block'`, `'balloon'` to `LessonItemType`. Add `'number_line'` to `LessonTargetVisual`. | +5 |
| 2 | `src/lessons/index.ts` | Import 15 new lessons. Expand `LESSONS_BY_NODE` with 16 new entries. Replace `FALLBACK_LESSON` with `INTRO_PLACEHOLDER_LESSON`. Update `LESSONS_BY_ID`. | +60 |
| 3 | `src/data/learningPath.ts` | Convert 11 PRACTICE→LESSON nodes. Add 5 new LESSON nodes (n1_3b, n2_3b, n4_3a, n5_1a, n5_5a) with positions. | +25 |
| 4 | `src/components/lessons/scene/sceneThemes.tsx` | Add `space` to `THEME_PALETTES`. Add `SpaceBackdrop` SVG component. Wire into `SceneBackdrop`. | +40 |
| 5 | `src/components/lessons/scene/LessonSprites.tsx` | Add `Star`, `Block`, `Balloon` sprite art. Add to `SPRITE_ART` registry. | +60 |
| 6 | `src/i18n/locales/he.json` | Add ~120 Hebrew lesson keys under `lessons.*` namespace | +120 |
| 7 | `src/i18n/locales/en.json` | Add ~120 English lesson keys under `lessons.*` namespace | +120 |
| 8 | `src/components/__tests__/GameOrchestrator.lesson.test.tsx` | Add test: every LESSON node in CURRICULUM maps to a unique lesson (no fallback) | +30 |
| **Total** | | | **~460** |

### 4.3 No Changes Needed

| File | Why No Change |
|------|-------------|
| `src/engines/LessonEngine.ts` | Already supports all step types, validation, performance tracking |
| `src/components/lessons/LessonModal.tsx` | Already renders any LessonDefinition via LessonEngine |
| `src/components/lessons/InteractiveStoryScene.tsx` | Already renders items/targets by type, theme-agnostic |
| `src/components/GameOrchestrator.tsx` | Already routes LESSON nodes via `getLessonForNode()` — no routing changes needed |
| `src/hooks/useAnalytics.ts` | GA4 events already wired in LessonModal |

---

## 5. Test Plan

### 5.1 Unit Tests — Lesson Definitions (`lessonDefinitions.test.ts`)

```typescript
describe('Lesson Definitions', () => {
  const allLessons = Object.values(LESSONS_BY_ID);

  it.each(allLessons)('$id has at least 3 steps', (lesson) => {
    expect(lesson.steps.length).toBeGreaterThanOrEqual(3);
  });

  it.each(allLessons)('$id steps have valid types', (lesson) => {
    lesson.steps.forEach(step => {
      expect(['dialog', 'interactive_drag', 'interactive_tap']).toContain(step.type);
    });
  });

  it.each(allLessons)('$id has at least one interactive step', (lesson) => {
    expect(lesson.steps.some(s => s.type !== 'dialog')).toBe(true);
  });

  it.each(allLessons)('$id mascotText uses i18n key format', (lesson) => {
    lesson.steps.forEach(step => {
      expect(step.mascotText).toMatch(/^lessons\.\w+\.\w+$/);
    });
  });

  it.each(allLessons)('$id has a valid theme', (lesson) => {
    expect(['beach', 'forest', 'mountain', 'desert', 'space']).toContain(lesson.theme);
  });

  it.each(allLessons)('$id interactive steps have validation', (lesson) => {
    lesson.steps
      .filter(s => s.type !== 'dialog')
      .forEach(s => expect(s.validationCriteria).toBeDefined());
  });
});
```

### 5.2 Unit Tests — Lesson Registry (`lessonRegistry.test.ts`)

```typescript
describe('Lesson Registry', () => {
  // Extract all LESSON nodes from CURRICULUM
  const lessonNodes = CURRICULUM.flatMap(u => u.nodes).filter(n => n.type === 'LESSON');

  it('every LESSON node has a registry entry', () => {
    lessonNodes.forEach(node => {
      expect(LESSONS_BY_NODE[node.id]).toBeDefined();
      expect(LESSONS_BY_NODE[node.id]).not.toBe(INTRO_PLACEHOLDER_LESSON);
    });
  });

  it('every LESSON node maps to a unique lesson', () => {
    const mapped = lessonNodes.map(n => LESSONS_BY_NODE[n.id].id);
    expect(new Set(mapped).size).toBe(mapped.length);
  });

  it('no two nodes share the same lesson', () => {
    const nodeToLesson = lessonNodes.map(n => ({ node: n.id, lesson: LESSONS_BY_NODE[n.id].id }));
    const lessonCounts = nodeToLesson.reduce((acc, { lesson }) => {
      acc[lesson] = (acc[lesson] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(lessonCounts).forEach(([lesson, count]) => {
      expect(count).toBe(1);
    });
  });
});
```

### 5.3 GameOrchestrator Routing Test (update existing)

```typescript
describe('GameOrchestrator – all LESSON nodes route correctly', () => {
  const lessonNodes = CURRICULUM.flatMap(u => u.nodes).filter(n => n.type === 'LESSON');

  it.each(lessonNodes)('$id routes to LessonModal with correct lesson', (node) => {
    const lesson = getLessonForNode(node.id);
    expect(lesson).toBeDefined();
    expect(lesson.id).not.toBe('multiplication_mountain'); // not the old fallback

    render(<GameOrchestrator targetLevel={node.targetLevel || 1} onExit={() => {}} node={node} />);
    expect(screen.getByTestId('lesson-modal')).toBeDefined();
    expect(screen.queryByTestId('practice-mode')).toBeNull();
  });
});
```

### 5.4 E2E Test Plan

| World | Node | Lesson | E2E Steps |
|-------|------|--------|-----------|
| 1 | n1_2 | counting_seashells | Open node → see dialog → drag 5 seashells → see conclusion → complete |
| 2 | n2_3 | making_ten | Open node → see dialog → drag 3 apples to fill 10-frame → see equation → complete |
| 3 | n3_3 | subtraction_countback | Open node → see dialog → tap 3 crystals to remove → see equation → complete |
| 4 | n4_2 | divide_by_two | Open node → see dialog → drag 8 dates to 2 camels → see equation → complete |
| 5 | n5_1a | division_remainders | Open node → see dialog → drag 12 stars to 3 stations → see remainder → complete |

### 5.5 Regression Safeguards

- Run full test suite before and after: `npx vitest run`
- Verify 952 existing passing tests remain green
- The 1 known flaky test (useMemoryGame) is pre-existing and not a regression
- TypeScript: `npx tsc -b` must pass with no new errors
- Build: `npm run build` must succeed

---

## 6. Risk Assessment

### 6.1 High Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| i18n keys missing → lessons show key strings instead of Hebrew | Kids see "lessons.countingSeashells.intro" instead of Hebrew text | Add ALL keys to he.json/en.json before testing lessons. Add a test that validates every `mascotText` key exists in locale files. |
| Curriculum node conversion breaks saga progression | Kids can't progress past a converted node | Keep `targetLevel` and `position` unchanged. Only change `type` and add `config` if needed. Run existing progression tests. |
| New LESSON nodes break SagaMap layout | Visual overlap or broken paths | Position new nodes between existing ones using interpolated y coordinates. Test SagaMap renders all nodes. |

### 6.2 Medium Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Space theme sprites look wrong | Visual mismatch in World 5 | Reuse crystal sprite (faceted gem works as space crystal). Add star sprite only if needed. |
| `interactive_tap` with 50 items (subtraction_borrow) is slow | UI jank with many sprites | Limit to 5 rows × 10 crystals. Engine already handles tap efficiently. |
| `tapGoal` validation with large numbers | Off-by-one in validation | Use `activeItems(items).filter(i => i.type === 'crystal').length` — same pattern as SubtractionForestLesson. |

### 6.3 Low Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| New sprite types not rendered | Items show as apples (fallback) | ItemSprite falls back to apple art. Add new art in same PR. |
| LESSONS_BY_ID grows large | Slower lookups | Still <30 entries — O(1) record lookup, negligible. |
| Legacy MultiplicationLesson orphaned | Dead code | Keep it exported (tests reference it). Remove in a separate cleanup PR. |

### 6.4 Ordering Dependencies

```
1. types/lesson.ts (add 'space', new sprite types)
   ↓
2. sceneThemes.tsx (add space theme + backdrop)
   ↓
3. LessonSprites.tsx (add new sprite art)
   ↓
4. lesson_*.ts modules (15 new files)
   ↓
5. lessons/index.ts (import + register all lessons)
   ↓
6. learningPath.ts (convert/add LESSON nodes)
   ↓
7. he.json + en.json (add all i18n keys)
   ↓
8. Test files (registry, definitions, routing)
   ↓
9. Run tests → fix → green
```

---

## 7. Implementation Order

### Phase 7a — Foundation (do first, unblocks everything)

| Step | File(s) | Est. Time |
|------|---------|-----------|
| 1 | `src/types/lesson.ts` — add 'space' theme, new sprite/target types | 10 min |
| 2 | `src/components/lessons/scene/sceneThemes.tsx` — add space palette + SpaceBackdrop | 30 min |
| 3 | `src/components/lessons/scene/LessonSprites.tsx` — add Star, Block, Balloon art | 40 min |

### Phase 7b — Lesson Modules (can be done in parallel per world)

| Step | File(s) | Est. Time |
|------|---------|-----------|
| 4 | World 1 lessons: counting_seashells, place_value_tens, missing_numbers | 60 min |
| 5 | World 2 lessons: making_ten, doubles_forest, missing_addends | 60 min |
| 6 | World 3 lessons: subtraction_countback, times_five_skip | 45 min |
| 7 | World 4 lessons: times_tables_34, divide_by_two, divide_by_five | 60 min |
| 8 | World 5 lessons: division_remainders, subtraction_borrow, multiplication_review, addition_zero | 75 min |

### Phase 7c — Integration (after all modules exist)

| Step | File(s) | Est. Time |
|------|---------|-----------|
| 9 | `src/lessons/index.ts` — import all 15 lessons, expand registry, replace fallback | 20 min |
| 10 | `src/data/learningPath.ts` — convert 11 nodes, add 5 new nodes | 30 min |
| 11 | `src/i18n/locales/he.json` + `en.json` — add ~120 keys each | 60 min |

### Phase 7d — Tests & Validation

| Step | File(s) | Est. Time |
|------|---------|-----------|
| 12 | `src/lessons/__tests__/lessonDefinitions.test.ts` | 30 min |
| 13 | `src/lessons/__tests__/lessonRegistry.test.ts` | 20 min |
| 14 | Update `GameOrchestrator.lesson.test.tsx` | 20 min |
| 15 | Run full test suite, fix regressions | 30 min |
| 16 | `npx tsc -b` + `npm run build` | 10 min |

### Phase 7e — E2E (optional, can follow in separate PR)

| Step | Description | Est. Time |
|------|-------------|-----------|
| 17 | E2E test: sample lesson from each world | 90 min |

**Total estimated effort: ~10 hours**

---

## 8. Lesson-to-Node Mapping Summary

| Node ID | Lesson ID | Theme | Operation | Concept |
|---------|-----------|-------|-----------|---------|
| n1_2 | counting_seashells | beach | addition | Counting 1-5 |
| n1_3a | addition_beach | beach | addition | 3+4=7 (EXISTING) |
| n1_3b | place_value_tens | beach | addition | 10+2=12 (NEW NODE) |
| n1_7 | missing_numbers | beach | addition | Missing numbers in sequence |
| n2_3 | making_ten | forest | addition | Making 10 strategy |
| n2_3a | subtraction_forest | forest | subtraction | 8-3=5 (EXISTING) |
| n2_3b | doubles_forest | forest | addition | 4+4=8 (NEW NODE) |
| n2_6 | missing_addends | forest | addition | 3+?=5 |
| n3_1 | multiplication_mountain | mountain | multiplication | 3×2=6 (EXISTING) |
| n3_3 | subtraction_countback | mountain | subtraction | 8-3=5 counting back |
| n3_5 | times_five_skip | mountain | multiplication | 3×5=15 skip counting |
| n4_1 | division_desert | desert | division | 6÷3=2 (EXISTING) |
| n4_2 | divide_by_two | desert | division | 8÷2=4 sharing |
| n4_3a | times_tables_34 | desert | multiplication | 3×4=12 arrays (NEW NODE) |
| n4_5 | divide_by_five | desert | division | 15÷3=5 grouping |
| n5_1a | division_remainders | space | division | 14÷3=4 R2 (NEW NODE) |
| n5_2 | addition_zero | space | addition | 5+0=5 identity |
| n5_5a | subtraction_borrow | space | subtraction | 50-13=37 borrowing (NEW NODE) |
| n5_8 | multiplication_review | space | multiplication | 4×6=24 review |

**20 LESSON nodes total (4 existing + 11 converted + 5 new)**
**15 new lesson modules to create**
**Zero LESSON nodes falling back to practice mode**

---

## 9. Existing Lesson i18n Backfill

The 4 existing lessons (additionBeach, subtractionForest, multiplicationMountain, divisionDesert) use i18n keys that don't exist in the locale files. This must be fixed as part of this phase:

| Lesson | Keys to add |
|--------|------------|
| additionBeach | title, intro, meetFrame, addFirst, hintFirst, addMore, hintMore, conclusion |
| subtractionForest | title, intro, count, action, hintAction, conclusion, bunnyName |
| multiplicationMountain | title, intro, setup, action, hintAction, conclusion |
| divisionDesert | title, intro, setup, action, hintAction, conclusion, camel, fox, lizard |

These are in addition to the ~120 new keys for the 15 new lessons.

---

## 10. Success Criteria Checklist

- [ ] 20 LESSON nodes in CURRICULUM (up from 4)
- [ ] 19 unique lessons in LESSONS_BY_NODE (one per node, no duplicates)
- [ ] Zero LESSON nodes use FALLBACK_LESSON / INTRO_PLACEHOLDER_LESSON
- [ ] All 19 lessons have 3+ steps with at least 1 interactive step
- [ ] All mascot text keys exist in both he.json and en.json
- [ ] 'space' theme renders correctly in SceneBackdrop
- [ ] 952+ tests passing (no regressions)
- [ ] `npx tsc -b` passes
- [ ] `npm run build` succeeds
- [ ] Sample lesson from each world playable in dev mode
