import { useState, useEffect } from 'react'
import { ChevronLeft, Pause, Volume2, VolumeX } from 'lucide-react'
import { MathCard } from './components/MathCard'
import { MyWorld } from './components/MyWorld'
import { FlyingStars } from './components/Effects'
import { Confetti } from './components/Confetti'
import { ProfileProvider, useProfile } from './context/ProfileContext'
import { ProfileSetup } from './components/ProfileSetup'
import { ProgressBar } from './components/ProgressBar'
import { GameMenuModal } from './components/GameMenuModal'
import { SessionProgressBar } from './components/SessionProgressBar'
import { SessionSummary } from './components/SessionSummary'
import { generateProblemForLevel, calculateRewards } from './engines/MathEngine'
import { QuestionGenerator } from './engines/QuestionGenerator'
import { useSound } from './hooks/useSound'
import type { Problem } from './lib/gameLogic'

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

const GameScreen = () => {
  const { profile, addXP, setProfile } = useProfile();
  const { playSound, isMuted, toggleMute } = useSound();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showStars, setShowStars] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Session State
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (profile) {
      setProblem(generateProblemForLevel(profile.currentLevel));
    }
  }, [profile?.currentLevel]); // Re-generate when level changes

  const handleAnswer = (isCorrect: boolean) => {
    if (!profile || !problem) return;

    const xpChange = calculateRewards(profile.currentLevel, isCorrect, profile.streak);

    if (isCorrect) {
      playSound('correct');
      setSessionCorrect(prev => prev + 1);
      setSessionXP(prev => prev + xpChange);

      const nextSessionCount = sessionCount + 1;
      setSessionCount(nextSessionCount); // Only advance on correct

      const phrase = ENCOURAGING_PHRASES[Math.floor(Math.random() * ENCOURAGING_PHRASES.length)];
      setFeedback(phrase);
      setShowStars(true);
      setShowConfetti(true);

      addXP(xpChange);

      setTimeout(() => {
        setFeedback(null);
        setShowConfetti(false);

        if (nextSessionCount >= SESSION_LENGTH) {
          playSound('levelUp'); // Or a specific session complete sound
          setShowSummary(true);
        } else {
          setProblem(generateProblemForLevel(profile.currentLevel));
        }
      }, 2000);
    } else {
      playSound('wrong');
      const phrase = GENTLE_PHRASES[Math.floor(Math.random() * GENTLE_PHRASES.length)];
      setFeedback(phrase);
      addXP(xpChange); // Penalty
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const handleRestart = () => {
    if (!profile) return;

    QuestionGenerator.getInstance().reset();

    setProfile({
      ...profile,
      xp: 0,
      streak: 0
    });

    // Reset Session
    setSessionCount(0);
    setSessionCorrect(0);
    setSessionXP(0);
    setShowSummary(false);

    setProblem(generateProblemForLevel(profile.currentLevel));
    setIsMenuOpen(false);
  };

  const handlePlayAgain = () => {
    // Reset Session Stats but keep Profile XP/Streak
    setSessionCount(0);
    setSessionCorrect(0);
    setSessionXP(0);
    setShowSummary(false);
    setProblem(generateProblemForLevel(profile.currentLevel));
  };

  const handleExit = () => {
    if (!profile) return;
    setProfile(null);
  };

  if (!profile) return null;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 pt-8 relative overflow-hidden">
      {showStars && <FlyingStars onComplete={() => setShowStars(false)} />}
      {showConfetti && <Confetti />}

      <div className="w-full max-w-md flex justify-between items-center mb-4 px-2">
        <div className="flex gap-2">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 bg-white rounded-full shadow-md text-slate-600 hover:text-primary transition-colors"
          >
            <Pause size={24} />
          </button>

          <button
            onClick={toggleMute}
            className="p-2 bg-white rounded-full shadow-md text-slate-600 hover:text-primary transition-colors"
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-primary">הרפתקאות חשבון</h1>

        <button className="p-2 bg-white rounded-full shadow-md text-slate-600 hover:text-primary transition-colors">
          <ChevronLeft size={24} />
        </button>
      </div>

      <SessionProgressBar current={sessionCount} total={SESSION_LENGTH} />

      {/* Hide Global Progress Bar if we have Session Bar? Or keep both? 
          Let's keep Global (XP) but maybe make it smaller or move it?
          For now, keeping both as per design.
      */}
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

      <SessionSummary
        isOpen={showSummary}
        xpGained={sessionXP}
        correctCount={sessionCorrect}
        totalCount={SESSION_LENGTH} // Assuming they eventually solve all 10
        onPlayAgain={handlePlayAgain}
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
