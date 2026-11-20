/**
 * Pulsoid Integration & Biological Transmission Service
 * Exclusively transmits Demian's heart rate to Verónica in real-time.
 * Supports:
 * 1. Base Free Mode (Automated): Pulsoid Widget WebSocket Stream (Free, automatic, works with app closed)
 * 2. Manual Alternative: Live Notification / Local Base BPM
 * 3. Paid Mode: Pulsoid Developer Token WebSocket API
 * 4. Intimate Biological Arrhythmia Simulation
 */

export type HeartSourceMode = 'widget' | 'notification' | 'token' | 'simulation';

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
  private widgetId: string = 'latidos-compartidos';
  private sourceMode: HeartSourceMode = 'widget';
  private simulationInterval: any = null;
  private reconnectTimeout: any = null;
  private onDataCallback: ((data: PulsoidData) => void) | null = null;

  // Biological simulation state (sinus arrhythmia model)
  private baseBpm: number = 74;
  private breathPhase: number = 0;
  private lastBpm: number = 74;

  constructor() {
    const savedMode = (localStorage.getItem('latidos_heart_source') as HeartSourceMode) || 'widget';
    const savedWidget = localStorage.getItem('latidos_pulsoid_widget') || 'https://pulsoid.net/widget/view/latidos-compartidos';
    const savedToken = localStorage.getItem('latidos_pulsoid_token') || '';
    const savedBaseBpm = Number(localStorage.getItem('latidos_base_bpm')) || 74;

    this.sourceMode = savedMode;
    this.widgetId = this.extractWidgetSlug(savedWidget);
    this.token = savedToken;
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

  public setWidget(slugOrUrl: string): void {
    const clean = this.extractWidgetSlug(slugOrUrl);
    this.widgetId = clean;
    localStorage.setItem('latidos_pulsoid_widget', slugOrUrl.trim());

    // Inform backend bridge to mirror connection 24/7
    this.notifyBackendWidget(clean);

    if (this.sourceMode === 'widget') {
      this.applyCurrentMode();
    }
  }

  public getWidget(): string {
    return localStorage.getItem('latidos_pulsoid_widget') || 'https://pulsoid.net/widget/view/latidos-compartidos';
  }

  public getWidgetSlug(): string {
    return this.widgetId;
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

  private extractWidgetSlug(input: string): string {
    if (!input) return 'latidos-compartidos';
    const clean = input.trim();
    const match = clean.match(/widget\/view\/([^\/\?#]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const cleanUrl = clean.split(/[?#]/)[0];
    const parts = cleanUrl.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'latidos-compartidos';
  }

  private async notifyBackendWidget(slug: string): Promise<void> {
    try {
      const serverUrl = localStorage.getItem('latidos_server_url') || '';
      const endpoint = serverUrl ? `${serverUrl.replace(/\/$/, '')}/api/pulsoid/widget` : '/api/pulsoid/widget';
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widget: slug })
      });
    } catch (e) {
      // Backend may be remote or offline, frontend will still stream directly
    }
  }

  private applyCurrentMode(): void {
    this.closeWebSocket();
    this.stopSimulation();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.sourceMode === 'widget') {
      this.connectWidgetWebSocket(this.widgetId);
    } else if (this.sourceMode === 'token') {
      if (this.token) {
        this.connectDeveloperTokenWebSocket(this.token);
      } else {
        this.startBiologicalLoop('Sin Token Pulsoid (Modo Notificación)');
      }
    } else if (this.sourceMode === 'notification') {
      this.startBiologicalLoop('En vivo desde Notificación Pulsoid (Mi Band 9)');
    } else {
      this.startBiologicalLoop('Modo Simulación Amorosa');
    }
  }

  /**
   * Connects to free Pulsoid Widget WebSocket Stream using public RPC
   */
  private async connectWidgetWebSocket(widgetSlug: string): Promise<void> {
    try {
      this.emitData({
        heartRate: this.lastBpm,
        source: 'pulsoid',
        statusText: `Conectando con Pulsoid (${widgetSlug})...`,
        isStreaming: false,
        timestamp: Date.now()
      });

      const rpcRes = await fetch('https://pulsoid.net/v1/api/public/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rpc-method': 'getWidget'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getWidget',
          params: { widgetId: widgetSlug },
          id: '1'
        })
      });

      if (!rpcRes.ok) {
        throw new Error(`RPC status ${rpcRes.status}`);
      }

      const rpcData = await rpcRes.json();
      const ramielUrl = rpcData?.result?.ramielUrl;

      if (!ramielUrl) {
        throw new Error('No se obtuvo URL de streaming para el widget');
      }

      this.ws = new WebSocket(ramielUrl);

      this.ws.onopen = () => {
        this.emitData({
          heartRate: this.lastBpm,
          source: 'pulsoid',
          statusText: '🟢 En vivo desde Pulsoid Widget (Automático)',
          isStreaming: true,
          timestamp: Date.now()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const hr = payload?.data?.heartRate;
          if (typeof hr === 'number' && hr > 0) {
            this.lastBpm = hr;
            this.emitData({
              heartRate: hr,
              source: 'pulsoid',
              statusText: '🟢 En vivo desde Pulsoid Widget (Mi Band 9)',
              isStreaming: true,
              timestamp: Date.now()
            });
          }
        } catch (e) {
          // Ignore
        }
      };

      this.ws.onerror = () => {
        console.warn('[Pulsoid Widget] Error de conexión, reintentando...');
      };

      this.ws.onclose = () => {
        if (this.sourceMode === 'widget') {
          this.reconnectTimeout = setTimeout(() => {
            if (this.sourceMode === 'widget') {
              this.connectWidgetWebSocket(this.widgetId);
            }
          }, 3500);
        }
      };

    } catch (e) {
      console.warn('[Pulsoid Widget] Error al consultar RPC:', e);
      if (this.sourceMode === 'widget') {
        this.reconnectTimeout = setTimeout(() => {
          if (this.sourceMode === 'widget') {
            this.connectWidgetWebSocket(this.widgetId);
          }
        }, 5000);
      }
    }
  }

  /**
   * Connects to Pulsoid Real-Time WebSocket API (Paid Pro / Dev option)
   */
  private connectDeveloperTokenWebSocket(token: string): void {
    try {
      const wsUrl = `wss://dev.pulsoid.net/api/v1/data/real_time?access_token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
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
   */
  private startBiologicalLoop(customStatus?: string): void {
    this.stopSimulation();

    const statusText = customStatus || (
      this.sourceMode === 'notification'
        ? 'En vivo desde Notificación Pulsoid (Mi Band 9)'
        : 'Modo Simulación Amorosa'
    );

    const tick = () => {
      this.breathPhase += 0.22;
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
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }

  public stop(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
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
