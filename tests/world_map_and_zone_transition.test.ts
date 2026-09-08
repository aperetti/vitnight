import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom } from '../src/server/room';
import { GameEngine } from '../src/server/engine';
import { ClientMessage, ServerMessage } from '../src/shared/types';
import { STORY_LOCATIONS } from '../src/client/worldMap';

describe('World Map & Zone Transitions', () => {
  it('has all 9 authentic story locations in STORY_LOCATIONS with sprites', () => {
    expect(STORY_LOCATIONS.length).toBe(9);

    const ids = STORY_LOCATIONS.map(l => l.id);
    expect(ids).toContain('loc_spawn');
    expect(ids).toContain('loc_mines');
    expect(ids).toContain('loc_creek');
    expect(ids).toContain('loc_mountain');
    expect(ids).toContain('loc_skeleton');
    expect(ids).toContain('loc_creeper');
    expect(ids).toContain('loc_power');
    expect(ids).toContain('loc_rocky');
    expect(ids).toContain('loc_final');

    for (const loc of STORY_LOCATIONS) {
      expect(loc.name).toBeTruthy();
      expect(loc.sprite).toMatch(/^\/sprites\/.*\.png$/);
      expect(loc.act).toBeGreaterThanOrEqual(1);
      expect(loc.act).toBeLessThanOrEqual(4);
      expect(loc.objective).toBeTruthy();
    }
  });

  it('GameEngine emits onPlayerZoneChanged on stairs down and stairs up', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett');
    expect(player).toBeDefined();

    let zoneChangedEvent: any = null;
    engine.onPlayerZoneChanged = (playerId, newZone, pacingMode) => {
      zoneChangedEvent = { playerId, newZone, pacingMode };
    };

    // Move player onto stairs down (tile 12, 15 in spawn house)
    player!.x = 12;
    player!.y = 14;
    // Step down onto (12, 15)
    engine.handlePlayerMove(player!.id, 0, 1);

    expect(player!.zone.depth).toBe(1);
    expect(zoneChangedEvent).not.toBeNull();
    expect(zoneChangedEvent.newZone.name).toContain('Whitehill Mines');
    expect(zoneChangedEvent.newZone.coord.depth).toBe(1);

    // Now on depth 1, move onto stairs up at (15, 12)
    // First place near stairs up
    player!.x = 15;
    player!.y = 11;
    // In mines, check stairs up
    const mineZone = engine.getOrCreateZone(player!.zone);
    mineZone.tiles[12][15] = {
      type: 'stairs_up',
      char: '<',
      color: '#00ffff',
      walkable: true,
      transparent: true
    };

    zoneChangedEvent = null;
    engine.handlePlayerMove(player!.id, 0, 1);

    expect(player!.zone.depth).toBe(0);
    expect(zoneChangedEvent).not.toBeNull();
    expect(zoneChangedEvent.newZone.coord.depth).toBe(0);
  });

  it('GameEngine emits onPlayerZoneChanged when moving past screen edge', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett');
    expect(player).toBeDefined();

    let zoneChangedEvent: any = null;
    engine.onPlayerZoneChanged = (playerId, newZone, pacingMode) => {
      zoneChangedEvent = { playerId, newZone, pacingMode };
    };

    // Place player at east edge of spawn house
    player!.x = 47;
    player!.y = 12;

    // Move east past boundary
    engine.handlePlayerMove(player!.id, 1, 0);

    expect(player!.zone.zoneX).toBe(1);
    expect(zoneChangedEvent).not.toBeNull();
    expect(zoneChangedEvent.newZone.name).toContain('Zombie Creek');
    expect(zoneChangedEvent.newZone.coord.zoneX).toBe(1);
  });
});

