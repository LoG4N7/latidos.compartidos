import React from 'react';
import { Vibrate, Volume2, VolumeX, ShieldCheck, Settings } from 'lucide-react';
import type { UserProfile } from '../types';
import { hapticsAudio } from '../utils/hapticsAudio';
import { wakeLock } from '../utils/wakeLock';

interface HeaderProps {
  currentUser: UserProfile;
  partnerUser: UserProfile;
  pin: string;
  isSocketConnected: boolean;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  partnerUser,
  pin,
  isSocketConnected,
  onOpenProfile,
  onOpenSettings
}) => {
  const [hapticsOn, setHapticsOn] = React.useState<boolean>(hapticsAudio.isHapticActive());
  const [audioOn, setAudioOn] = React.useState<boolean>(hapticsAudio.isAudioActive());
  const [wakeLockActive, setWakeLockActive] = React.useState<boolean>(wakeLock.isActive());

  const toggleHaptics = () => {
    const next = !hapticsOn;
    hapticsAudio.setHaptics(next);
    setHapticsOn(next);
    if (next) {
      hapticsAudio.vibrateSingleBeat(50);
    }
  };

  const toggleAudio = () => {
    const next = !audioOn;
    hapticsAudio.setAudio(next);
    setAudioOn(next);
    if (next) {
      hapticsAudio.vibrateSingleBeat(30);
    }
  };

  const toggleWakeLock = async () => {
    if (wakeLockActive) {
      wakeLock.release();
      setWakeLockActive(false);
    } else {
      const ok = await wakeLock.request();
      setWakeLockActive(ok);
    }
  };

  return (
    <header className="w-full glass-panel sticky top-0 z-40 px-3.5 py-2.5 flex items-center justify-between border-b border-rose-900/30">
      {/* Brand & User Profile Button */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onOpenProfile}
          className="flex items-center space-x-2 text-left bg-rose-950/40 hover:bg-rose-900/50 active:scale-95 transition px-2.5 py-1.5 rounded-full border border-rose-800/30"
          title="Cambiar perfil o PIN"
        >
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-700 to-rose-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {currentUser[0]}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${
                isSocketConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'
              }`}
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-rose-100 flex items-center space-x-1">
              <span>{currentUser}</span>
              <span className="text-[10px] text-rose-400/80 font-normal">& {partnerUser}</span>
            </div>
            <div className="text-[10px] text-rose-300/60 font-mono">
              Sala #{pin}
            </div>
          </div>
        </button>
      </div>

      {/* Quick Action Toggles: Haptics, Audio, WakeLock, Settings */}
      <div className="flex items-center space-x-1.5">
        {/* Haptics Toggle */}
        <button
          onClick={toggleHaptics}
          className={`p-2 rounded-full transition-all active:scale-90 ${
            hapticsOn
              ? 'bg-rose-600/30 text-rose-300 border border-rose-500/50 shadow-[0_0_12px_rgba(225,29,72,0.4)]'
              : 'bg-black/40 text-gray-500 border border-gray-800/50'
          }`}
          title={hapticsOn ? 'Vibración Activa (Toca para silenciar)' : 'Vibración Desactivada'}
        >
          <Vibrate className="w-4 h-4" />
        </button>

        {/* Cardiac Sound Toggle */}
        <button
          onClick={toggleAudio}
          className={`p-2 rounded-full transition-all active:scale-90 ${
            audioOn
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(192,132,252,0.35)]'
              : 'bg-black/40 text-gray-500 border border-gray-800/50'
          }`}
          title={audioOn ? 'Audio Cardíaco Activo' : 'Audio Silenciado'}
        >
          {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Wake Lock Toggle */}
        <button
          onClick={toggleWakeLock}
          className={`p-2 rounded-full transition-all active:scale-90 ${
            wakeLockActive
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              : 'bg-black/40 text-gray-500 border border-gray-800/50'
          }`}
          title={wakeLockActive ? 'Pantalla siempre encendida' : 'Bloqueo normal de pantalla'}
        >
          <ShieldCheck className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full bg-black/40 text-rose-300/80 hover:text-white border border-rose-900/30 active:scale-90 transition"
          title="Configuración de Pulsoid y Xiaomi Band 9"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
