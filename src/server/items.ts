import { Item, ItemSlot, ItemRarity, ItemType, EquipmentSlots, HeroRole } from '../shared/types';
import { COLORS, SYMBOLS } from '../shared/constants';

export const ITEM_TEMPLATES: Record<string, Omit<Item, 'id'>> = {
  // --- WEAPONS ---
  vibro_blade: {
    name: 'Vibro-Khopesh',
    type: 'weapon',
    slot: 'weapon',
    rarity: 'uncommon',
    symbol: '/',
    color: COLORS.cyan,
    weight: 4.0,
    atkBonus: 12,
    description: 'A high-frequency oscillating curved blade that saws cleanly through chitin and steel.'
  },
  laser_rifle: {
    name: 'High-Energy Laser Rifle',
    type: 'weapon',
    slot: 'weapon',
    rarity: 'uncommon',
    symbol: '━',
    color: COLORS.cyan,
    weight: 6.0,
    atkBonus: 18,
    description: 'A focused optical collimator beam weapon capable of searing distant foes.'
  },
  phase_dagger: {
    name: 'Phase Dagger',
    type: 'weapon',
    slot: 'weapon',
    rarity: 'rare',
    symbol: '/',
    color: COLORS.purpleEnder,
    weight: 1.5,
    atkBonus: 10,
    energyBonus: 10,
    description: 'A quantum-tuned crystalline blade that flickers in and out of dimensional phase.'
  },
  mining_pick: {
    name: 'Heavy Carbide Pickaxe',
    type: 'weapon',
    slot: 'weapon',
    rarity: 'common',
    symbol: '∏',
    color: COLORS.stoneGray,
    weight: 8.0,
    atkBonus: 10,
    hpBonus: 10,
    miningTier: 1,
    miningPower: 25,
    description: '[TIER 1 MINING TOOL] Reinforced heavy carbide mining pick suited for quarrying solid rock, copper veins, and perimeter walls.'
  },
  hardened_pick: {
    name: 'High-Carbon Steel Pickaxe',
    type: 'weapon',
    slot: 'weapon',
    rarity: 'uncommon',
    symbol: '∏',
    color: COLORS.hudText,
    weight: 7.0,
    atkBonus: 16,
    hpBonus: 15,
    miningTier: 2,
    miningPower: 45,
    description: '[TIER 2 MINING TOOL] Tempered carbon-steel pickaxe capable of fracturing dense iron ore veins, crystal diodes, and deep granite.'
  },
  plasma_drill: {
    name: 'Cryo-Plasma Mining Drill',
    type: 'weapon',
    slot: 'weapon',
    rarity: 'rare',
    symbol: '╤',
    color: COLORS.cyan,
    weight: 6.0,
    atkBonus: 22,
    energyBonus: 20,
    miningTier: 3,
    miningPower: 75,
    description: '[TIER 3 MINING TOOL] Thermal plasma boring device that effortlessly vaporizes basalt, obsidian spires, and corroded chrome strata.'
  },
  quantum_bore: {
    name: 'Quantum Laser Excavator',
    type: 'weapon',
    slot: 'weapon',
    rarity: 'quantum',
    symbol: '╪',
    color: COLORS.bossGold,
    weight: 4.5,
    atkBonus: 32,
    shieldBonus: 25,
    miningTier: 4,
    miningPower: 120,
    description: '[TIER 4 MINING TOOL] Pre-collapse quantum matter disintegrator. Obliterates ancient bunker superalloys, relic vaults, and void strata.'
  },
  cryo_stave: {
    name: 'Cryo-Stave',
    type: 'weapon',
    slot: 'weapon',
    rarity: 'rare',
    symbol: '❄',
    color: COLORS.cyan,
    weight: 5.0,
    atkBonus: 14,
    energyBonus: 15,
    description: 'An esoteric glacial focus channeled with the biting chill of the upper fells.'
  },
  lightsaber: {
    name: 'Beam Light-Blade',
    type: 'weapon',
    slot: 'weapon',
    rarity: 'quantum',
    symbol: '═',
    color: COLORS.bossGold,
    weight: 2.5,
    atkBonus: 28,
    shieldBonus: 20,
    miningTier: 4,
    miningPower: 90,
    description: 'A glowing photonic arc blade from the ancient pre-collapse builders.'
  },
  electro_maul: {
    name: 'Electro-Pneumatic Maul',
    type: 'weapon',
    slot: 'weapon',
    rarity: 'rare',
    symbol: '∏',
    color: COLORS.amberBright,
    weight: 12.0,
    atkBonus: 20,
    miningTier: 2,
    miningPower: 40,
    description: 'A colossal pneumatic hammer crackling with lethal high-voltage capacitors.'
  },

  // --- SHIELDS ---
  hardlight_buckler: {
    name: 'Hardlight Buckler',
    type: 'shield',
    slot: 'shield',
    rarity: 'common',
    symbol: '≡',
    color: COLORS.cyan,
    weight: 3.5,
    shieldBonus: 25,
    defenseBonus: 5,
    description: 'A compact forearm emitter projecting a translucent hexagonal defensive barrier.'
  },
  prismatic_aegis: {
    name: 'Prismatic Aegis',
    type: 'shield',
    slot: 'shield',
    rarity: 'rare',
    symbol: '≡',
    color: COLORS.purpleEnder,
    weight: 7.0,
    shieldBonus: 50,
    defenseBonus: 15,
    description: 'A quantum-tuned crystalline shield that refracts laser fire and absorbs shockwaves.'
  },
  chitin_ward: {
    name: 'Chitinous Carapace Ward',
    type: 'shield',
    slot: 'shield',
    rarity: 'uncommon',
    symbol: '≡',
    color: COLORS.amber,
    weight: 4.5,
    shieldBonus: 35,
    defenseBonus: 10,
    description: 'Harvested from the impenetrable dorsal plate of a subterranean scarab.'
  },

  // --- HEADGEAR ---
  miners_headlamp: {
    name: "Miner's Halogen Helmet",
    type: 'head',
    slot: 'head',
    rarity: 'common',
    symbol: '^',
    color: COLORS.amberBright,
    weight: 2.0,
    hpBonus: 15,
    description: 'Sturdy brass mining helm equipped with a high-intensity phosphor halogen beam.'
  },
  neural_visor: {
    name: 'Neural Targeting Visor',
    type: 'head',
    slot: 'head',
    rarity: 'uncommon',
    symbol: '^',
    color: COLORS.cyan,
    weight: 1.0,
    energyBonus: 15,
    atkBonus: 4,
    description: 'A cybernetic optical band highlighting biological weak points on hostiles.'
  },
  psionic_cowl: {
    name: 'Psionic Silver-Cowl',
    type: 'head',
    slot: 'head',
    rarity: 'rare',
    symbol: '^',
    color: COLORS.purpleEnder,
    weight: 0.8,
    energyBonus: 25,
    hpBonus: 10,
    description: 'Silver-threaded cowl tuned to amplify esoteric mental resonance and telekinesis.'
  },
  chitin_helm: {
    name: 'Horned Chitin Helm',
    type: 'head',
    slot: 'head',
    rarity: 'uncommon',
    symbol: '^',
    color: COLORS.wallGray,
    weight: 3.5,
    hpBonus: 25,
    defenseBonus: 5,
    description: 'Carved chitin skullcap adorned with menacing predatory antennae.'
  },

  // --- BODY ARMOR ---
  wanderers_duster: {
    name: "Wanderer's Ballistic Duster",
    type: 'body',
    slot: 'body',
    rarity: 'common',
    symbol: '[',
    color: COLORS.dirtPath,
    weight: 3.5,
    defenseBonus: 10,
    hpBonus: 10,
    description: 'A rugged duster coat lined with Kevlar mesh and insulated against the fells.'
  },
  reinforced_carapace: {
    name: 'Reinforced Chitin Carapace',
    type: 'body',
    slot: 'body',
    rarity: 'uncommon',
    symbol: '[',
    color: COLORS.wallGray,
    weight: 9.0,
    defenseBonus: 20,
    hpBonus: 25,
    description: 'Heavy layered composite plating capable of deflecting claws, fangs, and arrows.'
  },
  polymer_nanosuit: {
    name: 'Polymer Nano-Weave Suit',
    type: 'body',
    slot: 'body',
    rarity: 'rare',
    symbol: '[',
    color: COLORS.cyan,
    weight: 5.0,
    defenseBonus: 15,
    shieldBonus: 35,
    energyBonus: 15,
    description: 'Flexible active-camo fiber integrated with subcutaneous micro-capacitors.'
  },
  titan_plate: {
    name: 'Titan Plate Cuirass',
    type: 'body',
    slot: 'body',
    rarity: 'quantum',
    symbol: '[',
    color: COLORS.bossGold,
    weight: 16.0,
    defenseBonus: 30,
    hpBonus: 50,
    shieldBonus: 20,
    description: 'A nearly indestructible pre-collapse chestplate forged from meteoritic tungsten alloy.'
  },

  // --- RELICS / TRINKETS ---
  baetyl_core: {
    name: 'Baetyl Harmonic Core',
    type: 'relic',
    slot: 'relic',
    rarity: 'rare',
    symbol: '🔮',
    color: COLORS.purpleEnder,
    weight: 1.0,
    energyBonus: 30,
    atkBonus: 5,
    description: 'A humming computational polyhedron resonating with ancient machine wisdom.'
  },
  amber_talisman: {
    name: 'Amber Sunstone Talisman',
    type: 'relic',
    slot: 'relic',
    rarity: 'common',
    symbol: '☼',
    color: COLORS.amber,
    weight: 0.5,
    hpBonus: 20,
    description: 'A drop of primordial sap enclosing a tiny petrified glowing embers.'
  },
  chrono_compass: {
    name: 'Chrono-Compass',
    type: 'relic',
    slot: 'relic',
    rarity: 'rare',
    symbol: '🧭',
    color: COLORS.cyan,
    weight: 1.0,
    energyBonus: 15,
    defenseBonus: 5,
    description: 'Gyroscopic timepiece that bends local dimensional curves and prevents getting lost.'
  },
  starapple_amulet: {
    name: 'Starapple Seed Charm',
    type: 'relic',
    slot: 'relic',
    rarity: 'uncommon',
    symbol: '•',
    color: COLORS.green,
    weight: 0.5,
    hpBonus: 25,
    shieldBonus: 15,
    description: 'A sacred seed pod pulsating with the restorative vigor of the orchard groves.'
  },

  // --- CONSUMABLES ---
  stim_salve: {
    name: 'Nanite Stim-Salve',
    type: 'consumable',
    rarity: 'common',
    symbol: '!',
    color: COLORS.green,
    weight: 0.5,
    count: 1,
    healHp: 45,
    cureStatus: true,
    description: 'A pneumatic injector of medical biogel. Restores 45 HP and cleanses all debuffs.'
  },
  energy_cell: {
    name: 'Quantum Energy Cell',
    type: 'consumable',
    rarity: 'common',
    symbol: '!',
    color: COLORS.cyan,
    weight: 0.5,
    count: 1,
    restoreEnergy: 40,
    description: 'A pressurized electrochemical cell. Instantly restores 40 Energy for abilities and lasers.'
  },
  shield_battery: {
    name: 'Forcefield Battery',
    type: 'consumable',
    rarity: 'uncommon',
    symbol: '!',
    color: COLORS.bossGold,
    weight: 1.0,
    count: 1,
    rechargeShield: 50,
    description: 'Supercharges your personal energy barrier, immediately restoring up to 50 Shield HP.'
  },
  thermal_grenade: {
    name: 'Thermal Grenade',
    type: 'consumable',
    rarity: 'uncommon',
    symbol: '*',
    color: COLORS.fireRed,
    weight: 1.0,
    count: 1,
    aoeDamage: 50,
    description: 'A high-yield phosphorus grenade that detonates dealing 50 damage in a 3x3 fiery inferno.'
  },
  cryo_capsule: {
    name: 'Cryo Capsule',
    type: 'consumable',
    rarity: 'uncommon',
    symbol: '❄',
    color: COLORS.cyan,
    weight: 1.0,
    count: 1,
    aoeFreeze: 7,
    aoeDamage: 20,
    description: 'Pressurized liquid nitrogen flask that flash-freezes all targets in a 3x3 area for 7 ticks.'
  },
  phasing_tonic: {
    name: 'Phasing Draught',
    type: 'consumable',
    rarity: 'rare',
    symbol: '!',
    color: COLORS.purpleEnder,
    weight: 0.5,
    count: 1,
    phaseTicks: 6,
    description: 'An esoteric draught that decouples your atomic structure, letting you phase through walls for 6 ticks.'
  },

  // --- MATERIALS ---
  scrap_metal: {
    name: 'Metal Scrap Piece',
    type: 'material',
    rarity: 'common',
    symbol: '%',
    color: COLORS.wallGray,
    weight: 1.0,
    count: 1,
    description: 'Salvaged mechanical plating and structural alloy, essential for workshop crafting.'
  },
  diode_crystal: {
    name: 'Laser Diode Crystal',
    type: 'material',
    rarity: 'uncommon',
    symbol: '♦',
    color: COLORS.cyan,
    weight: 0.5,
    count: 1,
    description: 'A precision-cut synthetic ruby crystal that focuses photon excitation beams.'
  },
  copper_ore: {
    name: 'Raw Copper Nugget',
    type: 'material',
    rarity: 'common',
    symbol: '%',
    color: '#d97706',
    weight: 1.5,
    count: 1,
    description: 'A dense nodule of raw native copper mined from subterranean bedrock.'
  },
  iron_ore: {
    name: 'High-Grade Iron Chunk',
    type: 'material',
    rarity: 'uncommon',
    symbol: '■',
    color: '#94a3b8',
    weight: 2.5,
    count: 1,
    description: 'Heavy magnetic iron ore suitable for smelting high-carbon steel tool heads.'
  },
  obsidian_shard: {
    name: 'Volcanic Obsidian Glass',
    type: 'material',
    rarity: 'rare',
    symbol: '▲',
    color: '#aa33ff',
    weight: 1.0,
    count: 1,
    description: 'Extremely sharp vitreous silicate capable of channeling superheated plasma.'
  },
  relic_superalloy: {
    name: 'Ancient Relic Superalloy',
    type: 'material',
    rarity: 'quantum',
    symbol: 'Ω',
    color: COLORS.bossGold,
    weight: 3.0,
    count: 1,
    description: 'An indestructible hyper-dense alloy synthesized by the pre-collapse archons.'
  }
};

