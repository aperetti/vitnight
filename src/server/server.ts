import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRoom } from './room';
import { ClientMessage } from '../shared/types';
import { generateRandomRoomName, sanitizeRoomName } from '../shared/roomGenerator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms: Map<string, GameRoom> = new Map();

function getOrCreateRoom(roomId: string): GameRoom {
  const safeId = sanitizeRoomName(roomId);
  let room = rooms.get(safeId);
  if (!room) {
    room = new GameRoom(safeId);
    rooms.set(safeId, room);
    console.log(`Initialized room: ${safeId}`);
  }
  return room;
}

// Serve dist assets if built
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));

// Direct room URL route support (e.g. /room/word-word-word-word-word or /r/word-word-word-word-word)
app.get(['/room/:roomId', '/r/:roomId'], (req, res) => {
  const roomId = req.params.roomId;
  res.redirect(`/?room=${encodeURIComponent(roomId)}`);
});

app.get('/api/random-room', (req, res) => {
  res.json({ roomId: generateRandomRoomName() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

// Fallback to index.html for SPA client routing
app.use((req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Vitnight game client not found. Please ensure dist/ is built.');
    }
  });
});

wss.on('connection', (ws: WebSocket, req) => {
  const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
  const rawRoom = urlParams.get('room') || generateRandomRoomName();
  const roomId = sanitizeRoomName(rawRoom);
  const room = getOrCreateRoom(roomId);

  room.clients.set(ws, {});
  console.log(`Client connected to room [${roomId}]`);

  ws.on('message', (data: string) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());
      room.handleClientMessage(ws, msg);
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });

  ws.on('close', () => {
    room.handleClientDisconnect(ws);
    console.log(`Client disconnected from room [${roomId}]`);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

const shutdown = () => {
  console.log('Shutting down server, saving all active rooms...');
  for (const room of rooms.values()) {
    room.destroy();
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001);
server.listen(PORT, () => {
  console.log(`Vitnight Caves of Qud Roguelike Server listening on port ${PORT}`);
});

