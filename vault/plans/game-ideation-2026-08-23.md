---
type: plan
project: hebrew-math-adventures
updated: 2026-08-23
tags: [plan, ideation, v1]
status: active
---

# Game Ideation & Feature Plan — 2026-08-23

## Priority Order (from agy review)

### P0 — Existential (Must Fix)

#### Card 1: Fix Bubble Spawn Playability
**Goal**: Reduce 94% node-start → node-complete drop-off to <40%

**Tasks**:
1. Run 5 kid playtest sessions (recruit friends/family ages 5-8)
2. Record gameplay with screen capture + think-aloud protocol
3. Identify pain points: target visibility, bubble speed, distractor confusion
4. Tune `spawnIntervalMs`, `baseVelocity`, `density` in `worldConfig.ts`
5. A/B test against current config

**Test Plan**:
- Unit: Update `src/engines/__tests__/bubbleSpawn.test.ts` with new thresholds
- E2E: `e2e/spawn-overhaul-smoke.spec.ts` — verify target always visible within 4s
- E2E: New `e2e/bubble-playability.spec.ts` — measure completion rate across 10 sessions

---

#### Card 2: Add Number Pad Input Alternative
**Goal**: Make sensory/PracticeMode accessible to age 5-6

**Tasks**:
1. Add `inputMode` config to `worldConfig.ts`: `'tap'` | `'numpad'`
2. In `BubbleGameContainer`, show number pad overlay when `inputMode === 'numpad'`
3. For numpad: show static bubbles (no movement), kid taps answer
4. Store preference in localStorage per profile
5. Age-based default: age ≤ 6 → numpad, age > 6 → tap

**Test Plan**:
- Unit: `NumberPadInput.test.tsx` — verify tap → answer submission
- Unit: `worldConfig.test.ts` — verify `SENSORY_CONFIG.defaultInputMode`
- E2E: `e2e/numpad-input.spec.ts` — create profile age 5 → sensory node → verify numpad visible

---

### P1 — High Impact

#### Card 3: Complete 2 Lessons (Addition + Subtraction)
**Goal**: Wire `lesson1_addition` and `lesson1_subtraction` with real content

**Tasks**:
1. Create lesson flow in `LessonModal.tsx`:
   - Step 1: Concept intro (animation: ten-frames for addition, blocks for subtraction)
   - Step 2: Guided example (mascot walks through)
   - Step 3: Independent practice (3 problems, instant feedback)
   - Step 4: Celebration + stars
2. Content:
   - Addition lesson: "חיבור עד 10" with visual grouping (5 apples + 3 apples)
   - Subtraction lesson: "חיסור עד 10" with taking away (8 balloons — 3 balloons)
3. Update `learningPath.ts` to use real lessons for n1_4 (addition) and n2_2 (subtraction)
4. Add Hebrew copy to `i18n/locales/he.json` and `en.json`

**Test Plan**:
- Unit: `LessonEngine.test.tsx` — verify step progression + completion
- E2E: `e2e/lesson-addition.spec.ts` — step through addition lesson → complete → stars
- E2E: `e2e/lesson-subtraction.spec.ts` — step through subtraction lesson

---

#### Card 4: Session-End Celebration Screen
**Goal**: Dopamine hit after each session to drive retention

**Tasks**:
1. Enhance `SessionSummary.tsx`:
   - Animated star reveal (1 star → 2 stars → 3 stars with delay)
   - Mascot reaction based on performance (excited/happy/encouraging)
   - Stats display: "X/Y correct • Y combo • Zs speed"
   - Coin/XP counter animation
   - "Just one more?" button (5 bonus questions for +5 coins)
2. Add sound effect for star reveal (use `useSound`)
3. Confetti particles via Framer Motion (existing particle system)

**Test Plan**:
- Unit: `SessionSummary.test.tsx` — verify correct stats display, mascot emotion mapping
- E2E: `e2e/session-summary.spec.ts` — complete practice → verify celebration visible → click "Just one more"

---

#### Card 5: Consent & Privacy Compliance Review
**Goal**: Ensure GA4 data collection complies with Israel Privacy Law for minors