let itemCounter = 1;

export function createItem(templateKey: string, count: number = 1): Item {
  const tpl = ITEM_TEMPLATES[templateKey];
  if (!tpl) {
    return {
      id: `item-${Date.now()}-${itemCounter++}`,
      name: 'Unknown Artifact',
      type: 'material',
      symbol: '?',
      color: '#ffffff',
      weight: 1.0,
      count,
      description: 'An unclassified relic from the ruins.'
    };
  }
  return {
    id: `item-${templateKey}-${Date.now()}-${itemCounter++}`,
    ...tpl,
    count
  };
}

export function getStartingEquipment(role: HeroRole): { equipment: EquipmentSlots; inventory: Item[] } {
  if (role === 'barrett') {
    return {
      equipment: {},
      inventory: [
        createItem('mining_pick'),
        createItem('vibro_blade'),
        createItem('miners_headlamp'),
        createItem('wanderers_duster'),
        createItem('stim_salve', 2),
        createItem('shield_battery', 1),
        createItem('thermal_grenade', 1)
      ]
    };
  } else if (role === 'luther') {
    return {
      equipment: {},
      inventory: [
        createItem('mining_pick'),
        createItem('hardlight_buckler'),
        createItem('reinforced_carapace'),
        createItem('stim_salve', 2),
        createItem('shield_battery', 1),
        createItem('thermal_grenade', 1)
      ]
    };
  } else {
    // beau
    return {
      equipment: {},
      inventory: [
        createItem('cryo_stave'),
        createItem('psionic_cowl'),
        createItem('baetyl_core'),
        createItem('stim_salve', 2),
        createItem('energy_cell', 2),
        createItem('cryo_capsule', 1)
      ]
    };
  }
}

