import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/server/engine';
import { generateZone } from '../src/server/mapGen';
import { ZONE_WIDTH, ZONE_HEIGHT } from '../src/shared/constants';
import { createItem } from '../src/server/items';

describe('Mining Mechanics, Tool Tiers, Crafting, and Procedural Connectivity', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('Procedural Generation & Zone Connectivity', () => {
    it('guarantees open arterial crossroads and boundary gateways across wilderness zones', () => {
      // Test across multiple procedural wilderness seeds/coordinates
      const testCoordinates = [
        { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 1, depth: 0 },
        { parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 0, depth: 0 },
        { parasangX: 0, parasangY: 0, zoneX: 2, zoneY: 2, depth: 0 },
        { parasangX: 1, parasangY: 0, zoneX: 1, zoneY: 1, depth: 0 },
        { parasangX: 2, parasangY: 1, zoneX: 0, zoneY: 0, depth: 0 },
        { parasangX: 3, parasangY: 2, zoneX: 2, zoneY: 1, depth: 0 }
      ];

      for (const coord of testCoordinates) {
        const zone = generateZone(coord);
        
        // Cardinal border crossways must be walkable
        const midY = Math.floor(ZONE_HEIGHT / 2);
        const midX = Math.floor(ZONE_WIDTH / 2);

        // West border (x = 0) at midY
        const westGateway = zone.tiles[midY][0].walkable || zone.tiles[midY + 1][0].walkable;
        expect(westGateway).toBe(true);

        // East border (x = ZONE_WIDTH - 1) at midY
        const eastGateway = zone.tiles[midY][ZONE_WIDTH - 1].walkable || zone.tiles[midY + 1][ZONE_WIDTH - 1].walkable;
        expect(eastGateway).toBe(true);

        // North border (y = 0) at midX
        const northGateway = zone.tiles[0][midX].walkable || zone.tiles[0][midX + 1].walkable;
        expect(northGateway).toBe(true);

        // South border (y = ZONE_HEIGHT - 1) at midX
        const southGateway = zone.tiles[ZONE_HEIGHT - 1][midX].walkable || zone.tiles[ZONE_HEIGHT - 1][midX + 1].walkable;
        expect(southGateway).toBe(true);

        // Breadth-First Search: from center arterial crossway, can we reach all 4 cardinal exits?
        const queue: Array<[number, number]> = [[midX, midY]];
        const visited = new Set<string>();
        visited.add(`${midX},${midY}`);

        let reachedNorth = false;
        let reachedSouth = false;
        let reachedWest = false;
        let reachedEast = false;

        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          if (cy === 0) reachedNorth = true;
          if (cy === ZONE_HEIGHT - 1) reachedSouth = true;
          if (cx === 0) reachedWest = true;
          if (cx === ZONE_WIDTH - 1) reachedEast = true;

          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < ZONE_WIDTH && ny >= 0 && ny < ZONE_HEIGHT) {
              const key = `${nx},${ny}`;
              if (!visited.has(key) && zone.tiles[ny][nx].walkable) {
                visited.add(key);
                queue.push([nx, ny]);
              }
            }
          }
        }

        expect(reachedNorth).toBe(true);
        expect(reachedSouth).toBe(true);
        expect(reachedWest).toBe(true);
        expect(reachedEast).toBe(true);
      }
    });

    it('ensures spawn house zone has open yard exits to all 4 cardinal borders', () => {
      const spawnZone = generateZone({ parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 });
      const midY = Math.floor(ZONE_HEIGHT / 2);
      const midX = Math.floor(ZONE_WIDTH / 2);

      // Verify border tiles are walkable exits
      expect(spawnZone.tiles[0][midX].walkable).toBe(true);
      expect(spawnZone.tiles[ZONE_HEIGHT - 1][midX].walkable).toBe(true);
      expect(spawnZone.tiles[midY][0].walkable).toBe(true);
      expect(spawnZone.tiles[midY][ZONE_WIDTH - 1].walkable).toBe(true);
    });

    it('ensures procedural cavern generation connects stairs and arterial crossways', () => {
      // Parsec (1, 1), Screen (1, 1), Depth 1 triggers generateProceduralCaverns
      const cavernZone = generateZone({ parasangX: 1, parasangY: 1, zoneX: 1, zoneY: 1, depth: 1 });
      
      // Look for stairs_up (<) and stairs_down (>)
      let upCoord: [number, number] | null = null;
      let downCoord: [number, number] | null = null;

      for (let y = 0; y < ZONE_HEIGHT; y++) {
        for (let x = 0; x < ZONE_WIDTH; x++) {
          if (cavernZone.tiles[y][x].type === 'stairs_up') upCoord = [x, y];
          if (cavernZone.tiles[y][x].type === 'stairs_down') downCoord = [x, y];
        }
      }

      expect(upCoord).not.toBeNull();
      expect(downCoord).not.toBeNull();

      if (upCoord && downCoord) {
        // Run BFS from stairs_up to verify reachability to stairs_down
        const queue: Array<[number, number]> = [upCoord];
        const visited = new Set<string>();
        visited.add(`${upCoord[0]},${upCoord[1]}`);
        let reachedDown = false;

        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          if (cx === downCoord[0] && cy === downCoord[1]) {
            reachedDown = true;
            break;
          }

          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < ZONE_WIDTH && ny >= 0 && ny < ZONE_HEIGHT) {
              const key = `${nx},${ny}`;
              if (!visited.has(key) && cavernZone.tiles[ny][nx].walkable) {
                visited.add(key);
                queue.push([nx, ny]);
              }
            }
          }
        }

        expect(reachedDown).toBe(true);
      }
    });
  });

  describe('Bump-to-Mine & Minus Damage Mechanics', () => {
    it('executes bump-to-mine when player attempts to walk into an unwalkable wall, emitting minus damage floating text', () => {
      const hero = engine.entities.get('hero-barrett')!;
      const zone = engine.getOrCreateZone(hero.zone);

      // Place hero at (5, 5) on a floor tile
      hero.x = 5;
      hero.y = 5;
      zone.tiles[5][5] = { type: 'floor', char: '.', color: '#555', walkable: true, transparent: true };

      // Place an unwalkable solid wall at (5, 4) directly North of hero
      zone.tiles[4][5] = {
        type: 'wall',
        char: '#',
        color: '#777',
        walkable: false,
        transparent: false,
        hp: 60,
        maxHp: 60,
        requiredTier: 1,
        oreName: 'Solid Granite'
      };

      // Ensure hero has Tier 1 pick equipped or in inventory
      hero.inventory = [createItem('mining_pick')];

      // Clear any previous floating texts
      engine.floatingTexts = [];

      // Attempt to move North into the wall
      engine.handlePlayerMove(hero.id, 0, -1);

      // Hero should NOT have walked through into the wall tile yet
      expect(hero.x).toBe(5);
      expect(hero.y).toBe(5);

      // Wall durability should have been reduced
      const targetTile = zone.tiles[4][5];
      expect(targetTile.hp).toBeLessThan(60);

      // Floating text should display minus damage on the wall tile (5, 4)
      const minusDamageText = engine.floatingTexts.find(ft => ft.x === 5 && ft.y === 4 && ft.text.startsWith('-') && ft.text.endsWith(' HP'));
      expect(minusDamageText).toBeDefined();
    });

    it('enforces tool tier requirements and deals 1 chip damage with warning when tier is insufficient', () => {
      const luther = engine.entities.get('hero-luther')!;
      const zone = engine.getOrCreateZone(luther.zone);

      luther.x = 10;
      luther.y = 10;
      zone.tiles[10][10] = { type: 'floor', char: '.', color: '#555', walkable: true, transparent: true };

      // High-tier wall: Tier 3 Obsidian Spire (Requires Tier 3 Plasma Drill)
      zone.tiles[9][10] = {
        type: 'wall',
        char: '▲',
        color: '#9933ff',
        walkable: false,
        transparent: false,
        hp: 120,
        maxHp: 120,
        requiredTier: 3,
        oreName: 'Obsidian Spire'
      };

      // Luther has bare hands (Tier 0)
      luther.inventory = [];
      luther.equipment = {};

      engine.floatingTexts = [];

      // Luther bumps into the Tier 3 obsidian wall
      engine.handlePlayerMove(luther.id, 0, -1);

      // Should only deal 1 chip damage
      const targetTile = zone.tiles[9][10];
      expect(targetTile.hp).toBe(119);

      // Should display -1 HP on the wall tile and NEED TIER 3! on the player tile
      const wallMinusOne = engine.floatingTexts.find(ft => ft.x === 10 && ft.y === 9 && ft.text === '-1 HP');
      const needTierText = engine.floatingTexts.find(ft => ft.x === 10 && ft.y === 10 && ft.text === 'NEED TIER 3!');
      expect(wallMinusOne).toBeDefined();
      expect(needTierText).toBeDefined();
    });

    it('excavates wall tile when HP reaches 0, turning it walkable, displaying *EXCAVATED!*, and dropping ores', () => {
      const hero = engine.entities.get('hero-barrett')!;
      const zone = engine.getOrCreateZone(hero.zone);

      hero.x = 12;
      hero.y = 12;
      zone.tiles[12][12] = { type: 'floor', char: '.', color: '#555', walkable: true, transparent: true };

      // Nearly broken copper vein wall at (12, 11)
      zone.tiles[11][12] = {
        type: 'wall',
        char: '░',
        color: '#c87d55',
        walkable: false,
        transparent: false,
        hp: 5,
        maxHp: 60,
        requiredTier: 1,
        oreDrop: 'copper_ore',
        oreName: 'Copper Vein'
      };

      hero.inventory = [createItem('mining_pick')];
      engine.floatingTexts = [];

      // Hero bumps into the weakened wall
      engine.handlePlayerMove(hero.id, 0, -1);

      // Wall should now be excavated and walkable
      const excavatedTile = zone.tiles[11][12];
      expect(excavatedTile.walkable).toBe(true);
      expect(excavatedTile.type).toBe('floor');

      // *EXCAVATED!* floating text should have appeared
      const excavatedText = engine.floatingTexts.find(ft => ft.x === 12 && ft.y === 11 && ft.text === '*EXCAVATED!*');
      expect(excavatedText).toBeDefined();

      // Dislodged copper ore should be on the ground at (12, 11)
      const droppedOre = zone.items.find(it => it.x === 12 && it.y === 11 && it.item.id.includes('copper_ore'));
      expect(droppedOre).toBeDefined();
    });

    it('gives Barrett innate miner bonuses (+15 dig power and +1 effective tier)', () => {
      const hero = engine.entities.get('hero-barrett')!;
      const bestTool = (engine as any).getPlayerBestMiningTool(hero);

      // Even with no tool, Barrett has Tier 1 effective tier and at least 25 dig power (10 base + 15 bonus)
      expect(bestTool.tier).toBeGreaterThanOrEqual(1);
      expect(bestTool.power).toBeGreaterThanOrEqual(25);
    });
  });

  describe('Workbench Multi-Tier Tool Crafting', () => {
    it('crafts Tier 1 Carbide Pickaxe using 2 Scrap Metal at workbench', () => {
      const player = engine.entities.get('hero-barrett')!;
      const zone = engine.getOrCreateZone(player.zone);

      // Position player at (10, 10), workbench at x=11, y=10
      player.x = 10;
      player.y = 10;
      zone.tiles[10][11] = {
        type: 'workbench',
        char: '§',
        color: '#d4a373',
        walkable: false,
        transparent: true
      };

      // Set inventory with 2 scrap metal
      player.inventory = [
        createItem('scrap_metal'),
        createItem('scrap_metal')
      ];

      // Mark laser crafted so weapon recipe is not forced
      engine.story.laserCrafted = true;

      // Interact with workbench at x=11, y=10
      engine.handleInteractAt(player.id, 11, 10);

      // Pickaxe should be created in inventory
      const craftedPick = player.inventory.find(it => it.id.includes('mining_pick'));
      expect(craftedPick).toBeDefined();
      expect(craftedPick?.miningTier).toBe(1);
    });

    it('crafts Tier 2 Steel Pickaxe using 3 Scrap Metal + 1 Iron Chunk', () => {
      const player = engine.entities.get('hero-barrett')!;
      const zone = engine.getOrCreateZone(player.zone);

      player.x = 10;
      player.y = 10;
      zone.tiles[10][11] = {
        type: 'workbench',
        char: '§',
        color: '#d4a373',
        walkable: false,
        transparent: true
      };

      player.inventory = [
        createItem('scrap_metal'),
        createItem('scrap_metal'),
        createItem('scrap_metal'),
        createItem('iron_ore')
      ];

      engine.story.laserCrafted = true;

      engine.handleInteractAt(player.id, 11, 10);

      const craftedPick = player.inventory.find(it => it.id.includes('hardened_pick'));
      expect(craftedPick).toBeDefined();
      expect(craftedPick?.miningTier).toBe(2);
    });

    it('crafts Tier 3 Plasma Drill using 3 Scrap Metal + 1 Obsidian Shard', () => {
      const player = engine.entities.get('hero-barrett')!;
      const zone = engine.getOrCreateZone(player.zone);

      player.x = 10;
      player.y = 10;
      zone.tiles[10][11] = {
        type: 'workbench',
        char: '§',
        color: '#d4a373',
        walkable: false,
        transparent: true
      };

      player.inventory = [
        createItem('scrap_metal'),
        createItem('scrap_metal'),
        createItem('scrap_metal'),
        createItem('obsidian_shard')
      ];

      engine.story.laserCrafted = true;

      engine.handleInteractAt(player.id, 11, 10);

      const craftedDrill = player.inventory.find(it => it.id.includes('plasma_drill'));
      expect(craftedDrill).toBeDefined();
      expect(craftedDrill?.miningTier).toBe(3);
    });

    it('crafts Tier 4 Quantum Laser Bore using 3 Scrap Metal + 1 Relic Superalloy', () => {
      const player = engine.entities.get('hero-barrett')!;
      const zone = engine.getOrCreateZone(player.zone);

      player.x = 10;
      player.y = 10;
      zone.tiles[10][11] = {
        type: 'workbench',
        char: '§',
        color: '#d4a373',
        walkable: false,
        transparent: true
      };

      player.inventory = [
        createItem('scrap_metal'),
        createItem('scrap_metal'),
        createItem('scrap_metal'),
        createItem('relic_superalloy')
      ];

      engine.story.laserCrafted = true;

      engine.handleInteractAt(player.id, 11, 10);

      const craftedBore = player.inventory.find(it => it.id.includes('quantum_bore'));
      expect(craftedBore).toBeDefined();
      expect(craftedBore?.miningTier).toBe(4);
    });
  });
});
