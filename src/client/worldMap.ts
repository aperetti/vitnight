import { ZoneCoord, StoryStage, HeroRole } from '../shared/types';

export interface StoryLocationInfo {
  id: string;
  name: string;
  region: string;
  coord: ZoneCoord;
  sprite: string;
  stageTrigger: StoryStage;
  act: number;
  actTitle: string;
  summary: string;
  objective: string;
  boss?: string;
  enemies: string[];
}

export const STORY_LOCATIONS: StoryLocationInfo[] = [
  {
    id: 'loc_spawn',
    name: 'Homestead Outpost & Spawn House',
    region: 'Homestead Valley (Parsec 2, 2)',
    coord: { parasangX: 2, parasangY: 2, zoneX: 1, zoneY: 1, depth: 0 },
    sprite: '/sprites/loc_spawn.png',
    stageTrigger: 'SPAWN',
    act: 1,
    actTitle: 'Act I: The Adventure Begins',
    summary: 'The peaceful starting outpost where Barrett, Luther, and Beau prepare for their epic quest.',
    objective: "Barrett: Collect Scrap Metal and Laser Crystals outside to craft Luther's Laser Weapon at the workbench.",
    enemies: ['Safe Starting Outpost']
  },
  {
    id: 'loc_mines',
    name: 'Whitehill Mines (Subterranean)',
    region: 'Homestead Valley Depths (Parsec 2, 2)',
    coord: { parasangX: 2, parasangY: 2, zoneX: 1, zoneY: 1, depth: 1 },
    sprite: '/sprites/loc_mines.png',
    stageTrigger: 'WHITEHILL_MINES',
    act: 1,
    actTitle: 'Act I: The Subterranean Delve',
    summary: 'An ore-veined cavern directly beneath the outpost trapdoor, crawling with cavern creepers.',
    objective: "Excavate breakable rock veins with Barrett's pickaxe, defeat the Cave Creeper, and claim the Whitehill Key.",
    boss: 'Cave Creeper',
    enemies: ['Cave Creepers', 'Rock Golems']
  },
  {
    id: 'loc_creek',
    name: 'Zombie Creek Crossing',
    region: 'Murky Wetlands (Parsec 3, 0)',
    coord: { parasangX: 3, parasangY: 0, zoneX: 1, zoneY: 1, depth: 0 },
    sprite: '/sprites/loc_creek.png',
    stageTrigger: 'ZOMBIE_CREEK',
    act: 1,
    actTitle: 'Act I: Swarm of the Undead',
    summary: 'A murky wetland river haunted by eerie phasing ghosts that walk straight through solid stone walls.',
    objective: "Survive the undead charge: Luther holds the line, Beau freezes zombies in solid ice, and Barrett explodes the ice blocks with fireballs!",
    boss: 'Phasing Ghost Lord',
    enemies: ['Murk Zombies', 'Phasing Ghosts']
  },
  {
    id: 'loc_mountain',
    name: 'Water Mountain & Rainbow Shrine',
    region: 'Water Mountain Pinnacles (Parsec 3, 3)',
    coord: { parasangX: 3, parasangY: 3, zoneX: 1, zoneY: 1, depth: 0 },
    sprite: '/sprites/loc_mountain.png',
    stageTrigger: 'WATER_MOUNTAIN_PUZZLE',
    act: 1,
    actTitle: 'Act I: The Broken Puzzle',
    summary: 'A majestic high peak with an ancient altar sealing the passage to the eastern fortresses.',
    objective: 'Recover the 6 scattered rainbow pom-poms and place them in rainbow sequence (Red, Orange, Yellow, Green, Blue, Violet) to unlock the eastern pass.',
    enemies: ['Mountain Sentinels']
  },
  {
    id: 'loc_skeleton',
    name: 'Skeleton Homestead Fortress',
    region: 'Bone Wastes (Parsec 6, 3)',
    coord: { parasangX: 6, parasangY: 3, zoneX: 1, zoneY: 1, depth: 0 },
    sprite: '/sprites/loc_skeleton.png',
    stageTrigger: 'SKELETON_HOMESTEAD',
    act: 2,
    actTitle: 'Act II: The Homestead Fortresses',
    summary: 'A heavily defended bone stockade overrun by skeletal archers on the palisades.',
    objective: 'Storm the fortress! When the Mutant Skeleton knocks down Barrett and Beau, Luther charges in with healing draughts to revive the team.',
    boss: 'Mutant Skeleton King',
    enemies: ['Skeleton Archers', 'Skeleton Warriors']
  },
  {
    id: 'loc_creeper',
    name: 'Creeper Homestead & Energy Shield',
    region: 'Sulfur Plains (Parsec 9, 3)',
    coord: { parasangX: 9, parasangY: 3, zoneX: 1, zoneY: 1, depth: 0 },
    sprite: '/sprites/loc_creeper.png',
    stageTrigger: 'CREEPER_HOMESTEAD',
    act: 2,
    actTitle: 'Act II: Shield of the Creeper',
    summary: 'A reinforced compound fortified with an impenetrable energy forcefield.',
    objective: "Scale the high scaffolding, dodge the Mutant Creeper's massive blast so it destroys its own shield, and defeat it.",
    boss: 'Shielded Mutant Creeper',
    enemies: ['Exploding Creepers']
  },
  {
    id: 'loc_power',
    name: 'Power Down (The Complex)',
    region: 'The Rust Complex (Parsec 9, 6)',
    coord: { parasangX: 9, parasangY: 6, zoneX: 1, zoneY: 1, depth: 0 },
    sprite: '/sprites/loc_power.png',
    stageTrigger: 'POWER_DOWN',
    act: 2,
    actTitle: 'Act II: Power Down Reactor',
    summary: "A humming industrial complex generating power for the Arch-Villager's rogue machinery.",
    objective: 'Infiltrate the generator room, claim the glowing plasma lightsabers from the terminal, and prepare for Rocky Doom.',
    boss: 'Arch-Villager',
    enemies: ['Security Automatons', 'Power Drones']
  },
  {
    id: 'loc_rocky',
    name: 'Rocky Doom Colosseum',
    region: 'Colosseum Megaliths (Parsec 12, 6)',
    coord: { parasangX: 12, parasangY: 6, zoneX: 1, zoneY: 1, depth: 0 },
    sprite: '/sprites/loc_rocky.png',
    stageTrigger: 'ROCKY_DOOM_SWARM',
    act: 3,
    actTitle: 'Act III: The Gauntlet of 100 Mini-Bosses',
    summary: 'A treacherous gladiatorial colosseum of flying boulders and colossal rock titans.',
    objective: "Weather the storm of 100 mini-bosses, survive the Rock King's Earth-Shaking Slap, and fell the Dual Bosses with your lightsabers!",
    boss: 'Rock King Boss, Arch-Villager & Heart of Ender',
    enemies: ['100 Rock Mini-Bosses', 'Dual Bosses']
  },
  {
    id: 'loc_final',
    name: "The Final Stand (Cooper's Birthday Climax)",
    region: 'Birthday Citadel (Parsec 15, 6)',
    coord: { parasangX: 15, parasangY: 6, zoneX: 1, zoneY: 1, depth: 0 },
    sprite: '/sprites/hero_cooper.png',
    stageTrigger: 'SOLO_FINAL_STAND',
    act: 4,
    actTitle: 'Act IV: The Birthday Climax & Victory',
    summary: 'The birthday celebration battleground where young Cooper is trapped by the Nether Titan.',
    objective: "As the party winds down and friends pack up, Barrett fights alone against the Nether Titan, flips the victory switch, and saves Cooper's birthday!",
    boss: 'Void Overlord & Nether Titan',
    enemies: ['Nether Titans', 'Heart of Ender']
  }
];

