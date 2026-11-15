import {
    PREP_SCHEMA_VERSION,
    type PrepAttempt,
    type PrepMockResult,
    type PrepProgressState,
    type PrepSkillStat,
    type SkillTag,
} from '../types';

/** Per-profile key. Kept feature-local (STORAGE_KEYS in worldConfig.ts is pinned by a test). */
export const prepStorageKey = (profileId: string) => `hebrew-math-prep-progress-${profileId}`;

export const MAX_ATTEMPTS = 300;
export const MAX_MOCKS = 20;
export const MAX_SEEN = 200;

export const emptyPrepProgress = (): PrepProgressState => ({
    schemaVersion: PREP_SCHEMA_VERSION,
    skills: {},
    attempts: [],
    mocks: [],
    seenIds: [],
});

/**
 * Migrate whatever is stored to the current schema. Unknown or corrupt data starts fresh
 * rather than crashing the section. Add a case per future schemaVersion bump.
 */
export function migratePrepProgress(raw: unknown): PrepProgressState {
    if (!raw || typeof raw !== 'object') return emptyPrepProgress();
    const obj = raw as Partial<PrepProgressState> & { schemaVersion?: number };
    if (obj.schemaVersion !== PREP_SCHEMA_VERSION) return emptyPrepProgress();
    return {
        schemaVersion: PREP_SCHEMA_VERSION,
        skills: obj.skills && typeof obj.skills === 'object' ? obj.skills : {},
        attempts: Array.isArray(obj.attempts) ? obj.attempts.slice(-MAX_ATTEMPTS) : [],
        mocks: Array.isArray(obj.mocks) ? obj.mocks.slice(-MAX_MOCKS) : [],
        seenIds: Array.isArray(obj.seenIds) ? obj.seenIds.slice(-MAX_SEEN) : [],
    };
}

export function loadPrepProgress(profileId: string): PrepProgressState {
    try {
        const stored = localStorage.getItem(prepStorageKey(profileId));
        return migratePrepProgress(stored ? JSON.parse(stored) : null);
    } catch {
        return emptyPrepProgress();
    }
}

export function savePrepProgress(profileId: string, state: PrepProgressState): void {
    try {
        localStorage.setItem(prepStorageKey(profileId), JSON.stringify(state));
    } catch {
        /* storage full or blocked: progress is a convenience, never block play */
    }
}

/** Pure reducer: add one attempt, update its skill stat, remember the item id. */
export function recordAttempt(state: PrepProgressState, attempt: PrepAttempt): PrepProgressState {
    const prev: PrepSkillStat = state.skills[attempt.skill] ?? { attempts: 0, correct: 0 };
    const skills: Partial<Record<SkillTag, PrepSkillStat>> = {
        ...state.skills,
        [attempt.skill]: { attempts: prev.attempts + 1, correct: prev.correct + (attempt.correct ? 1 : 0) },
    };
    const seenIds = [...state.seenIds.filter(id => id !== attempt.itemId), attempt.itemId].slice(-MAX_SEEN);
    return {
        ...state,
        skills,
        attempts: [...state.attempts, attempt].slice(-MAX_ATTEMPTS),
        seenIds,
    };
}

export function recordMock(state: PrepProgressState, mock: PrepMockResult): PrepProgressState {
    return { ...state, mocks: [...state.mocks, mock].slice(-MAX_MOCKS) };
}
