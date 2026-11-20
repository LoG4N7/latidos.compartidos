import React, { useState } from 'react';
import { X, Watch, Bell, Key, HeartHandshake, HelpCircle, Check, Sparkles, ExternalLink, Sliders } from 'lucide-react';
import { pulsoidService, HeartSourceMode } from '../services/pulsoidService';
import { hapticsAudio } from '../utils/hapticsAudio';

interface PulsoidConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const PulsoidConfigModal: React.FC<PulsoidConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [token, setToken] = useState<string>(pulsoidService.getToken());
  const [mode, setMode] = useState<HeartSourceMode>(pulsoidService.getSourceMode());
  const [baseBpm, setBaseBpm] = useState<number>(pulsoidService.getBaseBpm());
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    pulsoidService.setToken(token);
    pulsoidService.setSourceMode(mode);
    pulsoidService.setBaseBpm(baseBpm);
    setSavedSuccess(true);
    hapticsAudio.vibrateSingleBeat(50);
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved();
      onClose();
    }, 600);
  };

  const handlePreset = (bpm: number) => {
    setBaseBpm(bpm);
    pulsoidService.setBaseBpm(bpm);
    hapticsAudio.vibrateSingleBeat(40);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg glass-panel-active rounded-2xl p-5 border border-rose-500/30 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-900/40">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-rose-600/30 text-rose-300">
              <Watch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-100">
                Latidos de Demian • Fuentes
              </h3>
              <p className="text-xs text-rose-300/70">
                Configura cómo se transmite tu pulso a Verónica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-rose-900/40 text-rose-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 text-sm">
          {/* 3 Source Modes Switcher */}
          <div className="grid grid-cols-3 gap-1.5 bg-black/60 p-1.5 rounded-xl border border-rose-900/40">
            <button
              onClick={() => setMode('notification')}
              className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center text-center font-medium text-[11px] transition ${
                mode === 'notification'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md'
                  : 'text-rose-300/70 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4 mb-0.5" />
              <span>Notificación (Gratis)</span>
            </button>

            <button
              onClick={() => setMode('token')}
              className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center text-center font-medium text-[11px] transition ${
                mode === 'token'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'text-rose-300/70 hover:text-white'
              }`}
            >
              <Key className="w-4 h-4 mb-0.5" />
              <span>Token (De Pago)</span>
            </button>

            <button
              onClick={() => setMode('simulation')}
              className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center text-center font-medium text-[11px] transition ${
                mode === 'simulation'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md'
                  : 'text-rose-300/70 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 mb-0.5" />
              <span>Simulación</span>
            </button>
          </div>

          {/* Mode 1: Base Free Notification Sync */}
          {mode === 'notification' && (
            <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-rose-900/30">
              <div className="flex items-center space-x-2 text-rose-200 font-bold text-xs">
                <Bell className="w-4 h-4 text-rose-400" />
                <span>Opción Base Gratuita (Notificación de Pulsoid):</span>
              </div>
              <p className="text-xs text-rose-300/80 leading-relaxed">
                Dado que la app de Pulsoid en tu teléfono muestra tu ritmo cardíaco en vivo en la barra de notificaciones, puedes calibrar aquí tus pulsaciones basales para transmitírselas a Verónica sin pagar ninguna suscripción:
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-rose-200">
                  Ritmo cardíaco actual:
                </span>
                <span className="text-base font-black text-rose-400 font-mono">
                  {baseBpm} BPM
                </span>
              </div>

              <input
                type="range"
                min="50"
                max="160"
                value={baseBpm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBaseBpm(val);
                  pulsoidService.setBaseBpm(val);
                }}
                className="w-full accent-rose-500 cursor-pointer"
              />

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handlePreset(64)}
                  className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/50 rounded-lg text-[11px] text-rose-300 border border-rose-900/30 transition text-left"
                >
                  😴 En Reposo (64 BPM)
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(76)}
                  className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/50 rounded-lg text-[11px] text-rose-300 border border-rose-900/30 transition text-left"
                >
                  ✨ Tranquilo (76 BPM)
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(94)}
                  className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/50 rounded-lg text-[11px] text-rose-300 border border-rose-900/30 transition text-left"
                >
                  🥰 Pensando en Ella (94 BPM)
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(115)}
                  className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/50 rounded-lg text-[11px] text-rose-300 border border-rose-900/30 transition text-left"
                >
                  💓 Emocionado (115 BPM)
                </button>
              </div>

              <div className="p-2.5 bg-black/60 rounded-xl border border-rose-900/40 text-[11px] text-rose-300/70 leading-snug">
                💡 <strong>Webhook Gratuito Automático:</strong> Si usas la app <em>Notify for Xiaomi</em>, puedes activar en sus ajustes el envío de Webhook HTTP a:
                <div className="font-mono text-white text-[10px] mt-1 bg-black/80 p-1.5 rounded border border-rose-900/50 break-all select-all">
                  http://tu-servidor:3001/api/pulsoid/webhook
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Paid Token Option */}
          {mode === 'token' && (
            <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-purple-900/40">
              <div className="flex items-center space-x-2 text-purple-200 font-bold text-xs">
                <Key className="w-4 h-4 text-purple-400" />
                <span>Opción de Pago (Pulsoid Token / Feed):</span>
              </div>
              <p className="text-xs text-purple-200/80 leading-relaxed">
                Si cuentas con el plan de suscripción de Pulsoid o un Token de Desarrollador, pégalo aquí para recibir datos continuos directamente por WebSocket desde los servidores de Pulsoid:
              </p>

              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1">
                  Pulsoid Access Token / Widget Key:
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Ej: f47ac10b-58cc-4372-a567-0e02b2c3d479"
                  className="w-full bg-black/70 border border-purple-800/50 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-purple-900/60 focus:outline-none focus:border-purple-400"
                />
                <p className="mt-1 text-[11px] text-amber-300/80 leading-snug">
                  ⚠️ <strong>Aviso:</strong> El enlace de widget (<em>pulsoid.net/widget/view/...</em>) es para OBS y no funciona como Token. Los Tokens son claves exclusivas del plan de pago (BRO) de Pulsoid. Si no tienes suscripción de pago, selecciona arriba la opción <strong>🔔 Notificación (Gratis)</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Mode 3: Simulation */}
          {mode === 'simulation' && (
            <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-rose-900/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-200 flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ritmo Cardíaco Simulado:</span>
                </span>
                <span className="text-sm font-bold text-rose-400 font-mono">
                  {baseBpm} BPM
                </span>
              </div>

              <input
                type="range"
                min="50"
                max="160"
                value={baseBpm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBaseBpm(val);
                  pulsoidService.setBaseBpm(val);
                }}
                className="w-full accent-rose-500 cursor-pointer"
              />

              <p className="text-[11px] text-rose-300/60 leading-tight">
                * El modo simulación incluye arritmia sinusal respiratoria fisiológica (variación automática y suave según el ciclo de respiración).
              </p>
            </div>
          )}

          {/* Test Haptic Feedback Button */}
          <button
            type="button"
            onClick={() => {
              hapticsAudio.vibrateLubDub();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-200 text-xs font-semibold flex items-center justify-center space-x-2 transition"
          >
            <HeartHandshake className="w-4 h-4 text-purple-400" />
            <span>Probar Latido Háptico Doble ("Lub-Dub")</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-rose-900/40 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-rose-300/80 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 active:scale-95 transition flex items-center space-x-1.5 shadow-lg shadow-rose-900/40"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>¡Guardado!</span>
              </>
            ) : (
              <span>Aplicar Configuración</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
