# W3D2 Family Co-Op Relay - authoritative build spec
## New files
1. src/engines/familyRelayEngine.ts - pure state machine, no React/localStorage/DOM.
2. src/components/games/FamilyRelayModal.tsx - modal host, <=200 lines.
3. src/engines/__tests__/familyRelayEngine.test.ts - PRIMARY deliverable tests.
## Edit files
- src/lib/worldConfig.ts: STORAGE_KEYS gains FAMILY_RELAY: 'hebrew-math-family-relay' (last entry).
- src/lib/__tests__/worldConfig.test.ts: beside PARENT_ECONOMY assertion add expect(STORAGE_KEYS).toHaveProperty('FAMILY_RELAY').
- src/i18n/locales/he.json AND en.json: same-commit parity, identical key tree under "familyRelay" (namespace used via t('familyRelay.*')). Kid copy + parent copy + pass screen copy + victory copy. All copy referenced with t() from FamilyRelayModal; zero hardcoded Hebrew.
## Engine API (pure functions over state)
- createFamilyRelayState(estimatedLevel: number): EXACTLY 4 kid Shield-Breaker questions generated at estimatedLevel (reuse repo math-generation types/utilities); state = {relayId, estimatedLevel, phase, questions, kidIndex, kidCorrect, secondsLeft, parentAnswers?, blitzCorrect, relaysDone?} plus whatever needed.
- RelayId unique (crypto.randomUUID with safe fallback consistent with repo conventions).
- Phases: 'kidShields' -> 'highFivePass' (5s) -> 'parentBlitz' (30s) -> 'victory'.
- kidShields: currentKidQuestion(state) -> {a, op, b, answer, distractors: [3], index: 0..3, total: 4}; submitKidAnswer(state, value) -> grade, store kidCorrect, auto-advance kidIndex; 4th submitted -> phase 'highFivePass', secondsLeft 5.
- startHighFivePass explicit for tests; tickHighFive(state, elapsed or secondsLeft) -> reaches 0 -> phase 'parentBlitz', secondsLeft 30 ONLY via startParentBlitz semantics (test both).
- parentBlitz: submitParentAnswer(state, value) -> {correct, blitzCorrect++}; tickParentBlitz(state, elapsed) -> 0 -> finishRelay; finishRelay(state) early-finish allowed too -> phase 'victory'.
- finishRelay -> victory payload {relayId, kidRewards: {coins: 15, gems: 5}, parentRewards: {coins: 15}}.
- Idempotency: after victory, every submit*/tick*/finishRelay returns state unchanged (same reference or deep-equal).
- PRIVACY INVARIANT: kid-visible data (state during phases kidShields/highFivePass, plus currentKidQuestion) serializes to JSON with NO parent fields: no parentAnswers, no blitzCorrect, no parentRewards during those phases; parentRewards only exist in victory/parent-facing API. Tests assert this on JSON.stringify output.
## Modal (<=200 lines incl imports)
- Renders 4 phases driven by engine; every equation wrapped in <MathText> (src/components/common/MathText).
- data-testid: family-relay-kid-question, family-relay-kid-answer (input), family-relay-kid-submit (button), family-relay-kid-countdown? none needed; family-relay-pass (5s high-five screen, shows family-relay-pass-countdown), family-relay-blitz, family-relay-blitz-answer, family-relay-blitz-submit, family-relay-blitz-countdown, family-relay-victory.
- Victory awards happen exactly once: useRef guard + persisted completedRelayIds (read/append JSON array at STORAGE_KEYS.FAMILY_RELAY).
- Kid award: addCoins(15) + addGems(5) from the profile hook exported by src/context/ProfileContext. Parent award: recordGameResult from src/hooks/useParentEconomy with {gameId: 'family-relay', score: blitzCorrect, won: true, sessionId: relayId}.
- All copy via i18n t('familyRelay.*'); child props: {estimatedLevel, onClose?} (simple props interface).
## Tests (familyRelayEngine.test.ts)
- vitest, colocated style like src/engines/__tests__ siblings (look at LessonEngine.test.ts/GameDirector.test.ts).
- createFamilyRelayState: 4 questions, all at estimatedLevel, distractors 3 unique != answer.
- Full flow walk: kid answers -> highFivePass 5s -> parent blitz answers -> finishRelay (early + timeout paths).
- Idempotency: repeat finishRelay/submit after victory -> unchanged.
- Privacy invariant: JSON.stringify(kid-phase state) lacks parentRewards/parentAnswers/blitzCorrect; victory payload HAS exact amounts {coins:15, gems:5} kid / {coins:15} parent, asserted once.
- Questions use repo equation types (a, op, b, answer) - validate grading for both correct and wrong inputs.
