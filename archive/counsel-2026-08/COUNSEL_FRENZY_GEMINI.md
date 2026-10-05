# 🎮 FrenzyOverlay Design Counsel

**Reviewer:** Gemini (Senior Game UX Consultant)
**Date:** 2026-08-01
**Scope:** Cross-mode FrenzyOverlay visual clutter fix for Hebrew Math Adventures

---

## Problem Diagnosis

The `FrenzyOverlay` is a **full-screen `position: absolute inset-0 z-30`** overlay shared across three game modes. The core issue is the **persistent central text block** (`top-1/3 left-1/2`) that displays "FRENZY!" / "SUPER FRENZY!" / "MEGA FRENZY!" with a multiplier subtitle. This text block:

| Mode | What It Covers | Why It Matters |
|------|---------------|----------------|
| **BubbleGame** | The instruction/problem text (e.g., "Solve: 3 + 4 = ?") | Kids can't see what to solve while popping bubbles |
| **PracticeMode** | "Question X of 10" + progress bar + mascot area | Kids lose sense of session progress and visual feedback |
| **MathInvaders** | Title "🚀 Math Invaders" + HUD area | Less critical but still obscures the thematic header |

The border, ember particles, and screen shake are **fine** — they're peripheral and don't block central content. The **text block alone** is the problem.

### Root Cause

The overlay was designed mode-agnostically, but each mode has a **different vertical layout geometry**:

- **BubbleGame**: Header at top (z-40, ~120px tall) → game area fills remaining space. Text at `top-1/3` lands right in the upper game area, close to the instruction text.
- **PracticeMode**: Header (z-40) → progress bar → MathCard (z-40) → mascot at bottom. Text at `top-1/3` overlaps the progress bar and upper MathCard.
- **MathInvaders**: HUD (z-40) → title → game area. Text at `top-1/3` overlaps the title and upper equation bubbles.

A single fixed position cannot work for all three.

---

## Recommended Solution: Transient Flash + Mode-Aware Badge

### Core Idea

**Replace the persistent central text with a two-phase approach:**

1. **Phase 1 — "Burst" (1.5 seconds):** A large, animated text appears in a mode-aware position, plays its entrance animation, then **fades out completely**. This delivers the excitement and dopamine hit of entering frenzy mode.

2. **Phase 2 — "Badge" (persistent):** A small badge/pill in a mode-aware corner position stays visible for the duration of the frenzy, showing the tier and multiplier. This provides ongoing awareness without blocking content.

### Why This Works for Kids

- Kids need the **excitement moment** — the big "MEGA FRENZY!" burst is thrilling and motivating.
- Kids **don't need to keep reading it** — once they know they're in frenzy mode, the pulsing border + ember particles + score multiplier feedback are sufficient reminders.
- A small persistent badge satisfies the "am I still in frenzy?" question without occupying screen real estate.
- This is the pattern used by **Mario Kart** (item notification burst → small icon) and **Roblox** game passes (big notification → corner badge).

---

## Detailed Design

### 1. FrenzyOverlay API Change

Add a `variant` prop so each mode can specify where the burst text and persistent badge should appear:

```tsx
type FrenzyVariant = 'bubble' | 'practice' | 'invaders';

interface FrenzyOverlayProps {
    isActive: boolean;
    combo: number;
    variant?: FrenzyVariant; // NEW
}
```

### 2. Mode-Aware Positioning Map

```tsx
const VARIANT_LAYOUT: Record<FrenzyVariant, {
    burstPosition: string;   // Where the big text flashes
    badgePosition: string;   // Where the small badge sits persistently
}> = {
    bubble: {
        // BubbleGame: header is at top (~120px). Burst appears just below header,
        // then badge stays in top-right corner below the header.
        burstPosition: 'top-[140px] left-1/2 -translate-x-1/2',
        badgePosition: 'top-[130px] right-3',
    },
    practice: {
        // PracticeMode: header + progress bar at top, MathCard in middle.
        // Burst appears above the MathCard area, badge in top-right corner.
        burstPosition: 'top-[100px] left-1/2 -translate-x-1/2',
        badgePosition: 'top-2 right-3',
    },
    invaders: {
        // MathInvaders: HUD + title at top (~80px). Burst appears just below title,
        // badge in top-right corner next to HUD.
        burstPosition: 'top-[90px] left-1/2 -translate-x-1/2',
        badgePosition: 'top-2 right-3',
    },
};
```

### 3. Burst Text Component (Transient)

```tsx
{/* BURST: Large text that flashes for 1.5s then disappears */}
<AnimatePresence>
    {isActive && config && showBurst && (
        <motion.div
            className={`absolute ${layout.burstPosition} z-30 pointer-events-none`}
            initial={{ scale: 0, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            onAnimationComplete={() => {
                // Start a 1.5s timer to hide the burst
                setTimeout(() => setShowBurst(false), 1500);
            }}
        >
            <div className="flex flex-col items-center bg-black/40 rounded-2xl px-6 py-3">
                <h2 className={`text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b ${config.textGradient} drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-widest italic animate-pulse`}>
                    {config.label}
                </h2>
                {tier !== 'frenzy' && (
                    <p className="text-center text-xl sm:text-2xl font-bold text-white drop-shadow-lg mt-1">
                        {config.multiplier}x Score!
                    </p>
                )}
            </div>
        </motion.div>
    )}
</AnimatePresence>
```

### 4. Persistent Badge Component (Small, Non-Blocking)

