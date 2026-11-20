import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, Heart, AlertCircle, Fingerprint, Zap, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { UserProfile, BeatInstantPayload, PPGWaveSamplePayload, UserStatusPayload } from '../types';
import { PPGEngine } from '../utils/ppgEngine';
import { socketService } from '../services/socketService';
import { hapticsAudio } from '../utils/hapticsAudio';
import { wakeLock } from '../utils/wakeLock';

interface PPGCameraModuleProps {
  currentUser: UserProfile;
  partnerUser: UserProfile;
}

export const PPGCameraModule: React.FC<PPGCameraModuleProps> = ({
  currentUser,
  partnerUser
}) => {
  // PPG Camera and detection states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isFingerDetected, setIsFingerDetected] = useState<boolean>(false);
  const [myBpm, setMyBpm] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Partner status & mutual beats
  const [partnerConnected, setPartnerConnected] = useState<boolean>(false);
  const [partnerFingerDetected, setPartnerFingerDetected] = useState<boolean>(false);
  const [partnerBpm, setPartnerBpm] = useState<number>(0);

  // Visual beat flashes
  const [myBeatFlash, setMyBeatFlash] = useState<boolean>(false);
  const [partnerBeatFlash, setPartnerBeatFlash] = useState<boolean>(false);

  // Oscilloscope canvas references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const myWaveHistory = useRef<number[]>(new Array(160).fill(0));
  const partnerWaveHistory = useRef<number[]>(new Array(160).fill(0));
  const animationFrameRef = useRef<number | null>(null);

  // PPG Engine reference
  const ppgEngineRef = useRef<PPGEngine | null>(null);

  // Synchrony index calculation
  const hasBothFingers = isFingerDetected && partnerFingerDetected && myBpm > 40 && partnerBpm > 40;
  const bpmDiff = Math.abs(myBpm - partnerBpm);
  const synchronyPercent = Math.max(0, Math.min(100, Math.round(100 - bpmDiff * 3.5)));
  const hasCelebratedSync = useRef<boolean>(false);

  // Confetti when souls synchronize (< 3 BPM difference)
  useEffect(() => {
    if (hasBothFingers && synchronyPercent >= 92 && !hasCelebratedSync.current) {
      hasCelebratedSync.current = true;
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#fb7185', '#c084fc', '#ffffff']
      });
      hapticsAudio.vibrateLubDub();
      setTimeout(() => {
        hasCelebratedSync.current = false;
      }, 15000);
    }
  }, [hasBothFingers, synchronyPercent]);

  // Initialize Socket listeners for PPG cross-transmission
  useEffect(() => {
    // 1. Notify partner that user entered PPG module
    socketService.emitStatusUpdate({
      userId: currentUser,
      activeModule: 'ppg',
      isOnline: true
    });

    // 2. Partner instantaneous systolic beat (VIBRATE INSTANTLY!)
    const unsubBeat = socketService.onBeatInstant((payload: BeatInstantPayload) => {
      if (payload.userId === partnerUser) {
        // Trigger instant haptic vibration on receiver's phone!
        hapticsAudio.vibrateSingleBeat(70);

        // Visual flash
        setPartnerBeatFlash(true);
        setTimeout(() => setPartnerBeatFlash(false), 140);
      }
    });

    // 3. Partner PPG waveform sample (for dual oscilloscope)
    const unsubWave = socketService.onPPGWaveform((payload: PPGWaveSamplePayload) => {
      if (payload.userId === partnerUser) {
        partnerWaveHistory.current.push(payload.value);
        if (partnerWaveHistory.current.length > 160) {
          partnerWaveHistory.current.shift();
        }
        if (payload.bpm > 0) {
          setPartnerBpm(payload.bpm);
        }
        setPartnerFingerDetected(payload.isFingerDetected);
      }
    });

    // 4. Partner presence
    const unsubPartner = socketService.onPartnerStatus((status: UserStatusPayload) => {
      if (status.userId === partnerUser) {
        setPartnerConnected(status.isOnline);
        if (status.isFingerDetected !== undefined) {
          setPartnerFingerDetected(status.isFingerDetected);
        }
      }
    });

    return () => {
      unsubBeat();
      unsubWave();
      unsubPartner();
      if (ppgEngineRef.current) {
        ppgEngineRef.current.stop();
      }
    };
  }, [currentUser, partnerUser]);

  // Oscilloscope Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const w = canvas.width;
      const h = canvas.height;

      // Dark background with faint romantic grid
      ctx.fillStyle = '#090308';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw My Arterial Pulse Wave (Top Half, Crimson Neon)
      const myYBase = h * 0.32;
      ctx.beginPath();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#e11d48';
      ctx.shadowBlur = 10;

      const myData = myWaveHistory.current;
      for (let i = 0; i < myData.length; i++) {
        const x = (i / (myData.length - 1)) * w;
        const y = myYBase - myData[i] * 32;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Partner's Arterial Pulse Wave (Bottom Half, Violet Neon)
      const partnerYBase = h * 0.72;
      ctx.beginPath();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;

      const partnerData = partnerWaveHistory.current;
      for (let i = 0; i < partnerData.length; i++) {
        const x = (i / (partnerData.length - 1)) * w;
        const y = partnerYBase - partnerData[i] * 32;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Start Camera and PPG Processing
  const handleStartPPG = async () => {
    setErrorMessage(null);
    wakeLock.request();

    const engine = new PPGEngine({
      onBeat: (bpm, timestamp) => {
        setMyBpm(bpm);
        setMyBeatFlash(true);
        setTimeout(() => setMyBeatFlash(false), 120);

        // Vibrate local device subtly
        hapticsAudio.vibrateSingleBeat(50);

        // EMIT INSTANT SYSTOLIC BEAT TO PARTNER VIA WEBSOCKET!
        socketService.emitBeatInstant({
          userId: currentUser,
          timestamp
        });
      },
      onWaveSample: (normalizedValue, fingerDetected) => {
        // Push to local wave buffer
        myWaveHistory.current.push(normalizedValue);
        if (myWaveHistory.current.length > 160) {
          myWaveHistory.current.shift();
        }

        // Broadcast sample to partner for dual oscilloscope
        socketService.emitPPGWaveform({
          userId: currentUser,
          bpm: ppgEngineRef.current?.getBpm() || 0,
          value: normalizedValue,
          isFingerDetected: fingerDetected,
          timestamp: Date.now()
        });
      },
      onFingerStatusChange: (detected) => {
        setIsFingerDetected(detected);
        socketService.emitStatusUpdate({
          userId: currentUser,
          isFingerDetected: detected
        });
      },
      onError: (err) => {
        setErrorMessage(err);
        setIsCameraActive(false);
      }
    });

    ppgEngineRef.current = engine;
    const success = await engine.start();
    setIsCameraActive(success);
  };

  const handleStopPPG = () => {
    if (ppgEngineRef.current) {
      ppgEngineRef.current.stop();
      ppgEngineRef.current = null;
    }
    setIsCameraActive(false);
    setIsFingerDetected(false);
    socketService.emitStatusUpdate({
      userId: currentUser,
      isFingerDetected: false
    });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-20">
      {/* Intimate Module Description */}
      <div className="glass-panel rounded-2xl px-4 py-3 border border-purple-900/40 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center space-x-1.5">
            <span>Latidos en Pareja</span>
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          </h2>
          <p className="text-[11px] text-purple-200/70">
            Un momento íntimo juntos para sincronizar y sentir sus corazones en tiempo real
          </p>
        </div>
      </div>

      {/* Intimate Session Header Status */}
      <div className="glass-panel rounded-2xl p-3.5 border border-rose-900/40 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              partnerConnected
                ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <div>
            <div className="font-semibold text-rose-100 flex items-center space-x-1.5">
              <span>{partnerUser}</span>
              <span className="text-[10px] text-rose-400/80">
                {partnerConnected ? '• Conectado/a en Vivo' : '• Esperando conexión...'}
              </span>
            </div>
            <div className="text-[10px] text-rose-300/60">
              {partnerFingerDetected
                ? 'Dedo en cámara detectado ✨'
                : 'Esperando que coloque el dedo'}
            </div>
          </div>
        </div>

        {/* Mutual Heartbeat Synchrony Score */}
        {hasBothFingers && (
          <div className="bg-gradient-to-r from-rose-900/60 to-purple-900/60 px-3 py-1.5 rounded-xl border border-rose-500/40 text-center animate-pulse">
            <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider block">
              Sincronía
            </span>
            <span className="text-base font-black text-white font-mono">
              {synchronyPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Camera Guidance & Finger Sensor Panel */}
      <div className="glass-panel-active rounded-3xl p-5 border border-rose-500/30 text-center relative overflow-hidden">
        {/* Background Radial Glow */}
        <div className="absolute inset-0 bg-radial-at-c from-rose-900/20 via-transparent to-transparent pointer-events-none" />

        {/* Live Flashing Hearts (Cross-Triggered by Instant Sockets) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* My Beat Card */}
          <motion.div
            animate={{
              scale: myBeatFlash ? 1.08 : 1,
              borderColor: myBeatFlash ? 'rgba(244, 63, 94, 0.9)' : 'rgba(244, 63, 94, 0.25)',
              boxShadow: myBeatFlash
                ? '0 0 25px rgba(244, 63, 94, 0.7)'
                : '0 0 0px transparent'
            }}
            transition={{ duration: 0.12 }}
            className="p-3.5 rounded-2xl bg-black/60 border text-center transition-colors"
          >
            <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-rose-300 mb-1">
              <Heart className={`w-3.5 h-3.5 ${myBeatFlash ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} />
              <span>Tú ({currentUser})</span>
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {isFingerDetected && myBpm > 0 ? myBpm : '--'}
            </div>
            <div className="text-[10px] text-rose-400/80 font-mono mt-0.5">
              {isFingerDetected ? 'Sístole activa' : 'Sin lectura'}
            </div>
          </motion.div>

          {/* Partner's Beat Card (Flashes in millisecond of partner systolic peak!) */}
          <motion.div
            animate={{
              scale: partnerBeatFlash ? 1.08 : 1,
              borderColor: partnerBeatFlash ? 'rgba(192, 132, 252, 0.9)' : 'rgba(192, 132, 252, 0.25)',
              boxShadow: partnerBeatFlash
                ? '0 0 25px rgba(192, 132, 252, 0.7)'
                : '0 0 0px transparent'
            }}
            transition={{ duration: 0.12 }}
            className="p-3.5 rounded-2xl bg-black/60 border text-center transition-colors"
          >
            <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-purple-300 mb-1">
              <Heart className={`w-3.5 h-3.5 ${partnerBeatFlash ? 'fill-purple-500 text-purple-500' : 'text-purple-400'}`} />
              <span>{partnerUser}</span>
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {partnerFingerDetected && partnerBpm > 0 ? partnerBpm : '--'}
            </div>
            <div className="text-[10px] text-purple-400/80 font-mono mt-0.5">
              {partnerBeatFlash ? '¡Latido recibido!' : partnerFingerDetected ? 'Sincronizado' : 'Esperando'}
            </div>
          </motion.div>
        </div>

        {/* Dual Wave Arterial Pulse Oscilloscope Canvas */}
        <div className="relative rounded-2xl overflow-hidden border border-rose-900/40 bg-black/80 p-2 shadow-inner">
          <div className="flex items-center justify-between text-[11px] px-2 pb-1 text-rose-300/80 border-b border-rose-900/30">
            <span className="flex items-center space-x-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Onda PPG: {currentUser}</span>
            </span>
            <span className="flex items-center space-x-1 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              <span>Onda PPG: {partnerUser}</span>
            </span>
          </div>

          <canvas
            ref={canvasRef}
            width={340}
            height={130}
            className="w-full h-32 block my-1"
          />

          <div className="text-[9px] text-center text-rose-300/50 uppercase tracking-widest pb-0.5">
            Filtro Paso Banda 0.7 Hz - 3.5 Hz • Sincronización Sub-100ms
          </div>
        </div>

        {/* Finger Placement Guidance Banner */}
        {isCameraActive && !isFingerDetected && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center space-x-2.5 text-left"
          >
            <div className="p-2 rounded-lg bg-rose-600/30 text-rose-400 flex-shrink-0">
              <Fingerprint className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-rose-100">
                Coloca la yema de tu dedo
              </div>
              <div className="text-[11px] text-rose-300/80 leading-snug">
                Cubre suavemente el lente de la cámara trasera principal y el flash con tu dedo índice.
              </div>
            </div>
          </motion.div>
        )}

        {isCameraActive && isFingerDetected && (
          <div className="mt-3 py-1.5 px-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Dedo detectado correctamente • Procesando pulso sanguíneo</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center space-x-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Start / Stop Camera Action Button */}
        <div className="mt-5">
          {!isCameraActive ? (
            <button
              onClick={handleStartPPG}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-purple-600 text-white font-bold text-sm shadow-xl shadow-rose-950/60 active:scale-95 transition flex items-center justify-center space-x-2"
            >
              <Camera className="w-5 h-5 text-rose-100" />
              <span>Activar Sensor Óptico de Cámara</span>
            </button>
          ) : (
            <button
              onClick={handleStopPPG}
              className="w-full py-3 px-5 rounded-2xl bg-black/60 hover:bg-black/80 border border-rose-800/50 text-rose-300 font-semibold text-xs active:scale-95 transition flex items-center justify-center space-x-2"
            >
              <CameraOff className="w-4 h-4 text-rose-400" />
              <span>Detener Cámara y Flash</span>
            </button>
          )}
        </div>
      </div>

      {/* Intimate Instructions Card */}
      <div className="glass-panel rounded-2xl p-4 border border-rose-900/30 text-xs text-rose-200/80 space-y-2">
        <div className="font-bold text-rose-300 flex items-center space-x-1.5">
          <Zap className="w-4 h-4 text-rose-400" />
          <span>Vibración Mutua Instantánea:</span>
        </div>
        <p className="leading-relaxed">
          Cada vez que tu sangre fluye en tu dedo (sístole), el teléfono de <strong>{partnerUser}</strong> vibrará en el milisegundo exacto, y su pantalla destellará al compás de tu corazón.
        </p>
      </div>
    </div>
  );
};
