import { KeyMappingConfig, SkillDefinition, Attributes, HeroRole } from './types';

export const ZONE_WIDTH = 48;
export const ZONE_HEIGHT = 28;

export const DEFAULT_TICK_RATE = 5; // 5 ticks per second (200ms)
export const MIN_TICK_RATE = 2;
export const MAX_TICK_RATE = 10;

export const DEFAULT_KEY_MAPPINGS: KeyMappingConfig = {
  moveUp: 'ArrowUp',
  moveDown: 'ArrowDown',
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  moveUpLeft: 'Home',
  moveUpRight: 'PageUp',
  moveDownLeft: 'End',
  moveDownRight: 'PageDown',
  waitTurn: 'Period',
  attack: 'Digit1',
  specialAbility: 'Digit2',
  mine: 'Digit3',
  craft: 'Digit4',
  revive: 'KeyR',
  charSheet: 'KeyC',
  inventory: 'KeyI',
  pickup: 'KeyG',
  settings: 'KeyO'
};

// Alternative WASD / Vi key aliases handled gracefully in input manager
export const WASD_ALIASES: Record<string, string> = {
  KeyW: 'moveUp', w: 'moveUp', W: 'moveUp',
  KeyS: 'moveDown', s: 'moveDown', S: 'moveDown',
  KeyA: 'moveLeft', a: 'moveLeft', A: 'moveLeft',
  KeyD: 'moveRight', d: 'moveRight', D: 'moveRight',
  KeyQ: 'moveUpLeft', q: 'moveUpLeft', Q: 'moveUpLeft',
  KeyE: 'moveUpRight', e: 'moveUpRight', E: 'moveUpRight',
  KeyZ: 'moveDownLeft', z: 'moveDownLeft', Z: 'moveDownLeft',
  KeyX: 'moveDownRight', x: 'moveDownRight', X: 'moveDownRight',
  // Vi keys
  KeyH: 'moveLeft', h: 'moveLeft',
  KeyJ: 'moveDown', j: 'moveDown',
  KeyK: 'moveUp', k: 'moveUp',
  KeyL: 'moveRight', l: 'moveRight',
  KeyY: 'moveUpLeft', y: 'moveUpLeft',
  KeyU: 'moveUpRight', u: 'moveUpRight',
  KeyB: 'moveDownLeft', b: 'moveDownLeft',
  KeyN: 'moveDownRight', n: 'moveDownRight',
  // Arrows
  ArrowUp: 'moveUp',
  ArrowDown: 'moveDown',
  ArrowLeft: 'moveLeft',
  ArrowRight: 'moveRight',
  // Numpad
  Numpad8: 'moveUp',
  Numpad2: 'moveDown',
  Numpad4: 'moveLeft',
  Numpad6: 'moveRight',
  Numpad7: 'moveUpLeft',
  Numpad9: 'moveUpRight',
  Numpad1: 'moveDownLeft',
  Numpad3: 'moveDownRight',
  Numpad5: 'waitTurn',
  // Actions
  Space: 'waitTurn',
  Period: 'waitTurn',
  '.': 'waitTurn',
  Digit1: 'attack', '1': 'attack',
  Digit2: 'specialAbility', '2': 'specialAbility',
  Digit3: 'mine', '3': 'mine',
  Digit4: 'craft', '4': 'craft',
  KeyR: 'revive', r: 'revive', R: 'revive',
  KeyC: 'charSheet', c: 'charSheet', C: 'charSheet',
  KeyI: 'inventory', i: 'inventory', I: 'inventory',
  KeyG: 'pickup', g: 'pickup', G: 'pickup', comma: 'pickup', ',': 'pickup'
};

// Caves of Qud Aesthetic Palette - High Contrast & Phosphor Luminous
export const COLORS = {
  bg: '#05070a',
  bgDark: '#0a0f14',
  amber: '#e69900',
  amberBright: '#ffb733',
  green: '#55ff55',
  greenDark: '#2a773a',
  grassGreen: '#4e8a44',
  grassDim: '#3a6634',
  dirtPath: '#9a7852',
  cyan: '#00ffff',
  cyanDark: '#008899',
  fireRed: '#ff4422',
  boneWhite: '#e0dac8',
  stoneGray: '#8aa3b8',
  wallGray: '#9bb0c2',
  floorWood: '#9a8060',
  floorStone: '#55687a',
  darkGray: '#485c6e',
  purpleEnder: '#aa22ff',
  bossGold: '#ffd700',
  waterBlue: '#3366bb',
  mistCyan: '#66aabb',
  hudBorder: '#8899aa',
  hudText: '#ccddee',
  // Rainbow Pom-Pom Colors
  rainbow: {
    red: '#ff3344',
    orange: '#ff8800',
    yellow: '#ffea00',
    green: '#33dd55',
    blue: '#2299ff',
    purple: '#aa33ff'
  }
};

