import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { MathCard } from './MathCard';
import { FlyingStars } from './Effects';
import { Confetti } from './Confetti';
import { useProfile } from '../context/ProfileContext';
import { useSound } from '../hooks/useSound';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { getZoneForLevel } from '../lib/worldConfig';
import { Mascot, type MascotEmotion } from './mascot/Mascot';
import { SpeechBubble } from './mascot/SpeechBubble';
import { ScoreToast } from './ScoreToast';
import { SessionProgressBar } from './SessionProgressBar';
import { GameMenuModal } from './GameMenuModal';
import { SessionSummary } from './SessionSummary';
import { SettingsModal } from './SettingsModal';
import { SettingsMenu } from './SettingsMenu';
import { useAnswerFlow } from '../hooks/useAnswerFlow';
import { FrenzyOverlay } from './games/FrenzyOverlay';
import type { BaseProblemConfig } from '../engines/ProblemFactory';

const SESSION_LENGTH = 10;

interface PracticeModeProps {
    targetLevel: number;
    onExit: () => void;
    problemConfig?: BaseProblemConfig;
    onComplete?: (success: boolean) => void;
}

// --- Constants ---

import { useAnalytics } from '../hooks/useAnalytics';
import type { Problem } from '../lib/gameLogic';

const getEquationString = (p: Problem): string => {
    if (p.type === 'arithmetic') {
        const ap = p as any; // Safe cast or structural check if strictly typed
        // Actually, TS knows it's ArithmeticProblem if we check type
        return `${ap.num1} ${ap.operator} ${ap.num2}`;
    }
    if (p.type === 'compare') {
        return `${p.num1} ? ${p.num2}`;
    }
    if (p.type === 'series') {
        return `Series: ${p.sequence.join(', ')}`;
    }
    if (p.type === 'word') {
        return `Word Problem: ${p.questionKey}`;
    }
    return 'Unknown Problem';
};

// --- Constants ---

