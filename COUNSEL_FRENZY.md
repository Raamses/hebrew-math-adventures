# 🎨 COUNSEL: FrenzyOverlay Design Review

**Date:** 2026-08-01  
**Reviewer:** Senior Game UX Consultant (Claude)  
**Status:** Recommendation — awaiting approval before implementation

---

## Problem Summary

The `FrenzyOverlay` is a shared component used across three game modes. It activates on combo streaks (5/10/15 → Frenzy/Super/Mega). The **pulsing border** and **ember particles** are fine — they're peripheral and don't block gameplay. The **center-screen text block** ("MEGA FRENZY!" + multiplier) is the problem: it's a persistent, full-opacity element parked at `top-1/3` that covers critical UI in every mode.

### What it covers, by mode:

| Mode | What's at top-1/3 | Impact |
|------|-------------------|--------|
| **BubbleGame** | Instruction/problem text (e.g. "7 + 3 = ?") | Kids can't see what they're solving while frenzy is active |
| **PracticeMode** | "Question X of 10" + progress bar + MathCard top | Progress obscured, card partially covered |
| **MathInvaders** | Title "🚀 Math Invaders" + HUD badges | Title covered, HUD partially obscured |

### Root cause:

The overlay is a single `position: absolute inset-0 z-30` container. The text block uses `absolute top-1/3 left-1/2 -translate-x-1/2` with a `bg-black/40` backdrop box — it stays on screen the **entire duration** of the frenzy, and it's positioned without any awareness of what's underneath it.

---

## Design Principles for a Kids' Game

1. **Excitement shouldn't block play.** A combo reward that hides the question is self-defeating — the kid earned the frenzy by answering correctly, and now they can't see the next question.
2. **Peripheral > central for persistent effects.** Borders, glows, and particles are great because they frame the action without covering it. Text in the center is the opposite.
3. **Announce, then get out of the way.** The player knows they're in frenzy mode from the border + particles. The text label only needs to **announce** the tier upgrade, not stay on screen the whole time.
4. **One size doesn't fit all.** Each mode has a different layout. The overlay should be flexible enough to adapt.

---

## Recommendation: Three-Part Fix

### Part 1: Make the Frenzy Text a Transient Announcement (not persistent)

**This is the single most impactful change.** Instead of rendering the "MEGA FRENZY!" text for the entire duration of the frenzy, show it as a **one-shot animation** that enters dramatically, holds for ~1.5 seconds, then fades out. The border + particles + glow remain for the duration — those are the persistent indicators.

**Why this works:**
- The kid gets the dopamine hit of seeing "MEGA FRENZY!" explode onto screen
- It doesn't linger and block anything
- The border + particles continue to signal "you're still in frenzy mode"
- It mirrors how real games handle combo announcements (e.g., *Bejeweled*, *Candy Crush*)

```tsx
// Replace the persistent FRENZY Text block with a transient announcement

// New state: track whether the announcement has played for the current tier
const [showAnnouncement, setShowAnnouncement] = useState(false);
const prevTierRef = useRef<FrenzyTier | null>(null);

useEffect(() => {
    if (isActive && tier && tier !== prevTierRef.current) {
        setShowAnnouncement(true);
        const timer = setTimeout(() => setShowAnnouncement(false), 1800);
        prevTierRef.current = tier;
        return () => clearTimeout(timer);
    }
    if (!isActive) {
        prevTierRef.current = null;
    }
}, [isActive, tier]);

// In the render:
<AnimatePresence>
    {showAnnouncement && config && (
        <motion.div
            className="absolute top-1/3 left-1/2 -translate-x-1/2"
            initial={{ scale: 0, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
            <div className="flex flex-col items-center bg-black/40 rounded-2xl px-6 py-3">
                <h2 className={`text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b ${config.textGradient} drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-widest italic`}>
                    {config.label}
                </h2>
                {tier !== 'frenzy' && (
                    <motion.p
                        className="text-center text-xl sm:text-2xl font-bold text-white drop-shadow-lg mt-1"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {config.multiplier}x Score!
                    </motion.p>
                )}
            </div>
        </motion.div>
    )}
</AnimatePresence>
```

**Note:** Remove the `animate-pulse` class from the heading. The pulse was making it feel even more persistent/in-your-face. The one-shot spring entrance + fade-out exit is enough drama.

### Part 2: Add a Persistent "Frenzy Badge" to Replace the Persistent Text

With the text gone for most of the duration, we need a **small, unobtrusive indicator** that frenzy is active — especially for kids who might not connect "glowing border" to "I'm in frenzy mode."

Add a small badge that appears in a **mode-configurable corner** and stays for the duration:

```tsx
interface FrenzyOverlayProps {
    isActive: boolean;
    combo: number;
    /** Where to place the persistent frenzy badge. Defaults to 'top-right'. */
    badgePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    /** Whether to show the transient announcement text. Defaults to true. */
    showAnnouncement?: boolean;
}
```

