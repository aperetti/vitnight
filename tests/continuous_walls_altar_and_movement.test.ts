import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/server/engine';
import { generateZone } from '../src/server/mapGen';
import { RAINBOW_ORDER } from '../src/shared/constants';

describe('Continuous Walls, Altar Inspection & Movement Controls', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('recognizes altar pedestals on Water Mountain and logs specific pedestal information', () => {
    const mountainCoord = { parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 1, depth: 0 };
    const player = engine.entities.get('hero-barrett')!;
    player.zone = { ...mountainCoord };
    player.x = 18;
    player.y = 13; // 1 tile above the first altar pedestal at (18, 14)

    const logs: string[] = [];
    engine.onLogMessage = (msg) => logs.push(msg.text);

    // Step down onto the Red altar pedestal at (18, 14)
    engine.handlePlayerMove(player.id, 0, 1);

    expect(player.x).toBe(18);
    expect(player.y).toBe(14);
    expect(logs.some(l => l.includes('RED Altar Pedestal') && l.includes('Pom-Pom'))).toBe(true);
  });

  it('places matching pom-pom when player steps on or interacts with altar pedestal', () => {
    const mountainCoord = { parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 1, depth: 0 };
    const player = engine.entities.get('hero-barrett')!;
    player.zone = { ...mountainCoord };
    player.x = 18;
    player.y = 13;

    // Give Barrett the red pom-pom
    player.inventory.push({
      id: 'pompom-red',
      name: 'Red Pom-Pom',
      type: 'puzzle_piece',
      symbol: '•',
      color: '#ff3344',
      colorTag: 'red'
    });

    const logs: string[] = [];
    engine.onLogMessage = (msg) => logs.push(msg.text);

    // Step onto the Red altar at (18, 14)
    engine.handlePlayerMove(player.id, 0, 1);

    expect(engine.story.rainbowPiecesPlaced.includes('red')).toBe(true);
    expect(player.inventory.some(it => it.id === 'pompom-red')).toBe(false);
    expect(logs.some(l => l.includes('places the Red Pom-Pom into the RED pedestal'))).toBe(true);
  });

  it('allows adjacent interaction with altar pedestal via handleInteractAt', () => {
    const mountainCoord = { parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 1, depth: 0 };
    const player = engine.entities.get('hero-barrett')!;
    player.zone = { ...mountainCoord };
    player.x = 20;
    player.y = 13; // 1 tile adjacent to Orange pedestal at (20, 14)

    // Give Barrett the orange pom-pom
    player.inventory.push({
      id: 'pompom-orange',
      name: 'Orange Pom-Pom',
      type: 'puzzle_piece',
      symbol: '•',
      color: '#ff8800',
      colorTag: 'orange'
    });

    const logs: string[] = [];
    engine.onLogMessage = (msg) => logs.push(msg.text);

    // Interact at adjacent altar pedestal (20, 14)
    engine.handleInteractAt(player.id, 20, 14);

    expect(engine.story.rainbowPiecesPlaced.includes('orange')).toBe(true);
    expect(logs.some(l => l.includes('places the Orange Pom-Pom into the ORANGE pedestal'))).toBe(true);
  });

  it('verifies continuous wall connectivity for horizontal and vertical rooms', () => {
    const spawnZone = generateZone({ parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 });
    
    // Check horizontal wall line at y = 6, x = 9 (between 8 and 22)
    const isWall = (tx: number, ty: number) => {
      const t = spawnZone.tiles[ty]?.[tx];
      return t && (t.type === 'wall' || t.type === 'breakable_wall' || t.type === 'door');
    };

    // At (9, 6): neighbor west (8, 6) is wall, neighbor east (10, 6) is wall, north and south are open
    expect(isWall(8, 6)).toBe(true);
    expect(isWall(10, 6)).toBe(true);
    expect(isWall(9, 5)).toBe(false);
    expect(isWall(9, 7)).toBe(false);

    // This confirms the continuous wall connectivity condition w && e && !n && !s
  });

  it('allows crafting at workbench when standing adjacent to it with required materials', () => {
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    // Move player adjacent to workbench (workbench is at 15, 10; stand at 15, 11)
    player.x = 15;
    player.y = 11;
    player.facing = { dx: 0, dy: -1 };

    // Give player scrap metal and focus crystal
    player.inventory.push({
      id: 'scrap-1',
      name: 'Scrap Metal',
      type: 'material',
      symbol: '⚙',
      color: '#8899aa',
      count: 2
    });
    player.inventory.push({
      id: 'crystal-1',
      name: 'Focus Crystal',
      type: 'material',
      symbol: '♦',
      color: '#00ffff',
      count: 1
    });

    const logs: string[] = [];
    engine.onLogMessage = (msg) => logs.push(msg.text);

    // Trigger craft action
    engine.handlePlayerAction(player.id, 'craft');

    expect(logs.some(l => l.includes('WORKBENCH CRAFTING SUCCESS') && l.includes('Laser Weapon'))).toBe(true);
    expect(engine.story.laserCrafted).toBe(true);
  });

  it('provides helpful recipe guide when standing adjacent to workbench without required items', () => {
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    player.x = 15;
    player.y = 11;
    player.facing = { dx: 0, dy: -1 };
    player.inventory = [];

    const logs: string[] = [];
    engine.onLogMessage = (msg) => logs.push(msg.text);

    engine.handlePlayerAction(player.id, 'craft');

    expect(logs.some(l => l.includes('Homestead Workbench Active'))).toBe(true);
  });

  it('allows mining through solid rock walls and turning them into walkable floor passages', () => {
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    const zone = engine.getOrCreateZone(player.zone);

    // Find a solid wall tile in the spawn house
    // (8, 6) is a solid wall
    expect(zone.tiles[6][8].walkable).toBe(false);

    // Place player at (9, 6), facing west (dx: -1, dy: 0) toward (8, 6)
    player.x = 9;
    player.y = 6;
    player.facing = { dx: -1, dy: 0 };

    const logs: string[] = [];
    engine.onLogMessage = (msg) => logs.push(msg.text);

    // Perform mine action until excavated
    while (!zone.tiles[6][8].walkable) {
      engine.handlePlayerAction(player.id, 'mine');
    }

    // The solid wall at (8, 6) should now be broken into a walkable floor
    expect(zone.tiles[6][8].walkable).toBe(true);
    expect(zone.tiles[6][8].type).toBe('floor');
    expect(logs.some(l => l.includes('mines through the solid rock wall') || l.includes('breaks through'))).toBe(true);
  });

  it('prevents transitioning out-of-bounds at the outer edge of the world realm', () => {
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    // Place at the far Northwest corner of the world realm: Parsec (0, 0), Screen (0, 0), x = 0, y = 0
    player.zone = { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 };
    player.x = 0;
    player.y = 13;

    const logs: string[] = [];
    engine.onLogMessage = (msg) => logs.push(msg.text);

    // Try to move west past the western frontier of the world
    engine.handlePlayerMove(player.id, -1, 0);

    // Player stays within frontier and zone remains Parsec 0
    expect(player.zone.parasangX).toBe(0);
    expect(player.zone.zoneX).toBe(0);
    expect(player.x).toBe(1);
    expect(logs.some(l => l.includes('impassable outer frontier of the realm'))).toBe(true);
  });
});
