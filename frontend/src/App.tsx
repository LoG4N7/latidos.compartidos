import React, { useState, useEffect } from 'react';
import type { UserProfile } from './types';
import { Header } from './components/Header';
import { Navigation, type ActiveTab } from './components/Navigation';
import { LiveBandModule } from './components/LiveBandModule';
import { PPGCameraModule } from './components/PPGCameraModule';
import { SettingsPanel } from './components/SettingsPanel';
import { ProfileModal } from './components/ProfileModal';
import { PulsoidConfigModal } from './components/PulsoidConfigModal';
import { socketService } from './services/socketService';
import { wakeLock } from './utils/wakeLock';
import { hapticsAudio } from './utils/hapticsAudio';

export const App: React.FC = () => {
  // Stored Profile & PIN code
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    return (localStorage.getItem('latidos_profile') as UserProfile) || 'Demian';
  });
  const [pin, setPin] = useState<string>(() => {
    return localStorage.getItem('latidos_pin') || '1402';
  });

  const partnerUser: UserProfile = currentUser === 'Demian' ? 'Verónica' : 'Demian';

  // Navigation state
  const [activeTab, setActiveTab] = useState<ActiveTab>('band');

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem('latidos_profile');
  });
  const [isPulsoidModalOpen, setIsPulsoidModalOpen] = useState<boolean>(false);

  // Connection state
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  // Initialize Socket connection
  useEffect(() => {
    socketService.connect(pin, currentUser);

    const unsubConn = socketService.onConnectionChange((connected) => {
      setIsSocketConnected(connected);
    });

    // Auto-request wakeLock
    wakeLock.request().catch(() => {});

    // Listen to first click/touch to unlock Web Audio API
    const handleFirstTouch = () => {
      hapticsAudio.initAudioContext();
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
    window.addEventListener('click', handleFirstTouch);
    window.addEventListener('touchstart', handleFirstTouch);

    return () => {
      unsubConn();
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
  }, [pin, currentUser]);

  const handleSaveProfile = (user: UserProfile, newPin: string) => {
    setCurrentUser(user);
    setPin(newPin);
    localStorage.setItem('latidos_profile', user);
    localStorage.setItem('latidos_pin', newPin);
    socketService.setPinAndUser(newPin, user);
    setIsProfileModalOpen(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#090308] text-rose-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      {/* Top Intimate Header */}
      <Header
        currentUser={currentUser}
        partnerUser={partnerUser}
        pin={pin}
        isSocketConnected={isSocketConnected}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenSettings={() => setIsPulsoidModalOpen(true)}
      />

      {/* Main Content View Container */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-4 overflow-y-auto">
        {activeTab === 'band' && (
          <LiveBandModule
            currentUser={currentUser}
            partnerUser={partnerUser}
            onOpenPulsoidConfig={() => setIsPulsoidModalOpen(true)}
          />
        )}

        {activeTab === 'ppg' && (
          <PPGCameraModule
            currentUser={currentUser}
            partnerUser={partnerUser}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            currentUser={currentUser}
            partnerUser={partnerUser}
            pin={pin}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onOpenPulsoidModal={() => setIsPulsoidModalOpen(true)}
          />
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {/* Profile & PIN Selection Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        currentUser={currentUser}
        currentPin={pin}
        onSave={handleSaveProfile}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Pulsoid & Mi Band 9 Setup Modal */}
      <PulsoidConfigModal
        isOpen={isPulsoidModalOpen}
        onClose={() => setIsPulsoidModalOpen(false)}
        onSaved={() => {}}
      />
    </div>
  );
};

export default App;
