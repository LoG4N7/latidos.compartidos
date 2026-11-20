import React, { useState, useEffect } from 'react';
import { X, Watch, Bell, Key, HeartHandshake, Check, Sparkles, ExternalLink, Sliders, Globe, Radio } from 'lucide-react';
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
  const [mode, setMode] = useState<HeartSourceMode>(pulsoidService.getSourceMode());
  const [widgetUrl, setWidgetUrl] = useState<string>(pulsoidService.getWidget());
  const [token, setToken] = useState<string>(pulsoidService.getToken());
  const [baseBpm, setBaseBpm] = useState<number>(pulsoidService.getBaseBpm());
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [serverBridgeStatus, setServerBridgeStatus] = useState<{
    isConnected: boolean;
    lastBpm: number | null;
    statusText: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(pulsoidService.getSourceMode());
      setWidgetUrl(pulsoidService.getWidget());
      setToken(pulsoidService.getToken());
      setBaseBpm(pulsoidService.getBaseBpm());

      // Fetch server bridge status
      const serverUrl = localStorage.getItem('latidos_server_url') || '';
      const endpoint = serverUrl ? `${serverUrl.replace(/\/$/, '')}/api/pulsoid/status` : '/api/pulsoid/status';
      fetch(endpoint)
        .then(r => r.json())
        .then(data => {
          if (data && typeof data.isConnected === 'boolean') {
            setServerBridgeStatus(data);
          }
        })
        .catch(() => {
          // Ignore if offline
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    pulsoidService.setWidget(widgetUrl);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-lg glass-panel-active rounded-2xl p-5 border border-rose-500/30 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-md shadow-rose-950/60">
              <Watch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-100 flex items-center space-x-1.5">
                <span>Latidos de Demian</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded-full">
                  Exclusivo
                </span>
              </h3>
              <p className="text-xs text-rose-300/70">
                Sincronización en vivo con tu Xiaomi Smart Band 9
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
          {/* Source Modes Switcher */}
          <div className="grid grid-cols-4 gap-1 bg-black/60 p-1.5 rounded-xl border border-rose-900/40">
            <button
              onClick={() => setMode('widget')}
              className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center text-center font-medium text-[10px] transition ${
                mode === 'widget'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-rose-300/70 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 mb-0.5" />
              <span>Widget Auto</span>
            </button>

            <button
              onClick={() => setMode('notification')}
              className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center text-center font-medium text-[10px] transition ${
                mode === 'notification'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md'
                  : 'text-rose-300/70 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5 mb-0.5" />
              <span>Notificación</span>
            </button>

            <button
              onClick={() => setMode('token')}
              className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center text-center font-medium text-[10px] transition ${
                mode === 'token'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'text-rose-300/70 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5 mb-0.5" />
              <span>Token (Pago)</span>
            </button>

            <button
              onClick={() => setMode('simulation')}
              className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center text-center font-medium text-[10px] transition ${
                mode === 'simulation'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md'
                  : 'text-rose-300/70 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 mb-0.5" />
              <span>Simulado</span>
            </button>
          </div>

          {/* Mode 1: AUTOMATIC FREE WIDGET (USER'S EXACT GOAL) */}
          {mode === 'widget' && (
            <div className="space-y-3.5 bg-black/40 p-4 rounded-xl border border-emerald-500/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Widget de Pulsoid (100% Automático & Gratis)</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Recomendado
                </span>
              </div>

              <p className="text-xs text-emerald-100/90 leading-relaxed">
                ¡Esta opción es <strong>totalmente automática y gratuita</strong>! No requiere pagar la suscripción BRO de Pulsoid ni tener la app de <em>Latidos Compartidos</em> abierta en tu celular:
              </p>

              <div className="bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40 text-[11px] text-emerald-200/90 space-y-1">
                <p>• <strong>Solo necesitas:</strong> Tu Xiaomi Band 9 puesta y la app oficial de Pulsoid abierta en tu teléfono (para que envíe tu pulso a la nube).</p>
                <p>• <strong>Transmisión 24/7:</strong> Nuestro servidor se conecta directamente a tu enlace de widget y le entrega tus latidos a Verónica en tiempo real, incluso si tú cierras esta app.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">
                  Enlace o ID de tu Widget de Pulsoid:
                </label>
                <input
                  type="text"
                  value={widgetUrl}
                  onChange={(e) => setWidgetUrl(e.target.value)}
                  placeholder="https://pulsoid.net/widget/view/latidos-compartidos"
                  className="w-full bg-black/70 border border-emerald-600/50 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-emerald-800/50 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {serverBridgeStatus && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-emerald-900/40 text-[11px]">
                  <span className="text-emerald-300/80 flex items-center space-x-1.5">
                    <Radio className={`w-3.5 h-3.5 ${serverBridgeStatus.isConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                    <span>Estado en Servidor:</span>
                  </span>
                  <span className={`font-semibold ${serverBridgeStatus.isConnected ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {serverBridgeStatus.isConnected
                      ? `🟢 Conectado (${serverBridgeStatus.lastBpm ? `${serverBridgeStatus.lastBpm} BPM` : 'Esperando datos'})`
                      : '🟡 Conectando...'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Live Notification / Local Manual Sync */}
          {mode === 'notification' && (
            <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-rose-900/30">
              <div className="flex items-center space-x-2 text-rose-200 font-bold text-xs">
                <Bell className="w-4 h-4 text-rose-400" />
                <span>Calibración Manual por Notificación:</span>
              </div>
              <p className="text-xs text-rose-300/80 leading-relaxed">
                Si alguna vez estás sin conexión o prefieres fijar manualmente el ritmo cardíaco que ves en la barra de notificaciones de tu teléfono:
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
            </div>
          )}

          {/* Mode 3: Paid Developer Token */}
          {mode === 'token' && (
            <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-purple-900/40">
              <div className="flex items-center space-x-2 text-purple-200 font-bold text-xs">
                <Key className="w-4 h-4 text-purple-400" />
                <span>Opción de Pago (Token de Desarrollador Pulsoid):</span>
              </div>
              <p className="text-xs text-purple-200/80 leading-relaxed">
                Si cuentas con la suscripción de pago (plan BRO) de Pulsoid, puedes ingresar aquí tu clave de desarrollador de <code>dev.pulsoid.net</code>:
              </p>

              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1">
                  Pulsoid Access Token:
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Ej: f47ac10b-58cc-4372-a567-0e02b2c3d479"
                  className="w-full bg-black/70 border border-purple-800/50 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-purple-900/60 focus:outline-none focus:border-purple-400"
                />
                <p className="mt-1 text-[11px] text-amber-300/80 leading-snug">
                  💡 Si no tienes el plan de pago BRO, no necesitas token: usa arriba la opción <strong>🌐 Widget Auto</strong> que es 100% gratuita.
                </p>
              </div>
            </div>
          )}

          {/* Mode 4: Simulation */}
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
                * Simulación biológica con fluctuación de respiración humana natural.
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
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition flex items-center space-x-1.5 shadow-lg shadow-emerald-950/50"
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
