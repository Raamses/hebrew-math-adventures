import { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from './useSound';

// C major scale frequencies: C4, D4, E4, F4, G4, A4, B4, C5
const C_MAJOR_SCALE = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

// Wave types per operation
type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division';
const WAVE_FOR_OPERATION: Record<OperationType, OscillatorType> = {
    addition: 'sine',
    subtraction: 'triangle',
    multiplication: 'square',
    division: 'sawtooth',
};

// Default wave if operation is unknown
const DEFAULT_WAVE: OscillatorType = 'sine';

let globalMusicalAudioContext: AudioContext | null = null;
const getAudioContext = () => {
    if (globalMusicalAudioContext) return globalMusicalAudioContext;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
        globalMusicalAudioContext = new AudioContextClass();
    }
    return globalMusicalAudioContext;
};

export interface UseMusicalSoundReturn {
    /** Play the next melodic note for a correct answer in the current combo */
    playMelodyNote: (operation?: OperationType) => void;
    /** Play the gentle descending wrong-answer pattern */
    playWrongMelody: () => void;
    /** Reset the combo counter (e.g. on game restart) */
    resetMelodyCombo: () => void;
    /** Whether Sound Garden mode is active */
    isSoundGarden: boolean;
    /** Toggle Sound Garden on/off */
    toggleSoundGarden: () => void;
    /** Current combo count (for UI display if needed) */
    melodyCombo: number;
    /** Re-export isMuted from base useSound */
    isMuted: boolean;
}

export const useMusicalSound = (soundGardenEnabled: boolean): UseMusicalSoundReturn => {
    const { isMuted } = useSound();
    const [melodyCombo, setMelodyCombo] = useState(0);
    const comboRef = useRef(0);

    // Keep ref in sync
    useEffect(() => {
        comboRef.current = melodyCombo;
    }, [melodyCombo]);

    const isSoundGarden = soundGardenEnabled;

    const toggleSoundGarden = useCallback(() => {
        // This is a stub — actual persistence is handled by ProfileContext
        // The hook just needs to be called for the toggle UI
    }, []);

    const playMelodyNote = useCallback((operation?: OperationType) => {
        if (isMuted || !soundGardenEnabled) return;

        const ctx = getAudioContext();
        if (!ctx) return;

        const currentCombo = comboRef.current;
        const scaleIndex = currentCombo % C_MAJOR_SCALE.length; // wraps at 8
        const frequency = C_MAJOR_SCALE[scaleIndex];
        const waveType = operation ? WAVE_FOR_OPERATION[operation] : DEFAULT_WAVE;
        const hasHarmony = currentCombo >= C_MAJOR_SCALE.length; // 8+ combo gets harmony

        const now = ctx.currentTime;

        // Main oscillator
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = waveType;
        osc.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };

        // Harmony oscillator (a fifth above) when combo wraps
        if (hasHarmony) {
            const harmonyFreq = frequency * 1.5; // perfect fifth
            const harmonyOsc = ctx.createOscillator();
            const harmonyGain = ctx.createGain();
            harmonyOsc.type = waveType;
            harmonyOsc.frequency.setValueAtTime(harmonyFreq, now);
            harmonyGain.gain.setValueAtTime(0.12, now);
            harmonyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            harmonyOsc.connect(harmonyGain);
            harmonyGain.connect(ctx.destination);
            harmonyOsc.start(now);
            harmonyOsc.stop(now + 0.4);
            harmonyOsc.onended = () => {
                harmonyOsc.disconnect();
                harmonyGain.disconnect();
            };
        }

        // Increment combo
        setMelodyCombo(prev => prev + 1);
    }, [isMuted, soundGardenEnabled]);

    const playWrongMelody = useCallback(() => {
        if (isMuted || !soundGardenEnabled) return;

        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        // Descending two-note: C5 (523.25) → G4 (392.00)
        const notes = [
            { freq: 523.25, time: 0, duration: 0.2 },
            { freq: 392.00, time: 0.2, duration: 0.3 },
        ];

        notes.forEach(({ freq, time, duration }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + time);
            gain.gain.setValueAtTime(0.2, now + time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + time);
            osc.stop(now + time + duration);
            osc.onended = () => {
                osc.disconnect();
                gain.disconnect();
            };
        });

        // Reset combo on wrong answer
        setMelodyCombo(0);
    }, [isMuted, soundGardenEnabled]);

    const resetMelodyCombo = useCallback(() => {
        setMelodyCombo(0);
    }, []);

    return {
        playMelodyNote,
        playWrongMelody,
        resetMelodyCombo,
        isSoundGarden,
        toggleSoundGarden,
        melodyCombo,
        isMuted,
    };
};