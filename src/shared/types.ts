export type HeroRole = 'barrett' | 'luther' | 'beau' | 'luca';

export interface ZoneCoord {
  parasangX: number;
  parasangY: number;
  zoneX: number; // 0..2 within parasang
  zoneY: number; // 0..2 within parasang
  depth: number; // 0 = surface, 1 = underground
}

export type PacingMode = 'turn_based' | 'real_time';

export type StatusEffect = 'frozen' | 'burning' | 'downed' | 'shielded' | 'climbing' | 'lost' | 'phase' | 'stunned';

export interface Attributes {
  str: number; // Strength (melee damage, mining)
  agi: number; // Agility (dodge, projectile damage, hit chance)
  tou: number; // Toughness (Max HP, natural regen, damage resistance)
  int: number; // Intelligence (skill points, ability energy cost)
  wil: number; // Willpower (cooldowns, energy shields, status resistance)
  ego: number; // Ego (ability potency, bot party resonance)
}

export type SkillCategory = 'wayfaring' | 'combat' | 'marksmanship' | 'powers';
export type SkillType = 'active' | 'passive';

export interface SkillDefinition {
  id: string;
  name: string;
  category: SkillCategory;
  type: SkillType;
  spCost: number;
  energyCost?: number;
  cooldownTicks?: number;
  description: string;
  icon: string;
  tier?: number;
}

export type StoryStage =
  | 'SPAWN'
  | 'WHITEHILL_MINES'
  | 'ZOMBIE_CREEK'
  | 'WATER_MOUNTAIN_PUZZLE'
  | 'SKELETON_HOMESTEAD'
  | 'MUTANT_SKELETON'
  | 'CREEPER_HOMESTEAD'
  | 'MUTANT_CREEPER'
  | 'POWER_DOWN'
  | 'ROCKY_DOOM_SWARM'
  | 'ROCKY_DOOM_SLAP'
  | 'ROCKY_DOOM_DUAL_BOSS'
  | 'SOLO_FINAL_STAND'
  | 'VICTORY';

export interface KeyMappingConfig {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  moveUpLeft: string;
  moveUpRight: string;
  moveDownLeft: string;
  moveDownRight: string;
  waitTurn: string;
  attack: string;       // Action 1 (Laser, melee, or default shot)
  specialAbility: string; // Action 2 (Barrett: Fireball, Beau: Ice Blast, Luther: Healing Radiance)
  mine: string;         // Action 3 (Pickaxe / excavate wall)
  craft: string;        // Action 4 (Workbench crafting / puzzle interact)
  revive: string;       // R (Revive downed ally)
  charSheet: string;    // C (View party details & skills)
  inventory: string;    // I (Inventory & Equipment)
  pickup: string;       // G (Pick up item underfoot)
  settings: string;     // O (Options & Keybindings)
}

export type ItemSlot = 'weapon' | 'shield' | 'head' | 'body' | 'relic';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'quantum';
export type ItemType = 'weapon' | 'shield' | 'head' | 'body' | 'relic' | 'material' | 'key' | 'puzzle_piece' | 'consumable' | 'rune';

export interface EquipmentSlots {
  weapon?: Item;
  shield?: Item;
  head?: Item;
  body?: Item;
  relic?: Item;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  slot?: ItemSlot;
  rarity?: ItemRarity;
  symbol: string;
  color: string;
  description: string;
  weight?: number; // In lbs
  count?: number;
  colorTag?: string; // For rainbow pom-poms
  runeStat?: 'might' | 'vitality' | 'zephyr' | 'aegis' | 'baetyl' | 'flame' | 'cryo' | 'shepherd';
  runeBonus?: number;
  // Equipment / Stat bonuses
  atkBonus?: number;
  defenseBonus?: number; // percentage, e.g. 15 for 15% damage mitigation
  shieldBonus?: number;
  hpBonus?: number;
  energyBonus?: number;
  // Consumable effects
  healHp?: number;
  restoreEnergy?: number;
  rechargeShield?: number;
  cureStatus?: boolean;
  aoeDamage?: number;
  aoeFreeze?: number;
  phaseTicks?: number;
  // Mining tool properties
  miningPower?: number; // Mining / digging damage dealt per strike
  miningTier?: number; // 0: Makeshift, 1: Carbide Pick, 2: Steel, 3: Cryo-Plasma Drill, 4: Quantum Excavator
}

export interface Entity {
  id: string;
  name: string;
  x: number;
  y: number;
  zone: ZoneCoord;
  symbol: string;
  color: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  role?: HeroRole;
  isPlayer: boolean;
  isBot?: boolean;
  isDowned?: boolean;
  isGhost?: boolean; // Can phase through solid walls
  isClimbing?: boolean; // Scaled the energy shield
  hasShield?: boolean;
  shieldHp?: number;
  statusEffects: Partial<Record<StatusEffect, number>>; // effect -> remaining ticks
  inventory: Item[];
  equipment?: EquipmentSlots;
  facing: { dx: number; dy: number };
  equippedWeapon?: Item;
  runesCollected?: string[];
  runeBonuses?: { damage: number; maxHp: number; maxEnergy: number; shield: number };
  level?: number;
  xp?: number;
  nextLevelXp?: number;
  attributePoints?: number;
  skillPoints?: number;
  attributes?: Attributes;
  skillsLearned?: string[];
  skillCooldowns?: Record<string, number>;
  equippedSkills?: string[];
  isElite?: boolean;
  eliteAffix?: string;
  aggroTargetId?: string;
  isAlerted?: boolean;
  patrolHome?: { x: number; y: number };
}

