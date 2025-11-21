import { useState, useEffect } from 'react'
import { ChevronLeft, Pause } from 'lucide-react'
import { MathCard } from './components/MathCard'
import { MyWorld } from './components/MyWorld'
import { FlyingStars } from './components/Effects'
import { ProfileProvider, useProfile } from './context/ProfileContext'
import { ProfileSetup } from './components/ProfileSetup'
import { ProgressBar } from './components/ProgressBar'
import { GameMenuModal } from './components/GameMenuModal'
import { generateProblemForLevel, calculateRewards } from './engines/MathEngine'
import { QuestionGenerator } from './engines/QuestionGenerator'
import { getRandomPhrase } from './lib/gameLogic'
import type { Problem } from './lib/gameLogic'

const GameScreen = () => {
  const { profile, addXP, setProfile } = useProfile();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showStars, setShowStars] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setProblem(generateProblemForLevel(profile.currentLevel));
    }
  }, [profile?.currentLevel]); // Re-generate when level changes

  const handleAnswer = (isCorrect: boolean) => {
    if (!profile || !problem) return;

    const xpChange = calculateRewards(profile.currentLevel, isCorrect, profile.streak);

    if (isCorrect) {
      const phrase = getRandomPhrase();
      setFeedback(phrase);
      setShowStars(true);

      addXP(xpChange);

      setTimeout(() => {
        setFeedback(null);
        setProblem(generateProblemForLevel(profile.currentLevel));
      }, 2000);
    } else {
      setFeedback("!נסה שוב");
      // Penalty is applied via addXP (which also resets streak for negative values)
      addXP(xpChange);
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const handleRestart = () => {
    if (!profile) return;

    // Reset question generator
    QuestionGenerator.getInstance().reset();

    // Reset profile session (XP and streak to 0, keep level)
    setProfile({
      ...profile,
      xp: 0,
      streak: 0
    });

    // Generate new problem
    setProblem(generateProblemForLevel(profile.currentLevel));
    setIsMenuOpen(false);
  };

  const handleExit = () => {
    if (!profile) return;

    // XP is already saved via ProfileContext
    // Navigate to setup by clearing profile (or create a Dashboard component)
    setProfile(null);
  };

  if (!profile) return null;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 pt-8 relative overflow-hidden">
      {showStars && <FlyingStars onComplete={() => setShowStars(false)} />}

      <div className="w-full max-w-md flex justify-between items-center mb-4 px-2">
        {/* Pause button - Top-Left in RTL (logical end) */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="p-2 bg-white rounded-full shadow-md text-slate-600 hover:text-primary transition-colors"
        >
          <Pause size={24} />
        </button>

        <h1 className="text-2xl font-bold text-primary">הרפתקאות חשבון</h1>

        <button className="p-2 bg-white rounded-full shadow-md text-slate-600 hover:text-primary transition-colors">
          <ChevronLeft size={24} />
        </button>
      </div>

      <ProgressBar xp={profile.xp} level={profile.currentLevel} />
      <MyWorld score={profile.xp} streak={profile.streak} level={profile.currentLevel} />

      {problem && (
        <MathCard
          problem={problem}
          onAnswer={handleAnswer}
          feedback={feedback}
        />
      )}

      <GameMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onRestart={handleRestart}
        onExit={handleExit}
      />
    </div>
  );
};

function App() {
  return (
    <ProfileProvider>
      <AppContent />
    </ProfileProvider>
  );
}

const AppContent = () => {
  const { profile } = useProfile();
  return profile ? <GameScreen /> : <ProfileSetup />;
};

export default App;
