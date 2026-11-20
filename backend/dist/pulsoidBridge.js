import WebSocket from 'ws';
export class PulsoidBridge {
    io;
    widgetId = 'latidos-compartidos';
    ws = null;
    isConnected = false;
    lastBpm = null;
    lastSeen = null;
    reconnectTimer = null;
    isDestroyed = false;
    statusText = 'Iniciando conexión con Pulsoid...';
    ramielUrl = null;
    constructor(io, defaultWidgetId = 'latidos-compartidos') {
        this.io = io;
        this.widgetId = this.sanitizeWidgetId(defaultWidgetId);
    }
    start() {
        this.isDestroyed = false;
        this.connect();
    }
    stop() {
        this.isDestroyed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.removeAllListeners();
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.statusText = 'Detenido';
    }
    setWidgetId(slugOrUrl) {
        const cleanId = this.sanitizeWidgetId(slugOrUrl);
        if (cleanId && cleanId !== this.widgetId) {
            console.log(`[PulsoidBridge] Actualizando widget ID a: ${cleanId}`);
            this.widgetId = cleanId;
            this.reconnect();
        }
    }
    getStatus() {
        return {
            isConnected: this.isConnected,
            widgetId: this.widgetId,
            lastBpm: this.lastBpm,
            lastSeen: this.lastSeen,
            statusText: this.statusText,
            ramielUrl: this.ramielUrl
        };
    }
    sanitizeWidgetId(input) {
        if (!input)
            return 'latidos-compartidos';
        let clean = input.trim();
        // Match /widget/view/slug or view/slug or just slug
        const match = clean.match(/widget\/view\/([^\/\?#]+)/);
        if (match && match[1]) {
            return match[1];
        }
        const cleanUrl = clean.split(/[?#]/)[0];
        const parts = cleanUrl.split('/').filter(Boolean);
        return parts[parts.length - 1] || 'latidos-compartidos';
    }
    reconnect(delayMs = 3000) {
        if (this.isDestroyed)
            return;
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        if (this.ws) {
            this.ws.removeAllListeners();
            try {
                this.ws.close();
            }
            catch (e) {
                // Ignore close errors
            }
            this.ws = null;
        }
        this.isConnected = false;
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delayMs);
    }
    async connect() {
        if (this.isDestroyed)
            return;
        try {
            this.statusText = `Consultando widget '${this.widgetId}' en Pulsoid...`;
            console.log(`[PulsoidBridge] Obteniendo configuración para widget '${this.widgetId}'...`);
            const rpcResponse = await fetch('https://pulsoid.net/v1/api/public/rpc', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rpc-method': 'getWidget'
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'getWidget',
                    params: { widgetId: this.widgetId },
                    id: '1'
                })
            });
            if (!rpcResponse.ok) {
                throw new Error(`RPC respondió con status HTTP ${rpcResponse.status}`);
            }
            const rpcData = await rpcResponse.json();
            if (rpcData.error) {
                throw new Error(rpcData.error.message || 'Error en RPC getWidget');
            }
            const ramielUrl = rpcData?.result?.ramielUrl;
            if (!ramielUrl) {
                throw new Error('La respuesta del widget no contiene ramielUrl');
            }
            this.ramielUrl = ramielUrl;
            console.log(`[PulsoidBridge] Conectando a feed WebSocket en tiempo real de Pulsoid...`);
            this.statusText = 'Conectando a transmisión en vivo...';
            this.ws = new WebSocket(ramielUrl);
            this.ws.on('open', () => {
                this.isConnected = true;
                this.statusText = 'Conectado en vivo (Esperando latidos de Demian)';
                console.log(`[PulsoidBridge] ¡Conexión establecida exitosamente con el widget '${this.widgetId}'!`);
            });
            this.ws.on('message', (data) => {
                try {
                    const payload = JSON.parse(data.toString());
                    const hr = payload?.data?.heartRate;
                    if (typeof hr === 'number' && hr > 0) {
                        this.lastBpm = hr;
                        this.lastSeen = Date.now();
                        this.statusText = `Transmitiendo latidos en vivo (${hr} BPM)`;
                        const heartbeatPayload = {
                            userId: 'Demian',
                            bpm: hr,
                            source: 'pulsoid',
                            timestamp: this.lastSeen
                        };
                        // Transmit to room 1402 (and broadcast to all active socket clients)
                        this.io.to('1402').emit('partner_band_heartbeat', heartbeatPayload);
                        this.io.emit('pulsoid_live_bpm', heartbeatPayload);
                    }
                }
                catch (err) {
                    // Ignore parse errors on ping/pong frames
                }
            });
            this.ws.on('error', (err) => {
                console.warn(`[PulsoidBridge] Error en WebSocket: ${err.message}`);
                this.statusText = `Error de conexión: ${err.message}`;
            });
            this.ws.on('close', (code, reason) => {
                console.log(`[PulsoidBridge] Conexión cerrada (${code}): ${reason.toString() || 'Sin motivo'}`);
                this.statusText = 'Desconectado. Reintentando en 4 segundos...';
                this.reconnect(4000);
            });
        }
        catch (err) {
            console.warn(`[PulsoidBridge] No se pudo conectar al widget '${this.widgetId}': ${err.message}`);
            this.statusText = `Reintentando conexión (${err.message})...`;
            this.reconnect(5000);
        }
    }
}
