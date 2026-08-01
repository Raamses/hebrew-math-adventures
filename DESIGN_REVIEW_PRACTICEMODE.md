# Design Review: PracticeMode — Mobile UX/UI

**Reviewer:** Senior Mobile Game UX/UI Designer  
**Date:** 2026-08-01  
**Scope:** PracticeMode layout, PracticeHeader, SettingsMenu, MathCard, SessionProgressBar, PracticeFeedback  
**Target:** Mobile-first (320–414px width), Hebrew RTL primary  

---

## Problem 1: Streak Badge Overlapping Title

### Diagnosis

**Root cause: Simple arithmetic. The three header elements cannot fit in 288px of usable width on a 320px screen.**

Width breakdown on a 320px viewport (smallest common mobile):

| Element | Estimated Width |
|---|---|
| Container padding `p-4` | 32px (16×2) |
| Available width | **288px** |
| Streak badge (Zap 16px + "171" ~24px + gap 8px + divider 1px + gap 8px + "Lv 1" ~28px + padding pl-3 pr-2 ~20px) | **~113px** |
| Gap-2 | 8px |
| Title "הרפתקאות חשבון" (Hebrew, text-sm font-bold, ~9 chars) | **~120–140px** |
| Gap-2 | 8px |
| Settings button (p-2 + Settings size=28) | **~44px** |
| **Total needed** | **~293–313px** |

At 320px viewport, the total exceeds available width by 5–25px. The `flex-1` + `truncate` on the title prevents visual overflow, but truncation means the title gets clipped to "הרפתקאות…" or similar — which looks broken, not intentional.

**Even on a 375px iPhone SE viewport** (343px usable), the elements total ~293–313px, leaving only 30–50px of breathing room. The header feels cramped.

**The title "הרפתקאות חשבון" / "Math Adventures" is 100% branding.** During active gameplay, the user (a child) gets zero value from seeing it. It competes with functional elements for the most precious real estate on mobile: the top bar.

### Fix

**Hide the title on mobile. Show it only on `sm:` breakpoint (≥640px) and up.**

```tsx
// PracticeHeader.tsx — replace the h1 with:
<h1 className="hidden sm:block flex-1 text-center text-lg font-bold text-primary truncate drop-shadow-sm">
    {t('app.title')}
</h1>
```

This instantly frees ~120–140px on mobile. The header becomes:

```
[⚡ 171 | Lv 1]                    [⚙️]
```

The streak badge (~113px) + gap (8px) + settings button (~44px) = ~165px, well within 288px. Comfortable spacing.

**If branding is desired on mobile**, use a much smaller approach — show only the app icon/logo (24×24px) as a static element, not the full text title. But honestly, the home screen / mode selector already establishes branding. The practice screen doesn't need it.

### Additional Badge Improvements

- **Remove "Lv 1" from the badge during gameplay.** The level is contextual (set before practice starts) and doesn't change mid-session. Showing it adds ~37px of width for zero functional value. Move it to the ModeSelectorOverlay or SessionSummary where it's contextually relevant.
- **Simplified badge:** Just `⚡ 171` with the lightning icon. ~60px wide. Very clean.

```tsx
// Simplified streak badge
<div className="flex-shrink-0 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm pl-3 pr-3 py-1.5 rounded-full shadow-sm border border-orange-100">
    <Zap size={16} className="text-orange-500 fill-orange-500" />
    <span className="font-bold text-slate-700 text-sm">{profile.streak || 0}</span>
</div>
```

---

## Problem 2: Settings Menu Hidden Behind MathCard

### Diagnosis

**Root cause: Stacking context + z-index conflict.**

The z-index hierarchy is:

```
PracticeMode root (div)
├── PracticeHeader wrapper — z-40, relative
│   └── PracticeHeader — z-10 (creates own stacking context)
│       └── SettingsMenu container — z-50 (relative)
│           └── Dropdown — absolute, top-full (descends below header)
├── SessionProgressBar — no z-index (default auto)
├── MathCard wrapper — z-40, relative
│   └── MathCard — no explicit z-index
└── PracticeFeedback — fixed, z-40
```

**The critical issue:** Both the header wrapper and the MathCard wrapper are `z-40` with `position: relative`. In CSS, when elements share the same z-index, the later one in DOM order paints on top. The MathCard wrapper comes AFTER the header wrapper in the DOM. So:

1. The header wrapper creates a stacking context at z-40.
2. Inside that context, the SettingsMenu dropdown is z-50 — but z-50 is relative to the **header's** stacking context, not the root.
3. The MathCard wrapper is also z-40 at the root level, but later in DOM.
4. **Result:** The MathCard's stacking context paints OVER the header's entire stacking context, including the z-50 dropdown that visually descends into the MathCard's territory.

