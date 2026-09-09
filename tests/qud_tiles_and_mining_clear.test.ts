import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/server/engine';
import { GameRoom } from '../src/server/room';
import { generateZone, ZONE_WIDTH, ZONE_HEIGHT } from '../src/server/mapGen';
import { getParsecTerrainInfo, PARSEC_GRID_WIDTH, PARSEC_GRID_HEIGHT } from '../src/client/worldMap';
import { Tile, ServerMessage } from '../src/shared/types';

describe('Mining Tile Excavation & Real-Time Sync', () => {
  it('clears broken wall tiles into floor and populates tileUpdates', () => {
    const engine = new GameEngine();
    const coord = { parasangX: 2, parasangY: 2, zoneX: 1, zoneY: 1, depth: 0 };
    const zone = engine.getOrCreateZone(coord);

    // Create player Barrett with carbide pickaxe (Tier 1)
    const player = engine.assignHumanPlayer('barrett', 'DiggerBarrett');
    player.zone = coord;
    player.x = 10;
    player.y = 10;

    // Place a breakable wall directly to the right (x: 11, y: 10)
    const wallTile: Tile = {
      type: 'breakable_wall',
      char: '#',
      color: '#888888',
      walkable: false,
      transparent: false,
      minable: true,
      hp: 15,
      maxHp: 15,
      requiredTier: 0
    };
    zone.tiles[10][11] = wallTile;

    // Clear any previous tileUpdates
    zone.tileUpdates = [];

    // Strike the wall once (power >= 15 with Barrett's baseline)
    const struck = engine.executeBumpMine(player, zone, 11, 10, wallTile);
    expect(struck).toBe(true);

    // Verify wall was excavated into walkable floor
    const updatedTile = zone.tiles[10][11];
    expect(updatedTile.type).toBe('floor');
    expect(updatedTile.walkable).toBe(true);
    expect(updatedTile.transparent).toBe(true);

    // Verify tileUpdates has recorded the excavated tile
    expect(zone.tileUpdates).toBeDefined();
    expect(zone.tileUpdates!.length).toBeGreaterThanOrEqual(1);
    const recorded = zone.tileUpdates!.find(u => u.x === 11 && u.y === 10);
    expect(recorded).toBeDefined();
    expect(recorded!.tile.type).toBe('floor');
    expect(recorded!.tile.walkable).toBe(true);
  });

  it('GameRoom broadcasts tileUpdates in WORLD_UPDATE when tiles are mined', () => {
    const roomId = `mine-test-${Date.now()}`;
    const room = new GameRoom(roomId);
    const coord = { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 };
    const zone = room.engine.getOrCreateZone(coord);

    // Queue a tile update
    room.engine.setZoneTile(zone, 15, 12, {
      type: 'floor',
      char: '.',
      color: '#555555',
      walkable: true,
      transparent: true
    });

    // Mock client WebSocket
    let sentPayload: string | null = null;
    const mockWs: any = {
      readyState: 1, // OPEN
      send: (data: string) => {
        sentPayload = data;
      }
    };
    // Assign player Barrett to room
    const player = room.engine.assignHumanPlayer('barrett', 'Barrett');
    player.zone = coord;
    room.clients.set(mockWs, { hero: 'barrett', playerName: 'Barrett' });

    // Broadcast zone state
    room.broadcastZoneState(coord);

    expect(sentPayload).not.toBeNull();
    const msg: ServerMessage = JSON.parse(sentPayload!);
    expect(msg.type).toBe('WORLD_UPDATE');
    if (msg.type === 'WORLD_UPDATE') {
      expect(msg.tileUpdates).toBeDefined();
      expect(msg.tileUpdates!.length).toBe(1);
      expect(msg.tileUpdates![0].x).toBe(15);
      expect(msg.tileUpdates![0].y).toBe(12);
      expect(msg.tileUpdates![0].tile.walkable).toBe(true);
    }

    // Subsequent broadcast should have empty tileUpdates (cleared)
    sentPayload = null;
    room.broadcastZoneState(coord);
    const nextMsg: ServerMessage = JSON.parse(sentPayload!);
    if (nextMsg.type === 'WORLD_UPDATE') {
      expect(nextMsg.tileUpdates).toBeUndefined();
    }
  });
});

