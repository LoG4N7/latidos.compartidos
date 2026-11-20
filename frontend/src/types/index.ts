export type UserProfile = 'Demian' | 'Verónica';

export interface HeartbeatPayload {
  userId: UserProfile;
  bpm: number;
  source: 'notification' | 'pulsoid' | 'simulation' | 'ppg';
  temperature?: number;
  timestamp: number;
  rrInterval?: number;
}

export interface BeatInstantPayload {
  userId: UserProfile;
  timestamp: number;
  intensity?: number;
  relayedAt?: number;
}

export interface PPGWaveSamplePayload {
  userId: UserProfile;
  bpm: number;
  value: number; // Normalized pulse value (-1 to 1)
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
  myUser: UserProfile;
  users: Partial<Record<UserProfile, {
    socketId: string;
    status: UserStatusPayload;
    lastBpm?: number;
    lastBeatTime?: number;
  }>>;
}

export interface PulsoidConfig {
  token: string;
  widgetUrl: string;
  mode: 'live' | 'simulation';
  status: 'connected' | 'disconnected' | 'simulating' | 'error';
  lastHeartRate?: number;
  lastUpdated?: number;
}

export interface WeatherData {
  temperature: number; // Celsius
  weatherCode: number;
  locationName: string;
  isLoaded: boolean;
}