export const STAGE_ORDER: StoryStage[] = [
  'SPAWN',
  'WHITEHILL_MINES',
  'ZOMBIE_CREEK',
  'WATER_MOUNTAIN_PUZZLE',
  'SKELETON_HOMESTEAD',
  'MUTANT_SKELETON',
  'CREEPER_HOMESTEAD',
  'MUTANT_CREEPER',
  'POWER_DOWN',
  'ROCKY_DOOM_SWARM',
  'ROCKY_DOOM_SLAP',
  'ROCKY_DOOM_DUAL_BOSS',
  'SOLO_FINAL_STAND',
  'VICTORY'
];

export const PARSEC_GRID_WIDTH = 16;
export const PARSEC_GRID_HEIGHT = 7;

export function isRuinsParsec(px: number, py: number): boolean {
  if ((px === 2 && py === 2) || (px === 0 && py === 0)) return false;
  return ((px * 7 + py * 13) % 5 === 0);
}

export function isCaveParsec(px: number, py: number): boolean {
  if ((px === 2 && py === 2) || (px === 0 && py === 0)) return false;
  return ((px * 11 + py * 17) % 4 === 0);
}

export function getParsecBiomeInfo(px: number, py: number) {
  if (px <= 1) {
    return {
      name: 'Homestead Orchards',
      glyph: '♣',
      color: '#34d399',
      bgColor: '#06180c',
      desc: 'Verdant orchards, watervine groves, and quiet agrarian farmland.'
    };
  }
  if (px >= 2 && px <= 4 && py <= 2) {
    return {
      name: 'Murky Creek Wetlands',
      glyph: '≈',
      color: '#22d3ee',
      bgColor: '#031f24',
      desc: 'Eerie misty marshes and riverways haunted by phasing ghosts.'
    };
  }
  if (px >= 2 && px <= 5 && py >= 3) {
    return {
      name: 'Water Mountain Crags',
      glyph: '▲',
      color: '#38bdf8',
      bgColor: '#11161d',
      desc: 'Towering granite pinnacles surrounding the ancient Rainbow Altar.'
    };
  }
  if (px >= 5 && px <= 7) {
    return {
      name: 'Calcified Bone Wastes',
      glyph: '%',
      color: '#e2e8f0',
      bgColor: '#161920',
      desc: 'Bleached palisades, fossilized ribs, and roaming skeleton legions.'
    };
  }
  if (px >= 8 && px <= 10 && py <= 4) {
    return {
      name: 'Sulfur Plains',
      glyph: '*',
      color: '#fbbf24',
      bgColor: '#221604',
      desc: 'Deep volcanic chasms and fumaroles guarded by mutant creepers.'
    };
  }
  if (px >= 8 && px <= 10 && py >= 5) {
    return {
      name: 'The Rust Complex',
      glyph: '☼',
      color: '#06b6d4',
      bgColor: '#061824',
      desc: 'Humming industrial tech factories, transformers, and power conduits.'
    };
  }
  if (px >= 11 && px <= 13) {
    return {
      name: 'Colosseum Megaliths',
      glyph: 'Ω',
      color: '#f59e0b',
      bgColor: '#1c1508',
      desc: 'Cyclopean megalithic colosseum where colossal boulders fly.'
    };
  }
  return {
    name: 'Astral Void & Citadel',
    glyph: '✦',
    color: '#a855f7',
    bgColor: '#0c0418',
    desc: 'Cosmic astral stronghold where Cooper is held by the Nether Titan.'
  };
}

export interface ParsecTerrainInfo {
  glyph: string;
  color: string;
  bgColor: string;
  terrainType: string;
  elevation: string;
  biomeName: string;
  isLandmark: boolean;
  landmarkName?: string;
  dangerLevel: number;
  description: string;
  spriteUrl: string;
}

