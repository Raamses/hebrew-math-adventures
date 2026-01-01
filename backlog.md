# Backlog

## Technical Debt & Refactoring
- [ ] **Sound Handling**: Refactor `playSound` usage in `PracticeMode.tsx` (e.g., line 142). It currently uses direct calls like `playSound('wrong')` and should be moved to a centralized sound management system (or leverage `useSound` if already available but not used there).
