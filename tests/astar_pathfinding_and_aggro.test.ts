import { describe, it, expect } from 'vitest';
import { findAStarPath, getHeroAggroRange, calculateHeroThreat } from '../src/shared/pathfinding';
import { Entity, ZoneData, ZoneTile } from '../src/shared/types';
import { GameEngine } from '../src/server/engine';

function createMockZone(width = 20, height = 20): ZoneData {
  const tiles: ZoneTile[][] = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = {
        type: 'dirt',
        symbol: '.',
        color: '#555555',
        walkable: true,
        transparent: true,
        items: []
      };
    }
  }
  return {
    coord: { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 },
    width,
    height,
    tiles,
    pacingMode: 'turn-based'
  };
}

describe('A* Pathfinding (findAStarPath)', () => {
  it('finds direct path across open floor', () => {
    const zone = createMockZone(10, 10);
    const result = findAStarPath(1, 1, 4, 1, zone, [], { stopAdjacent: false });
    expect(result).not.toBeNull();
    expect(result!.dx).toBe(1);
    expect(result!.dy).toBe(0);
    expect(result!.reachedGoal).toBe(true);
    expect(result!.path.length).toBe(4); // (1,1) -> (2,1) -> (3,1) -> (4,1)
  });

  it('navigates around a solid wall barrier', () => {
    const zone = createMockZone(10, 10);
    // Build a vertical wall from y=0 to y=3 at x=3
    for (let y = 0; y <= 3; y++) {
      zone.tiles[y][3] = {
        type: 'wall',
        symbol: '#',
        color: '#888888',
        walkable: false,
        transparent: false,
        items: []
      };
    }

    // Start at (1, 1), Goal at (5, 1). The shortest path must route down around y=4
    const result = findAStarPath(1, 1, 5, 1, zone, [], { stopAdjacent: false });
    expect(result).not.toBeNull();
    expect(result!.reachedGoal).toBe(true);
    // Every node in path must be walkable
    for (const node of result!.path) {
      expect(zone.tiles[node.y][node.x].walkable).toBe(true);
    }
  });

  it('honors stopAdjacent: true for melee combatants or companion following', () => {
    const zone = createMockZone(10, 10);
    const result = findAStarPath(1, 1, 5, 1, zone, [], { stopAdjacent: true });
    expect(result).not.toBeNull();
    expect(result!.reachedGoal).toBe(true);
    const lastNode = result!.path[result!.path.length - 1];
    // Last step should be adjacent to (5, 1), e.g. at (4, 1)
    expect(Math.abs(lastNode.x - 5)).toBeLessThanOrEqual(1);
    expect(Math.abs(lastNode.y - 1)).toBeLessThanOrEqual(1);
    expect(lastNode.x === 5 && lastNode.y === 1).toBe(false);
  });

  it('allows ghosts to phase straight through solid walls', () => {
    const zone = createMockZone(10, 10);
    // Solid wall at x=2
    for (let y = 0; y < 10; y++) {
      zone.tiles[y][2] = {
        type: 'wall',
        symbol: '#',
        color: '#888888',
        walkable: false,
        transparent: false,
        items: []
      };
    }

    // Normal non-ghost path cannot reach (4, 5)
    const normalResult = findAStarPath(1, 5, 4, 5, zone, [], { isGhost: false });
    expect(normalResult).toBeNull();

    // Ghost can phase directly through the wall
    const ghostResult = findAStarPath(1, 5, 4, 5, zone, [], { isGhost: true });
    expect(ghostResult).not.toBeNull();
    expect(ghostResult!.dx).toBe(1);
    expect(ghostResult!.dy).toBe(0);
    expect(ghostResult!.reachedGoal).toBe(true);
  });

  it('prevents diagonal corner cutting between two touching wall corners', () => {
    const zone = createMockZone(5, 5);
    // Diagonal touching corners: (1, 0) and (0, 1)
    zone.tiles[0][1].walkable = false;
    zone.tiles[1][0].walkable = false;

    // A unit at (0, 0) trying to move to (1, 1) cannot slip diagonally between them
    const result = findAStarPath(0, 0, 1, 1, zone, [], { allowDiagonals: true, isGhost: false });
    // Since (0,1) and (1,0) are both unwalkable walls, diagonal step (1,1) is illegal
    if (result && result.path.length > 1) {
      const step1 = result.path[1];
      expect(step1.x === 1 && step1.y === 1).toBe(false);
    }
  });

  it('avoids stepping onto occupied tiles of living entities', () => {
    const zone = createMockZone(10, 10);
    const blocker: Entity = {
      id: 'blocker',
      name: 'Allied Blocker',
      x: 2,
      y: 1,
      zone: zone.coord,
      symbol: '@',
      color: '#ffffff',
      hp: 50,
      maxHp: 50,
      energy: 50,
      maxEnergy: 50,
      isPlayer: true,
      statusEffects: {},
      inventory: [],
      facing: { dx: 1, dy: 0 }
    };

    // Path from (1, 1) to (3, 1). Tile (2, 1) is occupied by blocker.
    const result = findAStarPath(1, 1, 3, 1, zone, [blocker], {
      stopAdjacent: false,
      ignoreEntityId: 'mover'
    });
    expect(result).not.toBeNull();
    // First step should not be onto the blocker's tile (2, 1)
    expect(result!.dx === 1 && result!.dy === 0).toBe(false);
  });
});

