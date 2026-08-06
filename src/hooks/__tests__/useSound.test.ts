// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSound } from '../useSound';

// ── AudioContext mock ──────────────────────────────────────────────────────
// useSound synthesizes tones via Web Audio API. We stub the context so the
// hook can run in jsdom and we can assert which sound was synthesized by
// inspecting the oscillator frequencies the hook programmed.
//
// Key detail: the hook sets osc.onended *after* calling osc.start(), so our
// mock must defer the onended callback until osc.stop() is called (mirrors
// real Web Audio behaviour where onended fires when the oscillator stops).
//
// Both oscillators and gain nodes are tracked in module-level arrays so
// every describe block can inspect them after calling the hook.

let oscillators: FakeOscillator[] = [];
let gainNodes: FakeGainNode[] = [];

class FakeGainNode {
    gain = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
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
    // stop() fires onended — mirrors real Web Audio behaviour.
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
// The useSound module caches an AudioContext at module level (globalAudioContext).
// Since we cannot easily reset that cache, all test suites share the same
// FakeAudioContext class. The first renderHook call creates the cached context
// from whatever AudioContext class is on window at that time. Subsequent tests
// reuse that same cached context instance, so we just need to ensure the arrays
// are cleared and the AudioContext class is set before the first call in each test.
//
// Because the cached context persists, we clear the tracking arrays in beforeEach
// and rely on the fact that the FakeAudioContext's createOscillator/createGain
// always push to those arrays.

const setupMocks = () => {
    localStorage.clear();
    vi.clearAllMocks();
    oscillators = [];
    gainNodes = [];
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext = FakeAudioContext;
};

// ═══════════════════════════════════════════════════════════════════════════
// EXISTING TESTS — centralized semantic API
// ═══════════════════════════════════════════════════════════════════════════
describe('useSound — centralized semantic API', () => {
    beforeEach(() => setupMocks());

    it('exposes the semantic API alongside the raw API', () => {
        const { result } = renderHook(() => useSound());
        expect(result.current.playSound).toBeTypeOf('function');
        expect(result.current.play).toBeTypeOf('function');
        expect(result.current.playAnswerCorrect).toBeTypeOf('function');
        expect(result.current.playAnswerWrong).toBeTypeOf('function');
        expect(result.current.playLevelUp).toBeTypeOf('function');
        expect(result.current.isMuted).toBe(false);
        expect(result.current.toggleMute).toBeTypeOf('function');
    });

    it('playAnswerCorrect delegates to the melody when Sound Garden is on', () => {
        const { result } = renderHook(() => useSound());
        const melody = vi.fn();
        act(() => {
            result.current.playAnswerCorrect(true, melody);
        });
        expect(melody).toHaveBeenCalledTimes(1);
        expect(frequencies().flat()).not.toContain(523.25);
    });

    it('playAnswerCorrect plays the classic correct beep when Sound Garden is off', () => {
        const { result } = renderHook(() => useSound());
        const melody = vi.fn();
        act(() => {
            result.current.playAnswerCorrect(false, melody);
        });
        expect(melody).not.toHaveBeenCalled();
        expect(frequencies().flat()).toContain(523.25);
        expect(frequencies().flat()).toContain(1046.5);
    });

    it('playAnswerWrong delegates to the wrong-melody when Sound Garden is on', () => {
        const { result } = renderHook(() => useSound());
        const wrongMelody = vi.fn();
        act(() => {
            result.current.playAnswerWrong(true, wrongMelody);
        });
        expect(wrongMelody).toHaveBeenCalledTimes(1);
        expect(frequencies().flat()).not.toContain(150);
    });

    it('playAnswerWrong plays the classic wrong beep when Sound Garden is off', () => {
        const { result } = renderHook(() => useSound());
        const wrongMelody = vi.fn();
        act(() => {
            result.current.playAnswerWrong(false, wrongMelody);
        });
        expect(wrongMelody).not.toHaveBeenCalled();
        expect(frequencies().flat()).toContain(150);
        expect(frequencies().flat()).toContain(100);
    });

    it('playAnswerCorrect falls back to classic beep when no melody callback is provided', () => {
        const { result } = renderHook(() => useSound());
        act(() => {
            result.current.playAnswerCorrect(true, undefined);
        });
        expect(frequencies().flat()).toContain(523.25);
    });

    it('playLevelUp plays the levelUp fanfare (A4/C#5/E5)', () => {
        const { result } = renderHook(() => useSound());
        act(() => {
            result.current.playLevelUp();
        });
        const freqs = frequencies().flat();
        expect(freqs).toContain(440); // A4
        expect(freqs).toContain(554); // C#5
        expect(freqs).toContain(659); // E5
    });

    it('does not emit sounds when muted', () => {
        const { result } = renderHook(() => useSound());
        const melody = vi.fn();
        const wrongMelody = vi.fn();

        act(() => {
            result.current.toggleMute();
        });
        expect(result.current.isMuted).toBe(true);

        act(() => {
            result.current.playAnswerCorrect(true, melody);
            result.current.playAnswerWrong(false, wrongMelody);
            result.current.playLevelUp();
        });

        expect(melody).not.toHaveBeenCalled();
        expect(wrongMelody).not.toHaveBeenCalled();
        expect(frequencies()).toHaveLength(0);
    });

    it('persists mute state to localStorage', () => {
        const { result } = renderHook(() => useSound());
        act(() => {
            result.current.toggleMute();
        });
        expect(JSON.parse(localStorage.getItem('isMuted') ?? 'false')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTE BEHAVIOUR
// ═══════════════════════════════════════════════════════════════════════════
describe('useSound — mute behaviour', () => {
    beforeEach(() => setupMocks());

    it('initialises muted state from localStorage', () => {
        localStorage.setItem('isMuted', 'true');
        const { result } = renderHook(() => useSound());
        expect(result.current.isMuted).toBe(true);
    });

    it('initialises unmuted when localStorage is empty', () => {
        const { result } = renderHook(() => useSound());
        expect(result.current.isMuted).toBe(false);
    });

    it('initialises unmuted when localStorage has invalid JSON', () => {
        localStorage.setItem('isMuted', '{not json');
        const { result } = renderHook(() => useSound());
        expect(result.current.isMuted).toBe(false);
    });

    it('toggleMute flips from unmuted → muted → unmuted', () => {
        const { result } = renderHook(() => useSound());
        expect(result.current.isMuted).toBe(false);
        act(() => result.current.toggleMute());
        expect(result.current.isMuted).toBe(true);
        act(() => result.current.toggleMute());
        expect(result.current.isMuted).toBe(false);
    });

    it('persists unmuted state to localStorage after toggling back', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.toggleMute());
        act(() => result.current.toggleMute());
        expect(JSON.parse(localStorage.getItem('isMuted') ?? 'true')).toBe(false);
    });

    it('blocks raw playSound when muted', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.toggleMute());
        act(() => result.current.playSound('correct'));
        expect(frequencies()).toHaveLength(0);
    });

    it('restores sound after unmuting', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.toggleMute());
        act(() => result.current.toggleMute());
        act(() => result.current.playSound('correct'));
        expect(frequencies().flat()).toContain(523.25);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// VOLUME / GAIN
// ═══════════════════════════════════════════════════════════════════════════
describe('useSound — volume / gain', () => {
    beforeEach(() => setupMocks());

    it('correct sound sets initial gain to 0.3', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        expect(gainValues()).toContain(0.3);
    });

    it('wrong sound sets initial gain to 0.3', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('wrong'));
        expect(gainValues()).toContain(0.3);
    });

    it('click sound sets initial gain to 0.1 (quieter)', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('click'));
        expect(gainValues()).toContain(0.1);
    });

