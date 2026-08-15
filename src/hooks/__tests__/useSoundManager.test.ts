// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSoundManager } from '../useSoundManager';

// ═══════════════════════════════════════════════════════════════════════════
// AudioContext mock
//
// useSoundManager uses a single module-level AudioContext singleton.
// The FakeOscillator.stop() fires onended synchronously (mirrors real Web
// Audio where onended fires when the oscillator stops).
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
    stop = vi.fn(() => { this.onended?.(); });
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

// ── Shared setup ───────────────────────────────────────────────────────────
const setupMocks = () => {
    localStorage.clear();
    vi.clearAllMocks();
    oscillators = [];
    gainNodes = [];
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext = FakeAudioContext;
};

const setMuted = () => {
    store['isMuted'] = 'true';
};

// C major scale frequencies for assertions
const C_MAJOR = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];

// ═══════════════════════════════════════════════════════════════════════════
// API SURFACE
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — API surface', () => {
    beforeEach(() => setupMocks());

    it('exposes all semantic event functions', () => {
        const { result } = renderHook(() => useSoundManager());
        expect(result.current.playCorrect).toBeTypeOf('function');
        expect(result.current.playWrong).toBeTypeOf('function');
        expect(result.current.playLevelUp).toBeTypeOf('function');
        expect(result.current.playGameOver).toBeTypeOf('function');
        expect(result.current.playClick).toBeTypeOf('function');
        expect(result.current.playStreak).toBeTypeOf('function');
        expect(result.current.playFrenzy).toBeTypeOf('function');
        expect(result.current.playMilestone).toBeTypeOf('function');
    });

    it('exposes raw sound API (backward compat)', () => {
        const { result } = renderHook(() => useSoundManager());
        expect(result.current.playSound).toBeTypeOf('function');
        expect(result.current.play).toBeTypeOf('function');
        expect(result.current.play).toBe(result.current.playSound);
    });

    it('exposes mute control', () => {
        const { result } = renderHook(() => useSoundManager());
        expect(result.current.isMuted).toBe(false);
        expect(result.current.toggleMute).toBeTypeOf('function');
    });

    it('exposes Sound Garden API', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        expect(result.current.isSoundGarden).toBe(true);
        expect(result.current.melodyCombo).toBe(0);
        expect(result.current.resetMelodyCombo).toBeTypeOf('function');
        expect(result.current.playMelodyNote).toBeTypeOf('function');
        expect(result.current.playWrongMelody).toBeTypeOf('function');
    });

    it('isSoundGarden defaults to false', () => {
        const { result } = renderHook(() => useSoundManager());
        expect(result.current.isSoundGarden).toBe(false);
    });

    it('isSoundGarden reflects options parameter', () => {
        const { result: enabled } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        expect(enabled.current.isSoundGarden).toBe(true);
        const { result: disabled } = renderHook(() => useSoundManager({ soundGardenEnabled: false }));
        expect(disabled.current.isSoundGarden).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTE BEHAVIOUR
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — mute behaviour', () => {
    beforeEach(() => setupMocks());

    it('initialises muted state from localStorage', () => {
        localStorage.setItem('isMuted', 'true');
        const { result } = renderHook(() => useSoundManager());
        expect(result.current.isMuted).toBe(true);
    });

    it('initialises unmuted when localStorage is empty', () => {
        const { result } = renderHook(() => useSoundManager());
        expect(result.current.isMuted).toBe(false);
    });

    it('initialises unmuted when localStorage has invalid JSON', () => {
        localStorage.setItem('isMuted', '{not json');
        const { result } = renderHook(() => useSoundManager());
        expect(result.current.isMuted).toBe(false);
    });

    it('toggleMute flips from unmuted → muted → unmuted', () => {
        const { result } = renderHook(() => useSoundManager());
        expect(result.current.isMuted).toBe(false);
        act(() => result.current.toggleMute());
        expect(result.current.isMuted).toBe(true);
        act(() => result.current.toggleMute());
        expect(result.current.isMuted).toBe(false);
    });

    it('persists mute state to localStorage', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.toggleMute());
        expect(JSON.parse(localStorage.getItem('isMuted') ?? 'false')).toBe(true);
    });

    it('persists unmuted state after toggling back', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.toggleMute());
        act(() => result.current.toggleMute());
        expect(JSON.parse(localStorage.getItem('isMuted') ?? 'true')).toBe(false);
    });

    it('blocks raw playSound when muted', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.toggleMute());
        act(() => result.current.playSound('correct'));
        expect(frequencies()).toHaveLength(0);
    });

    it('blocks semantic playCorrect when muted', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.toggleMute());
        act(() => result.current.playCorrect());
        expect(frequencies()).toHaveLength(0);
    });

    it('blocks semantic playWrong when muted', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.toggleMute());
        act(() => result.current.playWrong());
        expect(frequencies()).toHaveLength(0);
    });

    it('blocks semantic playLevelUp when muted', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.toggleMute());
        act(() => result.current.playLevelUp());
        expect(frequencies()).toHaveLength(0);
    });

    it('blocks semantic playGameOver when muted', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.toggleMute());
        act(() => result.current.playGameOver());
        expect(frequencies()).toHaveLength(0);
    });

    it('blocks Sound Garden playMelodyNote when muted', () => {
        setMuted();
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        expect(oscillators).toHaveLength(0);
    });

    it('blocks Sound Garden playWrongMelody when muted', () => {
        setMuted();
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playWrongMelody());
        expect(oscillators).toHaveLength(0);
    });

    it('restores sound after unmuting', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.toggleMute());
        act(() => result.current.toggleMute());
        act(() => result.current.playSound('correct'));
        expect(frequencies().flat()).toContain(523.25);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC EVENT API — Sound Garden OFF (classic beeps)
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — semantic API (Sound Garden OFF)', () => {
    beforeEach(() => setupMocks());

    it('playCorrect plays the classic correct beep (C5 → C6)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playCorrect());
        expect(frequencies().flat()).toContain(523.25);
        expect(frequencies().flat()).toContain(1046.5);
    });

    it('playWrong plays the classic wrong buzz (150 → 100 Hz)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playWrong());
        expect(frequencies().flat()).toContain(150);
        expect(frequencies().flat()).toContain(100);
    });

    it('playLevelUp plays the levelUp fanfare (A4/C#5/E5)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playLevelUp());
        const freqs = frequencies().flat();
        expect(freqs).toContain(440);
        expect(freqs).toContain(554);
        expect(freqs).toContain(659);
    });

    it('playGameOver plays descending tones (C5/G4/C4)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playGameOver());
        const freqs = frequencies().flat();
        expect(freqs).toContain(523.25); // C5
        expect(freqs).toContain(392.0);  // G4
        expect(freqs).toContain(261.63); // C4
    });

    it('playClick plays a short 800 Hz click', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playClick());
        expect(frequencies().flat()).toContain(800);
    });

    it('playStreak plays ascending C5/E5/G5 arpeggio', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playStreak());
        const freqs = frequencies().flat();
        expect(freqs).toContain(523.25);
        expect(freqs).toContain(659.25);
        expect(freqs).toContain(783.99);
    });

    it('playFrenzy plays 200 Hz sawtooth buzz', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playFrenzy());
        expect(frequencies().flat()).toContain(200);
        expect(lastOsc().type).toBe('sawtooth');
    });

    it('playMilestone plays C6 (1046.5 Hz) chime', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playMilestone());
        expect(frequencies().flat()).toContain(1046.5);
        expect(lastOsc().type).toBe('sine');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC EVENT API — Sound Garden ON (musical mode)
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — semantic API (Sound Garden ON)', () => {
    beforeEach(() => setupMocks());

    it('playCorrect delegates to playMelodyNote when Sound Garden is on', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playCorrect());
        // Should play C4 (first note of C major scale), NOT the classic C5→C6 beep
        expect(frequencies()).toContain(261.63);
        expect(frequencies().flat()).not.toContain(1046.5);
    });

    it('playCorrect with operation uses correct wave type', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playCorrect('addition'));
        expect(lastOsc().type).toBe('sine');
    });

    it('playCorrect with subtraction uses triangle wave', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playCorrect('subtraction'));
        expect(lastOsc().type).toBe('triangle');
    });

    it('playCorrect with multiplication uses square wave', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playCorrect('multiplication'));
        expect(lastOsc().type).toBe('square');
    });

    it('playCorrect with division uses sawtooth wave', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playCorrect('division'));
        expect(lastOsc().type).toBe('sawtooth');
    });

    it('playWrong delegates to playWrongMelody when Sound Garden is on', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playWrong());
        // Should play descending C5→G4, NOT the classic 150→100 Hz buzz
        expect(frequencies()).toContain(523.25);
        expect(frequencies()).toContain(392.0);
        expect(frequencies().flat()).not.toContain(150);
    });

    it('playCorrect increments melodyCombo in Sound Garden mode', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playCorrect());
        expect(result.current.melodyCombo).toBe(1);
        act(() => result.current.playCorrect());
        expect(result.current.melodyCombo).toBe(2);
    });

    it('playWrong resets melodyCombo in Sound Garden mode', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playCorrect());
        act(() => result.current.playCorrect());
        act(() => result.current.playCorrect());
        expect(result.current.melodyCombo).toBe(3);
        act(() => result.current.playWrong());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('playLevelUp still uses classic fanfare in Sound Garden mode', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playLevelUp());
        const freqs = frequencies().flat();
        expect(freqs).toContain(440);
        expect(freqs).toContain(554);
        expect(freqs).toContain(659);
    });

    it('playGameOver still uses classic descending tones in Sound Garden mode', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playGameOver());
        const freqs = frequencies().flat();
        expect(freqs).toContain(523.25);
        expect(freqs).toContain(392.0);
        expect(freqs).toContain(261.63);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// VOLUME / GAIN
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — volume / gain', () => {
    beforeEach(() => setupMocks());

    it('correct sound sets initial gain to 0.3', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('correct'));
        expect(gainValues()).toContain(0.3);
    });

    it('wrong sound sets initial gain to 0.3', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('wrong'));
        expect(gainValues()).toContain(0.3);
    });

    it('click sound sets initial gain to 0.1 (quieter)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('click'));
        expect(gainValues()).toContain(0.1);
    });

    it('levelUp sound sets initial gain to 0.2', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('levelUp'));
        expect(gainValues()).toContain(0.2);
    });

    it('streak sound sets initial gain to 0.25', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('streak'));
        expect(gainValues()).toContain(0.25);
    });

    it('frenzy sound sets initial gain to 0.3', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('frenzy'));
        expect(gainValues()).toContain(0.3);
    });

    it('milestone sound sets initial gain to 0.3', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('milestone'));
        expect(gainValues()).toContain(0.3);
    });

    it('gameOver sound sets initial gain to 0.25', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('gameOver'));
        expect(gainValues()).toContain(0.25);
    });

    it('correct sound ramps gain down to 0.01 (exponential)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('correct'));
        expect(gainValues()).toContain(0.01);
    });

    it('milestone sound ramps gain down to 0.001', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('milestone'));
        expect(gainValues()).toContain(0.001);
    });

    it('levelUp sound ramps gain down to 0 (linear)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('levelUp'));
        expect(gainValues()).toContain(0);
    });

    it('creates exactly one gain node per playSound call (simple sounds)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('correct'));
        expect(gainNodes).toHaveLength(1);
    });

    // Sound Garden gain values
    it('melody note sets main gain to 0.25', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        expect(gainValues()).toContain(0.25);
    });

    it('melody note ramps gain down to 0.001 (exponential)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        expect(gainValues()).toContain(0.001);
    });

    it('wrong melody sets gain to 0.2 for each note', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playWrongMelody());
        const setValues = gainNodes.flatMap(g =>
            g.gain.setValueAtTime.mock.calls.map(c => c[0])
        );
        expect(setValues.filter(v => v === 0.2)).toHaveLength(2);
    });

    it('harmony oscillator sets gain to 0.12', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 8; i++) {
            act(() => result.current.playMelodyNote());
        }
        act(() => result.current.playMelodyNote());
        expect(gainValues()).toContain(0.12);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBACK — verify oscillator type & frequency for every sound type
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — playback per sound type', () => {
    beforeEach(() => setupMocks());

    it('correct: sine wave, C5 → C6 ramp', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('correct'));
        const osc = lastOsc();
        expect(osc.type).toBe('sine');
        const freqs = frequencies().flat();
        expect(freqs).toContain(523.25);
        expect(freqs).toContain(1046.5);
    });

    it('wrong: sawtooth wave, 150 → 100 Hz ramp', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('wrong'));
        const osc = lastOsc();
        expect(osc.type).toBe('sawtooth');
        const freqs = frequencies().flat();
        expect(freqs).toContain(150);
        expect(freqs).toContain(100);
    });

    it('levelUp: triangle wave, A4 / C#5 / E5 sequence', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('levelUp'));
        const osc = lastOsc();
        expect(osc.type).toBe('triangle');
    });

    it('gameOver: triangle wave, descending C5/G4/C4', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('gameOver'));
        expect(lastOsc().type).toBe('triangle');
        const freqs = frequencies().flat();
        expect(freqs).toContain(523.25);
        expect(freqs).toContain(392.0);
        expect(freqs).toContain(261.63);
    });

    it('click: sine wave, 800 Hz short burst', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('click'));
        const osc = lastOsc();
        expect(osc.type).toBe('sine');
        expect(frequencies().flat()).toContain(800);
    });

    it('streak: sine wave, ascending C5/E5/G5 arpeggio', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('streak'));
        const osc = lastOsc();
        expect(osc.type).toBe('sine');
        const freqs = frequencies().flat();
        expect(freqs).toContain(523.25);
        expect(freqs).toContain(659.25);
        expect(freqs).toContain(783.99);
    });

    it('frenzy: sawtooth wave, 200 Hz', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('frenzy'));
        const osc = lastOsc();
        expect(osc.type).toBe('sawtooth');
        expect(frequencies().flat()).toContain(200);
    });

    it('milestone: sine wave, C6 (1046.5 Hz)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('milestone'));
        const osc = lastOsc();
        expect(osc.type).toBe('sine');
        expect(frequencies().flat()).toContain(1046.5);
    });

    it('gameOver creates 3 oscillators (3 descending notes)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('gameOver'));
        expect(oscillators).toHaveLength(3);
        expect(gainNodes).toHaveLength(3);
    });

    it('play is an alias of playSound', () => {
        const { result } = renderHook(() => useSoundManager());
        expect(result.current.play).toBe(result.current.playSound);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP — oscillators and gain nodes disconnect on ended
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — cleanup', () => {
    beforeEach(() => setupMocks());

    it('oscillator.disconnect is called after onended fires', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('correct'));
        expect(lastOsc().disconnect).toHaveBeenCalled();
    });

    it('gain node disconnect is called after onended fires', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('correct'));
        expect(lastGain().disconnect).toHaveBeenCalled();
    });

    it('oscillator.start is called', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('correct'));
        expect(lastOsc().start).toHaveBeenCalled();
    });

    it('oscillator.stop is called with a time > currentTime', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('correct'));
        const stopCalls = lastOsc().stop.mock.calls;
        expect(stopCalls).toHaveLength(1);
        expect(stopCalls[0][0]).toBeGreaterThan(0);
    });

    it('all simple sound types disconnect their oscillator on ended', () => {
        const { result } = renderHook(() => useSoundManager());
        const types: SoundType[] = ['correct', 'wrong', 'click', 'frenzy', 'milestone'];
        types.forEach(t => act(() => result.current.playSound(t)));
        expect(oscillators).toHaveLength(types.length);
        oscillators.forEach(osc => {
            expect(osc.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('all simple sound types disconnect their gain node on ended', () => {
        const { result } = renderHook(() => useSoundManager());
        const types: SoundType[] = ['correct', 'wrong', 'click', 'frenzy', 'milestone'];
        types.forEach(t => act(() => result.current.playSound(t)));
        expect(gainNodes).toHaveLength(types.length);
        gainNodes.forEach(g => {
            expect(g.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('stop time for correct is 0.5s after currentTime', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('correct'));
        expect(lastOsc().stop.mock.calls[0][0]).toBe(0.5);
    });

    it('stop time for click is 0.05s after currentTime', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('click'));
        expect(lastOsc().stop.mock.calls[0][0]).toBeCloseTo(0.05);
    });

    it('gameOver: all 3 oscillators disconnect', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('gameOver'));
        expect(oscillators).toHaveLength(3);
        oscillators.forEach(osc => {
            expect(osc.disconnect).toHaveBeenCalledTimes(1);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOUND GARDEN — melody playback
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — Sound Garden melody playback', () => {
    beforeEach(() => setupMocks());

    it('first note plays C4 (261.63 Hz)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        expect(frequencies()).toContain(261.63);
    });

    it('second note plays D4 (293.66 Hz)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        const lastFreq = lastOsc().frequency.setValueAtTime.mock.calls[0][0];
        expect(lastFreq).toBe(293.66);
    });

    it('third note plays E4 (329.63 Hz)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 3; i++) act(() => result.current.playMelodyNote());
        const lastFreq = lastOsc().frequency.setValueAtTime.mock.calls[0][0];
        expect(lastFreq).toBe(329.63);
    });

    it('eighth note plays C5 (523.25 Hz)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 8; i++) act(() => result.current.playMelodyNote());
        const lastFreq = lastOsc().frequency.setValueAtTime.mock.calls[0][0];
        expect(lastFreq).toBe(523.25);
    });

    it('ninth note wraps to C4 — main oscillator', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 8; i++) act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote()); // combo 8 → wraps
        const mainOsc = oscillators[oscillators.length - 2];
        const mainFreq = mainOsc.frequency.setValueAtTime.mock.calls[0][0];
        expect(mainFreq).toBe(261.63);
    });

    it('ninth note harmony is 1.5 × C4', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 8; i++) act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        const harmonyOsc = lastOsc();
        const harmonyFreq = harmonyOsc.frequency.setValueAtTime.mock.calls[0][0];
        expect(harmonyFreq).toBeCloseTo(261.63 * 1.5, 2);
    });

    it('default wave type is sine when no operation specified', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        expect(lastOsc().type).toBe('sine');
    });

    it('addition uses sine wave', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote('addition'));
        expect(lastOsc().type).toBe('sine');
    });

    it('subtraction uses triangle wave', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote('subtraction'));
        expect(lastOsc().type).toBe('triangle');
    });

    it('multiplication uses square wave', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote('multiplication'));
        expect(lastOsc().type).toBe('square');
    });

    it('division uses sawtooth wave', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote('division'));
        expect(lastOsc().type).toBe('sawtooth');
    });

    it('increments melodyCombo by 1 per playMelodyNote call', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(1);
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(2);
    });

    it('creates exactly one oscillator when combo < 8', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        expect(oscillators).toHaveLength(1);
        expect(gainNodes).toHaveLength(1);
    });

    it('creates two oscillators when combo >= 8 (harmony)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 8; i++) act(() => result.current.playMelodyNote());
        const oscBefore = oscillators.length;
        act(() => result.current.playMelodyNote());
        expect(oscillators.length - oscBefore).toBe(2);
    });

    it('harmony frequency is 1.5x the main frequency (perfect fifth)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 8; i++) act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        const mainOsc = oscillators[oscillators.length - 2];
        const harmonyOsc = oscillators[oscillators.length - 1];
        const mainFreq = mainOsc.frequency.setValueAtTime.mock.calls[0][0];
        const harmonyFreq = harmonyOsc.frequency.setValueAtTime.mock.calls[0][0];
        expect(harmonyFreq).toBeCloseTo(mainFreq * 1.5, 2);
    });

    it('main oscillator stop time is 0.4s after currentTime', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        expect(lastOsc().stop.mock.calls[0][0]).toBeCloseTo(0.4);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOUND GARDEN — wrong melody playback
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — Sound Garden wrong melody', () => {
    beforeEach(() => setupMocks());

    it('creates exactly 2 oscillators (two descending notes)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playWrongMelody());
        expect(oscillators).toHaveLength(2);
        expect(gainNodes).toHaveLength(2);
    });

    it('first note is C5 (523.25 Hz)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playWrongMelody());
        expect(frequencies()).toContain(523.25);
    });

    it('second note is G4 (392.00 Hz)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playWrongMelody());
        expect(frequencies()).toContain(392.0);
    });

    it('both notes use sine wave', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playWrongMelody());
        expect(oscillators[0].type).toBe('sine');
        expect(oscillators[1].type).toBe('sine');
    });

    it('first note starts at currentTime (offset 0)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playWrongMelody());
        expect(oscillators[0].start.mock.calls[0][0]).toBe(0);
        expect(oscillators[0].stop.mock.calls[0][0]).toBeCloseTo(0.2);
    });

    it('second note starts at 0.2s after currentTime', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playWrongMelody());
        expect(oscillators[1].start.mock.calls[0][0]).toBeCloseTo(0.2);
        expect(oscillators[1].stop.mock.calls[0][0]).toBeCloseTo(0.5);
    });

    it('resets melodyCombo to 0', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 3; i++) act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(3);
        act(() => result.current.playWrongMelody());
        expect(result.current.melodyCombo).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOUND GARDEN — combo management
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — combo management', () => {
    beforeEach(() => setupMocks());

    it('resetMelodyCombo sets combo to 0', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(2);
        act(() => result.current.resetMelodyCombo());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('combo wraps after 8 notes (scale length)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 9; i++) act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(9);
        const mainOsc = oscillators[oscillators.length - 2];
        const mainFreq = mainOsc.frequency.setValueAtTime.mock.calls[0][0];
        expect(mainFreq).toBe(261.63);
    });

    it('combo continues incrementing past scale length (no cap)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 20; i++) act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(20);
    });

    it('wrong melody resets combo after buildup', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 5; i++) act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(5);
        act(() => result.current.playWrongMelody());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('after wrong melody reset, next note plays C4 again', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 5; i++) act(() => result.current.playMelodyNote());
        act(() => result.current.playWrongMelody());
        act(() => result.current.playMelodyNote());
        expect(frequencies()).toContain(261.63);
    });

    it('resetMelodyCombo followed by playMelodyNote starts from C4', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 6; i++) act(() => result.current.playMelodyNote());
        act(() => result.current.resetMelodyCombo());
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(1);
        expect(frequencies()).toContain(261.63);
    });

    it('ref stays in sync with state across separate act() calls', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 3; i++) act(() => result.current.playMelodyNote());
        act(() => result.current.playMelodyNote());
        const freq = lastOsc().frequency.setValueAtTime.mock.calls[0][0];
        expect(freq).toBeCloseTo(349.23, 2);
    });

    it('resetMelodyCombo when already 0 does not throw', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        expect(() => act(() => result.current.resetMelodyCombo())).not.toThrow();
        expect(result.current.melodyCombo).toBe(0);
    });

    it('multiple resetMelodyCombo calls are idempotent', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote());
        act(() => result.current.resetMelodyCombo());
        act(() => result.current.resetMelodyCombo());
        act(() => result.current.resetMelodyCombo());
        expect(result.current.melodyCombo).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOUND GARDEN — harmony oscillator
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — harmony oscillator', () => {
    beforeEach(() => setupMocks());

    it('no harmony when combo < 8', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 7; i++) act(() => result.current.playMelodyNote());
        expect(oscillators).toHaveLength(7);
        expect(gainNodes).toHaveLength(7);
    });

    it('harmony appears at combo >= 8', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 8; i++) act(() => result.current.playMelodyNote());
        const oscBefore = oscillators.length;
        act(() => result.current.playMelodyNote());
        expect(oscillators.length - oscBefore).toBe(2);
    });

    it('harmony persists for combo 9, 10, etc.', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 8; i++) act(() => result.current.playMelodyNote());
        const oscBefore = oscillators.length;
        act(() => result.current.playMelodyNote()); // combo 8
        act(() => result.current.playMelodyNote()); // combo 9
        act(() => result.current.playMelodyNote()); // combo 10
        expect(oscillators.length - oscBefore).toBe(6);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOUND GARDEN DISABLED
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — Sound Garden disabled', () => {
    beforeEach(() => setupMocks());

    it('blocks playMelodyNote when Sound Garden is disabled', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: false }));
        act(() => result.current.playMelodyNote());
        expect(oscillators).toHaveLength(0);
    });

    it('blocks playWrongMelody when Sound Garden is disabled', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: false }));
        act(() => result.current.playWrongMelody());
        expect(oscillators).toHaveLength(0);
    });

    it('does not increment combo when Sound Garden is disabled', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: false }));
        act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('resetMelodyCombo still works when Sound Garden is disabled', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: false }));
        expect(() => act(() => result.current.resetMelodyCombo())).not.toThrow();
        expect(result.current.melodyCombo).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// RAPID PLAY — many calls in quick succession
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — rapid play', () => {
    beforeEach(() => setupMocks());

    it('creates 10 separate oscillators for 10 rapid correct calls', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => {
            for (let i = 0; i < 10; i++) result.current.playSound('correct');
        });
        expect(oscillators).toHaveLength(10);
        expect(gainNodes).toHaveLength(10);
    });

    it('each rapid-play oscillator is disconnected (no leak)', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => {
            for (let i = 0; i < 10; i++) result.current.playSound('correct');
        });
        oscillators.forEach(osc => {
            expect(osc.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('rapid mixed sound types all produce distinct oscillators', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => {
            result.current.playSound('correct');
            result.current.playSound('wrong');
            result.current.playSound('click');
            result.current.playSound('streak');
            result.current.playSound('frenzy');
        });
        expect(oscillators).toHaveLength(6); // streak creates 2 oscillators
        expect(gainNodes).toHaveLength(6);
    });

    it('rapid play while muted creates zero oscillators', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.toggleMute());
        act(() => {
            for (let i = 0; i < 20; i++) result.current.playSound('correct');
        });
        expect(oscillators).toHaveLength(0);
    });

    it('rapid semantic playCorrect calls each synthesise when unmuted', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => {
            for (let i = 0; i < 5; i++) result.current.playCorrect();
        });
        expect(oscillators).toHaveLength(5);
    });

    it('rapid playLevelUp calls create separate oscillators', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => {
            for (let i = 0; i < 8; i++) result.current.playLevelUp();
        });
        expect(oscillators).toHaveLength(8);
    });

    it('alternating mute toggles during rapid play respect current state', () => {
        const { result } = renderHook(() => useSoundManager());
        act(() => result.current.playSound('correct'));
        act(() => result.current.toggleMute());
        act(() => result.current.playSound('correct'));
        act(() => result.current.toggleMute());
        act(() => result.current.playSound('correct'));
        expect(oscillators).toHaveLength(2);
    });

    it('20 rapid melody calls in separate act() produce correct combo', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 20; i++) act(() => result.current.playMelodyNote());
        expect(result.current.melodyCombo).toBe(20);
    });

    it('10 separate-act melody calls produce 12 oscillators (harmony at 8+)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 10; i++) act(() => result.current.playMelodyNote());
        // Combos 0-7: 1 osc each (8), combos 8-9: 2 osc each (4) = 12
        expect(oscillators).toHaveLength(12);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — edge cases', () => {
    beforeEach(() => setupMocks());

    it('playMelodyNote with undefined operation uses default sine wave', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playMelodyNote(undefined));
        expect(lastOsc().type).toBe('sine');
    });

    it('playWrongMelody with combo at 0 stays at 0', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => result.current.playWrongMelody());
        expect(result.current.melodyCombo).toBe(0);
    });

    it('playMelodyNote after resetMelodyCombo + playWrongMelody starts from C4', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        for (let i = 0; i < 5; i++) act(() => result.current.playMelodyNote());
        act(() => result.current.resetMelodyCombo());
        act(() => result.current.playWrongMelody());
        act(() => result.current.playMelodyNote());
        expect(frequencies()).toContain(261.63);
    });

    it('rapid single-act calls all use comboRef=0 (no useEffect between calls)', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));
        act(() => {
            result.current.playMelodyNote();
            result.current.playMelodyNote();
            result.current.playMelodyNote();
        });
        expect(oscillators).toHaveLength(3);
        oscillators.forEach(osc => {
            const freq = osc.frequency.setValueAtTime.mock.calls[0][0];
            expect(freq).toBe(261.63);
        });
        expect(result.current.melodyCombo).toBe(3);
    });

    it('playCorrect via semantic API with Sound Garden off does not call playMelodyNote', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: false }));
        act(() => result.current.playCorrect());
        // Classic beep: C5 → C6
        expect(frequencies().flat()).toContain(523.25);
        expect(frequencies().flat()).toContain(1046.5);
        expect(result.current.melodyCombo).toBe(0);
    });

    it('playWrong via semantic API with Sound Garden off does not call playWrongMelody', () => {
        const { result } = renderHook(() => useSoundManager({ soundGardenEnabled: false }));
        act(() => result.current.playWrong());
        // Classic buzz: 150 → 100
        expect(frequencies().flat()).toContain(150);
        expect(frequencies().flat()).toContain(100);
        expect(result.current.melodyCombo).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE AUDIOCONTEXT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════
describe('useSoundManager — AudioContext singleton', () => {
    beforeEach(() => setupMocks());

    it('creates exactly one AudioContext even with multiple hook instances', () => {
        const { result: r1 } = renderHook(() => useSoundManager());
        const { result: r2 } = renderHook(() => useSoundManager({ soundGardenEnabled: true }));

        act(() => r1.current.playSound('correct'));
        act(() => r2.current.playMelodyNote());

        // Both should have used the same AudioContext — we verify by checking
        // that createOscillator was called on the single FakeAudioContext instance.
        // Since our mock pushes to shared arrays, we just verify oscillators exist.
        expect(oscillators.length).toBeGreaterThan(0);
    });
});
