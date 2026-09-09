import { ZoneCoord, ZoneData, Tile, Item } from '../shared/types';
import { ZONE_WIDTH, ZONE_HEIGHT, SYMBOLS, COLORS, RAINBOW_ORDER } from '../shared/constants';
export { ZONE_WIDTH, ZONE_HEIGHT };

function createBlankTiles(fillType: 'wall' | 'floor' = 'floor'): Tile[][] {
  const tiles: Tile[][] = [];
  for (let y = 0; y < ZONE_HEIGHT; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < ZONE_WIDTH; x++) {
      const isBorder = (x === 0 || x === ZONE_WIDTH - 1 || y === 0 || y === ZONE_HEIGHT - 1);
      const isCrossroad = ((y === 13 || y === 14) && (x === 0 || x === ZONE_WIDTH - 1)) ||
                          ((x === 23 || x === 24) && (y === 0 || y === ZONE_HEIGHT - 1));

      if (isBorder && isCrossroad && fillType !== 'wall') {
        row.push({
          type: 'floor',
          char: '░',
          color: COLORS.dirtPath,
          walkable: true,
          transparent: true
        });
      } else if (isBorder || fillType === 'wall') {
        row.push({
          type: 'wall',
          char: SYMBOLS.wall,
          color: COLORS.wallGray,
          walkable: false,
          transparent: false,
          minable: true,
          hp: 40,
          maxHp: 40,
          requiredTier: 1,
          oreDrop: 'scrap_metal',
          oreName: isBorder ? 'Perimeter Barrier' : 'Solid Rock Wall'
        });
      } else {
        const isComma = (x + y) % 5 === 0;
        row.push({
          type: 'floor',
          char: isComma ? ',' : '.',
          color: isComma ? COLORS.grassDim : COLORS.grassGreen,
          walkable: true,
          transparent: true
        });
      }
    }
    tiles.push(row);
  }
  return tiles;
}

export function generateZone(coord: ZoneCoord): ZoneData {
  const { parasangX, parasangY, zoneX, zoneY, depth } = coord;

  // Milestone 1: Homestead Outpost (Parsec 2, 2 or legacy 0, 0 at screen 0, 0)
  if (depth === 0 && (
    (parasangX === 2 && parasangY === 2 && zoneX === 0 && zoneY === 0) ||
    (parasangX === 0 && parasangY === 0 && zoneX === 0 && zoneY === 0)
  )) {
    return generateSpawnHouse(coord);
  }

  // Milestone 1 Subterranean: Whitehill Mines
  if (depth === 1 && ((parasangX === 2 && parasangY === 2) || (parasangX === 0 && (zoneX === 0 || zoneX === 1)))) {
    return generateWhitehillMines(coord);
  }

  // Milestone 2: Zombie Creek Crossing (Parsec 3, 0, Screen 1, 1 - also supports (2, 2, 1, 0) and legacy (0, 0, 1, 0))
  if (depth === 0 && (
    (parasangX === 3 && parasangY === 0 && zoneX === 1 && zoneY === 1) ||
    (parasangX === 2 && parasangY === 2 && zoneX === 1 && zoneY === 0) ||
    (parasangX === 0 && parasangY === 0 && zoneX === 1 && zoneY === 0)
  )) {
    return generateZombieCreek(coord);
  }

  // Milestone 3: Water Mountain & Rainbow Shrine (Parsec 3, 3, Screen 1, 1 - also supports legacy 0,0,1,1)
  if (depth === 0 && ((parasangX === 3 && parasangY === 3 && zoneX === 1 && zoneY === 1) || (parasangX === 0 && parasangY === 0 && zoneX === 1 && zoneY === 1))) {
    return generateWaterMountain(coord);
  }

  // Milestone 4: Skeleton Homestead Fortress (Parsec 6, 3, Screen 1, 1 - also supports legacy 1,0,0,0)
  if (depth === 0 && ((parasangX === 6 && parasangY === 3 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 0 && zoneX === 0 && zoneY === 0))) {
    return generateSkeletonHomestead(coord);
  }

  // Milestone 5: Creeper Homestead & Energy Shield (Parsec 9, 3, Screen 1, 1 - also supports legacy 1,0,1,0)
  if (depth === 0 && ((parasangX === 9 && parasangY === 3 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 0 && zoneX === 1 && zoneY === 0))) {
    return generateCreeperHomestead(coord);
  }

  // Milestone 6: Power Down Complex (Parsec 9, 6, Screen 1, 1 - also supports legacy 1,0,2,0)
  if (depth === 0 && ((parasangX === 9 && parasangY === 6 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 0 && zoneX === 2 && zoneY === 0))) {
    return generatePowerDown(coord);
  }

  // Milestone 7: Rocky Doom Colosseum (Parsec 12, 6, Screen 1, 1 - also supports legacy 1,0,2,1)
  if (depth === 0 && ((parasangX === 12 && parasangY === 6 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 0 && zoneX === 2 && zoneY === 1))) {
    return generateRockyDoom(coord);
  }

  // Milestone 8: The Final Stand (Parsec 15, 6, Screen 1, 1 - also supports legacy 1,1,0,0)
  if (depth === 0 && ((parasangX === 15 && parasangY === 6 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 1 && zoneX === 0 && zoneY === 0))) {
    return generateFinalStandArena(coord);
  }

  // Deep Subterranean Strata across any parsec
  if (depth >= 1) {
    return generateProceduralCaverns(coord);
  }

  // All other sub-parsec screens across the expansive world are procedurally randomly generated!
  return generateProceduralWilderness(coord);
}

function generateSpawnHouse(coord: ZoneCoord): ZoneData {
  const tiles = createBlankTiles('floor');
  const items: { x: number; y: number; item: Item }[] = [];

  // Build house walls (solid bright stone blocks)
  for (let x = 8; x <= 22; x++) {
    tiles[6][x] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.wallGray, walkable: false, transparent: false };
    tiles[18][x] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.wallGray, walkable: false, transparent: false };
  }
  for (let y = 6; y <= 18; y++) {
    tiles[y][8] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.wallGray, walkable: false, transparent: false };
    tiles[y][22] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.wallGray, walkable: false, transparent: false };
  }

  // House interior wooden flooring
  for (let y = 7; y <= 17; y++) {
    for (let x = 9; x <= 21; x++) {
      tiles[y][x] = {
        type: 'floor',
        char: '·',
        color: COLORS.floorWood,
        walkable: true,
        transparent: true
      };
    }
  }

  // Windows in house
  tiles[6][15] = { type: 'floor', char: '□', color: COLORS.cyan, walkable: false, transparent: true };
  tiles[18][15] = { type: 'floor', char: '□', color: COLORS.cyan, walkable: false, transparent: true };

  // Doorway east
  tiles[12][22] = { type: 'door', char: SYMBOLS.door, color: COLORS.amber, walkable: true, transparent: true };
  // Workbench inside house
  tiles[10][15] = { type: 'workbench', char: SYMBOLS.workbench, color: COLORS.amberBright, walkable: false, transparent: true };
  // Trapdoor / Stairs down to Whitehill Mines inside house
  tiles[15][12] = { type: 'stairs_down', char: SYMBOLS.stairsDown, color: COLORS.cyan, walkable: true, transparent: true };

  // Dirt paths leading east from doorway to Zombie Creek passage
  for (let x = 23; x < ZONE_WIDTH; x++) {
    tiles[12][x] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
    tiles[13][x] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
  }

  // North exit path connecting yard to North screen
  for (let y = 0; y <= 6; y++) {
    tiles[y][23] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
    tiles[y][24] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
  }

  // South exit path connecting yard to South screen
  for (let y = 18; y < ZONE_HEIGHT; y++) {
    tiles[y][23] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
    tiles[y][24] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
  }

  // West exit path circumventing house
  for (let x = 0; x <= 8; x++) {
    tiles[12][x] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
    tiles[13][x] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
  }
  for (let x = 6; x <= 23; x++) {
    tiles[4][x] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
  }
  for (let y = 4; y <= 13; y++) {
    tiles[y][6] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
  }

  // Scrap and crystals scattered outside for Barrett to collect
  items.push({
    x: 28,
    y: 10,
    item: { id: 'scrap-1', name: 'Scrap Metal', type: 'material', symbol: SYMBOLS.materialScrap, color: COLORS.amber, description: 'Refined scrap used for crafting laser weapons.' }
  });
  items.push({
    x: 32,
    y: 14,
    item: { id: 'scrap-2', name: 'Scrap Metal', type: 'material', symbol: SYMBOLS.materialScrap, color: COLORS.amber, description: 'Refined scrap used for crafting laser weapons.' }
  });
  items.push({
    x: 26,
    y: 18,
    item: { id: 'crystal-1', name: 'Laser Diode Crystal', type: 'material', symbol: SYMBOLS.materialCrystal, color: COLORS.cyan, description: 'Focusing crystal needed to craft Luther\'s Laser Weapon.' }
  });

  // Border exit gateway indicators
  tiles[12][ZONE_WIDTH - 1] = { type: 'floor', char: '>', color: COLORS.green, walkable: true, transparent: true };
  tiles[13][ZONE_WIDTH - 1] = { type: 'floor', char: '>', color: COLORS.green, walkable: true, transparent: true };
  tiles[12][0] = { type: 'floor', char: '<', color: COLORS.green, walkable: true, transparent: true };
  tiles[13][0] = { type: 'floor', char: '<', color: COLORS.green, walkable: true, transparent: true };
  tiles[0][23] = { type: 'floor', char: '^', color: COLORS.green, walkable: true, transparent: true };
  tiles[0][24] = { type: 'floor', char: '^', color: COLORS.green, walkable: true, transparent: true };
  tiles[ZONE_HEIGHT - 1][23] = { type: 'floor', char: 'v', color: COLORS.green, walkable: true, transparent: true };
  tiles[ZONE_HEIGHT - 1][24] = { type: 'floor', char: 'v', color: COLORS.green, walkable: true, transparent: true };

  return {
    coord,
    name: 'Homestead Outpost & Spawn House',
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items
  };
}

