import React, { useState } from 'react';
import { X, Watch, Radio, HeartHandshake, HelpCircle, Check, Sparkles, ExternalLink, Sliders } from 'lucide-react';
import { pulsoidService } from '../services/pulsoidService';
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
  const [mode, setMode] = useState<'live' | 'simulation'>(pulsoidService.getMode());
  const [simBpm, setSimBpm] = useState<number>(75);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    pulsoidService.setToken(token);
    pulsoidService.setMode(mode);
    if (mode === 'simulation') {
      pulsoidService.setManualBaseBpm(simBpm);
    }
    setSavedSuccess(true);
    hapticsAudio.vibrateSingleBeat(50);
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved();
      onClose();
    }, 600);
  };

  const handlePreset = (bpm: number) => {
    setSimBpm(bpm);
    pulsoidService.setManualBaseBpm(bpm);
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
                Xiaomi Smart Band 9 & Pulsoid
              </h3>
              <p className="text-xs text-rose-300/70">
                Transmisión continua de ritmo cardíaco
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
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 bg-black/50 p-1.5 rounded-xl border border-rose-900/30">
            <button
              onClick={() => setMode('live')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 font-medium text-xs transition ${
                mode === 'live'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md'
                  : 'text-rose-300/70 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>En Vivo (Mi Band 9)</span>
            </button>
            <button
              onClick={() => setMode('simulation')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 font-medium text-xs transition ${
                mode === 'simulation'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md'
                  : 'text-rose-300/70 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modo Simulación</span>
            </button>
          </div>

          {/* Live Pulsoid Configuration */}
          {mode === 'live' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-rose-200 mb-1">
                  Pulsoid Token / Feed Key
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Ej: f47ac10b-58cc-4372-a567-0e02b2c3d479"
                  className="w-full bg-black/60 border border-rose-800/50 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-rose-900/60 focus:outline-none focus:border-rose-400"
                />
                <p className="mt-1 text-[11px] text-rose-300/60">
                  Obtén tu token personal en <a href="https://pulsoid.net" target="_blank" rel="noreferrer" className="text-rose-400 underline inline-flex items-center gap-0.5">pulsoid.net <ExternalLink className="w-2.5 h-2.5" /></a>
                </p>
              </div>

              {/* Instructions toggle */}
              <button
                type="button"
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full py-2 px-3 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/30 flex items-center justify-between text-xs text-rose-300 transition"
              >
                <span className="flex items-center space-x-1.5">
                  <HelpCircle className="w-4 h-4 text-rose-400" />
                  <span>¿Cómo conectar Xiaomi Smart Band 9?</span>
                </span>
                <span className="text-rose-400 font-mono text-[10px]">
                  {showInstructions ? 'Ocultar' : 'Ver Guía'}
                </span>
              </button>

              {showInstructions && (
                <div className="p-3 bg-black/70 rounded-xl border border-rose-900/40 text-xs space-y-2 text-rose-200/90 leading-relaxed">
                  <div className="font-semibold text-rose-300">Paso a Paso Rápido:</div>
                  <ol className="list-decimal list-inside space-y-1.5 text-rose-200/80">
                    <li>Descarga en tu teléfono la app <strong>Notify for Xiaomi</strong> o <strong>Mi Fitness</strong> con sincronización de frecuencia cardíaca continua.</li>
                    <li>Crea una cuenta gratuita en <strong>Pulsoid.net</strong> e instala su app en tu smartphone.</li>
                    <li>En Pulsoid, tu pulsera Xiaomi Band 9 aparecerá como monitor de ritmo cardíaco por Bluetooth BLE.</li>
                    <li>En la web de Pulsoid, ve a <em>Integrations & Widgets</em> o <em>API Token</em>, copia tu <strong>Access Token</strong> y pégalo arriba.</li>
                    <li>¡Listo! Tu ritmo cardíaco se transmitirá continuamente a Verónica en tiempo real.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Simulation Mode Configuration */}
          {mode === 'simulation' && (
            <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-rose-900/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-200 flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ritmo Cardíaco Simulado:</span>
                </span>
                <span className="text-sm font-bold text-rose-400 font-mono">
                  {simBpm} BPM
                </span>
              </div>

              <input
                type="range"
                min="50"
                max="160"
                value={simBpm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSimBpm(val);
                  pulsoidService.setManualBaseBpm(val);
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
                  onClick={() => handlePreset(78)}
                  className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/50 rounded-lg text-[11px] text-rose-300 border border-rose-900/30 transition text-left"
                >
                  ✨ Tranquilo (78 BPM)
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(98)}
                  className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/50 rounded-lg text-[11px] text-rose-300 border border-rose-900/30 transition text-left"
                >
                  🥰 Enamorado (98 BPM)
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(125)}
                  className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/50 rounded-lg text-[11px] text-rose-300 border border-rose-900/30 transition text-left"
                >
                  💓 Emocionado (125 BPM)
                </button>
              </div>

              <p className="text-[11px] text-rose-300/60 leading-tight">
                * El modo simulación incluye arritmia sinusal respiratoria fisiológica realista (variación sutil automática según el ciclo de respiración).
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