export const SYMBOLS = {
  player: '@',
  zombie: 'z',
  ghost: 'G',
  skeleton: 's',
  mutantSkeleton: 'S',
  creeper: 'c',
  mutantCreeper: 'C',
  rockMiniBoss: 'r',
  rockKing: 'R',
  archVillager: 'V',
  heartOfEnder: 'E',
  wall: '▓',
  breakableWall: '░',
  floor: '·',
  water: '~',
  mist: '░',
  door: '+',
  stairsDown: '>',
  stairsUp: '<',
  workbench: '∏',
  altar: 'Ω',
  switch: '☼',
  shield: '≡',
  laserProjectile: '━',
  fireballProjectile: '*',
  iceProjectile: '❄',
  rockProjectile: '●',
  lightsaberProjectile: '═',
  potion: '!',
  materialScrap: '%',
  materialCrystal: '♦',
  key: '♀',
  pomPom: '•',
  lightsaber: '/',
  oreCopper: '%',
  oreIron: '■',
  oreObsidian: '▲',
  oreRelic: 'Ω'
};

export const MINING_TIERS = {
  0: { name: 'Makeshift / Bare Hands', digPower: 10, digs: 'Soft Earth, Clay, Rubble & Broken Stone' },
  1: { name: 'Heavy Carbide Pickaxe', digPower: 25, digs: 'Solid Rock Walls, Copper Veins & Perimeter Barriers' },
  2: { name: 'High-Carbon Steel Pickaxe', digPower: 45, digs: 'Dense Iron Ore Veins, Diode Veins & Deep Cavern Granite' },
  3: { name: 'Cryo-Plasma Mining Drill', digPower: 75, digs: 'Basalt, Obsidian Spires & Corroded Chrome Strata' },
  4: { name: 'Quantum Laser Excavator', digPower: 120, digs: 'Ancient Superalloy, Relic Vault Walls & Quantum Strata' }
} as const;

export function getToolTierName(tier: number): string {
  return (MINING_TIERS as any)[tier]?.name || 'Makeshift Tool';
}

export const RAINBOW_ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;
 
