export type UserProfile = 'Demian' | 'Verónica';

export interface HeartbeatPayload {
  userId: UserProfile;
  bpm: number;
  source: 'pulsoid' | 'simulation' | 'ppg';
  temperature?: number;
  timestamp: number;
  rrInterval?: number;
}

export interface BeatInstantPayload {
  userId: UserProfile;
  timestamp: number;
  intensity?: number;
}

export interface PPGWaveSamplePayload {
  userId: UserProfile;
  bpm: number;
  value: number; // Normalized -1 to 1 or 0 to 1
  isFingerDetected: boolean;
  timestamp: number;
}

export interface UserStatusPayload {
  userId: UserProfile;
  isOnline: boolean;
  activeModule: 'band' | 'ppg' | 'idle';
  isFingerDetected?: boolean;
  batteryLevel?: number;
  lastSeen: number;
}

export interface RoomState {
  pin: string;
  users: Partial<Record<UserProfile, {
    socketId: string;
    status: UserStatusPayload;
    lastBpm?: number;
    lastBeatTime?: number;
  }>>;
}
