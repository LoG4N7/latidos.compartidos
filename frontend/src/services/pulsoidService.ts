/**
 * Pulsoid Integration & Biological Simulation Service
 * Connects to Pulsoid's real-time API/WebSocket for Xiaomi Smart Band 9,
 * with intelligent automatic biological simulation fallback.
 */

export interface PulsoidData {
  heartRate: number;
  source: 'pulsoid' | 'simulation';
  statusText: string;
  isStreaming: boolean;
  timestamp: number;
}

export class PulsoidService {
  private ws: WebSocket | null = null;
  private token: string = '';
  private isSimulating: boolean = true;
  private simulationInterval: any = null;
  private onDataCallback: ((data: PulsoidData) => void) | null = null;

  // Biological simulation state (sinus arrhythmia model)
  private baseBpm: number = 72;
  private breathPhase: number = 0;
  private lastBpm: number = 72;

  constructor() {
    const savedToken = localStorage.getItem('latidos_pulsoid_token') || '';
    const savedMode = localStorage.getItem('latidos_pulsoid_mode') || 'simulation';
    this.token = savedToken;
    this.isSimulating = savedMode === 'simulation';
  }

  public subscribe(callback: (data: PulsoidData) => void): () => void {
    this.onDataCallback = callback;
    if (this.isSimulating) {
      this.startSimulation();
    } else if (this.token) {
      this.connectWebSocket(this.token);
    } else {
      this.startSimulation();
    }

    return () => {
      this.onDataCallback = null;
      this.stop();
    };
  }

  public setToken(token: string): void {
    this.token = token.trim();
    localStorage.setItem('latidos_pulsoid_token', this.token);
    if (this.token && !this.isSimulating) {
      this.connectWebSocket(this.token);
    }
  }

  public getToken(): string {
    return this.token;
  }

  public setMode(mode: 'live' | 'simulation'): void {
    this.isSimulating = mode === 'simulation';
    localStorage.setItem('latidos_pulsoid_mode', mode);

    if (this.isSimulating) {
      this.closeWebSocket();
      this.startSimulation();
    } else {
      this.stopSimulation();
      if (this.token) {
        this.connectWebSocket(this.token);
      } else {
        // Fallback to simulation if token is empty
        this.startSimulation('Sin Token (Simulando)');
      }
    }
  }

  public getMode(): 'live' | 'simulation' {
    return this.isSimulating ? 'simulation' : 'live';
  }

  public setManualBaseBpm(bpm: number): void {
    this.baseBpm = Math.max(50, Math.min(180, bpm));
  }

  /**
   * Connects to Pulsoid Real-Time WebSocket API
   */
  private connectWebSocket(token: string): void {
    this.closeWebSocket();
    this.stopSimulation();

    try {
      const wsUrl = `wss://dev.pulsoid.net/api/v1/data/real_time?access_token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Pulsoid] Conectado exitosamente al feed en vivo');
        this.emitData({
          heartRate: this.lastBpm,
          source: 'pulsoid',
          statusText: 'En vivo desde Mi Band 9',
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
              statusText: 'En vivo desde Mi Band 9',
              isStreaming: true,
              timestamp: Date.now()
            });
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[Pulsoid] Error de conexión WebSocket, activando simulación fallback', err);
        this.startSimulation('Pulsoid Desconectado (En Reposo)');
      };

      this.ws.onclose = () => {
        console.log('[Pulsoid] Conexión cerrada');
        if (!this.isSimulating) {
          this.startSimulation('Buscando señal de Mi Band 9...');
        }
      };
    } catch (e) {
      this.startSimulation('Error de red (Simulación Activa)');
    }
  }

  /**
   * Starts biological heart rate simulation
   * Simulates Sinus Respiratory Arrhythmia (natural BPM variation with breathing cycles)
   */
  private startSimulation(customStatus?: string): void {
    this.stopSimulation();

    const tick = () => {
      this.breathPhase += 0.25; // 4 second breathing cycle
      const respiratoryVariation = Math.sin(this.breathPhase) * 3.5;
      const microJitter = (Math.random() - 0.5) * 1.8;

      const simulatedBpm = Math.round(this.baseBpm + respiratoryVariation + microJitter);
      this.lastBpm = simulatedBpm;

      this.emitData({
        heartRate: simulatedBpm,
        source: 'simulation',
        statusText: customStatus || 'Simulación Inteligente (En Reposo)',
        isStreaming: true,
        timestamp: Date.now()
      });
    };

    tick();
    this.simulationInterval = setInterval(tick, 1000);
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