describe('Hero-Dependent Aggro Range & Threat Evaluation', () => {
  const baseZone = { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 };

  const createHero = (role: 'luther' | 'barrett' | 'beau', overrides: Partial<Entity> = {}): Entity => ({
    id: `hero-${role}`,
    name: role.toUpperCase(),
    role,
    x: 10,
    y: 10,
    zone: baseZone,
    symbol: '@',
    color: '#ffffff',
    hp: 100,
    maxHp: 100,
    energy: 50,
    maxEnergy: 50,
    isPlayer: true,
    statusEffects: {},
    inventory: [],
    facing: { dx: 0, dy: 1 },
    attributes: { str: 10, agi: 10, tou: 10, int: 10, wil: 10, ego: 10 },
    ...overrides
  });

  const mob: Entity = {
    id: 'mob-1',
    name: 'Cave Stalker',
    x: 10,
    y: 22, // 12 tiles away
    zone: baseZone,
    symbol: 's',
    color: '#ff0000',
    hp: 60,
    maxHp: 60,
    energy: 50,
    maxEnergy: 50,
    isPlayer: false,
    statusEffects: {},
    inventory: [],
    facing: { dx: 0, dy: -1 }
  };

  it('differentiates base aggro range across heroes: Luther > Barrett > Beau', () => {
    const luther = createHero('luther');
    const barrett = createHero('barrett');
    const beau = createHero('beau');

    const lutherRange = getHeroAggroRange(luther, mob);
    const barrettRange = getHeroAggroRange(barrett, mob);
    const beauRange = getHeroAggroRange(beau, mob);

    expect(lutherRange).toBe(14);
    expect(barrettRange).toBe(10);
    expect(beauRange).toBe(7);

    // At distance 12, only Luther is detected!
    const dist = 12;
    expect(dist <= lutherRange).toBe(true);
    expect(dist <= barrettRange).toBe(false);
    expect(dist <= beauRange).toBe(false);
  });

  it('reduces aggro range with high Agility (stealth)', () => {
    const agileBarrett = createHero('barrett', {
      attributes: { str: 14, agi: 24, tou: 14, int: 16, wil: 12, ego: 14 }
    });
    const standardBarrett = createHero('barrett', {
      attributes: { str: 14, agi: 18, tou: 14, int: 16, wil: 12, ego: 14 }
    });

    const agileRange = getHeroAggroRange(agileBarrett, mob);
    const standardRange = getHeroAggroRange(standardBarrett, mob);

    expect(agileRange).toBeLessThan(standardRange);
    expect(agileRange).toBe(8); // 10 - 0.4*(24-18) = 10 - 2.4 = 7.6 -> 8
  });

  it('drops aggro range to 0 when hero is in phase walk / statusEffects.phase', () => {
    const phasedBeau = createHero('beau', {
      statusEffects: { phase: 4 }
    });
    expect(getHeroAggroRange(phasedBeau, mob)).toBe(0);
  });

  it('gives Luther frontline tank threat bonus and Beau threat reduction', () => {
    const luther = createHero('luther');
    const beau = createHero('beau');
    const barrett = createHero('barrett');

    const lutherThreat = calculateHeroThreat(luther, mob, 5);
    const beauThreat = calculateHeroThreat(beau, mob, 5);
    const barrettThreat = calculateHeroThreat(barrett, mob, 5);

    expect(lutherThreat).toBeGreaterThan(barrettThreat);
    expect(barrettThreat).toBeGreaterThan(beauThreat);
  });

  it('alerts mob and prioritizes hero who damaged it', () => {
    const barrett = createHero('barrett');
    const damagedMob: Entity = {
      ...mob,
      hp: 40,
      isAlerted: true,
      aggroTargetId: barrett.id
    };

    const alertRange = getHeroAggroRange(barrett, damagedMob);
    expect(alertRange).toBeGreaterThan(getHeroAggroRange(barrett, mob));

    const threatWithDamage = calculateHeroThreat(barrett, damagedMob, 5);
    const threatWithoutDamage = calculateHeroThreat(barrett, mob, 5);
    expect(threatWithDamage).toBeGreaterThan(threatWithoutDamage);
  });
});