function generateWhitehillMines(coord: ZoneCoord): ZoneData {
  const tiles = createBlankTiles('wall');
  const items: { x: number; y: number; item: Item }[] = [];

  // Carve winding mining tunnels and ore veins
  const rooms = [
    { x: 5, y: 5, w: 10, h: 8 },
    { x: 18, y: 8, w: 12, h: 10 },
    { x: 32, y: 12, w: 12, h: 10 }
  ];

  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        tiles[y][x] = { type: 'floor', char: SYMBOLS.floor, color: COLORS.darkGray, walkable: true, transparent: true };
      }
    }
  }

  // Tunnels
  for (let x = 14; x <= 19; x++) {
    tiles[9][x] = { type: 'floor', char: SYMBOLS.floor, color: COLORS.darkGray, walkable: true, transparent: true };
  }
  for (let x = 28; x <= 34; x++) {
    tiles[15][x] = { type: 'floor', char: SYMBOLS.floor, color: COLORS.darkGray, walkable: true, transparent: true };
  }

  // Breakable stone walls containing ore
  for (let x = 18; x <= 22; x++) {
    tiles[12][x] = { type: 'breakable_wall', char: SYMBOLS.breakableWall, color: COLORS.stoneGray, walkable: false, transparent: false, minable: true };
  }

  // Stairs up back to the house
  tiles[7][8] = { type: 'stairs_up', char: SYMBOLS.stairsUp, color: COLORS.cyan, walkable: true, transparent: true };

  // Key reward in the deepest mine room
  items.push({
    x: 40,
    y: 17,
    item: {
      id: 'whitehill-key',
      name: 'Whitehill Mine Key',
      type: 'key',
      symbol: SYMBOLS.key,
      color: COLORS.bossGold,
      description: 'An ancient brass key discovered in the depths of Whitehill Mines.'
    }
  });

  return {
    coord,
    name: 'Whitehill Mines (Subterranean)',
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items
  };
}

function generateZombieCreek(coord: ZoneCoord): ZoneData {
  const tiles = createBlankTiles('floor');
  const items: { x: number; y: number; item: Item }[] = [];

  // Winding river running vertically
  for (let y = 1; y < ZONE_HEIGHT - 1; y++) {
    const streamX = Math.round(24 + Math.sin(y / 2.5) * 4);
    tiles[y][streamX - 1] = { type: 'mist', char: SYMBOLS.mist, color: COLORS.mistCyan, walkable: true, transparent: true };
    tiles[y][streamX] = { type: 'water', char: SYMBOLS.water, color: COLORS.waterBlue, walkable: true, transparent: true };
    tiles[y][streamX + 1] = { type: 'water', char: SYMBOLS.water, color: COLORS.waterBlue, walkable: true, transparent: true };
    tiles[y][streamX + 2] = { type: 'mist', char: SYMBOLS.mist, color: COLORS.mistCyan, walkable: true, transparent: true };
  }

  // Bridge across the creek
  for (let x = 20; x <= 28; x++) {
    tiles[14][x] = { type: 'floor', char: '=', color: COLORS.amber, walkable: true, transparent: true };
  }

  // Abandoned stone ruins where ghosts lurk and phase through walls
  for (let y = 4; y <= 10; y++) {
    tiles[y][10] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.stoneGray, walkable: false, transparent: false };
    tiles[y][16] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.stoneGray, walkable: false, transparent: false };
  }
  for (let x = 10; x <= 16; x++) {
    tiles[4][x] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.stoneGray, walkable: false, transparent: false };
  }

  // Exits
  tiles[12][0] = { type: 'floor', char: '<', color: COLORS.green, walkable: true, transparent: true };
  tiles[ZONE_HEIGHT - 1][24] = { type: 'floor', char: 'v', color: COLORS.cyan, walkable: true, transparent: true };

  return {
    coord,
    name: 'Zombie Creek',
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items
  };
}

function generateWaterMountain(coord: ZoneCoord): ZoneData {
  const tiles = createBlankTiles('floor');
  const items: { x: number; y: number; item: Item }[] = [];

  // Mountain ridges
  for (let x = 5; x < ZONE_WIDTH - 5; x++) {
    if (x < 18 || x > 30) {
      tiles[8][x] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.stoneGray, walkable: false, transparent: false };
      tiles[20][x] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.stoneGray, walkable: false, transparent: false };
    }
  }

  // The Broken Rainbow Puzzle Shrine (Altar with 6 colored pedestals in center)
  const pedestalColors = RAINBOW_ORDER;
  for (let i = 0; i < pedestalColors.length; i++) {
    const px = 18 + i * 2;
    const py = 14;
    tiles[py][px] = {
      type: 'altar',
      char: SYMBOLS.altar,
      color: COLORS.rainbow[pedestalColors[i]],
      walkable: true,
      transparent: true,
      pedestalColor: pedestalColors[i]
    };
  }

  // Victory Switch at the shrine top
  tiles[11][23] = {
    type: 'victory_switch',
    char: SYMBOLS.switch,
    color: COLORS.bossGold,
    walkable: true,
    transparent: true
  };

  // Scatter the 6 Rainbow Pom-Poms across the mountain trails
  const pomLocations = [
    { x: 8, y: 5, color: 'red' },
    { x: 40, y: 5, color: 'orange' },
    { x: 6, y: 22, color: 'yellow' },
    { x: 42, y: 22, color: 'green' },
    { x: 12, y: 14, color: 'blue' },
    { x: 36, y: 14, color: 'purple' }
  ];

  for (const loc of pomLocations) {
    items.push({
      x: loc.x,
      y: loc.y,
      item: {
        id: `pompom-${loc.color}`,
        name: `${loc.color.toUpperCase()} Pom-Pom`,
        type: 'puzzle_piece',
        symbol: SYMBOLS.pomPom,
        color: COLORS.rainbow[loc.color as keyof typeof COLORS.rainbow],
        description: `A fluffy ${loc.color} pom-pom puzzle piece for the Water Mountain shrine.`,
        colorTag: loc.color
      }
    });
  }

  // Entrance from north
  tiles[0][24] = { type: 'floor', char: '^', color: COLORS.green, walkable: true, transparent: true };
  // Exit to Level 2
  tiles[14][ZONE_WIDTH - 1] = { type: 'floor', char: '>', color: COLORS.bossGold, walkable: true, transparent: true };

  return {
    coord,
    name: 'Water Mountain (The Broken Puzzle)',
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items
  };
}