Even though the dropdown is z-50 *inside* the header, from the root perspective, the header's z-40 caps everything inside it. The MathCard's z-40 (later in DOM) wins.

### Fix

**Option A (Recommended): Use `z-50` on the header wrapper, `z-30` on the MathCard wrapper.**

This creates a clear hierarchy: header (z-50) > MathCard (z-30). The dropdown inside the header will render above the MathCard.

```tsx
// PracticeMode.tsx — header wrapper
<div className="w-full max-w-md z-50 relative mb-2">
    <PracticeHeader ... />
</div>

// PracticeMode.tsx — MathCard wrapper  
<div className="w-full max-w-md z-30 relative mt-4">
    <MathCard ... />
</div>
```

**Why not use a portal?** React portals (`createPortal`) would work technically, but they add complexity: the dropdown needs to know its trigger's position for alignment, and you'd need to handle RTL flipping, scroll containment, and resize observers. For a simple 4-item dropdown that opens downward, fixing z-index hierarchy is simpler, more maintainable, and equally effective.

**Option B (Alternative): Use fixed positioning on the dropdown.** This escapes the stacking context entirely but requires JavaScript to position it relative to the gear button. More complex, not recommended.

### Additional Settings Menu Fix

The SettingsMenu container has `z-50` which is misleading — it only works *within* its parent stacking context. Remove it to avoid confusion:

```tsx
// SettingsMenu.tsx — change from z-50 to z-auto (or remove)
<div className="relative" ref={menuRef}>
```

The parent header's z-index is what matters now.

---

## Problem 3: Overall Design Proportions

### Diagnosis

The current layout has several proportion issues for a kids' math game on mobile:

**3a. MathCard is oversized for mobile.**

The MathCard uses `max-w-md` (28rem = 448px) and `p-6` (24px padding all around). On a 320px screen, the card is 288px wide (constrained by parent `max-w-md` + `p-4` page padding) with 48px of internal padding, leaving only 192px for content. The arithmetic equation at `text-3xl` (30px) with `gap-2` and a 64px NumberInput creates a cramped equation.

The vertical space consumed:
- Title (h2, text-2xl): ~36px
- Equation row (text-3xl + NumberInput h-16): ~80px
- Submit button (py-4, text-2xl): ~72px
- Padding (p-6 × 2): 48px
- Margins (mb-4, mb-6): ~40px
- **Total: ~276px**

On a 568px-tall iPhone SE, with the header (~48px) + progress bar (~60px) + card (~276px) + page padding (32px) = ~416px. That leaves ~152px — barely enough for the mascot peeking at the bottom. On shorter screens or with the keyboard open, the card can push the mascot off-screen.

**3b. Vertical spacing is inconsistent.**

- Header: `mb-2` (8px) — tight
- Progress bar: `mb-6` (24px) — loose
- MathCard: `mt-4` (16px) — moderate
- SessionProgressBar itself has `mb-6` (24px) — plus the header `mb-2` = 32px gap total between header and card

The spacing rhythm is: 8px → 24px → 24px → 16px → 24px. No clear pattern.

**3c. Header height `h-12` (48px) is actually fine** for touch targets (minimum 44px on iOS), but feels visually heavy when packed with three elements on a narrow screen.

**3d. The submit button is too large.** `py-4` (32px vertical padding) + `text-2xl` (24px) + Check icon (32px) = ~88px tall. That's nearly 1/6 of the viewport height. For a kids' game where the answer input is already the focus, the submit button should be prominent but not dominant.

### Fix

**3a. Reduce MathCard padding on mobile:**

```tsx
// MathCard.tsx — change p-6 to p-4 sm:p-6
"w-full max-w-md bg-white rounded-3xl shadow-xl p-4 sm:p-6 relative overflow-hidden transition-all duration-500"
```

This gives 16px padding on mobile (192px → 256px content width) and 24px on larger screens. Much more breathing room.

**3b. Standardize vertical spacing to a consistent rhythm:**

Use a consistent `mb-3` (12px) between major sections:

```tsx
// PracticeMode.tsx
// Header wrapper: mb-2 → mb-3
<div className="w-full max-w-md z-50 relative mb-3">

// SessionProgressBar: mb-6 → mb-3 (in the component)
<div className="w-full max-w-md mb-3 px-4">

// MathCard wrapper: mt-4 → mt-3 (or remove mt, since progress bar already has mb-3)
<div className="w-full max-w-md z-30 relative">
```

Spacing rhythm becomes: 12px → 12px → 12px. Clean, predictable, consistent.

**3c. Keep header at h-12** — it's fine for touch. With the title hidden on mobile, the three elements become two, and h-12 gives comfortable spacing.

**3d. Reduce submit button size on mobile:**

