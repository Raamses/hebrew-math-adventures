import { useState, useEffect } from 'react'
import './i18n'; // Initialize translations

import { ProfileProvider, useProfile } from './context/ProfileContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProgressProvider } from './context/ProgressContext'
import { QuestProvider } from './context/QuestContext'
import { ProfileSelector } from './components/onboarding/ProfileSelector'
import { ParentGate } from './components/parent/ParentGate'
import { ParentDashboard } from './components/parent/ParentDashboard'
import { SagaMap } from './components/map/SagaMap'
import { GameOrchestrator } from './components/GameOrchestrator'
import { MascotGreeting } from './components/mascot/MascotGreeting'
import type { LearningNode } from './types/learningPath'
import type { ArcadeMode } from './engines/bubble/types'

import { useAnalytics } from './hooks/useAnalytics';

const AppContent = () => {
  const { logEvent } = useAnalytics();

  // Log app open on mount
  useEffect(() => {
    logEvent('app_open', { page_title: 'App Entry' });
  }, [logEvent]);

  const { profile, logout } = useProfile();
  const [view, setView] = useState<'select' | 'map' | 'game' | 'parent'>('select');
  const [showParentGate, setShowParentGate] = useState(false);
  const [selectedNode, setSelectedNode] = useState<LearningNode | null>(null);
  const [arcadeMode, setArcadeMode] = useState<ArcadeMode | undefined>(undefined);
  const [dailyChallengeMode, setDailyChallengeMode] = useState<string | undefined>(undefined);
  const [dailyChallengeTarget, setDailyChallengeTarget] = useState<number | undefined>(undefined);
  const [showGreeting, setShowGreeting] = useState(false);

  console.log('App Render:', { view, profileId: profile?.id, selectedNode });

  // Derived View State (replaces synchronization effect)
  let effectiveView = view;
  if (!profile && view !== 'parent') {
    effectiveView = 'select';
  } else if (profile && view === 'select') {
    effectiveView = 'map';
    // Show greeting when a profile is first selected
    if (!showGreeting) {
      setShowGreeting(true);
    }
  }

  const handleNodeSelect = (node: LearningNode) => {
    if (!profile) return;
    setSelectedNode(node);
    setView('game');
  };

  const handleArcadeMode = (mode?: ArcadeMode, dailyMode?: string, dailyTarget?: number) => {
    if (!profile) return;
    setSelectedNode(null); // Explicitly null for Free Play
    setArcadeMode(mode);
    setDailyChallengeMode(dailyMode);
    setDailyChallengeTarget(dailyTarget);
    setView('game');
  };

  const handleGameExit = () => {
    setView('map');
    setSelectedNode(null);
    setArcadeMode(undefined);
    setDailyChallengeMode(undefined);
    setDailyChallengeTarget(undefined);
  };

  const handleLogout = () => {
    logout();
    setView('select');
    setSelectedNode(null);
    setShowGreeting(false);
  };

  if (effectiveView === 'parent') {
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

  if (effectiveView === 'map') {
    return (
      <>
        {showGreeting && profile && (
          <MascotGreeting
            mascotId={profile.mascotId}
            streak={profile.streak || 0}
            onDismiss={() => setShowGreeting(false)}
          />
        )}
        <SagaMap onNodeSelect={handleNodeSelect} onLogout={handleLogout} onArcadeMode={handleArcadeMode} />
      </>
    );
  }

  // Map Node to Legacy Level for Orchestrator compatibility
  // In the future, Orchestrator should take 'node' directly
  let effectiveLevel = 1; // Default to Level 1 for practice if unrelated to node

  if (selectedNode) {
    if (selectedNode.type === 'SENSORY') {
      effectiveLevel = -1; // Sentinel for Sensory Mode
    } else if (selectedNode.targetLevel) {
      effectiveLevel = selectedNode.targetLevel;
    }
  }

  if (effectiveView === 'game') {
    return (
      <GameOrchestrator
        onExit={handleGameExit}
        targetLevel={effectiveLevel}
        node={selectedNode}
        arcadeMode={arcadeMode}
        dailyChallengeMode={dailyChallengeMode}
        dailyChallengeTarget={dailyChallengeTarget}
      />
    );
  }

  // Fallback / Loading / Error State
  // This prevents accidental rendering of the Game during transitions
  return null;
};

const App = () => {
  return (
    <ProfileProvider>
      <ProgressProvider>
        <QuestProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </QuestProvider>
      </ProgressProvider>
    </ProfileProvider>
  );
}

export default App;