function generateSkeletonHomestead(coord: ZoneCoord): ZoneData {
  const tiles = createBlankTiles('floor');
  const items: { x: number; y: number; item: Item }[] = [];

  // Bone walls of the Skeleton Fortress
  for (let x = 12; x <= 36; x++) {
    tiles[6][x] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.boneWhite, walkable: false, transparent: false };
    tiles[22][x] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.boneWhite, walkable: false, transparent: false };
  }
  for (let y = 6; y <= 22; y++) {
    tiles[y][12] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.boneWhite, walkable: false, transparent: false };
    tiles[y][36] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.boneWhite, walkable: false, transparent: false };
  }

  // Gate
  tiles[14][12] = { type: 'door', char: SYMBOLS.door, color: COLORS.amber, walkable: true, transparent: true };
  tiles[14][36] = { type: 'door', char: SYMBOLS.door, color: COLORS.amber, walkable: true, transparent: true };

  // Campfire in the center
  tiles[14][24] = { type: 'workbench', char: '▲', color: COLORS.fireRed, walkable: true, transparent: true };

  // Healing potions in supply chest
  items.push({
    x: 23,
    y: 13,
    item: { id: 'potion-1', name: 'Magical Healing Draught', type: 'consumable', symbol: SYMBOLS.potion, color: COLORS.cyan, description: 'Restores fallen heroes from the brink of death.' }
  });
  items.push({
    x: 25,
    y: 13,
    item: { id: 'potion-2', name: 'Magical Healing Draught', type: 'consumable', symbol: SYMBOLS.potion, color: COLORS.cyan, description: 'Restores fallen heroes from the brink of death.' }
  });

  // Exit east to Creeper Homestead
  tiles[14][ZONE_WIDTH - 1] = { type: 'floor', char: '>', color: COLORS.green, walkable: true, transparent: true };

  return {
    coord,
    name: 'Skeleton Homestead Fortress',
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items
  };
}

function generateCreeperHomestead(coord: ZoneCoord): ZoneData {
  const tiles = createBlankTiles('floor');
  const items: { x: number; y: number; item: Item }[] = [];

  // Volatile green sulfur chamber
  for (let y = 4; y <= 23; y++) {
    tiles[y][8] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.greenDark, walkable: false, transparent: false };
    tiles[y][40] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.greenDark, walkable: false, transparent: false };
  }

  // Giant Energy Shield protecting the Mutant Creeper
  for (let y = 8; y <= 19; y++) {
    tiles[y][30] = { type: 'shield', char: SYMBOLS.shield, color: COLORS.cyan, walkable: false, transparent: true };
  }

  // Shield climbing scaffolding / ladder for Barrett
  tiles[7][30] = { type: 'floor', char: '#', color: COLORS.bossGold, walkable: true, transparent: true };
  tiles[20][30] = { type: 'floor', char: '#', color: COLORS.bossGold, walkable: true, transparent: true };

  // Exits
  tiles[14][0] = { type: 'floor', char: '<', color: COLORS.green, walkable: true, transparent: true };
  tiles[14][ZONE_WIDTH - 1] = { type: 'floor', char: '>', color: COLORS.amber, walkable: true, transparent: true };

  return {
    coord,
    name: 'Creeper Homestead (The Fortress Shield)',
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items
  };
}

function generatePowerDown(coord: ZoneCoord): ZoneData {
  const tiles = createBlankTiles('wall');
  const items: { x: number; y: number; item: Item }[] = [];

  // High-tech subterranean maze
  for (let y = 3; y < ZONE_HEIGHT - 3; y += 3) {
    for (let x = 3; x < ZONE_WIDTH - 3; x++) {
      tiles[y][x] = { type: 'floor', char: SYMBOLS.floor, color: COLORS.darkGray, walkable: true, transparent: true };
    }
  }
  for (let x = 6; x < ZONE_WIDTH - 6; x += 6) {
    for (let y = 3; y < ZONE_HEIGHT - 3; y++) {
      tiles[y][x] = { type: 'floor', char: SYMBOLS.floor, color: COLORS.darkGray, walkable: true, transparent: true };
    }
  }

  // Energy Relays & Lightsaber workbench
  tiles[14][24] = { type: 'workbench', char: SYMBOLS.workbench, color: COLORS.cyan, walkable: false, transparent: true };

  // Lightsabers before Rocky Doom!
  items.push({
    x: 23,
    y: 14,
    item: { id: 'saber-1', name: 'Emerald Lightsaber', type: 'weapon', symbol: SYMBOLS.lightsaber, color: COLORS.green, description: 'Humming plasma energy blade for Rocky Doom.' }
  });
  items.push({
    x: 25,
    y: 14,
    item: { id: 'saber-2', name: 'Cobalt Lightsaber', type: 'weapon', symbol: SYMBOLS.lightsaber, color: COLORS.cyan, description: 'Humming plasma energy blade for Rocky Doom.' }
  });
  items.push({
    x: 24,
    y: 15,
    item: { id: 'saber-3', name: 'Amber Lightsaber', type: 'weapon', symbol: SYMBOLS.lightsaber, color: COLORS.amberBright, description: 'Humming plasma energy blade for Rocky Doom.' }
  });

  // Exits
  tiles[14][0] = { type: 'floor', char: '<', color: COLORS.green, walkable: true, transparent: true };
  tiles[ZONE_HEIGHT - 1][24] = { type: 'floor', char: 'v', color: COLORS.fireRed, walkable: true, transparent: true };

  return {
    coord,
    name: 'Power Down (The Complex)',
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items
  };
}

function generateRockyDoom(coord: ZoneCoord): ZoneData {
  const tiles = createBlankTiles('floor');
  const items: { x: number; y: number; item: Item }[] = [];

  // Colosseum stone ring
  for (let y = 2; y < ZONE_HEIGHT - 2; y++) {
    for (let x = 2; x < ZONE_WIDTH - 2; x++) {
      const dx = x - ZONE_WIDTH / 2;
      const dy = (y - ZONE_HEIGHT / 2) * 1.5;
      if (Math.hypot(dx, dy) > 20) {
        tiles[y][x] = { type: 'wall', char: SYMBOLS.wall, color: COLORS.stoneGray, walkable: false, transparent: false };
      }
    }
  }

  // Gate from Power Down
  tiles[0][ZONE_WIDTH / 2] = { type: 'floor', char: '^', color: COLORS.cyan, walkable: true, transparent: true };

  return {
    coord,
    name: 'Rocky Doom (Colosseum of 100 Mini-Bosses)',
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items
  };
}

function generateFinalStandArena(coord: ZoneCoord): ZoneData {
  const tiles = createBlankTiles('floor');
  const items: { x: number; y: number; item: Item }[] = [];

  // Grand Throne Room of the Realm
  for (let x = 10; x < ZONE_WIDTH - 10; x += 4) {
    tiles[8][x] = { type: 'wall', char: '║', color: COLORS.bossGold, walkable: false, transparent: true };
    tiles[20][x] = { type: 'wall', char: '║', color: COLORS.bossGold, walkable: false, transparent: true };
  }

  // Barrett's emergency mining pillars for tactical cover
  tiles[12][16] = { type: 'breakable_wall', char: SYMBOLS.breakableWall, color: COLORS.amber, walkable: false, transparent: false, minable: true };
  tiles[16][16] = { type: 'breakable_wall', char: SYMBOLS.breakableWall, color: COLORS.amber, walkable: false, transparent: false, minable: true };
  tiles[12][32] = { type: 'breakable_wall', char: SYMBOLS.breakableWall, color: COLORS.amber, walkable: false, transparent: false, minable: true };
  tiles[16][32] = { type: 'breakable_wall', char: SYMBOLS.breakableWall, color: COLORS.amber, walkable: false, transparent: false, minable: true };

  return {
    coord,
    name: 'The Final Stand (Cooper\'s Birthday Climax)',
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items
  };
}

function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BiomeTheme {
  name: string;
  floorColor: string;
  wallColor: string;
  featureSymbol: string;
  featureColor: string;
  waterFreq: number;
  rockFreq: number;
  runePool: string[];
}