describe('Caves of Qud Overland Map Tiles & Biomes', () => {
  it('every parsec in 16x7 grid has an authentic extracted Qud tile sprite', () => {
    const validSpritePrefixes = ['/sprites/map_', '/sprites/loc_'];

    for (let py = 0; py < PARSEC_GRID_HEIGHT; py++) {
      for (let px = 0; px < PARSEC_GRID_WIDTH; px++) {
        const terrain = getParsecTerrainInfo(px, py);
        expect(terrain.spriteUrl).toBeTruthy();
        const hasValidPrefix = validSpritePrefixes.some(p => terrain.spriteUrl.startsWith(p));
        expect(hasValidPrefix).toBe(true);
        expect(terrain.spriteUrl.endsWith('.png')).toBe(true);
      }
    }
  });

  it('correctly maps specific biomes to appropriate extracted tile sprites', () => {
    // Water Mountain (3, 3) summit
    const waterMountain = getParsecTerrainInfo(3, 3);
    expect(waterMountain.spriteUrl).toBe('/sprites/loc_mountain.png');

    // General Water Mountain crags (2, 4)
    const mountainCrags = getParsecTerrainInfo(2, 4);
    expect(['/sprites/map_mountains.png', '/sprites/map_canyon.png']).toContain(mountainCrags.spriteUrl);

    // River / Wetlands (3, 1)
    const wetlands = getParsecTerrainInfo(3, 1);
    expect(['/sprites/map_river.png', '/sprites/map_marsh.png']).toContain(wetlands.spriteUrl);

    // Bone Wastes / Desert (5, 2)
    const desert = getParsecTerrainInfo(5, 2);
    expect(['/sprites/map_desert.png', '/sprites/map_monolith.png']).toContain(desert.spriteUrl);

    // Story POIs
    expect(getParsecTerrainInfo(0, 0).spriteUrl).toBe('/sprites/loc_spawn.png');
    expect(getParsecTerrainInfo(3, 0).spriteUrl).toBe('/sprites/loc_creek.png');
    expect(getParsecTerrainInfo(6, 3).spriteUrl).toBe('/sprites/loc_skeleton.png');
    expect(getParsecTerrainInfo(9, 3).spriteUrl).toBe('/sprites/loc_creeper.png');
    expect(getParsecTerrainInfo(9, 6).spriteUrl).toBe('/sprites/loc_power.png');
    expect(getParsecTerrainInfo(12, 6).spriteUrl).toBe('/sprites/loc_rocky.png');
    expect(getParsecTerrainInfo(15, 6).spriteUrl).toBe('/sprites/loc_final.png');
  });
});

describe('Organic Meandering Wilderness Paths & Archetypes', () => {
  it('paths meander non-linearly across zones with high curvature', () => {
    const zone = generateZone({ parasangX: 4, parasangY: 3, zoneX: 0, zoneY: 0, depth: 0 });

    // Collect dirt path coordinates
    const pathCoords: { x: number; y: number }[] = [];
    for (let y = 0; y < ZONE_HEIGHT; y++) {
      for (let x = 0; x < ZONE_WIDTH; x++) {
        if (zone.tiles[y][x].char === '░') {
          pathCoords.push({ x, y });
        }
      }
    }

    expect(pathCoords.length).toBeGreaterThanOrEqual(50);

    // Find the min and max Y for the horizontal path across columns 5..40
    const yValues = pathCoords.filter(p => p.x >= 5 && p.x <= 40).map(p => p.y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    // The path must meander across multiple Y values (not a dead-straight horizontal line)
    expect(maxY - minY).toBeGreaterThanOrEqual(3);
  });

  it('guarantees complete BFS reachability between all border exits', () => {
    const zone = generateZone({ parasangX: 7, parasangY: 2, zoneX: 1, zoneY: 2, depth: 0 });

    // West exits and East exits
    const westY = zone.tiles.findIndex(row => row[0].walkable);
    expect(westY).toBeGreaterThanOrEqual(0);

    const visited: boolean[][] = Array.from({ length: ZONE_HEIGHT }, () => Array(ZONE_WIDTH).fill(false));
    const queue: [number, number][] = [[0, westY]];
    visited[westY][0] = true;

    let reachedEastBorder = false;
    let reachedNorthBorder = false;
    let reachedSouthBorder = false;

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      if (cx === ZONE_WIDTH - 1) reachedEastBorder = true;
      if (cy === 0) reachedNorthBorder = true;
      if (cy === ZONE_HEIGHT - 1) reachedSouthBorder = true;

      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < ZONE_WIDTH && ny >= 0 && ny < ZONE_HEIGHT) {
          if (!visited[ny][nx] && zone.tiles[ny][nx].walkable) {
            visited[ny][nx] = true;
            queue.push([nx, ny]);
          }
        }
      }
    }

    expect(reachedEastBorder).toBe(true);
    expect(reachedNorthBorder).toBe(true);
    expect(reachedSouthBorder).toBe(true);
  });
});
