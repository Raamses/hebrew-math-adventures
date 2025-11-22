import { useState, useEffect, useCallback } from 'react';

// Placeholder sounds (using short, pleasant beeps/chimes from online sources or data URIs could be better, 
// but for now we'll use simple reliable URLs or just empty strings if we want to simulate)
// Actually, let's use some public domain sound effects or simple oscillator beeps if possible?
// For a web app, AudioContext oscillators are great for "beeps" without assets.
// Let's implement a simple synthesizer for now to avoid 404s on missing files!

type SoundType = 'correct' | 'wrong' | 'levelUp' | 'click';

export const useSound = () => {
    const [isMuted, setIsMuted] = useState<boolean>(() => {
        const saved = localStorage.getItem('isMuted');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('isMuted', JSON.stringify(isMuted));
    }, [isMuted]);

    const playSound = useCallback((type: SoundType) => {
        if (isMuted) return;

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
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
                osc.stop(now + 0.6);
                break;

            case 'click':
                // Short click
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
        }
    }, [isMuted]);

    const toggleMute = () => setIsMuted(prev => !prev);

    return { playSound, isMuted, toggleMute };
};
