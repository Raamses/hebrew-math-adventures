import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { MathCard } from './MathCard';
import { FlyingStars } from './Effects';
import { Confetti } from './Confetti';
import { useProfile } from '../context/ProfileContext';
import { useSound } from '../hooks/useSound';
import { MathModule } from '../engines/MathModule';
import { INITIAL_CAPABILITY_PROFILE } from '../types/progress';
import type { Problem } from '../lib/gameLogic';
import { getZoneForLevel } from '../lib/worldConfig';
import { Mascot, type MascotEmotion } from './mascot/Mascot';
import { SpeechBubble } from './mascot/SpeechBubble';
import { ScoreToast } from './ScoreToast';
import { SessionProgressBar } from './SessionProgressBar';
import { ProgressBar } from './ProgressBar';
import { GameMenuModal } from './GameMenuModal';
import { SessionSummary } from './SessionSummary';
import { SettingsModal } from './SettingsModal';
import { SettingsMenu } from './SettingsMenu';
import { useAnswerFlow } from '../hooks/useAnswerFlow';
import type { BaseProblemConfig } from '../engines/ProblemFactory';

const SESSION_LENGTH = 10;

interface PracticeModeProps {
    targetLevel: number;
    onExit: () => void;
    problemConfig?: BaseProblemConfig;
    onComplete?: (success: boolean) => void;
}

// --- Session State Reducer ---

interface SessionState {
    count: number;
    correct: number;
    attempts: number;
    xpTotal: number;
}

type SessionAction =
    | { type: 'RESET' }
    | { type: 'ANSWER', isCorrect: boolean, xp: number };

const initialSessionState: SessionState = {
    count: 0,
    correct: 0,
    attempts: 0,
    xpTotal: 0
};

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
    switch (action.type) {
        case 'RESET':
            return initialSessionState;
        case 'ANSWER':
            return {
                ...state,
                count: action.isCorrect ? state.count + 1 : state.count, // Only advance on correct? Original logic advanced on correct complete. Re-checking flow.
                // Wait, original logic: nextSessionCount = sessionCount + 1 on CORRECT complete.
                // handleAnswer incremented sessionCount on CORRECT.
                correct: action.isCorrect ? state.correct + 1 : state.correct,
                attempts: state.attempts + 1,
                xpTotal: state.xpTotal + action.xp
            };
        default:
            return state;
    }
}

