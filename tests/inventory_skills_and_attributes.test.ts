import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/server/engine';
import { createItem } from '../src/server/items';
import { areLikeItems, combineLikeItems, calculateHeroDerivedStats } from '../src/shared/formulas';
import { Item, Entity } from '../src/shared/types';
import { BASE_HERO_ATTRIBUTES } from '../src/shared/constants';

describe('Inventory Like-Item Combination & Stacking', () => {
  it('correctly identifies like items and combines counts', () => {
    const med1 = createItem('stim_salve', 2);
    const med2 = createItem('stim_salve', 3);

    expect(areLikeItems(med1, med2)).toBe(true);

    const combined = combineLikeItems([med1, med2]);
    expect(combined.length).toBe(1);
    expect(combined[0].name).toBe(med1.name);
    expect(combined[0].count).toBe(5);
  });

  it('does not combine different item types or pom-poms of different colors', () => {
    const redPom = { ...createItem('pom_pom_red'), colorTag: 'red' };
    const orangePom = { ...createItem('pom_pom_orange'), colorTag: 'orange' };

    expect(areLikeItems(redPom, orangePom)).toBe(false);

    const combined = combineLikeItems([redPom, orangePom]);
    expect(combined.length).toBe(2);
  });

  it('stacks items when added to inventory via addItemToInventory', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    player.inventory = [];

    const scrap1 = createItem('scrap_metal', 2);
    const scrap2 = createItem('scrap_metal', 3);

    engine.addItemToInventory(player, scrap1);
    expect(player.inventory.length).toBe(1);
    expect(player.inventory[0].count).toBe(2);

    engine.addItemToInventory(player, scrap2);
    expect(player.inventory.length).toBe(1);
    expect(player.inventory[0].count).toBe(5);
  });

  it('handles dropping 1 item from a stack and recombining when picked up', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    player.inventory = [createItem('stim_salve', 3)];

    const itemId = player.inventory[0].id;
    engine.handleDropItem(player.id, itemId);

    // Player should now have 2 in inventory
    expect(player.inventory.length).toBe(1);
    expect(player.inventory[0].count).toBe(2);

    // 1 dropped on ground
    const zone = engine.getOrCreateZone(player.zone);
    const groundItems = zone.items.filter(it => it.x === player.x && it.y === player.y);
    expect(groundItems.length).toBe(1);
    expect(groundItems[0].item.count).toBe(1);

    // Pick it back up
    engine.handlePickupItem(player.id, groundItems[0].item.id);
    expect(player.inventory.length).toBe(1);
    expect(player.inventory[0].count).toBe(3);
    expect(zone.items.filter(it => it.x === player.x && it.y === player.y).length).toBe(0);
  });
});

describe('Multi-Item Ground Pickup on Movement', () => {
  it('picks up EVERYTHING on the tile when player runs over it', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    player.x = 5;
    player.y = 5;
    player.inventory = [];

    const zone = engine.getOrCreateZone(player.zone);
    // Ensure tile (6, 5) is walkable
    zone.tiles[5][6].walkable = true;

    // Place 3 items on tile (6, 5): a weapon, a consumable, and scrap metal
    const dagger = createItem('phase_dagger', 1);
    const stim = createItem('stim_salve', 2);
    const scrap = createItem('scrap_metal', 4);

    zone.items.push(
      { x: 6, y: 5, item: dagger },
      { x: 6, y: 5, item: stim },
      { x: 6, y: 5, item: scrap }
    );

    expect(zone.items.filter(it => it.x === 6 && it.y === 5).length).toBe(3);

    // Player moves East onto (6, 5)
    engine.handlePlayerMove(player.id, 1, 0);

    expect(player.x).toBe(6);
    expect(player.y).toBe(5);

    // ALL items on (6, 5) must be picked up!
    const remainingGround = zone.items.filter(it => it.x === 6 && it.y === 5);
    expect(remainingGround.length).toBe(0);

    // Player inventory must contain all 3 items
    expect(player.inventory.length).toBe(3);
    expect(player.inventory.find(it => it.name === dagger.name)).toBeDefined();
    expect(player.inventory.find(it => it.name === stim.name)?.count).toBe(2);
    expect(player.inventory.find(it => it.name === scrap.name)?.count).toBe(4);
  });

  it('picks up all items when interacting with an adjacent tile', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    player.x = 5;
    player.y = 5;
    player.inventory = [];

    const zone = engine.getOrCreateZone(player.zone);
    const item1 = createItem('shield_battery', 1);
    const item2 = createItem('energy_cell', 2);

    zone.items.push(
      { x: 5, y: 6, item: item1 },
      { x: 5, y: 6, item: item2 }
    );

    // Player interacts with (5, 6) from (5, 5)
    engine.handleInteractAt(player.id, 5, 6);

    expect(zone.items.filter(it => it.x === 5 && it.y === 6).length).toBe(0);
    expect(player.inventory.length).toBe(2);
  });
});

