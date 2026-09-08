import { describe, it, expect } from 'vitest';
import { generateZone, generateProceduralWilderness } from '../src/server/mapGen';
import { GameEngine } from '../src/server/engine';
import { STORY_LOCATIONS, PARSEC_GRID_WIDTH, PARSEC_GRID_HEIGHT } from '../src/client/worldMap';
import { ZONE_WIDTH, ZONE_HEIGHT } from '../src/shared/constants';
import { Item, Entity } from '../src/shared/types';

describe('Expansive Parsecs & 3x3 Sub-Screen Map Architecture', () => {
  it('spaces substantial milestones 3 to 4 parsecs apart across the world', () => {
    // Check all 8 surface milestones
    const spawn = STORY_LOCATIONS.find(l => l.id === 'loc_spawn')!;
    const creek = STORY_LOCATIONS.find(l => l.id === 'loc_creek')!;
    const mountain = STORY_LOCATIONS.find(l => l.id === 'loc_mountain')!;
    const skeleton = STORY_LOCATIONS.find(l => l.id === 'loc_skeleton')!;
    const creeper = STORY_LOCATIONS.find(l => l.id === 'loc_creeper')!;
    const power = STORY_LOCATIONS.find(l => l.id === 'loc_power')!;
    const rocky = STORY_LOCATIONS.find(l => l.id === 'loc_rocky')!;
    const finalStand = STORY_LOCATIONS.find(l => l.id === 'loc_final')!;

    // Spawn (2,2) to Creek (3,0) = ~2.2 parsecs East/North
    const distSpawnCreek = Math.hypot(creek.coord.parasangX - spawn.coord.parasangX, creek.coord.parasangY - spawn.coord.parasangY);
    expect(distSpawnCreek).toBeGreaterThanOrEqual(2);
    expect(distSpawnCreek).toBeLessThanOrEqual(4);

    // Creek (3,0) to Mountain (3,3) = 3 parsecs South
    const distCreekMtn = Math.hypot(mountain.coord.parasangX - creek.coord.parasangX, mountain.coord.parasangY - creek.coord.parasangY);
    expect(distCreekMtn).toBe(3);

    // Mountain (3,3) to Skeleton (6,3) = 3 parsecs East
    const distMtnSkel = Math.hypot(skeleton.coord.parasangX - mountain.coord.parasangX, skeleton.coord.parasangY - mountain.coord.parasangY);
    expect(distMtnSkel).toBe(3);

    // Skeleton (6,3) to Creeper (9,3) = 3 parsecs East
    const distSkelCreep = Math.hypot(creeper.coord.parasangX - skeleton.coord.parasangX, creeper.coord.parasangY - skeleton.coord.parasangY);
    expect(distSkelCreep).toBe(3);

    // Creeper (9,3) to Power (9,6) = 3 parsecs South
    const distCreepPower = Math.hypot(power.coord.parasangX - creeper.coord.parasangX, power.coord.parasangY - creeper.coord.parasangY);
    expect(distCreepPower).toBe(3);

    // Power (9,6) to Rocky (12,6) = 3 parsecs East
    const distPowerRocky = Math.hypot(rocky.coord.parasangX - power.coord.parasangX, rocky.coord.parasangY - power.coord.parasangY);
    expect(distPowerRocky).toBe(3);

    // Rocky (12,6) to Final Stand (15,6) = 3 parsecs East
    const distRockyFinal = Math.hypot(finalStand.coord.parasangX - rocky.coord.parasangX, finalStand.coord.parasangY - rocky.coord.parasangY);
    expect(distRockyFinal).toBe(3);
  });

  it('generates 9 individual screens per parsec with guaranteed walkable cross-screen paths', () => {
    // Parsec (4, 4) is expansive procedural wilderness
    for (let zy = 0; zy < 3; zy++) {
      for (let zx = 0; zx < 3; zx++) {
        const zone = generateZone({ parasangX: 4, parasangY: 4, zoneX: zx, zoneY: zy, depth: 0 });
        expect(zone.width).toBe(ZONE_WIDTH);
        expect(zone.height).toBe(ZONE_HEIGHT);

        // Horizontal perimeter path at y = 13..14 must be walkable all the way across
        for (let x = 0; x < ZONE_WIDTH; x++) {
          expect(zone.tiles[13][x].walkable).toBe(true);
          expect(zone.tiles[14][x].walkable).toBe(true);
        }

        // Vertical perimeter path at x = 23..24 must be walkable all the way across
        for (let y = 0; y < ZONE_HEIGHT; y++) {
          expect(zone.tiles[y][23].walkable).toBe(true);
          expect(zone.tiles[y][24].walkable).toBe(true);
        }
      }
    }
  });

  it('generates varied regional biomes and ancient power runes in procedural parsecs', () => {
    const zones = [
      generateZone({ parasangX: 2, parasangY: 1, zoneX: 0, zoneY: 0, depth: 0 }), // Wetlands
      generateZone({ parasangX: 6, parasangY: 2, zoneX: 2, zoneY: 2, depth: 0 }), // Bone Wastes
      generateZone({ parasangX: 8, parasangY: 2, zoneX: 1, zoneY: 0, depth: 0 }), // Sulfur
      generateZone({ parasangX: 9, parasangY: 5, zoneX: 0, zoneY: 1, depth: 0 }), // Rust
      generateZone({ parasangX: 12, parasangY: 5, zoneX: 1, zoneY: 1, depth: 0 }), // Megaliths
    ];

    expect(zones[0].name).toContain('Murky Creek');
    expect(zones[1].name).toContain('Bone Wastes');
    expect(zones[2].name).toContain('Sulfur');
    expect(zones[3].name).toContain('Rust Complex');
    expect(zones[4].name).toContain('Colosseum Megaliths');

    // At least some procedural zones contain discovered runes or shrines
    let totalRunes = 0;
    for (let px = 0; px < 8; px++) {
      for (let py = 0; py < 4; py++) {
        const z = generateZone({ parasangX: px, parasangY: py, zoneX: 1, zoneY: 1, depth: 0 });
        const runes = z.items.filter(it => it.item.type === 'rune');
        totalRunes += runes.length;
      }
    }
    expect(totalRunes).toBeGreaterThan(5);
  });
});

