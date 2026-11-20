import React, { useState, useEffect } from 'react';
import { CloudSun, Flame, Heart, Smartphone, SlidersHorizontal } from 'lucide-react';
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
  // View mode: 'partner' (feeling partner's heart) vs 'mine' (monitoring my transmission)
  const [viewTarget, setViewTarget] = useState<'partner' | 'mine'>('partner');

  // Local user's heart rate state
  const [myBpm, setMyBpm] = useState<number>(74);
  const [mySourceStatus, setMySourceStatus] = useState<string>('Simulación Inteligente (En Reposo)');

  // Partner's incoming heart rate state
  const [partnerBpm, setPartnerBpm] = useState<number>(76);
  const [partnerSource, setPartnerSource] = useState<string>('Último latido / En reposo');
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
    // 1. Initial weather fetch
    temperatureEngine.fetchAmbientWeather().then((w) => setWeatherInfo(w));

    // 2. Periodic physiological temperature update (every 15 seconds)
    const tempInterval = setInterval(() => {
      const activeBpm = viewTarget === 'partner' ? partnerBpm : myBpm;
      const updated = temperatureEngine.calculateBodyTemperature(activeBpm);
      setSkinTemp(updated);
    }, 15000);

    // Initial calculation
    setSkinTemp(temperatureEngine.calculateBodyTemperature(viewTarget === 'partner' ? partnerBpm : myBpm));

    return () => clearInterval(tempInterval);
  }, [viewTarget, partnerBpm, myBpm]);

  // Subscribe to local Pulsoid stream / simulation
  useEffect(() => {
    const unsubscribePulsoid = pulsoidService.subscribe((data: PulsoidData) => {
      setMyBpm(data.heartRate);
      setMySourceStatus(data.statusText);

      // Broadcast to partner over WebSocket
      socketService.emitBandHeartbeat({
        userId: currentUser,
        bpm: data.heartRate,
        source: data.source,
        timestamp: data.timestamp,
        temperature: skinTemp.celsius
      });
    });

    return () => unsubscribePulsoid();
  }, [currentUser, skinTemp.celsius]);

  // Subscribe to partner's incoming heartbeat via WebSocket
  useEffect(() => {
    const unsubPartner = socketService.onBandHeartbeat((payload: HeartbeatPayload) => {
      if (payload.userId === partnerUser) {
        setPartnerBpm(payload.bpm);
        setPartnerSource(payload.source === 'pulsoid' ? 'En vivo desde Mi Band 9' : 'Último latido / En reposo');
        setIsPartnerConnected(true);
      }
    });

    return () => unsubPartner();
  }, [partnerUser]);

  // Trigger double haptic pulse ("lub-dub") whenever partner's heart beats
  const handlePartnerBeatTrigger = () => {
    if (viewTarget === 'partner') {
      hapticsAudio.vibrateLubDub();
    }
  };

  const handleMyBeatTrigger = () => {
    if (viewTarget === 'mine') {
      hapticsAudio.vibrateLubDub();
    }
  };

  const displayedBpm = viewTarget === 'partner' ? partnerBpm : myBpm;
  const displayedUser = viewTarget === 'partner' ? partnerUser : currentUser;
  const displayedSource = viewTarget === 'partner' ? partnerSource : mySourceStatus;
  const isTargetPartner = viewTarget === 'partner';

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-20">
      {/* Target Selector: Partner's Heart vs My Heart */}
      <div className="bg-black/50 p-1 rounded-2xl border border-rose-900/30 flex items-center shadow-inner">
        <button
          onClick={() => {
            setViewTarget('partner');
            hapticsAudio.vibrateSingleBeat(30);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            isTargetPartner
              ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white shadow-md'
              : 'text-rose-300/70 hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4 fill-current text-rose-200" />
          <span>Sintiendo a {partnerUser}</span>
        </button>

        <button
          onClick={() => {
            setViewTarget('mine');
            hapticsAudio.vibrateSingleBeat(30);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            !isTargetPartner
              ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md'
              : 'text-purple-300/70 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4 text-purple-200" />
          <span>Mi Transmisión</span>
        </button>
      </div>

      {/* Main Organic Beating Heart */}
      <div className="glass-panel rounded-3xl p-4 border border-rose-900/30 relative overflow-hidden">
        <div className="flex items-center justify-between mb-1 px-2">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-semibold text-rose-200 uppercase tracking-wider">
              {isTargetPartner ? `Ritmo Cardíaco de ${partnerUser}` : 'Tu Ritmo Transmitido'}
            </span>
          </div>

          <button
            onClick={onOpenPulsoidConfig}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-950/40 hover:bg-rose-900/50 text-[11px] text-rose-300 border border-rose-800/40 transition active:scale-95"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Ajustar Banda</span>
          </button>
        </div>

        <OrganicHeart
          bpm={displayedBpm}
          userName={displayedUser}
          isPartner={isTargetPartner}
          sourceText={displayedSource}
          temperature={skinTemp.formatted}
          subtitle={
            isTargetPartner
              ? `Vibración háptica activa: tu teléfono late con el pulso exacto de ${partnerUser}.`
              : `Transmitiendo continuamente tu pulso a ${partnerUser} vía WebSockets.`
          }
          onBeatTrigger={isTargetPartner ? handlePartnerBeatTrigger : handleMyBeatTrigger}
          accentColor={isTargetPartner ? 'crimson' : 'violet'}
        />
      </div>

      {/* Temperature & Physiological Biometrics Card */}
      <div className="glass-panel rounded-2xl p-4 border border-rose-900/30 grid grid-cols-2 gap-3 text-xs">
        {/* Skin Temperature Estimation */}
        <div className="bg-black/40 p-3 rounded-xl border border-rose-900/20">
          <div className="flex items-center space-x-1.5 text-rose-400 font-semibold mb-1">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>Temp. Cutánea</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {skinTemp.formatted}
          </div>
          <p className="text-[10px] text-rose-300/60 mt-1 leading-tight">
            {skinTemp.state === 'warm'
              ? 'Tibia / Emocionada (>95 BPM)'
              : skinTemp.state === 'cool'
              ? 'Fresca / Relajada en reposo'
              : 'Temperatura fisiológica óptima'}
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
            {isPartnerConnected
              ? `${partnerUser} está en línea sincronizado`
              : `Esperando a ${partnerUser}...`}
          </span>
        </div>
        <span className="text-[10px] font-mono text-rose-400/80">
          {displayedBpm} BPM
        </span>
      </div>
    </div>
  );
};
