import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Flame, Sparkles } from 'lucide-react';
import type { UserProfile } from '../types';

interface OrganicHeartProps {
  bpm: number;
  userName: UserProfile;
  subtitle?: string;
  sourceText?: string;
  temperature?: string;
  isPartner?: boolean;
  onBeatTrigger?: () => void;
  accentColor?: 'crimson' | 'violet' | 'amber';
}

export const OrganicHeart: React.FC<OrganicHeartProps> = ({
  bpm,
  userName,
  subtitle = 'Latido en vivo',
  sourceText = 'Mi Band 9',
  temperature,
  isPartner = false,
  onBeatTrigger,
  accentColor = 'crimson'
}) => {
  const [pulseCount, setPulseCount] = useState<number>(0);
  const [ripples, setRipples] = useState<{ id: number }[]>([]);

  // Calculate physiological cardiac interval (RR interval in ms)
  const safeBpm = Math.max(40, Math.min(220, bpm || 72));
  const rrIntervalMs = Math.round(60000 / safeBpm);

  // Trigger organic cardiac pulse aligned with BPM
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseCount((c) => c + 1);

      // Create glowing ripple on beat
      const rippleId = Date.now();
      setRipples((prev) => [...prev.slice(-3), { id: rippleId }]);

      if (onBeatTrigger) {
        onBeatTrigger();
      }
    }, rrIntervalMs);

    return () => clearInterval(interval);
  }, [rrIntervalMs, onBeatTrigger]);

  // Clean up old ripples
  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples((prev) => prev.filter((r) => Date.now() - r.id < 1200));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [ripples]);

  // Heart color schemes
  const colorGradients = {
    crimson: {
      from: '#e11d48',
      via: '#9f1239',
      to: '#4c0519',
      glow: 'rgba(225, 29, 72, 0.55)',
      badge: 'border-rose-500/40 text-rose-300 bg-rose-950/50'
    },
    violet: {
      from: '#c084fc',
      via: '#7e22ce',
      to: '#3b0764',
      glow: 'rgba(192, 132, 252, 0.55)',
      badge: 'border-purple-500/40 text-purple-300 bg-purple-950/50'
    },
    amber: {
      from: '#fbbf24',
      via: '#b45309',
      to: '#451a03',
      glow: 'rgba(251, 191, 36, 0.55)',
      badge: 'border-amber-500/40 text-amber-300 bg-amber-950/50'
    }
  }[accentColor];

  return (
    <div className="relative flex flex-col items-center justify-center py-6 px-4 select-none">
      {/* Background Radiating Shockwaves / Ripples */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.div
              key={ripple.id}
              initial={{ scale: 0.8, opacity: 0.75 }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="absolute w-44 h-44 rounded-full border border-rose-500/35"
              style={{
                boxShadow: `0 0 45px ${colorGradients.glow}`
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Main 3D / SVG Animated Beating Heart Container */}
      <motion.div
        key={pulseCount}
        animate={{
          scale: [1, 1.15, 1.05, 1.18, 1],
          filter: [
            `drop-shadow(0 0 20px ${colorGradients.glow})`,
            `drop-shadow(0 0 50px ${colorGradients.glow})`,
            `drop-shadow(0 0 30px ${colorGradients.glow})`,
            `drop-shadow(0 0 55px ${colorGradients.glow})`,
            `drop-shadow(0 0 20px ${colorGradients.glow})`
          ]
        }}
        transition={{
          duration: 0.55,
          times: [0, 0.15, 0.3, 0.45, 1],
          ease: 'easeInOut'
        }}
        className="relative z-10 w-60 h-60 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
      >
        {/* Heart SVG Path with Multi-stop Gradient */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full filter"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <radialGradient id={`heartGrad-${userName}`} cx="45%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="25%" stopColor={colorGradients.from} />
              <stop offset="70%" stopColor={colorGradients.via} />
              <stop offset="100%" stopColor={colorGradients.to} />
            </radialGradient>
            <linearGradient id={`heartStroke-${userName}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbcfe8" stopOpacity="0.8" />
              <stop offset="100%" stopColor={colorGradients.from} stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Organic Heart Silhouette */}
          <path
            d="M 50,30 
               A 20,20 0,0,0 15,35 
               C 15,55 35,72 50,88 
               C 65,72 85,55 85,35 
               A 20,20 0,0,0 50,30 Z"
            fill={`url(#heartGrad-${userName})`}
            stroke={`url(#heartStroke-${userName})`}
            strokeWidth="1.2"
          />

          {/* Inner Light Reflection / Glint */}
          <path
            d="M 28,26 C 24,30 22,38 24,45 C 25,48 27,45 28,40 C 29,34 32,30 36,27 Z"
            fill="rgba(255, 255, 255, 0.55)"
            className="pointer-events-none"
          />
        </svg>

        {/* Floating Center BPM Information Inside Heart */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-2">
          <span className="text-[11px] font-medium tracking-widest uppercase text-rose-200/80 drop-shadow">
            {isPartner ? `Corazón de ${userName}` : `Tu Corazón`}
          </span>

          <div className="flex items-baseline space-x-1">
            <span className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] font-mono">
              {safeBpm}
            </span>
            <span className="text-xs font-bold text-rose-200 uppercase tracking-wider">
              BPM
            </span>
          </div>

          {/* Animated heartbeat wave icon */}
          <div className="flex items-center space-x-1 mt-0.5 text-rose-200/90 text-[11px]">
            <Activity className="w-3.5 h-3.5 animate-pulse text-white" />
            <span className="font-mono text-[10px]">{rrIntervalMs}ms RR</span>
          </div>
        </div>
      </motion.div>

      {/* Meta Indicators: Temperature & Source Badge */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 z-10">
        {/* Source Badge */}
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center space-x-1.5 shadow-sm ${colorGradients.badge}`}>
          <Sparkles className="w-3 h-3 text-rose-300" />
          <span>{sourceText}</span>
        </div>

        {/* Temperature Badge if available */}
        {temperature && (
          <div className="px-2.5 py-1 rounded-full text-xs font-medium border border-rose-500/30 text-rose-100 bg-black/40 flex items-center space-x-1.5 shadow-sm">
            <Flame className="w-3 h-3 text-rose-400" />
            <span>Piel: <strong className="text-white font-mono">{temperature}</strong></span>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-rose-300/60 text-center max-w-xs">
        {subtitle}
      </p>
    </div>
  );
};
