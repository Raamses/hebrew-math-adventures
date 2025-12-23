import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Zap } from 'lucide-react'
import { MathCard } from './components/MathCard'
// MyWorld removed
import { FlyingStars } from './components/Effects'
import { Confetti } from './components/Confetti'
import { ProfileProvider, useProfile } from './context/ProfileContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProfileSelector } from './components/onboarding/ProfileSelector'
import { ParentGate } from './components/parent/ParentGate'
import { ParentDashboard } from './components/parent/ParentDashboard'
import { ProgressBar } from './components/ProgressBar'
import { GameMenuModal } from './components/GameMenuModal'
import { SessionProgressBar } from './components/SessionProgressBar'
import { SessionSummary } from './components/SessionSummary'
import { SettingsModal } from './components/SettingsModal'
import { SettingsMenu } from './components/SettingsMenu'
import { generateProblemForLevel, calculateRewards } from './engines/MathEngine'
import { useSound } from './hooks/useSound'
import type { Problem } from './lib/gameLogic'
import { getZoneForLevel } from './lib/worldConfig'
import { WorldMap } from './components/WorldMap'

import { Mascot, type MascotEmotion } from './components/mascot/Mascot'
import { SpeechBubble } from './components/mascot/SpeechBubble'

const SESSION_LENGTH = 10;

import { ScoreToast } from './components/ScoreToast'