**Tasks**:
1. Audit current GA4 events — flag any collecting PII (profile_id, equation, response_time_ms)
2. Add parental consent gate before GA4 tracking (opt-in checkbox on first Parent Dashboard access)
3. Document data flow in `docs/PRIVACY.md`
4. Add `ads.txt` and `privacy-policy.html` for Firebase
5. Verify `profile_id` is random UUID (not email/name) — currently is, confirm

**Test Plan**:
- Unit: `useAnalytics.test.ts` — verify no tracking without consent flag
- E2E: `e2e/consent-gate.spec.ts` — first Parent Dashboard access → consent modal visible → accept → GA4 events fire

---

### P2 — Growth

#### Card 6: Daily Return Loop (localStorage)
**Goal**: Increase from 5/28 active days to 14+

**Tasks**:
1. Enhance existing daily challenge:
   - "Come back tomorrow" prompt after session with countdown timer
   - Streak counter on saga map (visible, prominent)
   - Day 3 streak → bonus coins reward
   - Day 7 streak → bonus gem reward
2. Add `dailyVisit` tracking in localStorage with last visit timestamp
3. Show "You're on a X-day streak!" banner on saga map load
4. Weekly summary: every Sunday, show "This week: X questions, Y stars, Z coins"

**Test Plan**:
- Unit: `dailyVisit.test.ts` — verify streak calculation logic
- E2E: `e2e/streak-tracking.spec.ts` — simulate 3 days → verify streak counter increments

---

#### Card 7: Basic Parent Dashboard
**Goal**: Give parents insight into their child's progress

**Tasks**:
1. Enhance existing `ProgressOverview.tsx`:
   - Total questions answered (from GA4 or localStorage session records)
   - Time spent (sum of session durations)
   - Strongest skill / weakest skill (based on star counts per node)
   - Recent activity list (last 5 sessions with date + mode)
2. Add `useSessionHistory` hook that stores session summaries in localStorage
3. Display simple bar chart of stars per unit (CSS-only)

**Test Plan**:
- Unit: `useSessionHistory.test.ts` — verify session storage + retrieval
- E2E: `e2e/parent-dashboard-stats.spec.ts` — complete 2 sessions → verify dashboard shows correct totals

---

#### Card 8: Ghost Race Multiplayer
**Goal**: Add social competition without backend

**Tasks**:
1. Store best run per node per profile in localStorage:
   - `ghost_${nodeId}` → `{ profileId, score, combo, timestamp }`
2. On node start, show "Race against [name]'s best: X stars" banner
3. During play, show ghost progress indicator (subtle, non-distracting)
4. On completion: "You beat [name]!" or "Try again to beat X stars"

**Test Plan**:
- Unit: `ghostStorage.test.ts` — verify localStorage read/write
- E2E: `e2e/ghost-race.spec.ts` — complete node as Profile A → switch to Profile B → verify ghost visible during play

---

## Out of Scope (Parked)

- Monetization (see `vault/backlog/monetization-and-growth.md`)
- Push notifications (backend required)
- School/enterprise mode (backend + auth required)
- AI Tutor via WebGPU (platform support too limited)
- Hebrew voice-over (budget line item, parked)

---

## Test Coverage Summary

| Feature | Unit Tests | E2E Tests |
|---------|-----------|-----------|
| Bubble spawn playability | ✅ bubbleSpawn.test.ts | ✅ spawn-overhaul-smoke, bubble-playability |
| Number pad input | ✅ NumberPadInput.test.tsx, worldConfig | ✅ numpad-input.spec.ts |
| Lessons (2) | ✅ LessonEngine.test.tsx | ✅ lesson-addition, lesson-subtraction |
| Session celebration | ✅ SessionSummary.test.tsx | ✅ session-summary.spec.ts |
| Privacy consent | ✅ useAnalytics.test.ts | ✅ consent-gate.spec.ts |
| Daily return loop | ✅ dailyVisit.test.ts | ✅ streak-tracking.spec.ts |
| Parent dashboard | ✅ useSessionHistory.test.ts | ✅ parent-dashboard-stats.spec.ts |
| Ghost race | ✅ ghostStorage.test.ts | ✅ ghost-race.spec.ts |