function getBiomeTheme(px: number, py: number, depth: number): BiomeTheme {
  if (depth > 0) {
    return {
      name: 'Subterranean Cavern Depths',
      floorColor: COLORS.darkGray,
      wallColor: COLORS.stoneGray,
      featureSymbol: '▲',
      featureColor: COLORS.cyanDark,
      waterFreq: 0.25,
      rockFreq: 0.45,
      runePool: ['vitality', 'might', 'aegis', 'zephyr']
    };
  }

  if (px <= 1) {
    return {
      name: 'Homestead Valley & Starapple Orchards',
      floorColor: COLORS.grassGreen,
      wallColor: COLORS.wallGray,
      featureSymbol: '%',
      featureColor: COLORS.green,
      waterFreq: 0.2,
      rockFreq: 0.2,
      runePool: ['vitality', 'might', 'zephyr', 'shepherd']
    };
  }

  if (px >= 2 && px <= 4 && py <= 2) {
    return {
      name: 'Murky Creek Wetlands & Ghost Fens',
      floorColor: COLORS.darkGray,
      wallColor: COLORS.stoneGray,
      featureSymbol: '~',
      featureColor: COLORS.mistCyan,
      waterFreq: 0.65,
      rockFreq: 0.2,
      runePool: ['cryo', 'zephyr', 'vitality', 'aegis']
    };
  }

  if (px >= 2 && px <= 5 && py >= 3) {
    return {
      name: 'Water Mountain Crags & High Pinnacles',
      floorColor: COLORS.stoneGray,
      wallColor: COLORS.stoneGray,
      featureSymbol: '▲',
      featureColor: COLORS.cyan,
      waterFreq: 0.35,
      rockFreq: 0.4,
      runePool: ['aegis', 'might', 'flame', 'baetyl']
    };
  }

  if (px >= 5 && px <= 7) {
    return {
      name: 'Calcified Bone Wastes & Palisade Ruins',
      floorColor: COLORS.boneWhite,
      wallColor: COLORS.boneWhite,
      featureSymbol: '✝',
      featureColor: COLORS.boneWhite,
      waterFreq: 0.05,
      rockFreq: 0.3,
      runePool: ['shepherd', 'might', 'aegis', 'vitality']
    };
  }

  if (px >= 8 && px <= 10 && py <= 4) {
    return {
      name: 'Sulfur Plains & Crevasse Scaffolding',
      floorColor: COLORS.amber,
      wallColor: COLORS.greenDark,
      featureSymbol: '≡',
      featureColor: COLORS.amberBright,
      waterFreq: 0.15,
      rockFreq: 0.35,
      runePool: ['flame', 'aegis', 'baetyl', 'might']
    };
  }

  if (px >= 8 && px <= 10 && py >= 5) {
    return {
      name: 'The Rust Complex & Power Conduit Ruins',
      floorColor: COLORS.cyanDark,
      wallColor: COLORS.cyan,
      featureSymbol: '∏',
      featureColor: COLORS.cyan,
      waterFreq: 0.1,
      rockFreq: 0.3,
      runePool: ['zephyr', 'baetyl', 'might', 'aegis']
    };
  }

  if (px >= 11 && px <= 13) {
    return {
      name: 'Colosseum Megaliths & Boulder Fields',
      floorColor: COLORS.stoneGray,
      wallColor: COLORS.bossGold,
      featureSymbol: '●',
      featureColor: COLORS.bossGold,
      waterFreq: 0.1,
      rockFreq: 0.45,
      runePool: ['might', 'aegis', 'baetyl', 'vitality']
    };
  }

  return {
    name: 'Astral Void & Nether Citadel Approach',
    floorColor: COLORS.purpleEnder,
    wallColor: COLORS.fireRed,
    featureSymbol: '★',
    featureColor: COLORS.bossGold,
    waterFreq: 0.1,
    rockFreq: 0.35,
    runePool: ['baetyl', 'might', 'vitality', 'zephyr']
  };
}

function createRuneItem(type: string, rng: () => number): Item {
  switch (type) {
    case 'might':
      return {
        id: `rune-might-${Math.floor(rng() * 10000)}`,
        name: 'Rune of Radiant Might',
        type: 'rune',
        symbol: 'ᚦ',
        color: COLORS.fireRed,
        description: 'An ancient crimson runestone. Permanently bestows +4 Attack Power to weapons, lasers, and spells!',
        runeStat: 'might',
        runeBonus: 4
      };
    case 'vitality':
      return {
        id: `rune-vitality-${Math.floor(rng() * 10000)}`,
        name: 'Rune of Granite Vitality',
        type: 'rune',
        symbol: 'ᚱ',
        color: COLORS.green,
        description: 'A verdant stone of primordial lifeforce. Permanently increases Max HP by +25 and heals to full!',
        runeStat: 'vitality',
        runeBonus: 25
      };
    case 'zephyr':
      return {
        id: `rune-zephyr-${Math.floor(rng() * 10000)}`,
        name: 'Rune of Zephyr Swiftness',
        type: 'rune',
        symbol: 'ᛋ',
        color: COLORS.cyan,
        description: 'An electrified rune humming with kinetic energy. Permanently increases Max Energy by +25!',
        runeStat: 'zephyr',
        runeBonus: 25
      };
    case 'aegis':
      return {
        id: `rune-aegis-${Math.floor(rng() * 10000)}`,
        name: 'Rune of the Glacial Aegis',
        type: 'rune',
        symbol: 'ᚺ',
        color: '#88ccff',
        description: 'A crystalline frost shield rune. Grants a permanent +35 Energy Shield to absorb incoming damage!',
        runeStat: 'aegis',
        runeBonus: 35
      };
    case 'baetyl':
      return {
        id: `rune-baetyl-${Math.floor(rng() * 10000)}`,
        name: 'Ancient Baetyl Matrix',
        type: 'rune',
        symbol: '🔮',
        color: COLORS.bossGold,
        description: 'A sacred quantum relic of the ancient elders. Permanently grants +2 Damage, +20 Max HP, +20 Energy, and +20 Shield!',
        runeStat: 'baetyl',
        runeBonus: 20
      };
    case 'flame':
      return {
        id: `rune-flame-${Math.floor(rng() * 10000)}`,
        name: 'Rune of Searing Flame',
        type: 'rune',
        symbol: '☼',
        color: '#ff6600',
        description: 'A burning elemental core. Permanently boosts Barrett\'s Fireball damage and explosive radius by +8!',
        runeStat: 'flame',
        runeBonus: 8
      };
    case 'cryo':
      return {
        id: `rune-cryo-${Math.floor(rng() * 10000)}`,
        name: 'Rune of Frost Mastery',
        type: 'rune',
        symbol: '❄',
        color: '#66ddff',
        description: 'A sub-zero cryo matrix. Permanently extends Beau\'s Ice Blast freeze duration and chill radius!',
        runeStat: 'cryo',
        runeBonus: 3
      };
    case 'shepherd':
    default:
      return {
        id: `rune-shepherd-${Math.floor(rng() * 10000)}`,
        name: 'Rune of the Dawnbringer',
        type: 'rune',
        symbol: '✝',
        color: COLORS.boneWhite,
        description: 'A holy talisman of the homestead protectors. Enhances Luther\'s revivals to restore allies with 100% full health and energy!',
        runeStat: 'shepherd',
        runeBonus: 1
      };
  }
}

function ensureZoneConnectivity(
  tiles: Tile[][],
  width: number,
  height: number,
  pathColor: string = COLORS.dirtPath,
  keyPoints: { x: number; y: number }[] = []
): void {
  // Find a central walkable point or use (23, 13)
  let startX = 23;
  let startY = 13;
  if (!tiles[startY]?.[startX]?.walkable) {
    for (let r = 0; r < 15; r++) {
      let found = false;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = startX + dx;
          const ny = startY + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && tiles[ny][nx].walkable) {
            startX = nx;
            startY = ny;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
  }

  tiles[startY][startX].walkable = true;
  tiles[startY][startX].transparent = true;

  const visited: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  const queue: [number, number][] = [[startX, startY]];
  visited[startY][startX] = true;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (!visited[ny][nx] && tiles[ny][nx].walkable) {
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }
    }
  }

  const borderTargets: { x: number; y: number }[] = [
    { x: 23, y: 0 }, { x: 24, y: 0 }, // North center
    { x: 23, y: height - 1 }, { x: 24, y: height - 1 }, // South center
    { x: 0, y: 13 }, { x: 0, y: 14 }, // West center
    { x: width - 1, y: 13 }, { x: width - 1, y: 14 },  // East center
    ...keyPoints
  ];

  for (const pt of borderTargets) {
    if (pt.y >= 0 && pt.y < height && pt.x >= 0 && pt.x < width && !visited[pt.y][pt.x]) {
      let cx = startX;
      let cy = startY;
      while (cx !== pt.x || cy !== pt.y) {
        if (cx < pt.x) cx++;
        else if (cx > pt.x) cx--;
        if (cy < pt.y) cy++;
        else if (cy > pt.y) cy--;

        if (tiles[cy]?.[cx] && !tiles[cy][cx].walkable) {
          tiles[cy][cx] = {
            type: 'floor',
            char: '░',
            color: pathColor,
            walkable: true,
            transparent: true
          };
        }
        if (tiles[cy]?.[cx]) visited[cy][cx] = true;
      }
      if (tiles[pt.y]?.[pt.x]) {
        tiles[pt.y][pt.x].walkable = true;
        tiles[pt.y][pt.x].transparent = true;
        visited[pt.y][pt.x] = true;
      }
    }
  }
}

