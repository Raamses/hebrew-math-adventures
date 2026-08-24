# Parents Zone — Mobile-First Revamp

Target: 360×640 baseline (iPhone SE / low-end Android), Hebrew RTL primary, English secondary.
Stack reality check: **Tailwind v4, CSS-first config, no `tailwind.config.js`.** Theme lives in `src/index.css` `@theme`. No `safelist` — every class must appear as a literal in source.

---

## 0. Findings that change the plan

Read this first — five of these are live defects, not style nits, and three of them force design decisions below.

| # | Finding | Evidence | Impact |
|---|---|---|---|
| **F1** | **`onPracticeSkill` is never supplied.** `ParentDashboard` is rendered once, with only `onExit`. Both "תרגלו!" buttons are gated on `{onPracticeSkill && …}` so **they never render.** | `App.tsx:82`; `SkillBreakdown.tsx:136,189` | The Skills tab's only interactive feature is dead. Wiring it needs a new `GameOrchestrator` prop — it has no `problemConfig` input (`GameOrchestrator.tsx:19-26`). |
| **F2** | **StreakHeatmap is off by one day.** Cells are built from *local* midnight then serialized with `.toISOString()`; stamps are written from *UTC now*. In Israel (UTC+2/+3) `new Date(2026,7,20).toISOString().slice(0,10)` → `"2026-08-19"`. | `StreakHeatmap.tsx:38` vs `QuestContext.tsx:77` | Every activity renders one cell late. Today never lights up on the day you played. |
| **F3** | **Heatmap cells aren't square.** `height:16px` is explicit and the week columns are `flex-1`, so `aspectRatio:'1'` is overridden. At 360px each cell is ~57×16px. | `StreakHeatmap.tsx:71,76-81` | It renders as stripes, not a heatmap. Forces the layout rethink in §3.5. |
| **F4** | **WeeklyChart text is horizontally stretched.** `viewBox="0 0 100 120"` + `preserveAspectRatio="none"` at 360px wide → x-scale 3.6, y-scale 1.0. | `WeeklyChart.tsx:18-21` | Day labels and value labels are distorted 3.6:1. Fix by rendering bars in HTML, not SVG (§3.6). |
| **F5** | **`ProgressOverview` and `SkillBreakdown` each own an independent `selectedProfileId`.** | `ProgressOverview.tsx:17`, `SkillBreakdown.tsx:58` | Switching kid in one tab silently doesn't switch the other. Lifting this is a prerequisite for the tab merge in §1. |
| **F6** | **`UserProfile.isParent` exists, is sanitized, and is never set or read.** | `types/user.ts:23`, `ProfileContext.tsx:134-138` | Free foundation for the Games tab — parent profiles are already a modeled concept. Also means `allProfiles` currently makes no kid/parent distinction. |
| **F7** | **32px action buttons** (`w-8 h-8`) and **hover-only affordance** (`opacity-90 group-hover:opacity-100`). | `ProfileManager.tsx:63,66,73` | Below the 48px target; hover doesn't exist on touch. |
| **F8** | `StatCard` has `min-w-[100px]` inside a `grid-cols-3`. Min-width on a grid item overflows the track. | `StatCard.tsx:12`, `ProgressOverview.tsx:74` | This is the actual cause of the "5 cards cramp" symptom — the grid can't shrink below 3×100px + gaps. |
| **F9** | `ParentDashboard` sets **no `dir`**; `ParentGate` uses physical `left-4`; `WeeklyChart`/`StreakHeatmap`/`EditProfileModal` hardcode `dir="rtl"`. | `ParentGate.tsx:66`, `WeeklyChart.tsx:16`, `StreakHeatmap.tsx:57` | This *is* the "RTL inconsistent" complaint. Convention fix in §6. |
| **F10** | `setShowGreeting(true)` is called **during render** in the derived-view block. | `App.tsx:46-48` | Returning to `'select'` while a profile exists re-fires the mascot greeting. Directly affects the parent-zone exit path (§4). |

Two more constraints to design within:
- **No react-router.** Screens are a `useState` union at `App.tsx:29` dispatched by early `return`s.
- **No safe-area utilities exist.** The only usage in the repo is one arbitrary value, `SagaMap.tsx:72`. `viewport-fit=cover` *is* set (`index.html:6`), so `env()` works.

---

## 1. Information architecture — 4 tabs

The core move: **merge Progress + Skills into one tab.** They are both "analytics about one selected kid", both render their own duplicate profile `<select>` (F5), and neither fills a screen on its own. Merging frees the slot for Games without going to five tabs, and deletes the desync bug for free.

