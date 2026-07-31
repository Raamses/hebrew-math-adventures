import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { GameConfig, IGameBehavior, PowerUpType } from '../../engines/bubble/types';
import { useGameEngine } from '../../engines/bubble/useGameEngine';
import type { BossDefeatResult } from '../../engines/bubble/useGameEngine';
import { Bubble } from '../sensory/Bubble';
import { Explosion } from '../sensory/Explosion';
import { SessionProgressBar } from '../SessionProgressBar';
import { FrenzyOverlay } from './FrenzyOverlay';
import { LevelUpBanner } from './LevelUpBanner';
import { Zap, Star, Clock, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

// Session-level theme mapping (visual progression as kids advance)
const SESSION_THEMES = [
  { bg: 'bg-blue-50', accent: 'text-blue-600' },     // Lv 1-2: Beach
  { bg: 'bg-emerald-50', accent: 'text-emerald-600' }, // Lv 3-4: Forest
  { bg: 'bg-amber-50', accent: 'text-amber-600' },    // Lv 5-6: Mountain
  { bg: 'bg-indigo-50', accent: 'text-indigo-600' },  // Lv 7-8: Space
  { bg: 'bg-rose-50', accent: 'text-rose-600' },      // Lv 9-10: Volcano
];
const getThemeForLevel = (level: number) => SESSION_THEMES[Math.min(Math.floor((level - 1) / 2), SESSION_THEMES.length - 1)];
import { SettingsMenu } from '../SettingsMenu';
import { useSound } from '../../hooks/useSound';
import { useMusicalSound } from '../../hooks/useMusicalSound';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useProfile } from '../../context/ProfileContext';
import { Director } from '../../engines/GameDirector';
import { INITIAL_CAPABILITY_PROFILE } from '../../types/progress';

// --- Power-Up Toast Labels ---
const POWER_UP_LABELS: Record<PowerUpType, string> = {
    freeze: '❄️ Freeze! Bubbles stopped!',
    double_points: '✨ Double Points!',
    pop_distractors: '💥 Distractors Popped!',
    slow_motion: '🐌 Slow Motion!',
};

interface BubbleGameContainerProps {
    config: GameConfig;
    behavior: IGameBehavior;
    onComplete: (success: boolean, correct: number, attempts: number) => void;
    title?: string;
    // Settings Props
    isMuted?: boolean;
    onToggleMute?: () => void;
    onOpenSettings?: () => void;
    onPause?: () => void;
}

// Session-internal leveling thresholds (accelerating: 5,5,4,4,3,3...)
const LEVEL_UP_THRESHOLDS = [5, 5, 4, 4, 3, 3, 3, 3, 3];
const LEVEL_DOWN_THRESHOLD = 3; // consecutive wrong before down-level
const PROBLEM_ROTATION_EVERY = 3; // rotate problem every N correct pops within a level