The badge is small (~40px), shows the tier icon + multiplier, and pulses gently:

```tsx
// Persistent badge (stays for entire frenzy duration)
{isActive && config && (
    <div className={`absolute ${badgePosClasses[badgePosition]} z-30 pointer-events-none`}>
        <motion.div
            className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 border-2 ${config.border}"
            animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
            <span className="text-sm font-black text-white">
                {tier === 'mega' ? '🔥' : tier === 'super' ? '⚡' : '✨'}
            </span>
            <span className={`text-xs font-black text-transparent bg-clip-text bg-gradient-to-b ${config.textGradient}`}>
                {config.multiplier}x
            </span>
        </motion.div>
    </div>
)}

const badgePosClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
};
```

### Part 3: Mode-Specific Badge Positioning

Each mode passes a `badgePosition` prop so the badge lands in an empty corner:

| Mode | Best badge position | Why |
|------|---------------------|-----|
| **BubbleGame** | `top-right` | The header has stats on the left and settings on the right, but the far top-right corner (above settings) is empty. The instruction text is centered — a corner badge won't conflict. |
| **PracticeMode** | `top-right` | The `PracticeHeader` has a pause button on the left. The right side is relatively free. The MathCard is centered below — corner badge is safe. |
| **MathInvaders** | `bottom-right` | The HUD is at the top (back button, lives, combo, score, level). The bottom area has only the ship emoji centered. Bottom-right is wide open. |

**Usage in each mode:**

```tsx
// BubbleGameContainer.tsx
<FrenzyOverlay 
    isActive={gameState.isFrenzy} 
    combo={gameState.combo} 
    badgePosition="top-right"
/>

// PracticeFeedback.tsx
<FrenzyOverlay 
    isActive={(profile?.streak || 0) >= 5} 
    combo={profile?.streak || 0}
    badgePosition="top-right"
/>

// MathInvadersGame.tsx
<FrenzyOverlay 
    isActive={state.frenzy} 
    combo={state.combo}
    badgePosition="bottom-right"
/>
```

---

## What NOT to Change

1. **Pulsing border** — keep it. It's the primary persistent indicator and doesn't block anything. The `[8px]` border width and glow are great.
2. **Ember particles** — keep them. They rise from the bottom and don't interfere with UI. Scaling particle count by tier is good design.
3. **Screen shake for mega** — keep it. It's a brief, exciting effect. The `bg-rose-500/5` overlay is barely visible.
4. **Sound effect** — keep it. The `play('frenzy')` on activation is a great audio cue.
5. **`pointer-events-none`** — keep it. The overlay should never block taps/clicks.

---

## Additional Creative Ideas (Optional Enhancements)

### A. Tier-Upgrade Flash Effect
When a player upgrades from Frenzy → Super Frenzy (hits 10 combo), add a **brief radial flash** from the center of the screen — like a shockwave — that lasts 300ms. This makes the upgrade moment feel explosive without leaving anything on screen.

```tsx
{showAnnouncement && tier !== 'frenzy' && (
    <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
    >
        <motion.div
            className={`w-32 h-32 rounded-full ${
                tier === 'mega' ? 'bg-rose-400/30' : 'bg-purple-400/30'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 8] }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        />
    </motion.div>
)}
```

### B. Score Pop with Multiplier Color
When frenzy is active and the player scores, the floating "+points" text could use the frenzy tier's gradient colors instead of the default green/gold. This reinforces the frenzy state through gameplay feedback, not overlay text.

### C. Combo Counter Glow
In each mode's HUD, the combo counter could get the frenzy border color when frenzy is active. This is a subtle but effective way to reinforce "you're in frenzy mode" through the HUD itself, not the overlay.

### D. Progress Bar Frenzy Tint
In PracticeMode, the `SessionProgressBar` could adopt the frenzy tier's color while frenzy is active. Another subtle peripheral cue.

---

## Implementation Priority

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| **P0** | Make text transient (Part 1) | Small | 🔥 Critical — fixes the core problem |
| **P0** | Add persistent badge (Part 2) | Small | 🔥 Critical — replaces the persistent indicator |
| **P1** | Mode-specific badge positioning (Part 3) | Trivial | High — ensures badge doesn't conflict |
| **P2** | Tier-upgrade flash (Creative A) | Small | Medium — extra delight |
| **P3** | Score pop colors, combo glow, progress tint (Creative B/C/D) | Medium | Nice-to-have polish |

---

## Summary

The fix is fundamentally about **separating the announcement from the state indicator**:

- **Announcement** (the big "MEGA FRENZY!" text) → transient, 1.8s, then gone
- **State indicator** (border + particles + small corner badge) → persistent for the duration

This pattern is well-established in arcade games and satisfies the competing needs: kids get the excitement of a dramatic combo announcement, and the gameplay UI stays clear and readable for the entire frenzy duration. The `badgePosition` prop gives each mode control over where the persistent badge sits, so it never conflicts with mode-specific layouts.