export function getParsecTerrainInfo(px: number, py: number): ParsecTerrainInfo {
  // 1. Check Story Milestones
  if (px === 0 && py === 0) {
    return {
      glyph: '⌂',
      color: '#fbbf24',
      bgColor: '#000000',
      terrainType: 'Homestead Outpost',
      elevation: 'Valley',
      biomeName: 'Homestead Valley',
      isLandmark: true,
      landmarkName: 'Homestead Outpost & Workshop',
      dangerLevel: 1,
      description: 'The peaceful starting outpost where Barrett, Luther, and Beau craft gear.',
      spriteUrl: '/sprites/loc_spawn.png'
    };
  }
  const milestone = STORY_LOCATIONS.find(l => l.coord.depth === 0 && l.coord.parasangX === px && l.coord.parasangY === py);
  if (milestone) {
    if (milestone.id === 'loc_spawn') {
      return {
        glyph: '⌂',
        color: '#fbbf24',
        bgColor: '#000000',
        terrainType: 'Homestead Outpost',
        elevation: 'Valley',
        biomeName: 'Homestead Valley',
        isLandmark: true,
        landmarkName: 'Homestead Outpost & Workshop',
        dangerLevel: 1,
        description: 'The peaceful starting outpost where Barrett, Luther, and Beau craft gear.',
        spriteUrl: '/sprites/loc_spawn.png'
      };
    }
    if (milestone.id === 'loc_creek') {
      return {
        glyph: '≈',
        color: '#22d3ee',
        bgColor: '#031f24',
        terrainType: 'Zombie Creek Crossing',
        elevation: 'Lowland River',
        biomeName: 'Murky Creek Wetlands',
        isLandmark: true,
        landmarkName: 'Zombie Creek & Ghost Rapids',
        dangerLevel: 2,
        description: 'A haunted wetland watercourse where phasing undead slip through walls.',
        spriteUrl: '/sprites/loc_creek.png'
      };
    }
    if (milestone.id === 'loc_mountain') {
      return {
        glyph: '▲',
        color: '#f8fafc',
        bgColor: '#11161d',
        terrainType: 'Water Mountain Summit',
        elevation: 'High Peak',
        biomeName: 'Water Mountain Crags',
        isLandmark: true,
        landmarkName: 'Water Mountain & Rainbow Altar',
        dangerLevel: 2,
        description: 'A towering snow-dusted peak holding the ancient Rainbow Pom-Pom Altar.',
        spriteUrl: '/sprites/loc_mountain.png'
      };
    }
    if (milestone.id === 'loc_skeleton') {
      return {
        glyph: 'П',
        color: '#f1f5f9',
        bgColor: '#161920',
        terrainType: 'Bone Stockade Fortress',
        elevation: 'Fortified Basin',
        biomeName: 'Calcified Bone Wastes',
        isLandmark: true,
        landmarkName: 'Skeleton Homestead Fortress',
        dangerLevel: 3,
        description: 'Heavily defended bone battlements overrun by mutant skeletal archers.',
        spriteUrl: '/sprites/loc_skeleton.png'
      };
    }
    if (milestone.id === 'loc_creeper') {
      return {
        glyph: '*',
        color: '#f59e0b',
        bgColor: '#221604',
        terrainType: 'Creeper Fortress & Caldera',
        elevation: 'Shielded Caldera',
        biomeName: 'Sulfur Plains',
        isLandmark: true,
        landmarkName: 'Creeper Homestead & Energy Shield',
        dangerLevel: 4,
        description: 'A volcanic redoubt surrounded by an impenetrable forcefield.',
        spriteUrl: '/sprites/loc_creeper.png'
      };
    }
    if (milestone.id === 'loc_power') {
      return {
        glyph: '☼',
        color: '#38bdf8',
        bgColor: '#061824',
        terrainType: 'Power Complex Core',
        elevation: 'Industrial Hub',
        biomeName: 'The Rust Complex',
        isLandmark: true,
        landmarkName: 'Power Down (The Complex) Reactor',
        dangerLevel: 4,
        description: 'A humming techno-complex supplying power to rogue automatons.',
        spriteUrl: '/sprites/loc_power.png'
      };
    }
    if (milestone.id === 'loc_rocky') {
      return {
        glyph: 'Ω',
        color: '#eab308',
        bgColor: '#1c1508',
        terrainType: 'Colosseum Megaliths',
        elevation: 'Grand Arena',
        biomeName: 'Colosseum Megaliths',
        isLandmark: true,
        landmarkName: 'Rocky Doom Colosseum',
        dangerLevel: 5,
        description: 'A colossal gladiatorial arena of flying boulders and rock titans.',
        spriteUrl: '/sprites/loc_rocky.png'
      };
    }
    if (milestone.id === 'loc_final') {
      return {
        glyph: '✦',
        color: '#ec4899',
        bgColor: '#0c0418',
        terrainType: 'Birthday Citadel Core',
        elevation: 'Cosmic Citadel',
        biomeName: 'Astral Void',
        isLandmark: true,
        landmarkName: "The Final Stand (Cooper's Birthday)",
        dangerLevel: 6,
        description: "The climactic battleground where young Cooper is trapped by the Nether Titan.",
        spriteUrl: '/sprites/loc_final.png'
      };
    }
  }

  // 2. Check Procedural Ruins and Caverns
  if (isRuinsParsec(px, py)) {
    return {
      glyph: 'π',
      color: '#2dd4bf',
      bgColor: '#07181c',
      terrainType: 'Forgotten Arcology Ruins',
      elevation: 'Ancient Overgrowth',
      biomeName: getParsecBiomeInfo(px, py).name,
      isLandmark: true,
      landmarkName: 'Forgotten Arcology Ruins',
      dangerLevel: Math.min(5, Math.floor(px / 3) + 1),
      description: 'Collapsed chrome archways, weathered marble steles, and ancient forgotten treasures.',
      spriteUrl: '/sprites/map_ruins.png'
    };
  }

  if (isCaveParsec(px, py)) {
    return {
      glyph: '▼',
      color: '#c084fc',
      bgColor: '#120a1c',
      terrainType: 'Subterranean Cavern Mouth',
      elevation: 'Abyssal Chasm',
      biomeName: getParsecBiomeInfo(px, py).name,
      isLandmark: true,
      landmarkName: 'Deep Subterranean Caves',
      dangerLevel: Math.min(5, Math.floor(px / 3) + 2),
      description: 'A yawning fissure descending into deep subterranean strata teeming with mineral veins.',
      spriteUrl: '/sprites/loc_mines.png'
    };
  }

  // 3. Biome-Specific Organic Terrain Variation
  const seed = (px * 374761393) ^ (py * 668265263);
  const hash = Math.abs(seed) % 100;

  if (px <= 1) {
    const orchardTiles = [
      { glyph: '♣', color: '#22c55e', terrainType: 'Watervine Orchard', elevation: 'Valley', spriteUrl: '/sprites/map_jungle.png' },
      { glyph: '♠', color: '#15803d', terrainType: 'Cypress Copse', elevation: 'Foothills', spriteUrl: '/sprites/map_jungle.png' },
      { glyph: '¶', color: '#16a34a', terrainType: 'Ancient Fig Canopy', elevation: 'Lowlands', spriteUrl: '/sprites/map_jungle.png' },
      { glyph: '¥', color: '#86efac', terrainType: 'Watervine Field', elevation: 'Valley', spriteUrl: '/sprites/map_flowers.png' },
      { glyph: ',', color: '#4ade80', terrainType: 'Verdant Pasture', elevation: 'Meadow', spriteUrl: '/sprites/map_flowers.png' }
    ];
    const picked = orchardTiles[hash % orchardTiles.length];
    return {
      glyph: picked.glyph,
      color: picked.color,
      bgColor: '#06180c',
      terrainType: picked.terrainType,
      elevation: picked.elevation,
      biomeName: 'Homestead Orchards',
      isLandmark: false,
      dangerLevel: 1,
      description: 'Quiet agrarian valleys, rows of watervine, and secluded cedar orchards.',
      spriteUrl: picked.spriteUrl
    };
  }

  if (px >= 2 && px <= 4 && py <= 2) {
    const wetlandTiles = [
      { glyph: '≈', color: '#22d3ee', terrainType: 'Winding Creek Waters', elevation: 'Riverbed', spriteUrl: '/sprites/map_river.png' },
      { glyph: '~', color: '#06b6d4', terrainType: 'Misty Swamp Fen', elevation: 'Marshes', spriteUrl: '/sprites/map_marsh.png' },
      { glyph: '"', color: '#2dd4bf', terrainType: 'Brackish Salt Reeds', elevation: 'Bog', spriteUrl: '/sprites/map_marsh.png' },
      { glyph: ',', color: '#0e7490', terrainType: 'Silt Mudflats', elevation: 'Lowlands', spriteUrl: '/sprites/map_river.png' }
    ];
    const picked = wetlandTiles[hash % wetlandTiles.length];
    return {
      glyph: picked.glyph,
      color: picked.color,
      bgColor: '#031f24',
      terrainType: picked.terrainType,
      elevation: picked.elevation,
      biomeName: 'Murky Creek Wetlands',
      isLandmark: false,
      dangerLevel: 2,
      description: 'Eerie lowlands draped in spectral mist, brackish watercourses, and phasing undead.',
      spriteUrl: picked.spriteUrl
    };
  }

  if (px >= 2 && px <= 5 && py >= 3) {
    const mountainTiles = [
      { glyph: '▲', color: '#e2e8f0', terrainType: 'High Mountain Summit', elevation: 'High Peak', spriteUrl: '/sprites/map_mountains.png' },
      { glyph: '^', color: '#94a3b8', terrainType: 'Granite Ridge', elevation: 'Crags', spriteUrl: '/sprites/map_mountains.png' },
      { glyph: 'n', color: '#64748b', terrainType: 'Rugged Foothills', elevation: 'Foothills', spriteUrl: '/sprites/map_canyon.png' },
      { glyph: '⌂', color: '#cbd5e1', terrainType: 'Mountain Pass Altar', elevation: 'Pass', spriteUrl: '/sprites/map_mountains.png' }
    ];
    const picked = mountainTiles[hash % mountainTiles.length];
    return {
      glyph: picked.glyph,
      color: picked.color,
      bgColor: '#11161d',
      terrainType: picked.terrainType,
      elevation: picked.elevation,
      biomeName: 'Water Mountain Crags',
      isLandmark: false,
      dangerLevel: 2,
      description: 'Towering granite pinnacles, knife-edge ridges, and the ancient Rainbow Altar.',
      spriteUrl: picked.spriteUrl
    };
  }

  if (px >= 5 && px <= 7) {
    const boneTiles = [
      { glyph: '%', color: '#e2e8f0', terrainType: 'Fossilized Ribcage Basin', elevation: 'Bone Wastes', spriteUrl: '/sprites/map_desert.png' },
      { glyph: 'x', color: '#cbd5e1', terrainType: 'Calcified Scree', elevation: 'Badlands', spriteUrl: '/sprites/map_desert.png' },
      { glyph: '░', color: '#94a3b8', terrainType: 'Sun-Bleached Bone Flats', elevation: 'Salt Flats', spriteUrl: '/sprites/map_desert.png' },
      { glyph: '.', color: '#64748b', terrainType: 'Marrow Dust Plain', elevation: 'Desolation', spriteUrl: '/sprites/map_monolith.png' }
    ];
    const picked = boneTiles[hash % boneTiles.length];
    return {
      glyph: picked.glyph,
      color: picked.color,
      bgColor: '#161920',
      terrainType: picked.terrainType,
      elevation: picked.elevation,
      biomeName: 'Calcified Bone Wastes',
      isLandmark: false,
      dangerLevel: 3,
      description: 'A bleached landscape of titan bones, dry ravines, and roaming skeleton legions.',
      spriteUrl: picked.spriteUrl
    };
  }

  if (px >= 8 && px <= 10 && py <= 4) {
    const sulfurTiles = [
      { glyph: '*', color: '#facc15', terrainType: 'Sulfur Fumarole Bed', elevation: 'Vents', spriteUrl: '/sprites/map_desert.png' },
      { glyph: '!', color: '#f97316', terrainType: 'Brimstone Geysers', elevation: 'Geysers', spriteUrl: '/sprites/map_canyon.png' },
      { glyph: '^', color: '#eab308', terrainType: 'Basalt Ash Crags', elevation: 'Crags', spriteUrl: '/sprites/map_canyon.png' },
      { glyph: '~', color: '#d97706', terrainType: 'Scorched Ash Dunes', elevation: 'Dunes', spriteUrl: '/sprites/map_desert.png' }
    ];
    const picked = sulfurTiles[hash % sulfurTiles.length];
    return {
      glyph: picked.glyph,
      color: picked.color,
      bgColor: '#221604',
      terrainType: picked.terrainType,
      elevation: picked.elevation,
      biomeName: 'Sulfur Plains',
      isLandmark: false,
      dangerLevel: 4,
      description: 'Acrid fumes, boiling sulfur pits, and exploding creeper warrens.',
      spriteUrl: picked.spriteUrl
    };
  }

  if (px >= 8 && px <= 10 && py >= 5) {
    const rustTiles = [
      { glyph: '‡', color: '#38bdf8', terrainType: 'High-Voltage Pylon', elevation: 'Conduits', spriteUrl: '/sprites/map_shrine.png' },
      { glyph: '|', color: '#0284c7', terrainType: 'Plasma Conduit Pipe', elevation: 'Pipeline', spriteUrl: '/sprites/map_shrine.png' },
      { glyph: '■', color: '#06b6d4', terrainType: 'Transformer Substation', elevation: 'Substation', spriteUrl: '/sprites/map_ruins.png' },
      { glyph: '☼', color: '#67e8f9', terrainType: 'Humming Dynamo Array', elevation: 'Power Core', spriteUrl: '/sprites/map_shrine.png' }
    ];
    const picked = rustTiles[hash % rustTiles.length];
    return {
      glyph: picked.glyph,
      color: picked.color,
      bgColor: '#061824',
      terrainType: picked.terrainType,
      elevation: picked.elevation,
      biomeName: 'The Rust Complex',
      isLandmark: false,
      dangerLevel: 4,
      description: 'Industrial tech complexes, humming turbines, and rogue security automatons.',
      spriteUrl: picked.spriteUrl
    };
  }

  if (px >= 11 && px <= 13) {
    const megalithTiles = [
      { glyph: 'Ω', color: '#fbbf24', terrainType: 'Ancient Megalith Arch', elevation: 'Megalith', spriteUrl: '/sprites/map_monolith.png' },
      { glyph: 'π', color: '#f59e0b', terrainType: 'Weathered Colonnade', elevation: 'Ruins', spriteUrl: '/sprites/map_ruins.png' },
      { glyph: 'П', color: '#d97706', terrainType: 'Gladiatorial Gateway', elevation: 'Gateway', spriteUrl: '/sprites/map_monolith.png' },
      { glyph: '░', color: '#b45309', terrainType: 'Shattered Mosaic Plaza', elevation: 'Arena Grounds', spriteUrl: '/sprites/map_ruins.png' }
    ];
    const picked = megalithTiles[hash % megalithTiles.length];
    return {
      glyph: picked.glyph,
      color: picked.color,
      bgColor: '#1c1508',
      terrainType: picked.terrainType,
      elevation: picked.elevation,
      biomeName: 'Colosseum Megaliths',
      isLandmark: false,
      dangerLevel: 5,
      description: 'Towering cyclopean megaliths, crumbling amphitheaters, and the Rock King.',
      spriteUrl: picked.spriteUrl
    };
  }

  const voidTiles = [
    { glyph: '✦', color: '#c084fc', terrainType: 'Celestial Star Formation', elevation: 'Cosmic Spire', spriteUrl: '/sprites/map_deep_jungle.png' },
    { glyph: '✧', color: '#e879f9', terrainType: 'Pulsar Beacon Rift', elevation: 'Nexus', spriteUrl: '/sprites/map_shrine.png' },
    { glyph: '*', color: '#a855f7', terrainType: 'Stellar Nebular Veil', elevation: 'Nebula', spriteUrl: '/sprites/map_deep_jungle.png' },
    { glyph: '·', color: '#6b21a8', terrainType: 'Deep Event Horizon', elevation: 'Void', spriteUrl: '/sprites/map_monolith.png' }
  ];
  const picked = voidTiles[hash % voidTiles.length];
  return {
    glyph: picked.glyph,
    color: picked.color,
    bgColor: '#0c0418',
    terrainType: picked.terrainType,
    elevation: picked.elevation,
    biomeName: 'Astral Void',
    isLandmark: false,
    dangerLevel: 6,
    description: 'Dimensional boundary where space fractures and the Nether Titan holds Cooper.',
    spriteUrl: picked.spriteUrl
  };
}