| Tab | id | Icon | Contains | Sourced from |
|---|---|---|---|---|
| **בית** (Home) | `home` | `Home` | Kid switcher, today's snapshot (3 stats), streak strip, "needs work" callout + practice CTA, quick actions | new + top of `ProgressOverview` |
| **התקדמות** (Progress) | `progress` | `BarChart3` | Full stat grid, weekly chart, activity calendar, overall accuracy, per-skill bars, strongest/weakest | `ProgressOverview` + `SkillBreakdown`, merged |
| **משחקים** (Games) | `games` | `Gamepad2` | 4 parent games (§5) | new |
| **ניהול** (Manage) | `manage` | `Settings2` | Profile cards (edit/delete), add profile, parent profile, danger zone | `ProfileManager` |

**Why Home is worth a slot rather than defaulting to Progress:** the dashboard currently opens on *Profiles*, which is the tab a parent needs least often. The 90%-case question is "did my kid practice, and are they stuck on anything?" — that should be the landing screen, answerable without scrolling or tapping. Manage moves to last position because it's the rare, destructive-adjacent tab.

**Shared state lifted to `ParentDashboard`** (fixes F5):

```tsx
const [selectedProfileId, setSelectedProfileId] = useState<string>('');
const kids = useMemo(() => allProfiles.filter(p => !p.isParent), [allProfiles]);
const selectedProfile = useMemo(
  () => kids.find(p => p.id === selectedProfileId) ?? kids[0],
  [kids, selectedProfileId],
);
```

Passed as props to `home` / `progress` panels. `ProgressOverview` and `SkillBreakdown` both drop their local `selectedProfileId` state and their `<select>` block entirely.

---

## 2. Navigation — bottom tab bar

New file: `src/components/parent/ParentTabBar.tsx`