export function generateRandomLoot(zoneLevel: number, isElite: boolean = false, isBoss: boolean = false): Item[] {
  const drops: Item[] = [];

  // Consumable drop chances
  const consumableKeys = ['stim_salve', 'energy_cell', 'shield_battery', 'thermal_grenade', 'cryo_capsule'];
  if (Math.random() < 0.65 || isElite || isBoss) {
    const pick = consumableKeys[Math.floor(Math.random() * consumableKeys.length)];
    drops.push(createItem(pick, Math.random() < 0.3 ? 2 : 1));
  }

  // Material drop
  if (Math.random() < 0.4) {
    drops.push(createItem(Math.random() < 0.5 ? 'scrap_metal' : 'diode_crystal', 1));
  }

  // Equipment drop
  const roll = Math.random();
  if (isBoss || (isElite && roll < 0.7) || (!isElite && roll < 0.25)) {
    const equipPool: string[] = [];
    if (zoneLevel <= 2) {
      equipPool.push('hardlight_buckler', 'miners_headlamp', 'wanderers_duster', 'amber_talisman', 'vibro_blade');
    } else if (zoneLevel <= 4) {
      equipPool.push('laser_rifle', 'chitin_ward', 'neural_visor', 'reinforced_carapace', 'starapple_amulet', 'chitin_helm');
    } else {
      equipPool.push('prismatic_aegis', 'psionic_cowl', 'polymer_nanosuit', 'chrono_compass', 'electro_maul', 'phase_dagger', 'phasing_tonic');
      if (isBoss) {
        equipPool.push('lightsaber', 'titan_plate', 'baetyl_core');
      }
    }
    const chosen = equipPool[Math.floor(Math.random() * equipPool.length)];
    drops.push(createItem(chosen));
  }

  return drops;
}

export function calculateCarryWeight(inventory: Item[], equipment?: EquipmentSlots): number {
  let total = 0;
  for (const it of inventory) {
    const count = it.count || 1;
    total += (it.weight || 0.5) * count;
  }
  if (equipment) {
    for (const item of Object.values(equipment)) {
      if (item) {
        total += (item.weight || 0.5);
      }
    }
  }
  return Math.round(total * 10) / 10;
}

export function calculateMaxCarryWeight(str: number): number {
  return 30 + str * 8; // e.g. 14 STR = 142 lbs
}
