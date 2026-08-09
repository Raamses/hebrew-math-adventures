import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// useSoundManager — unified sound hook
//
// Merges the former useSound and useMusicalSound into a single hook with:
//   • A single module-level AudioContext singleton (no duplicate contexts)
//   • A semantic event API (playCorrect, playWrong, playLevelUp, playGameOver,
//     playClick, playStreak, playFrenzy, playMilestone)
//   • Sound Garden musical mode (melody notes + wrong melody, combo tracking)
//   • Mute persistence via localStorage
//
// Consumers should call useSoundManager once and pass the returned functions
// down — no need to import useSound or useMusicalSound separately.
// ═══════════════════════════════════════════════════════════════════════════

// ── Types ───────────────────────────────────────────────────────────────────

type SoundType =
    | 'correct'
    | 'wrong'
    | 'levelUp'
    | 'gameOver'
    | 'click'
    | 'streak'
    | 'frenzy'
    | 'milestone';

type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface UseSoundManagerOptions {
    /** Whether Sound Garden musical mode is active (from profile settings). */
    soundGardenEnabled?: boolean;
}

export interface UseSoundManagerReturn {
    // ── Semantic event API (preferred) ──────────────────────────────────────
    /** Play the correct-answer sound. Uses Sound Garden melody when enabled. */
    playCorrect: (operation?: OperationType) => void;
    /** Play the wrong-answer sound. Uses Sound Garden wrong melody when enabled. */
    playWrong: () => void;
    /** Play the level-up / session-complete fanfare. */
    playLevelUp: () => void;
    /** Play the game-over sound (descending tones). */
    playGameOver: () => void;
    /** Play a short click sound. */
    playClick: () => void;
    /** Play an ascending streak arpeggio. */
    playStreak: () => void;
    /** Play a brief energetic frenzy buzz. */
    playFrenzy: () => void;
    /** Play a milestone chime. */
    playMilestone: () => void;

    // ── Raw sound API (for backward compatibility) ──────────────────────────
    /** Play a raw sound by type. */
    playSound: (type: SoundType) => void;
    /** Alias for playSound (backward compat). */
    play: (type: SoundType) => void;

    // ── Mute control ─────────────────────────────────────────────────────────
    /** Whether sound is muted. */
    isMuted: boolean;
    /** Toggle mute on/off. */
    toggleMute: () => void;

    // ── Sound Garden ─────────────────────────────────────────────────────────
    /** Whether Sound Garden mode is active. */
    isSoundGarden: boolean;
    /** Current melody combo count (for UI display). */
    melodyCombo: number;
    /** Reset the melody combo (e.g. on game restart). */
    resetMelodyCombo: () => void;
    /** Play the next melodic note (Sound Garden). Exposed for advanced use. */
    playMelodyNote: (operation?: OperationType) => void;
    /** Play the descending wrong-answer melody (Sound Garden). */
    playWrongMelody: () => void;
}

// ── AudioContext singleton ─────────────────────────────────────────────────

let globalAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    if (globalAudioContext) return globalAudioContext;
    const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
        globalAudioContext = new AudioContextClass();
    }
    return globalAudioContext;
};

// ── Sound Garden constants ──────────────────────────────────────────────────

// C major scale frequencies: C4, D4, E4, F4, G4, A4, B4, C5
const C_MAJOR_SCALE = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];

const WAVE_FOR_OPERATION: Record<OperationType, OscillatorType> = {
    addition: 'sine',
    subtraction: 'triangle',
    multiplication: 'square',
    division: 'sawtooth',
};

const DEFAULT_WAVE: OscillatorType = 'sine';

// ── Oscillator helper ──────────────────────────────────────────────────────

/**
 * Create, schedule, and auto-cleanup a single oscillator+gain pair.
 * The caller sets frequency/gain params before calling start/stop.
 */
const createTone = (
    ctx: AudioContext,
    oscType: OscillatorType,
    startFreq: number,
    gainStart: number,
    gainEnd: number,
    duration: number,
    startTime: number,
    freqEnd?: number,
    freqRampType: 'exponential' | 'linear' | 'step' = 'exponential',
) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = oscType;
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (freqEnd !== undefined && freqRampType === 'exponential') {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
    } else if (freqEnd !== undefined && freqRampType === 'linear') {
        osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);
    }

    gain.gain.setValueAtTime(gainStart, startTime);
    if (freqRampType === 'linear') {
        gain.gain.linearRampToValueAtTime(gainEnd, startTime + duration);
    } else {
        gain.gain.exponentialRampToValueAtTime(gainEnd, startTime + duration);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
    };
    osc.stop(startTime + duration);

    return { osc, gain };
};

// ── Hook ────────────────────────────────────────────────────────────────────

