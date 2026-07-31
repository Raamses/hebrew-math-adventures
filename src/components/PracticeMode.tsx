import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../context/ProfileContext';
import { useSound } from '../hooks/useSound';
import { useMusicalSound } from '../hooks/useMusicalSound';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { useAnswerFlow } from '../hooks/useAnswerFlow';
import { useAnalytics } from '../hooks/useAnalytics';
import { useQuest } from '../context/QuestContext';
import { formatProblemEquation } from '../lib/gameLogic';

// Sub-components
import { MathCard } from './MathCard';
import { ScoreToast } from './ScoreToast';
import { SessionProgressBar } from './SessionProgressBar';
import { GameMenuModal } from './GameMenuModal';
import { SessionSummary } from './SessionSummary';
import { SettingsModal } from './SettingsModal';
import { ModeSelectorOverlay } from './games/ModeSelectorOverlay';
import { ArcadeHUD } from './games/ArcadeHUD';
import type { GameMode } from '../hooks/usePracticeSession';
import { PracticeHeader } from './practice/PracticeHeader';
import { PracticeFeedback } from './practice/PracticeFeedback';

// Types
import type { BaseProblemConfig } from '../engines/ProblemFactory';
import type { MascotEmotion } from './mascot/Mascot';

const SESSION_LENGTH = 10;

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
    const { playSound } = useSound();
    const { playMelodyNote, playWrongMelody } = useMusicalSound(profile?.settings?.soundGarden ?? false);
    const { logEvent } = useAnalytics();
    const { completeDailyChallenge, todayChallenge } = useQuest();
    // Track daily challenge completion to avoid double-calling
    const dailyChallengeClaimedRef = useRef(false);

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

    // UI Feedback State
    const [showStars, setShowStars] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [scoreToast, setScoreToast] = useState<{ message: string } | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    // Mode Selection State
    // If problemConfig is present, we are in a Lesson/Saga context -> Auto Standard Mode
    // If absent, we are in Free Play -> Show Mode Selector
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(!problemConfig);
    const hasInitializedRef = useRef(!!problemConfig);

    // Mascot State
    const [mascotEmotion, setMascotEmotion] = useState<MascotEmotion>('idle');
    const [mascotMessage, setMascotMessage] = useState<string>('');
    const [showBubble, setShowBubble] = useState(false);

    // Summary State
    const [showSummary, setShowSummary] = useState(false);

    // Daily challenge: check completion after every correct answer.
    // Works for endless modes (Zen) that never trigger session end.
    // Also auto-detects today's challenge mode if user launched from Arcade button
    // instead of "Start Challenge!"
    const effectiveDailyMode = dailyChallengeMode || todayChallenge.mode;
    const effectiveDailyTarget = dailyChallengeTarget || todayChallenge.target;
    const checkDailyChallenge = (correctCount: number) => {
        if (dailyChallengeClaimedRef.current) return;
        if (correctCount < effectiveDailyTarget) return;
        // Check if current session mode matches today's challenge mode
        const currentSession = sessionRef.current;
        const sessionMode = currentSession.mode.toLowerCase();
        const challengeMode = effectiveDailyMode.toLowerCase();
        // TIME_ATTACK maps to 'blitz', SURVIVAL maps to 'survival', STANDARD maps to 'zen'/'classic'
        const modeMatches =
            sessionMode === challengeMode ||
            (sessionMode === 'STANDARD'.toLowerCase() && (challengeMode === 'zen' || challengeMode === 'classic')) ||
            (sessionMode === 'TIME_ATTACK'.toLowerCase() && challengeMode === 'blitz');
        if (!modeMatches) return;
        const result = completeDailyChallenge();
        if (result) {
            dailyChallengeClaimedRef.current = true;
            console.log(`Daily challenge complete! +${result.total} coins, streak: ${result.newStreak}`);
        }
    };

    // Answer Flow Hook (Timing & Transitions)
    const { isProcessing, submitAnswer } = useAnswerFlow({
        correctDelay: 2000,
        wrongDelay: 1000,
        onCorrectComplete: () => {
            setShowBubble(false);
            setShowConfetti(false);
            setMascotEmotion('idle');
            setShowStars(false);

            // Use ref to get the freshest session state after the delay
            const currentSession = sessionRef.current;
            if (currentSession.isGameOver) return; // Handled by effect

            // Check completion for Standard Mode (Fixed Length)
            // Arcade modes continue until Game Over
            if (currentSession.mode === 'STANDARD' && currentSession.count >= SESSION_LENGTH) {
                playSound('levelUp');
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
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
                // For arcade modes (Zen, Time Attack, Survival): check daily challenge after every correct answer
                // Zen mode is endless, so we must check here — not at session end
                checkDailyChallenge(currentSession.correct);
                nextProblem(); // Generate next problem WITHOUT resetting state
            }
        },
        onWrongComplete: () => {
            setShowBubble(false);
            setMascotEmotion('idle');
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

            playSound('levelUp'); // Or 'gameOver' sound if we had one
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
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
    }, [session, showSummary, onComplete, playSound, isProcessing, updateArcadeBestScore]);

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
        initSession(mode);
    };

    const handleAnswer = (isCorrect: boolean) => {
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
            if (profile?.settings?.soundGarden) {
                playMelodyNote();
            } else {
                playSound('correct');
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
            // Toast mainly for Standard/Zen. Arcade has the HUD.
            if (session.mode === 'STANDARD') {
                setScoreToast({ message: t('feedback.correct') });
            }
            setFeedback(null);

            // Dynamic Mascot Reactions
            const phrases = t('feedback.phrases', { returnObjects: true }) as string[];
            const phrase = Array.isArray(phrases) ? phrases[Math.floor(Math.random() * phrases.length)] : "Great!";

            setMascotEmotion('excited');
            setMascotMessage(phrase);
            setShowBubble(true);
            setShowStars(true);
            setShowConfetti(true);

            if (incrementStreak) incrementStreak();
        } else {
            if (profile?.settings?.soundGarden) {
                playWrongMelody();
            } else {
                playSound('wrong');
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
            const evalResult = evaluateAnswer(problem, 'WRONG');
            setFeedback(t(evalResult.message || 'feedback.defaultError'));

            if (resetStreak) resetStreak();

            const phrases = t('feedback.gentle', { returnObjects: true }) as string[];
            const phrase = Array.isArray(phrases) ? phrases[Math.floor(Math.random() * phrases.length)] : "Try again";

            setMascotEmotion('encourage');
            setMascotMessage(phrase);
            setShowBubble(true);
        }
    };

    const handleRestart = () => {
        setIsMenuOpen(false);
        sessionStartTime.current = Date.now();
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

            {/* Game Content - Only render if initialized (to prevent flash of empty state behind selector) */}
            {hasInitializedRef.current && problem && (
                <>
                    <PracticeFeedback
                        mascotEmotion={mascotEmotion}
                        mascotMessage={mascotMessage}
                        showBubble={showBubble}
                        showStars={showStars}
                        showConfetti={showConfetti}
                        onStarsComplete={() => setShowStars(false)}
                    />

                    <ScoreToast
                        message={scoreToast ? scoreToast.message : ''}
                        isVisible={!!scoreToast}
                        onComplete={() => setScoreToast(null)}
                    />

                    {/* Header with Settings - Increased Z-index to 30 to stay above MathCard (z-10) */}
                    <div className="w-full max-w-md z-30 relative mb-2">
                        <PracticeHeader
                            targetLevel={targetLevel}
                            onPause={() => setIsMenuOpen(true)}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                        />
                    </div>

                    {/* HUD Switcher */}
                    {session.mode === 'STANDARD' ? (
                        <SessionProgressBar current={session.count} total={SESSION_LENGTH} />
                    ) : (
                        <ArcadeHUD
                            mode={session.mode}
                            score={session.score}
                            lives={session.lives}
                            timeLeft={session.timeLeft}
                            combo={session.combo}
                        />
                    )}

                    <div className="w-full max-w-md z-10 relative mt-4">
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
                starsGained={session.correct > 7 ? 3 : session.correct > 4 ? 2 : 1}
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