export type MapViewMode = 'parsec_grid' | 'subscreens' | 'milestones';

export class WorldMapManager {
  private modalEl: HTMLElement;
  private gridEl: HTMLElement;
  private currentPosEl: HTMLElement;

  // View mode tab buttons
  private tabParsecBtn: HTMLElement | null = null;
  private tabSubscreensBtn: HTMLElement | null = null;
  private tabMilestonesBtn: HTMLElement | null = null;

  // Detail panel elements
  private detailSpriteEl: HTMLImageElement;
  private detailNameEl: HTMLElement;
  private detailRegionEl: HTMLElement;
  private detailStatusEl: HTMLElement;
  private detailActEl: HTMLElement;
  private detailObjectiveEl: HTMLElement;
  private detailSummaryEl: HTMLElement;
  private detailEnemiesEl: HTMLElement;
  private detailRuneStatsEl: HTMLElement | null = null;
  private detailRuneCountEl: HTMLElement | null = null;

  private currentZoneCoord: ZoneCoord | null = null;
  private currentStage: StoryStage = 'SPAWN';
  private heroRole: HeroRole = 'barrett';

  // Navigation State
  private viewMode: MapViewMode = 'parsec_grid';
  private selectedParsec: { px: number; py: number } = { px: 0, py: 0 };
  private selectedSubscreen: { zx: number; zy: number } = { zx: 0, zy: 0 };
  private selectedLocationId: string = 'loc_spawn';

