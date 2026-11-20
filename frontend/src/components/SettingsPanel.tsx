import React, { useState } from 'react';
import { Vibrate, Volume2, ShieldCheck, Watch, Download, Server, Check, Sparkles, RefreshCw } from 'lucide-react';
import type { UserProfile, AppVersionInfo } from '../types';
import { hapticsAudio } from '../utils/hapticsAudio';
import { wakeLock } from '../utils/wakeLock';
import { socketService } from '../services/socketService';
import { updateService, CURRENT_APP_VERSION } from '../services/updateService';

interface SettingsPanelProps {
  currentUser: UserProfile;
  partnerUser: UserProfile;
  pin: string;
  onOpenProfileModal: () => void;
  onOpenPulsoidModal: () => void;
  onOpenUpdateModal?: (info: AppVersionInfo) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentUser,
  partnerUser,
  pin,
  onOpenProfileModal,
  onOpenPulsoidModal,
  onOpenUpdateModal
}) => {
  const [hapticsOn, setHapticsOn] = useState<boolean>(hapticsAudio.isHapticActive());
  const [audioOn, setAudioOn] = useState<boolean>(hapticsAudio.isAudioActive());
  const [wakeActive, setWakeActive] = useState<boolean>(wakeLock.isActive());
  const [serverUrl, setServerUrl] = useState<string>(() => socketService.getServerUrl() || socketService.getEffectiveServerUrl());
  const [urlSaved, setUrlSaved] = useState<boolean>(false);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);

  const handleManualCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatusMessage(null);
    hapticsAudio.vibrateSingleBeat(30);

    const { hasUpdate, updateInfo } = await updateService.checkForUpdate(true);
    setCheckingUpdate(false);

    if (hasUpdate && updateInfo && onOpenUpdateModal) {
      onOpenUpdateModal(updateInfo);
    } else if (hasUpdate && updateInfo) {
      updateService.downloadAndInstall(updateInfo.apkDownloadUrl);
    } else {
      setUpdateStatusMessage('¡Tienes la versión más reciente! ❤️');
      setTimeout(() => setUpdateStatusMessage(null), 3000);
    }
  };

  const handleSaveServerUrl = () => {
    socketService.setServerUrl(serverUrl);
    setUrlSaved(true);
    hapticsAudio.vibrateSingleBeat(40);
    setTimeout(() => setUrlSaved(false), 1500);
  };

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

      {/* Server URL configuration for local testing and production */}
      <div className="glass-panel rounded-2xl p-4 border border-rose-900/40 space-y-2.5">
        <div className="flex items-center space-x-2 text-rose-300 font-bold">
          <Server className="w-4 h-4 text-rose-400" />
          <span>Servidor de Conexión (Backend)</span>
        </div>
        <p className="text-[10px] text-rose-300/70 leading-snug">
          IP de tu PC en red WiFi o tu enlace en la nube (ej: Render/Railway).
        </p>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://192.168.0.5:3001"
            className="flex-1 bg-black/60 border border-rose-900/50 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-400"
          />
          <button
            onClick={handleSaveServerUrl}
            className="px-3 py-2 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl font-bold active:scale-95 transition flex items-center space-x-1"
          >
            {urlSaved ? <Check className="w-3.5 h-3.5 text-white" /> : <span>Guardar</span>}
          </button>
        </div>
      </div>

      {/* Pulsoid Integration Shortcut */}
      <div className="glass-panel rounded-2xl p-4 border border-rose-900/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Watch className="w-5 h-5 text-rose-400" />
          <div>
            <div className="font-semibold text-rose-100">Latidos de Demian • Fuentes</div>
            <div className="text-[10px] text-rose-300/60">
              Sincronización por notificación, webhook o token
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

      {/* In-App Updates Card */}
      <div className="glass-panel rounded-2xl p-4 border border-rose-900/40 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-300 font-bold">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span>Actualizaciones de la App</span>
          </div>
          <span className="text-[10px] bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded-full font-mono text-rose-300">
            v{CURRENT_APP_VERSION}
          </span>
        </div>

        <p className="text-[10px] text-rose-300/70 leading-relaxed">
          Comprueba e instala las últimas mejoras para ti y Verónica directamente con 1 toque sin tener que buscar archivos en GitHub.
        </p>

        <button
          onClick={handleManualCheckUpdate}
          disabled={checkingUpdate}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl font-bold active:scale-95 transition flex items-center justify-center space-x-2 text-xs shadow-md shadow-rose-950/60 disabled:opacity-60"
        >
          {checkingUpdate ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Buscando actualizaciones...</span>
            </>
          ) : updateStatusMessage ? (
            <span>{updateStatusMessage}</span>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Buscar Nueva Versión</span>
            </>
          )}
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
