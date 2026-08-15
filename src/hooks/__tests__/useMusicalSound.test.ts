// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMusicalSound } from '../useMusicalSound';

// ═══════════════════════════════════════════════════════════════════════════
// AudioContext mock — mirrors the pattern from useSound.test.ts
//
// useMusicalSound has its own module-level globalMusicalAudioContext, separate
// from useSound's globalAudioContext. Both are backed by the same
// FakeAudioContext class, so tracking arrays capture all oscillators/gains.
//
// IMPORTANT: useMusicalSound assigns osc.onended *after* osc.stop(), unlike
// useSound which assigns it before stop(). The FakeOscillator.stop() defers
// the onended callback via microtask so that the assignment takes effect
// first. This mirrors real Web Audio where onended fires asynchronously.
// ═══════════════════════════════════════════════════════════════════════════

let oscillators: FakeOscillator[] = [];
let gainNodes: FakeGainNode[] = [];

class FakeGainNode {
    gain = {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
    };
    connect = vi.fn();
    disconnect = vi.fn();
    constructor() {
        gainNodes.push(this);
    }
}

class FakeOscillator {
    type = 'sine';
    frequency = {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
    };
    onended: (() => void) | null = null;
    connect = vi.fn();
    disconnect = vi.fn();
    start = vi.fn();
    // stop() queues onended as a microtask so that code after stop()
    // (like the onended assignment) runs first. This mirrors real Web Audio
    // where onended fires asynchronously after the oscillator stops.
    stop = vi.fn(function (this: FakeOscillator) {
        const self = this;
        Promise.resolve().then(() => {
            self.onended?.();
        });
    });
    constructor() {
        oscillators.push(this);
    }
}

class FakeAudioContext {
    currentTime = 0;
    destination = {};
    createOscillator = vi.fn(() => new FakeOscillator());
    createGain = vi.fn(() => new FakeGainNode());
}

// ── localStorage mock ──────────────────────────────────────────────────────
const store: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    },
});

// ── Helper selectors ──────────────────────────────────────────────────────
const frequencies = () => oscillators.flatMap(o => [
    ...o.frequency.setValueAtTime.mock.calls.map(c => c[0]),
    ...o.frequency.exponentialRampToValueAtTime.mock.calls.map(c => c[0]),
    ...o.frequency.linearRampToValueAtTime.mock.calls.map(c => c[0]),
]);

const gainValues = () => gainNodes.flatMap(g => [
    ...g.gain.setValueAtTime.mock.calls.map(c => c[0]),
    ...g.gain.exponentialRampToValueAtTime.mock.calls.map(c => c[0]),
    ...g.gain.linearRampToValueAtTime.mock.calls.map(c => c[0]),
]);

const lastOsc = () => oscillators[oscillators.length - 1];
const lastGain = () => gainNodes[gainNodes.length - 1];

/** Wait for microtask (onended callbacks) to flush */
const flushMicrotasks = () => act(async () => { await Promise.resolve(); });

// ── Shared setup ──────────────────────────────────────────────────────────
const setupMocks = () => {
    localStorage.clear();
    vi.clearAllMocks();
    oscillators = [];
    gainNodes = [];
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext = FakeAudioContext;
};

/** Pre-set localStorage to mute the hook */
const setMuted = () => {
    store['isMuted'] = 'true';
};

// C major scale frequencies for assertions
const C_MAJOR = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

