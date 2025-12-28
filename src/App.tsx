import { useState, useEffect } from 'react'

import { ProfileProvider, useProfile } from './context/ProfileContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProfileSelector } from './components/onboarding/ProfileSelector'
import { ParentGate } from './components/parent/ParentGate'
import { ParentDashboard } from './components/parent/ParentDashboard'
import { WorldMap } from './components/WorldMap'
import { GameOrchestrator } from './components/GameOrchestrator'
import { type ZoneConfig } from './lib/worldConfig'








const AppContent = () => {
  const { profile, logout } = useProfile();
  const [view, setView] = useState<'select' | 'map' | 'game' | 'parent'>('select');
  const [showParentGate, setShowParentGate] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

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

  const handleZoneSelect = (zone: ZoneConfig) => {
    if (!profile) return;
    // Auto-select max level logic:
    // Play the highest unlocked level in this zone, OR the zone's max if higher than user level (which shouldn't happen if locked),
    // actually: cap at profile.currentLevel.
    const targetLevel = Math.min(profile.currentLevel, zone.maxLevel);
    setSelectedLevel(targetLevel);
    setView('game');
  };

  const handleGameExit = () => {
    setView('map');
    setSelectedLevel(null);
  };

  const handleLogout = () => {
    logout();
    setView('select');
    setSelectedLevel(null);
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
    <GameOrchestrator
      onExit={handleGameExit}
      targetLevel={selectedLevel || profile.currentLevel}
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
