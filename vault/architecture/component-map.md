---
type: architecture
project: hebrew-math-adventures
updated: 2026-08-08
tags: [architecture, components, source-tree, map]
---

# Component & Source Map

**This is the source-tree map** — where things live and what each area is responsible for. Use it to navigate the codebase. Source: live `src/` tree (2026-08-08).

## Top-level entry
- `src/App.tsx` — app root, routing (SagaMap / WorldMap / practice / settings), provider wiring.

## `src/components/` — UI components
| Area | Responsibility |
|---|---|
| `games/` | Game containers + HUD: `BubbleGameContainer`, `MathInvadersGame`, `MemoryDuelGame`, `ArcadeHUD`, `FrenzyOverlay`, `LevelUpBanner`, `ModeSelectorOverlay` |
| `sensory/` | Bubble rendering (`Bubble.tsx`) |
| `lessons/` | Interactive lesson UI + `LessonModal` |
| `map/` | `MapZone`, `WorldMap` (legacy zone map) |
| `math-card/` | `MathCard`, custom numpad, hint visualizers |
| `practice/` | `PracticeMode` + practice session UI |
| `pet/` | Pet screen, `DailyQuestList` |
| `quests/` | `QuestPanel` (daily quests) |
| `mascot/` | Mascot display + emotion states |
| `parent/` | Parent dashboard, profile management |
| `onboarding/` | `ProfileSetup`, onboarding flow |
| `shop/` | Shop UI |
| `settings/` | `SettingsMenu`, `SettingsModal` |
| `badges/` | Badge display |
| `cinematic/` | Cinematic / story sequences |
| `common/` | Shared UI primitives |
| Root files | `GameOrchestrator`, `MathCard`, `PracticeMode`, `WorldMap`, `ProfileSetup`, `SessionSummary`, `SessionProgressBar`, `ScoreToast`, `HintVisualizer`, `ErrorBoundary`, `Confetti`, `Effects`, hint components (`AdditionHint`, `BorrowingHint`, `DivisionHint`, `MultiplicationHint`, `SubtractionHint`), `ThemeSelector`, `GameMenuModal`, `SettingsModal` |

## `src/context/` — React context providers
| File | Responsibility |
|---|---|
| `ProfileContext.tsx` | Profiles, coins, gems, badges, mascot |
| `ProgressContext.tsx` | Node completion, stars, XP, level |
| `QuestContext.tsx` | Daily challenge, daily quests, streaks, stamp album |
| `ThemeContext.tsx` | Theme selection |

## `src/engines/` — game logic (framework-agnostic)
| File | Responsibility |
|---|---|
| `GameDirector.ts` | Adaptive difficulty (rescue/challenge), session leveling |
| `MathModule.ts` | Level progression, supported problem types |
| `ProblemFactory.ts` | Problem generation (arithmetic, missing operand, comparison, series, word) |
| `SensoryFactory.ts` | Bubble sensory problem generation |
| `LessonEngine.ts` | Interactive lesson step engine + performance tracking |
| `interfaces.ts` | Engine interfaces |
| `bubble/useGameEngine.ts` | Bubble game loop, spawn system, power-ups, boss |
| `bubble/strategies/` | Bubble spawn strategies (`MathStrategy`) |
| `invader/` | Invaders game engine (`useInvaderEngine`, `types`) |
| `memory/` | Memory game (`MemoryFactory`) |
| `utils/` | Shared engine utilities |

## `src/hooks/` — React hooks
| File | Responsibility |
|---|---|
| `useAnalytics.ts` | GA4 event emission |
| `useAnswerFlow.ts` | Answer submission flow |
| `useMathHint.ts` | Hint logic |
| `useMemoryGame.ts` | Memory game state |
| `useMusicalSound.ts` | Web Audio synth |
| `useSound.ts` | Semantic sound API (centralized) |
| `usePracticeSession.ts` | Practice session state |

## `src/lib/` — pure logic & config
| File | Responsibility |
|---|---|
| `worldConfig.ts` | **Single source of truth** for all game-world config (zones, director, stars, power-ups, spawn, invader, practice, session, frenzy) |
| `stars.ts` | Star tier computation (Pass/Good/Perfect → 1/2/3) |
| `bossGate.ts` | Boss gate logic |
| `arcadeModes.ts` | Arcade mode configs |
| `pet.ts` | Pet stages |
| `themes.ts` | Theme unlocks |
| `progression.ts` | XP / level curve |
| `skillAnalysis.ts` | Skill analysis |
| `gameLogic.ts` | Shared game logic |
| `firebase.ts` | GA4 init, env-safe fallback |
| `logger.ts` | Console logger fallback |
| `cn.ts` | Class name utility |

## `src/data/` — content data
- `learningPath.ts` (units/nodes), `dailyChallenges.ts`, `dailyQuests.ts`, `badges.ts`, `shopItems.ts`, `mascotDialogue.ts`, `wordProblemTemplates.ts`

## `src/lessons/` — lesson content
- `lesson1_multiplication.ts` (only real lesson; others fall back)

## `src/i18n/` — localization
- `i18n.ts`, `locales/` (Hebrew RTL primary + English LTR)

## `src/types/` — TypeScript types
- `analytics.ts` (typed events), engine types, etc.

## Related
- [[architecture/system-overview]] — data flow & director-module pattern.
- [[architecture/feature-inventory]] — feature-by-feature status.
- [[domain/powerups]] — power-up system (in `useGameEngine` + `worldConfig`).
- [[domain/daily-quests]] — quest system (in `QuestContext` + `data/dailyQuests`).
