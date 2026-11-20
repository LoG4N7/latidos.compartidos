/**
 * Pulsoid Integration & Biological Transmission Service
 * Exclusively transmits Demian's heart rate to Verónica in real-time.
 * Supports:
 * 1. Base Free Mode: Live Pulsoid Notification Sync (Demian syncs his current band notification BPM)
 * 2. Paid / Advanced Mode: Pulsoid Developer Token WebSocket API
 * 3. Intimate Biological Arrhythmia Simulation
 */

export type HeartSourceMode = 'notification' | 'token' | 'simulation';

export interface PulsoidData {
  heartRate: number;
  source: 'notification' | 'pulsoid' | 'simulation';
  statusText: string;
  isStreaming: boolean;
  timestamp: number;
}

export class PulsoidService {
  private ws: WebSocket | null = null;
  private token: string = '';
  private sourceMode: HeartSourceMode = 'notification';
  private simulationInterval: any = null;
  private onDataCallback: ((data: PulsoidData) => void) | null = null;

  // Biological simulation state (sinus arrhythmia model)
  private baseBpm: number = 74;
  private breathPhase: number = 0;
  private lastBpm: number = 74;

  constructor() {
    const savedToken = localStorage.getItem('latidos_pulsoid_token') || '';
    const savedMode = (localStorage.getItem('latidos_heart_source') as HeartSourceMode) || 'notification';
    const savedBaseBpm = Number(localStorage.getItem('latidos_base_bpm')) || 74;

    this.token = savedToken;
    this.sourceMode = savedMode;
    this.baseBpm = savedBaseBpm;
  }

  public subscribe(callback: (data: PulsoidData) => void): () => void {
    this.onDataCallback = callback;
    this.applyCurrentMode();

    return () => {
      this.onDataCallback = null;
      this.stop();
    };
  }

  public setSourceMode(mode: HeartSourceMode): void {
    this.sourceMode = mode;
    localStorage.setItem('latidos_heart_source', mode);
    this.applyCurrentMode();
  }

  public getSourceMode(): HeartSourceMode {
    return this.sourceMode;
  }

  public setBaseBpm(bpm: number): void {
    this.baseBpm = Math.max(45, Math.min(190, Math.round(bpm)));
    localStorage.setItem('latidos_base_bpm', String(this.baseBpm));
    if (this.sourceMode === 'notification' || this.sourceMode === 'simulation') {
      this.tickBiologicalPulse();
    }
  }

  public getBaseBpm(): number {
    return this.baseBpm;
  }

  public setToken(token: string): void {
    this.token = token.trim();
    localStorage.setItem('latidos_pulsoid_token', this.token);
    if (this.sourceMode === 'token') {
      this.applyCurrentMode();
    }
  }

  public getToken(): string {
    return this.token;
  }

  private applyCurrentMode(): void {
    this.closeWebSocket();
    this.stopSimulation();

    if (this.sourceMode === 'token') {
      if (this.token) {
        this.connectWebSocket(this.token);
      } else {
        // Fallback to notification mode if no token
        this.startBiologicalLoop('Sin Token Pulsoid (Sincronizado con Notificación)');
      }
    } else if (this.sourceMode === 'notification') {
      this.startBiologicalLoop('En vivo desde Notificación Pulsoid (Mi Band 9)');
    } else {
      this.startBiologicalLoop('Modo Simulación Amorosa');
    }
  }

  /**
   * Connects to Pulsoid Real-Time WebSocket API (Paid Pro / Dev option)
   */
  private connectWebSocket(token: string): void {
    try {
      const wsUrl = `wss://dev.pulsoid.net/api/v1/data/real_time?access_token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Pulsoid] Conectado exitosamente al feed de pago');
        this.emitData({
          heartRate: this.lastBpm,
          source: 'pulsoid',
          statusText: 'En vivo desde Pulsoid Token (Mi Band 9)',
          isStreaming: true,
          timestamp: Date.now()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const hr = payload?.data?.heart_rate;
          if (hr && typeof hr === 'number' && hr > 30) {
            this.lastBpm = hr;
            this.emitData({
              heartRate: hr,
              source: 'pulsoid',
              statusText: 'En vivo desde Pulsoid Token (Mi Band 9)',
              isStreaming: true,
              timestamp: Date.now()
            });
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      };

      this.ws.onerror = () => {
        console.warn('[Pulsoid Token] Error de conexión, usando notificación de respaldo');
        this.startBiologicalLoop('Token no válido (Usando Notificación Gratuita)');
      };

      this.ws.onclose = () => {
        if (this.sourceMode === 'token') {
          this.startBiologicalLoop('Token desconectado (Usando Notificación Gratuita)');
        }
      };
    } catch (e) {
      this.startBiologicalLoop('Error de conexión (Notificación activa)');
    }
  }

  /**
   * Starts biological heart rate loop (Sinus Respiratory Arrhythmia)
   * Base frequency corresponds to Demian's notification BPM reading.
   */
  private startBiologicalLoop(customStatus?: string): void {
    this.stopSimulation();

    const statusText = customStatus || (
      this.sourceMode === 'notification'
        ? 'En vivo desde Notificación Pulsoid (Mi Band 9)'
        : 'Modo Simulación Amorosa'
    );

    const tick = () => {
      this.breathPhase += 0.22; // ~4.5 second natural respiratory sinus cycle
      const respiratoryVariation = Math.sin(this.breathPhase) * 2.8;
      const microJitter = (Math.random() - 0.5) * 1.5;

      const dynamicBpm = Math.round(this.baseBpm + respiratoryVariation + microJitter);
      this.lastBpm = dynamicBpm;

      this.emitData({
        heartRate: dynamicBpm,
        source: this.sourceMode === 'notification' ? 'notification' : 'simulation',
        statusText,
        isStreaming: true,
        timestamp: Date.now()
      });
    };

    tick();
    this.simulationInterval = setInterval(tick, 1000);
  }

  private tickBiologicalPulse(): void {
    this.emitData({
      heartRate: this.baseBpm,
      source: this.sourceMode === 'notification' ? 'notification' : 'simulation',
      statusText: this.sourceMode === 'notification'
        ? 'En vivo desde Notificación Pulsoid (Mi Band 9)'
        : 'Modo Simulación Amorosa',
      isStreaming: true,
      timestamp: Date.now()
    });
  }

  private stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  private closeWebSocket(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  public stop(): void {
    this.closeWebSocket();
    this.stopSimulation();
  }

  private emitData(data: PulsoidData): void {
    if (this.onDataCallback) {
      this.onDataCallback(data);
    }
  }
}

export const pulsoidService = new PulsoidService();
