import { io, Socket } from 'socket.io-client';
import type {
  UserProfile,
  HeartbeatPayload,
  BeatInstantPayload,
  PPGWaveSamplePayload,
  UserStatusPayload
} from '../types';

type Listener<T> = (data: T) => void;

export const DEFAULT_SERVER_URL = 'https://latidos-compartidos.onrender.com';

class SocketService {
  private socket: Socket | null = null;
  private currentPin: string = '1402';
  private currentUser: UserProfile = 'Demian';
  private isConnected: boolean = false;

  // Event Listeners
  private bandHeartbeatListeners: Set<Listener<HeartbeatPayload>> = new Set();
  private beatInstantListeners: Set<Listener<BeatInstantPayload>> = new Set();
  private ppgWaveformListeners: Set<Listener<PPGWaveSamplePayload>> = new Set();
  private partnerStatusListeners: Set<Listener<UserStatusPayload>> = new Set();
  private connectionChangeListeners: Set<Listener<boolean>> = new Set();

  public getEffectiveServerUrl(): string {
    const customUrl = typeof window !== 'undefined' ? localStorage.getItem('latidos_server_url') : null;
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/$/, '');
    }

    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '');
    }

    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      // Local development inside PC browser with Vite dev server (port 5173)
      if ((host === 'localhost' || host === '127.0.0.1') && window.location.port === '5173') {
        return 'http://localhost:3001';
      }
      // Running on Render web domain
      if (host.includes('onrender.com')) {
        return window.location.origin;
      }
    }

    // Default to production cloud server for Android APK and remote testing
    return DEFAULT_SERVER_URL;
  }

  /**
   * Initializes socket connection
   */
  public connect(pin: string, user: UserProfile): void {
    this.currentPin = pin;
    this.currentUser = user;

    if (this.socket) {
      if (this.socket.connected) {
        this.socket.emit('join_room', { pin, user });
      }
      return;
    }

    const backendUrl = this.getEffectiveServerUrl();

    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.socket?.emit('join_room', { pin: this.currentPin, user: this.currentUser });
      this.notifyConnectionChange(true);
      console.log(`[Socket] Conectado exitosamente al servidor para ${user} en sala ${pin}`);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.notifyConnectionChange(false);
      console.log('[Socket] Desconectado del servidor');
    });

    this.socket.on('partner_band_heartbeat', (data: HeartbeatPayload) => {
      this.bandHeartbeatListeners.forEach((fn) => fn(data));
    });

    this.socket.on('pulsoid_live_bpm', (data: HeartbeatPayload) => {
      this.bandHeartbeatListeners.forEach((fn) => fn(data));
    });

    this.socket.on('partner_beat_instant', (data: BeatInstantPayload) => {
      this.beatInstantListeners.forEach((fn) => fn(data));
    });

    this.socket.on('partner_ppg_waveform', (data: PPGWaveSamplePayload) => {
      this.ppgWaveformListeners.forEach((fn) => fn(data));
    });

    this.socket.on('partner_status_changed', (data: UserStatusPayload) => {
      this.partnerStatusListeners.forEach((fn) => fn(data));
    });
  }

  public setPinAndUser(pin: string, user: UserProfile): void {
    this.currentPin = pin;
    this.currentUser = user;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_room', { pin, user });
    }
  }

  public setServerUrl(url: string): void {
    const cleanUrl = url.trim();
    if (typeof window !== 'undefined') {
      if (cleanUrl) {
        localStorage.setItem('latidos_server_url', cleanUrl);
      } else {
        localStorage.removeItem('latidos_server_url');
      }
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connect(this.currentPin, this.currentUser);
  }

  public getServerUrl(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('latidos_server_url') || '';
    }
    return '';
  }

  public emitBandHeartbeat(payload: HeartbeatPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('band_heartbeat', payload);
    }
  }

  public emitBeatInstant(payload: BeatInstantPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('beat_instant', payload);
    }
  }

  public emitPPGWaveform(payload: PPGWaveSamplePayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('ppg_waveform', payload);
    }
  }

  public emitStatusUpdate(status: Partial<UserStatusPayload>): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update_status', status);
    }
  }

  // Subscriptions
  public onBandHeartbeat(fn: Listener<HeartbeatPayload>): () => void {
    this.bandHeartbeatListeners.add(fn);
    return () => this.bandHeartbeatListeners.delete(fn);
  }

  public onBeatInstant(fn: Listener<BeatInstantPayload>): () => void {
    this.beatInstantListeners.add(fn);
    return () => this.beatInstantListeners.delete(fn);
  }

  public onPPGWaveform(fn: Listener<PPGWaveSamplePayload>): () => void {
    this.ppgWaveformListeners.add(fn);
    return () => this.ppgWaveformListeners.delete(fn);
  }

  public onPartnerStatus(fn: Listener<UserStatusPayload>): () => void {
    this.partnerStatusListeners.add(fn);
    return () => this.partnerStatusListeners.delete(fn);
  }

  public onConnectionChange(fn: Listener<boolean>): () => void {
    this.connectionChangeListeners.add(fn);
    fn(this.isConnected);
    return () => this.connectionChangeListeners.delete(fn);
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionChangeListeners.forEach((fn) => fn(connected));
  }

  public isSocketConnected(): boolean {
    return this.isConnected;
  }
}

export const socketService = new SocketService();
