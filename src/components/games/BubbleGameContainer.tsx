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
import { useTranslation } from 'react-i18next';

// SESSION_THEMES now imported from worldConfig
// ADR 2026-08-zen-answer-race (Fix 1): lock window to drop cross-entity
// rapid pops that could validate a second pop against a rotated targetValue.
// SESSION_CONFIG.ANSWER_LOCK_MS now from SESSION_CONFIG in worldConfig
const getThemeForLevel = (level: number) => SESSION_THEMES[Math.min(Math.floor((level - 1) / 2), SESSION_THEMES.length - 1)];
import { SettingsMenu } from '../SettingsMenu';
import { useSound } from '../../hooks/useSound';
import { useMusicalSound } from '../../hooks/useMusicalSound';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useProfile } from '../../context/ProfileContext';
import { useQuest } from '../../context/QuestContext';
import { Director } from '../../engines/GameDirector';
import { INITIAL_CAPABILITY_PROFILE } from '../../types/progress';
import { generateBossGate } from '../../lib/bossGate';
import { MathBehaviorStrategy } from '../../engines/bubble/strategies/MathStrategy';
import { SESSION_CONFIG, SESSION_THEMES, BOSS_LEVELS, MAX_LEVEL } from '../../lib/worldConfig';

// --- Power-Up Toast Labels ---
const POWER_UP_LABELS: Record<PowerUpType, string> = {
    freeze: '❄️ Freeze! Bubbles stopped!',
    double_points: '✨ Double Points!',
    pop_distractors: '💥 Distractors Popped!',
    slow_motion: '🐌 Slow Motion!',
    lightning_chain: '⚡ Lightning Chain! Distractors zapped!',
    rainbow_magnet: '🌈 Rainbow Magnet! Super target boost!',
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

// Session leveling thresholds now from SESSION_CONFIG in worldConfig

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
    const { playSound, play } = useSound();
    const { logEvent } = useAnalytics();
    const { profile, updateProfile, recordSession } = useProfile();
    const { recordQuestEvent } = useQuest();
    const { playMelodyNote, playWrongMelody } = useMusicalSound(profile?.settings?.soundGarden ?? false);
    const { t } = useTranslation();

    // --- Session-Internal Leveling State ---
    const [sessionLevel, setSessionLevel] = useState(() => {
        // Seed from profile.estimatedLevel (capped at 10, warmup floor at 1)
        const profileLevel = profile?.capabilities?.estimatedLevel ?? 1;
        return Math.max(1, Math.min(Math.round(profileLevel), MAX_LEVEL));
    });
    const [showLevelUp, setShowLevelUp] = useState(false);
    const theme = getThemeForLevel(sessionLevel);
    const consecutiveCorrectRef = useRef(0);
    const consecutiveWrongRef = useRef(0);
    const correctSinceRotationRef = useRef(0);
    const sessionLevelRef = useRef(1);
    // ADR 2026-08-zen-answer-race (Fix 1): cross-entity pop lock
    const answerLockRef = useRef(false);

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
    const { entities, gameState, handlePop: enginePop, handleOffScreen, getEffectiveSpeedMultiplier, spawnBoss, bossOnScreen, sessionLevelRefForBoss, updateBossTarget } = useGameEngine(config, behavior);

    // --- Boss Bubble State ---
    // BOSS_LEVELS now imported from worldConfig
    const [showBossBanner, setShowBossBanner] = useState(false);
    const [bossDefeatedCelebration, setBossDefeatedCelebration] = useState(false);
    const bossSpawnedForLevelRef = useRef<Set<number>>(new Set());

    // Sync sessionLevel to engine's ref for boss bonus calculation
    useEffect(() => {
        sessionLevelRefForBoss.current = sessionLevel;
    }, [sessionLevel, sessionLevelRefForBoss]);

    // Trigger boss spawn when reaching boss levels
    useEffect(() => {
        if ((BOSS_LEVELS as readonly number[]).includes(sessionLevel) && !bossSpawnedForLevelRef.current.has(sessionLevel)) {
            bossSpawnedForLevelRef.current.add(sessionLevel);
            // Small delay so level-up animation finishes first
            setTimeout(() => {
                // Generate boss gate if behavior supports it
                if (behavior instanceof MathBehaviorStrategy) {
                    const mathBehavior = behavior as MathBehaviorStrategy;
                    const capabilities = profile?.capabilities ?? INITIAL_CAPABILITY_PROFILE;
                    const gate = generateBossGate(sessionLevel, mathBehavior.getMathModule(), capabilities);
                    mathBehavior.prepareBossGate(gate);
                }
                spawnBoss(sessionLevel);
                setShowBossBanner(true);
                play('frenzy'); // Use an exciting sound
                setTimeout(() => setShowBossBanner(false), 3000);
            }, 500);
        }
    }, [sessionLevel, spawnBoss, play, behavior, profile]);

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
        const correctCount = gameState.targetsPopped + (isCorrect ? 1 : 0);
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
                behavior.regenerateProblem(sessionLevelRef.current, harderConfig, correctCount);
            }

            // Problem rotation within a level (every N correct)
            if (correctSinceRotationRef.current >= SESSION_CONFIG.PROBLEM_ROTATION_EVERY) {
                correctSinceRotationRef.current = 0;
                behavior.regenerateProblem(sessionLevelRef.current, config, correctCount);
            }

            // Level up check (accelerating thresholds)
            const thresholdIndex = Math.min(sessionLevelRef.current - 1, SESSION_CONFIG.LEVEL_UP_THRESHOLDS.length - 1);
            const needed = SESSION_CONFIG.LEVEL_UP_THRESHOLDS[thresholdIndex];
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
                    behavior.regenerateProblem(newLevel, config, correctCount);
                    logEvent('session_level_up', { level: newLevel });
                }
            }
        } else if (isCorrect === false) {
            consecutiveWrongRef.current++;
            // P0-9b: Soft streak decay — decrement by 1 instead of full reset
            // A single distractor misclick shouldn't wipe a 15-correct streak
            consecutiveCorrectRef.current = Math.max(0, consecutiveCorrectRef.current - 1);

            // Adaptive difficulty: struggling (>= 2 wrong, before level-down threshold of 3)
            // Reduce distractorRatio by 0.5x for a simpler problem, keep level same
            if (consecutiveWrongRef.current >= 2 && consecutiveWrongRef.current < SESSION_CONFIG.LEVEL_DOWN_THRESHOLD) {
                const simplerConfig: GameConfig = {
                    ...config,
                    distractorRatio: Math.max(1, Math.round(config.distractorRatio * 0.5)),
                };
                behavior.regenerateProblem(sessionLevelRef.current, simplerConfig, correctCount);
            }

            // Level down after too many consecutive wrong (floor at 1)
            if (consecutiveWrongRef.current >= SESSION_CONFIG.LEVEL_DOWN_THRESHOLD && sessionLevelRef.current > 1) {
                consecutiveWrongRef.current = 0;
                const newLevel = sessionLevelRef.current - 1;
                setSessionLevel(newLevel);
                sessionLevelRef.current = newLevel;
                behavior.regenerateProblem(newLevel, config, correctCount);
                logEvent('session_level_down', { level: newLevel });
            }
        }
    }, [behavior, config, logEvent, play, gameState.targetsPopped]);

    const onPopWrapper = useCallback((id: string, val: number | string, x: number, y: number) => {
        // ADR 2026-08-zen-answer-race (Fix 1): answer-lock to prevent the
        // cross-entity race. A target + distractor popped near-simultaneously
        // would both be processed, letting the second validate against a stale/
        // rotated targetValue (breaking score + resetting answer state in zen).
        // While a pop is being processed, drop further pops for a short window.
        if (answerLockRef.current) return;
        answerLockRef.current = true;
        window.setTimeout(() => { answerLockRef.current = false; }, SESSION_CONFIG.ANSWER_LOCK_MS);

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
                behavior.regenerateProblem(newLevel, config, gameState.targetsPopped + 1);
                logEvent('boss_defeated', { level: bossResult.level, bonus: bossResult.bonusPoints, newLevel });
                recordQuestEvent('boss_defeated', 1);
            }
            // Clear celebration after delay
            setTimeout(() => setBossDefeatedCelebration(false), 2500);
            // Add explosion
            setExplosions(prev => [...prev, { id: `${id}-exp`, x, y }]);
            return;
        }

        // --- Boss Gate Advancement (non-defeating boss hit) ---
        if (isCorrect === true && entity?.isBoss && behavior instanceof MathBehaviorStrategy) {
            const mathBehavior = behavior as MathBehaviorStrategy;
            if (mathBehavior.isBossGateActive()) {
                const hasMore = mathBehavior.advanceBossGateProblem();
                if (hasMore) {
                    // Update boss target to the new gate problem's answer
                    const newTarget = (mathBehavior as any).targetValue as number;
                    updateBossTarget(newTarget);
                }
            }
        }

        // --- Power-Up Bubble Handling ---
        if (isPowerUpBubble && entity?.powerUpType) {
            // Play special sound
            play('frenzy');

            // Show toast for instant effects (timed effects handled by state-change useEffect)
            if (entity.powerUpType === 'pop_distractors' || entity.powerUpType === 'lightning_chain') {
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
    }, [enginePop, playSound, play, logEvent, profile, updateProfile, handleSessionLeveling, entities, showPowerUpToast, playMelodyNote, playWrongMelody, recordQuestEvent, gameState.combo, updateBossTarget, behavior]);

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
    }, [gameState.isVictory, gameState.isGameOver, onComplete, playSound, recordSession, recordQuestEvent]);

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

            {/* Boss Gate Banner — shows gate type and progress while boss is active */}
            {bossOnScreen && behavior instanceof MathBehaviorStrategy && (behavior as MathBehaviorStrategy).isBossGateActive() && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold">
                    <span>{(behavior as MathBehaviorStrategy).getBossGateIcon()}</span>
                    <span>{(behavior as MathBehaviorStrategy).getBossGateLabel()}</span>
                    <span className="opacity-75">
                        Problem {(behavior as MathBehaviorStrategy).getBossGateIndex() + 1}/{(behavior as MathBehaviorStrategy).getBossGateProblemCount()}
                    </span>
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

            {/* Header Area — Clean 3-row layout */}
            <div className="w-full max-w-md flex flex-col items-center gap-1.5 z-40 px-3 pt-3 pb-1">
                {/* Row 1: Stats badges (left) + Settings (right) */}
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        {/* Combo badge */}
                        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm border border-blue-100">
                            <Zap size={14} className="text-orange-500 fill-orange-500" />
                            <span className="font-bold text-slate-700 text-xs">{gameState.combo}</span>
                        </div>
                        {/* Level badge */}
                        <div className="flex items-center gap-0.5 bg-purple-100/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm border border-purple-200">
                            <Star size={12} className="text-purple-500 fill-purple-500" />
                            <span className="font-bold text-purple-700 text-xs">Lv {sessionLevel}</span>
                        </div>
                        {/* Blitz timer */}
                        {isTimeLimit && (
                            <div className={`flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm border ${
                                (gameState.timeLeft ?? 0) < 10 ? 'border-red-300 animate-pulse' : 'border-blue-100'
                            }`}>
                                <Clock size={14} className={(gameState.timeLeft ?? 0) < 10 ? 'text-red-500 fill-red-500' : 'text-blue-500'} />
                                <span className={`font-bold text-xs ${(gameState.timeLeft ?? 0) < 10 ? 'text-red-500' : 'text-slate-700'}`}>
                                    {gameState.timeLeft ?? 0}s
                                </span>
                            </div>
                        )}
                        {/* Survival hearts */}
                        {hasStrikes && (
                            <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm border border-blue-100">
                                {Array.from({ length: maxStrikes }).map((_, i) => (
                                    <Heart
                                        key={i}
                                        size={12}
                                        className={i < (maxStrikes - gameState.strikes) ? 'fill-rose-500 text-rose-500' : 'fill-slate-200 text-slate-200'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Settings */}
                    <SettingsMenu
                        isMuted={isMuted}
                        onToggleMute={onToggleMute}
                        onOpenSettings={onOpenSettings}
                        onPause={onPause}
                    />
                </div>

                {/* Row 2: Title + Instruction (centered, own row) */}
                <div className="flex flex-col items-center gap-0.5 w-full">
                    <h1 className={`text-lg font-bold ${theme.accent} whitespace-nowrap drop-shadow-sm leading-tight`}>
                        {title || 'Blast Off'}
                    </h1>
                    {instruction && (
                        <div dir="ltr" style={{ unicodeBidi: 'isolate' }} className="bg-white/85 backdrop-blur-md px-4 py-1 rounded-xl shadow-sm border border-blue-100">
                            <span className={`text-lg font-bold ${theme.accent} tracking-wide font-mono leading-tight`}>
                                {instruction}
                            </span>
                        </div>
                    )}
                </div>

                {/* Row 3: Progress bar (target_count mode) */}
                {config.winCondition.type === 'target_count' && (
                    <SessionProgressBar
                        current={gameState.targetsPopped}
                        total={config.winCondition.value}
                    />
                )}

                {/* Blitz score strip */}
                {isTimeLimit && (
                    <div className="w-full px-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                            <span>{t('game.scoreLabel')}: {gameState.score.toLocaleString()}</span>
                            <span>{t('bubble.targets', 'Targets')}: {gameState.targetsPopped}</span>
                        </div>
                    </div>
                )}

                {/* Zen/Endless score strip */}
                {isEndless && (
                    <div className="w-full px-2">
                        <div className="flex justify-between text-xs font-bold text-slate-400">
                            <span>🎯 {t('bubble.targets', 'Targets')}: {gameState.targetsPopped}</span>
                            <span>⭐ {t('game.scoreLabel')}: {gameState.score.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Game Area & Entities */}
            <div className="flex-grow w-full relative z-0 mt-2 overflow-hidden"
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
            <FrenzyOverlay isActive={gameState.isFrenzy} combo={gameState.combo} variant="bubble" />
        </div>
    );
};