import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../context/ProfileContext';
import { useSoundManager } from '../hooks/useSoundManager';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { useAnswerFlow } from '../hooks/useAnswerFlow';
import { useFeedbackEffects } from '../hooks/useFeedbackEffects';
import { useAnalytics } from '../hooks/useAnalytics';
import { useQuest } from '../context/QuestContext';
import { formatProblemEquation } from '../lib/gameLogic';
import { UI_CONFIG } from '../lib/worldConfig';
import { isCheckpoint } from '../lib/checkpoints';

// Sub-components
import { MathCard } from './MathCard';
import { ScoreToast } from './ScoreToast';
import { SessionProgressBar } from './SessionProgressBar';
import { GameMenuModal } from './GameMenuModal';
import { SessionSummary } from './SessionSummary';
import { computeStarsByTier } from '../lib/stars';
import { SettingsModal } from './SettingsModal';
import { ModeSelectorOverlay } from './games/ModeSelectorOverlay';
import { ArcadeHUD } from './games/ArcadeHUD';
import type { GameMode } from '../hooks/usePracticeSession';
import { PracticeHeader } from './practice/PracticeHeader';
import { PracticeFeedback } from './practice/PracticeFeedback';
import { CheckpointBanner } from './practice/CheckpointBanner';

// Types
import type { BaseProblemConfig } from '../engines/ProblemFactory';


