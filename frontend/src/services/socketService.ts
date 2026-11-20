import { io, Socket } from 'socket.io-client';
import type {
  UserProfile,
  HeartbeatPayload,
  BeatInstantPayload,
  PPGWaveSamplePayload,
  UserStatusPayload
} from '../types';

type Listener<T> = (data: T) => void;

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

    // Determine backend URL (from custom localStorage, env, or fallback to port 3001)
    const customUrl = typeof window !== 'undefined' ? localStorage.getItem('latidos_server_url') : null;
    const backendUrl = customUrl || import.meta.env.VITE_BACKEND_URL || (
      typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : 'http://localhost:3001'
    );

    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
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