```tsx
import React from 'react';
import { Home, BarChart3, Gamepad2, Settings2, type LucideIcon } from 'lucide-react';

export type TabId = 'home' | 'progress' | 'games' | 'manage';
export interface ParentTab { id: TabId; label: string; Icon: LucideIcon; }

interface Props {
  tabs: ParentTab[];
  active: TabId;
  onChange: (id: TabId) => void;
}

export const ParentTabBar: React.FC<Props> = ({ tabs, active, onChange }) => (
  <nav
    role="tablist"
    aria-label="Parents Zone"
    className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur-md lg:hidden"
  >
    <div className="mx-auto flex max-w-lg items-stretch">
      {tabs.map(({ id, label, Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            id={`parent-tab-${id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`parent-panel-${id}`}
            data-testid={`parent-tab-${id}`}
            onClick={() => onChange(id)}
            className={`relative flex min-h-[60px] flex-1 cursor-pointer flex-col items-center
                        justify-center gap-1 px-1 transition-colors active:scale-[0.97]
                        ${isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 mx-auto h-1 w-8 rounded-b-full bg-primary"
              />
            )}
            <Icon size={22} aria-hidden="true" />
            <span className="text-[11px] font-bold leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
```

**RTL correctness, three specific points:**

1. **Tab order needs no code.** The bar is `flex` inside a `dir="rtl"` subtree, so DOM order = logical order and the browser reverses the visual axis. Do **not** add `flex-row-reverse` — that would double-reverse under LTR.
2. **The active indicator uses `inset-x-0 mx-auto`, not `left-1/2 -translate-x-1/2`.** Auto-margin centering is direction-agnostic; a `-translate-x-1/2` offset is not, and would sit off-centre when `dir` flips.
3. **`pb-safe`, not `pb-[env(...)]` on the buttons.** Padding goes on the `<nav>` so the home-indicator gutter is bar-coloured; the tap targets stay a clean 60px above it.

**Desktop (`lg:`)** — the bar is `lg:hidden`; render a vertical rail instead so the 4-tab model stays consistent:

```tsx
<aside className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1 lg:border-e lg:border-slate-200 lg:bg-white lg:p-3">
  {/* same tabs, className: flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[48px] text-sm font-bold text-start */}
</aside>
```

Note `lg:border-e` — logical inline-end border, so the rail's divider lands on the correct side in both directions.

---

## 3. Per-component mobile layouts

### 3.0 Prerequisite — safe-area utilities

There is nothing to reuse (F: only `SagaMap.tsx:72` uses `env()` at all). Add to `src/index.css` after the `@theme` block:

```css
:root {
  --safe-t: env(safe-area-inset-top, 0px);
  --safe-b: env(safe-area-inset-bottom, 0px);
  --pz-nav-h: 3.75rem;           /* 60px bottom tab bar */
}

@utility pt-safe { padding-top: var(--safe-t); }
@utility pb-safe { padding-bottom: var(--safe-b); }
/* scroll container bottom padding: nav + home indicator + breathing room */
@utility pb-nav  { padding-bottom: calc(var(--pz-nav-h) + var(--safe-b) + 1rem); }
```

`@utility` is the Tailwind v4 replacement for `plugin()`/`addUtilities`. These are static utilities, so they need no `--value()` handling.

### 3.1 `ParentDashboard` — shell

| | Before | After |
|---|---|---|
| root | `min-h-screen bg-slate-50 p-4 sm:p-6` | `flex min-h-[100dvh] flex-col bg-slate-50` + `dir={i18n.dir()}` |
| container | `max-w-4xl mx-auto` | `mx-auto w-full max-w-lg lg:max-w-4xl` |
| nav | top `flex gap-2 … overflow-x-auto` | bottom `ParentTabBar` |
| padding | on root | on the scroll area only |

`min-h-screen` → `min-h-[100dvh]`: `100vh` on mobile Safari is the *large* viewport and sits under the collapsing URL bar, which would hide the bottom nav on load.

```tsx
export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onExit, onPracticeSkill }) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const { allProfiles } = useProfile();
  const [selectedProfileId, setSelectedProfileId] = useState('');

  const kids = useMemo(() => allProfiles.filter(p => !p.isParent), [allProfiles]);
  const selectedProfile = useMemo(
    () => kids.find(p => p.id === selectedProfileId) ?? kids[0],
    [kids, selectedProfileId],
  );

  const tabs: ParentTab[] = [
    { id: 'home',     label: t('parent.tabs.home'),     Icon: Home },
    { id: 'progress', label: t('parent.tabs.progress'), Icon: BarChart3 },
    { id: 'games',    label: t('parent.tabs.games'),    Icon: Gamepad2 },
    { id: 'manage',   label: t('parent.tabs.manage'),   Icon: Settings2 },
  ];

  return (
    <div
      data-testid="parent-dashboard"
      dir={i18n.dir()}
      className="flex min-h-[100dvh] flex-col bg-slate-50 lg:flex-row"
    >
      <ParentSideRail tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky app bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 pt-safe backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-2 px-4 lg:max-w-4xl">
            <h1 className="truncate text-lg font-black text-slate-800">
              {t(`parent.tabs.${activeTab}`)}
            </h1>
            <button
              onClick={onExit}
              data-testid="parent-exit"
              className="-me-2 flex min-h-[48px] min-w-[48px] cursor-pointer items-center
                         justify-center gap-1.5 rounded-xl px-2 text-sm font-bold
                         text-slate-500 transition-colors active:scale-95 hover:bg-slate-100"
            >
              <LogOut size={20} aria-hidden="true" />
              <span className="hidden sm:inline">{t('parent.exit')}</span>
            </button>
          </div>
        </header>

        {/* Scroll area */}
        <main
          id={`parent-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`parent-tab-${activeTab}`}
          className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-nav lg:max-w-4xl lg:pb-8"
        >
          {activeTab === 'home' && <ParentHome … />}
          {activeTab === 'progress' && <ProgressOverview … />}
          {activeTab === 'games' && <ParentGames … />}
          {activeTab === 'manage' && <ProfileManager />}
        </main>
      </div>

      <ParentTabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
    </div>
  );
};
```

`-me-2` (logical margin-inline-end) pulls the 48px hit box flush to the container edge without visually over-indenting — the physical `-mr-2` would flip wrong in LTR.

### 3.2 `KidSwitcher` — replaces both `<select>`s

A native `<select>` is a poor mobile control here (opens a wheel, hides avatars, and there are rarely more than 3 kids). Horizontal avatar chips instead. New file `src/components/parent/KidSwitcher.tsx`:

```tsx
<div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  <div role="radiogroup" aria-label={t('analytics.selectProfile')} className="flex w-max gap-2">
    {kids.map(kid => {
      const isActive = kid.id === selectedId;
      return (
        <button
          key={kid.id}
          role="radio"
          aria-checked={isActive}
          onClick={() => onSelect(kid.id)}
          className={`flex min-h-[48px] shrink-0 cursor-pointer items-center gap-2 rounded-full
                      border px-3 py-2 text-sm font-bold transition-all active:scale-95
                      ${isActive
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600'}`}
        >
          <span className="text-lg leading-none">{kid.avatarId}</span>
          <span className="max-w-[8ch] truncate">{kid.name}</span>
        </button>
      );
    })}
  </div>