describe('Ancient Rune Absorption & Permanent Hero Buffs', () => {
  it('absorbs power runes on player movement, granting permanent bonuses and healing', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett');
    expect(player).toBeDefined();

    const zone = engine.getOrCreateZone(player!.zone);

    // Place a Rune of Radiant Might on adjacent tile (15, 12)
    const mightRune: Item = {
      id: 'test-rune-might',
      name: 'Rune of Radiant Might',
      type: 'rune',
      symbol: 'ᚦ',
      color: '#ff4444',
      description: '+4 Attack Power',
      runeStat: 'might',
      runeBonus: 4
    };
    zone.items.push({ x: 15, y: 12, item: mightRune });

    // Initial damage bonus is 0
    expect(player!.runeBonuses?.damage || 0).toBe(0);

    // Step onto (15, 12)
    engine.handlePlayerMove(player!.id, 1, 0);

    expect(player!.x).toBe(15);
    expect(player!.y).toBe(12);
    expect(player!.runesCollected).toContain('test-rune-might');
    expect(player!.runeBonuses?.damage).toBe(4);

    // Rune item is removed from ground
    expect(zone.items.some(it => it.item.id === 'test-rune-might')).toBe(false);

    // Now place a Rune of Granite Vitality at (16, 12)
    const vitalityRune: Item = {
      id: 'test-rune-vitality',
      name: 'Rune of Granite Vitality',
      type: 'rune',
      symbol: 'ᚱ',
      color: '#00ff88',
      description: '+25 Max HP',
      runeStat: 'vitality',
      runeBonus: 25
    };
    zone.items.push({ x: 16, y: 12, item: vitalityRune });

    const prevMaxHp = player!.maxHp;
    engine.handlePlayerMove(player!.id, 1, 0);

    expect(player!.maxHp).toBe(prevMaxHp + 25);
    expect(player!.hp).toBe(player!.maxHp);
    expect(player!.runeBonuses?.maxHp).toBe(25);
  });

  it('absorbs Glacial Aegis rune and creates a protective energy shield', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('luther', 'Luther');
    const zone = engine.getOrCreateZone(player!.zone);

    const aegisRune: Item = {
      id: 'test-rune-aegis',
      name: 'Rune of the Glacial Aegis',
      type: 'rune',
      symbol: 'ᚺ',
      color: '#88ccff',
      description: '+35 Energy Shield',
      runeStat: 'aegis',
      runeBonus: 35
    };
    zone.items.push({ x: player!.x + 1, y: player!.y, item: aegisRune });

    engine.handlePlayerMove(player!.id, 1, 0);

    expect(player!.hasShield).toBe(true);
    expect(player!.shieldHp).toBe(35);
    expect(player!.runeBonuses?.shield).toBe(35);
  });

  it('amplifies laser shots and attacks with accumulated rune damage', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    player.runeBonuses = { damage: 15, maxHp: 0, maxEnergy: 0, shield: 0 };

    // Spawn an enemy
    const targetId = 'test-target-dummy';
    const dummy: Entity = {
      id: targetId,
      name: 'Training Dummy',
      x: 35,
      y: 12,
      zone: player.zone,
      symbol: 'T',
      color: '#ffffff',
      hp: 100,
      maxHp: 100,
      energy: 50,
      maxEnergy: 50,
      isPlayer: false,
      statusEffects: {},
      inventory: [],
      facing: { dx: 0, dy: 1 }
    };
    engine.entities.set(targetId, dummy);

    // Fire laser directly at target (base laser is 30, with +15 rune bonus = 45 damage)
    (engine as any).fireProjectile(player, 35, 12, 'laser');

    expect(dummy.hp).toBe(100 - (30 + 15));
  });

  it('absorbs incoming damage through energy shield before reducing health', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett');
    player!.hasShield = true;
    player!.shieldHp = 30;
    player!.hp = 100;

    // Direct damage attack from an enemy
    const enemy: any = {
      id: 'enemy-attacker',
      name: 'Cave Creeper',
      zone: player!.zone,
      role: undefined,
      runeBonuses: undefined
    };

    (engine as any).executeAttack(enemy, player);

    // Base strike is 25 damage: shield takes all 25 damage, shieldHp becomes 5, player hp remains 100
    expect(player!.shieldHp).toBe(5);
    expect(player!.hp).toBe(100);

    // Second strike of 25: shield takes 5 and breaks, remaining 20 hits HP (100 - 20 = 80)
    (engine as any).executeAttack(enemy, player);
    expect(player!.shieldHp).toBe(0);
    expect(player!.hasShield).toBe(false);
    expect(player!.hp).toBe(80);
  });
});