export function generateProceduralWilderness(coord: ZoneCoord): ZoneData {
  const { parasangX, parasangY, zoneX, zoneY, depth } = coord;

  const seed = Math.abs(
    (parasangX * 73856093) ^
    (parasangY * 19349663) ^
    (zoneX * 83492791) ^
    (zoneY * 2654435761) ^
    (depth * 99999999)
  );
  const rng = createPRNG(seed);

  // 1. Biome Theme
  const theme = getBiomeTheme(parasangX, parasangY, depth);

  // 2. Base Floor Setup
  const tiles: Tile[][] = [];
  for (let y = 0; y < ZONE_HEIGHT; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < ZONE_WIDTH; x++) {
      const isComma = (x + y) % 7 === 0;
      row.push({
        type: 'floor',
        char: isComma ? ',' : SYMBOLS.floor,
        color: isComma ? COLORS.grassDim : theme.floorColor,
        walkable: true,
        transparent: true
      });
    }
    tiles.push(row);
  }

  const items: { x: number; y: number; item: Item }[] = [];

  // 3. Select 1 of 9 Rich Procedural Archetypes
  const archetype = Math.floor(rng() * 9);
  let archetypeName = 'Wilds';

  switch (archetype) {
    case 0: {
      // Archetype 0: Meandering River & Wooden Bridges
      archetypeName = 'River Crossing';
      for (let y = 0; y < ZONE_HEIGHT; y++) {
        const streamCenter = Math.round(24 + Math.sin(y * 0.35 + seed * 0.05) * 8);
        for (let dx = -2; dx <= 2; dx++) {
          const wx = streamCenter + dx;
          if (wx >= 1 && wx < ZONE_WIDTH - 1) {
            tiles[y][wx] = {
              type: 'water',
              char: SYMBOLS.water,
              color: COLORS.waterBlue,
              walkable: true,
              transparent: true
            };
          }
        }
        if (streamCenter - 3 >= 1) {
          tiles[y][streamCenter - 3] = { type: 'mist', char: '~', color: COLORS.mistCyan, walkable: true, transparent: true };
        }
        if (streamCenter + 3 < ZONE_WIDTH - 1) {
          tiles[y][streamCenter + 3] = { type: 'mist', char: '~', color: COLORS.mistCyan, walkable: true, transparent: true };
        }
      }
      // Wooden footbridges across the river
      const bridgeYs = [6, 13, 14, 21];
      for (const by of bridgeYs) {
        const streamCenter = Math.round(24 + Math.sin(by * 0.35 + seed * 0.05) * 8);
        for (let bx = streamCenter - 3; bx <= streamCenter + 3; bx++) {
          if (bx >= 0 && bx < ZONE_WIDTH) {
            tiles[by][bx] = { type: 'floor', char: '=', color: COLORS.amber, walkable: true, transparent: true };
          }
        }
      }
      items.push({
        x: 20 + Math.floor(rng() * 8),
        y: 8 + Math.floor(rng() * 12),
        item: {
          id: `copper-${Math.floor(rng() * 10000)}`,
          name: 'Raw Copper Nugget',
          type: 'material',
          symbol: '%',
          color: '#d97706',
          description: 'A nugget of native copper dislodged from the river sediment.'
        }
      });
      break;
    }

    case 1: {
      // Archetype 1: Ancient Colonnade Ruins of Qud
      archetypeName = 'Colonnade Ruins';
      for (let y = 6; y <= 21; y++) {
        for (let x = 12; x <= 35; x++) {
          if ((x + y) % 2 === 0) {
            tiles[y][x] = { type: 'floor', char: '▪', color: COLORS.floorStone, walkable: true, transparent: true };
          }
        }
      }
      for (let cx = 14; cx <= 33; cx += 3) {
        if (tiles[8]?.[cx]) {
          tiles[8][cx] = { type: 'wall', char: '║', color: COLORS.bossGold, walkable: false, transparent: true, minable: true, hp: 40, maxHp: 40, requiredTier: 1, oreDrop: 'scrap_metal', oreName: 'Ancient Column' };
        }
        if (tiles[19]?.[cx]) {
          tiles[19][cx] = { type: 'wall', char: '║', color: COLORS.bossGold, walkable: false, transparent: true, minable: true, hp: 40, maxHp: 40, requiredTier: 1, oreDrop: 'scrap_metal', oreName: 'Ancient Column' };
        }
      }
      tiles[13][19] = { type: 'wall', char: 'Ω', color: COLORS.cyan, walkable: false, transparent: true, minable: true, hp: 60, maxHp: 60, requiredTier: 2, oreDrop: 'diode_crystal', oreName: 'Ancient Tech Statue' };
      tiles[14][19] = { type: 'wall', char: 'Ω', color: COLORS.cyan, walkable: false, transparent: true, minable: true, hp: 60, maxHp: 60, requiredTier: 2, oreDrop: 'diode_crystal', oreName: 'Ancient Tech Statue' };
      items.push({
        x: 20,
        y: 11,
        item: {
          id: `relic-${Math.floor(rng() * 10000)}`,
          name: 'Ancient Relic Superalloy',
          type: 'material',
          symbol: 'Ω',
          color: COLORS.bossGold,
          description: 'A pre-collapse quantum alloy plate recovered from the colonnade ruins.'
        }
      });
      break;
    }

    case 2: {
      // Archetype 2: Abandoned Prospector Outpost & Cabins
      archetypeName = 'Prospector Outpost';
      for (let x = 8; x <= 18; x++) {
        tiles[5][x] = { type: 'wall', char: '#', color: COLORS.floorWood, walkable: false, transparent: false, minable: true, hp: 30, maxHp: 30, requiredTier: 0, oreDrop: 'scrap_metal', oreName: 'Cabin Timber Wall' };
        tiles[11][x] = { type: 'wall', char: '#', color: COLORS.floorWood, walkable: false, transparent: false, minable: true, hp: 30, maxHp: 30, requiredTier: 0, oreDrop: 'scrap_metal', oreName: 'Cabin Timber Wall' };
      }
      for (let y = 5; y <= 11; y++) {
        tiles[y][8] = { type: 'wall', char: '#', color: COLORS.floorWood, walkable: false, transparent: false, minable: true, hp: 30, maxHp: 30, requiredTier: 0, oreDrop: 'scrap_metal', oreName: 'Cabin Timber Wall' };
        tiles[y][18] = { type: 'wall', char: '#', color: COLORS.floorWood, walkable: false, transparent: false, minable: true, hp: 30, maxHp: 30, requiredTier: 0, oreDrop: 'scrap_metal', oreName: 'Cabin Timber Wall' };
      }
      for (let y = 6; y <= 10; y++) {
        for (let x = 9; x <= 17; x++) {
          tiles[y][x] = { type: 'floor', char: '·', color: COLORS.floorWood, walkable: true, transparent: true };
        }
      }
      tiles[8][18] = { type: 'door', char: SYMBOLS.door, color: COLORS.amber, walkable: true, transparent: true };
      tiles[7][10] = { type: 'workbench', char: SYMBOLS.workbench, color: COLORS.amberBright, walkable: false, transparent: true };
      for (let x = 19; x <= 32; x++) {
        tiles[8][x] = { type: 'floor', char: '=', color: COLORS.darkGray, walkable: true, transparent: true };
      }
      items.push({
        x: 14, y: 8,
        item: { id: `pick-${Math.floor(rng() * 10000)}`, name: 'Heavy Carbide Pickaxe', type: 'weapon', slot: 'weapon', symbol: '∏', color: COLORS.stoneGray, miningTier: 1, miningPower: 25, description: 'Reinforced carbide mining pick left behind by the prospector.' }
      });
      items.push({
        x: 22, y: 7,
        item: { id: `scrap-${Math.floor(rng() * 10000)}`, name: 'Scrap Metal', type: 'material', symbol: '%', color: COLORS.amber, description: 'Refined scrap used for workshop crafting.' }
      });
      break;
    }

    case 3: {
      // Archetype 3: Terraced Mineral Quarry & Exposed Strata
      archetypeName = 'Mineral Quarry';
      const quarrySpawns = [
        { x: 10, y: 6, char: '%', name: 'Copper Vein', drop: 'copper_ore', color: '#d97706', tier: 1, hp: 60 },
        { x: 11, y: 6, char: '%', name: 'Copper Vein', drop: 'copper_ore', color: '#d97706', tier: 1, hp: 60 },
        { x: 12, y: 6, char: '%', name: 'Copper Vein', drop: 'copper_ore', color: '#d97706', tier: 1, hp: 60 },
        { x: 32, y: 8, char: '■', name: 'Dense Iron Ore Vein', drop: 'iron_ore', color: '#94a3b8', tier: 2, hp: 80 },
        { x: 33, y: 8, char: '■', name: 'Dense Iron Ore Vein', drop: 'iron_ore', color: '#94a3b8', tier: 2, hp: 80 },
        { x: 34, y: 8, char: '■', name: 'Dense Iron Ore Vein', drop: 'iron_ore', color: '#94a3b8', tier: 2, hp: 80 },
        { x: 15, y: 19, char: '▲', name: 'Obsidian Spire', drop: 'obsidian_shard', color: '#aa33ff', tier: 3, hp: 120 },
        { x: 16, y: 19, char: '▲', name: 'Obsidian Spire', drop: 'obsidian_shard', color: '#aa33ff', tier: 3, hp: 120 },
        { x: 36, y: 20, char: '%', name: 'Copper Vein', drop: 'copper_ore', color: '#d97706', tier: 1, hp: 60 }
      ];
      for (const q of quarrySpawns) {
        if (!((q.y >= 12 && q.y <= 15) || (q.x >= 22 && q.x <= 25))) {
          tiles[q.y][q.x] = {
            type: 'breakable_wall',
            char: q.char,
            color: q.color,
            walkable: false,
            transparent: false,
            minable: true,
            hp: q.hp,
            maxHp: q.hp,
            requiredTier: q.tier,
            oreDrop: q.drop,
            oreName: q.name
          };
        }
      }
      for (let y = 7; y <= 10; y++) {
        for (let x = 13; x <= 20; x++) {
          tiles[y][x] = { type: 'floor', char: ':', color: COLORS.stoneGray, walkable: true, transparent: true };
        }
      }
      items.push({
        x: 16, y: 9,
        item: { id: `iron-${Math.floor(rng() * 10000)}`, name: 'High-Grade Iron Chunk', type: 'material', symbol: '■', color: '#94a3b8', description: 'Heavy magnetic iron ore mined from the quarry strata.' }
      });
      break;
    }

    case 4: {
      // Archetype 4: Bioluminescent Fungal Thicket
      archetypeName = 'Fungal Thicket';
      for (let y = 3; y < ZONE_HEIGHT - 3; y++) {
        for (let x = 3; x < ZONE_WIDTH - 3; x++) {
          if ((x * 3 + y * 5) % 4 === 0) {
            tiles[y][x] = { type: 'floor', char: '"', color: COLORS.grassDim, walkable: true, transparent: true };
          }
        }
      }
      const mushroomPositions = [
        { x: 8, y: 7, color: COLORS.cyan },
        { x: 15, y: 6, color: '#ff44aa' },
        { x: 32, y: 8, color: COLORS.amberBright },
        { x: 38, y: 7, color: COLORS.cyan },
        { x: 10, y: 19, color: '#ff44aa' },
        { x: 16, y: 22, color: COLORS.cyan },
        { x: 33, y: 19, color: COLORS.amberBright },
        { x: 39, y: 21, color: '#ff44aa' }
      ];
      for (const m of mushroomPositions) {
        if (!((m.y >= 12 && m.y <= 15) || (m.x >= 22 && m.x <= 25))) {
          tiles[m.y][m.x] = {
            type: 'wall',
            char: '♠',
            color: m.color,
            walkable: false,
            transparent: true,
            minable: true,
            hp: 25,
            maxHp: 25,
            requiredTier: 0,
            oreDrop: 'scrap_metal',
            oreName: 'Luminescent Mushroom Stalk'
          };
        }
      }
      items.push({
        x: 12, y: 9,
        item: { id: `salve-${Math.floor(rng() * 10000)}`, name: 'Nanite Stim-Salve', type: 'consumable', symbol: '!', color: COLORS.green, healHp: 45, cureStatus: true, description: 'A restorative bio-salve distilled from luminous fungus spores.' }
      });
      break;
    }

    case 5: {
      // Archetype 5: Geothermal Fissures & Basalt Crags
      archetypeName = 'Geothermal Crags';
      const basaltPositions = [
        { x: 11, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 8 },
        { x: 34, y: 6 }, { x: 35, y: 6 }, { x: 35, y: 7 },
        { x: 10, y: 19 }, { x: 11, y: 19 }, { x: 10, y: 20 },
        { x: 33, y: 20 }, { x: 34, y: 20 }, { x: 34, y: 21 }
      ];
      for (const b of basaltPositions) {
        if (!((b.y >= 12 && b.y <= 15) || (b.x >= 22 && b.x <= 25))) {
          tiles[b.y][b.x] = {
            type: 'wall',
            char: '▲',
            color: COLORS.darkGray,
            walkable: false,
            transparent: false,
            minable: true,
            hp: 60,
            maxHp: 60,
            requiredTier: 1,
            oreDrop: 'scrap_metal',
            oreName: 'Basalt Crag'
          };
        }
      }
      for (let i = 0; i < 4; i++) {
        const fx = 14 + Math.floor(rng() * 20);
        const fy = 5 + Math.floor(rng() * 16);
        if (!((fy >= 12 && fy <= 15) || (fx >= 22 && fx <= 25))) {
          tiles[fy][fx] = { type: 'mist', char: '~', color: COLORS.fireRed, walkable: true, transparent: true };
        }
      }
      items.push({
        x: 18, y: 18,
        item: { id: `obsidian-${Math.floor(rng() * 10000)}`, name: 'Volcanic Obsidian Glass', type: 'material', symbol: '▲', color: '#aa33ff', description: 'Super-sharp vitreous silicate found near geothermal vents.' }
      });
      break;
    }

    case 6: {
      // Archetype 6: Baetyl Monoliths & Sacred Stone Circle
      archetypeName = 'Baetyl Monoliths';
      const hengePositions = [
        { x: 18, y: 9 }, { x: 28, y: 9 },
        { x: 16, y: 13 }, { x: 30, y: 13 },
        { x: 18, y: 18 }, { x: 28, y: 18 }
      ];
      for (const h of hengePositions) {
        tiles[h.y][h.x] = {
          type: 'wall',
          char: 'Ω',
          color: COLORS.bossGold,
          walkable: false,
          transparent: true,
          minable: true,
          hp: 80,
          maxHp: 80,
          requiredTier: 2,
          oreDrop: 'diode_crystal',
          oreName: 'Baetyl Monolith'
        };
      }
      tiles[13][23] = { type: 'floor', char: '☼', color: COLORS.bossGold, walkable: true, transparent: true };
      tiles[14][24] = { type: 'floor', char: '☼', color: COLORS.bossGold, walkable: true, transparent: true };

      const runeType = theme.runePool[Math.floor(rng() * theme.runePool.length)];
      items.push({ x: 22, y: 12, item: createRuneItem(runeType, rng) });
      break;
    }

    case 7: {
      // Archetype 7: Wildflower Meadow & Watervine Orchard
      archetypeName = 'Wildflower Meadow';
      const flowerColors = ['#f472b6', '#38bdf8', '#facc15', '#c084fc', '#4ade80'];
      for (let y = 3; y < ZONE_HEIGHT - 3; y++) {
        for (let x = 3; x < ZONE_WIDTH - 3; x++) {
          const flowerHash = (x * 17 + y * 31 + seed) % 100;
          if (flowerHash < 18) {
            // Wildflower bloom
            tiles[y][x] = {
              type: 'floor',
              char: flowerHash % 3 === 0 ? '*' : (flowerHash % 3 === 1 ? '✿' : ','),
              color: flowerColors[flowerHash % flowerColors.length],
              walkable: true,
              transparent: true
            };
          } else if (flowerHash >= 80 && flowerHash < 88) {
            // Watervine stalk
            tiles[y][x] = {
              type: 'breakable_wall',
              char: flowerHash % 2 === 0 ? '♣' : '¥',
              color: '#22c55e',
              walkable: false,
              transparent: true,
              minable: true,
              hp: 20,
              maxHp: 20,
              requiredTier: 0,
              oreDrop: 'pom_pom_fruit',
              oreName: 'Watervine Stalk'
            };
          }
        }
      }
      items.push({
        x: 15 + Math.floor(rng() * 18),
        y: 8 + Math.floor(rng() * 12),
        item: {
          id: `starapple-${Math.floor(rng() * 10000)}`,
          name: 'Sweet Starapple',
          type: 'consumable',
          symbol: '♣',
          color: '#fbbf24',
          healHp: 30,
          restoreEnergy: 25,
          description: 'A plump, fragrant starapple harvested from wild watervine groves.'
        }
      });
      break;
    }

    case 8:
    default: {
      // Archetype 8: Derelict Tech Caravan
      archetypeName = 'Derelict Caravan';
      for (let x = 12; x <= 16; x++) {
        tiles[8][x] = { type: 'wall', char: '[', color: COLORS.darkGray, walkable: false, transparent: false, minable: true, hp: 40, maxHp: 40, requiredTier: 1, oreDrop: 'scrap_metal', oreName: 'Rusted Armored Hauler' };
      }
      for (let x = 30; x <= 34; x++) {
        tiles[18][x] = { type: 'wall', char: ']', color: COLORS.darkGray, walkable: false, transparent: false, minable: true, hp: 40, maxHp: 40, requiredTier: 1, oreDrop: 'scrap_metal', oreName: 'Rusted Cargo Trailer' };
      }
      items.push({
        x: 14, y: 9,
        item: { id: `scrap-${Math.floor(rng() * 10000)}`, name: 'Scrap Metal', type: 'material', symbol: '%', color: COLORS.amber, description: 'Structural alloy salvage recovered from the caravan wreck.' }
      });
      items.push({
        x: 32, y: 17,
        item: { id: `crystal-${Math.floor(rng() * 10000)}`, name: 'Laser Diode Crystal', type: 'material', symbol: '♦', color: COLORS.cyan, description: 'Optoelectronic diode salvaged from the caravan generator.' }
      });
      items.push({
        x: 27, y: 11,
        item: { id: `cell-${Math.floor(rng() * 10000)}`, name: 'Quantum Energy Cell', type: 'consumable', symbol: '!', color: COLORS.cyan, restoreEnergy: 40, description: 'Pressurized electrochemical battery salvaged from the caravan.' }
      });
      break;
    }
  }

  // 4. Parsec Special Landmarks: Cave Entrance & Ancient Ruins
  const hasRuins = isRuinsParsec(parasangX, parasangY) && zoneX === 1 && zoneY === 1;
  const hasCave = isCaveParsec(parasangX, parasangY) && zoneX === 1 && zoneY === 1;

  if (hasCave) {
    tiles[9][18] = {
      type: 'stairs_down',
      char: SYMBOLS.stairsDown,
      color: COLORS.fireRed,
      walkable: true,
      transparent: true
    };
  }

  if (hasRuins) {
    for (let rx = 14; rx <= 28; rx += 2) {
      if (tiles[7]?.[rx]) tiles[7][rx] = { type: 'wall', char: 'Ω', color: COLORS.bossGold, walkable: false, transparent: true, minable: true, hp: 60, maxHp: 60, requiredTier: 2, oreDrop: 'relic_superalloy', oreName: 'Qud Ruins Pillar' };
      if (tiles[17]?.[rx]) tiles[17][rx] = { type: 'wall', char: 'Ω', color: COLORS.bossGold, walkable: false, transparent: true, minable: true, hp: 60, maxHp: 60, requiredTier: 2, oreDrop: 'relic_superalloy', oreName: 'Qud Ruins Pillar' };
    }
  }

  // Wild Power Runes or Shrines in procedural screens
  if (rng() < 0.45) {
    const rx = 6 + Math.floor(rng() * (ZONE_WIDTH - 12));
    const ry = 5 + Math.floor(rng() * (ZONE_HEIGHT - 10));
    if (tiles[ry]?.[rx]?.walkable) {
      const runeType = theme.runePool[Math.floor(rng() * theme.runePool.length)];
      items.push({ x: rx, y: ry, item: createRuneItem(runeType, rng) });
    }
  }

  // 5. ORGANIC MEANDERING TRAILS & CROSSROADS
  // We carve natural meandering trails connecting all cardinal borders
  const yStartW = 9 + (Math.abs(seed ^ 0x3f1a) % 10);  // 9..18
  const yEndE = 9 + (Math.abs(seed ^ 0xa82b) % 10);    // 9..18
  const xStartN = 16 + (Math.abs(seed ^ 0x5c4d) % 16);  // 16..31
  const xEndS = 16 + (Math.abs(seed ^ 0xd1e2) % 16);    // 16..31

  // West-to-East Meandering Trail
  for (let x = 0; x < ZONE_WIDTH; x++) {
    const t = x / (ZONE_WIDTH - 1);
    const baseY = (1 - t) * yStartW + t * yEndE;
    const wave = Math.sin(x * 0.22 + seed * 0.05) * 3.5 + Math.cos(x * 0.09 + seed * 0.12) * 2.0;
    const trailY = Math.round(Math.max(2, Math.min(ZONE_HEIGHT - 3, baseY + wave)));

    for (let dy = 0; dy <= 1; dy++) {
      const py = trailY + dy;
      if (py >= 0 && py < ZONE_HEIGHT) {
        if (tiles[py][x].type === 'water') {
          tiles[py][x] = { type: 'floor', char: '=', color: COLORS.amber, walkable: true, transparent: true };
        } else {
          tiles[py][x] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
        }
      }
    }

    // Soft trail fringes (small pebbles and path dust)
    if (rng() < 0.35 && trailY - 1 >= 1 && tiles[trailY - 1][x].walkable && tiles[trailY - 1][x].type === 'floor') {
      tiles[trailY - 1][x].char = '.';
    }
    if (rng() < 0.35 && trailY + 2 < ZONE_HEIGHT - 1 && tiles[trailY + 2][x].walkable && tiles[trailY + 2][x].type === 'floor') {
      tiles[trailY + 2][x].char = '.';
    }
  }

  // North-to-South Meandering Trail
  for (let y = 0; y < ZONE_HEIGHT; y++) {
    const t = y / (ZONE_HEIGHT - 1);
    const baseX = (1 - t) * xStartN + t * xEndS;
    const wave = Math.cos(y * 0.28 + seed * 0.08) * 4.5 + Math.sin(y * 0.12 + seed * 0.03) * 2.5;
    const trailX = Math.round(Math.max(2, Math.min(ZONE_WIDTH - 3, baseX + wave)));

    for (let dx = 0; dx <= 1; dx++) {
      const px = trailX + dx;
      if (px >= 0 && px < ZONE_WIDTH) {
        if (tiles[y][px].type === 'water') {
          tiles[y][px] = { type: 'floor', char: '=', color: COLORS.amber, walkable: true, transparent: true };
        } else {
          tiles[y][px] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
        }
      }
    }
  }

  // Meandering Branch to Ruins or Cave Entrance if present
  if (hasCave) {
    const cx = 18;
    const cy = 9;
    for (let x = Math.min(xStartN, cx); x <= Math.max(xStartN, cx); x++) {
      if (tiles[cy]?.[x]) {
        tiles[cy][x] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
      }
    }
  }

  // Ensure cardinal exits and center gates are open for seamless cross-screen transitions
  for (let x = 22; x <= 25; x++) {
    tiles[0][x] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
    tiles[ZONE_HEIGHT - 1][x] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
  }
  for (let y = 12; y <= 15; y++) {
    tiles[y][0] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
    tiles[y][ZONE_WIDTH - 1] = { type: 'floor', char: '░', color: COLORS.dirtPath, walkable: true, transparent: true };
  }

  // 6. BFS Reachability Validation
  ensureZoneConnectivity(tiles, ZONE_WIDTH, ZONE_HEIGHT, COLORS.dirtPath, [
    { x: 0, y: yStartW }, { x: ZONE_WIDTH - 1, y: yEndE },
    { x: xStartN, y: 0 }, { x: xEndS, y: ZONE_HEIGHT - 1 }
  ]);

  const finalName = hasRuins
    ? `Forgotten Ruins of Qud [Parsec (${parasangX}, ${parasangY}), Screen (${zoneX}, ${zoneY})]`
    : hasCave
    ? `Cavern Fissure Wilds [Parsec (${parasangX}, ${parasangY}), Screen (${zoneX}, ${zoneY})]`
    : `${theme.name} ${archetypeName} [Parsec (${parasangX}, ${parasangY}), Screen (${zoneX}, ${zoneY})]`;

  return {
    coord,
    name: finalName,
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items,
    hasRuins,
    hasCaveEntrance: hasCave
  };
}