    it('levelUp sound sets initial gain to 0.2', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('levelUp'));
        expect(gainValues()).toContain(0.2);
    });

    it('streak sound sets initial gain to 0.25', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('streak'));
        expect(gainValues()).toContain(0.25);
    });

    it('frenzy sound sets initial gain to 0.3', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('frenzy'));
        expect(gainValues()).toContain(0.3);
    });

    it('milestone sound sets initial gain to 0.3', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('milestone'));
        expect(gainValues()).toContain(0.3);
    });

    it('correct sound ramps gain down to 0.01 (exponential)', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        expect(gainValues()).toContain(0.01);
    });

    it('click sound ramps gain down to 0.01 quickly', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('click'));
        expect(gainValues()).toContain(0.01);
    });

    it('milestone sound ramps gain down to 0.001', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('milestone'));
        expect(gainValues()).toContain(0.001);
    });

    it('levelUp sound ramps gain down to 0 (linear)', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('levelUp'));
        expect(gainValues()).toContain(0);
    });

    it('creates exactly one gain node per playSound call', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        expect(gainNodes).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBACK — verify oscillator type & frequency for every sound type
// ═══════════════════════════════════════════════════════════════════════════
describe('useSound — playback per sound type', () => {
    beforeEach(() => setupMocks());

    it('correct: sine wave, C5 → C6 ramp', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        const osc = lastOsc();
        expect(osc.type).toBe('sine');
        const freqs = frequencies().flat();
        expect(freqs).toContain(523.25);  // C5
        expect(freqs).toContain(1046.5); // C6
    });

    it('wrong: sawtooth wave, 150 → 100 Hz ramp', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('wrong'));
        const osc = lastOsc();
        expect(osc.type).toBe('sawtooth');
        const freqs = frequencies().flat();
        expect(freqs).toContain(150);
        expect(freqs).toContain(100);
    });

    it('levelUp: triangle wave, A4 / C#5 / E5 sequence', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('levelUp'));
        const osc = lastOsc();
        expect(osc.type).toBe('triangle');
        const freqs = frequencies().flat();
        expect(freqs).toContain(440);  // A4
        expect(freqs).toContain(554); // C#5
        expect(freqs).toContain(659); // E5
    });

    it('click: sine wave, 800 Hz short burst', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('click'));
        const osc = lastOsc();
        expect(osc.type).toBe('sine');
        expect(frequencies().flat()).toContain(800);
    });

    it('streak: sine wave, ascending C5/E5/G5 arpeggio', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('streak'));
        const osc = lastOsc();
        expect(osc.type).toBe('sine');
        const freqs = frequencies().flat();
        expect(freqs).toContain(523.25); // C5
        expect(freqs).toContain(659.25); // E5
        expect(freqs).toContain(783.99); // G5
    });

    it('frenzy: sawtooth wave, 200 Hz', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('frenzy'));
        const osc = lastOsc();
        expect(osc.type).toBe('sawtooth');
        expect(frequencies().flat()).toContain(200);
    });

    it('milestone: sine wave, C6 (1046.5 Hz)', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('milestone'));
        const osc = lastOsc();
        expect(osc.type).toBe('sine');
        expect(frequencies().flat()).toContain(1046.5);
    });

    it('play is an alias of playSound', () => {
        const { result } = renderHook(() => useSound());
        expect(result.current.play).toBe(result.current.playSound);
    });

    it('creates exactly one oscillator and one gain node per playSound call', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        expect(oscillators).toHaveLength(1);
        expect(gainNodes).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP — oscillators and gain nodes disconnect on ended
// ═══════════════════════════════════════════════════════════════════════════
describe('useSound — cleanup', () => {
    beforeEach(() => setupMocks());

    it('oscillator.disconnect is called after onended fires', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        expect(lastOsc().disconnect).toHaveBeenCalled();
    });

    it('gain node disconnect is called after onended fires', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        expect(lastGain().disconnect).toHaveBeenCalled();
    });

    it('oscillator.start is called', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        expect(lastOsc().start).toHaveBeenCalled();
    });

    it('oscillator.stop is called with a time > currentTime', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        const stopCalls = lastOsc().stop.mock.calls;
        expect(stopCalls).toHaveLength(1);
        expect(stopCalls[0][0]).toBeGreaterThan(0);
    });

    it('oscillator.connect is called to route through gain', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        expect(lastOsc().connect).toHaveBeenCalled();
    });

    it('gain.connect is called to route to destination', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        expect(lastGain().connect).toHaveBeenCalled();
    });

    it('all 7 sound types disconnect their oscillator on ended', () => {
        const { result } = renderHook(() => useSound());
        const types: Array<'correct' | 'wrong' | 'levelUp' | 'click' | 'streak' | 'frenzy' | 'milestone'> = [
            'correct', 'wrong', 'levelUp', 'click', 'streak', 'frenzy', 'milestone',
        ];
        types.forEach(t => {
            act(() => result.current.playSound(t));
        });
        expect(oscillators).toHaveLength(7);
        oscillators.forEach(osc => {
            expect(osc.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('all 7 sound types disconnect their gain node on ended', () => {
        const { result } = renderHook(() => useSound());
        const types: Array<'correct' | 'wrong' | 'levelUp' | 'click' | 'streak' | 'frenzy' | 'milestone'> = [
            'correct', 'wrong', 'levelUp', 'click', 'streak', 'frenzy', 'milestone',
        ];
        types.forEach(t => {
            act(() => result.current.playSound(t));
        });
        expect(gainNodes).toHaveLength(7);
        gainNodes.forEach(g => {
            expect(g.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('stop time for correct is 0.5s after currentTime', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('correct'));
        expect(lastOsc().stop.mock.calls[0][0]).toBe(0.5);
    });

    it('stop time for click is 0.05s after currentTime', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.playSound('click'));
        expect(lastOsc().stop.mock.calls[0][0]).toBeCloseTo(0.05);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// RAPID PLAY — many calls in quick succession
// ═══════════════════════════════════════════════════════════════════════════
describe('useSound — rapid play', () => {
    beforeEach(() => setupMocks());

    it('creates 10 separate oscillators for 10 rapid correct calls', () => {
        const { result } = renderHook(() => useSound());
        act(() => {
            for (let i = 0; i < 10; i++) {
                result.current.playSound('correct');
            }
        });
        expect(oscillators).toHaveLength(10);
        expect(gainNodes).toHaveLength(10);
    });

    it('each rapid-play oscillator is disconnected (no leak)', () => {
        const { result } = renderHook(() => useSound());
        act(() => {
            for (let i = 0; i < 10; i++) {
                result.current.playSound('correct');
            }
        });
        oscillators.forEach(osc => {
            expect(osc.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('each rapid-play gain node is disconnected (no leak)', () => {
        const { result } = renderHook(() => useSound());
        act(() => {
            for (let i = 0; i < 10; i++) {
                result.current.playSound('correct');
            }
        });
        gainNodes.forEach(g => {
            expect(g.disconnect).toHaveBeenCalledTimes(1);
        });
    });

    it('rapid mixed sound types all produce distinct oscillators', () => {
        const { result } = renderHook(() => useSound());
        act(() => {
            result.current.playSound('correct');
            result.current.playSound('wrong');
            result.current.playSound('click');
            result.current.playSound('streak');
            result.current.playSound('frenzy');
        });
        expect(oscillators).toHaveLength(5);
        expect(gainNodes).toHaveLength(5);
        expect(oscillators[0].type).toBe('sine');       // correct
        expect(oscillators[1].type).toBe('sawtooth');   // wrong
        expect(oscillators[2].type).toBe('sine');        // click
        expect(oscillators[3].type).toBe('sine');        // streak
        expect(oscillators[4].type).toBe('sawtooth');   // frenzy
    });

    it('rapid play while muted creates zero oscillators', () => {
        const { result } = renderHook(() => useSound());
        act(() => result.current.toggleMute());
        act(() => {
            for (let i = 0; i < 20; i++) {
                result.current.playSound('correct');
            }
        });
        expect(oscillators).toHaveLength(0);
        expect(gainNodes).toHaveLength(0);
    });

    it('rapid semantic API calls (playAnswerCorrect) each synthesise when unmuted', () => {
        const { result } = renderHook(() => useSound());
        act(() => {
            for (let i = 0; i < 5; i++) {
                result.current.playAnswerCorrect(false);
            }
        });
        expect(oscillators).toHaveLength(5);
    });

    it('rapid playLevelUp calls create separate oscillators', () => {
        const { result } = renderHook(() => useSound());
        act(() => {
            for (let i = 0; i < 8; i++) {
                result.current.playLevelUp();
            }
        });
        expect(oscillators).toHaveLength(8);
    });

    it('alternating mute toggles during rapid play respect current state', () => {
        const { result } = renderHook(() => useSound());
        // First call unmuted → 1 oscillator
        act(() => result.current.playSound('correct'));
        // Mute
        act(() => result.current.toggleMute());
        // While muted, playSound should be blocked
        act(() => result.current.playSound('correct'));
        // Unmute
        act(() => result.current.toggleMute());
        // Third call unmuted → 1 more oscillator
        act(() => result.current.playSound('correct'));
        expect(oscillators).toHaveLength(2);
    });
});
