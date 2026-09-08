import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/server/engine';

describe('Player Downed State and Luther Revival', () => {
  it('places player into downed state when hp hits 0', () => {
    const engine = new GameEngine();
    const barrett = engine.entities.get('hero-barrett')!;

    // Simulate lethal damage
    barrett.hp = 0;
    (engine as any).handleEntityDeath(barrett);

    expect(barrett.isDowned).toBe(true);
    expect(barrett.hp).toBe(0);
    // Hero remains in entity map for revival
    expect(engine.entities.has('hero-barrett')).toBe(true);
  });

  it('allows Luther to revive downed allies back to 60 HP', () => {
    const engine = new GameEngine();
    const barrett = engine.entities.get('hero-barrett')!;
    const beau = engine.entities.get('hero-beau')!;
    const luther = engine.entities.get('hero-luther')!;

    barrett.isDowned = true;
    barrett.hp = 0;

    beau.isDowned = true;
    beau.hp = 0;

    // Luther uses revive action
    (engine as any).executeLutherRevive(luther);

    expect(barrett.isDowned).toBe(false);
    expect(barrett.hp).toBe(60);

    expect(beau.isDowned).toBe(false);
    expect(beau.hp).toBe(60);
  });

  it('allows downed player to wait, stepping turns so Luther bot pathfinds and revives them', () => {
    const engine = new GameEngine();
    const barrett = engine.entities.get('hero-barrett')!;
    const luther = engine.entities.get('hero-luther')!;

    barrett.isBot = false;
    luther.isBot = true;

    // Place Barrett and Luther in the same turn-based zone a few tiles apart
    barrett.x = 10;
    barrett.y = 12;
    barrett.isDowned = true;
    barrett.hp = 0;

    luther.x = 13;
    luther.y = 12;
    luther.isDowned = false;
    luther.hp = 100;

    // Barrett waits repeatedly
    for (let i = 0; i < 6; i++) {
      if (!barrett.isDowned) break;
      engine.handlePlayerAction('hero-barrett', 'wait');
    }

    // Luther bot should have pathfinded over and revived Barrett
    expect(barrett.isDowned).toBe(false);
    expect(barrett.hp).toBe(60);
  });

  it('allows downed player to crawl and advance simulation', () => {
    const engine = new GameEngine();
    const barrett = engine.entities.get('hero-barrett')!;

    barrett.isBot = false;
    barrett.x = 10;
    barrett.y = 12;
    barrett.isDowned = true;
    barrett.hp = 0;

    // Crawl East
    engine.handlePlayerMove('hero-barrett', 1, 0);

    expect(barrett.x).toBe(11);
    expect(barrett.y).toBe(12);
    expect(barrett.isDowned).toBe(true);
  });

  it('transfers companion bots when player descends stairs or changes zones', () => {
    const engine = new GameEngine();
    const barrett = engine.entities.get('hero-barrett')!;
    const luther = engine.entities.get('hero-luther')!;
    const beau = engine.entities.get('hero-beau')!;

    barrett.isBot = false;
    luther.isBot = true;
    beau.isBot = true;

    // Place party at stairs down in Spawn House (x: 10, y: 12)
    const zone = (engine as any).getOrCreateZone(barrett.zone);
    zone.tiles[12][11] = { type: 'stairs_down', char: '>', color: '#fff', walkable: true, transparent: true };
    barrett.x = 10;
    barrett.y = 12;

    // Barrett moves onto stairs down
    engine.handlePlayerMove('hero-barrett', 1, 0);

    // All party members should now be at depth 1 (Whitehill Mines)
    expect(barrett.zone.depth).toBe(1);
    expect(luther.zone.depth).toBe(1);
    expect(beau.zone.depth).toBe(1);
  });
});
