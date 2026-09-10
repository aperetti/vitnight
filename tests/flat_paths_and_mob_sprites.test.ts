import { describe, it, expect } from 'vitest';
import { GameRenderer } from '../src/client/renderer';
import { GameEngine } from '../src/server/engine';
import { Entity, Tile, ZoneData } from '../src/shared/types';
import { COLORS, SYMBOLS } from '../src/shared/constants';

describe('Flat Paths & Mob Sprites', () => {
  const renderer = Object.create(GameRenderer.prototype) as GameRenderer;

  it('never maps path tiles or CP437 light shade to tile_dirt.png wall blocks', () => {
    const dummyZone: ZoneData = {
      coord: { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 },
      width: 48,
      height: 28,
      tiles: [],
      items: []
    };

    const pathTile: Tile = {
      type: 'floor',
      char: '░',
      color: COLORS.dirtPath,
      walkable: true,
      transparent: true
    };

    const url = renderer.getSpriteUrlForTile(pathTile, dummyZone);
    expect(url).toBeNull(); // Must NOT be '/sprites/tile_dirt.png'
  });

  it('correctly maps all zombie variants to monster_zombie.png', () => {
    const testCases: Partial<Entity>[] = [
      { name: 'Wasteland Zombie', symbol: 'z', isPlayer: false },
      { name: 'Murk Zombie', symbol: 'z', isPlayer: false },
      { name: '★ Armored Murk Zombie', symbol: 'z', isPlayer: false },
      { name: 'Crag Zombie', symbol: 'z', isPlayer: false },
      { name: 'Cavern Zombie Crawler', symbol: 'z', isPlayer: false },
      { name: 'Murk Ghoul', symbol: 'g', isPlayer: false },
      { name: 'Crag Prowler', symbol: 'g', isPlayer: false },
      { name: 'Snapjaw Scavenger', symbol: 'z', isPlayer: false },
      { name: 'Unknown Mob', symbol: 'z', isPlayer: false }
    ];

    for (const tc of testCases) {
      const url = renderer.getSpriteUrlForEntity(tc as Entity);
      expect(url).toBe('/sprites/monster_zombie.png');
    }
  });

  it('correctly maps all skeleton variants to monster_skeleton.png', () => {
    const testCases: Partial<Entity>[] = [
      { name: 'Wasteland Skeleton', symbol: 's', isPlayer: false },
      { name: 'Skeleton Archer', symbol: 's', isPlayer: false },
      { name: 'Bone Skeleton Archer', symbol: 's', isPlayer: false },
      { name: 'Skeleton Legionnaire', symbol: 's', isPlayer: false },
      { name: 'Bone Legionnaire', symbol: 'k', isPlayer: false },
      { name: 'Bone Vanguard', symbol: 'k', isPlayer: false },
      { name: 'Champion Skeleton Gladiator', symbol: 'S', isPlayer: false },
      { name: 'Cave Skeleton Titan', symbol: 'S', isPlayer: false },
      { name: 'Chrome Skeleton Automaton', symbol: 's', isPlayer: false }
    ];

    for (const tc of testCases) {
      const url = renderer.getSpriteUrlForEntity(tc as Entity);
      expect(url).toBe('/sprites/monster_skeleton.png');
    }
  });

  it('correctly maps all creeper variants to monster_creeper.png or monster_mutant_creeper.png', () => {
    const standardCreepers: Partial<Entity>[] = [
      { name: 'Sulfur Creeper', symbol: 'c', isPlayer: false },
      { name: '★ Volatile Creeper', symbol: 'c', isPlayer: false },
      { name: 'Crag Creeper', symbol: 'c', isPlayer: false },
      { name: 'Clockwork Creeper', symbol: 'c', isPlayer: false },
      { name: 'Magma Creeper', symbol: 'c', isPlayer: false },
      { name: 'Void Creeper', symbol: 'c', isPlayer: false }
    ];

    for (const tc of standardCreepers) {
      const url = renderer.getSpriteUrlForEntity(tc as Entity);
      expect(url).toBe('/sprites/monster_creeper.png');
    }

    const mutantCreepers: Partial<Entity>[] = [
      { name: '★ Shielded Mutant Creeper', symbol: 'C', isPlayer: false },
      { name: 'Mutant Creeper Vanguard', symbol: 'C', isPlayer: false }
    ];

    for (const tc of mutantCreepers) {
      const url = renderer.getSpriteUrlForEntity(tc as Entity);
      expect(url).toBe('/sprites/monster_mutant_creeper.png');
    }
  });

  it('never returns null for any hostile entity, always providing a valid sprite', () => {
    const unknownHostiles: Partial<Entity>[] = [
      { id: 'random-1', name: '★ Frenzied Zone Champion', symbol: '?', isPlayer: false },
      { id: 'alien-99', name: 'Xenomorph', symbol: 'X', isPlayer: false },
      { id: 'mob-123', name: 'Beast', symbol: '!', isPlayer: false }
    ];

    for (const h of unknownHostiles) {
      const url = renderer.getSpriteUrlForEntity(h as Entity);
      expect(url).not.toBeNull();
      expect(typeof url).toBe('string');
      expect([
        '/sprites/monster_zombie.png',
        '/sprites/monster_creeper.png',
        '/sprites/monster_skeleton.png'
      ]).toContain(url);
    }
  });

  it('engine wave spawning spawns named Zombies, Skeletons, and Creepers with intact names for elites', () => {
    const engine = new GameEngine();
    // Parsec (1, 1) zone (1, 1)
    const coord = { parasangX: 1, parasangY: 1, zoneX: 1, zoneY: 1, depth: 0 };
    engine.getOrCreateZone(coord);

    // Trigger wave spawn
    engine.spawnWaveForZone(coord, 1, 1);

    const spawned = Array.from(engine.entities.values()).filter(e => !e.isPlayer && e.zone.parasangX === 1);
    expect(spawned.length).toBeGreaterThan(0);

    for (const mob of spawned) {
      const lower = mob.name.toLowerCase();
      const hasKnownMobType = lower.includes('zombie') || lower.includes('skeleton') || lower.includes('creeper') || lower.includes('ghost');
      expect(hasKnownMobType).toBe(true);

      // Verify sprite mapping for this actual spawned entity
      const spriteUrl = renderer.getSpriteUrlForEntity(mob);
      expect(spriteUrl).not.toBeNull();
      expect([
        '/sprites/monster_zombie.png',
        '/sprites/monster_skeleton.png',
        '/sprites/monster_creeper.png',
        '/sprites/monster_ghost.png'
      ]).toContain(spriteUrl);
    }
  });
});