describe('Network ZONE_CHANGED Delivery', () => {
  let server: http.Server;
  let wss: WebSocketServer;
  let port: number;
  let room: GameRoom;

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    wss = new WebSocketServer({ server, path: '/ws' });
    room = new GameRoom('map-room');

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

  it('sends ZONE_CHANGED over WebSocket when client steps down stairs', async () => {
    const client = new WebSocket(`ws://localhost:${port}/ws`);
    const received: ServerMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      client.on('open', () => {
        client.send(JSON.stringify({
          type: 'JOIN_ROOM',
          roomId: 'map-room',
          hero: 'barrett',
          playerName: 'BarrettDigger'
        }));
      });

      client.on('message', (data) => {
        const msg: ServerMessage = JSON.parse(data.toString());
        received.push(msg);

        if (msg.type === 'INIT_STATE') {
          // Send move to position adjacent to stairs down (12, 15)
          const player = Array.from(room.engine.entities.values()).find(e => e.role === 'barrett')!;
          player.x = 12;
          player.y = 14;

          // Step onto stairs down (dy: +1)
          client.send(JSON.stringify({
            type: 'PLAYER_MOVE',
            dx: 0,
            dy: 1
          }));
        }

        if (msg.type === 'ZONE_CHANGED') {
          client.close();
          resolve();
        }
      });

      client.on('error', reject);
    });

    const zoneChanged = received.find(m => m.type === 'ZONE_CHANGED') as any;
    expect(zoneChanged).toBeDefined();
    expect(zoneChanged.zone.name).toContain('Whitehill Mines');
    expect(zoneChanged.zone.coord.depth).toBe(1);
  });

  it('generates authentic Caves of Qud terrain for all 16x7 parsecs with zero emojis', async () => {
    const { getParsecTerrainInfo, PARSEC_GRID_WIDTH, PARSEC_GRID_HEIGHT, isRuinsParsec, isCaveParsec } = await import('../src/client/worldMap');

    expect(PARSEC_GRID_WIDTH).toBe(16);
    expect(PARSEC_GRID_HEIGHT).toBe(7);

    // Emoji detection regex (pictographic emojis)
    const emojiRegex = /[\u{1F300}-\u{1FAFF}]/u;
    const bannedEmojis = ['🌲', '🏠', '⛰️', '🦴', '🌋', '⚙️', '🏛️', '🌌', '🎂', '💀', '🧨', '⚡', '🗺️', '🔍', '👤', '🧟'];

    for (let py = 0; py < PARSEC_GRID_HEIGHT; py++) {
      for (let px = 0; px < PARSEC_GRID_WIDTH; px++) {
        const terrain = getParsecTerrainInfo(px, py);

        // Verify terrain integrity
        expect(terrain.glyph).toBeTruthy();
        expect(terrain.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(terrain.bgColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(terrain.terrainType).toBeTruthy();
        expect(terrain.elevation).toBeTruthy();
        expect(terrain.biomeName).toBeTruthy();
        expect(terrain.description).toBeTruthy();
        expect(terrain.dangerLevel).toBeGreaterThanOrEqual(1);

        // Verify NO emojis are used in the glyph or names
        expect(emojiRegex.test(terrain.glyph)).toBe(false);
        expect(emojiRegex.test(terrain.terrainType)).toBe(false);
        expect(emojiRegex.test(terrain.biomeName)).toBe(false);
        for (const b of bannedEmojis) {
          expect(terrain.glyph.includes(b)).toBe(false);
          expect(terrain.terrainType.includes(b)).toBe(false);
          expect(terrain.biomeName.includes(b)).toBe(false);
        }
      }
    }

    // Verify signature story milestone CP437/Roguelike glyphs
    expect(getParsecTerrainInfo(0, 0).glyph).toBe('⌂');
    expect(getParsecTerrainInfo(3, 0).glyph).toBe('≈');
    expect(getParsecTerrainInfo(3, 3).glyph).toBe('▲');
    expect(getParsecTerrainInfo(6, 3).glyph).toBe('П');
    expect(getParsecTerrainInfo(9, 3).glyph).toBe('*');
    expect(getParsecTerrainInfo(9, 6).glyph).toBe('☼');
    expect(getParsecTerrainInfo(12, 6).glyph).toBe('Ω');
    expect(getParsecTerrainInfo(15, 6).glyph).toBe('✦');

    // Verify procedural ruins and caves glyphs
    for (let py = 0; py < PARSEC_GRID_HEIGHT; py++) {
      for (let px = 0; px < PARSEC_GRID_WIDTH; px++) {
        if ((px !== 0 || py !== 0) && (px !== 3 || py !== 0) && (px !== 3 || py !== 3) && (px !== 6 || py !== 3) &&
            (px !== 9 || py !== 3) && (px !== 9 || py !== 6) && (px !== 12 || py !== 6) && (px !== 15 || py !== 6)) {
          if (isRuinsParsec(px, py)) {
            expect(getParsecTerrainInfo(px, py).glyph).toBe('π');
            expect(getParsecTerrainInfo(px, py).isLandmark).toBe(true);
          } else if (isCaveParsec(px, py)) {
            expect(getParsecTerrainInfo(px, py).glyph).toBe('▼');
            expect(getParsecTerrainInfo(px, py).isLandmark).toBe(true);
          }
        }
      }
    }
  });
});
