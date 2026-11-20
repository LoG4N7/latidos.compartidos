import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  UserProfile,
  HeartbeatPayload,
  BeatInstantPayload,
  PPGWaveSamplePayload,
  UserStatusPayload,
  RoomState
} from './types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 8000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

// In-memory room store (keyed by pin)
const rooms: Map<string, RoomState> = new Map();

// Helper to get or create room
function getOrCreateRoom(pin: string): RoomState {
  if (!rooms.has(pin)) {
    rooms.set(pin, {
      pin,
      users: {}
    });
  }
  return rooms.get(pin)!;
}

// REST Endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    appName: 'Latidos Compartidos API',
    version: '1.0.0',
    uptime: process.uptime(),
    activeRooms: rooms.size,
    timestamp: Date.now()
  });
});

// Pulsoid Proxy to fetch real-time data without CORS issues on mobile browsers
app.post('/api/pulsoid/proxy', async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const response = await fetch('https://dev.pulsoid.net/api/v1/data/real_time', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Pulsoid responded with status ${response.status}`,
        details: await response.text()
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to contact Pulsoid', message: err.message });
  }
});

// Webhook endpoint for direct Push from Notify for Xiaomi / Pulsoid integrations
app.post('/api/pulsoid/webhook', (req: Request, res: Response) => {
  const { pin = '1402', user = 'Demian', bpm } = req.body;
  
  if (!bpm || isNaN(Number(bpm))) {
    return res.status(400).json({ error: 'Valid bpm is required' });
  }

  const room = rooms.get(pin);
  if (room) {
    const payload: HeartbeatPayload = {
      userId: user as UserProfile,
      bpm: Number(bpm),
      source: 'pulsoid',
      timestamp: Date.now()
    };
    io.to(pin).emit('partner_band_heartbeat', payload);
    return res.json({ success: true, broadcastedTo: pin });
  }

  return res.json({ success: true, message: 'Room not currently connected' });
});

// Serve frontend static build if present (for single-service deployment)
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api') || req.path === '/health' || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// WebSockets logic
io.on('connection', (socket: Socket) => {
  let currentPin: string | null = null;
  let currentUser: UserProfile | null = null;

  socket.on('join_room', ({ pin, user, activeModule = 'idle' }: { pin: string; user: UserProfile; activeModule?: 'band' | 'ppg' | 'idle' }) => {
    currentPin = pin;
    currentUser = user;
    socket.join(pin);

    const room = getOrCreateRoom(pin);
    const initialStatus: UserStatusPayload = {
      userId: user,
      isOnline: true,
      activeModule,
      isFingerDetected: false,
      lastSeen: Date.now()
    };

    room.users[user] = {
      socketId: socket.id,
      status: initialStatus
    };

    // Notify caller of current room state
    socket.emit('room_joined', {
      pin,
      myUser: user,
      users: room.users
    });

    // Notify partner in the room
    socket.to(pin).emit('partner_status_changed', initialStatus);

    console.log(`[Socket] ${user} joined room ${pin} (${socket.id})`);
  });

  // Band module continuous BPM update
  socket.on('band_heartbeat', (payload: HeartbeatPayload) => {
    if (!currentPin) return;
    const room = rooms.get(currentPin);
    if (room && room.users[payload.userId]) {
      room.users[payload.userId]!.lastBpm = payload.bpm;
    }
    socket.to(currentPin).emit('partner_band_heartbeat', payload);
  });

  // Low latency beat instant (trigger haptic pulse on partner device!)
  socket.on('beat_instant', (payload: BeatInstantPayload) => {
    if (!currentPin) return;
    // Ultra-fast forwarding to partner
    socket.to(currentPin).emit('partner_beat_instant', {
      ...payload,
      relayedAt: Date.now()
    });
  });

  // PPG Waveform continuous stream (for dual oscilloscope)
  socket.on('ppg_waveform', (payload: PPGWaveSamplePayload) => {
    if (!currentPin) return;
    socket.to(currentPin).emit('partner_ppg_waveform', payload);
  });

  // Status and finger presence updates
  socket.on('update_status', (status: Partial<UserStatusPayload>) => {
    if (!currentPin || !currentUser) return;
    const room = rooms.get(currentPin);
    if (room && room.users[currentUser]) {
      room.users[currentUser]!.status = {
        ...room.users[currentUser]!.status,
        ...status,
        lastSeen: Date.now()
      };
      socket.to(currentPin).emit('partner_status_changed', room.users[currentUser]!.status);
    }
  });

  // Disconnection cleanup
  socket.on('disconnect', () => {
    if (currentPin && currentUser) {
      const room = rooms.get(currentPin);
      if (room && room.users[currentUser]) {
        delete room.users[currentUser];
        socket.to(currentPin).emit('partner_status_changed', {
          userId: currentUser,
          isOnline: false,
          activeModule: 'idle',
          isFingerDetected: false,
          lastSeen: Date.now()
        } as UserStatusPayload);

        // If room is empty, clean it up
        if (Object.keys(room.users).length === 0) {
          rooms.delete(currentPin);
        }
      }
      console.log(`[Socket] ${currentUser} disconnected from room ${currentPin}`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`❤️  Servidor de Latidos Compartidos activo en http://localhost:${PORT}`);
  console.log(`✨ WebSockets listos para sincronizar a Demian y Verónica`);
});
