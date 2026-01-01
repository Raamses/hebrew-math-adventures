# Backlog

## Technical Debt & Refactoring
- [ ] **Sound Handling**: Refactor `playSound` usage in `PracticeMode.tsx` (e.g., line 142). It currently uses direct calls like `playSound('wrong')` and should be moved to a centralized sound management system (or leverage `useSound` if already available but not used there).

- [ ] **Dynamic Star Rewards**:
    - **Issue**: `GameOrchestrator.tsx` currently hardcodes `completeNode(node.id, 3)`, awarding 3 stars for *any* completion (lines 57, 87, 114).
    - **Goal**: Award stars based on performance (1 = Pass, 2 = Good, 3 = Perfect/High Streak).
    - **Plan**:
        1.  Update `PracticeMode` to calculate stars based on `sessionCorrect`/`sessionAttempts`.

- [ ] **Consolidate World Configuration**:
    - **Issue**: `worldConfig.ts` (`WORLD_ZONES`) and `learningPath.ts` (`CURRICULUM`) both define game worlds/themes, creating duplication. `PracticeMode` relies on `worldConfig` for UI badges.
    - **Goal**: Make `learningPath.ts` the single source of truth.
    - **Plan**:
        1.  Update `PracticeMode` to accept `theme` or `unitTitle` directly from the `node` prop.
        2.  Replace `getZoneForLevel` usage in `PracticeMode` with data from `node.unitId` (lookup in `CURRICULUM`).
        3.  Delete `worldConfig.ts` and `WorldMap.tsx`.