</div>
```

`-mx-4 px-4` lets the strip bleed to the screen edges while keeping the first/last chip aligned to the content grid — the standard mobile carousel trick. Hidden scrollbar keeps it clean on desktop. `w-max` on the inner flex prevents chips from being squashed instead of scrolling.

### 3.3 `StatCard` — vertical → horizontal

Fixes F8 (the `min-w-[100px]` overflow) and makes the label readable at 360px.

```tsx
export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color = 'text-slate-700' }) => (
  <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-xl" aria-hidden="true">
      {icon}
    </div>
    <div className="min-w-0">
      <div dir="ltr" className={`truncate text-lg font-black leading-tight ${color}`}>{value}</div>
      <div className="truncate text-[11px] font-medium text-slate-400">{label}</div>
    </div>
  </div>
);
```

Changes: `min-w-[100px]` → `min-w-0` (allows grid shrink), `flex-col` → `flex` row, and **`dir="ltr"` on the value**. That last one matters: values are `"0/150"` and `"12 דק'"`; without the isolate a fraction renders as `150/0` in an RTL context. This matches the repo's existing convention (`common/MathText.tsx:5`).

Grid in `ProgressOverview`:
```diff
-<div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
+<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
```
2 columns at 360px = ~166px per card, comfortable for icon + two lines.

### 3.4 `ProfileManager` — 12-col grid → card list

Delete the entire `grid-cols-12` header row and row markup (`ProfileManager.tsx:32-91`). There is no responsive rescue for a 5-column table at 360px; the header row alone needs ~400px before content.

```tsx
<section>
  <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wide text-slate-400">
    {t('parent.manageProfiles')}
  </h2>

  <ul className="flex flex-col gap-3">
    {allProfiles.map(profile => (
      <li key={profile.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Identity row */}
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full
                          border border-indigo-100 bg-indigo-50 text-2xl">
            {profile.avatarId}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-black text-slate-800">{profile.name}</div>
            <div className="truncate text-xs text-slate-400">
              {t('parent.table.age')} {profile.age} · <span className="capitalize">{profile.mascotId}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50
                          px-2.5 py-1 text-sm font-black text-amber-700">
            <span aria-hidden="true">⚡</span>
            <span dir="ltr">{profile.streak || 0}</span>
          </div>
        </div>

        {/* Actions — always visible, 48px, full-width split */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setEditingProfile(profile)}
            className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2
                       rounded-xl bg-blue-50 font-bold text-blue-600
                       transition-colors active:scale-[0.98] hover:bg-blue-100"
          >
            <Edit size={18} aria-hidden="true" />
            {t('parent.edit.tooltip')}
          </button>
          <button
            onClick={() => handleDelete(profile.id, profile.name)}
            className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2
                       rounded-xl bg-red-50 font-bold text-red-600
                       transition-colors active:scale-[0.98] hover:bg-red-100"
          >
            <Trash2 size={18} aria-hidden="true" />
            {t('parent.delete.tooltip')}
          </button>
        </div>
      </li>
    ))}
  </ul>
</section>
```

Fixes F7: 32px → 48px, and the `group-hover` opacity is gone (labels are now always visible with text, not icon-only).

**Danger zone** — keep, but move it behind a disclosure so it isn't one mis-tap from the bottom of a scroll:

```tsx
<details className="mt-6 rounded-2xl border border-red-100 bg-red-50/60">
  <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-4
                      font-bold text-red-700 [&::-webkit-details-marker]:hidden">
    <AlertTriangle size={20} aria-hidden="true" />
    {t('parent.danger.title')}
  </summary>
  <div className="border-t border-red-100 px-4 py-4">
    <p className="mb-3 text-sm text-red-600">{t('parent.danger.warning')}</p>
    <button className="min-h-[48px] w-full rounded-xl border border-red-200 bg-white px-4
                       font-bold text-red-600 active:scale-[0.98] hover:bg-red-600 hover:text-white">
      {t('parent.danger.reset')}
    </button>
  </div>
</details>
```

Also worth queueing (not blocking): both destructive paths use native `confirm()` (`ProfileManager.tsx:14,103`). On mobile that's an OS dialog with no RTL control and no styling. Replace with a bottom-sheet `ConfirmSheet` in a follow-up.

### 3.5 `StreakHeatmap` → activity calendar

This needs a reframe, not a reskin. Fixes F2 and F3.

**Layout: transpose to 7 columns (days) × 6 rows (weeks).** With weeks-as-columns you get 5 tracks across ~330px — cells are either huge or, as today, non-square stripes. Days-as-columns gives 7 tracks ≈ 43px cells, which are square, touch-sized, and read as a familiar month calendar rather than a developer-tool graph.

```tsx
<div className="w-full">
  <div className="mb-1.5 grid grid-cols-7 gap-1.5">
    {dayLabels.map((l, i) => (
      <div key={i} className="text-center text-[10px] font-medium text-slate-400">{l}</div>
    ))}
  </div>
  <div className="grid grid-cols-7 gap-1.5">
    {cells.map(cell => (
      <div
        key={cell.date}
        title={cell.title}
        className={`aspect-square w-full rounded-md ${
          cell.future ? 'bg-slate-100'
          : cell.active ? 'bg-green-500'
          : 'bg-slate-200'
        } ${cell.isToday ? 'ring-2 ring-primary ring-offset-1' : ''}`}
      />
    ))}
  </div>