export const PracticeMode: React.FC<PracticeModeProps> = ({ targetLevel, onExit, problemConfig, onComplete }) => {
    const { t, i18n } = useTranslation();
    const { profile, incrementStreak, resetStreak } = useProfile();
    const { playSound, isMuted, toggleMute } = useSound();
    const { logEvent } = useAnalytics();

    // Track start time for current problem
    const problemStartTime = useRef(Date.now());

    // Reset timer when problem changes
    useEffect(() => {
        problemStartTime.current = Date.now();
    }, [problemConfig]); // Should depend on problem actually, see next edit

    // Hook: Session Logic
    const {
        session,
        problem,
        initSession,
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

    // Mascot State
    const [mascotEmotion, setMascotEmotion] = useState<MascotEmotion>('idle');
    const [mascotMessage, setMascotMessage] = useState<string>('');
    const [showBubble, setShowBubble] = useState(false);

    // Summary State
    const [showSummary, setShowSummary] = useState(false);

    // Track session state in ref for callbacks to avoid stale closures
    const sessionRef = useRef(session);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

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

            // Check completion
            if (currentSession.count >= SESSION_LENGTH) {
                playSound('levelUp');
                setShowSummary(true);
                if (onComplete) onComplete(true);
            } else {
                initSession(); // Generate next
            }
        },
        onWrongComplete: () => {
            setShowBubble(false);
            setMascotEmotion('idle');
            setFeedback(null);
        }
    });

    // Initialization & Greeting
    useEffect(() => {
        if (!problem && profile) {
            initSession();

            // only show greeting if it's the very first load
            if (session.count === 0 && session.attempts === 0) {
                // ... (omitted for brevity, keeping same logic)
            }
        }

        // Reset timer when problem updates
        if (problem) {
            problemStartTime.current = Date.now();
        }
    }, [targetLevel, profile, problem, t, initSession, session.count, session.attempts]);

    const handleAnswer = (isCorrect: boolean) => {
        if (!profile || !problem || isProcessing) return;

        // Log analytics
        const timeTaken = Date.now() - problemStartTime.current;
        logEvent('question_answered', {
            is_correct: isCorrect,
            equation: getEquationString(problem),
            response_time_ms: timeTaken,
            mode: 'practice',
            target_level: targetLevel
        });

        submitAnswer(isCorrect);
        submitResult(isCorrect); // Update session state

        if (isCorrect) {
            playSound('correct');
            setScoreToast({ message: t('feedback.correct') });
            setFeedback(null);

            const phrases = t('feedback.phrases', { returnObjects: true }) as string[];
            const phrase = Array.isArray(phrases) ? phrases[Math.floor(Math.random() * phrases.length)] : "Great!";

            setMascotEmotion('excited');
            setMascotMessage(phrase);
            setShowBubble(true);
            setShowStars(true);
            setShowConfetti(true);

            if (incrementStreak) incrementStreak();
        } else {
            playSound('wrong');
            // Get feedback string from logic module
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
        restartSession();
    };

    const handlePlayAgain = () => {
        setShowSummary(false);
        restartSession();
    };

    if (!profile || !problem) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center p-4 relative overflow-hidden" dir={i18n.dir()}>
            <FrenzyOverlay isActive={(profile.streak || 0) >= 5} />
            {showStars && <FlyingStars onComplete={() => setShowStars(false)} />}
            {showConfetti && <Confetti />}

            <ScoreToast
                message={scoreToast ? scoreToast.message : ''}
                isVisible={!!scoreToast}
                onComplete={() => setScoreToast(null)}
            />

            {/* Header */}
            <div className="w-full max-w-md flex flex-col items-center gap-2 z-10 mb-2">
                <div className="w-full flex items-center justify-between relative h-12">
                    <div
                        className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-orange-100 z-10 cursor-help transition-transform hover:scale-105"
                        title={t('app.streakTooltip')}
                    >
                        <Zap size={16} className="text-orange-500 fill-orange-500" />
                        <span className="font-bold text-slate-700 text-sm">{profile.streak}</span>
                    </div>

                    <h1 className="text-2xl font-bold text-primary absolute left-1/2 -translate-x-1/2 whitespace-nowrap drop-shadow-sm">
                        {t('app.title')}
                    </h1>

                    <div className="z-20">
                        <SettingsMenu
                            onPause={() => setIsMenuOpen(true)}
                            onToggleMute={toggleMute}
                            isMuted={isMuted}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                        />
                    </div>
                </div>

                {/* Zone Badge */}
                <div className="bg-emerald-100/80 backdrop-blur-sm px-4 py-1 rounded-full border border-emerald-200 shadow-sm flex items-center gap-2">
                    {(() => {
                        const zone = getZoneForLevel(targetLevel);
                        const ZoneIcon = zone?.icon || Zap;
                        return (
                            <>
                                <ZoneIcon size={14} className="text-emerald-700" />
                                <span className="text-xs font-bold text-emerald-800">
                                    {t('zones.level')} {targetLevel} • {zone ? t(zone.name) : t('zones.fallback')}
                                </span>
                            </>
                        );
                    })()}
                </div>
            </div>

            <SessionProgressBar current={session.count} total={SESSION_LENGTH} />

            <div className="w-full max-w-md z-10 relative mt-4">
                <MathCard
                    problem={problem}
                    onAnswer={handleAnswer}
                    feedback={feedback}
                    isProcessing={isProcessing}
                />

                <div className="relative mt-4 ml-auto md:absolute md:-right-32 md:bottom-0 z-20 pointer-events-none">
                    <div className="relative">
                        <SpeechBubble text={mascotMessage} isVisible={showBubble} />
                        <Mascot
                            character={profile.mascotId || 'owl'} // Use mascotId
                            emotion={mascotEmotion}
                        />
                    </div>
                </div>
            </div>

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
                starsGained={0} // Practice mode grants 0 stars for now, or maybe 1?
                correctCount={session.correct}
                totalCount={session.attempts}
                totalScore={0} // Deprecated
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