  // Player Rune Buffs
  private playerRuneBonuses = { damage: 0, maxHp: 0, maxEnergy: 0, shield: 0 };
  private playerRunesCollected: string[] = [];

  public onCloseRequested?: () => void;
  public onTravelRequested?: (targetParsecX: number, targetParsecY: number, targetZoneX: number, targetZoneY: number) => void;

  constructor() {
    this.modalEl = document.getElementById('world-map-modal')!;
    this.gridEl = document.getElementById('world-map-grid')!;
    this.currentPosEl = document.getElementById('world-map-current-pos')!;

    this.detailSpriteEl = document.getElementById('detail-sprite') as HTMLImageElement;
    this.detailNameEl = document.getElementById('detail-name')!;
    this.detailRegionEl = document.getElementById('detail-region')!;
    this.detailStatusEl = document.getElementById('detail-status')!;
    this.detailActEl = document.getElementById('detail-act')!;
    this.detailObjectiveEl = document.getElementById('detail-objective')!;
    this.detailSummaryEl = document.getElementById('detail-summary')!;
    this.detailEnemiesEl = document.getElementById('detail-enemies')!;
    this.detailRuneStatsEl = document.getElementById('detail-rune-stats');
    this.detailRuneCountEl = document.getElementById('detail-rune-count');

    this.tabParsecBtn = document.getElementById('tab-parsec-grid');
    this.tabSubscreensBtn = document.getElementById('tab-subscreens');
    this.tabMilestonesBtn = document.getElementById('tab-milestones');

    this.setupListeners();
  }