```tsx
// MathCard.tsx — submit button
"w-full py-3 sm:py-4 bg-primary hover:bg-orange-600 text-white text-xl sm:text-2xl font-bold rounded-2xl"
```

`py-3` (12px) + `text-xl` (20px) = ~52px on mobile. `py-4` + `text-2xl` = ~72px on larger screens. Still prominent, but not overwhelming.

**3e. Reduce the equation font size on small screens:**

```tsx
// ArithmeticView.tsx — current: text-3xl sm:text-5xl
// Change to: text-2xl sm:text-5xl
"flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-2xl sm:text-5xl font-bold text-slate-800 mb-4 sm:mb-6"
```

`text-2xl` (24px) vs `text-3xl` (30px) — 20% smaller, still very readable for a math equation, and prevents line-wrapping on narrow screens with 3-digit numbers.

---

## Additional Improvements

### A. MathCard Max Width — Consider `max-w-sm` on Mobile

The `max-w-md` (448px) on the MathCard and its wrapper means on a 414px iPhone Pro Max, the card nearly fills the width. On a 320px screen, the card is constrained by the page padding, not the max-width. Consider `max-w-sm` (384px) for a slightly tighter, more focused card that doesn't stretch awkwardly on larger phones:

```tsx
// Both PracticeMode wrapper and MathCard itself
"w-full max-w-sm sm:max-w-md ..."
```

### B. Feedback Overlay Should Use Different Z-Index

The MathCard's feedback overlay (the white `bg-white/90` that covers the card on wrong answers) uses `z-10` *inside* the MathCard. This is fine within the card's own stacking context. But if the MathCard wrapper drops to `z-30` (from Problem 2 fix), this overlay still works correctly because it's relative to the card, not the page.

### C. SessionProgressBar — Reduce Horizontal Padding

Currently `px-4` (16px each side) on top of the page's `p-4`. That's 32px of total horizontal inset for the progress bar. On a 320px screen, the progress bar is only 224px wide. Remove the `px-4` from SessionProgressBar since the parent already has `p-4`:

```tsx
// SessionProgressBar.tsx
<div className="w-full max-w-md mb-3">  // removed px-4
```

### D. Header Background — Consider Removing the Badge Background

The streak badge has `bg-white/90 backdrop-blur-sm` which creates a visible white pill against the gradient background. On mobile with only two elements (badge + settings), the white pill feels heavy. Consider making the badge transparent or using a subtle `bg-orange-50/80`:

```tsx
"flex-shrink-0 flex items-center gap-1.5 bg-orange-50/80 backdrop-blur-sm pl-2.5 pr-2.5 py-1.5 rounded-full shadow-sm border border-orange-100/50"
```

### E. Settings Gear — Reduce Icon Size

`Settings size={28}` is large for a header button. On mobile, 24px is standard for header icons:

```tsx
<Settings size={24} />
```

### F. ArcadeHUD — `max-w-2xl` Inconsistency

The ArcadeHUD uses `max-w-2xl` (672px) while everything else uses `max-w-md` (448px). This means in arcade modes, the HUD is wider than the header and MathCard. It should match:

```tsx
// ArcadeHUD.tsx — change max-w-2xl to max-w-md
<div className="w-full max-w-md mx-auto mb-3 px-4">
```

### G. PracticeFeedback Mascot — Z-Index Alignment

With the new z-index hierarchy (header z-50, MathCard z-30), the mascot at `z-40` sits between them. This is fine — the mascot is fixed-position and at the bottom of the screen, so it never visually conflicts with the header. But for clarity, consider `z-20` since it should never overlap the card either (it peeks from the right edge).

Actually, `z-40` is fine — the mascot is `pointer-events-none` and peeks from the edge. No conflict.

### H. Consider a Bottom-Aligned Layout

For a kids' math game, a bottom-weighted layout often works better:

```
[Header: streak + settings]          ← top, minimal
[Progress bar]                       ← top, minimal
[Flexible spacer]                    ← grows to fill
[MathCard]                           ← centered or bottom
[Submit button could be sticky]     ← thumb-reachable
```

This keeps the math card in the "thumb zone" (lower 2/3 of mobile screen) and makes the submit button easily reachable with one hand. The current top-aligned layout pushes the card up, which is fine for viewing but less ergonomic for frequent tapping.

This is a larger structural change — flag as a future enhancement, not an immediate fix.

---

## Priority Order