</div>
```

`aspect-square w-full` in a `grid-cols-7` track — no fixed `height`, so nothing overrides the ratio (F3). Drop the inline `style` block entirely; drop `dir="rtl"` and inherit from the dashboard root (F9) — the grid flows right-to-left automatically, which is the correct Hebrew calendar order.

**And fix the date math (F2)** — replace `.toISOString().slice(0,10)` with a local formatter:

```tsx
// src/lib/dateKey.ts  — shared, because QuestContext:77 and skillAnalysis:96 have the same bug class
export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
```

Use it in `StreakHeatmap` for cell keys **and** in `QuestContext` where stamps are written, or the two will disagree in the other direction. Migrating existing stamps isn't required — the drift is ≤1 day and self-corrects as new stamps land — but say so explicitly in the PR rather than letting it look intentional.

### 3.6 `WeeklyChart` — SVG → HTML bars

Fixes F4. `preserveAspectRatio="none"` cannot be kept alongside text; the two are incompatible. HTML bars also cost less code and are RTL-free.

```tsx
export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data }) => {
  const max = Math.max(...data.map(d => d.correct), 1);
  return (
    <div className="flex h-32 items-end gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          {d.correct > 0 && (
            <span className="text-[10px] font-bold text-blue-700" dir="ltr">{d.correct}</span>
          )}
          <div
            className={`w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400
                        transition-all ${d.correct > 0 ? '' : 'opacity-15'}`}
            style={{ height: `${Math.max((d.correct / max) * 100, 2)}%` }}
          />
          <span className="text-[10px] font-semibold text-slate-400">{d.day}</span>
        </div>
      ))}
    </div>
  );
};
```

Only `height` stays inline — it's a computed percentage, and Tailwind v4 has no safelist, so an interpolated `h-[…]` class would be stripped at build time.

### 3.7 `SkillBreakdown` — folded into the Progress tab

Keep the bars; drop the wrapper. Concretely: remove the profile `<select>` (lines 89-103, now the shared `KidSwitcher`) and export the two halves separately so `ProgressOverview` can interleave them:

- `SkillHighlights` — strongest/weakest cards. `grid-cols-1 sm:grid-cols-2` is already correct; only change is the practice button, which currently sits in a `flex` row with text and will overflow at 360px. Move it to its own full-width row: wrap the card in `flex-col`, and give the button `w-full min-h-[48px] mt-3`.
- `SkillBars` — the per-skill list. Already stacks fine. One fix: `justify-between` with `{insight.avgSpeedSec}s avg` — that `avg` is a hardcoded English string (`SkillBreakdown.tsx:178`) in a Hebrew UI. Move to `t('analytics.avgSpeed')`, which already exists in `he.json:236` and is unused.

### 3.8 `EditProfileModal` — bottom sheet on mobile

Centre-anchored modals put form fields under the keyboard on a 640px-tall phone. Make it a sheet below `sm:`:

```tsx
<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
  <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe
                  sm:max-w-md sm:rounded-3xl sm:pb-5">
```

Drop the hardcoded `dir="rtl"` (`EditProfileModal.tsx:64`) — inherit from the dashboard root (F9).

### 3.9 `ParentGate`

Mostly fine — it's already `max-w-sm` and centred. Three fixes:

```diff
-<div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm relative" dir={i18n.dir()}>
+<div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl sm:p-8" dir={i18n.dir()}>
   <button
-    className="absolute top-4 left-4 text-slate-400 hover:text-slate-600"
+    className="absolute top-3 end-3 grid h-11 w-11 cursor-pointer place-items-center
+               rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
   >
```
and the problem display should be direction-isolated like every other math expression in the repo:
```diff
-<div className="text-4xl font-bold text-center mb-8 text-primary tracking-wider">
+<div dir="ltr" className="mb-8 text-center text-4xl font-bold tracking-wider text-primary">
```
`left-4` → `end-4` preserves today's RTL appearance (in RTL, `end` = left) while flipping correctly in English (F9). The close button also goes from ~24px to a 44px hit box.

---

## 4. Route fix — parent access from SagaMap

### 4.1 Where the entry point goes

**Recommendation: an item in SagaMap's existing hamburger drawer, below the separator, next to Language and Logout.** Not a floating gear.

Rationale: the drawer already holds the grown-up controls (language, logout), the pattern and styling exist to copy verbatim (`SagaMap.tsx:182-201`), and it adds zero new chrome to a map screen that already carries brand + 2 balance pills + pet + menu in a 360px header. A visible gear on the map is also more discoverable to a bored 7-year-old, and the gate is only a 2-digit sum.

### 4.2 `SagaMap.tsx`

```diff
 interface SagaMapProps {
     onNodeSelect: (node: LearningNode) => void;
     onLogout: () => void;
     onArcadeMode: (mode?: ArcadeMode, dailyMode?: string, dailyTarget?: number) => void;
     onOpenPet: () => void;
+    onParentAccess: () => void;
 }
```

Insert after the separator at `SagaMap.tsx:245`, matching the drawer item shape exactly:

```tsx
<button
  data-testid="parent-access-map"
  onClick={() => { setIsMenuOpen(false); onParentAccess(); }}
  className="flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded-2xl
             border border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100
             p-2.5 text-start text-slate-800 transition-all
             active:scale-[0.98] hover:from-slate-100 hover:to-slate-200"
  title={t('parent.title')}
  aria-label={t('parent.title')}
>
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                  bg-slate-600 text-white shadow-xs">
    <Users size={19} aria-hidden="true" />
  </div>
  <div className="min-w-0 flex-1">
    <div className="text-sm font-black text-slate-900">{t('parent.title')}</div>
    <div className="truncate text-[11px] text-slate-600/80">{t('parent.mapSubtitle')}</div>
  </div>