describe('Attribute Points Allocation & Derived Stats Reflection', () => {
  it('allocates TOU points and immediately reflects in maxHp and hp', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('luther', 'Luther')!;
    player.attributePoints = 2;

    const baseTou = BASE_HERO_ATTRIBUTES.luther.tou; // 18
    expect(player.attributes?.tou).toBe(baseTou);
    const initialMaxHp = player.maxHp;

    // Allocate 1 point to TOU
    engine.handleAllocateAttribute(player.id, 'tou');

    expect(player.attributePoints).toBe(1);
    expect(player.attributes?.tou).toBe(baseTou + 1);

    // TOU grants +12 Max HP per point above base
    expect(player.maxHp).toBe(initialMaxHp + 12);
    expect(player.hp).toBe(initialMaxHp + 12);
  });

  it('allocates INT points and immediately reflects in maxEnergy', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('beau', 'Beau')!;
    player.attributePoints = 1;

    const baseInt = BASE_HERO_ATTRIBUTES.beau.int; // 18
    const initialMaxEnergy = player.maxEnergy;

    engine.handleAllocateAttribute(player.id, 'int');

    expect(player.attributes?.int).toBe(baseInt + 1);
    expect(player.maxEnergy).toBe(initialMaxEnergy + 10);
    expect(player.energy).toBe(initialMaxEnergy + 10);
  });

  it('allocates WIL points and grants force shield capacity', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    player.attributePoints = 1;

    const baseWil = BASE_HERO_ATTRIBUTES.barrett.wil; // 12
    engine.handleAllocateAttribute(player.id, 'wil');

    expect(player.attributes?.wil).toBe(baseWil + 1);
    expect(player.hasShield).toBe(true);
    // WIL grants +15 Shield per point above base
    expect(player.shieldHp).toBe(15);
  });

  it('calculateHeroDerivedStats returns correct values matching attributes', () => {
    const dummyHero: Entity = {
      id: 'test-hero',
      name: 'Tester',
      x: 0,
      y: 0,
      zone: { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 },
      symbol: '@',
      color: '#fff',
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      role: 'barrett',
      isPlayer: true,
      statusEffects: {},
      inventory: [],
      facing: { dx: 1, dy: 0 },
      level: 2,
      attributes: {
        str: 16, // +2 above base (14) -> +4 Melee ATK, 30 + 16*8 = 158 lbs
        agi: 20, // +2 above base (18) -> +4% Dodge, +3 Ranged ATK
        tou: 16, // +2 above base (14) -> +24 HP, -1 Dmg/Hit
        int: 18, // +2 above base (16) -> +20 EN
        wil: 14, // +2 above base (12) -> +30 Shield
        ego: 16  // +2 above base (14) -> +4% Ego
      }
    };

    const stats = calculateHeroDerivedStats(dummyHero);

    // Level 2 (+20 HP), TOU +2 (+24 HP) -> Max HP 144
    expect(stats.maxHp).toBe(100 + 20 + 24);
    expect(stats.touHpBonus).toBe(24);
    expect(stats.intEnergyBonus).toBe(20);
    expect(stats.maxEnergy).toBe(120);
    expect(stats.wilShieldBonus).toBe(30);
    expect(stats.shieldCap).toBe(30);
    expect(stats.meleeAtkBonus).toBe(4);
    expect(stats.rangedAtkBonus).toBe(3);
    expect(stats.dodgeChance).toBe(5 + 4);
    expect(stats.flatDamageReduction).toBe(1);
    expect(stats.maxCarryWeight).toBe(30 + 16 * 8); // 158
    expect(stats.partyEgoBonus).toBe(4);
  });
});
