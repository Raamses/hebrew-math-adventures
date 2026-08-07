import { useState, useEffect, useCallback } from 'react';

// Placeholder sounds (using short, pleasant beeps/chimes from online sources or data URIs could be better, 
// but for now we'll use simple reliable URLs or just empty strings if we want to simulate)
// Actually, let's use some public domain sound effects or simple oscillator beeps if possible?
// For a web app, AudioContext oscillators are great for "beeps" without assets.
// Let's implement a simple synthesizer for now to avoid 404s on missing files!

type SoundType = 'correct' | 'wrong' | 'levelUp' | 'click' | 'streak' | 'frenzy' | 'milestone';


let globalAudioContext: AudioContext | null = null;
const getAudioContext = () => {
    if (globalAudioContext) return globalAudioContext;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
        globalAudioContext = new AudioContextClass();
    }
    return globalAudioContext;
};

export const useSound = () => {
    const [isMuted, setIsMuted] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('isMuted');
            return saved ? JSON.parse(saved) : false;
        } catch {
            return false;
        }
    });

    useEffect(() => {
        localStorage.setItem('isMuted', JSON.stringify(isMuted));
    }, [isMuted]);

    const playSound = useCallback((type: SoundType) => {
        if (isMuted) return;

        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        switch (type) {
            case 'correct':
                // High pitched "Ding"
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1); // C6
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.onended = () => {
                    osc.disconnect();
                    gain.disconnect();
                };
                osc.stop(now + 0.5);
                break;

            case 'wrong':
                // Low pitched "Buzz"
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.linearRampToValueAtTime(100, now + 0.3);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.onended = () => {
                    osc.disconnect();
                    gain.disconnect();
                };
                osc.stop(now + 0.3);
                break;

            case 'levelUp':
                // Fanfare-ish sequence
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, now); // A4
                osc.frequency.setValueAtTime(554, now + 0.1); // C#5
                osc.frequency.setValueAtTime(659, now + 0.2); // E5
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.6);
                osc.start(now);
                osc.onended = () => {
                    osc.disconnect();
                    gain.disconnect();
                };
                osc.stop(now + 0.6);
                break;

            case 'click':
                // Short click
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.onended = () => {
                    osc.disconnect();
                    gain.disconnect();
                };
                osc.stop(now + 0.05);
                break;

            case 'streak':
                // Short ascending arpeggio (3 quick notes: C5, E5, G5)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now);       // C5
                osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.onended = () => {
                    osc.disconnect();
                    gain.disconnect();
                };
                osc.stop(now + 0.3);
                break;

            case 'frenzy':
                // Brief energetic buzz (sawtooth wave, 200Hz, 150ms duration, quick decay)
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.onended = () => {
                    osc.disconnect();
                    gain.disconnect();
                };
                osc.stop(now + 0.15);
                break;

            case 'milestone':
                // Quick chime (sine wave, C6, 200ms, with slight reverb via gain decay)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1046.5, now); // C6
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.onended = () => {
                    osc.disconnect();
                    gain.disconnect();
                };
                osc.stop(now + 0.2);
                break;
        }
    }, [isMuted]);

    const toggleMute = () => setIsMuted(prev => !prev);

    // ── Centralized semantic sound API ─────────────────────────────────────
    // Components should prefer these over raw playSound(type) calls so that
    // sound-choice logic (e.g. Sound Garden vs. classic beeps, level-up cues)
    // lives in ONE place instead of being re-implemented per component.

    /**
     * Play the correct-answer sound, honoring Sound Garden mode.
     * @param soundGardenEnabled Whether the profile has Sound Garden enabled.
     * @param playMelodyNote     Musical hook to use when Sound Garden is on.
     */
    const playAnswerCorrect = useCallback((soundGardenEnabled: boolean, playMelodyNote?: () => void) => {
        if (isMuted) return;
        if (soundGardenEnabled && playMelodyNote) {
            playMelodyNote();
        } else {
            playSound('correct');
        }
    }, [isMuted, playSound]);

    /**
     * Play the wrong-answer sound, honoring Sound Garden mode.
     */
    const playAnswerWrong = useCallback((soundGardenEnabled: boolean, playWrongMelody?: () => void) => {
        if (isMuted) return;
        if (soundGardenEnabled && playWrongMelody) {
            playWrongMelody();
        } else {
            playSound('wrong');
        }
    }, [isMuted, playSound]);

    /**
     * Play the level-up / session-complete / game-over cue in one place.
     */
    const playLevelUp = useCallback(() => {
        playSound('levelUp');
    }, [playSound]);

    return { playSound, play: playSound, isMuted, toggleMute, playAnswerCorrect, playAnswerWrong, playLevelUp };
};
