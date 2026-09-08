import { describe, it, expect } from 'vitest';
import { calculateShatterExplosion, calculateKnockback } from '../src/shared/formulas';
import { Entity, Tile } from '../src/shared/types';
import { ZONE_WIDTH, ZONE_HEIGHT } from '../src/shared/constants';

describe('Elemental Combat Combos & Physics', () => {
  it('triggers SHATTER_EXPLOSION when frozen target is hit with fire', () => {
    const target: Entity = {
      id: 'target-1',
      name: 'Frozen Zombie',
      x: 10,
      y: 10,
      zone: { parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 0, depth: 0 },
      symbol: 'z',
      color: '#00ffff',
      hp: 50,
      maxHp: 60,
      energy: 50,
      maxEnergy: 50,
      isPlayer: false,
      statusEffects: { frozen: 5 },
      inventory: [],
      facing: { dx: 0, dy: 1 }
    };

    const bystander: Entity = {
      id: 'bystander-1',
      name: 'Nearby Skeleton',
      x: 11,
      y: 10,
      zone: { parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 0, depth: 0 },
      symbol: 's',
      color: '#ffffff',
      hp: 40,
      maxHp: 40,
      energy: 50,
      maxEnergy: 50,
      isPlayer: false,
      statusEffects: {},
      inventory: [],
      facing: { dx: 0, dy: 1 }
    };

    const result = calculateShatterExplosion(target, [target, bystander], true);

    expect(result.triggered).toBe(true);
    expect(result.damage).toBe(45);
    expect(result.aoeRadius).toBe(3);
    expect(target.statusEffects.frozen).toBeUndefined(); // Ice thawed / shattered
    expect(result.affectedEntities.length).toBe(1);
    expect(result.affectedEntities[0].id).toBe('bystander-1');
    expect(result.affectedEntities[0].damage).toBeGreaterThan(0);
  });

  it('does not trigger shatter explosion if target is not frozen or attack is not fire', () => {
    const target: Entity = {
      id: 'target-2',
      name: 'Normal Zombie',
      x: 10,
      y: 10,
      zone: { parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 0, depth: 0 },
      symbol: 'z',
      color: '#00ff00',
      hp: 50,
      maxHp: 60,
      energy: 50,
      maxEnergy: 50,
      isPlayer: false,
      statusEffects: {},
      inventory: [],
      facing: { dx: 0, dy: 1 }
    };

    const result = calculateShatterExplosion(target, [target], true);
    expect(result.triggered).toBe(false);

    target.statusEffects.frozen = 4;
    const nonFireResult = calculateShatterExplosion(target, [target], false);
    expect(nonFireResult.triggered).toBe(false);
  });

  it('calculates knockback displacement until obstacle', () => {
    const dummyTiles: Tile[][] = Array.from({ length: ZONE_HEIGHT }, () =>
      Array.from({ length: ZONE_WIDTH }, () => ({
        type: 'floor',
        char: '.',
        color: '#fff',
        walkable: true,
        transparent: true
      }))
    );

    // Add a wall at x: 15, y: 10
    dummyTiles[10][15] = {
      type: 'wall',
      char: '#',
      color: '#555',
      walkable: false,
      transparent: false
    };

    // Explosion at (10, 10), entity at (12, 10), knocked east toward the wall at (15, 10)
    const kb = calculateKnockback(10, 10, 12, 10, 5, dummyTiles, ZONE_WIDTH, ZONE_HEIGHT);

    expect(kb.finalX).toBe(14); // Stopped right before the wall at 15
    expect(kb.finalY).toBe(10);
    expect(kb.hitWall).toBe(true);
    expect(kb.wallImpactDamage).toBe(25);
  });
});