```tsx
{/* BADGE: Small persistent indicator while frenzy is active */}
{isActive && config && !showBurst && (
    <motion.div
        className={`absolute ${layout.badgePosition} z-30 pointer-events-none`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
        <div className={`flex items-center gap-1.5 bg-gradient-to-r ${config.textGradient} rounded-full px-3 py-1.5 shadow-lg border-2 border-white/30`}>
            <Zap size={14} className="text-white fill-white" />
            <span className="text-white font-black text-xs whitespace-nowrap">
                {config.label.replace('!', '')} {config.multiplier}x
            </span>
        </div>
    </motion.div>
)}
```

### 5. Burst State Management

Add internal state to manage the burst → badge transition:

```tsx
const [showBurst, setShowBurst] = useState(true);

// Reset burst when frenzy re-activates or tier changes
useEffect(() => {
    if (isActive && tier) {
        setShowBurst(true);
        const timer = setTimeout(() => setShowBurst(false), 1500);
        return () => clearTimeout(timer);
    }
}, [isActive, tier]);
```

### 6. Callers: Pass the `variant` Prop

**BubbleGameContainer.tsx:**
```tsx
<FrenzyOverlay isActive={gameState.isFrenzy} combo={gameState.combo} variant="bubble" />
```

**PracticeFeedback.tsx:**
```tsx
<FrenzyOverlay
    isActive={(profile?.streak || 0) >= 5}
    combo={profile?.streak || 0}
    variant="practice"
/>
```

**MathInvadersGame.tsx:**
```tsx
<FrenzyOverlay isActive={state.frenzy} combo={state.combo} variant="invaders" />
```

---

## What Stays the Same

- ✅ **Pulsing border** — full-screen, peripheral, doesn't block content
- ✅ **Ember particles** — rising from bottom, lightweight, atmospheric
- ✅ **Screen shake** (mega tier) — subtle, adds excitement
- ✅ **Sound effect** — plays on activation
- ✅ **Tier system** (5/10/15 = Frenzy/Super/Mega) — unchanged
- ✅ **z-30 for overlay** — still above game content but below headers (z-40)

---

## Additional Creative UX Ideas

### A. Tier-Upgrade Re-Burst
When the player upgrades from Frenzy → Super Frenzy (combo 10) or Super → Mega (combo 15), trigger **another burst animation**. This rewards sustained performance and keeps the excitement fresh. The `useEffect` on `tier` change above handles this naturally.

### B. Badge Pulse on Each Correct Answer
While in frenzy mode, make the persistent badge **pulse/scale briefly** each time the player gets a correct answer. This reinforces "you're still in the zone" and connects the badge to the feedback loop.

```tsx
// Pass a `pulseKey` prop that increments on each correct answer
// Use it to trigger a brief scale animation on the badge
```

### C. Combo Counter Inside Badge
Show the current combo count in the badge: `"🔥 12 · 3x"`. This gives kids a running tracker of their streak without needing a separate UI element. When the combo drops, the badge disappears (frenzy ends), which is a natural "you lost it!" signal.

### D. Dimming the Badge Over Time
After the first 5 seconds of frenzy, reduce the badge opacity to ~70%. This keeps it visible but further reduces visual noise. On any new correct answer, briefly restore to 100% opacity (ties into idea B).

### E. Mega Frenzy: Full-Screen Flash Instead of Persistent Text
For the highest tier (Mega, 5x), instead of keeping any text on screen, do a dramatic **full-screen color flash** (0.5s) on activation — the screen briefly tints rose/purple, then the border + particles + badge take over. This is more impactful than text and doesn't persist.

---

## Priority Summary

| Change | Impact | Effort |
|--------|--------|--------|
| **1. Transient burst → badge pattern** | 🔴 Critical — fixes the core clutter issue | Medium |
| **2. Mode-aware `variant` prop** | 🔴 Critical — ensures correct placement per mode | Low |
| **3. Burst on tier upgrade** | 🟡 High — rewards progression within frenzy | Low (handled by `tier` effect) |
| **4. Badge pulse on correct answer** | 🟢 Medium — reinforces feedback loop | Low |
| **5. Combo counter in badge** | 🟢 Medium — replaces need for separate combo UI | Low |
| **6. Mega full-screen flash** | 🟢 Nice-to-have — maximum drama for top tier | Low |

---

## What NOT to Do

- ❌ **Don't make the text smaller and keep it persistent.** A small persistent text in the center is still clutter, and kids may still try to read around it.
- ❌ **Don't move the text to a single fixed position for all modes.** The layouts are too different — what works for BubbleGame breaks PracticeMode.
- ❌ **Don't remove the text entirely.** The "FRENZY!" announcement is a key dopamine trigger. Kids love seeing it. The burst is important; just make it transient.
- ❌ **Don't increase z-index of surrounding UI above the overlay.** This defeats the purpose of the overlay and creates z-index wars. The overlay should be below headers (z-40) but above game content (z-10), which the current z-30 achieves.

---

## Implementation Order

1. Add `variant` prop to `FrenzyOverlay` with the position map
2. Add `showBurst` state + timeout logic
3. Split the text block into burst (transient) + badge (persistent) components
4. Update the three callers to pass the correct `variant`
5. Test each mode to confirm the burst appears in a clear area and the badge doesn't overlap any mode's UI
6. (Polish) Add tier-upgrade re-burst and badge pulse effects

This approach preserves the excitement of frenzy mode while eliminating the persistent visual obstruction. The burst gives the thrill; the badge provides the awareness; the game stays playable.