describe('GameEngine AI & Aggro Simulation Integration', () => {
  it('mob pathfinds towards aggroed hero and attacks when adjacent', () => {
    const engine = new GameEngine();
    const zoneCoord = { parasangX: 0, parasangY: 0, zoneX: 2, zoneY: 2, depth: 0 };
    const zone = engine.getOrCreateZone(zoneCoord);

    // Place Luther as an active human-controlled player at (5, 5)
    const luther = engine.entities.get('hero-luther')!;
    luther.zone = zoneCoord;
    luther.isBot = false;
    luther.x = 5;
    luther.y = 5;

    // Move other heroes out of zone
    engine.entities.get('hero-barrett')!.zone = { parasangX: 99, parasangY: 99, zoneX: 0, zoneY: 0, depth: 0 };
    engine.entities.get('hero-beau')!.zone = { parasangX: 99, parasangY: 99, zoneX: 0, zoneY: 0, depth: 0 };

    // Place a melee mob at (5, 8) - distance 3, well within Luther's 14-tile aggro range
    const mobId = 'test-mob-1';
    const testMob: Entity = {
      id: mobId,
      name: 'Cave Crawler',
      x: 5,
      y: 8,
      zone: zoneCoord,
      symbol: 'c',
      color: '#ff0000',
      hp: 40,
      maxHp: 40,
      energy: 30,
      maxEnergy: 30,
      isPlayer: false,
      statusEffects: {},
      inventory: [],
      facing: { dx: 0, dy: -1 }
    };
    engine.entities.set(mobId, testMob);

    const initialY = testMob.y;
    // Step simulation
    engine.stepZoneSimulation(zoneCoord);

    // The mob should have moved north (towards y=5) using A*
    expect(testMob.y).toBeLessThan(initialY);
    expect(testMob.aggroTargetId).toBe(luther.id);
  });

  it('mob ignores heroes out of aggro range and does not pursue', () => {
    const engine = new GameEngine();
    const zoneCoord = { parasangX: 0, parasangY: 0, zoneX: 3, zoneY: 3, depth: 0 };
    const zone = engine.getOrCreateZone(zoneCoord);

    // Place Beau (aggro range 7) far away at (2, 2)
    const beau = engine.entities.get('hero-beau')!;
    beau.zone = zoneCoord;
    beau.x = 2;
    beau.y = 2;

    // Clear Luther and Barrett from this zone
    engine.entities.get('hero-luther')!.zone = { parasangX: 99, parasangY: 99, zoneX: 0, zoneY: 0, depth: 0 };
    engine.entities.get('hero-barrett')!.zone = { parasangX: 99, parasangY: 99, zoneX: 0, zoneY: 0, depth: 0 };

    // Place mob 18 tiles away at (20, 2)
    const mobId = 'test-mob-far';
    const testMob: Entity = {
      id: mobId,
      name: 'Sleeping Troll',
      x: 20,
      y: 2,
      zone: zoneCoord,
      symbol: 'T',
      color: '#ff0000',
      hp: 80,
      maxHp: 80,
      energy: 30,
      maxEnergy: 30,
      isPlayer: false,
      statusEffects: {},
      inventory: [],
      facing: { dx: -1, dy: 0 }
    };
    engine.entities.set(mobId, testMob);

    // Step simulation
    engine.stepZoneSimulation(zoneCoord);

    // Mob should NOT be aggroed on Beau
    expect(testMob.aggroTargetId).toBeUndefined();
    // Mob should remain near its patrol anchor (x ≈ 20, not chasing across map)
    expect(Math.abs(testMob.x - 20)).toBeLessThanOrEqual(1);
  });
});