export const PracticeMode: React.FC<PracticeModeProps> = ({ targetLevel, onExit, problemConfig, onComplete }) => {
    const { t, i18n } = useTranslation();
    const { profile, addXP } = useProfile();
    const { playSound, isMuted, toggleMute } = useSound();

    // Module Instance
    const mathModule = useMemo(() => new MathModule(), []);

    // Game State
    const [problem, setProblem] = useState<Problem | null>(null);
    const [showStars, setShowStars] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [scoreToast, setScoreToast] = useState<{ points: number } | null>(null);

    // Mascot State
    const [mascotEmotion, setMascotEmotion] = useState<MascotEmotion>('idle');
    const [mascotMessage, setMascotMessage] = useState<string>('');
    const [showBubble, setShowBubble] = useState(false);

    // Session State
    const [session, dispatch] = useReducer(sessionReducer, initialSessionState);
    const [showSummary, setShowSummary] = useState(false);

    const generateNext = () => {
        if (!profile) return null;
        const userCaps = {
            ...(profile.capabilities || INITIAL_CAPABILITY_PROFILE),
            estimatedLevel: profile.currentLevel,
            streak: profile.streak // Pass current streak to engine
        };
        // Merge problemConfig with the generic difficulty params
        return mathModule.generateProblem(userCaps, {
            difficulty: targetLevel,
            ...problemConfig
        });
    };

    // Track session state in ref for callbacks to avoid stale closures
    const sessionRef = React.useRef(session);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    // Answer Flow Hook
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

            // Check completion (we added +1 in reducer dispatch earlier)
            if (currentSession.count >= SESSION_LENGTH) {
                playSound('levelUp');
                setShowSummary(true);
                if (onComplete) onComplete(true);
            } else {
                const nextProb = generateNext();
                if (nextProb) setProblem(nextProb);
            }
        },
        onWrongComplete: () => {
            setShowBubble(false);
            setMascotEmotion('idle');
        }
    });

    useEffect(() => {
        if (!problem && profile) {
            const next = generateNext();
            if (next) setProblem(next);

            // Only show greeting if it's the very first load of the component
            if (session.count === 0 && session.attempts === 0) {
                setMascotEmotion('happy');
                setMascotMessage(t('app.greeting', { name: profile.name }));
                setShowBubble(true);
                setTimeout(() => {
                    setShowBubble(false);
                    setMascotEmotion('idle');
                }, 3000);
            }
        }
    }, [targetLevel, profile, problem, t]); // Removed session deps to avoid loops, handled logically

    const handleAnswer = (isCorrect: boolean) => {
        if (!profile || !problem || isProcessing) return;

        submitAnswer(isCorrect);

        // Evaluate
        const feedback = mathModule.evaluate(problem, isCorrect ? problem.answer : 'WRONG', profile);
        const xpChange = feedback.xpGained;

        // Dispatch Session Update
        // Note: We dispatch 'ANSWER' which increments count IF correct.
        dispatch({ type: 'ANSWER', isCorrect, xp: xpChange });

        if (isCorrect) {
            playSound('correct');
            setScoreToast({ points: xpChange });

            const phrases = t('feedback.phrases', { returnObjects: true }) as string[];
            const phrase = Array.isArray(phrases) ? phrases[Math.floor(Math.random() * phrases.length)] : "Great!";

            setMascotEmotion('excited');
            setMascotMessage(phrase);
            setShowBubble(true);
            setShowStars(true);
            setShowConfetti(true);

            addXP(xpChange);
        } else {
            playSound('wrong');
            addXP(xpChange);

            const phrases = t('feedback.gentle', { returnObjects: true }) as string[];
            const phrase = Array.isArray(phrases) ? phrases[Math.floor(Math.random() * phrases.length)] : "Try again";

            setMascotEmotion('encourage');
            setMascotMessage(phrase);
            setShowBubble(true);
        }
    };

    const handleRestart = () => {
        dispatch({ type: 'RESET' });
        setIsMenuOpen(false);
        const next = generateNext();
        if (next) setProblem(next);
    };

    const handlePlayAgain = () => {
        dispatch({ type: 'RESET' });
        setShowSummary(false);
        const next = generateNext();
        if (next) setProblem(next);
    };

    if (!profile || !problem) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center p-4 relative overflow-hidden" dir={i18n.dir()}>
            {showStars && <FlyingStars onComplete={() => setShowStars(false)} />}
            {showConfetti && <Confetti />}

            <ScoreToast
                points={scoreToast ? scoreToast.points : 0}
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
                        // Use targetLevel here to show "Level X" correctly even if replaying
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
            <ProgressBar xp={profile.xp} level={profile.currentLevel} />

            <div className="w-full max-w-md z-10 relative">
                <MathCard
                    problem={problem}
                    onAnswer={handleAnswer}
                    feedback={null}
                    isProcessing={isProcessing}
                />

                <div className="relative mt-4 ml-auto md:absolute md:-right-32 md:bottom-0 z-20 pointer-events-none">
                    <div className="relative">
                        <SpeechBubble text={mascotMessage} isVisible={showBubble} />
                        <Mascot
                            character={profile.mascot || 'owl'}
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
                xpGained={session.xpTotal}
                correctCount={session.correct}
                totalCount={session.attempts}
                totalScore={profile.totalScore || 0}
                onPlayAgain={handlePlayAgain}
                onExit={onExit}
                targetLevel={targetLevel}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};

