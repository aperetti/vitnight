import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom } from '../src/server/room';
import { ClientMessage, ServerMessage } from '../src/shared/types';

describe('Network WebSocket Integration', () => {
  let server: http.Server;
  let wss: WebSocketServer;
  let port: number;
  let room: GameRoom;

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    wss = new WebSocketServer({ server, path: '/ws' });
    room = new GameRoom('test-room');

    wss.on('connection', (ws: WebSocket) => {
      room.clients.set(ws, {});
      ws.on('message', (data: string) => {
        const msg: ClientMessage = JSON.parse(data.toString());
        room.handleClientMessage(ws, msg);
      });
      ws.on('close', () => {
        room.handleClientDisconnect(ws);
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    wss.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('connects client and receives INIT_STATE and PARTY_UPDATE', async () => {
    const client = new WebSocket(`ws://localhost:${port}/ws`);

    const receivedMessages: ServerMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      client.on('open', () => {
        const joinMsg: ClientMessage = {
          type: 'JOIN_ROOM',
          roomId: 'test-room',
          hero: 'barrett',
          playerName: 'BarrettTester'
        };
        client.send(JSON.stringify(joinMsg));
      });

      client.on('message', (data) => {
        const msg: ServerMessage = JSON.parse(data.toString());
        receivedMessages.push(msg);

        // Once we received INIT_STATE and PARTY_UPDATE, finish test
        if (receivedMessages.some(m => m.type === 'INIT_STATE') && receivedMessages.some(m => m.type === 'PARTY_UPDATE')) {
          client.close();
          resolve();
        }
      });

      client.on('error', reject);
    });

    const initMsg = receivedMessages.find(m => m.type === 'INIT_STATE') as any;
    expect(initMsg).toBeDefined();
    expect(initMsg.hero).toBe('barrett');
    expect(initMsg.zone.name).toContain('Homestead Outpost');
    expect(initMsg.pacingMode).toBe('turn_based');

    const partyMsg = receivedMessages.find(m => m.type === 'PARTY_UPDATE') as any;
    expect(partyMsg).toBeDefined();
    expect(partyMsg.members.length).toBe(3);
  });
});