export const BubbleGameContainer: React.FC<BubbleGameContainerProps> = ({
    config,
    behavior,
    onComplete,
    title,
    isMuted = false,
    onToggleMute = () => { },
    onOpenSettings = () => { },
    onPause = () => { }
}) => {

    // --- Session-Internal Leveling State ---
    const [sessionLevel, setSessionLevel] = useState(1);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const theme = getThemeForLevel(sessionLevel);
    const consecutiveCorrectRef = useRef(0);
    const consecutiveWrongRef = useRef(0);
    const correctSinceRotationRef = useRef(0);
    const sessionLevelRef = useRef(1);

    // --- Session Accuracy Tracking ---
    const sessionCorrectRef = useRef(0);
    const sessionAttemptsRef = useRef(0);
    const sessionStartTimeRef = useRef(Date.now());

    // --- Power-Up Toast State ---
    const [powerUpToast, setPowerUpToast] = useState<string | null>(null);
    const powerUpToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep ref in sync with state
    useEffect(() => { sessionLevelRef.current = sessionLevel; }, [sessionLevel]);

    // Initialize Behavior (Level Setup)
    useEffect(() => {
        behavior.initializeLevel(1, config);
    }, [behavior, config]);

    // Hook into Engine
    const { entities, gameState, handlePop: enginePop, handleOffScreen, getEffectiveSpeedMultiplier, spawnBoss, bossOnScreen: _bossOnScreen, sessionLevelRefForBoss } = useGameEngine(config, behavior);
    const { playSound, play } = useSound();
    const { logEvent } = useAnalytics();
    const { profile, updateProfile, recordSession } = useProfile();
    const { playMelodyNote, playWrongMelody } = useMusicalSound(profile?.settings?.soundGarden ?? false);

    // --- Boss Bubble State ---
    const BOSS_LEVELS = [3, 6, 9]; // Boss appears at these session levels
    const [showBossBanner, setShowBossBanner] = useState(false);
    const [bossDefeatedCelebration, setBossDefeatedCelebration] = useState(false);
    const bossSpawnedForLevelRef = useRef<Set<number>>(new Set());

    // Sync sessionLevel to engine's ref for boss bonus calculation
    useEffect(() => {
        sessionLevelRefForBoss.current = sessionLevel;
    }, [sessionLevel, sessionLevelRefForBoss]);

    // Trigger boss spawn when reaching boss levels
    useEffect(() => {
        if (BOSS_LEVELS.includes(sessionLevel) && !bossSpawnedForLevelRef.current.has(sessionLevel)) {
            bossSpawnedForLevelRef.current.add(sessionLevel);
            // Small delay so level-up animation finishes first
            setTimeout(() => {
                spawnBoss(sessionLevel);
                setShowBossBanner(true);
                play('frenzy'); // Use an exciting sound
                setTimeout(() => setShowBossBanner(false), 3000);
            }, 500);
        }
    }, [sessionLevel, spawnBoss, play]);

    const prevComboRef = useRef(gameState.combo);
    const prevPowerUpStateRef = useRef(gameState.powerUpState);

    useEffect(() => {
        if (gameState.combo === 5 && prevComboRef.current !== 5) {
            play('streak');
        }
        prevComboRef.current = gameState.combo;
    }, [gameState.combo, play]);

    // --- Power-Up Toast Helper ---
    const showPowerUpToast = useCallback((type: PowerUpType) => {
        setPowerUpToast(POWER_UP_LABELS[type]);
        if (powerUpToastTimerRef.current) {
            clearTimeout(powerUpToastTimerRef.current);
        }
        powerUpToastTimerRef.current = setTimeout(() => setPowerUpToast(null), 2500);
    }, []);

    // --- Detect power-up state changes for toast ---
    useEffect(() => {
        const prevPS = prevPowerUpStateRef.current;
        const currPS = gameState.powerUpState;

        // Show toast when a timed power-up just activated
        if (currPS && currPS.active && (!prevPS || !prevPS.active || prevPS.type !== currPS.type)) {
            showPowerUpToast(currPS.type);
        }

        prevPowerUpStateRef.current = currPS;
    }, [gameState.powerUpState, showPowerUpToast]);

    // Cleanup toast timer on unmount
    useEffect(() => {
        return () => {
            if (powerUpToastTimerRef.current) {
                clearTimeout(powerUpToastTimerRef.current);
            }
        };
    }, []);

    // Visual Effects State
    const [explosions, setExplosions] = useState<{ id: string; x: number; y: number }[]>([]);

    // --- Arcade Mode Display Flags ---
    const isTimeLimit = config.winCondition.type === 'time_limit';
    const isEndless = config.winCondition.type === 'endless';
    const hasStrikes = config.failCondition.type === 'strikes' && (config.failCondition.value ?? 0) > 0;
    const maxStrikes = config.failCondition.value ?? 0;

    // --- Session Leveling Logic ---
    const handleSessionLeveling = useCallback((isCorrect: boolean) => {
        if (isCorrect) {
            consecutiveCorrectRef.current++;
            consecutiveWrongRef.current = 0;
            correctSinceRotationRef.current++;

            // Adaptive difficulty: hot streak (>= 3 correct, before level-up threshold)
            // Increase distractorRatio by 1.3x for a harder problem
            if (consecutiveCorrectRef.current >= 3) {
                const harderConfig: GameConfig = {
                    ...config,
                    distractorRatio: Math.round(config.distractorRatio * 1.3),
                };
                behavior.regenerateProblem(sessionLevelRef.current, harderConfig);
            }

            // Problem rotation within a level (every N correct)
            if (correctSinceRotationRef.current >= PROBLEM_ROTATION_EVERY) {
                correctSinceRotationRef.current = 0;
                behavior.regenerateProblem(sessionLevelRef.current, config);
            }

            // Level up check (accelerating thresholds)
            const thresholdIndex = Math.min(sessionLevelRef.current - 1, LEVEL_UP_THRESHOLDS.length - 1);
            const needed = LEVEL_UP_THRESHOLDS[thresholdIndex];
            if (consecutiveCorrectRef.current >= needed) {
                consecutiveCorrectRef.current = 0;
                if (sessionLevelRef.current < 10) {
                    const newLevel = sessionLevelRef.current + 1;
                    setSessionLevel(newLevel);
                    sessionLevelRef.current = newLevel;
                    setShowLevelUp(true);
                    play('levelUp');
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
                    setTimeout(() => setShowLevelUp(false), 2000);
                    // Regenerate problem at new level
                    behavior.regenerateProblem(newLevel, config);
                    logEvent('session_level_up', { level: newLevel });
                }
            }
        } else if (isCorrect === false) {
            consecutiveWrongRef.current++;
            consecutiveCorrectRef.current = 0;

            // Adaptive difficulty: struggling (>= 2 wrong, before level-down threshold of 3)
            // Reduce distractorRatio by 0.5x for a simpler problem, keep level same
            if (consecutiveWrongRef.current >= 2 && consecutiveWrongRef.current < LEVEL_DOWN_THRESHOLD) {
                const simplerConfig: GameConfig = {
                    ...config,
                    distractorRatio: Math.max(1, Math.round(config.distractorRatio * 0.5)),
                };
                behavior.regenerateProblem(sessionLevelRef.current, simplerConfig);
            }

            // Level down after too many consecutive wrong (floor at 1)
            if (consecutiveWrongRef.current >= LEVEL_DOWN_THRESHOLD && sessionLevelRef.current > 1) {
                consecutiveWrongRef.current = 0;
                const newLevel = sessionLevelRef.current - 1;
                setSessionLevel(newLevel);
                sessionLevelRef.current = newLevel;
                behavior.regenerateProblem(newLevel, config);
                logEvent('session_level_down', { level: newLevel });
            }
        }
    }, [behavior, config, logEvent, play]);

    const onPopWrapper = useCallback((id: string, val: number | string, x: number, y: number) => {
        // Find entity to check if it's a power-up BEFORE popping
        const entity = entities.find(e => e.id === id);
        const isPowerUpBubble = entity?.isPowerUp === true;

        const isCorrect = enginePop(id);

        // --- Boss Defeat Handling ---
        if (isCorrect && typeof isCorrect === 'object' && 'bossDefeated' in isCorrect) {
            const bossResult = isCorrect as BossDefeatResult;
            // Show celebration
            setBossDefeatedCelebration(true);
            play('levelUp');
            // Force level-up after boss defeat
            if (sessionLevelRef.current < 10) {
                const newLevel = sessionLevelRef.current + 1;
                setSessionLevel(newLevel);
                sessionLevelRef.current = newLevel;
                setShowLevelUp(true);
                setTimeout(() => setShowLevelUp(false), 2000);
                behavior.regenerateProblem(newLevel, config);
                logEvent('boss_defeated', { level: bossResult.level, bonus: bossResult.bonusPoints, newLevel });
            }
            // Clear celebration after delay
            setTimeout(() => setBossDefeatedCelebration(false), 2500);
            // Add explosion
            setExplosions(prev => [...prev, { id: `${id}-exp`, x, y }]);
            return;
        }

        // --- Power-Up Bubble Handling ---
        if (isPowerUpBubble && entity?.powerUpType) {
            // Play special sound
            play('frenzy');

            // Show toast for instant effects (timed effects handled by state-change useEffect)
            if (entity.powerUpType === 'pop_distractors') {
                showPowerUpToast(entity.powerUpType);
            }

            // Log analytics
            logEvent('powerup_activated', {
                type: entity.powerUpType,
                mode: 'sensory',
            });

            // Add explosion at click coordinates
            setExplosions(prev => [...prev, { id: `${id}-exp`, x, y }]);

            return; // Don't process as a normal answer
        }

        // --- Normal Bubble Handling ---
        // Log Analytics
        if (isCorrect !== undefined) {
            sessionAttemptsRef.current++;
            if (isCorrect) sessionCorrectRef.current++;

            logEvent('question_answered', {
                is_correct: isCorrect,
                value: val,
                mode: 'sensory',
                node_type: 'SENSORY'
            });

            if (profile && updateProfile) {
                const currentCapabilities = profile.capabilities || INITIAL_CAPABILITY_PROFILE;
                const updatedCapabilities = Director.recordResult(
                    currentCapabilities,
                    isCorrect,
                    () => {
                        play('milestone');
                    }
                );
                updateProfile(profile.id, { capabilities: updatedCapabilities });
            }
        }

        // Session-internal leveling (only when answer was validated)
        if (isCorrect !== undefined) {
            handleSessionLeveling(isCorrect);
        }

        // Add explosion at click coordinates
        setExplosions(prev => [...prev, { id: `${id}-exp`, x, y }]);

        if (isCorrect) {
            if (profile?.settings?.soundGarden) {
                playMelodyNote();
            } else {
                playSound('correct');
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
        } else if (isCorrect === false) { // distinct from undefined
            if (profile?.settings?.soundGarden) {
                playWrongMelody();
            } else {
                playSound('wrong');
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
        }
    }, [enginePop, playSound, play, logEvent, profile, updateProfile, handleSessionLeveling, entities, showPowerUpToast, playMelodyNote, playWrongMelody]);

    // Monitor Game Over / Victory
    useEffect(() => {
        if (gameState.isVictory) {
            playSound('levelUp');
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
            recordSession({
                date: new Date().toISOString().slice(0, 10),
                durationSec: Math.round((Date.now() - sessionStartTimeRef.current) / 1000),
                correct: sessionCorrectRef.current,
                attempts: sessionAttemptsRef.current,
                skillFocus: 'sensory',
                gameMode: 'bubble',
            });
            setTimeout(() => onComplete(true, sessionCorrectRef.current, sessionAttemptsRef.current), 1500);
        } else if (gameState.isGameOver) {
            // Handle Loss - Retry?
            // For now just exit false
            playSound('wrong');
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
            recordSession({
                date: new Date().toISOString().slice(0, 10),
                durationSec: Math.round((Date.now() - sessionStartTimeRef.current) / 1000),
                correct: sessionCorrectRef.current,
                attempts: sessionAttemptsRef.current,
                skillFocus: 'sensory',
                gameMode: 'bubble',
            });
            setTimeout(() => onComplete(false, sessionCorrectRef.current, sessionAttemptsRef.current), 1500);
        }
    }, [gameState.isVictory, gameState.isGameOver, onComplete, playSound, recordSession]);

    const instruction = behavior.getInstruction ? behavior.getInstruction() : undefined;

    // Compute effective speed multiplier for bubbles (applies slow_motion / freeze)
    const effectiveSpeedMultiplier = getEffectiveSpeedMultiplier();

    return (
        <div className={`w-full min-h-screen ${theme.bg} flex flex-col items-center relative overflow-hidden transition-colors duration-700`}>
            {/* BOSS! Banner */}
            {showBossBanner && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                    <motion.div
                        initial={{ scale: 0, rotate: -10, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="text-5xl sm:text-6xl font-bold font-fredoka text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-red-500 to-pink-600 drop-shadow-lg"
                        style={{ WebkitTextStroke: '2px rgba(255,255,255,0.3)' }}
                    >
                        🛡️ BOSS! 🛡️
                    </motion.div>
                    <div className="text-center text-lg font-bold text-purple-700 mt-2 animate-bounce">
                        Pop the correct answer 3 times!
                    </div>
                </div>
            )}

            {/* Boss Defeated Celebration */}
            {bossDefeatedCelebration && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 12 }}
                        className="text-4xl sm:text-5xl font-bold font-fredoka text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-lg"
                    >
                        🎉 BOSS DEFEATED! 🎉
                    </motion.div>
                    <div className="text-center text-xl font-bold text-orange-600 mt-2 animate-pulse">
                        +{500 * sessionLevelRef.current} Bonus Points!
                    </div>
                </div>
            )}

            {/* Level-Up Banner */}
            <LevelUpBanner level={sessionLevel} show={showLevelUp} />

            {/* Power-Up Toast Banner */}
            {powerUpToast && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-6 py-2.5 rounded-full shadow-lg border-2 border-yellow-300 animate-bounce">
                        {powerUpToast}
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="w-full max-w-md flex flex-col items-center gap-2 z-20 p-4 pb-0">
                <div className="w-full flex items-center justify-between relative h-12">
                    {/* Stats: Combo + Session Level */}
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-blue-100 z-10">
                        <Zap size={16} className="text-orange-500 fill-orange-500" />
                        <span className="font-bold text-slate-700 text-sm">{gameState.combo}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-purple-100/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm border border-purple-200 z-10">
                        <Star size={14} className="text-purple-500 fill-purple-500" />
                        <span className="font-bold text-purple-700 text-sm">Lv {sessionLevel}</span>
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <h1 className={`text-2xl font-bold ${theme.accent} whitespace-nowrap drop-shadow-sm`}>
                            {title || 'Blast Off'}
                        </h1>
                        {instruction && (
                            <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-2xl shadow-sm border border-blue-100 mt-1">
                                <span className={`text-xl sm:text-2xl font-bold ${theme.accent} tracking-wider font-mono`}>
                                    {instruction}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 z-20">
                        {/* Blitz mode: show timer */}
                        {isTimeLimit && (
                            <div className={`flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border ${
                                (gameState.timeLeft ?? 0) < 10 ? 'border-red-300 animate-pulse' : 'border-blue-100'
                            }`}>
                                <Clock size={16} className={(gameState.timeLeft ?? 0) < 10 ? 'text-red-500 fill-red-500' : 'text-blue-500'} />
                                <span className={`font-bold text-sm ${(gameState.timeLeft ?? 0) < 10 ? 'text-red-500' : 'text-slate-700'}`}>
                                    {gameState.timeLeft ?? 0}s
                                </span>
                            </div>
                        )}
                        {/* Classic/Survival: show strikes as hearts */}
                        {hasStrikes && (
                            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-blue-100 z-10">
                                {Array.from({ length: maxStrikes }).map((_, i) => (
                                    <Heart
                                        key={i}
                                        size={14}
                                        className={i < (maxStrikes - gameState.strikes) ? 'fill-rose-500 text-rose-500' : 'fill-slate-200 text-slate-200'}
                                    />
                                ))}
                            </div>
                        )}
                        <SettingsMenu
                            isMuted={isMuted}
                            onToggleMute={onToggleMute}
                            onOpenSettings={onOpenSettings}
                            onPause={onPause}
                        />
                    </div>
                </div>

                {/* Progress Bar — only for target_count mode */}
                {config.winCondition.type === 'target_count' && (
                    <SessionProgressBar
                        current={gameState.targetsPopped}
                        total={config.winCondition.value}
                    />
                )}

                {/* Blitz mode: score display */}
                {isTimeLimit && (
                    <div className="w-full max-w-md mb-6 px-4">
                        <div className="flex justify-between text-sm font-bold text-slate-500 mb-1">
                            <span>Score: {gameState.score.toLocaleString()}</span>
                            <span>Targets: {gameState.targetsPopped}</span>
                        </div>
                    </div>
                )}

                {/* Zen/Endless mode: relaxed score display */}
                {isEndless && (
                    <div className="w-full max-w-md mb-2 px-4">
                        <div className="flex justify-between text-sm font-bold text-slate-400">
                            <span>🎯 Popped: {gameState.targetsPopped}</span>
                            <span>⭐ Score: {gameState.score.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Game Area & Entities */}
            <div className="flex-grow w-full relative z-0 mt-4 overflow-hidden"
                style={{ perspective: '1000px' }}>
                {entities.map(e => (
                    <Bubble
                        key={e.id}
                        id={e.id}
                        value={e.content as number | string}
                        x={e.x}
                        delay={0}
                        onClick={onPopWrapper}
                        onOffScreen={handleOffScreen}
                        isPopped={e.isPopped}
                        variant={e.variant}
                        speedMultiplier={effectiveSpeedMultiplier * (e.speedMultiplier ?? 1)}
                        isPowerUp={e.isPowerUp}
                        isBoss={e.isBoss}
                        bossHealth={e.bossHealth}
                        bossMaxHealth={e.bossMaxHealth}
                    />
                ))}
            </div>

            {/* Explosion Layer */}
            {explosions.map(exp => (
                <Explosion
                    key={exp.id}
                    x={exp.x}
                    y={exp.y}
                    onComplete={() => setExplosions(prev => prev.filter(e => e.id !== exp.id))}
                />
            ))}
            <FrenzyOverlay isActive={gameState.isFrenzy} combo={gameState.combo} />
        </div>
    );
};