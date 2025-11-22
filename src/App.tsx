import { useState, useEffect } from 'react'
import { Settings, Pause, Volume2, VolumeX } from 'lucide-react'
import { MathCard } from './components/MathCard'
import { MyWorld } from './components/MyWorld'
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
import { generateProblemForLevel, calculateRewards } from './engines/MathEngine'
import { useSound } from './hooks/useSound'
import type { Problem } from './lib/gameLogic'
import { WorldMap } from './components/WorldMap'

import { Mascot, type MascotEmotion } from './components/mascot/Mascot'
import { SpeechBubble } from './components/mascot/SpeechBubble'

const ENCOURAGING_PHRASES = [
  "!מעולה",
  "!כל הכבוד",
  "!אלוף",
  "!מדהים",
  "!יופי",
  "!נהדר"
];

const GENTLE_PHRASES = [
  "בוא ננסה שוב",
  "כמעט...",
  "לא נורא, נסה שוב",
  "עוד ניסיון אחד"
];

const SESSION_LENGTH = 10;

const GameScreen = ({ onExit }: { onExit: () => void }) => {
  const { profile, addXP } = useProfile();
  const { playSound, isMuted, toggleMute } = useSound();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [showStars, setShowStars] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    if (profile) {
      setProblem(generateProblemForLevel(profile.currentLevel));
      // Initial greeting
      setMascotEmotion('happy');
      setMascotMessage(`היי ${profile.name}! מוכן לשחק?`);
      setShowBubble(true);
      setTimeout(() => {
        setShowBubble(false);
        setMascotEmotion('idle');
      }, 3000);
    }
  }, [profile]);

  const handleAnswer = (isCorrect: boolean) => {
    if (!profile || !problem) return;

    setSessionAttempts(prev => prev + 1);

    const xpChange = calculateRewards(profile.currentLevel, isCorrect, profile.streak);

    if (isCorrect) {
      playSound('correct');
      setSessionCorrect(prev => prev + 1);
      setSessionXP(prev => prev + xpChange);

      const nextSessionCount = sessionCount + 1;
      setSessionCount(nextSessionCount); // Only advance on correct

      const phrase = ENCOURAGING_PHRASES[Math.floor(Math.random() * ENCOURAGING_PHRASES.length)];

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

      const phrase = GENTLE_PHRASES[Math.floor(Math.random() * GENTLE_PHRASES.length)];

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

  if (!profile || !problem) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <MyWorld score={profile.xp} streak={profile.streak} level={profile.currentLevel} />
      {showStars && <FlyingStars onComplete={() => setShowStars(false)} />}
      {showConfetti && <Confetti />}

      {/* Header with Progress, Settings, and Sound */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-3 bg-white rounded-full shadow-lg hover:bg-slate-50 transition-all"
            aria-label="Pause"
          >
            <Pause className="text-slate-600" size={24} />
          </button>

          <button
            onClick={toggleMute}
            className="p-3 bg-white rounded-full shadow-lg hover:bg-slate-50 transition-all"
            aria-label="Mute"
          >
            {isMuted ? <VolumeX className="text-slate-400" size={24} /> : <Volume2 className="text-slate-600" size={24} />}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-primary">הרפתקאות חשבון</h1>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 bg-white rounded-full shadow-md text-slate-600 hover:text-primary transition-colors"
        >
          <Settings size={24} />
        </button>
      </div>

      <SessionProgressBar current={sessionCount} total={SESSION_LENGTH} />

      {/* Hide Global Progress Bar if we have Session Bar? Or keep both? 
          Let's keep Global (XP) but maybe make it smaller or move it?
          For now, keeping both as per design.
      */}
      <ProgressBar xp={profile.xp} level={profile.currentLevel} />

      {problem && (
        <div className="w-full max-w-md z-10 mt-16 relative">
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
      />

      <SessionSummary
        isOpen={showSummary}
        xpGained={sessionXP}
        correctCount={sessionCorrect}
        totalCount={sessionAttempts} // Use actual attempts for accuracy
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
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
      setView('select');
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

export default App;