| Priority | Fix | Impact | Effort |
|---|---|---|---|
| **P0** | **Hide title on mobile** (Problem 1) | Eliminates overlap, frees 120px+ | Trivial (1 class change) |
| **P0** | **Fix z-index hierarchy** (Problem 2) | Settings menu becomes accessible | Trivial (2 class changes) |
| **P1** | **Reduce MathCard padding** (Problem 3a) | More content space on mobile | Trivial (1 class change) |
| **P1** | **Simplify streak badge** (remove "Lv 1") | Cleaner header, saves 37px | Small (remove 2 elements) |
| **P1** | **Standardize vertical spacing** (Problem 3b) | Consistent visual rhythm | Small (3 class changes) |
| **P2** | **Reduce submit button size on mobile** (Problem 3d) | Less visual dominance | Trivial (1 class change) |
| **P2** | **Reduce equation font size on mobile** (Problem 3e) | Prevents wrapping with large numbers | Trivial (1 class change) |
| **P2** | **Remove SessionProgressBar px-4** (Improvement C) | Wider progress bar | Trivial (1 class change) |
| **P2** | **Fix ArcadeHUD max-width** (Improvement F) | Visual consistency | Trivial (1 class change) |
| **P3** | **Reduce settings gear icon to 24px** (Improvement E) | Slightly less visual weight | Trivial (1 prop change) |
| **P3** | **Badge background color tweak** (Improvement D) | Softer visual | Trivial (1 class change) |
| **P3** | **MathCard max-w-sm on mobile** (Improvement A) | Tighter card on large phones | Small (responsive class) |
| **P4** | **Bottom-aligned layout** (Improvement H) | Better thumb ergonomics | Large (structural refactor) |

---

## Summary of Concrete Changes

### Files to modify:

**`src/components/practice/PracticeHeader.tsx`**
1. Hide `<h1>` on mobile: `className="hidden sm:block flex-1 text-center text-lg font-bold text-primary truncate"`
2. Remove "Lv 1" divider and text from streak badge
3. Simplify badge: remove divider, reduce padding to `pl-2.5 pr-2.5`
4. (Optional) Change badge bg to `bg-orange-50/80`

**`src/components/PracticeMode.tsx`**
1. Header wrapper: `z-40` → `z-50`
2. MathCard wrapper: `z-40` → `z-30`
3. Header wrapper: `mb-2` → `mb-3`
4. MathCard wrapper: `mt-4` → remove (or `mt-0`), since progress bar already has `mb-3`

**`src/components/SettingsMenu.tsx`**
1. Container: remove `z-50` (or change to `z-auto`), keep `relative`

**`src/components/MathCard.tsx`**
1. Card padding: `p-6` → `p-4 sm:p-6`
2. Submit button: `py-4 text-2xl` → `py-3 sm:py-4 text-xl sm:text-2xl`

**`src/components/math-card/ArithmeticView.tsx`**
1. Equation font: `text-3xl sm:text-5xl` → `text-2xl sm:text-5xl`
2. Equation margin: `mb-6` → `mb-4 sm:mb-6`

**`src/components/SessionProgressBar.tsx`**
1. Container: `mb-6 px-4` → `mb-3` (remove px-4)
2. Progress bar height: keep `h-4` (fine)

**`src/components/games/ArcadeHUD.tsx`**
1. Container: `max-w-2xl mb-6 px-4` → `max-w-md mb-3 px-4`

**`src/components/SettingsMenu.tsx` (gear icon)**
1. `<Settings size={28} />` → `<Settings size={24} />`

---

## Key Decisions Answered

**Q: Should the title be visible during gameplay on mobile?**  
**A: No.** Hide it on `<sm`. It's branding that competes for space with functional elements. The mode selector and home screen establish branding. On tablet+ (`sm:`), there's room to show it.

**Q: Should the streak badge be simplified?**  
**A: Yes.** Remove "Lv 1" — it doesn't change mid-session and adds 37px. Just `⚡ 171`. The level is contextually shown in the mode selector and summary.

**Q: Should settings use a portal?**  
**A: No.** Fixing the z-index hierarchy (header z-50 > card z-30) is simpler and equally effective. Portals add positioning complexity for no benefit here.

**Q: Is the MathCard the right size?**  
**A: Almost.** Reduce padding from `p-6` to `p-4` on mobile. Consider `max-w-sm` on phones for a slightly tighter feel. The card should feel focused, not sprawling.

**Q: Is the vertical spacing appropriate?**  
**A: No.** It's inconsistent (8px → 24px → 24px → 16px → 24px). Standardize to 12px (`mb-3`) between all major sections for a clean rhythm.

**Q: Should the header be h-10?**  
**A: No.** `h-12` (48px) is correct for touch targets. With only 2 elements on mobile (badge + gear), there's plenty of room. Don't sacrifice touch ergonomics for compactness.

**Q: Should the submit button be smaller?**  
**A: Yes, on mobile.** `py-3 text-xl` instead of `py-4 text-2xl`. Still prominent and tappable, but not consuming 1/6 of the viewport.

---

*End of review. This document is intended to brief implementation subagents. No code changes have been made.*