describe('Seamless Cross-Parsec and Cross-Screen Traversal', () => {
  it('seamlessly transitions across 3x3 screens within a parsec and into neighboring parsecs', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett');
    expect(player!.zone.parasangX).toBe(2);
    expect(player!.zone.zoneX).toBe(0);

    // Place at right screen border of (2, 2, 0, 0)
    player!.x = ZONE_WIDTH - 1;
    player!.y = 13;

    // Walk east past border
    engine.handlePlayerMove(player!.id, 1, 0);

    // Moved to screen (1, 0) of Parsec (2, 2)
    expect(player!.zone.parasangX).toBe(2);
    expect(player!.zone.zoneX).toBe(1);
    expect(player!.x).toBe(1);

    // Now place at right screen border of screen (1, 0)
    player!.x = ZONE_WIDTH - 1;
    player!.y = 13;
    engine.handlePlayerMove(player!.id, 1, 0);

    // Moved to screen (2, 0) of Parsec (2, 2)
    expect(player!.zone.parasangX).toBe(2);
    expect(player!.zone.zoneX).toBe(2);

    // Now walk east past screen (2, 0) border -> crosses into Parsec (3, 2), Screen (0, 0)!
    player!.x = ZONE_WIDTH - 1;
    player!.y = 13;
    engine.handlePlayerMove(player!.id, 1, 0);

    expect(player!.zone.parasangX).toBe(3);
    expect(player!.zone.zoneX).toBe(0);
    expect(player!.x).toBe(1);

    // Companions accompany player
    const beau = engine.entities.get('hero-beau')!;
    expect(beau.zone.parasangX).toBe(3);
    expect(beau.zone.zoneX).toBe(0);
  });
});