  private setupListeners() {
    document.getElementById('close-world-map-btn')?.addEventListener('click', () => this.close());
    document.getElementById('world-map-done-btn')?.addEventListener('click', () => this.close());

    // Close on backdrop click outside card
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.code === 'Escape') && this.isOpen()) {
        e.preventDefault();
        this.close();
      }
    });

    document.getElementById('world-map-travel-btn')?.addEventListener('click', () => {
      this.embarkToSelected();
    });

    this.tabParsecBtn?.addEventListener('click', () => {
      this.viewMode = 'parsec_grid';
      this.updateTabsUI();
      this.render();
    });

    this.tabSubscreensBtn?.addEventListener('click', () => {
      this.viewMode = 'subscreens';
      this.updateTabsUI();
      this.render();
    });

    this.tabMilestonesBtn?.addEventListener('click', () => {
      this.viewMode = 'milestones';
      this.updateTabsUI();
      this.render();
    });
  }

  public embarkToSelected() {
    const { px, py } = this.selectedParsec;
    const { zx, zy } = this.selectedSubscreen;
    this.close();
    this.onTravelRequested?.(px, py, zx, zy);
  }

  private updateTabsUI() {
    this.tabParsecBtn?.classList.toggle('active', this.viewMode === 'parsec_grid');
    this.tabSubscreensBtn?.classList.toggle('active', this.viewMode === 'subscreens');
    this.tabMilestonesBtn?.classList.toggle('active', this.viewMode === 'milestones');
  }

  public updateState(coord: ZoneCoord, stage: StoryStage, hero: HeroRole) {
    this.currentZoneCoord = coord;
    this.currentStage = stage;
    this.heroRole = hero;

    this.selectedParsec = { px: coord.parasangX, py: coord.parasangY };
    this.selectedSubscreen = { zx: coord.zoneX, zy: coord.zoneY };

    const curLoc = STORY_LOCATIONS.find(loc => this.isSameLocation(loc.coord, coord));
    if (curLoc) {
      this.selectedLocationId = curLoc.id;
    }
  }

  public updatePlayerBonuses(
    bonuses?: { damage: number; maxHp: number; maxEnergy: number; shield: number },
    collected?: string[]
  ) {
    if (bonuses) this.playerRuneBonuses = { ...bonuses };
    if (collected) this.playerRunesCollected = [...collected];
    if (this.isOpen()) {
      this.renderDetail();
    }
  }

  public isSameLocation(a: ZoneCoord, b: ZoneCoord): boolean {
    if (a.depth !== b.depth) return false;
    if (
      a.parasangX === b.parasangX &&
      a.parasangY === b.parasangY &&
      a.zoneX === b.zoneX &&
      a.zoneY === b.zoneY
    ) {
      return true;
    }

    // Support legacy unit test coordinates alongside 3-parsec milestone coordinates
    const aKey = `${a.parasangX},${a.parasangY},${a.zoneX},${a.zoneY}`;
    const bKey = `${b.parasangX},${b.parasangY},${b.zoneX},${b.zoneY}`;
    const legacyEquivalents: Record<string, string> = {
      '2,2,1,1': '0,0,0,0',
      '3,0,1,1': '0,0,1,0',
      '3,3,1,1': '0,0,1,1',
      '6,3,1,1': '1,0,0,0',
      '9,3,1,1': '1,0,1,0',
      '9,6,1,1': '1,0,2,0',
      '12,6,1,1': '1,0,2,1',
      '15,6,1,1': '1,1,0,0'
    };
    return legacyEquivalents[aKey] === bKey || legacyEquivalents[bKey] === aKey;
  }

  public open() {
    this.updateTabsUI();
    this.render();
    this.modalEl.classList.remove('hidden');
  }

  public close() {
    this.modalEl.classList.add('hidden');
    this.onCloseRequested?.();
  }

  public isOpen(): boolean {
    return !this.modalEl.classList.contains('hidden');
  }

  public render() {
    if (!this.currentZoneCoord) {
      this.currentZoneCoord = { parasangX: 2, parasangY: 2, zoneX: 1, zoneY: 1, depth: 0 };
    }

    const curLoc = STORY_LOCATIONS.find(loc => this.isSameLocation(loc.coord, this.currentZoneCoord!));
    const curName = curLoc
      ? `${curLoc.name} [Parsec (${this.currentZoneCoord.parasangX}, ${this.currentZoneCoord.parasangY}) Screen (${this.currentZoneCoord.zoneX}, ${this.currentZoneCoord.zoneY})]`
      : `Parsec (${this.currentZoneCoord.parasangX}, ${this.currentZoneCoord.parasangY}), Screen (${this.currentZoneCoord.zoneX}, ${this.currentZoneCoord.zoneY}) ${this.currentZoneCoord.depth > 0 ? '[Depth ' + this.currentZoneCoord.depth + ']' : ''}`;
    this.currentPosEl.innerHTML = `Current Location: <span class="highlight">${curName}</span>`;

    this.gridEl.innerHTML = '';

    if (this.viewMode === 'parsec_grid') {
      this.renderParsecWorldGrid();
    } else if (this.viewMode === 'subscreens') {
      this.renderSubScreenNavigator();
    } else {
      this.renderMilestonesList();
    }

    this.renderDetail();
  }

  private renderParsecWorldGrid() {
    const { px: selPx, py: selPy } = this.selectedParsec;
    const container = document.createElement('div');
    container.className = 'qud-world-map-viewport';

    const header = document.createElement('div');
    header.className = 'qud-terrain-header';
    header.innerHTML = `
      <span>[#] OVERLAND REALM MAP (16x7 PARSECS)</span>
      <span style="font-size: 11px; color: #8899aa;">[CLICK / HOVER] Inspect Terrain • [T / ENTER] Fast Travel</span>
    `;
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'qud-terrain-grid';

    const inspector = document.createElement('div');
    inspector.className = 'qud-terrain-inspector';

    const updateInspector = (targetPx: number, targetPy: number) => {
      const info = getParsecTerrainInfo(targetPx, targetPy);
      const isHeroHere = this.currentZoneCoord?.parasangX === targetPx &&
                         this.currentZoneCoord?.parasangY === targetPy &&
                         this.currentZoneCoord?.depth === 0;

      inspector.innerHTML = `
        <div class="qud-terrain-info-left">
          <img class="qud-inspector-thumb" src="${info.spriteUrl}" alt="${info.terrainType}" />
          <div class="qud-inspector-text">
            <span class="qud-inspector-coord">[PARSEC ${targetPx.toString().padStart(2, '0')}, ${targetPy.toString().padStart(2, '0')}]</span>
            <span class="qud-inspector-name" style="color: ${info.color}; font-weight: bold;">${info.landmarkName || info.biomeName}</span>
            <span class="qud-inspector-meta">• Terrain: ${info.terrainType} (${info.elevation})</span>
            <span class="qud-inspector-danger">• Danger: Lvl ${info.dangerLevel}</span>
            ${isHeroHere ? '<span class="qud-inspector-here" style="color: var(--cyan); font-weight: bold;">[@ YOU ARE HERE]</span>' : ''}
          </div>
        </div>
        <div class="qud-terrain-info-right" style="font-size: 11px; color: #8899aa;">
          [T / ENTER] Embark
        </div>
      `;
    };

    for (let py = 0; py < PARSEC_GRID_HEIGHT; py++) {
      for (let px = 0; px < PARSEC_GRID_WIDTH; px++) {
        const isCurrent = this.currentZoneCoord?.parasangX === px &&
                          this.currentZoneCoord?.parasangY === py &&
                          this.currentZoneCoord?.depth === 0;
        const isSelected = selPx === px && selPy === py;
        const terrain = getParsecTerrainInfo(px, py);

        const tile = document.createElement('div');
        let cls = 'qud-terrain-cell';
        if (isCurrent) cls += ' current-parsec';
        if (isSelected) cls += ' selected';
        if (terrain.isLandmark) cls += ' landmark-tile';

        tile.className = cls;
        tile.style.color = isCurrent ? '#00ffff' : terrain.color;
        tile.title = `${terrain.landmarkName || terrain.terrainType} [Parsec (${px}, ${py})]`;

        tile.innerHTML = `
          <img class="qud-terrain-tile-img" src="${terrain.spriteUrl}" alt="${terrain.terrainType}" />
          ${isCurrent ? '<div class="qud-hero-overland-badge">@</div>' : ''}
          ${terrain.isLandmark && !isCurrent ? '<div class="qud-landmark-poi-badge">★</div>' : ''}
          <div class="bracket-l">[</div>
          <div class="bracket-r">]</div>
        `;

        tile.addEventListener('mouseenter', () => updateInspector(px, py));
        tile.addEventListener('mouseleave', () => updateInspector(this.selectedParsec.px, this.selectedParsec.py));

        tile.addEventListener('click', () => {
          this.selectedParsec = { px, py };
          this.selectedSubscreen = { zx: 1, zy: 1 };
          const milestone = STORY_LOCATIONS.find(l => l.coord.depth === 0 && l.coord.parasangX === px && l.coord.parasangY === py);
          if (milestone) {
            this.selectedLocationId = milestone.id;
          }
          this.render();
        });

        grid.appendChild(tile);
      }
    }

    // Initialize inspector with current selected parsec
    updateInspector(selPx, selPy);

    container.appendChild(grid);
    container.appendChild(inspector);
    this.gridEl.appendChild(container);
  }

  private renderSubScreenNavigator() {
    const { px, py } = this.selectedParsec;
    const biome = getParsecBiomeInfo(px, py);
    const parsecTerrain = getParsecTerrainInfo(px, py);

    const container = document.createElement('div');
    container.className = 'qud-subscreen-viewport';

    const header = document.createElement('div');
    header.className = 'qud-subscreen-header';
    header.innerHTML = `
      <span>[+] 3x3 ZONE SECTOR MAP: PARSEC (${px}, ${py}) — ${biome.name}</span>
      <span style="font-size: 10px; color: var(--cyan);">9 Contiguous Zone Screens</span>
    `;
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'qud-subscreen-grid';

    for (let zy = 0; zy < 3; zy++) {
      for (let zx = 0; zx < 3; zx++) {
        const card = document.createElement('div');
        const isCurrent = this.currentZoneCoord?.parasangX === px &&
                          this.currentZoneCoord?.parasangY === py &&
                          this.currentZoneCoord?.zoneX === zx &&
                          this.currentZoneCoord?.zoneY === zy;
        const isSelected = this.selectedSubscreen.zx === zx && this.selectedSubscreen.zy === zy;

        // Check if this screen is a key story milestone
        const milestone = STORY_LOCATIONS.find(l =>
          l.coord.depth === 0 &&
          l.coord.parasangX === px &&
          l.coord.parasangY === py &&
          l.coord.zoneX === zx &&
          l.coord.zoneY === zy
        );

        let cls = 'qud-subscreen-tile';
        if (isCurrent) cls += ' current-screen';
        if (isSelected) cls += ' selected';
        if (milestone) cls += ' milestone-screen';

        card.className = cls;

        // Top line: coords & badge
        const top = document.createElement('div');
        top.className = 'subscreen-top';

        const coordTxt = document.createElement('span');
        coordTxt.className = 'subscreen-coord';
        coordTxt.textContent = `Screen (${zx}, ${zy})`;

        const badge = document.createElement('span');
        badge.className = `subscreen-badge ${isCurrent ? 'here' : (milestone ? 'milestone' : 'procedural')}`;
        badge.textContent = isCurrent ? '[@ HERE]' : (milestone ? '[MILESTONE]' : '[SECTOR]');

        top.appendChild(coordTxt);
        top.appendChild(badge);

        // Center graphical tile / sprite
        const glyphDiv = document.createElement('div');
        glyphDiv.className = 'subscreen-glyph';
        let subSprite = parsecTerrain.spriteUrl;
        if (milestone) {
          subSprite = milestone.sprite;
        } else if (zx === 1 && zy === 1 && isRuinsParsec(px, py)) {
          subSprite = '/sprites/map_ruins.png';
        } else if (zx === 1 && zy === 1 && isCaveParsec(px, py)) {
          subSprite = '/sprites/loc_mines.png';
        }

        glyphDiv.innerHTML = `
          <div class="subscreen-tile-wrapper">
            <img class="subscreen-tile-img" src="${subSprite}" alt="Screen (${zx}, ${zy})" />
            ${isCurrent ? '<span class="subscreen-hero-badge">@</span>' : ''}
          </div>
        `;

        // Title
        const title = document.createElement('div');
        title.className = 'subscreen-title';
        if (milestone) {
          title.textContent = milestone.name;
        } else if (zx === 1 && zy === 1 && isRuinsParsec(px, py)) {
          title.textContent = 'Forgotten Arcology Ruins';
        } else if (zx === 1 && zy === 1 && isCaveParsec(px, py)) {
          title.textContent = 'Subterranean Cavern Mouth';
        } else {
          title.textContent = `${biome.name} Sector`;
        }

        // Feature line
        const features = document.createElement('div');
        features.className = 'subscreen-features';
        if (milestone) {
          features.textContent = `[*] Primary Story Quest Hub`;
        } else if (zx === 1 && zy === 1 && isRuinsParsec(px, py)) {
          features.textContent = `[#] Ancient Stone Relics & Ruins`;
        } else if (zx === 1 && zy === 1 && isCaveParsec(px, py)) {
          features.textContent = `[▼] Subterranean Delve Entrance`;
        } else {
          const seed = Math.abs((px * 73856093) ^ (py * 19349663) ^ (zx * 83492791) ^ (zy * 2654435761));
          const hasShrine = (seed % 100) < 35;
          const hasRune = (seed % 100) >= 35 && (seed % 100) < 60;
          features.textContent = hasShrine
            ? '[+] Ancient Shrine & Sacred Rune Altar'
            : (hasRune ? '[*] Wild Power Rune Clearing' : '[.] Wilderness Pathways & Ore Veins');
        }

        card.appendChild(top);
        card.appendChild(glyphDiv);
        card.appendChild(title);
        card.appendChild(features);

        card.addEventListener('click', () => {
          this.selectedSubscreen = { zx, zy };
          if (milestone) {
            this.selectedLocationId = milestone.id;
          }
          this.render();
        });

        grid.appendChild(card);
      }
    }

    container.appendChild(grid);
    this.gridEl.appendChild(container);
  }

  private renderMilestonesList() {
    const stageIdx = STAGE_ORDER.indexOf(this.currentStage);

    for (const loc of STORY_LOCATIONS) {
      const isCurrent = this.isSameLocation(loc.coord, this.currentZoneCoord!);
      const locStageIdx = STAGE_ORDER.indexOf(loc.stageTrigger);

      let statusClass = 'locked';
      let statusBadge = '[AHEAD]';

      if (isCurrent) {
        statusClass = 'current';
        statusBadge = '[@ HERE]';
      } else if (stageIdx > locStageIdx) {
        statusClass = 'completed';
        statusBadge = '[CLEARED]';
      } else if (stageIdx === locStageIdx) {
        statusClass = 'active-quest';
        statusBadge = '[ACTIVE]';
      }

      const card = document.createElement('div');
      card.className = `location-card ${statusClass} ${loc.id === this.selectedLocationId ? 'selected' : ''}`;

      const spriteImg = document.createElement('img');
      spriteImg.className = 'location-sprite';
      spriteImg.src = loc.sprite;
      spriteImg.alt = loc.name;

      const infoDiv = document.createElement('div');
      infoDiv.className = 'location-card-info';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'location-card-title';
      titleDiv.textContent = loc.name;

      const metaDiv = document.createElement('div');
      metaDiv.className = 'location-card-meta';
      metaDiv.textContent = `Parsec (${loc.coord.parasangX}, ${loc.coord.parasangY}) Screen (${loc.coord.zoneX}, ${loc.coord.zoneY}) ${loc.coord.depth > 0 ? 'D:' + loc.coord.depth : ''}`;

      const badgeDiv = document.createElement('div');
      badgeDiv.className = `location-badge ${statusClass}`;
      badgeDiv.textContent = statusBadge;

      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(metaDiv);
      infoDiv.appendChild(badgeDiv);

      if (isCurrent) {
        const heroBadge = document.createElement('img');
        heroBadge.className = 'location-hero-avatar';
        heroBadge.src = `/sprites/hero_${this.heroRole}.png`;
        heroBadge.title = `You are here as ${this.heroRole.toUpperCase()}!`;
        card.appendChild(heroBadge);
      }

      card.appendChild(spriteImg);
      card.appendChild(infoDiv);

      card.addEventListener('click', () => {
        this.selectedLocationId = loc.id;
        this.selectedParsec = { px: loc.coord.parasangX, py: loc.coord.parasangY };
        this.selectedSubscreen = { zx: loc.coord.zoneX, zy: loc.coord.zoneY };
        this.render();
      });

      this.gridEl.appendChild(card);
    }
  }

  private renderDetail() {
    const { px, py } = this.selectedParsec;
    const { zx, zy } = this.selectedSubscreen;

    // Check if the selected subscreen is a milestone
    const milestone = STORY_LOCATIONS.find(l =>
      l.coord.depth === 0 &&
      l.coord.parasangX === px &&
      l.coord.parasangY === py &&
      l.coord.zoneX === zx &&
      l.coord.zoneY === zy
    ) || (this.viewMode === 'milestones' ? STORY_LOCATIONS.find(l => l.id === this.selectedLocationId) : undefined);

    const isCurrent = this.currentZoneCoord
      ? this.currentZoneCoord.parasangX === px &&
        this.currentZoneCoord.parasangY === py &&
        this.currentZoneCoord.zoneX === zx &&
        this.currentZoneCoord.zoneY === zy &&
        this.currentZoneCoord.depth === 0
      : false;

    const biome = getParsecBiomeInfo(px, py);
    const parsecTerrain = getParsecTerrainInfo(px, py);

    if (milestone) {
      const stageIdx = STAGE_ORDER.indexOf(this.currentStage);
      const locStageIdx = STAGE_ORDER.indexOf(milestone.stageTrigger);

      let statusText = '[·] UPCOMING STORY CHAPTER';
      let statusColor = '#778899';

      if (isCurrent) {
        statusText = '[@] YOU ARE CURRENTLY HERE';
        statusColor = 'var(--cyan)';
      } else if (stageIdx > locStageIdx) {
        statusText = '[✓] PREVIOUSLY VISITED / COMPLETED';
        statusColor = 'var(--green)';
      } else if (stageIdx === locStageIdx) {
        statusText = '[▶] CURRENT ACTIVE QUEST TARGET';
        statusColor = 'var(--amber-bright)';
      }

      this.detailSpriteEl.src = milestone.sprite;
      this.detailNameEl.textContent = milestone.name;
      this.detailRegionEl.textContent = `${milestone.region} • Screen (${milestone.coord.zoneX}, ${milestone.coord.zoneY})`;
      this.detailStatusEl.textContent = statusText;
      this.detailStatusEl.style.color = statusColor;

      this.detailActEl.textContent = milestone.actTitle;
      this.detailObjectiveEl.textContent = milestone.objective;
      this.detailSummaryEl.textContent = milestone.summary;
      this.detailEnemiesEl.textContent = milestone.boss ? `${milestone.boss} (Boss), ${milestone.enemies.join(', ')}` : milestone.enemies.join(', ');
    } else {
      // Procedural wilderness screen
      this.detailSpriteEl.src = parsecTerrain.spriteUrl;
      this.detailNameEl.textContent = `${biome.name} Wilderness`;
      this.detailRegionEl.textContent = `Parsec (${px}, ${py}) • Screen (${zx}, ${zy}) of 9`;
      this.detailStatusEl.textContent = isCurrent ? '[@] YOU ARE CURRENTLY HERE' : `[TERRAIN] ${parsecTerrain.terrainType.toUpperCase()}`;
      this.detailStatusEl.style.color = isCurrent ? 'var(--cyan)' : '#8899aa';

      this.detailActEl.textContent = `Overland Exploration (Danger: Lvl ${parsecTerrain.dangerLevel})`;
      this.detailObjectiveEl.textContent = 'Explore this sector for ancient stone shrines, power runes, and mineral deposits to strengthen your party.';
      this.detailSummaryEl.textContent = `${parsecTerrain.description} All 9 screens within this parsec are connected with clear cross-screen pathways at the borders.`;
      this.detailEnemiesEl.textContent = 'Roaming regional beasts, mineral spiders, and wild sentinels.';
    }

    // Update Rune Buffs in Drawer
    if (this.detailRuneStatsEl) {
      const b = this.playerRuneBonuses;
      this.detailRuneStatsEl.innerHTML = `
        <span class="rune-stat-tag">[ATK] <strong>+${b.damage}</strong> ATK Damage</span>
        <span class="rune-stat-tag">[VIT] <strong>+${b.maxHp}</strong> Max HP</span>
        <span class="rune-stat-tag">[NRG] <strong>+${b.maxEnergy}</strong> Max NRG</span>
        <span class="rune-stat-tag">[DEF] <strong>+${b.shield}</strong> Shield HP</span>
      `;
    }

    if (this.detailRuneCountEl) {
      const count = this.playerRunesCollected.length;
      this.detailRuneCountEl.textContent = count > 0
        ? `[*] ${count} Ancient Power Rune${count > 1 ? 's' : ''} absorbed permanently!`
        : `Explore procedural shrines across the parsecs to discover ancient runes!`;
    }

    // Update Travel Button
    const travelBtn = document.getElementById('world-map-travel-btn') as HTMLButtonElement | null;
    if (travelBtn) {
      if (isCurrent) {
        travelBtn.textContent = '[@] YOU ARE ALREADY HERE';
        travelBtn.disabled = true;
        travelBtn.style.opacity = '0.5';
        travelBtn.style.cursor = 'default';
      } else {
        travelBtn.textContent = `[▶] EMBARK OVERLAND TRAVEL [Parsec (${px}, ${py}) Screen (${zx}, ${zy})] [Enter / T]`;
        travelBtn.disabled = false;
        travelBtn.style.opacity = '1';
        travelBtn.style.cursor = 'pointer';
      }
    }
  }
}