interface PracticeModeProps {
    targetLevel: number;
    onExit: () => void;
    problemConfig?: BaseProblemConfig;
    onComplete?: (success: boolean, correct: number, attempts: number) => void;
    onMemoryMode?: () => void;
    onInvadersMode?: () => void;
    dailyChallengeMode?: string;
    dailyChallengeTarget?: number;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({ targetLevel, onExit, problemConfig, onComplete, onMemoryMode, onInvadersMode, dailyChallengeMode, dailyChallengeTarget }) => {
    const { t, i18n } = useTranslation();
    const { profile, incrementStreak, resetStreak, updateArcadeBestScore, recordSession } = useProfile();
    const soundManager = useSoundManager({ soundGardenEnabled: profile?.settings?.soundGarden ?? false });
    const { logEvent } = useAnalytics();
    const { completeDailyChallenge, todayChallenge, addDailyChallengeCorrect, dailyChallengeCorrect } = useQuest();
    // Track daily challenge completion to avoid double-calling
    const dailyChallengeClaimedRef = useRef(false);
    // Track accumulated correct in a ref to avoid stale closures
    const dailyChallengeCorrectRef = useRef(dailyChallengeCorrect);
    useEffect(() => {
        dailyChallengeCorrectRef.current = dailyChallengeCorrect;
    }, [dailyChallengeCorrect]);

    // Track start time for current problem
    const problemStartTime = useRef(Date.now());
    // Track start time for entire session (for analytics)
    const sessionStartTime = useRef(Date.now());

    // Reset timer when problem changes
    useEffect(() => {
        problemStartTime.current = Date.now();
    }, [problemConfig]);

    // Hook: Session Logic
    const {
        session,
        problem,
        initSession,
        nextProblem,
        restartSession,
        submitResult,
        evaluateAnswer
    } = usePracticeSession({ targetLevel, problemConfig });

    // Feedback Effects Hook (owns mascot/confetti/stars lifecycle, decoupled from answer lock)
    const feedbackEffects = useFeedbackEffects();
    const {
        mascotEmotion, mascotMessage, showBubble, showStars, showConfetti, burstId,
        celebrate, encourage, clearStars, clearAll,
    } = feedbackEffects;

    // UI State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [scoreToast, setScoreToast] = useState<{ message: string } | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [checkpointMessage, setCheckpointMessage] = useState<string | null>(null);

    // Track last checkpoint question to avoid double-firing
    const lastCheckpointRef = useRef<number | null>(null);

    // Mode Selection State
    // If problemConfig is present, we are in a Lesson/Saga context -> Auto Standard Mode
    // If absent, we are in Free Play -> Show Mode Selector
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(!problemConfig);
    const hasInitializedRef = useRef(!!problemConfig);

    // Summary State
    const [showSummary, setShowSummary] = useState(false);

    // Daily challenge: check completion at session end.
    // Progress accumulates across sessions via QuestContext (for when target > session length).
    // IMPORTANT: Zen levels are only 10 questions, but daily target can be up to 19.
    const effectiveDailyMode = dailyChallengeMode || todayChallenge.mode;
    const effectiveDailyTarget = dailyChallengeTarget || todayChallenge.target;
    // Track how many correct answers from this session have already been added to the daily total.
    // This lets us check after EVERY correct answer while only accumulating the delta.
    const sessionAddedCorrectRef = useRef(0);
    const checkDailyChallenge = (sessionCorrect: number) => {
        if (dailyChallengeClaimedRef.current) return;
        // Only accumulate the new correct answers since last check
        const newCorrect = sessionCorrect - sessionAddedCorrectRef.current;
        if (newCorrect <= 0) return;
        // Check if current session mode matches today's challenge mode
        const currentSession = sessionRef.current;
        const sessionMode = currentSession.mode.toLowerCase();
        const challengeMode = effectiveDailyMode.toLowerCase();
        // STANDARD maps to 'zen'/'classic', TIME_ATTACK maps to 'blitz', SURVIVAL maps to 'survival'
        const modeMatches =
            sessionMode === challengeMode ||
            (sessionMode === 'standard' && (challengeMode === 'zen' || challengeMode === 'classic')) ||
            (sessionMode === 'time_attack' && challengeMode === 'blitz');
        if (!modeMatches) return;
        // Accumulate only the delta into the daily total
        addDailyChallengeCorrect(newCorrect);
        sessionAddedCorrectRef.current = sessionCorrect;
        // Check if accumulated total meets the target.
        // NOTE: addDailyChallengeCorrect updates React state, but the ref updates via useEffect (async).
        // So compute the expected accumulated value manually from the current ref + delta.
        const accumulated = dailyChallengeCorrectRef.current + newCorrect;
        if (accumulated < effectiveDailyTarget) return;
        const result = completeDailyChallenge();
        if (result) {
            dailyChallengeClaimedRef.current = true;
            console.log(`[DC DEBUG] Daily challenge complete! +${result.total} coins, streak: ${result.newStreak}`);
        }
    };

    // Answer Flow Hook (Timing & Transitions) — Snappy Flow: 400ms correct, 600ms wrong
    const { isProcessing, submitAnswer } = useAnswerFlow({
        correctDelay: UI_CONFIG.ANSWER_LOCK_CORRECT_MS,
        wrongDelay: UI_CONFIG.ANSWER_LOCK_WRONG_MS,
        onCorrectComplete: () => {
            // Visual effects are owned by useFeedbackEffects — do NOT clear them here.
            // They self-dismiss on their own timers (see useFeedbackEffects.ts).

            // Use ref to get the freshest session state after the delay
            const currentSession = sessionRef.current;
            if (currentSession.isGameOver) return; // Handled by effect

            // Check completion for Standard Mode (Fixed Length)
            // Arcade modes continue until Game Over
            console.log('[DC DEBUG] onCorrectComplete', { mode: currentSession.mode, count: currentSession.count, correct: currentSession.correct, sessionLength: UI_CONFIG.SESSION_LENGTH });
            if (currentSession.mode === 'STANDARD' && currentSession.count >= UI_CONFIG.SESSION_LENGTH) {
                clearAll(); // Clean up effects before showing summary
                soundManager.playLevelUp();
                soundManager.vibrate([100, 50, 100]);
                recordSession({
                    date: new Date().toISOString().slice(0, 10),
                    durationSec: Math.round((Date.now() - sessionStartTime.current) / 1000),
                    correct: currentSession.correct,
                    attempts: currentSession.attempts,
                    skillFocus: problemConfig?.type || 'mixed',
                    gameMode: 'practice',
                });
                // Check daily challenge completion
                checkDailyChallenge(currentSession.correct);
                setShowSummary(true);
                if (onComplete) onComplete(true, currentSession.correct, currentSession.attempts);
            } else {
                // Check daily challenge after EVERY correct answer (not just session end)
                // This is essential for Zen mode where sessions are only 10 questions
                // but the daily target can be up to 19 — progress accumulates across sessions
                checkDailyChallenge(currentSession.correct);
                nextProblem(); // Generate next problem WITHOUT resetting state
            }
        },
        onWrongComplete: () => {
            // Mascot bubble is owned by useFeedbackEffects — do NOT clear here.
            setFeedback(null);

            // Check for Game Over immediately after wrong answer animation in Survival
            const currentSession = sessionRef.current;
            if (currentSession.mode === 'SURVIVAL' && currentSession.isGameOver) {
                // Effect will pick this up
            }
        }
    });

    // Track session state in ref for callbacks to avoid stale closures
    const sessionRef = useRef(session);
    useEffect(() => {
        sessionRef.current = session;

        // Auto-end game on Game Over (Survival/Time Attack)
        // Wait for isProcessing to be false so we don't interrupt feedback animations (especially in Survival)
        if (session.isGameOver && !showSummary && !isProcessing) {
            // Persist Score if it's an Arcade Mode
            if (session.mode !== 'STANDARD' && session.score > 0) {
                updateArcadeBestScore(session.mode, session.score);
            }

            clearAll(); // Clean up effects before showing summary
            soundManager.playLevelUp(); // Or 'gameOver' sound if we had one
            soundManager.vibrate([100, 50, 100]);
            recordSession({
                date: new Date().toISOString().slice(0, 10),
                durationSec: Math.round((Date.now() - sessionStartTime.current) / 1000),
                correct: session.correct,
                attempts: session.attempts,
                skillFocus: problemConfig?.type || 'mixed',
                gameMode: 'practice',
            });
            // Check daily challenge completion on Game Over
            checkDailyChallenge(session.correct);
            setShowSummary(true);
            if (onComplete) onComplete(false, session.correct, session.attempts); // Game Over isn't necessarily a "Win"
        }
    }, [session, showSummary, onComplete, isProcessing, updateArcadeBestScore]);

    // Micro-checkpoint banner trigger — fires at Q3 and Q6 in STANDARD mode
    useEffect(() => {
        if (isCheckpoint(session.count, session.mode) && lastCheckpointRef.current !== session.count) {
            lastCheckpointRef.current = session.count;
            const key = String(session.count) as '3' | '6';
            const msg = t(`practice.checkpoint.${key}`, { defaultValue: '' });
            if (msg) setCheckpointMessage(msg);
        }
    }, [session.count, session.mode, t]);

    // Initialization & Greeting
    useEffect(() => {
        // If we have config (Saga Mode), auto-init Standard
        if (problemConfig && !problem && profile) {
            initSession('STANDARD');
        }
        // If Free Play, wait for Mode Selector (handled by onSelectMode)

        // Reset timer when problem updates
        if (problem) {
            problemStartTime.current = Date.now();
        }
    }, [targetLevel, profile, problem, t, initSession, problemConfig]);

    const handleModeSelect = (mode: GameMode) => {
        if (mode === 'MEMORY' && onMemoryMode) {
            setIsModeSelectorOpen(false);
            onMemoryMode();
            return;
        }
        if (mode === 'INVADERS' && onInvadersMode) {
            setIsModeSelectorOpen(false);
            onInvadersMode();
            return;
        }
        setIsModeSelectorOpen(false);
        hasInitializedRef.current = true;
        sessionStartTime.current = Date.now();
        sessionAddedCorrectRef.current = 0; // reset for new session
        lastCheckpointRef.current = null; // reset checkpoints for new session
        initSession(mode);
    };

    const handleAnswer = useCallback((isCorrect: boolean) => {
        if (!profile || !problem || isProcessing) return;

        // Log analytics
        const timeTaken = Date.now() - problemStartTime.current;
        logEvent('question_answered', {
            is_correct: isCorrect,
            equation: formatProblemEquation(problem),
            response_time_ms: timeTaken,
            mode: session.mode,
            target_level: targetLevel
        });

        submitAnswer(isCorrect);
        submitResult(isCorrect); // Update session state

        if (isCorrect) {
            soundManager.playCorrect();
            soundManager.vibrate(50);
            // Toast mainly for Standard/Zen. Arcade has the HUD.
            // Suppress toast on checkpoint questions — the banner is the reward.
            if (session.mode === 'STANDARD' && !isCheckpoint(session.count, session.mode)) {
                setScoreToast({ message: t('feedback.correct') });
            }
            setFeedback(null);

            // Dynamic Mascot Reactions via useFeedbackEffects
            const phrases = t('feedback.phrases', { returnObjects: true }) as string[];
            const phrase = Array.isArray(phrases) ? phrases[Math.floor(Math.random() * phrases.length)] : "Great!";

            celebrate(phrase);

            if (incrementStreak) incrementStreak();
        } else {
            soundManager.playWrong();
            soundManager.vibrate([30, 50, 30]);
            const evalResult = evaluateAnswer(problem, 'WRONG');
            setFeedback(t(evalResult.message || 'feedback.defaultError'));

            if (resetStreak) resetStreak();

            const phrases = t('feedback.gentle', { returnObjects: true }) as string[];
            const phrase = Array.isArray(phrases) ? phrases[Math.floor(Math.random() * phrases.length)] : "Try again";

            encourage(phrase);
        }
    }, [profile, problem, isProcessing, session.mode, targetLevel, submitAnswer, submitResult, soundManager, incrementStreak, resetStreak, t, celebrate, encourage]);

    const handleRestart = () => {
        setIsMenuOpen(false);
        sessionStartTime.current = Date.now();
        sessionAddedCorrectRef.current = 0; // reset daily challenge tracking for new session
        lastCheckpointRef.current = null; // reset checkpoints for new session
        // If it was Free Play, show selector again. If Saga, just restart Standard.
        if (!problemConfig) {
            setIsModeSelectorOpen(true);
        } else {
            restartSession();
        }
    };

    const handlePlayAgain = () => {
        setShowSummary(false);
        sessionStartTime.current = Date.now();
        sessionAddedCorrectRef.current = 0; // reset daily challenge tracking for new session
        lastCheckpointRef.current = null; // reset checkpoints for new session
        if (!problemConfig) {
            setIsModeSelectorOpen(true);
        } else {
            restartSession();
        }
    };

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center p-4 relative overflow-hidden" dir={i18n.dir()}>
            {/* Mode Selector Overlay */}
            <ModeSelectorOverlay
                isOpen={isModeSelectorOpen}
                onSelectMode={handleModeSelect}
                bestScores={profile.arcadeStats}
                onClose={onExit}
            />

            {/* Micro-Checkpoint Banner */}
            <CheckpointBanner
                message={checkpointMessage}
                onComplete={() => setCheckpointMessage(null)}
            />

            {/* Game Content - Only render if initialized (to prevent flash of empty state behind selector) */}
            {hasInitializedRef.current && problem && (
                <>
                    <PracticeFeedback
                        mascotEmotion={mascotEmotion}
                        mascotMessage={mascotMessage}
                        showBubble={showBubble}
                        showStars={showStars}
                        showConfetti={showConfetti}
                        burstId={burstId}
                        onStarsComplete={clearStars}
                    />

                    <ScoreToast
                        key={burstId}
                        message={scoreToast ? scoreToast.message : ''}
                        isVisible={!!scoreToast}
                        onComplete={() => setScoreToast(null)}
                    />

                    {/* Header — z-50 so settings dropdown paints above MathCard */}
                    <div className="w-full max-w-md z-50 relative mb-3">
                        <PracticeHeader
                            targetLevel={targetLevel}
                            onPause={() => setIsMenuOpen(true)}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                        />
                    </div>

                    {/* HUD Switcher */}
                    {session.mode === 'STANDARD' ? (
                        <SessionProgressBar current={session.count} total={UI_CONFIG.SESSION_LENGTH} />
                    ) : (
                        <ArcadeHUD
                            mode={session.mode}
                            score={session.score}
                            lives={session.lives}
                            timeLeft={session.timeLeft}
                            combo={session.combo}
                        />
                    )}

                    <div className="w-full max-w-md z-30 relative">
                        <MathCard
                            problem={problem}
                            onAnswer={handleAnswer}
                            feedback={feedback}
                            isProcessing={isProcessing}
                        />
                    </div>
                </>
            )}

            <GameMenuModal
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onRestart={handleRestart}
                onExit={onExit}
                onSettings={() => {
                    setIsMenuOpen(false);
                    setIsSettingsOpen(true);
                }}
            />

            <SessionSummary
                isOpen={showSummary}
                starsGained={computeStarsByTier(session.correct, session.attempts)}
                correctCount={session.correct}
                totalCount={session.attempts}
                totalScore={session.score}
                onPlayAgain={handlePlayAgain}
                onExit={onExit}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};