export type TileType =
  | 'floor'
  | 'wall'
  | 'breakable_wall'
  | 'water'
  | 'mist'
  | 'shield'
  | 'altar'
  | 'door'
  | 'workbench'
  | 'stairs_down'
  | 'stairs_up'
  | 'victory_switch';

export interface Tile {
  type: TileType;
  char: string;
  color: string;
  bgColor?: string;
  walkable: boolean;
  transparent: boolean;
  minable?: boolean;
  hp?: number; // Current durability / health of this wall tile
  maxHp?: number; // Max durability of this wall
  requiredTier?: number; // Minimum mining tool tier required to dig this wall (0-4)
  oreDrop?: string; // Item template key dropped on wall break
  oreName?: string; // Descriptive flavor name for combat / story chronicles logs
  pedestalColor?: string; // For Water Mountain puzzle
  pedestalItem?: Item;
}

export interface WaveInfo {
  currentWave: number;
  totalWaves: number;
  enemiesRemaining: number;
  waveCleared: boolean;
  zoneLevel: number;
}

export interface ZoneData {
  coord: ZoneCoord;
  name: string;
  width: number;
  height: number;
  tiles: Tile[][];
  items: { x: number; y: number; item: Item }[];
  hasRuins?: boolean;
  hasCaveEntrance?: boolean;
  waveInfo?: WaveInfo;
  tileUpdates?: { x: number; y: number; tile: Tile }[];
}

export interface Projectile {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  symbol: string;
  color: string;
  type: 'laser' | 'ice' | 'fireball' | 'rock' | 'arrow' | 'lightsaber';
  sourceId: string;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  durationMs: number;
}

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  text: string;
  color: string;
  category: 'combat' | 'story' | 'system' | 'dialogue';
}

export interface DialogueBox {
  id: string;
  speaker: string;
  avatarSymbol: string;
  avatarColor: string;
  text: string;
  choices?: { text: string; action: string }[];
}

// Network Messages
export type ClientMessage =
  | { type: 'JOIN_ROOM'; roomId: string; hero: HeroRole; playerName: string }
  | { type: 'PLAYER_MOVE'; dx: number; dy: number }
  | { type: 'PLAYER_ACTION'; actionType: 'attack' | 'special' | 'mine' | 'craft' | 'revive' | 'wait'; targetX?: number; targetY?: number }
  | { type: 'INTERACT'; x: number; y: number; itemId?: string }
  | { type: 'SET_TICK_RATE'; tickRate: number }
  | { type: 'ADVANCE_STORY' }
  | { type: 'WORLD_MAP_TRAVEL'; targetParsecX: number; targetParsecY: number; targetZoneX?: number; targetZoneY?: number }
  | { type: 'ALLOCATE_ATTRIBUTE'; attribute: keyof Attributes }
  | { type: 'UNLOCK_SKILL'; skillId: string }
  | { type: 'ACTIVATE_SKILL'; skillId: string; targetX?: number; targetY?: number }
  | { type: 'EQUIP_ITEM'; itemId: string; slot: ItemSlot }
  | { type: 'UNEQUIP_ITEM'; slot: ItemSlot }
  | { type: 'USE_ITEM'; itemId: string }
  | { type: 'DROP_ITEM'; itemId: string }
  | { type: 'PICKUP_ITEM'; itemId?: string }
  | { type: 'DESCEND_STAIRS' }
  | { type: 'ASCEND_STAIRS' };

export type ServerMessage =
  | { type: 'INIT_STATE'; hero: HeroRole; entityId: string; zone: ZoneData; pacingMode: PacingMode; tickRate: number; storyStage: StoryStage }
  | { type: 'WORLD_UPDATE'; zoneCoord: ZoneCoord; entities: Entity[]; items: { x: number; y: number; item: Item }[]; projectiles: Projectile[]; floatingTexts: FloatingText[]; pacingMode: PacingMode; waveInfo?: WaveInfo; tiles?: Tile[][]; tileUpdates?: { x: number; y: number; tile: Tile }[] }
  | { type: 'ZONE_CHANGED'; zone: ZoneData; pacingMode: PacingMode; waveInfo?: WaveInfo }
  | { type: 'COMBAT_LOG'; entry: CombatLogEntry }
  | { type: 'STORY_EVENT'; stage: StoryStage; dialogue?: DialogueBox; questTitle: string; questDesc: string }
  | { type: 'LEVEL_RESET'; message: string }
  | { type: 'PARTY_UPDATE'; members: { role: HeroRole; name: string; hp: number; maxHp: number; isDowned: boolean; zone: ZoneCoord; isBot: boolean; level?: number; xp?: number; nextLevelXp?: number }[] }
  | { type: 'LEVEL_UP_EVENT'; hero: HeroRole; level: number; attributePoints: number; skillPoints: number }
  | { type: 'WORLD_TRAVEL_RESULT'; eventType: 'normal' | 'lost' | 'found_ruins' | 'found_cave'; message: string; coord: ZoneCoord }
  | { type: 'GAME_OVER'; reason?: string };
