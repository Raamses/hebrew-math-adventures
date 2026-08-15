// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSound } from '../hooks/useSound';
import { useMusicalSound } from '../hooks/useMusicalSound';

const store: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  },
});

let oscCount = 0;
class FakeOsc {
  type = 'sine';
  frequency = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn(() => { this.onended?.(); });
  constructor() { oscCount++; }
}
class FakeGain {
  gain = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
}
class FakeCtx {
  currentTime = 0;
  destination = {};
  createOscillator = vi.fn(() => new FakeOsc());
  createGain = vi.fn(() => new FakeGain());
}
(window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;

describe('REPRO: mute does not propagate across useSound instances', () => {
  it('header mute button leaves PracticeMode instance unmuted -> beep still plays', () => {
    const header = renderHook(() => useSound());              // PracticeHeader.tsx:21
    const practice = renderHook(() => useSound());            // PracticeMode.tsx:45
    const melodyHk = renderHook(() => useMusicalSound(false)); // PracticeMode.tsx:46 -> inner useSound

    expect(header.result.current.isMuted).toBe(false);

    act(() => header.result.current.toggleMute());
    expect(header.result.current.isMuted).toBe(true);   // icon flips to VolumeX
    expect(JSON.parse(store['isMuted'])).toBe(true);    // persisted

    expect(practice.result.current.isMuted).toBe(false); // <-- STALE
    expect(melodyHk.result.current.isMuted).toBe(false); // <-- STALE

    oscCount = 0;
    act(() => practice.result.current.playAnswerCorrect(false, undefined));
    expect(oscCount).toBe(1); // AUDIBLE BEEP WHILE UI SAYS MUTED
  });

  it('unmuting is equally broken: app stays silent after user unmutes', () => {
    store['isMuted'] = 'true';
    const header = renderHook(() => useSound());
    const practice = renderHook(() => useSound());
    expect(practice.result.current.isMuted).toBe(true);

    act(() => header.result.current.toggleMute()); // user unmutes
    expect(header.result.current.isMuted).toBe(false);

    oscCount = 0;
    act(() => practice.result.current.playAnswerCorrect(false, undefined));
    expect(oscCount).toBe(0); // SILENT despite unmuted UI
  });
});