export const useSoundManager = (
    options: UseSoundManagerOptions = {},
): UseSoundManagerReturn => {
    const { soundGardenEnabled = false } = options;

    // ── Mute state (persisted) ────────────────────────────────────────────────
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

    // ── Sound Garden combo state ──────────────────────────────────────────────
    const [melodyCombo, setMelodyCombo] = useState(0);
    const comboRef = useRef(0);

    useEffect(() => {
        comboRef.current = melodyCombo;
    }, [melodyCombo]);

    // ── Raw sound synthesis ──────────────────────────────────────────────────
    const playSound = useCallback(
        (type: SoundType) => {
            if (isMuted) return;

            const ctx = getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;

            switch (type) {
                case 'correct':
                    createTone(ctx, 'sine', 523.25, 0.3, 0.01, 0.5, now, 1046.5, 'exponential');
                    break;

                case 'wrong':
                    createTone(ctx, 'sawtooth', 150, 0.3, 0.01, 0.3, now, 100, 'linear');
                    break;

                case 'levelUp': {
                    // Fanfare-ish sequence: A4 → C#5 → E5
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.setValueAtTime(554, now + 0.1);
                    osc.frequency.setValueAtTime(659, now + 0.2);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.6);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.onended = () => {
                        osc.disconnect();
                        gain.disconnect();
                    };
                    osc.stop(now + 0.6);
                    break;
                }

                case 'gameOver': {
                    // Descending tones: C5 → G4 → C4
                    const notes = [
                        { freq: 523.25, time: 0, duration: 0.2 },
                        { freq: 392.0, time: 0.2, duration: 0.25 },
                        { freq: 261.63, time: 0.45, duration: 0.4 },
                    ];
                    notes.forEach(({ freq, time, duration }) => {
                        createTone(ctx, 'triangle', freq, 0.25, 0.001, duration, now + time);
                    });
                    break;
                }

                case 'click':
                    createTone(ctx, 'sine', 800, 0.1, 0.01, 0.05, now);
                    break;

                case 'streak':
                    // Ascending C5/E5/G5 arpeggio
                    createTone(ctx, 'sine', 523.25, 0.25, 0.01, 0.3, now);
                    // For the arpeggio we need a single oscillator with stepped freq
                    {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(523.25, now);
                        osc.frequency.setValueAtTime(659.25, now + 0.08);
                        osc.frequency.setValueAtTime(783.99, now + 0.16);
                        gain.gain.setValueAtTime(0.25, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now);
                        osc.onended = () => {
                            osc.disconnect();
                            gain.disconnect();
                        };
                        osc.stop(now + 0.3);
                    }
                    break;

                case 'frenzy':
                    createTone(ctx, 'sawtooth', 200, 0.3, 0.01, 0.15, now);
                    break;

                case 'milestone':
                    createTone(ctx, 'sine', 1046.5, 0.3, 0.001, 0.2, now);
                    break;
            }
        },
        [isMuted],
    );

    // ── Sound Garden: melody note ─────────────────────────────────────────────
    const playMelodyNote = useCallback(
        (operation?: OperationType) => {
            if (isMuted || !soundGardenEnabled) return;

            const ctx = getAudioContext();
            if (!ctx) return;

            const currentCombo = comboRef.current;
            const scaleIndex = currentCombo % C_MAJOR_SCALE.length;
            const frequency = C_MAJOR_SCALE[scaleIndex];
            const waveType = operation ? WAVE_FOR_OPERATION[operation] : DEFAULT_WAVE;
            const hasHarmony = currentCombo >= C_MAJOR_SCALE.length;

            const now = ctx.currentTime;

            // Main oscillator
            createTone(ctx, waveType, frequency, 0.25, 0.001, 0.4, now);

            // Harmony oscillator (perfect fifth) when combo wraps
            if (hasHarmony) {
                createTone(ctx, waveType, frequency * 1.5, 0.12, 0.001, 0.4, now);
            }

            setMelodyCombo((prev) => prev + 1);
        },
        [isMuted, soundGardenEnabled],
    );

    // ── Sound Garden: wrong melody ─────────────────────────────────────────────
    const playWrongMelody = useCallback(() => {
        if (isMuted || !soundGardenEnabled) return;

        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        // Descending two-note: C5 → G4
        const notes = [
            { freq: 523.25, time: 0, duration: 0.2 },
            { freq: 392.0, time: 0.2, duration: 0.3 },
        ];

        notes.forEach(({ freq, time, duration }) => {
            createTone(ctx, 'sine', freq, 0.2, 0.001, duration, now + time);
        });

        // Reset combo on wrong answer
        setMelodyCombo(0);
    }, [isMuted, soundGardenEnabled]);

    // ── Sound Garden: reset combo ──────────────────────────────────────────────
    const resetMelodyCombo = useCallback(() => {
        setMelodyCombo(0);
    }, []);

    // ── Semantic event API ─────────────────────────────────────────────────────
    const playCorrect = useCallback(
        (operation?: OperationType) => {
            if (isMuted) return;
            if (soundGardenEnabled) {
                playMelodyNote(operation);
            } else {
                playSound('correct');
            }
        },
        [isMuted, soundGardenEnabled, playMelodyNote, playSound],
    );

    const playWrong = useCallback(() => {
        if (isMuted) return;
        if (soundGardenEnabled) {
            playWrongMelody();
        } else {
            playSound('wrong');
        }
    }, [isMuted, soundGardenEnabled, playWrongMelody, playSound]);

    const playLevelUp = useCallback(() => {
        playSound('levelUp');
    }, [playSound]);

    const playGameOver = useCallback(() => {
        playSound('gameOver');
    }, [playSound]);

    const playClick = useCallback(() => {
        playSound('click');
    }, [playSound]);

    const playStreak = useCallback(() => {
        playSound('streak');
    }, [playSound]);

    const playFrenzy = useCallback(() => {
        playSound('frenzy');
    }, [playSound]);

    const playMilestone = useCallback(() => {
        playSound('milestone');
    }, [playSound]);

    const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);

    return {
        // Semantic API
        playCorrect,
        playWrong,
        playLevelUp,
        playGameOver,
        playClick,
        playStreak,
        playFrenzy,
        playMilestone,

        // Raw API (backward compat)
        playSound,
        play: playSound,

        // Mute
        isMuted,
        toggleMute,

        // Sound Garden
        isSoundGarden: soundGardenEnabled,
        melodyCombo,
        resetMelodyCombo,
        playMelodyNote,
        playWrongMelody,
    };
};
