import React, { useState, useEffect } from 'react';
import { CloudSun, Flame, Heart, SlidersHorizontal, Bell, Radio, Check, Sparkles, Send, Activity } from 'lucide-react';
import type { UserProfile, HeartbeatPayload, WeatherData } from '../types';
import { OrganicHeart } from './OrganicHeart';
import { pulsoidService, type PulsoidData } from '../services/pulsoidService';
import { socketService } from '../services/socketService';
import { temperatureEngine } from '../utils/temperatureEngine';
import { hapticsAudio } from '../utils/hapticsAudio';

interface LiveBandModuleProps {
  currentUser: UserProfile;
  partnerUser: UserProfile;
  onOpenPulsoidConfig: () => void;
}

export const LiveBandModule: React.FC<LiveBandModuleProps> = ({
  currentUser,
  partnerUser,
  onOpenPulsoidConfig
}) => {
  const isDemian = currentUser === 'Demian';

  // Demian's heart rate state (transmitted to Veronica)
  const [demianBpm, setDemianBpm] = useState<number>(() => pulsoidService.getBaseBpm() || 74);
  const [demianSourceStatus, setDemianSourceStatus] = useState<string>('En vivo desde Notificación Pulsoid (Mi Band 9)');

  // Quick sync input for Demian
  const [manualSyncBpm, setManualSyncBpm] = useState<number>(demianBpm);
  const [syncFeedback, setSyncFeedback] = useState<boolean>(false);

  // Partner status
  const [isPartnerConnected, setIsPartnerConnected] = useState<boolean>(false);

  // Simulated body temperature
  const [skinTemp, setSkinTemp] = useState<{
    celsius: number;
    formatted: string;
    ambientTemp: number;
    state: 'cool' | 'normal' | 'warm';
  }>({
    celsius: 36.6,
    formatted: '36.6°C',
    ambientTemp: 22.0,
    state: 'normal'
  });

  const [weatherInfo, setWeatherInfo] = useState<WeatherData>({
    temperature: 22.0,
    weatherCode: 0,
    locationName: 'Local',
    isLoaded: false
  });

  // Track interval for temperature engine updates
  useEffect(() => {
    temperatureEngine.fetchAmbientWeather().then((w) => setWeatherInfo(w));

    const tempInterval = setInterval(() => {
      const updated = temperatureEngine.calculateBodyTemperature(demianBpm);
      setSkinTemp(updated);
    }, 15000);

    setSkinTemp(temperatureEngine.calculateBodyTemperature(demianBpm));

    return () => clearInterval(tempInterval);
  }, [demianBpm]);

  // If user is Demian: subscribe to local Pulsoid/Notification stream and broadcast to Veronica
  useEffect(() => {
    if (isDemian) {
      const unsubscribePulsoid = pulsoidService.subscribe((data: PulsoidData) => {
        setDemianBpm(data.heartRate);
        setDemianSourceStatus(data.statusText);

        // Broadcast Demian's heart to Veronica via WebSockets
        socketService.emitBandHeartbeat({
          userId: 'Demian',
          bpm: data.heartRate,
          source: data.source,
          timestamp: data.timestamp,
          temperature: skinTemp.celsius
        });
      });

      return () => unsubscribePulsoid();
    }
  }, [isDemian, skinTemp.celsius]);

  // If user is Veronica: listen to incoming heartbeats from Demian
  useEffect(() => {
    if (!isDemian) {
      const unsubPartner = socketService.onBandHeartbeat((payload: HeartbeatPayload) => {
        if (payload.userId === 'Demian') {
          setDemianBpm(payload.bpm);
          if (payload.temperature) {
            setSkinTemp((prev) => ({
              ...prev,
              celsius: payload.temperature!,
              formatted: `${payload.temperature!.toFixed(1)}°C`
            }));
          }
          setDemianSourceStatus(
            payload.source === 'pulsoid'
              ? 'En vivo desde Pulsoid (Xiaomi Band 9)'
              : payload.source === 'notification'
              ? 'En vivo desde Notificación Pulsoid (Mi Band 9)'
              : 'Último latido de Demian'
          );
          setIsPartnerConnected(true);
        }
      });

      // Quick fetch of server Pulsoid bridge for instant BPM display
      const serverUrl = localStorage.getItem('latidos_server_url') || '';
      const endpoint = serverUrl ? `${serverUrl.replace(/\/$/, '')}/api/pulsoid/status` : '/api/pulsoid/status';
      fetch(endpoint)
        .then(r => r.json())
        .then(data => {
          if (data && data.lastBpm && (Date.now() - (data.lastSeen || 0) < 180000)) {
            setDemianBpm(data.lastBpm);
            setDemianSourceStatus('En vivo desde Pulsoid (Xiaomi Band 9)');
            setIsPartnerConnected(true);
          }
        })
        .catch(() => {});

      return () => unsubPartner();
    }
  }, [isDemian]);

  // When heart beats:
  // If Veronica is viewing, HER phone vibrates double ("lub-dub")
  const handleBeatTrigger = () => {
    if (!isDemian) {
      hapticsAudio.vibrateLubDub();
    }
  };

  const handleApplyBpm = (bpmToApply: number) => {
    const safe = Math.max(50, Math.min(180, Math.round(bpmToApply)));
    setManualSyncBpm(safe);
    setDemianBpm(safe);
    pulsoidService.setBaseBpm(safe);
    hapticsAudio.vibrateSingleBeat(40);
    setSyncFeedback(true);
    setTimeout(() => setSyncFeedback(false), 1200);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-20">
      {/* Intimate Section Header */}
      <div className="glass-panel rounded-2xl px-4 py-3 border border-rose-900/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-rose-950/60">
            D
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>{isDemian ? 'Tus Latidos para Verónica' : 'El Corazón de Demian'}</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </h2>
            <p className="text-[11px] text-rose-300/70">
              {isDemian
                ? 'Transmitiendo tu pulso cardíaco en vivo a su celular'
                : 'Sintiendo los latidos reales de Demian en tu mano'}
            </p>
          </div>
        </div>

        {isDemian && (
          <button
            onClick={onOpenPulsoidConfig}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/50 text-[11px] text-rose-300 border border-rose-800/40 transition active:scale-95"
            title="Opciones de Pulsoid y Token de Pago"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
            <span>Ajustes</span>
          </button>
        )}
      </div>

      {/* Main Organic Beating Heart of Demian */}
      <div className="glass-panel-active rounded-3xl p-4 border border-rose-500/30 relative overflow-hidden text-center">
        <OrganicHeart
          bpm={demianBpm}
          userName="Demian"
          isPartner={!isDemian}
          sourceText={demianSourceStatus}
          temperature={skinTemp.formatted}
          subtitle={
            isDemian
              ? 'Tu Xiaomi Band 9 transmite cada latido directamente al celular de Verónica.'
              : 'Tu teléfono vibra en sincronía con cada latido que llega desde el pecho de Demian.'
          }
          onBeatTrigger={handleBeatTrigger}
          accentColor="crimson"
        />
      </div>

      {/* Temperature & Environmental Biometrics Card */}
      <div className="glass-panel rounded-2xl p-4 border border-rose-900/30 grid grid-cols-2 gap-3 text-xs">
        {/* Demian's Skin Temperature */}
        <div className="bg-black/40 p-3 rounded-xl border border-rose-900/20">
          <div className="flex items-center space-x-1.5 text-rose-400 font-semibold mb-1">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>{isDemian ? 'Tu Temp. Cutánea' : 'Piel de Demian'}</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {skinTemp.formatted}
          </div>
          <p className="text-[10px] text-rose-300/60 mt-1 leading-tight">
            {skinTemp.state === 'warm'
              ? 'Tibia / Emocionado (>95 BPM)'
              : skinTemp.state === 'cool'
              ? 'Fresca / En reposo tranquilo'
              : 'Temperatura fisiológica cálida'}
          </p>
        </div>

        {/* Ambient Weather via Open-Meteo */}
        <div className="bg-black/40 p-3 rounded-xl border border-rose-900/20">
          <div className="flex items-center space-x-1.5 text-purple-400 font-semibold mb-1">
            <CloudSun className="w-4 h-4 text-purple-400" />
            <span>Clima Exterior</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {weatherInfo.temperature.toFixed(1)}°C
          </div>
          <p className="text-[10px] text-purple-300/60 mt-1 leading-tight">
            Open-Meteo API • Influye sutilmente en la piel
          </p>
        </div>
      </div>

      {/* Demian's Automatic Widget Banner & Quick Calibration */}
      {isDemian && (
        <div className="space-y-3">
          {/* Automatic 24/7 Widget Status Card */}
          <div className="glass-panel rounded-2xl p-4 border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-black/60 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Transmisión Automática 24/7 (Pulsoid Widget):</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                Activa
              </span>
            </div>

            <p className="text-[11px] text-emerald-100/80 leading-relaxed">
              Verónica recibe tus latidos en tiempo real incluso si <strong>cierras esta app</strong>, siempre que tengas puesta tu Mi Band 9 con la app de Pulsoid abierta en tu teléfono.
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-emerald-400/90 truncate max-w-[220px]">
                Widget: {pulsoidService.getWidgetSlug()}
              </span>
              <button
                onClick={onOpenPulsoidConfig}
                className="text-[10px] text-emerald-300 hover:text-white underline font-medium"
              >
                Cambiar enlace / Modo
              </button>
            </div>
          </div>

          {/* Optional Manual Stepper / Notification Sync */}
          <div className="glass-panel rounded-2xl p-4 border border-rose-900/40 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-200 font-bold">
                <Bell className="w-4 h-4 text-rose-400" />
                <span>Calibración Manual / Sin Internet:</span>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400">
                {manualSyncBpm} BPM
              </span>
            </div>

          <p className="text-[11px] text-rose-300/70 leading-relaxed">
            Como la app de Pulsoid muestra tus BPM en la barra de notificaciones de tu teléfono, puedes ajustar o calibrar tu pulso base aquí con 1 toque (100% gratuito sin pagar el token):
          </p>

          {/* Stepper Buttons and Slider */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleApplyBpm(manualSyncBpm - 5)}
              className="py-1.5 px-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/40 text-rose-300 font-bold active:scale-95"
            >
              -5
            </button>
            <button
              onClick={() => handleApplyBpm(manualSyncBpm - 1)}
              className="py-1.5 px-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/40 text-rose-300 font-bold active:scale-95"
            >
              -1
            </button>
            
            <input
              type="range"
              min="50"
              max="160"
              value={manualSyncBpm}
              onChange={(e) => handleApplyBpm(Number(e.target.value))}
              className="flex-1 accent-rose-500 cursor-pointer"
            />

            <button
              onClick={() => handleApplyBpm(manualSyncBpm + 1)}
              className="py-1.5 px-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/40 text-rose-300 font-bold active:scale-95"
            >
              +1
            </button>
            <button
              onClick={() => handleApplyBpm(manualSyncBpm + 5)}
              className="py-1.5 px-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/40 text-rose-300 font-bold active:scale-95"
            >
              +5
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => handleApplyBpm(66)}
              className="py-1.5 px-2 bg-black/50 hover:bg-rose-950/60 rounded-xl text-[11px] text-rose-300/80 border border-rose-900/30 text-left transition"
            >
              😴 En Reposo (66 BPM)
            </button>
            <button
              onClick={() => handleApplyBpm(78)}
              className="py-1.5 px-2 bg-black/50 hover:bg-rose-950/60 rounded-xl text-[11px] text-rose-300/80 border border-rose-900/30 text-left transition"
            >
              ✨ Tranquilo (78 BPM)
            </button>
            <button
              onClick={() => handleApplyBpm(96)}
              className="py-1.5 px-2 bg-black/50 hover:bg-rose-950/60 rounded-xl text-[11px] text-rose-300/80 border border-rose-900/30 text-left transition"
            >
              🥰 Pensando en Verónica (96 BPM)
            </button>
            <button
              onClick={() => handleApplyBpm(118)}
              className="py-1.5 px-2 bg-black/50 hover:bg-rose-950/60 rounded-xl text-[11px] text-rose-300/80 border border-rose-900/30 text-left transition"
            >
              💓 Emocionado / Cardio (118 BPM)
            </button>
          </div>

          {syncFeedback && (
            <div className="p-2 bg-rose-900/40 border border-rose-500/50 rounded-xl text-center text-rose-200 text-xs font-semibold flex items-center justify-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-rose-300" />
              <span>¡Pulso sincronizado y transmitido a Verónica!</span>
            </div>
          )}
        </div>
      </div>
    )}

      {/* Partner Connection Banner */}
      <div className="glass-panel rounded-xl px-3.5 py-2.5 border border-rose-900/30 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isPartnerConnected
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="text-rose-200">
            {isDemian
              ? (isPartnerConnected ? 'Verónica está en línea sintiendo tus latidos ✨' : 'Esperando a que Verónica abra la app...')
              : (isPartnerConnected ? 'Conectada con el corazón de Demian en vivo' : 'Esperando señal de Demian...')}
          </span>
        </div>
        <span className="text-[10px] font-mono text-rose-400/80">
          {demianBpm} BPM
        </span>
      </div>
    </div>
  );
};