</button>
```

Note the subtitle goes through `t()`. The three existing drawer items hardcode `isRtl ? 'עברית' : 'English'` inline (`SagaMap.tsx:198,219,240`) — don't copy that part; it's untranslated string literals sitting in JSX.

### 4.3 `App.tsx` — the real work

Three problems to solve at once: the gate is only mounted in the `!profile` branch (`App.tsx:93`); exit is hardcoded to `'select'` (`App.tsx:82`); and returning to `'select'` with a live profile re-fires the mascot greeting through the render-phase `setShowGreeting` (F10).

```diff
+type View = 'select' | 'map' | 'game' | 'parent' | 'pet';
+
-  const [view, setView] = useState<'select' | 'map' | 'game' | 'parent' | 'pet'>('select');
+  const [view, setView] = useState<View>('select');
   const [showParentGate, setShowParentGate] = useState(false);
+  const [parentReturnTo, setParentReturnTo] = useState<Exclude<View, 'parent'>>('select');
+
+  const openParentGate = (returnTo: Exclude<View, 'parent'>) => {
+    setParentReturnTo(returnTo);
+    setShowParentGate(true);
+  };
```

Then restructure the early-return chain into a `renderScreen()` so the gate can be mounted once, above every screen:

```diff
-  if (effectiveView === 'parent') {
-    return <ParentDashboard onExit={() => setView('select')} />;
-  }
-  …
-  if (!profile) {
-    return (
-      <>
-        <ProfileSelector onParentAccess={() => setShowParentGate(true)} />
-        {showParentGate && ( <ParentGate … /> )}
-      </>
-    );
-  }
+  const renderScreen = () => {
+    if (effectiveView === 'parent') {
+      return <ParentDashboard onExit={() => setView(parentReturnTo)} />;
+    }
+    if (effectiveView === 'pet') {
+      return <PetScreen onBack={() => setView('map')} />;
+    }
+    if (!profile) {
+      return <ProfileSelector onParentAccess={() => openParentGate('select')} />;
+    }
+    if (effectiveView === 'map') {
+      return (
+        <>
+          {showGreeting && profile && ( <MascotGreeting … /> )}
+          <SagaMap
+            onNodeSelect={handleNodeSelect}
+            onLogout={handleLogout}
+            onArcadeMode={handleArcadeMode}
+            onOpenPet={() => setView('pet')}
+            onParentAccess={() => openParentGate('map')}
+          />
+        </>
+      );
+    }
+    if (effectiveView === 'game') { return <GameOrchestrator … />; }
+    return null;
+  };
+
+  return (
+    <>
+      {renderScreen()}
+      {showParentGate && (
+        <ParentGate
+          onSuccess={() => { setShowParentGate(false); setView('parent'); }}
+          onCancel={() => setShowParentGate(false)}
+        />
+      )}
+    </>
+  );
```

Why this works with the existing derived-view logic:
- `App.tsx:41`'s `view !== 'parent'` guard already exempts the parent view from the no-profile reset, so entering from the selector still works.
- `setView(parentReturnTo)` with `parentReturnTo === 'map'` and a live profile → `effectiveView === 'map'` **without** passing through `'select'`, so the render-phase `setShowGreeting(true)` at line 46 never fires. Exiting the parent zone no longer replays the mascot greeting (F10).
- The gate is a `fixed inset-0 z-50` overlay (`ParentGate.tsx:62`), so hoisting it out of the branch is safe — it stacks above the map's `z-40` header and drawer backdrop. It sits *below* the arcade modal's `z-[100]`, which is fine since the two can't co-occur.

Also delete the render-phase `console.log` at `App.tsx:37` while you're in there.

### 4.4 Wiring `onPracticeSkill` (F1)

This is the one item with real depth beyond the parent folder, so treat it as its own change:

1. `App.tsx`: add `const [practiceConfig, setPracticeConfig] = useState<BaseProblemConfig | undefined>()`.
2. `handlePracticeSkill = (cfg) => { setPracticeConfig(cfg); setSelectedNode(null); setView('game'); }` — guard on `profile` being present, since the parent zone is reachable logged-out.
3. Pass `onPracticeSkill={profile ? handlePracticeSkill : undefined}` — the existing `{onPracticeSkill && …}` gates then correctly hide the CTA when there's no kid selected.
4. `GameOrchestrator`: add `practiceConfig?: BaseProblemConfig` to `GameOrchestratorProps` (`GameOrchestrator.tsx:19-26`) and forward it to `PracticeMode`.
5. Clear it in `handleGameExit` alongside the other mode state.

**Unverified:** I did not read `PracticeMode`'s props, so step 4's landing signature is an assumption. Confirm how `PracticeMode` currently derives its problem stream from `targetLevel` before estimating this one.

---

## 5. Games tab

### Design constraints these are built to

- **90 seconds or less.** A parent opens this while the kid brushes teeth.
- **No backend.** There is no auth server in play; everything is localStorage via `ProfileContext`. So "competitive between parents" means *asynchronous* comparison (shared seed + share string), not live multiplayer. Anything else would be a promise the stack can't keep.
- **Tie back to the kid.** A generic brain-teaser pack is a bolt-on that dies after a week. Each game below either uses the kid's real data or produces something the kid receives.

`isParent` (F6) becomes live here: the Games tab creates/uses a parent profile so parent scores never pollute kid analytics. `arcadeStats: Record<string, number>` already exists on `UserProfile` and needs no schema change to hold parent bests.

---

### Game 1 — מכירים את הילד? (*Know Your Kid?*)

**Build first.** It needs zero new data model and it's the one that makes the whole tab make sense.

A calibration quiz where the content *is* the analytics. 5 questions, ~45 seconds, generated entirely from `capabilities.skills` (`{attempts, correct, avgSpeedMs}` per skill — `types/progress.ts:1-8`):

| Q type | Prompt | Scoring |
|---|---|---|
| Multiple choice | "In which skill is Maya strongest?" — 4 skill options | exact |
| Slider 0-100 | "Her accuracy in חיסור בשאילה?" | by closeness: `max(0, 100 - |guess - actual| * 3)` |
| Multiple choice | "Which skill does she answer fastest?" (`avgSpeedMs`) | exact |
| Slider | "Minutes practised this week?" (`sessionHistory.durationSec`) | by closeness |
| Binary | "Is she improving or plateauing in כפל?" (`consecutiveCorrect` trend) | exact |

Each answer reveals the real number inline with a mini bar, so the parent learns the profile by being wrong about it. Final screen: a calibration score ("You know Maya 72%") plus a deep link into the Progress tab.

Empty state: requires ≥3 skills with ≥5 attempts; otherwise show "play a bit more first" rather than generating nonsense questions.

*Why parents like it:* it's about their kid, it's slightly humbling, and it's genuinely funny to get it wrong. It also solves the real problem that nobody reads bar charts voluntarily.

---

### Game 2 — ספרינט ההורים (*Parent Sprint*)

The retention driver. **60-second adult mental-math run, once per day, same problems for everyone.**

Mechanics:
- Difficulty escalates every 15s: (0-15s) 2-digit ± with carry/borrow → (15-30s) single × 2-digit, division with remainder → (30-45s) percentages, 2-digit × 2-digit → (45-60s) mixed order-of-operations.
- +10 per correct; ×1.5 multiplier after 5 straight; wrong answer costs 3 seconds rather than ending the run.
- One attempt per calendar day. Separate parent streak, stored on the parent profile — it does **not** touch `dailyStamps`, which drives the kid's streak.
- Share string: `🧮 ספרינט ההורים 20/08 — 340 נק׳ 🔥5`

**This is where "competitive between parents" lands, honestly.** Seed the problem generator from the date string so every parent gets an identical run; comparison then happens by pasting scores into whatever chat they already use. No server, and the fairness property is real rather than claimed.

Implementation notes:
- Needs a **seeded PRNG** — `RandomUtils` is not seedable. Add ~5 lines of mulberry32 and thread a seed through `ProblemFactory`, or generate the day's 40-problem list up front from the seed.
- Adult difficulty needs no new engine: `BaseProblemConfig` has `min`/`max` plus an `[key: string]: any` index signature (`ProblemFactory.ts:12-18`), so `{ type: 'multiplication', min: 12, max: 99 }` works today.
- Store best in `arcadeStats['PARENT_SPRINT']`.

---

### Game 3 — דו-קרב הורה־ילד (*Parent–Kid Duel*)

The one worth building the tab for. **Pass-and-play on one device, with an automatic handicap.**

Mechanics:
- 7 alternating rounds, first to 4.
- The kid gets problems at their calibrated `capabilities.estimatedLevel`. The parent gets `estimatedLevel + 6` (clamped to the engine's range) **and** a shorter clock — 8s vs the kid's 20s.
- **Rubber-banding:** if either side goes 2 ahead, the leader's next timer drops 2s. The result is that most duels end 4-3, which is the entire point — a kid who gets crushed won't play twice, and a parent who wins effortlessly won't either.
- Hand-off screen between turns is mandatory on a shared phone: `fixed inset-0 z-50` full-bleed, big avatar, "העבירו את המכשיר ל…", one 48px "מוכן" button. Without it the next player sees the previous player's problem.
- Both players earn coins; the winner earns more. Never zero for the kid.

`MemoryDuelGame.tsx` already exists with two-player turn structure and correct `dir="ltr"` math isolation — start from its shape rather than greenfield.

---

### Game 4 — חידת השבוע (*Weekly Teaser*)

The "not arithmetic" slot. One genuine logic puzzle per week, no timer.

- Puzzle types: 4×4 KenKen-lite, balance/weighing, river-crossing, sequence-with-a-twist.
- Three-hint ladder; each hint spent reduces the "elegance" score. No fail state.
- **Cross-link:** solving it unlocks a *מתנת הורה* — the parent picks a kid and sends 25 coins or a shop item. The kid sees it on their map as a gift from a parent. This is what stops the Games tab from being a silo.
- Content lives in `src/data/parentTeasers.ts`, selected by ISO week number.

**Build last — the cost here is content authoring, not code.** A pool of 52 hand-written, tested, Hebrew-localised puzzles is a genuine writing project, and a thin pool that repeats is worse than no tab. Ship 8-10 and cycle only if you're willing to say so in the UI.

---

### Games tab layout

```tsx
<div className="flex flex-col gap-3">
  {/* Featured — today's sprint */}
  <button className="flex min-h-[96px] w-full items-center gap-4 rounded-3xl
                     bg-gradient-to-br from-indigo-500 to-purple-600 p-4
                     text-start text-white shadow-md active:scale-[0.98]">
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-3xl">🧮</div>
    <div className="min-w-0 flex-1">
      <div className="text-base font-black">{t('parentGames.sprint.title')}</div>
      <div className="truncate text-xs text-white/80">{t('parentGames.sprint.subtitle')}</div>
    </div>
    {done
      ? <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">✓</span>
      : <ChevronLeft className="shrink-0 rtl:rotate-180" size={20} aria-hidden="true" />}
  </button>

  {/* Remaining three — 2-up */}
  <div className="grid grid-cols-2 gap-3">
    {/* min-h-[120px] rounded-2xl border border-slate-200 bg-white p-4 flex flex-col items-start gap-2 */}
  </div>
