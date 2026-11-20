import React from 'react';
import { Vibrate, Volume2, ShieldCheck, Watch, Download } from 'lucide-react';
import type { UserProfile } from '../types';
import { hapticsAudio } from '../utils/hapticsAudio';
import { wakeLock } from '../utils/wakeLock';

interface SettingsPanelProps {
  currentUser: UserProfile;
  partnerUser: UserProfile;
  pin: string;
  onOpenProfileModal: () => void;
  onOpenPulsoidModal: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentUser,
  partnerUser,
  pin,
  onOpenProfileModal,
  onOpenPulsoidModal
}) => {
  const [hapticsOn, setHapticsOn] = React.useState<boolean>(hapticsAudio.isHapticActive());
  const [audioOn, setAudioOn] = React.useState<boolean>(hapticsAudio.isAudioActive());
  const [wakeActive, setWakeActive] = React.useState<boolean>(wakeLock.isActive());

  const handleToggleHaptics = () => {
    const next = !hapticsOn;
    hapticsAudio.setHaptics(next);
    setHapticsOn(next);
    if (next) hapticsAudio.vibrateSingleBeat(50);
  };

  const handleToggleAudio = () => {
    const next = !audioOn;
    hapticsAudio.setAudio(next);
    setAudioOn(next);
    if (next) hapticsAudio.vibrateSingleBeat(30);
  };

  const handleToggleWake = async () => {
    if (wakeActive) {
      wakeLock.release();
      setWakeActive(false);
    } else {
      const ok = await wakeLock.request();
      setWakeActive(ok);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-24 text-xs">
      {/* Intimate Profile Card */}
      <div className="glass-panel rounded-2xl p-4 border border-rose-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow">
              {currentUser[0]}
            </div>
            <div>
              <div className="font-bold text-sm text-white">
                Perfil Activo: {currentUser}
              </div>
              <div className="text-[11px] text-rose-300/70">
                Conectado con {partnerUser} • Sala #{pin}
              </div>
            </div>
          </div>

          <button
            onClick={onOpenProfileModal}
            className="py-1.5 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 font-semibold active:scale-95 transition"
          >
            Cambiar
          </button>
        </div>
      </div>

      {/* Hardware & Sensory Controls */}
      <div className="glass-panel rounded-2xl p-4 border border-rose-900/40 space-y-3">
        <div className="font-bold text-rose-200 text-xs uppercase tracking-wider mb-1">
          Controles de Hardware y Háptica
        </div>

        {/* Haptics Switch */}
        <div className="flex items-center justify-between py-1 border-b border-rose-950/50">
          <div className="flex items-center space-x-2.5">
            <Vibrate className="w-4 h-4 text-rose-400" />
            <div>
              <div className="font-semibold text-rose-100">Vibración Háptica</div>
              <div className="text-[10px] text-rose-300/60">
                Siente cada latido sincronizado en tu mano
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleHaptics}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              hapticsOn ? 'bg-rose-600' : 'bg-gray-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                hapticsOn ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Audio Synthesizer Switch */}
        <div className="flex items-center justify-between py-1 border-b border-rose-950/50">
          <div className="flex items-center space-x-2.5">
            <Volume2 className="w-4 h-4 text-purple-400" />
            <div>
              <div className="font-semibold text-rose-100">Sonido Cardíaco Orgánico</div>
              <div className="text-[10px] text-rose-300/60">
                Sintetizador sub-grave para iOS / Safari y Android
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleAudio}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              audioOn ? 'bg-purple-600' : 'bg-gray-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                audioOn ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Screen Wake Lock Switch */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <div>
              <div className="font-semibold text-rose-100">Pantalla Siempre Activa</div>
              <div className="text-[10px] text-rose-300/60">
                Evita que el celular se apague durante la sesión
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleWake}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              wakeActive ? 'bg-amber-600' : 'bg-gray-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                wakeActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Pulsoid Integration Shortcut */}
      <div className="glass-panel rounded-2xl p-4 border border-rose-900/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Watch className="w-5 h-5 text-rose-400" />
          <div>
            <div className="font-semibold text-rose-100">Xiaomi Smart Band 9 & Pulsoid</div>
            <div className="text-[10px] text-rose-300/60">
              Configurar token, feed o modo simulación
            </div>
          </div>
        </div>
        <button
          onClick={onOpenPulsoidModal}
          className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-white font-bold text-xs shadow active:scale-95 transition"
        >
          Configurar
        </button>
      </div>

      {/* PWA Installation Instructions */}
      <div className="glass-panel rounded-2xl p-4 border border-rose-900/40 space-y-2.5">
        <div className="font-bold text-rose-200 text-xs flex items-center space-x-1.5">
          <Download className="w-4 h-4 text-rose-400" />
          <span>Instalar como App Nativa (PWA):</span>
        </div>
        <div className="space-y-2 text-rose-300/80 leading-relaxed text-[11px]">
          <p>
            <strong>En Android (Chrome):</strong> Toca el menú de tres puntos ⋮ en la esquina superior derecha y selecciona <em>"Instalar aplicación"</em> o <em>"Agregar a la pantalla principal"</em>.
          </p>
          <p>
            <strong>En iPhone (Safari):</strong> Toca el botón <em>Compartir</em> (el icono con una flecha hacia arriba) y selecciona <em>"Agregar a la pantalla de inicio"</em>.
          </p>
        </div>
      </div>
    </div>
  );
};
