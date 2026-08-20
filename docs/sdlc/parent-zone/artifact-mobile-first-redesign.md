# Parent Zone Mobile-First Redesign — Implementation Artifact

**Card:** 9a6fcc12-704b-45a8-80b2-9a0bb2076a74
**Model:** claude-opus-5 (analysis/review via ask-claude --escalate)
**Date:** 2026-08-20
**Status:** COMPLETE

## Overview
Redesigned the Parent Zone for mobile-first (360px primary target) with RTL Hebrew support.
All changes pass TypeScript compilation and 1080/1083 tests (3 pre-existing failures unrelated to this work).

## Claude Opus 5 Review Findings (6 issues identified & resolved)

1. **Parent gate origin tracking** — Added `parentGateOrigin` state to App.tsx so exiting the dashboard returns to the correct screen (map vs select).
2. **EditProfileModal RTL via portal** — Added global `document.documentElement.dir` handling in i18n.ts so portals inherit RTL correctly.
3. **Touch target sizes** — Edit/delete buttons changed from w-8 h-8 (32px) to w-11 h-11 (44px) with aria-labels.
4. **Fixed bottom bar + max-w-md** — Bottom bar constrained to `max-w-md mx-auto` + `env(safe-area-inset-bottom)` padding for iPhone home indicator.
5. **Grid hole prevention** — Time StatCard gets `col-span-2 sm:col-span-1` className so 5 cards in 2-col grid have no holes.
6. **Games tab visibility** — Shipped as visible "Coming Soon" tab with 3 preview game cards (opacity-60, "בקרוב" badges).

## Files Changed (11 total)

### 1. ParentDashboard.tsx (REWRITTEN)
- `max-w-4xl` → `w-full max-w-md mx-auto` (phone-first)
- Top tabs → fixed bottom tab bar with 4 tabs (Profiles, Progress, Games, Skills)
- `pb-24` on root for bottom bar clearance
- `dir={i18n.dir()}` on root div
- Bottom bar: `max-w-md mx-auto` constrained, `env(safe-area-inset-bottom)` padding
- Tab buttons: `flex-1 flex flex-col items-center gap-1 py-2 min-h-[64px]`
- Active: `text-blue-500 border-t-2 border-blue-500`, Inactive: `text-slate-400 border-t-2 border-transparent`
- ARIA: `role="tab"`, `aria-selected`, `aria-label` on each tab

### 2. ProfileManager.tsx (REWRITTEN)
- `grid grid-cols-12` table → `space-y-3` stacked profile cards
- Each card: `bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-slate-100`
- Avatar: `w-12 h-12` (48px)
- Name + age + mascot stacked vertically with `flex-1 min-w-0` for truncation
- Streak badge: `bg-orange-50 border border-orange-100 px-2 py-1 rounded-full`
- Edit/delete: `w-11 h-11` (44px tap targets) with `aria-label`
- Danger zone: preserved, full-width

### 3. ProgressOverview.tsx (UPDATED)
- `grid-cols-3 sm:grid-cols-5` → `grid-cols-2 sm:grid-cols-5 gap-3`
- Time card: `col-span-2 sm:col-span-1` (no grid hole on mobile)
- Profile selector: `min-h-[44px]` added

### 4. SkillBreakdown.tsx (UPDATED)
- `grid-cols-1 sm:grid-cols-2` kept but `gap-3` on mobile
- Practice buttons: `min-h-[44px]` (was `min-h-[48px]` on some, `min-h-[40px]` on others — unified)
- Profile selector: `min-h-[44px]` added

### 5. App.tsx (UPDATED)
- Added `parentGateOrigin` state: `'select' | 'map'`
- `handleParentAccessFromSelector()` — sets origin to 'select'
- `handleParentAccessFromMap()` — sets origin to 'map'
- `handleParentExit()` — returns to origin screen
- `onParentAccess` prop passed to SagaMap
- ParentGate rendered when `showParentGate && effectiveView === 'map'`

### 6. SagaMap.tsx (UPDATED)
- Added `Settings` to lucide-react import
- Added `onParentAccess?: () => void` to `SagaMapProps`
- Added "Parent Zone" menu item in popover (gear icon, slate/blue gradient)
- `data-testid="parent-zone-button"` for testing
- Positioned before the divider, after Badges

### 7. ParentGamesHub.tsx (NEW)
- Placeholder component for Games tab
- Header card with Gamepad2 icon and "Coming Soon" message
- 3 upcoming game preview cards (Equation of the Day, Parent Blitz, Number Merge)
- All cards `opacity-60` with "בקרוב" badges
- Ready to be replaced with actual game components in Phase 2

### 8. StatCard.tsx (UPDATED)
- Added optional `className` prop for grid spanning

### 9. EditProfileModal.tsx (UPDATED)
- `dir="rtl"` → `dir={i18n.dir()}` (language-aware)
- Added `i18n` to `useTranslation()` destructuring

### 10. WeeklyChart.tsx (UPDATED)
- Removed hardcoded `dir="rtl"` (now inherited from document.documentElement)

### 11. StreakHeatmap.tsx (UPDATED)
- Removed hardcoded `dir="rtl"` (now inherited from document.documentElement)

### 12. i18n.ts (UPDATED)
- Added `languageChanged` event listener to set `document.documentElement.dir` and `lang`
- Set initial direction on module load
- Ensures all components (including portals) inherit correct RTL/LTR direction

## Test Results
- TypeScript: `tsc --noEmit` — PASS (0 errors)
- Vitest: 1080 pass, 3 fail (pre-existing, unrelated — lesson definitions & registry)
- No regressions introduced

## Manual Test Checklist
- [ ] Parent gate from SagaMap gear → dashboard → exit returns to **map**
- [ ] Parent gate from ProfileSelector → dashboard → exit returns to **select**
- [ ] EditProfileModal renders RTL (labels right, close button on left)
- [ ] WeeklyChart / StreakHeatmap day order reads right-to-left in Hebrew
- [ ] iPhone with home indicator: bottom tab bar not clipped, last content row reachable
- [ ] Viewport 375 / 414 / 768 / 1280: content column and tab bar stay aligned
- [ ] All 5 ProgressOverview stat cards visible, no grid hole
- [ ] Every tap target ≥44px (edit, delete, tabs, skill practice buttons)
- [ ] Screen reader: each tab and icon-only button announces a name; active tab announces selected
- [ ] Danger zone reachable inside max-w-md, not hidden under fixed bar
- [ ] Deep-link/refresh while view=parent doesn't strand the user
- [ ] Games tab shows Coming Soon with 3 preview cards
