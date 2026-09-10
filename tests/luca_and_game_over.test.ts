import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../src/server/engine';
import { stepCompanionBot } from '../src/server/bots';
import { Entity, ZoneCoord } from '../src/shared/types';
import { generateZone } from '../src/server/mapGen';

describe('Luca Companion & Game Over Wipe Mechanics', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('Downed Status with Health Fix', () => {
    it('clears isDowned when a hero levels up and restores health', () => {
      const barrett = engine.entities.get('hero-barrett')!;
      barrett.isDowned = true;
      barrett.hp = 0;
      expect(barrett.isDowned).toBe(true);

      // Award XP to level up
      engine.addExperience(barrett, 120);

      expect(barrett.level).toBeGreaterThan(1);
      expect(barrett.hp).toBe(barrett.maxHp);
      expect(barrett.isDowned).toBe(false);
    });

    it('clears isDowned when recalculateEntityStats runs on an entity with HP > 0', () => {
      const luther = engine.entities.get('hero-luther')!;
      luther.isDowned = true;
      luther.hp = 80;

      engine.recalculateEntityStats(luther);
      expect(luther.isDowned).toBe(false);
    });

    it('clears isDowned when an entity uses a healing item', () => {
      const beau = engine.entities.get('hero-beau')!;
      beau.isDowned = true;
      beau.hp = 0;

      beau.inventory = [
        {
          id: 'potion-test',
          name: 'Healing Salve',
          type: 'consumable',
          symbol: '!',
          color: '#00ff00',
          healHp: 50
        }
      ];

      // Healing restores HP and clears downed
      engine.handleUseItem(beau.id, 'potion-test');
      expect(beau.hp).toBe(50);
      expect(beau.isDowned).toBe(false);
    });
  });

  describe('Game Over & Total Party Wipe', () => {
    it('does not trigger onGameOver if at least one hero is still standing', () => {
      const onGameOverMock = vi.fn();
      engine.onGameOver = onGameOverMock;

      const barrett = engine.entities.get('hero-barrett')!;
      const luther = engine.entities.get('hero-luther')!;
      const beau = engine.entities.get('hero-beau')!;

      barrett.isDowned = true;
      barrett.hp = 0;
      engine.checkGameOver();
      expect(onGameOverMock).not.toHaveBeenCalled();

      luther.isDowned = true;
      luther.hp = 0;
      engine.checkGameOver();
      expect(onGameOverMock).not.toHaveBeenCalled();

      expect(beau.isDowned).toBe(false);
      expect(beau.hp).toBeGreaterThan(0);
    });

    it('triggers onGameOver when all heroes in the party are downed / 0 HP', () => {
      const onGameOverMock = vi.fn();
      engine.onGameOver = onGameOverMock;

      const heroes = Array.from(engine.entities.values()).filter(e => e.isPlayer);
      for (const h of heroes) {
        h.isDowned = true;
        h.hp = 0;
      }

      const result = engine.checkGameOver();
      expect(result).toBe(true);
      expect(onGameOverMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Luca Trapped in Power Down Cage', () => {
    const powerDownCoord: ZoneCoord = { parasangX: 9, parasangY: 6, zoneX: 1, zoneY: 1, depth: 0 };

    it('generates the Power Down zone with trapped Luca in cage and release switch', () => {
      const zone = engine.getOrCreateZone(powerDownCoord);
      expect(zone.name).toBe('Power Down (The Complex)');

      // Check cage boundaries
      expect(zone.tiles[8][39].type).toBe('switch');
      expect(zone.tiles[8][39].char).toBe('☼');

      // Trapped Luca entity present in engine
      const trappedLuca = engine.entities.get('npc-luca-cage');
      expect(trappedLuca).toBeDefined();
      expect(trappedLuca?.role).toBe('luca');
      expect(trappedLuca?.x).toBe(36);
      expect(trappedLuca?.y).toBe(8);
      expect(engine.story.lucaRescued).toBe(false);
    });

    it('frees Luca when a player interacts with the cage release switch', () => {
      const onLucaRescuedMock = vi.fn();
      engine.onLucaRescued = onLucaRescuedMock;

      const barrett = engine.entities.get('hero-barrett')!;
      barrett.zone = { ...powerDownCoord };
      barrett.x = 40;
      barrett.y = 8;

      // Move onto / bump into switch at (39, 8)
      engine.handlePlayerMove(barrett.id, -1, 0);

      expect(engine.story.lucaRescued).toBe(true);
      expect(engine.entities.has('npc-luca-cage')).toBe(false);

      const luca = engine.entities.get('hero-luca');
      expect(luca).toBeDefined();
      expect(luca?.role).toBe('luca');
      expect(luca?.isPlayer).toBe(true);
      expect(luca?.isBot).toBe(true);
      expect(luca?.equipment?.weapon?.name).toContain('Kinetic');
      expect(luca?.equipment?.weapon?.name).toContain('Wand');
      expect(luca?.skillsLearned).toContain('kinetic_slam');
      expect(onLucaRescuedMock).toHaveBeenCalledWith(luca);

      // Verify cage bars opened
      const zone = engine.getOrCreateZone(powerDownCoord);
      expect(zone.tiles[8][34].walkable).toBe(true);
      expect(zone.tiles[8][38].walkable).toBe(true);
      expect(zone.tiles[8][39].char).toBe('✓');
    });

    it('frees Luca when a player mines through the cage wall', () => {
      const barrett = engine.entities.get('hero-barrett')!;
      barrett.zone = { ...powerDownCoord };
      barrett.x = 33;
      barrett.y = 8;

      // Excavate cage bar at (34, 8)
      const zone = engine.getOrCreateZone(powerDownCoord);
      zone.tiles[8][34].hp = 5; // Low hp so bump mining shatters it

      engine.handlePlayerMove(barrett.id, 1, 0);

      expect(engine.story.lucaRescued).toBe(true);
      expect(engine.entities.has('hero-luca')).toBe(true);
    });
  });

  describe('Luca AI & Kinetic Wand Wall Slam', () => {
    const testCoord: ZoneCoord = { parasangX: 2, parasangY: 2, zoneX: 1, zoneY: 1, depth: 0 };

    it('allows Luca companion to decide to teleport when in danger', () => {
      const zone = engine.getOrCreateZone(testCoord);
      const luca: Entity = {
        id: 'hero-luca',
        name: 'Luca',
        role: 'luca',
        x: 10,
        y: 10,
        zone: testCoord,
        symbol: '@',
        color: '#c084fc',
        hp: 20, // Low HP (< 35% of 100) -> danger!
        maxHp: 100,
        energy: 100,
        maxEnergy: 100,
        isPlayer: true,
        isBot: true,
        isDowned: false,
        statusEffects: {},
        inventory: [],
        facing: { dx: 1, dy: 0 }
      };

      const hostile: Entity = {
        id: 'hostile-crawler',
        name: 'Cave Crawler',
        x: 11,
        y: 10, // Adjacent hostile
        zone: testCoord,
        symbol: 'c',
        color: '#ff0000',
        hp: 50,
        maxHp: 50,
        isPlayer: false,
        statusEffects: {},
        inventory: [],
        facing: { dx: -1, dy: 0 }
      };

      const decision = stepCompanionBot(luca, [luca, hostile], zone);
      expect(decision.type).toBe('action');
      expect(decision.actionType).toBe('teleport');
    });

    it('allows Luca companion to choose kinetic_slam against enemies in range', () => {
      const zone = engine.getOrCreateZone(testCoord);
      const luca: Entity = {
        id: 'hero-luca',
        name: 'Luca',
        role: 'luca',
        x: 10,
        y: 10,
        zone: testCoord,
        symbol: '@',
        color: '#c084fc',
        hp: 100,
        maxHp: 100,
        energy: 100,
        maxEnergy: 100,
        isPlayer: true,
        isBot: true,
        isDowned: false,
        statusEffects: {},
        inventory: [],
        facing: { dx: 1, dy: 0 }
      };

      const hostile: Entity = {
        id: 'hostile-crawler',
        name: 'Cave Crawler',
        x: 13,
        y: 10, // Distance 3
        zone: testCoord,
        symbol: 'c',
        color: '#ff0000',
        hp: 90,
        maxHp: 90,
        isPlayer: false,
        statusEffects: {},
        inventory: [],
        facing: { dx: -1, dy: 0 }
      };

      const decision = stepCompanionBot(luca, [luca, hostile], zone);
      expect(decision.type).toBe('action');
      expect(decision.actionType).toBe('kinetic_slam');
      expect(decision.targetX).toBe(13);
      expect(decision.targetY).toBe(10);
    });

    it('pushes mobs into walls and inflicts massive wall slam collision damage + stun', () => {
      const zone = engine.getOrCreateZone(testCoord);
      // Place a wall at (14, 10)
      zone.tiles[10][14] = {
        type: 'wall',
        char: '#',
        color: '#aaaaaa',
        walkable: false,
        transparent: false
      };

      const luca: Entity = {
        id: 'hero-luca',
        name: 'Luca',
        role: 'luca',
        x: 10,
        y: 10,
        zone: testCoord,
        symbol: '@',
        color: '#c084fc',
        hp: 100,
        maxHp: 100,
        energy: 100,
        maxEnergy: 100,
        isPlayer: true,
        isBot: true,
        isDowned: false,
        statusEffects: {},
        inventory: [],
        facing: { dx: 1, dy: 0 },
        level: 2
      };
      engine.entities.set(luca.id, luca);

      const target: Entity = {
        id: 'mob-slam-target',
        name: 'Test Goblin',
        x: 12,
        y: 10, // 2 tiles from wall (14, 10)
        zone: testCoord,
        symbol: 'g',
        color: '#ff0000',
        hp: 120,
        maxHp: 120,
        isPlayer: false,
        statusEffects: {},
        inventory: [],
        facing: { dx: -1, dy: 0 }
      };
      engine.entities.set(target.id, target);

      // Execute kinetic slam
      engine.executeKineticSlam(luca, target.x, target.y);

      // Target was pushed towards (14, 10), hit the wall, suffered initial damage + wall slam collision!
      expect(target.hp).toBeLessThanOrEqual(120 - 80);
      expect(target.statusEffects.stunned).toBe(3);
      expect(target.statusEffects.frozen).toBe(2);
    });

    it('teleports Luca to safe coordinates during phase shift / teleport action', () => {
      const zone = engine.getOrCreateZone(testCoord);
      const luca: Entity = {
        id: 'hero-luca',
        name: 'Luca',
        role: 'luca',
        x: 10,
        y: 10,
        zone: testCoord,
        symbol: '@',
        color: '#c084fc',
        hp: 100,
        maxHp: 100,
        energy: 100,
        maxEnergy: 100,
        isPlayer: true,
        isBot: true,
        isDowned: false,
        statusEffects: {},
        inventory: [],
        facing: { dx: 1, dy: 0 }
      };
      engine.entities.set(luca.id, luca);

      // Teleport to (15, 15)
      engine.executeTeleport(luca, 15, 15);
      expect(luca.x).toBe(15);
      expect(luca.y).toBe(15);
    });
  });
});