// ═══════════════════════════════════════════════════════════════════════════
// API SURFACE
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — API surface', () => {
    beforeEach(() => setupMocks());

    it('exposes all expected return values', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        expect(result.current.playMelodyNote).toBeTypeOf('function');
        expect(result.current.playWrongMelody).toBeTypeOf('function');
        expect(result.current.resetMelodyCombo).toBeTypeOf('function');
        expect(result.current.isSoundGarden).toBeTypeOf('boolean');
        expect(result.current.toggleSoundGarden).toBeTypeOf('function');
        expect(result.current.melodyCombo).toBeTypeOf('number');
        expect(result.current.isMuted).toBeTypeOf('boolean');
    });

    it('isSoundGarden reflects the soundGardenEnabled parameter', () => {
        const { result: enabled } = renderHook(() => useMusicalSound(true));
        expect(enabled.current.isSoundGarden).toBe(true);
        const { result: disabled } = renderHook(() => useMusicalSound(false));
        expect(disabled.current.isSoundGarden).toBe(false);
    });

    it('melodyCombo starts at 0', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        expect(result.current.melodyCombo).toBe(0);
    });

    it('toggleSoundGarden is a no-op stub (does not throw)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        expect(() => act(() => result.current.toggleSoundGarden())).not.toThrow();
    });

    it('isMuted defaults to false (from useSound)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        expect(result.current.isMuted).toBe(false);
    });

    it('does not expose toggleMute (owned by useSound, not re-exported)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        expect(result.current.toggleMute).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTE BEHAVIOUR
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — mute behaviour', () => {
    beforeEach(() => setupMocks());

    it('blocks playMelodyNote when muted', () => {
        setMuted();
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(oscillators).toHaveLength(0);
        expect(gainNodes).toHaveLength(0);
    });

    it('blocks playWrongMelody when muted', () => {
        setMuted();
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        expect(oscillators).toHaveLength(0);
        expect(gainNodes).toHaveLength(0);
    });

    it('does not increment combo when muted playMelodyNote is called', () => {
        setMuted();
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('does not reset combo when muted playWrongMelody is called', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        // Build up combo while unmuted
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(2);
        // Re-render with muted localStorage
        setMuted();
        const { result: mutedResult } = renderHook(() => useMusicalSound(true));
        act(() => mutedResult.current.playWrongMelody());
        expect(mutedResult.current.melodyCombo).toBe(0); // fresh hook, combo is 0
    });

    it('isMuted reflects localStorage on initial render', () => {
        setMuted();
        const { result } = renderHook(() => useMusicalSound(true));
        expect(result.current.isMuted).toBe(true);
    });

    it('isMuted is false when localStorage is empty', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        expect(result.current.isMuted).toBe(false);
    });

    it('isMuted is false when localStorage has invalid JSON', () => {
        store['isMuted'] = '{not json';
        const { result } = renderHook(() => useMusicalSound(true));
        expect(result.current.isMuted).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOUND GARDEN DISABLED
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — sound garden disabled', () => {
    beforeEach(() => setupMocks());

    it('blocks playMelodyNote when soundGarden is disabled', () => {
        const { result } = renderHook(() => useMusicalSound(false));
        act(() => result.current.playMelodyNote());
        expect(oscillators).toHaveLength(0);
    });

    it('blocks playWrongMelody when soundGarden is disabled', () => {
        const { result } = renderHook(() => useMusicalSound(false));
        act(() => result.current.playWrongMelody());
        expect(oscillators).toHaveLength(0);
    });

    it('does not increment combo when soundGarden is disabled', () => {
        const { result } = renderHook(() => useMusicalSound(false));
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('does not reset combo when soundGarden is disabled and playWrongMelody', () => {
        const { result } = renderHook(() => useMusicalSound(false));
        // combo won't increment since playMelodyNote is blocked
        act(() => result.current.playWrongMelody());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('resetMelodyCombo still works when soundGarden is disabled', () => {
        const { result } = renderHook(() => useMusicalSound(false));
        act(() => result.current.resetMelodyCombo());
        expect(result.current.melodyCombo).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// VOLUME / GAIN
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — volume / gain', () => {
    beforeEach(() => setupMocks());

    it('melody note sets main gain to 0.25', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(gainValues()).toContain(0.25);
    });

    it('melody note ramps gain down to 0.001 (exponential)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(gainValues()).toContain(0.001);
    });

    it('wrong melody sets gain to 0.2 for each note', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        const setValues = gainNodes.flatMap(g =>
            g.gain.setValueAtTime.mock.calls.map(c => c[0])
        );
        expect(setValues).toContain(0.2);
        expect(setValues.filter(v => v === 0.2)).toHaveLength(2);
    });

    it('wrong melody ramps gain down to 0.001 for each note', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        const rampValues = gainNodes.flatMap(g =>
            g.gain.exponentialRampToValueAtTime.mock.calls.map(c => c[0])
        );
        expect(rampValues.filter(v => v === 0.001)).toHaveLength(2);
    });

    it('harmony oscillator sets gain to 0.12', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        // Play 8 notes to reach combo 8 → 9th note has harmony
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote());
        expect(gainValues()).toContain(0.12);
    });

    it('harmony oscillator ramps gain down to 0.001', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote());
        expect(gainNodes.length).toBeGreaterThanOrEqual(10);
        expect(gainValues()).toContain(0.001);
    });

    it('creates exactly one gain node per melody call (combo < 8)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(gainNodes).toHaveLength(1);
    });

    it('creates two gain nodes when harmony is present (combo >= 8)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        const gainBefore = gainNodes.length;
        act(() => result.current.playMelodyNote());
        expect(gainNodes.length - gainBefore).toBe(2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBACK — melody note
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — melody playback', () => {
    beforeEach(() => setupMocks());

    it('first note plays C4 (261.63 Hz)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(frequencies()).toContain(261.63);
    });

    it('second note plays D4 (293.66 Hz)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        const lastFreq = lastOsc().frequency.setValueAtTime.mock.calls[0][0];
        expect(lastFreq).toBe(293.66);
    });

    it('third note plays E4 (329.63 Hz)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        const lastFreq = lastOsc().frequency.setValueAtTime.mock.calls[0][0];
        expect(lastFreq).toBe(329.63);
    });

    it('eighth note plays C5 (523.25 Hz)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        const lastFreq = lastOsc().frequency.setValueAtTime.mock.calls[0][0];
        expect(lastFreq).toBe(523.25); // C5 (index 7)
    });

    it('ninth note wraps to C4 (261.63 Hz) — main oscillator', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote()); // combo 8 → wraps to index 0
        // At combo >= 8, two oscillators are created: main first, harmony second.
        // lastOsc() is the harmony osc. We need the main (second-to-last).
        const mainOsc = oscillators[oscillators.length - 2];
        const mainFreq = mainOsc.frequency.setValueAtTime.mock.calls[0][0];
        expect(mainFreq).toBe(261.63);
    });

    it('ninth note harmony frequency is 1.5 × C4 = 392.445 Hz', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote());
        const harmonyOsc = lastOsc();
        const harmonyFreq = harmonyOsc.frequency.setValueAtTime.mock.calls[0][0];
        expect(harmonyFreq).toBeCloseTo(261.63 * 1.5, 2);
    });

    it('default wave type is sine when no operation specified', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(lastOsc().type).toBe('sine');
    });

    it('addition uses sine wave', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote('addition'));
        expect(lastOsc().type).toBe('sine');
    });

    it('subtraction uses triangle wave', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote('subtraction'));
        expect(lastOsc().type).toBe('triangle');
    });

    it('multiplication uses square wave', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote('multiplication'));
        expect(lastOsc().type).toBe('square');
    });

    it('division uses sawtooth wave', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote('division'));
        expect(lastOsc().type).toBe('sawtooth');
    });

    it('increments melodyCombo by 1 per playMelodyNote call', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(1);
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(2);
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(3);
    });

    it('creates exactly one oscillator and one gain node when combo < 8', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(oscillators).toHaveLength(1);
        expect(gainNodes).toHaveLength(1);
    });

    it('creates two oscillators and two gain nodes when combo >= 8 (harmony)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        const oscBefore = oscillators.length;
        const gainBefore = gainNodes.length;
        act(() => result.current.playMelodyNote()); // combo 8 → harmony
        expect(oscillators.length - oscBefore).toBe(2);
        expect(gainNodes.length - gainBefore).toBe(2);
    });

    it('harmony frequency is 1.5x the main frequency (perfect fifth)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote());
        const mainOsc = oscillators[oscillators.length - 2];
        const harmonyOsc = oscillators[oscillators.length - 1];
        const mainFreq = mainOsc.frequency.setValueAtTime.mock.calls[0][0];
        const harmonyFreq = harmonyOsc.frequency.setValueAtTime.mock.calls[0][0];
        expect(harmonyFreq).toBeCloseTo(mainFreq * 1.5, 2);
    });

    it('main oscillator stop time is 0.4s after currentTime', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        const stopCalls = lastOsc().stop.mock.calls;
        expect(stopCalls[0][0]).toBeCloseTo(0.4);
    });

    it('play is not re-exported from useSound (not part of musical API)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        expect(result.current.play).toBeUndefined();
        expect(result.current.playSound).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBACK — wrong melody
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — wrong melody playback', () => {
    beforeEach(() => setupMocks());

    it('creates exactly 2 oscillators (two descending notes)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        expect(oscillators).toHaveLength(2);
        expect(gainNodes).toHaveLength(2);
    });

    it('first note is C5 (523.25 Hz)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        expect(frequencies()).toContain(523.25);
    });

    it('second note is G4 (392.00 Hz)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        expect(frequencies()).toContain(392.00);
    });

    it('both notes use sine wave', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        expect(oscillators[0].type).toBe('sine');
        expect(oscillators[1].type).toBe('sine');
    });

    it('first note starts at currentTime (offset 0)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        const firstOsc = oscillators[0];
        expect(firstOsc.start.mock.calls[0][0]).toBe(0);
        expect(firstOsc.stop.mock.calls[0][0]).toBeCloseTo(0.2);
    });

    it('second note starts at 0.2s after currentTime', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        const secondOsc = oscillators[1];
        expect(secondOsc.start.mock.calls[0][0]).toBeCloseTo(0.2);
        expect(secondOsc.stop.mock.calls[0][0]).toBeCloseTo(0.5); // 0.2 + 0.3
    });

    it('resets melodyCombo to 0', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(3);
        act(() => result.current.playWrongMelody());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('wrong melody gain durations: first 0.2s, second 0.3s', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        // First note: gain ramp from 0.2 to 0.001 over 0.2s
        // Second note: gain ramp from 0.2 to 0.001 over 0.3s
        const firstGainRamp = gainNodes[0].gain.exponentialRampToValueAtTime.mock.calls[0];
        const secondGainRamp = gainNodes[1].gain.exponentialRampToValueAtTime.mock.calls[0];
        // The ramp target value is 0.001, and the time parameter includes the offset
        expect(firstGainRamp[0]).toBe(0.001);
        expect(secondGainRamp[0]).toBe(0.001);
        // Times: first at 0.2, second at 0.5
        expect(firstGainRamp[1]).toBeCloseTo(0.2);
        expect(secondGainRamp[1]).toBeCloseTo(0.5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMBO MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — combo management', () => {
    beforeEach(() => setupMocks());

    it('resetMelodyCombo sets combo to 0', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(2);
        act(() => result.current.resetMelodyCombo());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('combo wraps after 8 notes (scale length) — main oscillator frequency', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 9; i++) {
            act(() => result.current.playMelodyNote());
        }
        expect(result.current.melodyCombo).toBe(9);
        // 9th note (combo 8) wraps to index 0 → C4
        // At combo 8, harmony is added, so main is second-to-last osc
        const mainOsc = oscillators[oscillators.length - 2];
        const mainFreq = mainOsc.frequency.setValueAtTime.mock.calls[0][0];
        expect(mainFreq).toBe(261.63);
    });

    it('combo continues incrementing past scale length (no cap)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 20; i++) {
            act(() => result.current.playMelodyNote());
        }
        expect(result.current.melodyCombo).toBe(20);
    });

    it('wrong melody resets combo to 0 after buildup', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 5; i++) {
            act(() => result.current.playMelodyNote());
        }
        expect(result.current.melodyCombo).toBe(5);
        act(() => result.current.playWrongMelody());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('after wrong melody reset, next note plays C4 again', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 5; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playWrongMelody()); // resets to 0
        act(() => result.current.playMelodyNote()); // combo 0 → C4
        const freq = lastOsc().frequency.setValueAtTime.mock.calls[0][0];
        expect(freq).toBe(261.63);
    });

    it('resetMelodyCombo followed by playMelodyNote starts from C4', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 6; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.resetMelodyCombo());
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(1);
        expect(frequencies()).toContain(261.63);
    });

    it('ref stays in sync with state across separate act() calls', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        // 4th note: combo was 3 → index 3 → F4 (349.23)
        act(() => result.current.playMelodyNote());
        const freq = lastOsc().frequency.setValueAtTime.mock.calls[0][0];
        expect(freq).toBeCloseTo(349.23, 2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// HARMONY OSCILLATOR
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — harmony oscillator', () => {
    beforeEach(() => setupMocks());

    it('no harmony when combo < 8', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 7; i++) {
            act(() => result.current.playMelodyNote());
        }
        expect(oscillators).toHaveLength(7);
        expect(gainNodes).toHaveLength(7);
    });

    it('harmony appears at combo >= 8', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        const oscBefore = oscillators.length;
        act(() => result.current.playMelodyNote());
        expect(oscillators.length - oscBefore).toBe(2);
    });

    it('harmony persists for combo 9, 10, etc.', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        const oscBefore = oscillators.length;
        act(() => result.current.playMelodyNote()); // combo 8
        act(() => result.current.playMelodyNote()); // combo 9
        act(() => result.current.playMelodyNote()); // combo 10
        expect(oscillators.length - oscBefore).toBe(6); // 3 × 2
    });

    it('harmony uses same wave type as main oscillator', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote('subtraction')); // triangle
        const mainOsc = oscillators[oscillators.length - 2];
        const harmonyOsc = oscillators[oscillators.length - 1];
        expect(mainOsc.type).toBe('triangle');
        expect(harmonyOsc.type).toBe('triangle');
    });

    it('harmony gain (0.12) is lower than main gain (0.25)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote());
        const mainGain = gainNodes[gainNodes.length - 2];
        const harmonyGain = gainNodes[gainNodes.length - 1];
        const mainSetValue = mainGain.gain.setValueAtTime.mock.calls[0][0];
        const harmonySetValue = harmonyGain.gain.setValueAtTime.mock.calls[0][0];
        expect(mainSetValue).toBe(0.25);
        expect(harmonySetValue).toBe(0.12);
        expect(harmonySetValue).toBeLessThan(mainSetValue);
    });

    it('harmony stop time matches main stop time (0.4s)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote());
        const mainOsc = oscillators[oscillators.length - 2];
        const harmonyOsc = oscillators[oscillators.length - 1];
        expect(mainOsc.stop.mock.calls[0][0]).toBeCloseTo(0.4);
        expect(harmonyOsc.stop.mock.calls[0][0]).toBeCloseTo(0.4);
    });

    it('no harmony after wrong melody resets combo to 0', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 10; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playWrongMelody()); // resets combo
        const oscBefore = oscillators.length;
        act(() => result.current.playMelodyNote()); // combo 0, no harmony
        expect(oscillators.length - oscBefore).toBe(1);
    });

    it('no harmony after resetMelodyCombo', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 10; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.resetMelodyCombo());
        const oscBefore = oscillators.length;
        act(() => result.current.playMelodyNote()); // combo 0, no harmony
        expect(oscillators.length - oscBefore).toBe(1);
    });

    it('harmony frequency at combo 9 is D4 * 1.5 = 440.49', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 9; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote()); // combo 9, wraps to D4 (293.66)
        const mainOsc = oscillators[oscillators.length - 2];
        const harmonyOsc = oscillators[oscillators.length - 1];
        const mainFreq = mainOsc.frequency.setValueAtTime.mock.calls[0][0];
        const harmonyFreq = harmonyOsc.frequency.setValueAtTime.mock.calls[0][0];
        expect(mainFreq).toBeCloseTo(293.66, 2); // D4 (index 1)
        expect(harmonyFreq).toBeCloseTo(293.66 * 1.5, 2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP — oscillator and gain node disconnect (async via microtask)
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — cleanup', () => {
    beforeEach(() => setupMocks());

    it('melody oscillator disconnects after onended fires', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        await flushMicrotasks();
        expect(lastOsc().disconnect).toHaveBeenCalled();
    });

    it('melody gain node disconnects after onended fires', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        await flushMicrotasks();
        expect(lastGain().disconnect).toHaveBeenCalled();
    });

    it('wrong melody oscillators disconnect after onended fires', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        await flushMicrotasks();
        oscillators.forEach(osc => {
            expect(osc.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('wrong melody gain nodes disconnect after onended fires', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        await flushMicrotasks();
        gainNodes.forEach(g => {
            expect(g.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('harmony oscillator disconnects after onended fires', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote()); // with harmony
        await flushMicrotasks();
        const harmonyOsc = oscillators[oscillators.length - 1];
        expect(harmonyOsc.disconnect).toHaveBeenCalled();
    });

    it('harmony gain node disconnects after onended fires', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote()); // with harmony
        await flushMicrotasks();
        const harmonyGain = gainNodes[gainNodes.length - 1];
        expect(harmonyGain.disconnect).toHaveBeenCalled();
    });

    it('oscillator.start is called for melody', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(lastOsc().start).toHaveBeenCalled();
    });

    it('oscillator.connect routes through gain', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(lastOsc().connect).toHaveBeenCalled();
    });

    it('gain.connect routes to destination', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        expect(lastGain().connect).toHaveBeenCalled();
    });

    it('all melody oscillators disconnect after multiple plays (no leak)', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        await flushMicrotasks();
        oscillators.forEach(osc => {
            expect(osc.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('all gain nodes disconnect after multiple plays (no leak)', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        await flushMicrotasks();
        gainNodes.forEach(g => {
            expect(g.disconnect).toHaveBeenCalledTimes(1);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// RAPID PLAY
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — rapid play', () => {
    beforeEach(() => setupMocks());

    it('creates correct oscillator count for 10 rapid melody calls', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => {
            for (let i = 0; i < 10; i++) {
                result.current.playMelodyNote();
            }
        });
        // When called in a single act(), comboRef doesn't update between calls
        // (useEffect doesn't run mid-act). So every call sees comboRef = 0,
        // meaning no harmony and all play C4. 10 calls → 10 oscillators.
        expect(oscillators).toHaveLength(10);
        expect(gainNodes).toHaveLength(10);
    });

    it('all rapid-play oscillators disconnect after flush (no leak)', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => {
            for (let i = 0; i < 10; i++) {
                result.current.playMelodyNote();
            }
        });
        await flushMicrotasks();
        oscillators.forEach(osc => {
            expect(osc.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('all rapid-play gain nodes disconnect after flush (no leak)', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => {
            for (let i = 0; i < 10; i++) {
                result.current.playMelodyNote();
            }
        });
        await flushMicrotasks();
        gainNodes.forEach(g => {
            expect(g.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('rapid wrong melody calls create 2 oscillators each', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => {
            for (let i = 0; i < 5; i++) {
                result.current.playWrongMelody();
            }
        });
        expect(oscillators).toHaveLength(10);
        expect(gainNodes).toHaveLength(10);
    });

    it('rapid wrong melody all disconnect after flush', async () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => {
            for (let i = 0; i < 5; i++) {
                result.current.playWrongMelody();
            }
        });
        await flushMicrotasks();
        oscillators.forEach(osc => {
            expect(osc.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('rapid play while muted creates zero oscillators', () => {
        setMuted();
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => {
            for (let i = 0; i < 20; i++) {
                result.current.playMelodyNote();
            }
        });
        expect(oscillators).toHaveLength(0);
        expect(gainNodes).toHaveLength(0);
    });

    it('rapid play while soundGarden disabled creates zero oscillators', () => {
        const { result } = renderHook(() => useMusicalSound(false));
        act(() => {
            for (let i = 0; i < 20; i++) {
                result.current.playMelodyNote();
            }
        });
        expect(oscillators).toHaveLength(0);
    });

    it('separate act() calls produce correct frequency progression', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        const expectedFreqs = C_MAJOR; // combos 0-7
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
            const freq = lastOsc().frequency.setValueAtTime.mock.calls[0][0];
            expect(freq).toBeCloseTo(expectedFreqs[i], 2);
        }
    });

    it('rapid mixed: melody then wrong melody resets combo', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => {
            result.current.playMelodyNote(); // combo 0→1
            result.current.playMelodyNote(); // combo 1→2
            result.current.playMelodyNote(); // combo 2→3
            result.current.playWrongMelody(); // combo → 0
            result.current.playMelodyNote(); // combo 0→1, freq C4
        });
        expect(result.current.melodyCombo).toBe(1);
    });

    it('20 rapid melody calls in separate act() produce correct combo', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 20; i++) {
            act(() => result.current.playMelodyNote());
        }
        expect(result.current.melodyCombo).toBe(20);
    });

    it('10 separate-act melody calls produce 10 oscillators with harmony at 8+', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        for (let i = 0; i < 10; i++) {
            act(() => result.current.playMelodyNote());
        }
        // Combos 0-7: 1 osc each (8), combos 8-9: 2 osc each (4) = 12
        expect(oscillators).toHaveLength(12);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════
describe('useMusicalSound — edge cases', () => {
    beforeEach(() => setupMocks());

    it('playMelodyNote with undefined operation uses default sine wave', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote(undefined));
        expect(lastOsc().type).toBe('sine');
    });

    it('resetMelodyCombo when already 0 does not throw', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        expect(() => act(() => result.current.resetMelodyCombo())).not.toThrow();
        expect(result.current.melodyCombo).toBe(0);
    });

    it('multiple resetMelodyCombo calls are idempotent', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playMelodyNote());
        act(() => result.current.resetMelodyCombo());
        act(() => result.current.resetMelodyCombo());
        act(() => result.current.resetMelodyCombo());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('playWrongMelody with combo at 0 stays at 0', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => result.current.playWrongMelody());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('toggleSoundGarden does not change isSoundGarden (stub)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        const before = result.current.isSoundGarden;
        act(() => result.current.toggleSoundGarden());
        expect(result.current.isSoundGarden).toBe(before);
    });

    it('playMelodyNote after resetMelodyCombo + playWrongMelody starts from C4', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        // Build combo
        for (let i = 0; i < 5; i++) {
            act(() => result.current.playMelodyNote());
        }
        // Reset via resetMelodyCombo
        act(() => result.current.resetMelodyCombo());
        // Reset via playWrongMelody (combo already 0, stays 0)
        act(() => result.current.playWrongMelody());
        // Next note should be C4
        act(() => result.current.playMelodyNote());
        expect(frequencies()).toContain(261.63);
    });

    it('rapid single-act calls all use comboRef=0 (no useEffect between calls)', () => {
        const { result } = renderHook(() => useMusicalSound(true));
        act(() => {
            result.current.playMelodyNote();
            result.current.playMelodyNote();
            result.current.playMelodyNote();
        });
        // comboRef stays at 0 during all 3 calls (useEffect hasn't run)
        // All 3 oscillators should play C4
        expect(oscillators).toHaveLength(3);
        oscillators.forEach(osc => {
            const freq = osc.frequency.setValueAtTime.mock.calls[0][0];
            expect(freq).toBe(261.63);
        });
        // But melodyCombo state is 3
        expect(result.current.melodyCombo).toBe(3);
    });
});