export function isRuinsParsec(px: number, py: number): boolean {
  if (px === 0 && py === 0) return false;
  return ((px * 7 + py * 13) % 5 === 0);
}

export function isCaveParsec(px: number, py: number): boolean {
  if (px === 0 && py === 0) return false;
  return ((px * 11 + py * 17) % 4 === 0);
}

export function generateProceduralCaverns(coord: ZoneCoord): ZoneData {
  const { parasangX, parasangY, zoneX, zoneY, depth } = coord;
  const seed = Math.abs(
    (parasangX * 1234567) ^
    (parasangY * 7654321) ^
    (zoneX * 9876543) ^
    (zoneY * 3456789) ^
    (depth * 5555555)
  );
  const rng = createPRNG(seed);

  // 1. Base Cavern Strata with Ore Veins
  const tiles: Tile[][] = [];
  for (let y = 0; y < ZONE_HEIGHT; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < ZONE_WIDTH; x++) {
      const isBorder = (x === 0 || x === ZONE_WIDTH - 1 || y === 0 || y === ZONE_HEIGHT - 1);
      const isCrossroad = ((y === 13 || y === 14) && (x === 0 || x === ZONE_WIDTH - 1)) ||
                          ((x === 23 || x === 24) && (y === 0 || y === ZONE_HEIGHT - 1));

      if (isBorder && isCrossroad) {
        // Arterial border gateway passage
        row.push({
          type: 'floor',
          char: '░',
          color: COLORS.stoneGray,
          walkable: true,
          transparent: true
        });
      } else if (isBorder) {
        // Minable border wall with durability
        row.push({
          type: 'wall',
          char: SYMBOLS.wall,
          color: COLORS.darkGray,
          walkable: false,
          transparent: false,
          minable: true,
          hp: 50,
          maxHp: 50,
          requiredTier: 1,
          oreDrop: 'scrap_metal',
          oreName: 'Cavern Strata Wall'
        });
      } else {
        // Organic cave noise
        const n = Math.sin(x * 0.35 + seed * 0.1) * Math.cos(y * 0.45 + seed * 0.2);
        const isWall = n > 0.10;

        if (isWall) {
          const oreRoll = rng();
          if (oreRoll < 0.15) {
            // Tier 1: Copper Vein
            row.push({
              type: 'breakable_wall',
              char: '%',
              color: '#d97706',
              walkable: false,
              transparent: false,
              minable: true,
              hp: 60,
              maxHp: 60,
              requiredTier: 1,
              oreDrop: 'copper_ore',
              oreName: 'Subterranean Copper Vein'
            });
          } else if (oreRoll < 0.25) {
            // Tier 2: Iron Ore Vein
            row.push({
              type: 'breakable_wall',
              char: '■',
              color: '#94a3b8',
              walkable: false,
              transparent: false,
              minable: true,
              hp: 80,
              maxHp: 80,
              requiredTier: 2,
              oreDrop: 'iron_ore',
              oreName: 'Dense Iron Ore Vein'
            });
          } else if (oreRoll < 0.32 && depth >= 2) {
            // Tier 3: Obsidian Spire
            row.push({
              type: 'breakable_wall',
              char: '▲',
              color: '#aa33ff',
              walkable: false,
              transparent: false,
              minable: true,
              hp: 120,
              maxHp: 120,
              requiredTier: 3,
              oreDrop: 'obsidian_shard',
              oreName: 'Obsidian Spire'
            });
          } else if (oreRoll < 0.36 && depth >= 3) {
            // Tier 4: Ancient Relic Superalloy
            row.push({
              type: 'breakable_wall',
              char: 'Ω',
              color: COLORS.bossGold,
              walkable: false,
              transparent: false,
              minable: true,
              hp: 180,
              maxHp: 180,
              requiredTier: 4,
              oreDrop: 'relic_superalloy',
              oreName: 'Pre-Collapse Superalloy Strata'
            });
          } else {
            // Standard minable cave wall
            row.push({
              type: 'wall',
              char: SYMBOLS.wall,
              color: COLORS.darkGray,
              walkable: false,
              transparent: false,
              minable: true,
              hp: 40,
              maxHp: 40,
              requiredTier: 1,
              oreDrop: rng() < 0.35 ? 'scrap_metal' : undefined,
              oreName: 'Deep Granite Cavern Wall'
            });
          }
        } else {
          row.push({
            type: 'floor',
            char: '·',
            color: COLORS.stoneGray,
            walkable: true,
            transparent: true
          });
        }
      }
    }
    tiles.push(row);
  }

  // 2. Carve Cavern Chambers
  const numRooms = 5 + Math.floor(rng() * 3);
  const roomCenters: { x: number; y: number }[] = [];
  for (let i = 0; i < numRooms; i++) {
    const cx = 6 + Math.floor(rng() * (ZONE_WIDTH - 12));
    const cy = 4 + Math.floor(rng() * (ZONE_HEIGHT - 8));
    const rad = 3 + Math.floor(rng() * 4);
    roomCenters.push({ x: cx, y: cy });

    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx >= 2 && tx < ZONE_WIDTH - 2 && ty >= 2 && ty < ZONE_HEIGHT - 2) {
          if (Math.hypot(dx, dy) <= rad) {
            tiles[ty][tx] = {
              type: 'floor',
              char: '·',
              color: COLORS.stoneGray,
              walkable: true,
              transparent: true
            };
          }
        }
      }
    }
  }

  // Connect rooms
  for (let i = 0; i < roomCenters.length - 1; i++) {
    let curX = roomCenters[i].x;
    let curY = roomCenters[i].y;
    const targetX = roomCenters[i + 1].x;
    const targetY = roomCenters[i + 1].y;

    while (curX !== targetX || curY !== targetY) {
      if (curX < targetX) curX++;
      else if (curX > targetX) curX--;
      if (curY < targetY) curY++;
      else if (curY > targetY) curY--;

      if (curX >= 1 && curX < ZONE_WIDTH - 1 && curY >= 1 && curY < ZONE_HEIGHT - 1) {
        tiles[curY][curX] = {
          type: 'floor',
          char: '·',
          color: COLORS.stoneGray,
          walkable: true,
          transparent: true
        };
      }
    }
  }

  // 3. Guaranteed Arterial Cavern Crossroads
  for (let x = 0; x < ZONE_WIDTH; x++) {
    tiles[13][x] = { type: 'floor', char: '░', color: COLORS.stoneGray, walkable: true, transparent: true };
    tiles[14][x] = { type: 'floor', char: '░', color: COLORS.stoneGray, walkable: true, transparent: true };
  }
  for (let y = 0; y < ZONE_HEIGHT; y++) {
    tiles[y][23] = { type: 'floor', char: '░', color: COLORS.stoneGray, walkable: true, transparent: true };
    tiles[y][24] = { type: 'floor', char: '░', color: COLORS.stoneGray, walkable: true, transparent: true };
  }

  // 4. Connect Chambers to Crossroads
  for (const rc of roomCenters) {
    let cx = rc.x;
    let cy = rc.y;
    while (cy !== 13) {
      if (cy < 13) cy++;
      else cy--;
      tiles[cy][cx] = { type: 'floor', char: '·', color: COLORS.stoneGray, walkable: true, transparent: true };
    }
  }

  // 5. Stairs Up (<) and Stairs Down (>)
  const upPos = roomCenters[0] || { x: 8, y: 8 };
  tiles[upPos.y][upPos.x] = {
    type: 'stairs_up',
    char: SYMBOLS.stairsUp,
    color: COLORS.cyan,
    walkable: true,
    transparent: true
  };

  const downPos = roomCenters[roomCenters.length - 1] || { x: 38, y: 18 };
  tiles[downPos.y][downPos.x] = {
    type: 'stairs_down',
    char: SYMBOLS.stairsDown,
    color: COLORS.fireRed,
    walkable: true,
    transparent: true
  };

  // 6. BFS Reachability Validation
  ensureZoneConnectivity(tiles, ZONE_WIDTH, ZONE_HEIGHT, COLORS.stoneGray);

  // 7. Subterranean Loot
  const items: { x: number; y: number; item: Item }[] = [];
  for (let i = 0; i < 3; i++) {
    const lx = 4 + Math.floor(rng() * (ZONE_WIDTH - 8));
    const ly = 4 + Math.floor(rng() * (ZONE_HEIGHT - 8));
    if (tiles[ly]?.[lx]?.walkable) {
      items.push({
        x: lx, y: ly,
        item: {
          id: `cave-loot-${Math.floor(rng() * 10000)}`,
          name: 'Subterranean Crystal Diode',
          type: 'material',
          symbol: SYMBOLS.materialCrystal,
          color: COLORS.cyan,
          description: 'A deep-earth luminescent crystal pulsing with radiant energy.'
        }
      });
    }
  }

  if (depth >= 2 || rng() < 0.45) {
    const rx = 12 + Math.floor(rng() * 16);
    const ry = 8 + Math.floor(rng() * 10);
    if (tiles[ry]?.[rx]?.walkable) {
      const runeItem = createRuneItem('baetyl', rng);
      items.push({ x: rx, y: ry, item: runeItem });
    }
  }

  return {
    coord,
    name: `Subterranean Cavern Strata [Depth ${depth}]`,
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    tiles,
    items,
    hasRuins: false,
    hasCaveEntrance: true
  };
}