export const BASE_HERO_ATTRIBUTES: Record<HeroRole, Attributes> = {
  barrett: { str: 14, agi: 18, tou: 14, int: 16, wil: 12, ego: 14 },
  luther: { str: 18, agi: 12, tou: 18, int: 12, wil: 16, ego: 12 },
  beau: { str: 12, agi: 14, tou: 14, int: 18, wil: 16, ego: 16 },
  luca: { str: 10, agi: 14, tou: 12, int: 16, wil: 18, ego: 16 }
};

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  // Wayfaring & Survival
  {
    id: 'wilderness_lore',
    name: 'Wilderness Lore',
    category: 'wayfaring',
    type: 'passive',
    spCost: 1,
    icon: '🧭',
    description: 'Drastically reduces chance of getting lost during world map travel from 25% down to 5%. Increases chance of finding forgotten ruins and subterranean caves by +50%!'
  },
  {
    id: 'cave_delver',
    name: 'Cave Delver',
    category: 'wayfaring',
    type: 'passive',
    spCost: 2,
    icon: '⛏️',
    description: 'Master subterranean caverns. Reveals hidden mineral veins through stone walls and grants +20% damage resistance while exploring underground strata (Depth > 0).'
  },
  {
    id: 'swift_strider',
    name: 'Swift Strider',
    category: 'wayfaring',
    type: 'passive',
    spCost: 2,
    icon: '👢',
    description: 'Increases base movement speed and grants a 15% chance to dodge incoming enemy melee strikes.'
  },
  {
    id: 'phase_shift',
    name: 'Phase Shift',
    category: 'wayfaring',
    type: 'active',
    spCost: 2,
    energyCost: 20,
    cooldownTicks: 5,
    icon: '✧',
    description: 'Quantum Blink: Instantly teleports 3 tiles in facing or target direction, phasing cleanly through solid stone walls!'
  },

  // Combat & Melee
  {
    id: 'cleave',
    name: 'Cleave',
    category: 'combat',
    type: 'passive',
    spCost: 2,
    icon: '🪓',
    description: 'Melee attacks strike in a sweeping arc, hitting up to 2 adjacent foes and sundering their armor.'
  },
  {
    id: 'whirlwind',
    name: 'Whirlwind Tempest',
    category: 'combat',
    type: 'active',
    spCost: 2,
    energyCost: 20,
    cooldownTicks: 4,
    icon: '🌪️',
    description: 'Spinning Blade Cyclone: Strikes all surrounding foes in a 360-degree radius for 150% damage and knocks them back 1 tile!'
  },
  {
    id: 'shield_wall',
    name: 'Shield Wall',
    category: 'combat',
    type: 'passive',
    spCost: 2,
    icon: '🛡️',
    description: 'Permanently establishes a +40 Energy Forcefield that absorbs incoming damage before reducing your HP.'
  },
  {
    id: 'shield_slam',
    name: 'Shield Slam',
    category: 'combat',
    type: 'active',
    spCost: 2,
    energyCost: 15,
    cooldownTicks: 5,
    icon: '💥',
    description: 'Concussive Bash: Smashes an adjacent enemy with your shield/fist for 35 damage, knocking them back and stunning them for 3 ticks!'
  },
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    category: 'combat',
    type: 'passive',
    spCost: 3,
    icon: '🩸',
    description: 'Slaying any enemy immediately restores 20 HP and 15 Energy in an adrenaline surge.'
  },

  // Marksmanship & Technology
  {
    id: 'overcharge',
    name: 'Overcharge',
    category: 'marksmanship',
    type: 'passive',
    spCost: 2,
    icon: '⚡',
    description: 'Laser weapons and projectile attacks pierce through targets and deal +35% critical damage.'
  },
  {
    id: 'concussive_blast',
    name: 'Concussive Blast',
    category: 'marksmanship',
    type: 'active',
    spCost: 2,
    energyCost: 25,
    cooldownTicks: 6,
    icon: '☄️',
    description: 'Fires an explosive shockwave projectile dealing 40 damage, knocking foes back 2 tiles and stunning for 2 ticks.'
  },
  {
    id: 'nano_sentry',
    name: 'Deploy Nano-Sentry',
    category: 'marksmanship',
    type: 'active',
    spCost: 3,
    energyCost: 35,
    cooldownTicks: 12,
    icon: '🤖',
    description: 'Deploys an automated micro-turret adjacent to you that fires laser beams at nearby hostiles for 10 ticks!'
  },
  {
    id: 'tinkering',
    name: 'Tinkering Mastery',
    category: 'marksmanship',
    type: 'passive',
    spCost: 2,
    icon: '🔧',
    description: 'Master engineer: doubles the damage of grenades and power of shield batteries & energy cells.'
  },

  // Esoteric & Medical Powers
  {
    id: 'deep_freeze',
    name: 'Deep Freeze',
    category: 'powers',
    type: 'passive',
    spCost: 2,
    icon: '❄️',
    description: "Extends Beau's Ice Blast freeze duration by +3 ticks and inflicts lingering cryo-frostbite damage."
  },
  {
    id: 'cryo_nova',
    name: 'Cryo Nova',
    category: 'powers',
    type: 'active',
    spCost: 2,
    energyCost: 30,
    cooldownTicks: 8,
    icon: '🌨️',
    description: 'Detonates a sub-zero blizzard around you, freezing all enemies within 2 tiles for 7 ticks and dealing 30 cryo damage!'
  },
  {
    id: 'restorative_mist',
    name: 'Restorative Mist',
    category: 'powers',
    type: 'active',
    spCost: 2,
    energyCost: 25,
    cooldownTicks: 7,
    icon: '🧪',
    description: 'Releases a cloud of medical nanites, restoring 45 HP and curing all negative status effects for you and adjacent allies.'
  },
  {
    id: 'field_surgeon',
    name: 'Field Surgeon',
    category: 'powers',
    type: 'passive',
    spCost: 2,
    icon: '💉',
    description: "Luther's healing draughts grant the revived or healed target 3 ticks of complete invulnerability."
  },
  {
    id: 'pyrokinesis',
    name: 'Pyrokinesis',
    category: 'powers',
    type: 'passive',
    spCost: 3,
    icon: '🔥',
    description: "Barrett's fireballs ignite targets in rolling infernos, burning adjacent foes and melting ice blocks into boiling steam."
  },
  {
    id: 'kinetic_slam',
    name: 'Kinetic Wand Slam',
    category: 'powers',
    type: 'active',
    spCost: 2,
    energyCost: 20,
    cooldownTicks: 4,
    icon: '🪄',
    description: 'Kinetic Grav-Pulse: Uses a mystic wand to thrust a target mob 3 tiles backwards, violently slamming them into solid walls for massive collision damage and concussive stun!'
  }
];