</div>
```

Note `rtl:rotate-180` on the chevron. Tailwind v4 ships the `rtl:` variant natively (it keys off the ancestor `dir`), and it's the correct tool for directional *glyphs* — as opposed to layout, which flips on its own. The repo currently solves this with a JS ternary at `ProfileSelector.tsx:30` (`i18n.dir() === 'rtl' ? '←' : '→'`); the CSS variant is cheaper and doesn't need the hook.

---

## 6. RTL convention (fixes F9)

The repo has three competing conventions. Settle on one for `src/components/parent/**`:

1. **One `dir` per screen root.** `dir={i18n.dir()}` on the `ParentDashboard` root and on the `ParentGate` panel. Every descendant inherits. **Delete** the hardcoded `dir="rtl"` in `WeeklyChart.tsx:16`, `StreakHeatmap.tsx:57`, and `EditProfileModal.tsx:64` — they currently pin those subtrees to RTL even in English.
2. **Logical utilities everywhere else:** `ps-*`/`pe-*`, `ms-*`/`me-*`, `start-*`/`end-*`, `text-start`/`text-end`, `border-s`/`border-e`. Tailwind v4 supports all of these natively.
3. **`dir="ltr"` on every numeric/math value** — stat values, streak counts, accuracy percentages, fractions like `0/150`. This already exists as a repo-wide convention (`common/MathText.tsx:5` plus ~14 call sites with tests asserting it); the parent components are the part that skipped it.
4. **`rtl:` variant for directional glyphs only** (chevrons, arrows), not for layout.

One correction to a claim you may hit while doing this: `fixed`-positioned elements *do* inherit `direction` from their DOM parent, so `fixed start-3` resolves correctly — the `isRtl ? 'left-3' : 'right-3'` ternary at `SagaMap.tsx:164-166` isn't required by the platform. It works, so leave it, but don't propagate the pattern into new code.

---

## 7. Build order

Each phase ships independently.

| Phase | Scope | Notes |
|---|---|---|
| **1 — Shell** | `@utility` block in `index.css`; `ParentTabBar`; `ParentDashboard` restructure; `KidSwitcher`; lift `selectedProfileId` (F5) | No new features. Purely the frame. |
| **2 — Content reflow** | `ProfileManager` cards (F7); `StatCard` (F8); `StreakHeatmap` transpose + `toDateKey` (F2, F3); `WeeklyChart` HTML bars (F4); Progress/Skills merge; RTL pass (F9) | The bug fixes live here. Biggest visible win. |
| **3 — Route** | `SagaMap` drawer item; `App.tsx` `renderScreen()` + `parentReturnTo` (F10); hoist `ParentGate` | Ship before Games — otherwise the new tab is unreachable post-login. |
| **4 — Practice wiring** | `onPracticeSkill` → `GameOrchestrator.practiceConfig` (F1) | Verify `PracticeMode`'s signature first; est. is soft. |
| **5 — Games** | Know Your Kid → Parent Sprint → Duel → Weekly Teaser | Ship the tab with one game rather than waiting for four. |

**Tests to expect breakage in:** the e2e helper uses `data-testid="parent-access"` with `.first()` (two copies in `ProfileSelector`, lines 65 and 96). The new map entry uses a distinct `parent-access-map` id so the existing selector keeps working. Anything asserting on the three-tab top nav or the `grid-cols-12` profile rows will need updating in Phase 1-2.
