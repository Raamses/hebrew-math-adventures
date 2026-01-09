import { useState, useEffect } from 'react'
import './i18n'; // Initialize translations

import { ProfileProvider, useProfile } from './context/ProfileContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProgressProvider } from './context/ProgressContext'
import { ProfileSelector } from './components/onboarding/ProfileSelector'
import { ParentGate } from './components/parent/ParentGate'
import { ParentDashboard } from './components/parent/ParentDashboard'
import { SagaMap } from './components/map/SagaMap'
import { GameOrchestrator } from './components/GameOrchestrator'
import type { LearningNode } from './types/learningPath'

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

  // Effect to sync view with profile state
  useEffect(() => {
    if (profile) {
      if (view === 'select') {
        setView('map');
      }
    } else {
      if (view !== 'parent') {
        setView('select');
      }
    }
  }, [profile, view]);

  const handleNodeSelect = (node: LearningNode) => {
    if (!profile) return;
    setSelectedNode(node);
    setView('game');
  };

  const handleGameExit = () => {
    setView('map');
    setSelectedNode(null);
  };

  const handleLogout = () => {
    logout();
    setView('select');
    setSelectedNode(null);
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
      <SagaMap onNodeSelect={handleNodeSelect} onLogout={handleLogout} />
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

  return (
    <GameOrchestrator
      onExit={handleGameExit}
      targetLevel={effectiveLevel}
      node={selectedNode}
    />
  );
};

const App = () => {
  return (
    <ProfileProvider>
      <ProgressProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </ProgressProvider>
    </ProfileProvider>
  );
}

export default App;