const GameScreen = ({ onExit }: { onExit: () => void }) => {
  const { t, i18n } = useTranslation();
  const { profile, addXP } = useProfile();
  const { playSound, isMuted, toggleMute } = useSound();
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
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (profile && !problem) {
      setProblem(generateProblemForLevel(profile.currentLevel));
      // Initial greeting
      setMascotEmotion('happy');
      setMascotMessage(t('app.greeting', { name: profile.name }));
      setShowBubble(true);
      setTimeout(() => {
        setShowBubble(false);
        setMascotEmotion('idle');
      }, 3000);
    }
  }, [profile, problem, t]);

  const handleAnswer = (isCorrect: boolean) => {
    if (!profile || !problem) return;

    setSessionAttempts(prev => prev + 1);

    const xpChange = calculateRewards(profile.currentLevel, isCorrect, profile.streak);

    if (isCorrect) {
      playSound('correct');
      setSessionCorrect(prev => prev + 1);
      setSessionXP(prev => prev + xpChange);

      // Trigger Score Toast
      setScoreToast({ points: xpChange });

      const nextSessionCount = sessionCount + 1;
      setSessionCount(nextSessionCount); // Only advance on correct

      const phrases = t('feedback.phrases', { returnObjects: true }) as string[];
      const phrase = Array.isArray(phrases) ? phrases[Math.floor(Math.random() * phrases.length)] : "Great!";

      // Mascot Reaction
      setMascotEmotion('excited');
      setMascotMessage(phrase);
      setShowBubble(true);

      setShowStars(true);
      setShowConfetti(true);

      addXP(xpChange);

      setTimeout(() => {
        setShowBubble(false);
        setShowConfetti(false);
        setMascotEmotion('idle');

        if (nextSessionCount >= SESSION_LENGTH) {
          playSound('levelUp'); // Or a specific session complete sound
          setShowSummary(true);
        } else {
          setProblem(generateProblemForLevel(profile.currentLevel));
        }
      }, 2000);

      setTimeout(() => setShowStars(false), 1500);

    } else {
      playSound('wrong');
      addXP(xpChange);

      const phrases = t('feedback.gentle', { returnObjects: true }) as string[];
      const phrase = Array.isArray(phrases) ? phrases[Math.floor(Math.random() * phrases.length)] : "Try again";

      // Mascot Reaction
      setMascotEmotion('encourage'); // New emotion!
      setMascotMessage(phrase);
      setShowBubble(true);

      setTimeout(() => {
        setShowBubble(false);
        setMascotEmotion('idle');
      }, 2000);
    }
  };

  const handleRestart = () => {
    if (!profile) return;
    setSessionCount(0);
    setSessionCorrect(0);
    setSessionAttempts(0);
    setSessionXP(0);
    setIsMenuOpen(false);
    setProblem(generateProblemForLevel(profile.currentLevel));
  };

  const handlePlayAgain = () => {
    if (!profile) return;
    // Reset Session Stats but keep Profile XP/Streak
    setSessionCount(0);
    setSessionCorrect(0);
    setSessionAttempts(0);
    setSessionXP(0);
    setShowSummary(false);
    setProblem(generateProblemForLevel(profile.currentLevel));
  };

  const handleExit = () => {
    if (!profile) return;
    onExit();
  };



  // Effect to update document direction for scrollbars etc
  useEffect(() => {
    document.documentElement.dir = i18n.dir();
  }, [i18n.language]);

  if (!profile || !problem) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center p-4 relative overflow-hidden" dir={i18n.dir()}>
      {/* MyWorld removed */}
      {showStars && <FlyingStars onComplete={() => setShowStars(false)} />}
      {showConfetti && <Confetti />}

      <ScoreToast
        points={scoreToast ? scoreToast.points : 0}
        isVisible={!!scoreToast}
        onComplete={() => setScoreToast(null)}
      />

      {/* Header with Progress, Settings, and Sound */}
      <div className="w-full max-w-md flex flex-col items-center gap-2 z-10 mb-2">

        {/* Top Bar: Controls & Title */}
        <div className="w-full flex items-center justify-between relative h-12">
          {/* Left: Streak (moved here) */}
          <div
            className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-orange-100 z-10 cursor-help transition-transform hover:scale-105"
            title={t('app.streakTooltip')}
          >
            <Zap size={16} className="text-orange-500 fill-orange-500" />
            <span className="font-bold text-slate-700 text-sm">{profile.streak}</span>
          </div>

          {/* Center: Title */}
          <h1 className="text-2xl font-bold text-primary absolute left-1/2 -translate-x-1/2 whitespace-nowrap drop-shadow-sm">
            {t('app.title')}
          </h1>

          {/* Right: Settings Menu */}
          <div className="z-20">
            <SettingsMenu
              onPause={() => setIsMenuOpen(true)}
              onToggleMute={toggleMute}
              isMuted={isMuted}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        </div>

        {/* Zone Badge (Space Filler) */}
        <div className="bg-emerald-100/80 backdrop-blur-sm px-4 py-1 rounded-full border border-emerald-200 shadow-sm flex items-center gap-2">
          {(() => {
            const zone = getZoneForLevel(profile.currentLevel);
            const ZoneIcon = zone?.icon || Zap; // Fallback
            return (
              <>
                <ZoneIcon size={14} className="text-emerald-700" />
                <span className="text-xs font-bold text-emerald-800">
                  {t('zones.level')} {profile.currentLevel} • {zone ? t(zone.name) : t('zones.fallback')}
                </span>
              </>
            );
          })()}
        </div>

      </div>

      <SessionProgressBar current={sessionCount} total={SESSION_LENGTH} />

      {/* Hide Global Progress Bar if we have Session Bar? Or keep both? 
          Let's keep Global (XP) but maybe make it smaller or move it?
          For now, keeping both as per design.
      */}
      <ProgressBar xp={profile.xp} level={profile.currentLevel} />

      {problem && (
        <div className="w-full max-w-md z-10 relative">
          <MathCard
            problem={problem}
            onAnswer={handleAnswer}
            feedback={null} // Feedback is now handled by the mascot
          />

          {/* Mascot Positioned relative to card or screen */}
          <div className="absolute -bottom-20 -right-20 md:-right-32 md:bottom-0 z-20 pointer-events-none">
            <div className="relative">
              <SpeechBubble text={mascotMessage} isVisible={showBubble} />
              <Mascot
                character={profile.mascot || 'owl'}
                emotion={mascotEmotion}
              />
            </div>
          </div>
        </div>
      )}

      <GameMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onRestart={handleRestart}
        onExit={handleExit}
        onSettings={() => {
          setIsMenuOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      <SessionSummary
        isOpen={showSummary}
        xpGained={sessionXP}
        correctCount={sessionCorrect}
        totalCount={sessionAttempts} // Use actual attempts for accuracy
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
        totalScore={profile.totalScore || 0}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};




const AppContent = () => {
  const { profile, logout } = useProfile();
  const [view, setView] = useState<'select' | 'map' | 'game' | 'parent'>('select');
  const [showParentGate, setShowParentGate] = useState(false);

  // Effect to sync view with profile state
  useEffect(() => {
    if (profile) {
      // If we have a profile, we go to map (unless we're already in game)
      if (view === 'select') {
        setView('map');
      }
    } else {
      // No profile = selection screen
      if (view !== 'parent') {
        setView('select');
      }
    }
  }, [profile, view]);

  const handleZoneSelect = () => {
    setView('game');
  };

  const handleGameExit = () => {
    setView('map');
  };

  const handleLogout = () => {
    logout();
    setView('select');
  };

  if (view === 'parent') {
    return <ParentDashboard onExit={() => setView('select')} />;
  }

  if (!profile) {
    return (
      <>
        <ProfileSelector onParentAccess={() => setShowParentGate(true)} />
        {showParentGate && (
          <ParentGate
            onSuccess={() => {
              setShowParentGate(false);
              setView('parent');
            }}
            onCancel={() => setShowParentGate(false)}
          />
        )}
      </>
    );
  }

  if (view === 'map') {
    return (
      <WorldMap
        currentLevel={profile.currentLevel}
        onZoneSelect={handleZoneSelect}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <GameScreen
      onExit={handleGameExit}
    />
  );
};



const App = () => {
  return (
    <ProfileProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ProfileProvider>
  );
}

export default App;
